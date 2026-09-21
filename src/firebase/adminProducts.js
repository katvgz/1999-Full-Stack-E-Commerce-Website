import { products } from "../data/products";
import { loadAdminAuth } from "./adminAuth";
import { defaultStock } from "../data/inventory";

// Stable source paths are stored in Firestore, rather than build-specific URLs.
export const productImageOptions = products.map((product, index) => ({
  label: product.name,
  path: index < 5 ? `clothing/shirts/${index + 1}shirt.png` : `clothing/pants/${index - 4}pants.png`,
  url: product.images[0],
}));

export function resolveProductImage(path) {
  return productImageOptions.find((image) => image.path === path || image.url === path)?.url || "";
}

export async function productDatabase() {
  const { auth } = await loadAdminAuth();
  if (auth.currentUser?.email !== "admin@gmail.com") throw new Error("Admin access required.");
  const [sdk, { getOrderDatabase }] = await Promise.all([
    import("firebase/firestore/lite"), import("./firebase"),
  ]);
  return { sdk, db: getOrderDatabase() };
}

export async function loadManagedProducts() {
  const { sdk, db } = await productDatabase();
  const marker = sdk.doc(db, "adminMetadata", "productCatalog");
  // One atomic initialization. Removed products stay removed on future visits.
  await sdk.runTransaction(db, async (transaction) => {
    if ((await transaction.get(marker)).exists()) return;
    const references = products.map((product) => sdk.doc(db, "products", product.id));
    const existing = await Promise.all(references.map((reference) => transaction.get(reference)));
    products.forEach((product, index) => {
      if (!existing[index].exists()) {
        transaction.set(references[index], { ...product, images: [productImageOptions[index].path] });
      }
    });
    transaction.set(marker, { initialized: true });
  });
  const snapshot = await sdk.getDocs(sdk.collection(db, "products"));
  return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
}

export async function saveManagedProduct(id, fields, isNew, imagePath = "") {
  if (!fields.name.trim() || fields.name.trim().length > 120 ||
      !["tops", "bottoms"].includes(fields.category) ||
      !Number.isFinite(fields.price) || fields.price <= 0 || fields.price > 1000000) {
    throw new Error("Enter a valid name, category, and price.");
  }
  const { sdk, db } = await productDatabase();
  const reference = sdk.doc(db, "products", id);
  const changes = { name: fields.name.trim(), category: fields.category, price: fields.price };
  if (!isNew) {
    // Preserve images, descriptions, sizes, and all existing product metadata.
    await sdk.updateDoc(reference, changes);
    return changes;
  }
  if (imagePath && !productImageOptions.some((image) => image.path === imagePath)) throw new Error("Choose an existing image.");
  const product = { id, ...changes, images: imagePath ? [imagePath] : [], stock: { ...defaultStock } };
  await sdk.runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists()) {
      // An unchanged retry after an uncertain response cannot duplicate a product.
      const saved = existing.data();
      if (saved.name === product.name && saved.category === product.category && saved.price === product.price &&
          JSON.stringify(saved.images) === JSON.stringify(product.images)) return;
      throw new Error("This product ID already exists. Reopen Products before trying again.");
    }
    transaction.set(reference, product);
  });
  return product;
}

export async function removeManagedProduct(id) {
  const { sdk, db } = await productDatabase();
  await sdk.deleteDoc(sdk.doc(db, "products", id));
}

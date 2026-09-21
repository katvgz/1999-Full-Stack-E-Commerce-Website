import { products } from "../data/products";
import { MAX_ITEM_QUANTITY } from "../cart/limits";
const emulatorClients = new WeakSet();

export function stockLimit(inventory, id, size) {
  const quantity = inventory?.[id]?.[size];
  return Number.isInteger(quantity) && quantity >= 0 && quantity <= 999
    ? Math.min(MAX_ITEM_QUANTITY, quantity) : 0;
}

function readStock(snapshot) {
  return snapshot.exists() ? snapshot.data().stock || {} : {};
}

export async function fetchCurrentStock(ids) {
  const [{ doc, getDoc }, { getOrderDatabase }] = await Promise.all([
    import("firebase/firestore/lite"), import("./firebase"),
  ]);
  const db = getOrderDatabase();
  return Object.fromEntries(await Promise.all([...new Set(ids)].map(async (id) =>
    [id, readStock(await getDoc(doc(db, "products", id)))])));
}

export async function watchStoreInventory(onChange, onError) {
  const [sdk, { getFirebaseApp }] = await Promise.all([
    import("firebase/firestore"), import("./firebase"),
  ]);
  const db = sdk.getFirestore(getFirebaseApp());
  if (import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR_HOST && !emulatorClients.has(db)) {
    const [host, port] = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST.split(":");
    sdk.connectFirestoreEmulator(db, host, Number(port));
    emulatorClients.add(db);
  }
  const inventory = {};
  const confirmed = new Set();
  const stops = products.map((product) => sdk.onSnapshot(
    sdk.doc(db, "products", product.id), { includeMetadataChanges: true },
    (snapshot) => {
      // Do not authorize purchases from a stale offline cache.
      if (snapshot.metadata.fromCache) {
        confirmed.delete(product.id);
        onError();
        return;
      }
      inventory[product.id] = readStock(snapshot);
      confirmed.add(product.id);
      if (confirmed.size === products.length) onChange({ ...inventory });
    }, (error) => { confirmed.delete(product.id); onError(error); },
  ));
  return () => stops.forEach((stop) => stop());
}

export function reconcileStock(items, inventory) {
  const adjusted = [];
  const changes = [];
  for (const item of items) {
    const quantity = Math.min(item.quantity, stockLimit(inventory, item.id, item.size));
    if (quantity !== item.quantity) changes.push(`${item.name} (${item.size}): ${quantity ? `limited to ${quantity}` : "removed — sold out"}`);
    if (quantity > 0) adjusted.push({ ...item, quantity });
  }
  return { items: adjusted, message: changes.length ? `Your bag was updated for current stock. ${changes.join(". ")}.` : "" };
}

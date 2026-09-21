import { loadManagedProducts, productDatabase } from "./adminProducts";
import { defaultStock, validStock } from "../data/inventory";

export async function loadInventory() {
  const products = await loadManagedProducts();
  const { sdk, db } = await productDatabase();
  const initialized = await Promise.all(products.map(async (product) => {
    if (product.stock != null) return product;
    // Read again atomically so initialization never overwrites a concurrent restock.
    return sdk.runTransaction(db, async (transaction) => {
      const reference = sdk.doc(db, "products", product.id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) return null;
      const current = snapshot.data();
      if (current.stock != null) return { ...current, id: snapshot.id };
      transaction.update(reference, { stock: { ...defaultStock } });
      return { ...current, id: snapshot.id, stock: { ...defaultStock } };
    });
  }));
  return initialized.filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
}

export async function saveInventory(id, stock, expectedStock) {
  if (!validStock(stock)) throw new Error("Stock must be a whole number from 0 to 999 for every size.");
  const { sdk, db } = await productDatabase();
  const reference = sdk.doc(db, "products", id);
  return sdk.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("This product no longer exists. Reopen Inventory to refresh the list.");
    const current = snapshot.data();
    const same = (a, b) => ["S", "M", "L", "XL"].every((size) => a?.[size] === b?.[size]);
    if (same(current.stock, stock)) return { ...current, id };
    if (!same(current.stock, expectedStock)) {
      const error = new Error("Stock changed since this page loaded. Reopen Inventory before editing again.");
      error.code = "inventory/conflict";
      throw error;
    }
    transaction.update(reference, { stock });
    return { ...current, id, stock };
  });
}

import { doc } from "firebase/firestore/lite";
import { inventorySizes, validStock } from "../data/inventory";
import { MAX_ITEM_QUANTITY } from "../cart/limits";

function inventoryError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Runs inside the same transaction as the pending-payment check and approval.
// No product writes are staged until every required product has been read and checked.
export async function deductPaymentInventory(transaction, database, items) {
  if (!Array.isArray(items) || !items.length || items.length > 8) {
    throw inventoryError("inventory/invalid-order", "This order has invalid product details. Payment was not approved.");
  }
  const requested = new Map();
  for (const item of items) {
    if (typeof item.productId !== "string" || !item.productId || item.productId.includes("/") ||
        !inventorySizes.includes(item.size) || !Number.isInteger(item.quantity) ||
        item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
      throw inventoryError("inventory/invalid-order", "This order contains an invalid product, size, or quantity. Payment was not approved.");
    }
    if (!requested.has(item.productId)) requested.set(item.productId, {
      name: item.productName || item.productId,
      quantities: {},
      reference: doc(database, "products", item.productId),
    });
    const product = requested.get(item.productId);
    product.quantities[item.size] = (product.quantities[item.size] || 0) + item.quantity;
    // Aggregate duplicate lines as well: the cap applies to a product/size pair.
    if (product.quantities[item.size] > MAX_ITEM_QUANTITY) {
      throw inventoryError("inventory/invalid-order", `${product.name} — Size ${item.size} exceeds the maximum of ${MAX_ITEM_QUANTITY}. Payment was not approved.`);
    }
  }

  const products = [...requested.values()];
  const snapshots = await Promise.all(products.map((product) => transaction.get(product.reference)));
  const deductions = [];
  const shortages = [];
  products.forEach((product, index) => {
    const snapshot = snapshots[index];
    const stock = snapshot.exists() ? snapshot.data().stock : null;
    if (!validStock(stock)) {
      for (const [size, quantity] of Object.entries(product.quantities)) {
        shortages.push(`${product.name} — Size ${size}: needs ${quantity}; inventory unavailable`);
      }
      return;
    }
    const remaining = { ...stock };
    for (const [size, quantity] of Object.entries(product.quantities)) {
      if (quantity > stock[size]) shortages.push(`${product.name} — Size ${size}: needs ${quantity}, available ${stock[size]}`);
      else remaining[size] = stock[size] - quantity;
    }
    deductions.push({ reference: product.reference, stock: remaining });
  });
  if (shortages.length) {
    throw inventoryError("inventory/insufficient-stock", `Insufficient stock: ${shortages.join("; ")}. Payment was not approved and no stock was deducted.`);
  }
  for (const deduction of deductions) transaction.update(deduction.reference, { stock: deduction.stock });
}

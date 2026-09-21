import { products } from "../data/products";

// Static catalog assets only. No Firebase imports or browser storage.
export function createPreviewData() {
  const catalog = products.map((product, index) => ({
    ...product, images: [...product.images], sizes: [...product.sizes],
    stock: { S: index === 2 ? 0 : 8, M: index % 3 === 0 ? 2 : 10, L: 6, XL: 4 },
  }));
  const stages = ["pending", "pending", "processing", "packed", "shipped", "delivered", "payment_rejected"];
  const names = ["Alex Santos", "Sam Reyes", "Jamie Cruz", "Casey Garcia", "Riley Lim", "Morgan Tan", "Taylor Ramos"];
  const orders = stages.map((status, index) => {
    const product = catalog[index];
    const quantity = index === 0 ? 2 : 1;
    return {
      id: `DEMO-${1007 - index}`, customer: names[index], email: `visitor${index + 1}@example.com`,
      address: `${24 + index} Sample Street, Barangay Demo, Quezon City, Metro Manila 1100`,
      date: `2026-09-${String(21 - index).padStart(2, "0")}`, status,
      payment: status === "pending" ? "pending_verification" : status === "payment_rejected" ? "rejected" : "approved",
      items: [{ productId: product.id, name: product.name, size: "M", quantity }],
      subtotal: product.price * quantity, shippingFee: 120, total: product.price * quantity + 120,
      tracking: ["shipped", "delivered"].includes(status) ? `DEMO-TRACK-${index}` : "", courier: "Sample Courier",
    };
  });
  return { products: catalog, orders };
}

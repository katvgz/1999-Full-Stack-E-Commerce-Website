export const inventorySizes = ["S", "M", "L", "XL"];
export const defaultStock = { S: 5, M: 5, L: 5, XL: 5 };

export function validStock(stock) {
  return stock && Object.keys(stock).length === 4 && inventorySizes.every((size) =>
    Number.isInteger(stock[size]) && stock[size] >= 0 && stock[size] <= 999);
}

export function stockSummary(stock) {
  const quantities = inventorySizes.map((size) => stock[size]);
  const total = quantities.reduce((sum, quantity) => sum + quantity, 0);
  return { total, status: total === 0 ? "SOLD OUT" : quantities.some((quantity) => quantity >= 1 && quantity <= 2) ? "LOW STOCK" : "IN STOCK" };
}

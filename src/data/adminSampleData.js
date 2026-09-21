// Display-only samples. No connection to customer orders or inventory.
export const overviewMetrics = [
  { label: "Total Earnings", value: "₱24,960", note: "Sample paid revenue" },
  { label: "Pending Payment Verification", value: "06", note: "Awaiting review" },
  { label: "Approved Orders", value: "04", note: "Payment approved" },
  { label: "Orders to Ship", value: "04", note: "Ready for dispatch" },
  { label: "Low Stock Products", value: "03", note: "Sizes running low" },
  { label: "Total Products", value: "08", note: "5 tops / 3 bottoms" },
];

export const recentOrders = [
  { id: "1999-DEMO-005", customer: "Alex R.", pieces: 2, total: "₱1,518", status: "Pending verification", tone: "pending" },
  { id: "1999-DEMO-004", customer: "Sam C.", pieces: 1, total: "₱1,619", status: "Approved", tone: "approved" },
  { id: "1999-DEMO-003", customer: "Jamie D.", pieces: 2, total: "₱1,568", status: "Pending verification", tone: "pending" },
  { id: "1999-DEMO-002", customer: "Casey M.", pieces: 1, total: "₱819", status: "Shipped", tone: "shipped" },
  { id: "1999-DEMO-001", customer: "Taylor S.", pieces: 1, total: "₱869", status: "Delivered", tone: "delivered" },
];

export const lowStock = [
  { name: "1999 Distressed Tee", size: "M", remaining: 2 },
  { name: "1999 Cargo Denim", size: "L", remaining: 1 },
  { name: "Smaller World Tee", size: "S", remaining: 3 },
];

export const orderStatuses = [
  { label: "Pending verification", count: 6, tone: "pending" },
  { label: "Approved / to ship", count: 4, tone: "approved" },
  { label: "Shipped", count: 8, tone: "shipped" },
  { label: "Delivered", count: 12, tone: "delivered" },
];

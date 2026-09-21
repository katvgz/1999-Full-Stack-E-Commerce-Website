import assert from "node:assert/strict";
import {
  emptyCheckout,
  SHIPPING_FEE,
  validateCheckout,
  prepareOrder,
} from "../src/checkout/checkout.js";

const values = {
  ...emptyCheckout,
  fullName: " Test Customer ",
  email: "test@example.com",
  phone: "0917 123 4567",
  street: "123 Sample Street",
  barangay: "Sample Barangay",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1100",
  paymentMethod: "gcash",
  paymentReference: " TEST-REFERENCE ",
  orderNotes: " Test only ",
};
const cart = [{ id: "002", name: "Wrong", size: "M", quantity: 2, price: 1 }];
const catalog = [
  {
    id: "002",
    name: "Still Here Tee",
    price: 699,
    sizes: ["S", "M", "L", "XL"],
  },
];
assert.deepEqual(validateCheckout(values, cart), {});
assert.equal(Object.keys(validateCheckout(emptyCheckout, [])).length, 11);
const order = prepareOrder(
  {
    ...values,
    subtotal: 1,
    total: 1,
    shippingFee: 0,
    orderStatus: "complete",
    payment: { status: "paid" },
  },
  cart,
  catalog,
);
assert.deepEqual(order, {
  customer: {
    fullName: "Test Customer",
    email: "test@example.com",
    phone: "09171234567",
  },
  shippingAddress: {
    street: "123 Sample Street",
    barangay: "Sample Barangay",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
  },
  items: [
    {
      productId: "002",
      productName: "Still Here Tee",
      size: "M",
      quantity: 2,
      unitPrice: 699,
    },
  ],
  subtotal: 1398,
  shippingFee: SHIPPING_FEE,
  total: 1398 + SHIPPING_FEE,
  payment: {
    method: "gcash",
    referenceCode: "TEST-REFERENCE",
    status: "pending_verification",
  },
  orderStatus: "pending",
  orderNotes: "Test only",
});
assert.equal(
  prepareOrder({ ...values, paymentMethod: "bank_transfer" }, cart, catalog)
    .payment.method,
  "bank_transfer",
);
assert.equal(
  validateCheckout({ ...values, phone: "+639171234567" }, cart).phone,
  undefined,
);
assert.ok(
  validateCheckout({ ...values, paymentReference: "   " }, cart)
    .paymentReference,
);
assert.ok(
  validateCheckout({ ...values, paymentMethod: "invalid" }, cart).paymentMethod,
);
assert.throws(() =>
  prepareOrder(values, [{ ...cart[0], id: "unknown" }], catalog),
);
console.log(
  "Passed: checkout validation, exact order schema, catalog-derived prices, fixed shipping fee, and immutable pending statuses.",
);

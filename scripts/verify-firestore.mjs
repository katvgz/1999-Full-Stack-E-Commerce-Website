import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  setLogLevel,
} from "firebase/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error(
    "Local emulator required; never run these tests against production.",
  );
setLogLevel("silent");
const environment = await initializeTestEnvironment({
  projectId: "demo-1999",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});
const db = environment.unauthenticatedContext().firestore();
function validOrder(id) {
  return {
    orderNumber: `1999-${id}`,
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
    shippingFee: 120,
    total: 1518,
    payment: {
      method: "gcash",
      referenceCode: "EMULATOR-TEST-REFERENCE",
      status: "pending_verification",
    },
    orderStatus: "pending",
    orderNotes: "Local test only",
    createdAt: serverTimestamp(),
  };
}
try {
  await environment.clearFirestore();
  const ref = doc(collection(db, "orders"));
  await assertSucceeds(setDoc(ref, validOrder(ref.id)));
  console.log("Valid guest order creation passed.");
  await assertFails(getDoc(ref));
  await assertFails(getDocs(collection(db, "orders")));
  await assertFails(updateDoc(ref, { orderStatus: "complete" }));
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(ref, validOrder(ref.id))); // retries cannot create duplicates
  const invalid = [
    (order) => {
      order.payment.status = "verified";
    },
    (order) => {
      order.orderStatus = "complete";
    },
    (order) => {
      order.payment.method = "cash";
    },
    (order) => {
      order.payment.referenceCode = "";
    },
    (order) => {
      order.payment.upload = "unwanted";
    },
    (order) => {
      order.customer.role = "admin";
    },
    (order) => {
      order.customer.email = "invalid";
    },
    (order) => {
      order.customer.phone = "123";
    },
    (order) => {
      order.shippingAddress.postalCode = "invalid";
    },
    (order) => {
      order.shippingAddress.street = "";
    },
    (order) => {
      order.items[0].quantity = 0;
    },
    (order) => {
      order.items[0].quantity = 6;
    },
    (order) => {
      order.items[0].quantity = 1.5;
    },
    (order) => {
      order.items[0].unitPrice = 1;
      order.subtotal = 2;
      order.total = 122;
    },
    (order) => {
      order.items[0].productId = "unknown";
    },
    (order) => {
      order.items[0].productName = "Fake";
    },
    (order) => {
      order.items[0].size = "XXL";
    },
    (order) => {
      order.items[0].extra = true;
    },
    (order) => {
      order.subtotal = 1;
      order.total = 121;
    },
    (order) => {
      order.total = 1;
    },
    (order) => {
      order.shippingFee = 0;
      order.total = order.subtotal;
    },
    (order) => {
      order.createdAt = Timestamp.fromMillis(0);
    },
    (order) => {
      order.orderNumber = "1999-fake";
    },
    (order) => {
      order.items = [];
    },
    (order) => {
      delete order.payment;
    },
    (order) => {
      order.extra = "public write";
    },
    (order) => {
      order.orderNotes = "x".repeat(1001);
    },
  ];
  for (const mutate of invalid) {
    const deniedRef = doc(collection(db, "orders"));
    const order = validOrder(deniedRef.id);
    mutate(order);
    await assertFails(setDoc(deniedRef, order));
  }
  const fullRef = doc(collection(db, "orders"));
  const fullOrder = validOrder(fullRef.id);
  const catalog = [
    ["001", "1999 Distressed Tee", 699],
    ["002", "Still Here Tee", 699],
    ["003", "Smaller World Tee", 749],
    ["004", "Good Things Tee", 699],
    ["005", "Different Day Tee", 749],
    ["006", "1999 Cargo Denim", 1499],
    ["007", "1999 Washed Denim", 1399],
    ["008", "1999 Graphic Denim", 1599],
  ];
  fullOrder.items = catalog.flatMap(([productId, productName, unitPrice]) =>
    ["M"].map((size) => ({
      productId,
      productName,
      unitPrice,
      size,
      quantity: 1,
    })),
  );
  fullOrder.subtotal = fullOrder.items.reduce(
    (sum, item) => sum + item.unitPrice,
    0,
  );
  fullOrder.total = fullOrder.subtotal + 120;
  fullOrder.payment.method = "bank_transfer";
  console.log("Invalid payload checks passed; testing all 8 order lines...");
  await assertSucceeds(setDoc(fullRef, fullOrder));
  await environment.withSecurityRulesDisabled(async (context) => {
    const saved = await getDoc(doc(context.firestore(), "orders", ref.id));
    assert.ok(saved.data().createdAt.toMillis() > 0);
    assert.equal(saved.data().payment.status, "pending_verification");
  });
  await assertFails(
    setDoc(doc(db, "other", "example"), { arbitrary: "write" }),
  );
  console.log(
    `Passed Firestore rules: valid guest creates including all 8 order lines; ${invalid.length} invalid payloads denied; reads, lists, updates, deletes and unrelated writes denied.`,
  );
} finally {
  await environment.cleanup();
}

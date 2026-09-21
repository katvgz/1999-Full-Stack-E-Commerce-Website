import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { getDocs, collection } from "firebase/firestore";

test.skip(
  !process.env.FIRESTORE_EMULATOR_HOST,
  "Requires the local Firestore emulator; never submits to the live project.",
);

async function fillOrder(page, method = "GCASH") {
  await page.goto("/product/001");
  await page
    .locator(".pdp-size-buttons")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await page.getByRole("button", { name: "BUY NOW", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  const fields = {
    email: "orders-test@example.com",
    phone: "09171234567",
    fullName: "Order Test",
    street: "123 Test Street",
    barangay: "Sample",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
  };
  for (const [name, value] of Object.entries(fields))
    await page.locator(`#checkout-${name}`).fill(value);
  await page.getByRole("radio", { name: method, exact: true }).check();
  await page.locator("#checkout-paymentReference").fill("EMULATOR-ORDER-TEST");
}

test("a direct success URL does not show a fake order", async ({ page }) => {
  await page.goto("/order-success?orderNumber=1999-FAKE");
  await expect(
    page.getByRole("heading", { name: "NO ORDER TO SHOW." }),
  ).toBeVisible();
  await expect(page.getByText("ORDER RECEIVED.", { exact: true })).toHaveCount(
    0,
  );
});

test("offline failure preserves contact details and cart, then a single retry succeeds", async ({
  page,
  context,
}) => {
  await fillOrder(page, "BANK TRANSFER");
  await context.setOffline(true);
  await page.getByRole("button", { name: "PLACE ORDER", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("offline");
  await expect(page.locator("#checkout-email")).toHaveValue(
    "orders-test@example.com",
  );
  await expect(page.locator("#checkout-paymentReference")).toHaveValue(
    "EMULATOR-ORDER-TEST",
  );
  await expect(page.locator(".bag-count")).toHaveText("(1)");
  await expect(
    page.getByRole("button", { name: "PLACE ORDER", exact: true }),
  ).toBeEnabled();
  await context.setOffline(false);
  await page.getByRole("button", { name: "PLACE ORDER", exact: true }).click();
  await expect(page).toHaveURL(/\/order-success$/);
  await expect(
    page.getByText("Thank you, Order.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".order-success")).toContainText(
    "PENDING VERIFICATION",
  );
  await expect(page.locator(".bag-count")).toHaveText("(0)");
});

test("server rejection keeps the bag; retry reuses its document and duplicate submits are blocked", async ({
  page,
}) => {
  const rules = readFileSync("firestore.rules", "utf8");
  const denied = await initializeTestEnvironment({
    projectId: "demo-1999",
    firestore: {
      rules:
        "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }",
    },
  });
  let restored;
  try {
    await fillOrder(page);
    await page
      .getByRole("button", { name: "PLACE ORDER", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "could not be submitted",
    );
    await expect(page.locator("#checkout-fullName")).toHaveValue("Order Test");
    await expect(page.locator(".bag-count")).toHaveText("(1)");
    restored = await initializeTestEnvironment({
      projectId: "demo-1999",
      firestore: { rules },
    });
    let before;
    await restored.withSecurityRulesDisabled(async (context) => {
      before = (await getDocs(collection(context.firestore(), "orders"))).size;
    });
    // Submit twice within the same event turn, before React can paint disabled.
    await page.locator(".checkout-layout form").evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page).toHaveURL(/\/order-success$/);
    await restored.withSecurityRulesDisabled(async (context) => {
      const after = await getDocs(collection(context.firestore(), "orders"));
      expect(after.size).toBe(before + 1);
      const number = await page
        .locator(".order-success dd")
        .first()
        .textContent();
      const order = after.docs
        .find((document) => document.data().orderNumber === number)
        .data();
      expect(order.payment).toEqual({
        method: "gcash",
        referenceCode: "EMULATOR-ORDER-TEST",
        status: "pending_verification",
      });
      expect(order.orderStatus).toBe("pending");
      expect(order.createdAt.toMillis()).toBeGreaterThan(0);
      expect(order.total).toBe(819);
    });
    expect(
      await page.evaluate(() => localStorage.getItem("1999-cart-v1")),
    ).toBeNull();
    await page.screenshot({
      path: "test-results/order-success.png",
      fullPage: true,
    });
  } finally {
    if (!restored)
      restored = await initializeTestEnvironment({
        projectId: "demo-1999",
        firestore: { rules },
      });
    await denied.cleanup();
    await restored.cleanup();
  }
});

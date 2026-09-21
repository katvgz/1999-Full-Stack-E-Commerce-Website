import { test, expect } from "@playwright/test";
test.skip(
  !process.env.FIRESTORE_EMULATOR_HOST,
  "Order submission tests require the local Firestore emulator.",
);

async function startCheckout(page, { quantity = 2, viaBag = false } = {}) {
  await page.goto("/product/002");
  await page.getByRole("button", { name: "BUY NOW", exact: true }).click();
  await expect(page.locator("#size-message")).toHaveText("SELECT A SIZE");
  await expect(page).toHaveURL(/\/product\/002$/);
  await page
    .locator(".pdp-size-buttons")
    .getByRole("button", { name: "M", exact: true })
    .click();
  for (let i = 1; i < quantity; i++)
    await page
      .getByRole("button", { name: "Increase quantity", exact: true })
      .click();
  await page
    .getByRole("button", {
      name: viaBag ? "ADD TO CART" : "BUY NOW",
      exact: true,
    })
    .click();
  if (viaBag)
    await page.getByRole("link", { name: "CHECKOUT", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole("heading", { name: "GUEST CHECKOUT." }),
  ).toBeVisible();
  await expect(page.locator(".cart-drawer")).not.toBeVisible();
}

async function fillCustomer(page) {
  const fields = {
    email: "test@example.com",
    phone: "09171234567",
    fullName: "Test Customer",
    street: "123 Sample Street",
    barangay: "Sample Barangay",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
    orderNotes: "Test order only",
  };
  for (const [name, value] of Object.entries(fields))
    await page.locator(`#checkout-${name}`).fill(value);
}

test("guest checkout validates inline, submits GCash order, and clears cart after confirmation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startCheckout(page, { viaBag: true });
  await expect(page.locator(".checkout-items li")).toHaveCount(1);
  await expect(page.getByTestId("checkout-subtotal")).toHaveText("₱1,398");
  await expect(page.getByTestId("checkout-total")).toHaveText("₱1,518");
  await expect(page.locator(".checkout-items")).toContainText("SIZE: M");
  await expect(page.locator(".checkout-items")).toContainText("QTY: 2");
  await page.getByRole("button", { name: "PLACE ORDER" }).click();
  await expect(page.locator("#error-email")).toHaveText(
    "Enter your email address.",
  );
  await expect(page.locator(".checkout-error")).toHaveCount(10);
  await expect(page.locator("#checkout-email")).toBeFocused();
  await fillCustomer(page);
  await page.locator("#checkout-email").fill("invalid");
  await page.locator("#checkout-phone").fill("123");
  await page.locator("#checkout-postalCode").fill("abc");
  await page.getByRole("button", { name: "PLACE ORDER" }).click();
  await expect(page.locator("#error-email")).toHaveText(
    "Enter a valid email address.",
  );
  await expect(page.locator("#error-phone")).toContainText(
    "Philippine mobile number",
  );
  await expect(page.locator("#error-postalCode")).toContainText("4-digit");
  await fillCustomer(page);
  await page.getByRole("radio", { name: "GCASH", exact: true }).check();
  await expect(page.locator(".checkout-payment-details")).toContainText(
    "09420649264",
  );
  await expect(page.locator(".checkout-amount dd")).toHaveText("₱1,518");
  await expect(page.locator(".checkout-payment-details li")).toHaveCount(6);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.locator("#checkout-paymentReference").fill("TEST-GCASH-123456789");
  await page.getByRole("button", { name: "PLACE ORDER" }).click();
  await expect(
    page.getByRole("heading", { name: "ORDER RECEIVED." }),
  ).toBeVisible();
  await expect(page.locator(".order-success")).toContainText(
    "PENDING VERIFICATION",
  );
  await expect(page.locator(".order-success")).toContainText(
    "Your payment has NOT been confirmed yet.",
  );
  await expect(page.locator(".bag-count")).toHaveText("(0)");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("1999-cart-v1")),
  );
  expect(stored).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "NO ORDER TO SHOW." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Buy Now retains the bag, bank method is exclusive, and totals react to bag edits", async ({
  page,
}) => {
  await startCheckout(page);
  await fillCustomer(page);
  await page.getByRole("radio", { name: "GCASH", exact: true }).check();
  await page.locator("#checkout-paymentReference").fill("GCASH-OLD-REFERENCE");
  await page.getByRole("radio", { name: "BANK TRANSFER", exact: true }).check();
  await expect(
    page.getByRole("radio", { name: "GCASH", exact: true }),
  ).not.toBeChecked();
  await expect(page.locator("#checkout-paymentReference")).toHaveValue("");
  await expect(page.locator(".checkout-payment-details")).toContainText("BDO");
  await expect(page.locator(".checkout-payment-details")).toContainText(
    "0012 3456 7890",
  );
  await expect(page.locator(".checkout-bank-notice")).toContainText(
    "placeholder",
  );
  await page.locator("#checkout-paymentReference").fill("TEST-BANK-98765");
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await page
    .getByRole("button", {
      name: "Increase Still Here Tee, size M",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Close shopping bag" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("₱2,217");
  await expect(page.locator(".checkout-amount dd")).toHaveText("₱2,217");
  await expect(page.locator(".checkout-ready")).toHaveCount(0);
  await page.goto("/product/006");
  await page
    .locator(".pdp-size-buttons")
    .getByRole("button", { name: "L", exact: true })
    .click();
  await page.getByRole("button", { name: "BUY NOW", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator(".checkout-items li")).toHaveCount(2);
  await expect(page.getByTestId("checkout-total")).toHaveText("₱3,716");
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await page
    .getByRole("button", { name: "Remove Still Here Tee, size M", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Remove 1999 Cargo Denim, size L",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Close shopping bag" }).click();
  await expect(
    page.locator("main").getByRole("heading", { name: "YOUR BAG IS EMPTY." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "PLACE ORDER" })).toHaveCount(
    0,
  );
});

test("empty direct route and modified saved prices are handled", async ({
  page,
}) => {
  await page.goto("/checkout");
  await expect(
    page.getByRole("link", { name: "RETURN TO SHOP" }),
  ).toHaveAttribute("href", "/shop");
  await page.evaluate(() =>
    localStorage.setItem(
      "1999-cart-v1",
      JSON.stringify([
        { id: "002", size: "M", quantity: 2, price: 1, name: "Modified name" },
      ]),
    ),
  );
  await page.reload();
  await expect(page.getByTestId("checkout-total")).toHaveText("₱1,518");
  await expect(page.locator(".checkout-items")).toContainText("Still Here Tee");
  await expect(
    page.locator(
      '[name="total"], [name="subtotal"], [name="shippingFee"], [name="paymentStatus"], [name="orderStatus"]',
    ),
  ).toHaveCount(0);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`checkout works at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await startCheckout(page);
    await fillCustomer(page);
    await page.getByRole("radio", { name: "GCASH", exact: true }).check();
    await page
      .locator("#checkout-paymentReference")
      .fill("TEST-RESPONSIVE-123");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    // Read both rectangles in one frame so scrolling during mobile focus cannot
    // make measurements from two different scroll positions look like overlap.
    const { form, summary } = await page.evaluate(() => ({
      form: document
        .querySelector(".checkout-layout form")
        .getBoundingClientRect()
        .toJSON(),
      summary: document
        .querySelector(".checkout-summary")
        .getBoundingClientRect()
        .toJSON(),
    }));
    if (viewport.width > 700)
      expect(summary.x).toBeGreaterThan(form.x + form.width);
    else expect(summary.y).toBeGreaterThan(form.y + form.height);
    await expect(page.locator(".checkout-item-image img")).toHaveCSS(
      "object-fit",
      "contain",
    );
    await page.screenshot({
      path: `test-results/checkout-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "PLACE ORDER" }).click();
    await expect(page.locator(".order-success")).toContainText(
      "PENDING VERIFICATION",
    );
  });
}

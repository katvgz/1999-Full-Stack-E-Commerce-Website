import { test, expect } from "@playwright/test";

const bag = (page) =>
  page.getByRole("dialog", { name: "YOUR BAG", exact: false });
const row = (page, id, size) =>
  page.locator(`.cart-item[data-product-id="${id}"][data-size="${size}"]`);
const closeBag = async (page) => {
  await page.getByRole("button", { name: "Close shopping bag" }).click();
  await expect(bag(page)).not.toBeVisible();
};
const openBag = async (page) => {
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await expect(bag(page)).toBeVisible();
};
const add = async (page, size, action = "ADD TO CART") => {
  await page
    .locator(".pdp-size-buttons")
    .getByRole("button", { name: size, exact: true })
    .click();
  await page.getByRole("button", { name: action, exact: true }).click();
  if (action === "BUY NOW") {
    await expect(page).toHaveURL(/\/checkout$/);
    await openBag(page);
  }
  await expect(bag(page)).toBeVisible();
};

test("cart combines sizes, calculates totals, persists, and supports drawer controls", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/product/002");
  await page.getByRole("button", { name: "ADD TO CART", exact: true }).click();
  await expect(page.locator("#size-message")).toHaveText("SELECT A SIZE");
  await expect(bag(page)).not.toBeVisible();
  await add(page, "M");
  await expect(row(page, "002", "M").locator("output")).toHaveText("1");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await closeBag(page);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await add(page, "M");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(row(page, "002", "M").locator("output")).toHaveText("2");
  await expect(row(page, "002", "M").locator(".cart-line-total")).toHaveText(
    "₱1,398",
  );
  await closeBag(page);
  await add(page, "L");
  await expect(page.locator(".cart-item")).toHaveCount(2);
  await closeBag(page);
  await page.goto("/product/006");
  await page.getByRole("button", { name: "BUY NOW", exact: true }).click();
  await expect(page.locator("#size-message")).toHaveText("SELECT A SIZE");
  await add(page, "M", "BUY NOW");
  await expect(page.locator(".cart-item")).toHaveCount(3);
  await expect(page.locator(".bag-count")).toHaveText("(4)");
  await expect(page.locator(".cart-subtotal output")).toHaveText("₱3,596");
  await row(page, "002", "M")
    .getByRole("button", {
      name: "Increase Still Here Tee, size M",
      exact: true,
    })
    .click();
  await expect(page.locator(".cart-subtotal output")).toHaveText("₱4,295");
  await row(page, "002", "M")
    .getByRole("button", {
      name: "Decrease Still Here Tee, size M",
      exact: true,
    })
    .click();
  await expect(
    row(page, "002", "L").getByRole("button", {
      name: "Decrease Still Here Tee, size L",
      exact: true,
    }),
  ).toBeDisabled();
  await row(page, "002", "L")
    .getByRole("button", { name: "Remove Still Here Tee, size L", exact: true })
    .click();
  await expect(page.locator(".cart-subtotal output")).toHaveText("₱2,897");
  await expect(page.locator(".bag-count")).toHaveText("(3)");
  await expect(
    page.getByRole("link", { name: "CHECKOUT", exact: true }),
  ).toHaveAttribute("href", "/checkout");
  await page.screenshot({ path: "test-results/cart-desktop.png" });
  await page.reload();
  await expect(page.locator(".bag-count")).toHaveText("(3)");
  await openBag(page);
  await expect(row(page, "002", "M").locator("output")).toHaveText("2");
  await expect(page.locator(".cart-subtotal output")).toHaveText("₱2,897");
  await page.keyboard.press("Escape");
  await expect(bag(page)).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open shopping bag" }),
  ).toBeFocused();
  await openBag(page);
  await page.mouse.click(15, 300);
  await expect(bag(page)).not.toBeVisible();
  const reopened = await context.newPage();
  await reopened.goto("/shop");
  await expect(reopened.locator(".bag-count")).toHaveText("(3)");
  await reopened.close();
  await openBag(page);
  await page
    .getByRole("button", { name: "Remove Still Here Tee, size M", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Remove 1999 Cargo Denim, size M",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "YOUR BAG IS EMPTY.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bag-count")).toHaveText("(0)");
  await expect(page.locator(".cart-summary")).toHaveCount(0);
  await page.getByRole("link", { name: "CONTINUE SHOPPING" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await openBag(page);
  await expect(
    page.getByRole("heading", { name: "YOUR BAG IS EMPTY.", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`drawer fits ${viewport.width}x${viewport.height} with scrolling and uncropped images`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/product/001");
    await add(page, "M");
    await closeBag(page);
    await add(page, "L");
    await closeBag(page);
    await page.goto("/product/006");
    await page
      .getByRole("button", { name: "Increase quantity", exact: true })
      .click();
    await add(page, "XL");
    await expect(row(page, "006", "XL").locator("output")).toHaveText("2");
    await expect(page.locator(".bag-count")).toHaveText("(4)");
    await expect(page.locator(".cart-panel")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
    const panel = await page.locator(".cart-panel").boundingBox();
    // Allow subpixel rounding in browser geometry.
    expect(panel.width).toBeLessThanOrEqual(viewport.width + 0.1);
    expect(panel.height).toBeLessThanOrEqual(viewport.height + 0.1);
    await expect(page.locator(".cart-summary")).toBeInViewport();
    const summary = await page.locator(".cart-summary").boundingBox();
    expect(summary.y + summary.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.locator(".cart-item-image img").first()).toHaveCSS(
      "object-fit",
      "contain",
    );
    await expect
      .poll(() =>
        page
          .locator(".cart-item-image img")
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    expect(
      await page
        .locator(".cart-items")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.locator(".cart-items").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(
      row(page, "006", "XL").getByRole("button", {
        name: "Remove 1999 Cargo Denim, size XL",
        exact: true,
      }),
    ).toBeInViewport();
    await page.screenshot({
      path: `test-results/cart-${viewport.width}x${viewport.height}.png`,
    });
    await closeBag(page);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    if (viewport.width <= 600)
      await expect(page.locator(".bag-count")).toBeVisible();
  });
}

test("invalid saved data recovers without breaking the storefront", async ({
  page,
}) => {
  await page.goto("/shop");
  await page.evaluate(() =>
    localStorage.setItem("1999-cart-v1", "broken JSON"),
  );
  await page.reload();
  await expect(page.locator(".bag-count")).toHaveText("(0)");
  await openBag(page);
  await expect(
    page.getByRole("heading", { name: "YOUR BAG IS EMPTY.", exact: true }),
  ).toBeVisible();
});

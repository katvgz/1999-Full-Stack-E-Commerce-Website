import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";

const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let root;
const click = async (element) => {
  assert.ok(element);
  await act(async () => element.click());
};
const button = (label) =>
  [...document.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === label,
  );

try {
  const { default: App } = await server.ssrLoadModule("/src/App.jsx");
  const { products } = await server.ssrLoadModule("/src/data/products.js");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.scrollTo = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  dom.window.matchMedia = () => ({ matches: true });
  const { createRoot } = await import("react-dom/client");
  root = createRoot(document.getElementById("root"));
  console.log("Product modules loaded. Checking routes and controls...");
  const navigate = async (path) => {
    window.history.pushState({}, "", path);
    await act(async () => root.render(React.createElement(App)));
  };

  for (const product of products) {
    await navigate(`/product/${product.id}`);
    assert.equal(document.querySelector("h1").textContent, product.name);
    assert.equal(
      document.querySelector(".pdp-image img").getAttribute("src"),
      product.images[0],
    );
    assert.equal(
      document.querySelector(".pdp-description").textContent,
      product.description,
    );
    assert.ok(
      document.querySelector(".pdp-color").textContent.includes(product.color),
    );
    assert.equal(
      document.querySelector(".pdp-price").textContent,
      `₱${product.price.toLocaleString("en-PH")}`,
    );
    const related = [
      ...document.querySelectorAll(".pdp-related .product-card-link"),
    ];
    const candidates = products.filter(
      (item) => item.category === product.category && item.id !== product.id,
    );
    assert.equal(related.length, Math.min(3, candidates.length));
    for (const link of related)
      assert.ok(
        candidates.some(
          (item) => link.getAttribute("href") === `/product/${item.id}`,
        ),
      );
    assert.equal(
      document.querySelectorAll('.pdp-size-buttons [aria-pressed="true"]')
        .length,
      0,
    );
  }

  await navigate("/product/001");
  await click(button("ADD TO CART"));
  assert.equal(
    document.getElementById("size-message").textContent,
    "SELECT A SIZE",
  );
  assert.equal(document.querySelector(".pdp-action-message").textContent, "");
  await click(button("S"));
  await click(button("L"));
  assert.equal(
    document.querySelectorAll('.pdp-size-buttons [aria-pressed="true"]').length,
    1,
  );
  assert.equal(button("L").getAttribute("aria-pressed"), "true");
  assert.equal(document.getElementById("size-message").textContent, "");
  const decrease = document.querySelector('[aria-label="Decrease quantity"]');
  const increase = document.querySelector('[aria-label="Increase quantity"]');
  assert.equal(decrease.disabled, true);
  await click(decrease);
  assert.equal(document.querySelector("output").textContent, "1");
  await click(increase);
  assert.equal(document.querySelector("output").textContent, "2");
  for (let index = 0; index < 15; index++) await click(increase);
  assert.equal(
    Number(document.querySelector("output").textContent),
    products[0].stock.L,
  );
  assert.equal(increase.disabled, true);
  await click(button("ADD TO CART"));
  assert.match(
    document.querySelector(".pdp-action-message").textContent,
    /Added to your bag/,
  );
  await click(button("BUY NOW"));
  assert.equal(window.location.pathname, "/checkout");
  assert.equal(document.querySelector("h1").textContent, "GUEST CHECKOUT.");
  await navigate("/product/001");
  assert.equal(document.querySelectorAll(".pdp-information summary").length, 3);

  await navigate("/product/002");
  assert.equal(document.querySelector("output").textContent, "1");
  await click(button("BUY NOW"));
  assert.equal(
    document.getElementById("size-message").textContent,
    "SELECT A SIZE",
  );
  await navigate("/product/invalid-id");
  assert.equal(document.querySelector("h1").textContent, "PRODUCT NOT FOUND.");
  for (const [path, count] of [
    ["/", 4],
    ["/shop", 8],
    ["/tops", 5],
    ["/bottoms", 3],
  ]) {
    await navigate(path);
    const links = [...document.querySelectorAll(".product-card-link")];
    assert.equal(links.length, count);
    for (const link of links)
      assert.ok(
        products.some(
          (product) => link.getAttribute("href") === `/product/${product.id}`,
        ),
      );
  }
  // jsdom has no native modal presentation; provide only the missing dialog method.
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  await click(document.querySelector('[aria-label="Search collection"]'));
  const searchLinks = [...document.querySelectorAll(".search-results a")];
  assert.equal(searchLinks.length, 8);
  for (const link of searchLinks)
    assert.ok(
      products.some(
        (product) => link.getAttribute("href") === `/product/${product.id}`,
      ),
    );
  console.log(
    "Passed: 8 product routes, correct data and images, related products, card/search links, unknown ID, size validation, single selection, quantity limits, state reset, and cart actions.",
  );
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.window.close();
}

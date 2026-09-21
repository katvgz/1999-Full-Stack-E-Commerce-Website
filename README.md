# 1999 — Storefront

Streetwear storefront built with React, Vite, JavaScript, CSS, and Lucide React, with guest order submission to Cloud Firestore.

## Run

```sh
npm install
npm run dev
```

On Windows, use `npm.cmd` if PowerShell blocks the npm script. `npm run build` creates the production build; `npm run preview` serves it locally.

`npm run test:products` verifies product routes, card and search links, size validation, quantity limits, and related products in a simulated DOM.

`npm run test:cart` runs real Chrome tests for cart interactions, totals, refresh persistence, empty state, drawer controls, and mobile layouts. It uses installed Google Chrome and starts a Vite server on port 5174. Screenshots are saved to `test-results/`.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for environment setup, publishing the security rules, testing a real order, and local emulator verification. `npm run test:firestore` runs the security rules and complete browser suite against a local demo project only.

## Replace placeholders

- Product names, prices, image paths, and campaign URLs: `src/data/products.js`.
- Original product images: `clothing/shirts/1shirt.png` through `5shirt.png` and `clothing/pants/1pants.png` through `3pants.png`. These files are imported directly without image processing.
- Campaign photos are remote Unsplash placeholders, with CSS monochrome treatments; replace with your own images before launch.
- Styles and responsive breakpoints: `src/styles.css`.

## Catalog routes and data

- `/` — homepage, with the original four featured tees.
- `/shop` — all eight products.
- `/tops` — five tops.
- `/bottoms` — three bottoms.
- `/product/:id` — individual product pages, such as `/product/001`.
- `/checkout` — guest contact, shipping, manual payment reference, and order submission.
- `/order-success` — confirmed submission receipt; direct visits show no order.

The three catalogs reuse `src/pages/CatalogPage.jsx` and `src/components/ProductCard.jsx`. Navigation uses standard links, supporting browser back/forward and opening in new tabs. Vite serves direct route loads and refreshes. When deploying, configure the static host to rewrite these routes to `index.html`.

Each product has `id`, `name`, `category` (`tops` or `bottoms`), `price` (PHP), `images` (an array of image paths), `description`, `sizes`, and `stock` (quantities keyed by S, M, L, XL). Prices and inventory quantities are placeholders.

To replace or add images, import the original files in `src/data/products.js` and update the corresponding product's `images` array. The first image is used on homepage and catalog cards and in search. Additional images are reserved for future use. Product images use `object-fit: contain` to preserve the full image and its aspect ratio, with space for the existing hover zoom.

Product cards and search results link to each product's detail page. Pages read the ID from the URL and use the shared product data; unknown IDs show Product Not Found. The size controls allow one selection, and the product page quantity stays between one and the selected size's temporary stock. Add to Cart requires a size, adds the selected quantity, and opens the bag drawer. Buy Now adds the selection and navigates directly to checkout. Related products show up to three other pieces in the same category (two for bottoms). Temporary details, size guidance, and shipping text live in `productInformation` in the product data file.

## Cart

`src/cart/CartContext.jsx` provides shared cart state and persists it to localStorage under `1999-cart-v1`. Each line stores only product ID, name, image URL, price, selected size, and quantity. The same ID and size merge into one line; different sizes remain separate. Saved lines are checked against the current catalog when restored, so images and prices stay current. Invalid storage is handled safely; if storage is blocked, the cart still works in memory and displays a notice.

`src/cart/CartDrawer.jsx` provides the responsive native dialog, quantity controls, removal, totals, and empty state. The navbar count is the sum of all quantities. The drawer locks background scrolling and supports close button, backdrop, Escape, and native keyboard focus containment. Checkout links to the guest form. The cart is locked while an order is being submitted and is cleared only after Firestore acknowledges success. Failed submissions preserve the cart and current checkout form.

Search filters all eight products locally. Social and information controls show placeholder dialogs. Newsletter submission only displays a coming-soon message; it does not store or send addresses. No authentication, admin portal, uploads, Analytics, payment gateway, automatic payment approval, or email sending is included. Orders always start with pending order and payment-verification statuses.

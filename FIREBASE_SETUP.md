# Firestore orders

The app uses the supplied Firebase project `clothing-98be8` through `.env`. Only Firebase App and Cloud Firestore are initialized, lazily on order submission. No customer sign-in, Analytics, Storage, payment gateway, or email sending is included.

## Publish the rules

1. Open https://console.firebase.google.com/project/clothing-98be8/firestore and select the existing **(default)** Cloud Firestore database.
2. Open **Rules**.
3. Replace the editor contents with the complete contents of the root `firestore.rules` file. These rules deny every collection except validated guest creates in `orders`; check any unrelated existing collection access before publishing.
4. Click **Publish** and wait for the rules to apply. Do not use test-mode `allow read, write: if true` rules.

There is no need to create `orders` manually. The first successful write creates the collection. This implementation uses the default database.

The included `firebase.json` also supports a future explicit CLI deployment: `npx firebase deploy --only firestore:rules --project clothing-98be8`. No deployment is performed by the app or test scripts.

## Run and test an order

1. Restart Vite after environment changes: `npm run dev` (or `npm.cmd run dev` in PowerShell).
2. Add a product with a size and quantity. Open the bag and choose Checkout, or use Buy Now.
3. Enter valid contact and shipping details. Select GCash and enter the transaction reference for a payment you actually made. For a workflow-only test, use a clearly marked reference such as `TEST-NO-PAYMENT-001` and an order note `TEST ORDER — NO PAYMENT SENT`; this must remain unverified. Do not send money to the placeholder bank account.
4. Click Place Order once. The button reads **PLACING ORDER...** while waiting for Firestore, and form/cart editing is disabled. A connection interruption can keep the request pending; keep the page open instead of starting a new order.
5. On acknowledgment, the cart is cleared and `/order-success` displays the generated order number and **PENDING VERIFICATION**.
6. In Firebase Console → Firestore Database → **Data** → **orders**, locate the document whose `orderNumber` matches. Check customer, address, item sizes/quantities, catalog prices, `shippingFee: 120`, total, and `createdAt` timestamp. Confirm `payment.status: pending_verification` and `orderStatus: pending`.
7. Treat a test reference as unpaid. Only an actual matching GCash/bank transaction can support a later manual payment verification. This app never performs that approval.

If the write is denied, confirm that rules were published to this exact project's default database and that the catalog prices match the rules. The app keeps the bag and current form values on a failed submission and enables retry.

## Security and limitations

- Guests can create only documents with the exact expected schema, bounded text, recognized products/sizes, valid quantities, exact catalog prices, matching subtotal/total, a fixed shipping fee, fixed pending statuses, and a server timestamp.
- All guest reads, lists, updates, deletes, and unrelated writes are denied. No collection-wide public read is needed for the success screen.
- The order number uses the full random Firestore document ID prefixed with `1999-`. In-flight duplicate clicks are blocked; an unchanged retry in the same page session reuses the same document ID. Create-only rules prevent overwriting an already created order. This is not a cross-device payment-reference deduplication system.
- The success receipt is held in memory only after a successful write. Refreshing or directly opening `/order-success` shows a neutral state, not a fake success. Customer/order information is not stored in localStorage.
- Prices and product names are deliberately enforced again in `firestore.rules`. When changing catalog names/prices, update the matching rules catalog and publish it. When changing `SHIPPING_FEE` in `src/checkout/checkout.js`, also update and publish the rules. An order supports up to 8 product/size lines, 5 units per line.
- Firebase web configuration is public browser configuration, not an admin credential. `.env` is Git-ignored and `.env.example` contains empty variable names. Access protection comes from published Firestore rules.
- Guest creation does not authenticate a buyer or prove a payment occurred. Orders remain pending until staff verifies the transaction. No admin access has been added.

## Local verification

`npm run test:firestore` starts a local emulator using the isolated `demo-1999` project, checks order security rules, and runs Chrome storefront/checkout tests. It never submits to the live Firebase project or publishes rules. Java 21+ and Google Chrome are required; the runner automatically uses `.tools/java` when present. `.tools` and emulator logs are Git-ignored.

`npm run test:checkout-data` checks order payload construction. `npm run test:products` checks the existing product-page behavior. `npm run build` produces the deployment build.

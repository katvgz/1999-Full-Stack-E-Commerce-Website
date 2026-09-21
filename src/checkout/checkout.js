import { MAX_ITEM_QUANTITY } from "../cart/limits.js";

export const SHIPPING_FEE = 120;
export const PAYMENT_METHODS = {
  gcash: {
    label: "GCASH",
    accountName: "1999 Clothing",
    accountNumber: "09420649264",
  },
  bank_transfer: {
    label: "BANK TRANSFER",
    bank: "BDO",
    accountName: "1999 Clothing",
    accountNumber: "0012 3456 7890",
    placeholder: true,
  },
};

export const emptyCheckout = {
  email: "",
  phone: "",
  fullName: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  orderNotes: "",
  paymentMethod: "",
  paymentReference: "",
};

export const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function validateCheckout(values, items) {
  const errors = {};
  const required = {
    email: "email address",
    phone: "phone number",
    fullName: "full name",
    street: "street address",
    barangay: "barangay",
    city: "city or municipality",
    province: "province",
    postalCode: "postal code",
    paymentMethod: "payment method",
    paymentReference: "payment reference code",
  };
  for (const [key, label] of Object.entries(required)) {
    if (!values[key]?.trim()) errors[key] = `Enter your ${label}.`;
  }
  if (
    values.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
  )
    errors.email = "Enter a valid email address.";
  const phone = values.phone.replace(/[\s()-]/g, "");
  if (phone && !/^(09\d{9}|\+639\d{9})$/.test(phone))
    errors.phone = "Use a Philippine mobile number, e.g. 09171234567.";
  if (values.postalCode.trim() && !/^\d{4}$/.test(values.postalCode.trim()))
    errors.postalCode = "Enter a 4-digit Philippine postal code.";
  if (!Object.hasOwn(PAYMENT_METHODS, values.paymentMethod))
    errors.paymentMethod = "Select a payment method.";
  if (!items.length)
    errors.cart = "Your bag is empty. Add a piece before continuing.";
  if (
    items.length > 8 ||
    items.some(
      (item) =>
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_ITEM_QUANTITY,
    )
  )
    errors.cart =
      `Please keep each size to ${MAX_ITEM_QUANTITY} pieces or fewer and your bag to 8 lines or fewer.`;
  const limits = {
    fullName: 120,
    email: 254,
    street: 200,
    barangay: 100,
    city: 100,
    province: 100,
    paymentReference: 100,
    orderNotes: 1000,
  };
  for (const [key, limit] of Object.entries(limits)) {
    if (values[key].trim().length > limit)
      errors[key] = `Use ${limit} characters or fewer.`;
  }
  return errors;
}

// Called only after validation. Firestore rules independently validate catalog
// prices and totals; the payment reference never approves a payment.
export function prepareOrder(values, cartItems, catalog) {
  const items = cartItems.map((item) => {
    const product = catalog.find((product) => product.id === item.id);
    if (
      !product ||
      !product.sizes.includes(item.size) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_ITEM_QUANTITY
    )
      throw new Error(
        "Your bag has changed. Please review it before continuing.",
      );
    return {
      productId: product.id,
      productName: product.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.price,
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  return {
    customer: {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.replace(/[\s()-]/g, ""),
    },
    shippingAddress: {
      street: values.street.trim(),
      barangay: values.barangay.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      postalCode: values.postalCode.trim(),
    },
    items,
    subtotal,
    shippingFee: SHIPPING_FEE,
    total: subtotal + SHIPPING_FEE,
    payment: {
      method: values.paymentMethod,
      referenceCode: values.paymentReference.trim(),
      status: "pending_verification",
    },
    orderStatus: "pending",
    orderNotes: values.orderNotes.trim(),
  };
}

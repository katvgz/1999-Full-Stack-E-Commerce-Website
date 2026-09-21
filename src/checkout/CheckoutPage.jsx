import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { useCart } from "../cart/CartContext";
import { products } from "../data/products";
import {
  emptyCheckout,
  PAYMENT_METHODS,
  SHIPPING_FEE,
  peso,
  prepareOrder,
  validateCheckout,
} from "./checkout";
import "./checkout.css";
import { submitOrder } from "../firebase/orders";
import { navigateTo } from "../lib/navigation";

const contactFields = [
  {
    name: "email",
    label: "Email Address",
    type: "email",
    autoComplete: "email",
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "tel",
    autoComplete: "tel",
    placeholder: "09XXXXXXXXX",
  },
];
const shippingFields = [
  {
    name: "fullName",
    label: "Full Name",
    autoComplete: "shipping name",
    wide: true,
  },
  {
    name: "street",
    label: "Street Address",
    autoComplete: "shipping address-line1",
    wide: true,
  },
  {
    name: "barangay",
    label: "Barangay",
    autoComplete: "shipping address-line2",
  },
  {
    name: "city",
    label: "City / Municipality",
    autoComplete: "shipping address-level2",
  },
  {
    name: "province",
    label: "Province",
    autoComplete: "shipping address-level1",
  },
  {
    name: "postalCode",
    label: "Postal Code",
    autoComplete: "shipping postal-code",
    inputMode: "numeric",
    maxLength: 4,
  },
];

function Field({ field, values, errors, onChange }) {
  const { name, label, wide, ...inputProps } = field;
  return (
    <div className={`checkout-field ${wide ? "checkout-field-wide" : ""}`}>
      <label htmlFor={`checkout-${name}`}>
        {label} <span aria-hidden="true">*</span>
      </label>
      <input
        id={`checkout-${name}`}
        name={name}
        type="text"
        required
        {...inputProps}
        value={values[name]}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      />
      {errors[name] && (
        <p className="checkout-error" id={`error-${name}`}>
          {errors[name]}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ number, children }) {
  return (
    <div className="checkout-section-title">
      <span>{number}</span>
      <h2>{children}</h2>
    </div>
  );
}

function OrderSummary({ items, subtotal, total }) {
  return (
    <aside className="checkout-summary" aria-labelledby="order-summary-title">
      <div className="checkout-summary-heading">
        <h2 id="order-summary-title">ORDER SUMMARY</h2>
        <span>
          {items.reduce((sum, item) => sum + item.quantity, 0)} PIECES
        </span>
      </div>
      <ul className="checkout-items">
        {items.map((item) => (
          <li key={`${item.id}:${item.size}`}>
            <a href={`/product/${item.id}`} className="checkout-item-image">
              <img src={item.image} alt={item.name} />
            </a>
            <div>
              <a href={`/product/${item.id}`} className="checkout-item-name">
                {item.name}
              </a>
              <p>
                SIZE: {item.size} <span>QTY: {item.quantity}</span>
              </p>
              <strong>{peso.format(item.price * item.quantity)}</strong>
            </div>
          </li>
        ))}
      </ul>
      <dl className="checkout-totals">
        <div>
          <dt>SUBTOTAL</dt>
          <dd data-testid="checkout-subtotal">{peso.format(subtotal)}</dd>
        </div>
        <div>
          <dt>SHIPPING</dt>
          <dd>{peso.format(SHIPPING_FEE)}</dd>
        </div>
        <div className="checkout-grand-total">
          <dt>TOTAL</dt>
          <dd data-testid="checkout-total">{peso.format(total)}</dd>
        </div>
      </dl>
      <p className="checkout-summary-note">SAME PEOPLE. DIFFERENT TIME.</p>
    </aside>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, orderSubmitting, setOrderSubmitting, validateCartStock, stockReady, stockBusy, stockError, stockNotice } =
    useCart();
  const [values, setValues] = useState(emptyCheckout);
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [slowSubmission, setSlowSubmission] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const total = subtotal + SHIPPING_FEE;
  const method = PAYMENT_METHODS[values.paymentMethod];

  useEffect(() => {
    if (!orderSubmitting) {
      setSlowSubmission(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowSubmission(true), 15000);
    return () => window.clearTimeout(timer);
  }, [orderSubmitting]);

  function updateField(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
      ...(name === "paymentMethod" ? { paymentReference: "" } : {}),
    }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "paymentMethod" ? { paymentReference: undefined } : {}),
    }));
    setSubmissionError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (submittingRef.current || orderSubmitting) return;
    if (!stockReady || stockBusy) { setSubmissionError("Please wait until current availability is confirmed."); return; }
    const nextErrors = validateCheckout(values, items);
    setErrors(nextErrors);
    setSubmissionError("");
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      formRef.current?.querySelector(`[name="${firstField}"]`)?.focus();
      return;
    }
    try {
      submittingRef.current = true;
      setOrderSubmitting(true);
      const availableItems = await validateCartStock(items);
      const draft = prepareOrder(values, availableItems, products);
      await submitOrder(draft);
      clearCart();
      navigateTo("/order-success");
    } catch (error) {
      setSubmissionError(
        error.message ||
          "Your order could not be submitted. Your bag and details have been kept.",
      );
    } finally {
      submittingRef.current = false;
      setOrderSubmitting(false);
    }
  }

  if (!items.length)
    return (
      <section className="checkout-empty section-pad">
        <p className="eyebrow">1999 / GUEST CHECKOUT</p>
        <h1>YOUR BAG IS EMPTY.</h1>
        {stockNotice && <p role="status">{stockNotice}</p>}
        <a className="button button-dark" href="/shop">
          RETURN TO SHOP <ArrowUpRight size={18} />
        </a>
      </section>
    );

  return (
    <div className="checkout-page section-pad">
      <a href="/shop" className="checkout-back">
        <ArrowLeft size={15} /> BACK TO SHOP
      </a>
      <header className="checkout-heading">
        <p className="eyebrow">1999 / THE FINAL DETAILS</p>
        <h1>GUEST CHECKOUT.</h1>
        <p>No account needed. Just your next everyday.</p>
      </header>
      <p className="checkout-preview-note">
        Payments are manually verified. Your payment reference will be reviewed
        before your order is processed.
      </p>
      <div className="checkout-layout">
        <form ref={formRef} noValidate onSubmit={submit}>
          <fieldset className="checkout-form-fields" disabled={orderSubmitting}>
            <section className="checkout-section" aria-label="Contact">
              <SectionTitle number="01">CONTACT</SectionTitle>
              <div className="checkout-fields">
                {contactFields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    values={values}
                    errors={errors}
                    onChange={updateField}
                  />
                ))}
              </div>
            </section>
            <section className="checkout-section" aria-label="Shipping">
              <SectionTitle number="02">SHIPPING</SectionTitle>
              <div className="checkout-fields">
                {shippingFields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    values={values}
                    errors={errors}
                    onChange={updateField}
                  />
                ))}
                <div className="checkout-field checkout-field-wide">
                  <label htmlFor="checkout-orderNotes">
                    Order Notes <span>(optional)</span>
                  </label>
                  <textarea
                    id="checkout-orderNotes"
                    name="orderNotes"
                    rows={3}
                    value={values.orderNotes}
                    onChange={(event) =>
                      updateField("orderNotes", event.target.value)
                    }
                    placeholder="Anything we should know about your delivery?"
                  />
                </div>
              </div>
            </section>
            <section className="checkout-section" aria-label="Payment">
              <SectionTitle number="03">PAYMENT</SectionTitle>
              <fieldset
                className="checkout-methods"
                aria-describedby={
                  errors.paymentMethod ? "error-paymentMethod" : undefined
                }
              >
                <legend className="sr-only">Payment method</legend>
                {Object.entries(PAYMENT_METHODS).map(([key, payment]) => (
                  <label key={key}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={key}
                      required
                      checked={values.paymentMethod === key}
                      onChange={() => updateField("paymentMethod", key)}
                      aria-invalid={Boolean(errors.paymentMethod)}
                    />
                    <span>{payment.label}</span>
                  </label>
                ))}
              </fieldset>
              {errors.paymentMethod && (
                <p id="error-paymentMethod" className="checkout-error">
                  {errors.paymentMethod}
                </p>
              )}
              {method && (
                <div className="checkout-payment-details">
                  <h3>{method.label}</h3>
                  {method.placeholder && (
                    <p className="checkout-bank-notice">
                      Do not transfer
                      money to this account.
                    </p>
                  )}
                  <dl>
                    {method.bank && (
                      <div>
                        <dt>Bank:</dt>
                        <dd>{method.bank}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Account Name:</dt>
                      <dd>{method.accountName}</dd>
                    </div>
                    <div>
                      <dt>
                        {values.paymentMethod === "gcash"
                          ? "GCash Number:"
                          : "Account Number:"}
                      </dt>
                      <dd>{method.accountNumber}</dd>
                    </div>
                    <div className="checkout-amount">
                      <dt>AMOUNT TO SEND:</dt>
                      <dd>{peso.format(total)}</dd>
                    </div>
                  </dl>
                  {values.paymentMethod === "gcash" && (
                    <ol>
                      <li>
                        Send the exact order total to the GCash number above.
                      </li>
                      <li>Complete the payment outside this website.</li>
                      <li>Copy the GCash transaction/reference number.</li>
                      <li>
                        Return to checkout and enter the reference number.
                      </li>
                      <li>Submit the order.</li>
                      <li>Payment will be manually verified by the admin.</li>
                    </ol>
                  )}
                </div>
              )}
              <div className="checkout-reference">
                <Field
                  field={{
                    name: "paymentReference",
                    label: "PAYMENT REFERENCE CODE",
                    autoComplete: "off",
                  }}
                  values={values}
                  errors={errors}
                  onChange={updateField}
                />
              </div>
              <div className="checkout-payment-notice">
                <h3>PAYMENTS ARE MANUALLY VERIFIED.</h3>
                <p>
                  Submitting a payment reference code does not mean the payment
                  has been approved. Your order will be processed only after the
                  payment has been verified by 1999.
                </p>
              </div>
            </section>
            {Object.values(errors).some(Boolean) && (
              <p className="checkout-validation" role="alert">
                {errors.cart ||
                  "Please check the highlighted fields before continuing."}
              </p>
            )}
            {(stockNotice || stockError || !stockReady) && <p className="checkout-validation" role="status">{stockNotice} {stockError || (!stockReady ? "Checking current availability..." : "")}</p>}
            {submissionError && (
              <p className="checkout-validation" role="alert">
                {submissionError}
              </p>
            )}
            <button
              className="button checkout-place-order"
              type="submit"
              disabled={orderSubmitting || !stockReady || stockBusy}
              aria-busy={orderSubmitting}
            >
              {orderSubmitting ? "PLACING ORDER..." : "PLACE ORDER"}{" "}
              <ArrowRight size={18} />
            </button>
            {orderSubmitting && (
              <p className="checkout-submitting-note" role="status">
                {slowSubmission
                  ? "Still waiting for confirmation. Check your connection and keep this page open; please don’t place the order again."
                  : "Please keep this page open while we confirm your order."}
              </p>
            )}
          </fieldset>
        </form>
        <OrderSummary items={items} subtotal={subtotal} total={total} />
      </div>
    </div>
  );
}

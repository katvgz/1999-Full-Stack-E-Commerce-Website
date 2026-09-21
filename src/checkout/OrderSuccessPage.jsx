import { ArrowUpRight } from "lucide-react";
import { getConfirmedReceipt } from "../firebase/orders";
import "./checkout.css";

export default function OrderSuccessPage() {
  const receipt = getConfirmedReceipt();
  if (!receipt)
    return (
      <section className="checkout-empty section-pad">
        <p className="eyebrow">1999 / ORDER STATUS</p>
        <h1>NO ORDER TO SHOW.</h1>
        <p>
          This page is available immediately after a successful order
          submission.
        </p>
        <a className="button button-dark" href="/shop">
          CONTINUE SHOPPING <ArrowUpRight size={18} />
        </a>
      </section>
    );
  return (
    <section className="order-success section-pad">
      <p className="eyebrow">1999 / THANK YOU FOR BEING HERE</p>
      <h1>ORDER RECEIVED.</h1>
      <dl>
        <div>
          <dt>ORDER</dt>
          <dd>{receipt.orderNumber}</dd>
        </div>
        <div>
          <dt>PAYMENT STATUS</dt>
          <dd>PENDING VERIFICATION</dd>
        </div>
      </dl>
      <h2>Thank you, {receipt.firstName}.</h2>
      <p>We've received your order and payment reference code.</p>
      <p>
        <strong>Your payment has NOT been confirmed yet.</strong>
      </p>
      <p>
        1999 will manually verify the submitted payment reference before your
        order is processed.
      </p>
      <a className="button button-dark" href="/shop">
        CONTINUE SHOPPING <ArrowUpRight size={18} />
      </a>
    </section>
  );
}

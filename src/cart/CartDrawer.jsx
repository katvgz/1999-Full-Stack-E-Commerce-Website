import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Minus, Plus, X } from "lucide-react";
import { useCart } from "./CartContext";
import "./cart.css";
import { navigateTo } from "../lib/navigation";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    changeQuantity,
    removeItem,
    count,
    subtotal,
    storageError,
    orderSubmitting,
    stockNotice, stockError, stockReady, stockBusy, getStockLimit, validateCartStock,
  } = useCart();
  const [checkingStock, setCheckingStock] = useState(false);
  const dialogRef = useRef(null);
  const previousOverflow = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const unlock = () => {
      if (previousOverflow.current !== null) {
        document.body.style.overflow = previousOverflow.current;
        previousOverflow.current = null;
      }
    };
    if (isOpen) {
      if (!dialog.open) {
        previousOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.showModal();
      }
      return;
    }
    if (dialog.open) {
      const timer = window.setTimeout(
        () => {
          dialog.close();
          unlock();
        },
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 240,
      );
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (previousOverflow.current !== null)
        document.body.style.overflow = previousOverflow.current;
    },
    [],
  );

  return (
    <dialog
      ref={dialogRef}
      className={`cart-drawer ${isOpen ? "cart-is-open" : "cart-is-closing"}`}
      aria-labelledby="cart-title"
      onCancel={(event) => {
        event.preventDefault();
        closeCart();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeCart();
      }}
    >
      <div className="cart-panel">
        <header className="cart-heading">
          <div>
            <p className="eyebrow">1999 / THE EVERYDAY UNIFORM</p>
            <h2 id="cart-title">
              YOUR BAG <span>({count})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close shopping bag"
            autoFocus
          >
            <X size={22} />
          </button>
        </header>
        {(stockNotice || stockError || !stockReady) && <p className="cart-storage-message" role="status">{stockNotice} {stockError || (!stockReady ? "Checking availability..." : "")}</p>}
        {storageError && (
          <p className="cart-storage-message" role="status">
            Your browser couldn’t save this bag. Items will remain available for
            this session.
          </p>
        )}
        {items.length ? (
          <>
            <ul className="cart-items">
              {items.map((item) => (
                <li
                  className="cart-item"
                  key={`${item.id}:${item.size}`}
                  data-product-id={item.id}
                  data-size={item.size}
                >
                  <a
                    href={`/product/${item.id}`}
                    className="cart-item-image"
                    aria-label={`View ${item.name}`}
                  >
                    <img src={item.image} alt={item.name} />
                  </a>
                  <div className="cart-item-info">
                    <a className="cart-item-name" href={`/product/${item.id}`}>
                      {item.name}
                    </a>
                    <p className="cart-item-size">SIZE: {item.size}</p>
                    <p className="cart-unit-price">
                      {peso.format(item.price)} <span>each</span>
                    </p>
                    <div className="cart-item-controls">
                      <div
                        className="cart-quantity"
                        role="group"
                        aria-label={`Quantity for ${item.name}, size ${item.size}`}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}, size ${item.size}`}
                          disabled={item.quantity === 1 || orderSubmitting || stockBusy || checkingStock}
                          onClick={() => changeQuantity(item.id, item.size, -1)}
                        >
                          <Minus size={14} />
                        </button>
                        <output aria-live="polite">{item.quantity}</output>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name}, size ${item.size}`}
                          disabled={item.quantity >= getStockLimit(item.id, item.size) || orderSubmitting || stockBusy || !stockReady || checkingStock}
                          onClick={() => changeQuantity(item.id, item.size, 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove"
                        disabled={orderSubmitting || stockBusy || checkingStock}
                        aria-label={`Remove ${item.name}, size ${item.size}`}
                        onClick={() => removeItem(item.id, item.size)}
                      >
                        REMOVE
                      </button>
                    </div>
                    <p className="cart-line-total" aria-label="Item total">
                      {peso.format(item.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="cart-summary">
              <div className="cart-subtotal">
                <span>SUBTOTAL</span>
                <output aria-live="polite">{peso.format(subtotal)}</output>
              </div>
              <p>Shipping calculated at checkout.</p>
              <a
                className="button cart-checkout"
                href="/checkout"
                aria-disabled={!stockReady || stockBusy || checkingStock || orderSubmitting}
                onClick={async (event) => {
                  if (
                    event.button !== 0 ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  event.preventDefault();
                  if (!stockReady || stockBusy || checkingStock || orderSubmitting) return;
                  setCheckingStock(true);
                  try {
                    await validateCartStock();
                    closeCart(); navigateTo("/checkout");
                  } catch { /* The cart context shows stock correction/error feedback. */ }
                  finally { setCheckingStock(false); }
                }}
              >
                {checkingStock ? "CHECKING STOCK..." : "CHECKOUT"} <ArrowUpRight size={18} />
              </a>
            </footer>
          </>
        ) : (
          <div className="cart-empty">
            <p className="eyebrow">ROOM FOR YOUR NEXT EVERYDAY.</p>
            <h3>YOUR BAG IS EMPTY.</h3>
            <a href="/shop" className="button button-dark" onClick={closeCart}>
              CONTINUE SHOPPING <ArrowUpRight size={18} />
            </a>
          </div>
        )}
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Minus, Plus } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { products, productInformation } from "../data/products";
import "./ProductPage.css";
import { useCart } from "../cart/CartContext";
import { MAX_ITEM_QUANTITY } from "../cart/limits";
import { navigateTo } from "../lib/navigation";

function ProductOptions({ product }) {
  const { addItem, inventory, stockReady, stockError, stockBusy } = useCart();
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [message, setMessage] = useState("");
  const sizesRef = useRef(null);
  const stock = inventory[product.id] || {};
  const available = (option) => stockReady && Number.isInteger(stock[option]) && stock[option] >= 0 && stock[option] <= 999 ? stock[option] : 0;
  const quantityLimit = size ? Math.min(MAX_ITEM_QUANTITY, available(size)) : 1;
  const soldOut = stockReady && !product.sizes.some((option) => available(option) > 0);
  useEffect(() => {
    if (!stockReady) return;
    if (size && !available(size)) {
      setSize(""); setQuantity(1); setMessage("That size is now sold out. Please select another size.");
    } else setQuantity((current) => Math.max(1, Math.min(current, quantityLimit)));
  }, [inventory, stockReady, size, quantityLimit]);

  function selectSize(option) {
    if (!available(option)) return;
    setSize(option);
    setQuantity((current) => Math.min(current, MAX_ITEM_QUANTITY, available(option)));
    setSizeError(false);
    setMessage("");
  }

  async function preparePurchase(buyNow = false) {
    if (!stockReady || stockBusy) return;
    if (!size) {
      setSizeError(true);
      setMessage("");
      sizesRef.current?.querySelector("button:not(:disabled)")?.focus();
      return;
    }
    const result = await addItem(product.id, size, quantity, { openDrawer: !buyNow });
    if (!result.ok) { setMessage(result.message); return; }
    if (buyNow) {
      navigateTo("/checkout");
      return;
    }
    setMessage("Added to your bag.");
  }

  return (
    <div className="pdp-options">
      <p className="pdp-color">
        <span className="eyebrow">COLOR:</span> {product.color}
      </p>
      <fieldset
        className="pdp-sizes"
        ref={sizesRef}
        aria-describedby={sizeError ? "size-message" : undefined}
      >
        <legend className="eyebrow">SIZE:</legend>
        <div className="pdp-size-buttons">
          {product.sizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={size === option}
              disabled={!stockReady || available(option) < 1 || stockBusy}
              onClick={() => selectSize(option)}
            >
              {option}
              <small className="pdp-size-stock">{!stockReady ? "—" : available(option) ? `${available(option)} LEFT` : "SOLD OUT"}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <p id="size-message" className="pdp-size-message" role="status">
        {!stockReady ? stockError || "CHECKING AVAILABILITY..." : sizeError ? "SELECT A SIZE" : soldOut ? "CURRENTLY SOLD OUT" : ""}
      </p>
      <div className="pdp-quantity-row">
        <span id="quantity-label" className="eyebrow">
          QUANTITY:
        </span>
        <div
          className="pdp-quantity"
          role="group"
          aria-labelledby="quantity-label"
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || soldOut || !stockReady || stockBusy}
            onClick={() => {
              setQuantity((value) => Math.max(1, value - 1));
              setMessage("");
            }}
          >
            <Minus size={16} />
          </button>
          <output aria-label="Quantity" aria-live="polite">
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={quantity >= quantityLimit || soldOut || !stockReady || stockBusy || !size}
            onClick={() => {
              setQuantity((value) => Math.min(quantityLimit, value + 1));
              setMessage("");
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="pdp-actions">
        <button
          className="button pdp-add"
          type="button"
          disabled={soldOut || !stockReady || stockBusy}
          onClick={() => preparePurchase()}
        >
          ADD TO CART <Plus size={18} />
        </button>
        <button
          className="button pdp-buy"
          type="button"
          disabled={soldOut || !stockReady || stockBusy}
          onClick={() => preparePurchase(true)}
        >
          BUY NOW <ArrowUpRight size={18} />
        </button>
      </div>
      <p className="pdp-action-message" role="status">
        {message}
      </p>
    </div>
  );
}

function InformationSection({ title, children }) {
  return (
    <details className="pdp-information">
      <summary>
        {title}
        <Plus size={16} aria-hidden="true" />
      </summary>
      <p>{children}</p>
    </details>
  );
}

export default function ProductPage({ product }) {
  if (!product)
    return (
      <section className="pdp-not-found section-pad">
        <p className="eyebrow">1999 / 404</p>
        <h1>PRODUCT NOT FOUND.</h1>
        <p>
          This piece could not be found. Explore the collection to find your
          next everyday.
        </p>
        <a href="/shop" className="button button-dark">
          <ArrowLeft size={16} /> BACK TO SHOP
        </a>
      </section>
    );

  const related = products
    .filter(
      (item) => item.category === product.category && item.id !== product.id,
    )
    .slice(0, 3);
  const information = productInformation[product.category];

  return (
    <div className="product-page section-pad">
      <nav className="pdp-navigation" aria-label="Product navigation">
        <a href={`/${product.category}`}>
          <ArrowLeft size={15} /> BACK TO {product.category.toUpperCase()}
        </a>
        <span>COLLECTION 001 / NO. {product.id}</span>
      </nav>
      <section className="pdp-layout" aria-labelledby="product-title">
        <div className="pdp-image">
          <img
            src={product.images[0]}
            alt={product.name}
            fetchPriority="high"
          />
        </div>
        <div className="pdp-copy">
          <a href={`/${product.category}`} className="eyebrow pdp-category">
            {product.category.toUpperCase()}
          </a>
          <h1 id="product-title">{product.name}</h1>
          <p className="pdp-price">₱{product.price.toLocaleString("en-PH")}</p>
          <p className="pdp-description">{product.description}</p>
          <ProductOptions key={product.id} product={product} />
          <div className="pdp-information-list">
            <InformationSection title="PRODUCT DETAILS">
              {information.details}
            </InformationSection>
            <InformationSection title="SIZE GUIDE">
              {information.sizeGuide}
            </InformationSection>
            <InformationSection title="SHIPPING & RETURNS">
              {productInformation.shippingReturns}
            </InformationSection>
          </div>
        </div>
      </section>
      <section className="pdp-related" aria-labelledby="related-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KEEP GOOD COMPANY.</p>
            <h2 id="related-title">YOU MAY ALSO LIKE</h2>
          </div>
          <a className="text-link" href={`/${product.category}`}>
            ALL {product.category.toUpperCase()} <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="product-grid pdp-related-grid">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

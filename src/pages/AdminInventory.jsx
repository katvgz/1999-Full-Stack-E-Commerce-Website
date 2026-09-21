import { useEffect, useRef, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";
import { resolveProductImage } from "../firebase/adminProducts";
import { loadInventory, saveInventory } from "../firebase/adminInventory";
import { inventorySizes, validStock, stockSummary } from "../data/inventory";
import "./AdminProducts.css";
import "./AdminInventory.css";

const errorText = (error) => error.code === "permission-denied"
  ? "Inventory access denied. Sign in as admin@gmail.com and publish the updated Firestore rules."
  : error.code && error.code !== "inventory/conflict" ? "Could not save inventory. Check your connection and try again." : error.message;

function InventoryRow({ product, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const lock = useRef(false);
  const image = resolveProductImage(product.images?.[0]);
  const summary = validStock(product.stock) ? stockSummary(product.stock) : { total: "—", status: "CHECK STOCK" };

  function edit() {
    setDraft(Object.fromEntries(inventorySizes.map((size) => [size, String(product.stock?.[size] ?? "")])));
    setFeedback(null); setEditing(true);
  }

  async function save() {
    if (lock.current) return;
    const stock = Object.fromEntries(inventorySizes.map((size) => [size, Number(draft[size])]));
    if (inventorySizes.some((size) => !/^\d{1,3}$/.test(draft[size])) || !validStock(stock)) {
      setFeedback({ error: true, text: "Enter a whole number from 0 to 999 for each size." });
      return;
    }
    lock.current = true; setBusy(true); setFeedback(null);
    try {
      const saved = await saveInventory(product.id, stock, product.stock);
      onSaved(saved); setEditing(false);
      setFeedback({ error: false, text: "Stock saved." });
    } catch (error) {
      setFeedback({ error: true, text: errorText(error) });
    } finally { lock.current = false; setBusy(false); }
  }

  return (
    <>
      <tr aria-busy={busy}>
        <td><div className="admin-product-image">{image ? <img src={image} alt={product.name} loading="lazy" /> : <span className="admin-product-no-image">NO IMAGE</span>}</div></td>
        <th scope="row"><span className="admin-product-name">{product.name}</span></th>
        {inventorySizes.map((size) => <td key={size}>{editing ? <input className="admin-inventory-input" type="number" min="0" max="999" step="1" inputMode="numeric" aria-label={`${product.name}, size ${size} stock`} value={draft[size]} disabled={busy} onChange={(event) => setDraft({ ...draft, [size]: event.target.value })} /> : product.stock?.[size] ?? "—"}</td>)}
        <td><strong>{summary.total}</strong></td>
        <td><span className={`admin-inventory-status ${summary.status === "SOLD OUT" ? "is-sold-out" : summary.status === "LOW STOCK" ? "is-low-stock" : ""}`}>{summary.status}</span></td>
        <td><div className="admin-product-actions">{editing ? <><button type="button" disabled={busy} onClick={save}>{busy ? "SAVING..." : "SAVE STOCK"}</button><button type="button" className="admin-product-secondary" disabled={busy} onClick={() => { setEditing(false); setFeedback(null); }}>CANCEL</button></> : <button type="button" onClick={edit} aria-label={`Edit stock for ${product.name}`}>EDIT / RESTOCK</button>}</div></td>
      </tr>
      {feedback && <tr><td colSpan={9}><p className={feedback.error ? "admin-products-error" : ""} role={feedback.error ? "alert" : "status"}>{product.name}: {feedback.text}</p></td></tr>}
    </>
  );
}

export default function AdminInventory() {
  const [state, setState] = useState({ loading: true, products: [], error: "" });
  useEffect(() => {
    let active = true;
    let generation = 0;
    let unsubscribe;
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        const request = ++generation;
        setState({ loading: true, products: [], error: "" });
        if (user?.email !== "admin@gmail.com") {
          setState({ loading: false, products: [], error: "Inventory is available only to the authorized admin account." });
          return;
        }
        try {
          const products = await loadInventory();
          if (active && request === generation) setState({ loading: false, products, error: "" });
        } catch (error) {
          if (active && request === generation) setState({ loading: false, products: [], error: error.code === "permission-denied" ? errorText(error) : "Inventory could not be loaded. Check your connection and reopen Inventory to try again." });
        }
      }, () => {
        if (active) { generation++; setState({ loading: false, products: [], error: "Unable to verify admin access. Please sign in again." }); }
      });
    }).catch(() => {
      if (active) setState({ loading: false, products: [], error: "Unable to initialize admin access. Please sign in again." });
    });
    return () => { active = false; generation++; unsubscribe?.(); };
  }, []);

  if (state.loading) return <p className="admin-products-message" role="status">LOADING INVENTORY...</p>;
  if (state.error) return <p className="admin-products-message admin-products-error" role="alert">{state.error}</p>;
  if (!state.products.length) return <p className="admin-products-message">NO PRODUCTS YET.</p>;
  return (
    <section className="admin-products admin-inventory" aria-label="Inventory management">
      <p className="admin-products-message">Set the available quantity per size (0–999). Totals and status reflect saved stock.</p>
      <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Product stock by size">
        <table className="admin-orders-table admin-products-table">
          <thead><tr><th scope="col">IMAGE</th><th scope="col">PRODUCT</th>{inventorySizes.map((size) => <th scope="col" key={size}>{size}</th>)}<th scope="col">TOTAL</th><th scope="col">STATUS</th><th scope="col">ACTION</th></tr></thead>
          <tbody>{state.products.map((product) => <InventoryRow key={product.id} product={product} onSaved={(saved) => setState((current) => ({ ...current, products: current.products.map((item) => item.id === saved.id ? saved : item) }))} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

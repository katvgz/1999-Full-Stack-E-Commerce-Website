import { useEffect, useRef, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";
import { loadManagedProducts, saveManagedProduct, removeManagedProduct, productImageOptions, resolveProductImage } from "../firebase/adminProducts";
import "./AdminProducts.css";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const sortProducts = (items) => [...items].sort((a, b) => a.id.localeCompare(b.id));
const errorMessage = (error) => error.code === "permission-denied"
  ? "Access denied. Sign in as admin@gmail.com and publish the updated Firestore rules."
  : error.code ? "Could not complete the request. Check your connection and try again." : error.message;

function ProductImage({ product }) {
  const src = resolveProductImage(product.images?.[0]);
  return src ? <img src={src} alt={product.name} loading="lazy" /> : <span className="admin-product-no-image">NO IMAGE</span>;
}

export default function AdminProducts() {
  const [state, setState] = useState({ loading: true, products: [], error: "" });
  const [editor, setEditor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const lock = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    let unsubscribe;
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        const request = ++generation.current;
        setState({ loading: true, products: [], error: "" });
        setEditor(null); setRemoving(null); setFeedback(null);
        if (user?.email !== "admin@gmail.com") {
          setState({ loading: false, products: [], error: "Products are available only to the authorized admin account." });
          return;
        }
        try {
          const products = await loadManagedProducts();
          if (active && request === generation.current) setState({ loading: false, products: sortProducts(products), error: "" });
        } catch (error) {
          if (active && request === generation.current) setState({ loading: false, products: [], error: errorMessage(error) });
        }
      }, () => {
        if (active) { generation.current++; setState({ loading: false, products: [], error: "Unable to verify admin access. Please sign in again." }); }
      });
    }).catch(() => {
      if (active) setState({ loading: false, products: [], error: "Unable to initialize admin access. Please sign in again." });
    });
    return () => { active = false; generation.current++; unsubscribe?.(); };
  }, []);

  function openEditor(product) {
    setRemoving(null); setFeedback(null);
    setEditor(product ? { id: product.id, name: product.name, price: String(product.price), category: product.category, isNew: false }
      : { id: crypto.randomUUID(), name: "", price: "", category: "tops", imagePath: "", isNew: true });
  }

  async function save(event) {
    event.preventDefault();
    if (lock.current || !editor) return;
    if (!editor.name.trim() || !/^\d+(\.\d{1,2})?$/.test(editor.price) || Number(editor.price) <= 0 || Number(editor.price) > 1000000) {
      setFeedback({ error: true, text: "Enter a product name and a price above ₱0, with at most two decimal places (maximum ₱1,000,000)." });
      return;
    }
    lock.current = true; setBusy(true); setFeedback(null);
    const request = generation.current;
    try {
      const saved = await saveManagedProduct(editor.id, { name: editor.name, price: Number(editor.price), category: editor.category }, editor.isNew, editor.imagePath);
      if (request !== generation.current) return;
      setState((current) => ({ ...current, products: sortProducts(editor.isNew
        ? [...current.products.filter((product) => product.id !== editor.id), saved]
        : current.products.map((product) => product.id === editor.id ? { ...product, ...saved } : product)) }));
      setEditor(null);
      setFeedback({ error: false, text: editor.isNew ? "Product added." : "Product updated." });
    } catch (error) {
      if (request === generation.current) setFeedback({ error: true, text: errorMessage(error) });
    } finally { lock.current = false; setBusy(false); }
  }

  async function remove() {
    if (lock.current || !removing) return;
    lock.current = true; setBusy(true); setFeedback(null);
    const request = generation.current;
    try {
      await removeManagedProduct(removing.id);
      if (request !== generation.current) return;
      setState((current) => ({ ...current, products: current.products.filter((product) => product.id !== removing.id) }));
      setRemoving(null); setFeedback({ error: false, text: "Product removed from the admin catalog." });
    } catch (error) {
      if (request === generation.current) setFeedback({ error: true, text: errorMessage(error) });
    } finally { lock.current = false; setBusy(false); }
  }

  if (state.loading) return <p className="admin-products-message" role="status">LOADING PRODUCTS...</p>;
  if (state.error) return <p className="admin-products-message" role="alert">{state.error}</p>;
  return (
    <section className="admin-products" aria-label="Product management">
      <header className="admin-products-toolbar"><span>{state.products.length} PRODUCTS</span><button type="button" disabled={busy} onClick={() => openEditor(null)}>ADD PRODUCT</button></header>
      {feedback && <p className={`admin-products-message ${feedback.error ? "admin-products-error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
      {editor && (
        <form className="admin-product-editor" onSubmit={save}>
          <h2>{editor.isNew ? "ADD PRODUCT" : "EDIT PRODUCT"}</h2>
          <p>PRODUCT ID: {editor.id}</p>
          <fieldset disabled={busy}>
            <label>PRODUCT NAME<input value={editor.name} maxLength={120} required onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
            <label>PRICE (PHP)<input type="number" min="0.01" max="1000000" step="0.01" value={editor.price} required onChange={(event) => setEditor({ ...editor, price: event.target.value })} /></label>
            <label>CATEGORY<select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })}><option value="tops">Top</option><option value="bottoms">Bottom</option></select></label>
            {editor.isNew && <label>EXISTING IMAGE (OPTIONAL)<select value={editor.imagePath} onChange={(event) => setEditor({ ...editor, imagePath: event.target.value })}><option value="">No image yet</option>{productImageOptions.map((image) => <option key={image.path} value={image.path}>{image.label}</option>)}</select></label>}
            <div className="admin-product-actions"><button type="submit">{busy ? "SAVING..." : "SAVE PRODUCT"}</button><button type="button" className="admin-product-secondary" onClick={() => { setEditor(null); setFeedback(null); }}>CANCEL</button></div>
          </fieldset>
        </form>
      )}
      {removing && <div className="admin-product-editor"><h2>REMOVE PRODUCT?</h2><p>Remove {removing.name} ({removing.id}) from the admin catalog? Customer pages will remain unchanged.</p><div className="admin-product-actions"><button type="button" disabled={busy} onClick={remove}>{busy ? "REMOVING..." : "CONFIRM REMOVE"}</button><button type="button" className="admin-product-secondary" disabled={busy} onClick={() => { setRemoving(null); setFeedback(null); }}>CANCEL</button></div></div>}
      {!state.products.length ? <p className="admin-products-message">NO PRODUCTS YET.</p> : (
        <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Managed products">
          <table className="admin-orders-table admin-products-table">
            <thead><tr><th scope="col">IMAGE</th><th scope="col">PRODUCT / ID</th><th scope="col">CATEGORY</th><th scope="col">PRICE</th><th scope="col">ACTIONS</th></tr></thead>
            <tbody>{state.products.map((product) => <tr key={product.id}>
              <td><div className="admin-product-image"><ProductImage product={product} /></div></td>
              <th scope="row"><span className="admin-product-name">{product.name}</span><span className="admin-product-id">{product.id}</span></th>
              <td>{product.category === "tops" ? "Top" : "Bottom"}</td><td>{Number.isFinite(product.price) ? peso.format(product.price) : "—"}</td>
              <td><div className="admin-product-actions"><button type="button" disabled={busy} aria-label={`Edit ${product.name}`} onClick={() => openEditor(product)}>EDIT</button><button type="button" className="admin-product-secondary" disabled={busy} aria-label={`Remove ${product.name}`} onClick={() => { setEditor(null); setFeedback(null); setRemoving(product); }}>REMOVE</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { products } from "../data/products";
import { MAX_ITEM_QUANTITY } from "./limits";
import { fetchCurrentStock, watchStoreInventory, reconcileStock, stockLimit } from "../firebase/storeInventory";

export const CART_STORAGE_KEY = "1999-cart-v1";
const CartContext = createContext(null);

// Reconcile saved lines with current catalog data (including Vite image URLs).
export function restoreCart(value) {
  if (!Array.isArray(value)) return [];
  const lines = new Map();
  for (const saved of value) {
    if (!saved || !Number.isSafeInteger(saved.quantity) || saved.quantity < 1)
      continue;
    const product = products.find((item) => item.id === saved.id);
    if (!product || !product.sizes.includes(saved.size)) continue;
    const key = `${product.id}:${saved.size}`;
    const quantity = Math.min(MAX_ITEM_QUANTITY, (lines.get(key)?.quantity || 0) + Math.min(MAX_ITEM_QUANTITY, saved.quantity));
    lines.set(key, {
      id: product.id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      size: saved.size,
      quantity,
    });
  }
  return [...lines.values()];
}

function loadCart() {
  try {
    return restoreCart(
      JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]"),
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [inventory, setInventory] = useState({});
  const [stockReady, setStockReady] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockNotice, setStockNotice] = useState("");
  const [stockBusy, setStockBusy] = useState(false);
  const itemsRef = useRef(items);
  const inventoryRef = useRef({});
  const mutationLock = useRef(false);
  const orderLock = useRef(false);

  function commitItems(next) { itemsRef.current = next; setItems(next); }
  function applyInventory(next) {
    inventoryRef.current = { ...inventoryRef.current, ...next };
    setInventory(inventoryRef.current);
    if (!orderLock.current) {
      const result = reconcileStock(itemsRef.current, inventoryRef.current);
      if (result.message) { commitItems(result.items); setStockNotice(result.message); }
    }
  }

  useEffect(() => {
    let active = true;
    let stop;
    const failed = () => {
      if (active) { setStockReady(false); setStockError("Availability could not be confirmed. Please check your connection and try again."); }
    };
    watchStoreInventory((next) => {
      if (!active) return;
      applyInventory(next); setStockReady(true); setStockError("");
    }, failed).then((unsubscribe) => { if (active) stop = unsubscribe; else unsubscribe(); }).catch(failed);
    return () => { active = false; stop?.(); };
  }, []);

  async function validateCartStock(expected = itemsRef.current) {
    if (mutationLock.current) throw new Error("Please wait until your bag update finishes.");
    let latest;
    try { latest = await fetchCurrentStock(expected.map((item) => item.id)); }
    catch {
      const message = "Availability could not be confirmed. Check your connection and try again before checkout.";
      setStockError(message); throw new Error(message);
    }
    setStockError("");
    applyInventory(latest);
    const result = reconcileStock(expected, latest);
    if (result.message) {
      commitItems(result.items); setStockNotice(result.message);
      throw new Error(`${result.message} Review your bag before placing the order.`);
    }
    if (!result.items.length) throw new Error("Your bag is empty.");
    return result.items;
  }

  useEffect(() => {
    try {
      if (items.length)
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      else window.localStorage.removeItem(CART_STORAGE_KEY);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [items]);

  async function addItem(id, size, quantity, { openDrawer = true } = {}) {
    if (orderLock.current || mutationLock.current) return { ok: false, message: "Please wait while availability is checked." };
    const product = products.find((item) => item.id === id);
    if (
      !product ||
      !product.sizes.includes(size) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    )
      return { ok: false, message: "Select a valid size and quantity." };
    mutationLock.current = true; setStockBusy(true);
    try {
      const latest = await fetchCurrentStock([...itemsRef.current.map((item) => item.id), id]);
      if (orderLock.current) return { ok: false, message: "An order is being submitted. Please wait." };
      setStockError("");
      applyInventory(latest);
      const current = itemsRef.current;
      const inBag = current.find((item) => item.id === id && item.size === size)?.quantity || 0;
      const limit = stockLimit(latest, id, size);
      if (!limit || inBag + quantity > limit) return { ok: false, message: limit
        ? `Maximum ${limit} available for size ${size}. You already have ${inBag} in your bag.` : `Size ${size} is sold out.` };
      commitItems(restoreCart([...current, { id, size, quantity }]));
      if (openDrawer) setIsOpen(true);
      return { ok: true };
    } catch {
      const message = "Availability could not be checked. Please try again.";
      setStockError(message); return { ok: false, message };
    } finally { mutationLock.current = false; setStockBusy(false); }
  }

  async function changeQuantity(id, size, delta) {
    if (orderLock.current || mutationLock.current) return;
    if (delta > 0) {
      const result = await addItem(id, size, delta, { openDrawer: false });
      if (!result.ok) setStockNotice(result.message);
      return;
    }
    commitItems(itemsRef.current.map((item) => item.id === id && item.size === size
      ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item));
  }

  const value = {
    items,
    isOpen,
    storageError,
    orderSubmitting,
    inventory, stockReady, stockError, stockNotice, stockBusy, validateCartStock,
    getStockLimit: (id, size) => stockLimit(inventory, id, size),
    setOrderSubmitting: (value) => {
      orderLock.current = value; setOrderSubmitting(value);
      if (!value && stockReady) applyInventory(inventoryRef.current);
    },
    clearCart: () => {
      commitItems([]); setStockNotice("");
      setIsOpen(false);
      try {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        setStorageError(true);
      }
    },
    addItem,
    changeQuantity,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    removeItem: (id, size) => !orderLock.current && !mutationLock.current &&
      commitItems(itemsRef.current.filter((item) => item.id !== id || item.size !== size)),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}

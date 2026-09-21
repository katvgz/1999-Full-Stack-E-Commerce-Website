import { useEffect, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";

export default function useAdminOverview() {
  const [state, setState] = useState({ loading: true, orders: [], products: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let generation = 0;
    let unsubscribe;
    const fail = (error) => {
      if (active) setState({ loading: false, orders: [], products: [], error:
        error?.code === "permission-denied"
          ? "Overview access denied. Sign in as admin@gmail.com and ensure the current Firestore rules are published."
          : "The overview could not be loaded. Check your connection and try again." });
    };
    setState({ loading: true, orders: [], products: [], error: "" });
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        const request = ++generation;
        setState({ loading: true, orders: [], products: [], error: "" });
        if (user?.email !== "admin@gmail.com") {
          setState({ loading: false, orders: [], products: [], error: "Overview is available only to the authorized admin account." });
          return;
        }
        try {
          const [{ collection, getDocs }, { getOrderDatabase }] = await Promise.all([
            import("firebase/firestore/lite"), import("../firebase/firebase"),
          ]);
          if (!active || request !== generation) return;
          const db = getOrderDatabase();
          // Read only: do not initialize, edit, or seed products from Overview.
          const [orders, products] = await Promise.all([
            getDocs(collection(db, "orders")), getDocs(collection(db, "products")),
          ]);
          if (!active || request !== generation) return;
          const records = (snapshot) => snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
          setState({ loading: false, orders: records(orders), products: records(products), error: "" });
        } catch (error) { if (request === generation) fail(error); }
      }, (error) => { generation++; fail(error); });
    }).catch(fail);
    return () => { active = false; generation++; unsubscribe?.(); };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

import { useEffect, useRef, useState } from "react";
import { loadAdminAuth } from "../firebase/adminAuth";
import "./AdminLoginPage.css";
import { LayoutDashboard, ClipboardList, Truck, Shirt, Package, LogOut, ArrowUpRight } from "lucide-react";
import AdminOverview from "./AdminOverview";
import AdminOrders from "./AdminOrders";
import AdminShipping from "./AdminShipping";
import AdminProducts from "./AdminProducts";
import AdminInventory from "./AdminInventory";
import "./AdminDashboardPage.css";

const adminNavigation = [
  ["OVERVIEW", LayoutDashboard], ["ORDERS", ClipboardList],
  ["SHIPPING", Truck], ["PRODUCTS", Shirt], ["INVENTORY", Package],
];

function returnToLogin() {
  window.history.replaceState({}, "", "/admin");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
}

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const signingOut = useRef(false);
  const [activeSection, setActiveSection] = useState("OVERVIEW");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    document.title = "Admin Dashboard — 1999";
    let active = true;
    let unsubscribe;
    loadAdminAuth().then(({ auth, onAuthStateChanged }) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!active) return;
        if (user) setAuthenticated(true);
        else returnToLogin();
      }, () => {
        if (active) returnToLogin();
      });
    }).catch(() => {
      if (active) returnToLogin();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function handleLogout() {
    if (signingOut.current) return;
    signingOut.current = true;
    setLoggingOut(true);
    setMessage("");
    try {
      const { auth, signOut } = await loadAdminAuth();
      await signOut(auth);
      returnToLogin();
    } catch {
      setMessage("Could not log out. Please try again.");
    } finally {
      signingOut.current = false;
      setLoggingOut(false);
    }
  }

  if (!authenticated) return <main className="admin-login admin-dashboard-placeholder"><p role="status">CHECKING ACCESS...</p></main>;

  return (
    <div className="admin-dashboard">
      <a className="skip-link" href="#admin-content">Skip to dashboard content</a>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand"><span>1999</span><p>STORE ADMINISTRATION</p></div>
        <nav aria-label="Admin navigation">
          {adminNavigation.map(([label, Icon]) => (
            <button key={label} type="button" aria-current={activeSection === label ? "page" : undefined} onClick={() => setActiveSection(label)}>
              <Icon size={17} strokeWidth={1.5} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <p>SAME PEOPLE.<br />DIFFERENT TIME.</p>
          <button className="admin-logout" onClick={handleLogout} disabled={loggingOut}><LogOut size={17} aria-hidden="true" />{loggingOut ? "LOGGING OUT..." : "LOG OUT"}</button>
          {message && <p className="admin-logout-error" role="alert">{message}</p>}
        </div>
      </aside>
      <main id="admin-content" className="admin-dashboard-main">
        <div className="admin-dashboard-topline"><span>1999 / CONTROL ROOM</span>{activeSection === "ORDERS" ? <button type="button" className="admin-demo-label" aria-pressed={pendingOnly} title={pendingOnly ? "Click to show all orders" : "Show orders awaiting payment approval"} onClick={() => setPendingOnly((current) => !current)}>TO BE APPROVED ({pendingCount}){pendingOnly ? " / SHOW ALL" : ""}</button> : <span className="admin-demo-label">{["PRODUCTS", "INVENTORY"].includes(activeSection) ? "FIRESTORE PRODUCTS" : activeSection === "SHIPPING" ? "FIRESTORE ORDERS" : "FIRESTORE OVERVIEW"}</span>}</div>
        <header className="admin-dashboard-heading">
          <div><p className="admin-dashboard-eyebrow">THE EVERYDAY, AT A GLANCE.</p><h1>{activeSection}</h1></div>
          <ArrowUpRight size={40} strokeWidth={1} aria-hidden="true" />
        </header>
        <p className="admin-sample-note">{activeSection === "INVENTORY" ? "Manage stock by size. Inventory is not connected to customer purchases yet." : activeSection === "PRODUCTS" ? "Manage the admin catalog. Changes here do not affect customer pages yet." : activeSection === "ORDERS" ? "Customer orders, newest first. Review pending payments below." : activeSection === "SHIPPING" ? "Approved payments only. Processing → Packed → Shipped → Delivered." : "Store totals and latest activity from Firestore."}</p>
        {activeSection === "OVERVIEW" ? <AdminOverview /> : activeSection === "ORDERS" ? <AdminOrders pendingOnly={pendingOnly} onPendingCountChange={setPendingCount} /> : activeSection === "SHIPPING" ? <AdminShipping /> : activeSection === "PRODUCTS" ? <AdminProducts /> : activeSection === "INVENTORY" ? <AdminInventory /> : (
          <section className="admin-section-placeholder">
            <span className="admin-dashboard-eyebrow">COMING NEXT</span>
            <h2>{activeSection}</h2>
            <p>This section is not connected yet. The store overview is available under Overview.</p>
          </section>
        )}
        <footer className="admin-dashboard-footer"><span>1999 — THE EVERYDAY UNIFORM</span><span>ADMIN / {activeSection}</span></footer>
      </main>
    </div>
  );
}

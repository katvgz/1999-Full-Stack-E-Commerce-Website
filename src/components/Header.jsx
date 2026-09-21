import { useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "../cart/CartContext";
export const navLinks = [
  ["SHOP", "/shop"],
  ["TOPS", "/tops"],
  ["BOTTOMS", "/bottoms"],
  ["ABOUT", "/#about"],
];
export default function Header({ onSearch, onCart, currentPath }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  return (
    <header className="header">
      <a href="/" className="logo" aria-label="1999 home">
        1999<sup>®</sup>
      </a>
      <nav
        className={menuOpen ? "navigation is-open" : "navigation"}
        aria-label="Main navigation"
      >
        {[...navLinks, ["ADMIN PREVIEW", "/admin-preview"]].map(([name, href]) => (
          <a
            key={name}
            href={href}
            aria-current={currentPath === href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {name}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <button aria-label="Search collection" onClick={onSearch}>
          <Search size={20} />
        </button>
        <button aria-label="Open shopping bag" onClick={onCart}>
          <ShoppingBag size={20} />
          <span
            className="bag-count"
            aria-live="polite"
            aria-label={`${count} items in bag`}
          >
            ({count})
          </span>
        </button>
        <button
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}

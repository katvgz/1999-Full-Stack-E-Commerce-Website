import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Plus,
  Asterisk,
} from "lucide-react";
import Header, { navLinks } from "./components/Header";
import ProductCard from "./components/ProductCard";
import Modal from "./components/Modal";
import { products, campaignImages } from "./data/products";
import CatalogPage, { catalogRoutes } from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import { CartProvider, useCart } from "./cart/CartContext";
import CartDrawer from "./cart/CartDrawer";
import CheckoutPage from "./checkout/CheckoutPage";
import { usePathname } from "./lib/navigation";
import OrderSuccessPage from "./checkout/OrderSuccessPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminPreviewPage from "./preview/AdminPreviewPage";
import InformationPage, { informationRoutes } from "./pages/InformationPage";
import storefrontPhoto from "../clothing/bg/shop1999.png";
import "./StorefrontPhoto.css";

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function CategoryPanel({ name, image, description, href }) {
  return (
    <a id={name.toLowerCase()} className="category-panel" href={href}>
      <img src={image} alt={description} loading="lazy" />
      <span className="category-top">THE EVERYDAY UNIFORM</span>
      <span className="category-bottom">
        <span>{name}</span>
        <ArrowUpRight size={42} strokeWidth={1} />
      </span>
    </a>
  );
}

export default function App() {
  const currentPath = usePathname().replace(/\/+$/, "") || "/";
  if (currentPath === "/admin-preview") return <AdminPreviewPage />;
  if (currentPath === "/admin") return <AdminLoginPage />;
  if (currentPath === "/admin/dashboard") return <AdminDashboardPage />;
  return (
    <CartProvider>
      <Storefront />
    </CartProvider>
  );
}

function Storefront() {
  const { openCart } = useCart();
  const currentPath = usePathname().replace(/\/+$/, "") || "/";
  const catalogPage = catalogRoutes[currentPath];
  const informationTitle = informationRoutes[currentPath];
  const productRoute = currentPath.match(/^\/product\/([^/]+)$/);
  const product = productRoute
    ? products.find((item) => item.id === productRoute[1])
    : undefined;
  useEffect(() => {
    document.title =
      informationTitle ? `${informationTitle} — 1999` : currentPath === "/order-success"
        ? "Order Status — 1999"
        : currentPath === "/checkout"
          ? "Guest Checkout — 1999"
          : productRoute
            ? `${product?.name || "Product Not Found"} — 1999`
            : catalogPage
              ? `${catalogPage.label} — 1999`
              : "1999 — Same people. Different time.";
  }, [catalogPage, currentPath, product, informationTitle]);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const results = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header
        currentPath={currentPath}
        onSearch={() => setModal("search")}
        onCart={openCart}
      />
      <main id="main">
        {informationTitle ? <InformationPage title={informationTitle} /> : currentPath === "/order-success" ? (
          <OrderSuccessPage />
        ) : currentPath === "/checkout" ? (
          <CheckoutPage />
        ) : productRoute ? (
          <ProductPage key={productRoute[1]} product={product} />
        ) : catalogPage ? (
          <CatalogPage page={catalogPage} currentPath={currentPath} />
        ) : currentPath !== "/" ? (
          <section className="section-pad catalog-intro">
            <p className="eyebrow">1999 / 404</p>
            <h1>PAGE NOT FOUND.</h1>
            <a className="button button-dark" href="/shop">
              EXPLORE THE COLLECTION <ArrowUpRight size={18} />
            </a>
          </section>
        ) : (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <img
                className="hero-photo"
                src={campaignImages.hero}
                alt="Dog gripping distressed fabric"
                fetchPriority="high"
              />
              <div className="hero-shade" />
              <div className="hero-topline">
                <span>INDEPENDENT MINDS. TIMELESS UNIFORM.</span>
                <span>COLLECTION 001 — 2026</span>
              </div>
              <div className="hero-brand" aria-hidden="true">
                1999<span>®</span>
              </div>
              <div className="hero-bottom">
                <div>
                  <p className="eyebrow">NOT A YEAR. A FEELING.</p>
                  <h1 id="hero-title">
                    SAME PEOPLE.
                    <br />
                    DIFFERENT TIME.
                  </h1>
                  <a className="button button-light" href="/shop">
                    SHOP THE COLLECTION <ArrowUpRight size={18} />
                  </a>
                </div>
                <div className="hero-side">
                  <p>
                    WORN IN.
                    <br />
                    NEVER WORN OUT.
                  </p>
                  <a href="#new-drop" aria-label="Scroll to new drop">
                    <ArrowDown size={22} />
                  </a>
                </div>
              </div>
              <span className="hero-caption">
                [ THE DAYS CHANGE. WE DON'T. ]
              </span>
            </section>
            <div className="ticker" aria-hidden="true">
              <span>MADE TO BE LIVED IN</span>
              <Asterisk />
              <span>SAME PEOPLE. DIFFERENT TIME.</span>
              <Asterisk />
              <span>1999 — FOREVER IN THE MAKING</span>
              <Asterisk />
              <span>MADE TO BE LIVED IN</span>
            </div>
            <section className="new-drop section-pad" id="new-drop">
              <SectionHeading
                eyebrow="A NEW CHAPTER. THE SAME US."
                title={
                  <>
                    NEW DROP <span>/ 001</span>
                  </>
                }
              >
                <a className="text-link" href="/shop">
                  EXPLORE THE COLLECTION <ArrowUpRight size={17} />
                </a>
              </SectionHeading>
              <div className="product-grid">
                {products.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="drop-foot">
                <span>FOUR PIECES. ENDLESS REPEATS.</span>
                <span>DESIGNED FOR THE EVERYDAY.</span>
              </div>
            </section>
            <section className="editorial" aria-labelledby="editorial-title">
              <div className="editorial-copy">
                <p className="eyebrow">1999 / FIELD NOTES NO. 001</p>
                <h2 id="editorial-title">
                  A SMALLER
                  <br />
                  WORLD.
                  <br />
                  <span>
                    BIGGER
                    <br />
                    DREAMS.
                  </span>
                </h2>
                <p>
                  For the places we go.
                  <br />
                  And the people we stay.
                </p>
                <span className="editorial-wordmark">
                  1999<sup>®</sup>
                </span>
              </div>
              <div className="editorial-image editorial-storefront">
                <figure className="storefront-study">
                  <div className="storefront-study-paper">
                    <img src={storefrontPhoto} alt="1999 storefront with concrete facade and shop signage" loading="lazy" width="1536" height="1024" />
                  </div>
                  <figcaption>1999 / STOREFRONT STUDY 001</figcaption>
                </figure>
                <span className="image-stamp">
                  SOMEWHERE BETWEEN
                  <br />
                  THEN & NOW.
                </span>
                <span className="photo-index">FIG. 01 — THE EVERYDAY</span>
              </div>
            </section>
            <section className="categories section-pad" id="categories">
              <SectionHeading
                eyebrow="BUILD YOUR EVERYDAY"
                title="FIND YOUR FIT."
              >
                <span className="tiny-label">NO RULES. JUST YOU.</span>
              </SectionHeading>
              <div className="category-grid">
                <CategoryPanel
                  name="TOPS"
                  image={campaignImages.tops}
                  description="Five 1999 graphic shirts hanging together"
                  href="/tops"
                />
                <CategoryPanel
                  name="BOTTOMS"
                  image={campaignImages.bottoms}
                  description="Three pairs of 1999 denim pants laid out together"
                  href="/bottoms"
                />
              </div>
            </section>
            <section className="brand-statement section-pad" id="about">
              <span className="eyebrow">ROOTED IN THEN. MADE FOR NOW.</span>
              <div>
                <h2>
                  SAME PEOPLE.
                  <br />
                  <span>DIFFERENT TIME.</span>
                </h2>
                <p>
                  1999 is built around pieces that feel lived in,
                  <br className="desktop-break" /> remembered, and carried
                  forward.
                </p>
              </div>
              <Asterisk className="brand-asterisk" size={75} strokeWidth={1} />
            </section>
            <section className="newsletter section-pad">
              <div>
                <p className="eyebrow">GOOD THINGS DON'T STAY QUIET.</p>
                <h2>STAY IN THE LOOP.</h2>
                <p>New drops. Field notes. A little bit of 1999.</p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setNewsletterMessage(
                    "You’re early. Newsletter sign-ups are coming soon.",
                  );
                }}
              >
                <div className="email-field">
                  <label className="sr-only" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="YOUR EMAIL ADDRESS"
                    required
                    autoComplete="email"
                  />
                  <button type="submit">
                    JOIN <ArrowRight size={18} />
                  </button>
                </div>
                <p className="form-message" role="status">
                  {newsletterMessage || "JUST THE GOOD STUFF. ALWAYS."}
                </p>
              </form>
            </section>
          </>
        )}
      </main>
      <footer className="footer section-pad">
        <div className="footer-main">
          <a href="/" className="footer-logo" aria-label="1999 home">
            1999<sup>®</sup>
          </a>
          <div className="footer-column">
            <span>THE COLLECTION</span>
            {navLinks.map(([name, href]) => (
              <a key={name} href={href}>
                {name}
              </a>
            ))}
          </div>
          <div className="footer-column">
            <span>FIND US ELSEWHERE</span>
            {["Instagram", "TikTok", "Facebook"].map((name) => (
              <a key={name} href={`/contact#${name.toLowerCase()}`} title={`${name} — portfolio demo details`}>
                {name}
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
          <div className="footer-column">
            <span>THE DETAILS</span>
            {Object.entries(informationRoutes).map(([href, name]) => (
              <a key={name} href={href}>
                {name}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 1999. ALL RIGHTS RESERVED.</span>
          <span>SAME PEOPLE. DIFFERENT TIME.</span>
          <a href="/admin">ADMIN</a>
          <a href="#">
            BACK TO TOP <Plus size={14} />
          </a>
        </div>
      </footer>
      <CartDrawer />
      {modal && (
        <Modal
          title={
            modal === "search"
              ? "FIND YOUR NEXT EVERYDAY."
              : modal.toUpperCase()
          }
          onClose={() => setModal(null)}
        >
          {modal === "search" ? (
            <>
              <label className="sr-only" htmlFor="search">
                Search products
              </label>
              <input
                id="search"
                className="search-input"
                placeholder="Search the collection..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
              <div className="search-results">
                {results.length ? (
                  results.map((product) => (
                    <a
                      key={product.id}
                      href={`/product/${product.id}`}
                      onClick={() => setModal(null)}
                    >
                      <img src={product.images[0]} alt="" />
                      <span>{product.name}</span>
                      <span>₱{product.price}</span>
                    </a>
                  ))
                ) : (
                  <p>No pieces found. Try “tee” or “1999”.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p>
                {["Instagram", "TikTok", "Facebook"].includes(modal)
                  ? `1999 on ${modal} — official account coming soon.`
                  : `${modal.charAt(0)}${modal.slice(1).toLowerCase()} information is coming soon. Stay in the loop for launch updates.`}
              </p>
              <a
                className="button button-dark"
                href="/#email"
                onClick={() => setModal(null)}
              >
                STAY IN THE LOOP
                <ArrowUpRight size={18} />
              </a>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

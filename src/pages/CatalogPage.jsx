import { ArrowUpRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export const catalogRoutes = {
  "/shop": {
    title: "THE COLLECTION.",
    label: "Shop",
    description: "An everyday uniform. A little worn in. Entirely your own.",
  },
  "/tops": {
    title: "TOPS.",
    label: "Tops",
    category: "tops",
    description: "Oversized silhouettes. Familiar feelings. Made to live in.",
  },
  "/bottoms": {
    title: "BOTTOMS.",
    label: "Bottoms",
    category: "bottoms",
    description: "Baggy cuts. Lived-in washes. Room to move your own way.",
  },
};

export default function CatalogPage({ page, currentPath }) {
  const collection = products.filter(
    (product) => !page.category || product.category === page.category,
  );
  return (
    <section className="catalog section-pad" aria-labelledby="catalog-title">
      <div className="catalog-intro">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <a href="/">HOME</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{page.label.toUpperCase()}</span>
        </nav>
        <p className="eyebrow">1999 / COLLECTION 001</p>
        <div className="catalog-heading">
          <h1 id="catalog-title">{page.title}</h1>
          <ArrowUpRight aria-hidden="true" strokeWidth={1} />
        </div>
        <p className="catalog-description">{page.description}</p>
      </div>
      <div className="catalog-toolbar">
        <nav aria-label="Product categories">
          {Object.entries(catalogRoutes).map(([path, item]) => (
            <a
              key={path}
              href={path}
              aria-current={currentPath === path ? "page" : undefined}
            >
              {item.category ? item.label.toUpperCase() : "ALL PIECES"}
              <span>
                {products
                  .filter(
                    (product) =>
                      !item.category || product.category === item.category,
                  )
                  .length.toString()
                  .padStart(2, "0")}
              </span>
            </a>
          ))}
        </nav>
        <span className="catalog-count">
          {collection.length.toString().padStart(2, "0")} PIECES
        </span>
      </div>
      <div className="product-grid catalog-grid">
        {collection.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div className="drop-foot">
        <span>SAME PEOPLE. DIFFERENT TIME.</span>
        <span>MADE TO BE LIVED IN.</span>
      </div>
    </section>
  );
}

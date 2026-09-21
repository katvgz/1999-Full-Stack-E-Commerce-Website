export default function ProductCard({ product }) {
  return (
    <article className="product-card" id={`product-${product.id}`}>
      <a
        className="product-card-link"
        href={`/product/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        <div className="product-image">
          <span className="product-index">NO. {product.id}</span>
          <img src={product.images[0]} alt={product.name} loading="lazy" />
          <span className="product-note">
            {product.category === "tops" ? "OVERSIZED FIT" : "BAGGY FIT"}
          </span>
        </div>
        <div className="product-info">
          <h3>{product.name}</h3>
          <span>₱{product.price}</span>
        </div>
        <p className="product-color">{product.color}</p>
        <p className="product-category">{product.category}</p>
      </a>
    </article>
  );
}

import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { type Product } from "../../data";
import { useCurrency } from "../../context/CurrencyContext";

type ProductCardProps = {
  product: Product;
  onQuickShop: () => void;
};

export default function ProductCard({ product, onQuickShop }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useCart();
  const { formatPrice: money } = useCurrency();
  const saved = isInWishlist(product.id);



  return (
    <article className="product-card">
      <div className="product-media">
        <Link to={`/product/${product.id}`} aria-label={`View details for ${product.name}`}>
          <img src={product.image} alt={product.alt} loading="lazy" />
        </Link>
        {product.badge && <span className="badge">{product.badge}</span>}
        <button
          className={`wish-button ${saved ? "saved" : ""}`}
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart size={18} fill={saved ? "#111" : "none"} color={saved ? "#111" : "currentColor"} />
        </button>
        <button className="quick-button" type="button" onClick={onQuickShop}>
          Quick shop
        </button>
      </div>

      <div className="product-info">
        <div>
          <p className="product-card-category">{product.category}</p>
          <h3>
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </h3>
        </div>
        <div className="price">
          {product.compareAt && <span className="compare-at">{money(product.compareAt)}</span>}
          <span className="current-price">{money(product.price)}</span>
        </div>
      </div>

      <div className="product-footer">
        <div className="swatches" aria-label={`${product.name} colors`}>
          {product.colors.map((color) => (
            <span
              key={color}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <Link className="view-details-btn" to={`/product/${product.id}`}>
          View Details
        </Link>
      </div>
    </article>
  );
}

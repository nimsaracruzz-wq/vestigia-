import { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { type Product } from "../../data";
import { useCurrency } from "../../context/CurrencyContext";
import { motion } from "framer-motion";

type ProductCardProps = {
  product: Product;
  onQuickShop: () => void;
};

export default function ProductCard({ product, onQuickShop }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useCart();
  const { formatPrice: money } = useCurrency();
  const saved = isInWishlist(product.id);
  const [hovered, setHovered] = useState(false);

  // We show model image (index 3) or back image (index 1) on hover
  const hoverImage = product.images[3] || product.images[1] || product.image;
  const currentImage = hovered ? hoverImage : product.image;

  return (
    <article 
      className="product-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="product-media">
        <Link to={`/product/${product.id}`} aria-label={`View details for ${product.name}`}>
          <img src={currentImage} alt={product.alt} loading="lazy" style={{ transition: 'all 0.3s ease' }} />
        </Link>
        {product.badge && <span className="badge">{product.badge}</span>}
        <motion.button
          className={`wish-button ${saved ? "saved" : ""}`}
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: saved ? [1, 1.35, 1] : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Heart size={18} fill={saved ? "#111" : "none"} color={saved ? "#111" : "currentColor"} style={{ transition: "fill 0.3s ease, color 0.3s ease" }} />
        </motion.button>
        <button className="quick-button" type="button" onClick={onQuickShop}>
          Quick Add
        </button>
      </div>


      <div className="product-info">
        <div>
          <p className="product-card-category" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>
            {product.productType || "Premium Tee"}
          </p>
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

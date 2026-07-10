import { useState, useEffect } from "react";
import { X, Check, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { type Product } from "../../data";
import { useCurrency } from "../../context/CurrencyContext";

type QuickShopProps = {
  product: Product | null;
  onClose: () => void;
};

export default function QuickShopModal({ product, onClose }: QuickShopProps) {
  const { addToCart, openCart } = useCart();
  const { formatPrice: money } = useCurrency();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  // Reset local states when product changes
  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors[0] || "");
      if (product.sizes.length === 1 && product.sizes[0] === "OS") {
        setSelectedSize("OS");
      } else {
        setSelectedSize("");
      }
      setError("");
      setAdded(false);
    }
  }, [product]);

  // Close on Escape
  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError("Please select a size.");
      return;
    }
    addToCart(product, selectedSize, selectedColor);
    setAdded(true);
    // Close modal and open cart after a brief confirmation flash
    setTimeout(() => {
      onClose();
      openCart();
    }, 650);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="qs-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        role="presentation"
      >
        <motion.section
          className="qs-modal"
          initial={{ scale: 0.96, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qs-title"
        >
          {/* Close button */}
          <button
            className="qs-close"
            type="button"
            onClick={onClose}
            aria-label="Close quick shop"
          >
            <X size={20} />
          </button>

          {/* Product image */}
          <div className="qs-image">
            <img src={product.image} alt={product.alt} />
          </div>

          {/* Details */}
          <div className="qs-details">
            <p className="qs-category">{product.category}</p>
            <h2 id="qs-title" className="qs-name">{product.name}</h2>
            <p className="qs-price">{money(product.price)}</p>

            {/* Color swatches */}
            <div className="qs-option-group">
              <span className="qs-option-label">Color</span>
              <div className="qs-swatches">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`qs-swatch ${selectedColor === color ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Size selector */}
            {product.sizes.length > 0 && product.sizes[0] !== "OS" && (
              <div className="qs-option-group">
                <span className="qs-option-label">Size</span>
                <div className="qs-sizes">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`qs-size-btn ${selectedSize === size ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSize(size);
                        setError("");
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="qs-error" role="alert">{error}</p>}

            {/* Add to Cart CTA */}
            <button
              className={`qs-add-btn ${added ? "added" : ""}`}
              type="button"
              onClick={handleAddToCart}
              disabled={added}
            >
              {added ? (
                <span className="qs-btn-inner">
                  <Check size={16} /> Added to Bag
                </span>
              ) : (
                <span className="qs-btn-inner">
                  <ShoppingBag size={16} /> Add to Bag
                </span>
              )}
            </button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

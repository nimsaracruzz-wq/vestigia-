import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Heart, Star, ChevronDown, ArrowLeft, Check, Ruler, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type Product, type SizeChart } from "../data";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../admin/AdminContext";
import { useCurrency } from "../context/CurrencyContext";
import ProductCard from "../components/common/ProductCard";

// ── Size Chart Modal Component ─────────────────────────────────────────────
function SizeChartModal({ chart, onClose }: { chart: SizeChart; onClose: () => void }) {
  const [unit, setUnit] = useState<"in" | "cm">(chart.unit);

  const colKeys = chart.columns.slice(1).map(c => c.toLowerCase());

  return (
    <AnimatePresence>
      <motion.div
        className="size-chart-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="size-chart-modal"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.28 }}
        role="dialog"
        aria-modal="true"
        aria-label="Size Guide"
      >
        <div className="size-chart-header">
          <div className="size-chart-title-row">
            <Ruler size={18} />
            <h2>Size Guide</h2>
          </div>
          <div className="size-chart-controls">
            <div className="size-unit-toggle">
              <button
                type="button"
                className={unit === "in" ? "active" : ""}
                onClick={() => setUnit("in")}
              >in</button>
              <button
                type="button"
                className={unit === "cm" ? "active" : ""}
                onClick={() => setUnit("cm")}
              >cm</button>
            </div>
            <button className="size-chart-close-btn" type="button" onClick={onClose} aria-label="Close size guide">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="size-chart-table-wrapper">
          <table className="size-chart-table">
            <thead>
              <tr>
                {chart.columns.map((col) => (
                  <th key={col}>{col}{col !== chart.columns[0] ? ` (${unit})` : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row.size}>
                  <td className="size-cell">{row.size}</td>
                  {colKeys.map((key) => (
                    <td key={key}>
                      {unit === "cm" && row[key]
                        ? row[key]!.split("–").map(v => Math.round(parseFloat(v) * 2.54)).join("–")
                        : row[key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {chart.notes && (
          <p className="size-chart-notes">{chart.notes}</p>
        )}

        <p className="size-chart-measure-tip">
          <strong>How to measure:</strong> Measure your chest at its fullest point, your waist at the narrowest point, and hips at the widest point. All measurements in natural standing position.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

type ProductDetailProps = {
  onQuickShop: (product: Product) => void;
};

export default function ProductDetail({ onQuickShop }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, openCart } = useCart();
  const { products } = useAdmin();
  const { formatPrice } = useCurrency();

  // Find product by id
  const product = products.find((p) => p.id === Number(id));

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [addedToCartText, setAddedToCartText] = useState(false);

  // Accordion state
  const [activeAccordion, setActiveAccordion] = useState<string | null>("details");
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  // Sync state if product changes
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | Vestigia`;
      setSelectedColor(product.colors[0] || "");
      setActiveImageIndex(0);
      setQuantity(1);
      setError("");

      if (product.sizes.length === 1 && product.sizes[0] === "OS") {
        setSelectedSize("OS");
      } else {
        setSelectedSize("");
      }
    }
  }, [product]);

  if (!product) {
    return (
      <div className="product-not-found-container">
        <h2>Product not found</h2>
        <p>The product you are looking for does not exist or has been removed.</p>
        <Link to="/shop" className="primary-link dark">
          Back to Shop
        </Link>
      </div>
    );
  }



  const handleQuantityChange = (change: number) => {
    setQuantity((prev) => Math.max(1, prev + change));
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError("Please select a size before adding to cart.");
      return;
    }
    setError("");
    // Add multiple quantities to cart
    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedSize, selectedColor);
    }
    setAddedToCartText(true);
    openCart();
    setTimeout(() => {
      setAddedToCartText(false);
    }, 2000);
  };

  const toggleAccordion = (tab: string) => {
    setActiveAccordion((prev) => (prev === tab ? null : tab));
  };

  // Get related products from the same category (excluding current)
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const isSaved = isInWishlist(product.id);

  return (
    <motion.div
      className="pdp-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back button and breadcrumbs */}
      <div className="pdp-breadcrumbs-row">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="breadcrumbs" role="navigation" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category}`}>{product.category}</Link>
          <span>/</span>
          <span className="breadcrumb-current">{product.name}</span>
        </div>
      </div>

      <div className="pdp-layout-grid">
        {/* Left Column: Image Gallery */}
        <div className="pdp-gallery-column">
          <div className="pdp-main-image-wrapper">
            <motion.img
              key={activeImageIndex}
              src={product.images[activeImageIndex] || product.image}
              alt={`${product.name} view`}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="pdp-thumbnails-grid">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdp-thumb-btn ${activeImageIndex === idx ? "active" : ""}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information Panel */}
        <div className="pdp-details-column">
          <div className="pdp-details-header">
            <span className="pdp-category-kicker">{product.category}</span>
            <h1>{product.name}</h1>
            
            {/* Reviews display */}
            <div className="pdp-ratings-row">
              <div className="stars-list">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < Math.floor(product.rating) ? "#111" : "none"}
                    color="#111"
                  />
                ))}
              </div>
              <span>
                {product.rating} ({product.reviews.length} reviews)
              </span>
            </div>

            <div className="pdp-price">
              {product.compareAt && <span className="compare-at">{formatPrice(product.compareAt)}</span>}
              <span className="current-price">{formatPrice(product.price)}</span>
            </div>
          </div>

          <p className="pdp-description-text">{product.description}</p>

          <div className="pdp-selections-box">
            {/* Colors Selectors */}
            <div className="pdp-option-row">
              <span className="option-label">Color:</span>
              <div className="swatches large">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch-btn ${selectedColor === color ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Sizes Selectors */}
            {product.sizes.length > 0 && product.sizes[0] !== "OS" && (
              <div className="pdp-option-row">
                <div className="pdp-size-label-row">
                  <span className="option-label">Size:</span>
                  {product.sizeChart && (
                    <button
                      type="button"
                      className="size-guide-trigger"
                      onClick={() => setSizeChartOpen(true)}
                    >
                      <Ruler size={13} /> Size Guide
                    </button>
                  )}
                </div>
                <div className="size-row">
                  {product.sizes.map((size) => {
                    const stockKey = `${selectedColor}_${size}`;
                    const stock = product.inventory && product.inventory[stockKey] !== undefined ? product.inventory[stockKey] : 10;
                    const isOutOfStock = stock === 0;

                    return (
                      <button
                        type="button"
                        key={size}
                        className={`${selectedSize === size ? "active" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}
                        disabled={isOutOfStock}
                        onClick={() => {
                          if (!isOutOfStock) {
                            setSelectedSize(size);
                            setError("");
                          }
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper */}
            <div className="pdp-option-row quantity-row">
              <span className="option-label">Quantity:</span>
              <div className="quantity">
                <button type="button" onClick={() => handleQuantityChange(-1)} aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => handleQuantityChange(1)} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {error && <p className="pdp-error-alert" role="alert">{error}</p>}

            <div className="pdp-action-buttons">
              <button
                className="add-to-cart-cta-btn"
                type="button"
                onClick={handleAddToCart}
                disabled={addedToCartText || !!(product.inventory && selectedSize && product.inventory[`${selectedColor}_${selectedSize}`] === 0)}
              >
                {addedToCartText ? (
                  <span className="btn-success-flex">
                    <Check size={16} /> Added
                  </span>
                ) : (
                  "Add to Bag"
                )}
              </button>
              <button
                className={`wishlist-toggle-cta-btn ${isSaved ? "saved" : ""}`}
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={20} fill={isSaved ? "#111" : "none"} color={isSaved ? "#111" : "currentColor"} />
              </button>
            </div>
          </div>

          {/* Size Chart Modal */}
          {sizeChartOpen && product.sizeChart && (
            <SizeChartModal chart={product.sizeChart} onClose={() => setSizeChartOpen(false)} />
          )}

          {/* Details Accordion Panel */}
          <div className="pdp-accordions-group">
            {/* Details Tab */}
            <div className="pdp-accordion-item">
              <button
                type="button"
                onClick={() => toggleAccordion("details")}
                className={`accordion-trigger ${activeAccordion === "details" ? "open" : ""}`}
                aria-expanded={activeAccordion === "details"}
              >
                <span>Details & Fit</span>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence initial={false}>
                {activeAccordion === "details" && (
                  <motion.div
                    className="accordion-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ul>
                      {product.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fabric Tab */}
            <div className="pdp-accordion-item">
              <button
                type="button"
                onClick={() => toggleAccordion("fabric")}
                className={`accordion-trigger ${activeAccordion === "fabric" ? "open" : ""}`}
                aria-expanded={activeAccordion === "fabric"}
              >
                <span>Fabric & Care</span>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence initial={false}>
                {activeAccordion === "fabric" && (
                  <motion.div
                    className="accordion-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ul>
                      {product.care.map((careItem, i) => (
                        <li key={i}>{careItem}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Size Chart Tab */}
            {product.sizeChart && (
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  onClick={() => toggleAccordion("sizechart")}
                  className={`accordion-trigger ${activeAccordion === "sizechart" ? "open" : ""}`}
                  aria-expanded={activeAccordion === "sizechart"}
                >
                  <span>Size Chart</span>
                  <ChevronDown size={16} />
                </button>
                <AnimatePresence initial={false}>
                  {activeAccordion === "sizechart" && (
                    <motion.div
                      className="accordion-content size-chart-accordion-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="size-chart-inline-wrap">
                        <div className="size-chart-inline-table-wrapper">
                          <table className="size-chart-table compact">
                            <thead>
                              <tr>
                                {product.sizeChart.columns.map((col) => (
                                  <th key={col}>{col}{col !== product.sizeChart!.columns[0] ? ` (${product.sizeChart!.unit})` : ""}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {product.sizeChart.rows.map((row) => (
                                <tr key={row.size}>
                                  <td className="size-cell">{row.size}</td>
                                  {product.sizeChart!.columns.slice(1).map((col) => (
                                    <td key={col}>{row[col.toLowerCase()] ?? "—"}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {product.sizeChart.notes && (
                          <p className="size-chart-notes">{product.sizeChart.notes}</p>
                        )}
                        <button
                          type="button"
                          className="size-chart-fullview-btn"
                          onClick={() => setSizeChartOpen(true)}
                        >
                          <Ruler size={14} /> View Full Size Guide
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Shipping Tab */}
            <div className="pdp-accordion-item">
              <button
                type="button"
                onClick={() => toggleAccordion("shipping")}
                className={`accordion-trigger ${activeAccordion === "shipping" ? "open" : ""}`}
                aria-expanded={activeAccordion === "shipping"}
              >
                <span>Shipping & Returns</span>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence initial={false}>
                {activeAccordion === "shipping" && (
                  <motion.div
                    className="accordion-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p>
                      Complimentary carbon-neutral standard shipping is automatically applied to orders over $150.
                    </p>
                    <p>
                      We accept returns and exchanges in new condition within 30 days of purchase. A return label is included in every package.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Tab */}
      <section className="pdp-reviews-section">
        <h2>Customer Reviews</h2>
        {product.reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="reviews-list-grid">
            {product.reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-card-header">
                  <strong>{review.author}</strong>
                  <span>{review.date}</span>
                </div>
                <div className="stars-list">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < review.rating ? "#111" : "none"}
                      color="#111"
                    />
                  ))}
                </div>
                <p>{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pdp-related-section">
          <h2>You might also like</h2>
          <div className="product-grid">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onQuickShop={() => onQuickShop(p)}
              />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

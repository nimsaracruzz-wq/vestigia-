import { RevealModal, Reveal, RevealGroup } from "../animation/Reveal";
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useScrollLock } from '../hooks/useScrollLock';
import { PageIntro } from '../animation/PageIntro';
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Minus, Plus, Heart, Star, ChevronDown, ArrowLeft, Check, Ruler, X } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { type Product, type SizeChart } from "../data";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../admin/AdminContext";
import { useCurrency } from "../context/CurrencyContext";
import ProductCard from "../components/common/ProductCard";
import Gallery from "../components/ProductGallery/Gallery";
import { getDetailImages, getProductCompareAt, getProductPrice } from "../utils/productMedia";
import { SEOHead } from "../components/common/SEOHead";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  imageUrl,
  productCanonicalUrl,
  productJsonLd,
  productPath,
  productSeoDescription,
  productSeoTitle,
  collectionPath,
} from "../utils/seo";

const normalizeChartKey = (label: string) =>
  label.trim().toLowerCase().replace(/\s+/g, "_");

const getChartValue = (row: Record<string, string | undefined>, label: string) =>
  row[normalizeChartKey(label)] ?? row[label.toLowerCase()];

const getColorName = (hex: string) => {
  const mapping: Record<string, string> = {
    "#f3eedf": "IVORY",
    "#1c1a1a": "CHARCOAL",
    "#8b8882": "STONE GREY",
  };
  return mapping[hex.toLowerCase()] || hex.toUpperCase();
};

// ── Size Chart Modal Component ─────────────────────────────────────────────
function SizeChartModal({ chart, onClose }: { chart: SizeChart; onClose: () => void }) {
  useScrollLock(true);
  useDialogFocus(true, onClose, '.size-chart-modal');
  const [unit, setUnit] = useState<"in" | "cm">(chart.unit);

  const colKeys = chart.columns.slice(1).map(c => normalizeChartKey(c));

  return (
    <>
      <motion.div
        className="size-chart-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <RevealModal
        className="size-chart-modal"
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
                      {unit === "cm" && getChartValue(row, chart.columns[chart.columns.findIndex((col) => normalizeChartKey(col) === key)])
                        ? getChartValue(row, chart.columns[chart.columns.findIndex((col) => normalizeChartKey(col) === key)])!.split("–").map(v => Math.round(parseFloat(v) * 2.54)).join("–")
                        : getChartValue(row, chart.columns[chart.columns.findIndex((col) => normalizeChartKey(col) === key)]) ?? "—"}
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
      </RevealModal>
    </>
  );
}

type ProductDetailProps = {
  onQuickShop: (product: Product) => void;
};

export default function ProductDetail({ onQuickShop }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, toggleWishlist, isInWishlist, openCart } = useCart();
  const { products } = useAdmin();
  const { formatPrice, currency } = useCurrency();

  // Find product by id or slug
  const product = products.find((p) => p.published !== false && (p.id === Number(id) || p.slug === id));

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [addedToCartText, setAddedToCartText] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);

  // Accordion state
  const [activeAccordion, setActiveAccordion] = useState<string | null>("details");
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // Sync PDP state when product changes.
  useEffect(() => {
    if (product) {
      const params = new URLSearchParams(location.search);
      setSelectedColor(product.colors.find(c=>c===params.get('color')) || product.colors[0] || '');
      setActiveImageIndex(0);
      setQuantity(1);
      setError("");

      if (product.sizes.length === 1 && product.sizes[0] === "OS") {
        setSelectedSize("OS");
      } else {
        setSelectedSize(product.sizes.find(s=>s===params.get('size')) || '');
      }
    }
  }, [product, location.search]);

  useEffect(() => {
    if (!product?.slug) return;
    const canonicalPath = productPath(product);
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath + location.search, { replace: true });
    }
  }, [location.pathname, navigate, product]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      {
        threshold: 0,
        rootMargin: "0px",
      }
    );

    const currentRef = actionsRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [product]);

  if (!product) {
    return (
      <div className="product-not-found-container">
        <SEOHead
          title="Product Not Found | VESTIGIA"
          description="The requested VESTIGIA product could not be found."
          canonicalUrl="/404"
          noIndex
          noFollow
        />
        <h1>Product not found</h1>
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
      const sizeSection = document.getElementById("mobile-pdp-size-section");
      if (sizeSection) {
        sizeSection.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: "center" });
      }
      return;
    }
    if ((product.inventory?.[selectedColor+'_'+selectedSize] ?? 0) < quantity) { setError('This quantity is unavailable.'); return; }
    setError("");
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedToCartText(true);
    openCart();
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => {
      setAddedToCartText(false);
    }, 2000);
  };

  const toggleAccordion = (tab: string) => {
    setActiveAccordion((prev) => (prev === tab ? null : tab));
  };

  // Show the other 2 VESTIGIA products (always — never the current product)
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .slice(0, 2);

  const isSaved = isInWishlist(product.id);
  const canonicalUrl = productCanonicalUrl(product);
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.category, path: collectionPath(product.category) },
    { name: product.name, path: productPath(product) },
  ]);
  const productSchema = productJsonLd(product, currency);
  const currentPrice = getProductPrice(product, currency);
  const compareAtPrice = getProductCompareAt(product, currency);

  return (
    <div
      className="pdp-container"
    >
      <SEOHead
        title={productSeoTitle(product)}
        description={productSeoDescription(product)}
        canonicalUrl={canonicalUrl}
        ogImage={imageUrl(getDetailImages(product)[0] || product.modelImage || product.image)}
        ogImageAlt={product.imageTitle || product.alt || product.name}
        ogType="product"
        keywords={product.seoKeywords}
        noIndex={product.robotsIndex === false}
        noFollow={product.robotsFollow === false}
        jsonLd={[productSchema, breadcrumbSchema]}
      />
      {/* Back button and breadcrumbs */}
      <div className="pdp-breadcrumbs-row">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
            <li><Link to="/">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/shop">Shop</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={collectionPath(product.category)}>{product.category}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page"><span className="breadcrumb-current">{product.name}</span></li>
          </ol>
        </nav>
      </div>

      <div className="pdp-layout-grid">
        {/* Left Column: Ultra-Luxury Image Gallery */}
        <div className="pdp-gallery-column">
          <Gallery
            images={getDetailImages(product)}
            alt={product.name}
            aspectRatio="3/4"
          />
        </div>

        {/* Right Column: Information Panel */}
        <div className="pdp-details-column">
          <PageIntro as="div" commerce className="pdp-details-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
              <span className="pdp-category-kicker">{product.productType || product.category}</span>
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>
                Designed in Italy · Made in Sri Lanka
              </span>
            </div>
            <h1 style={{ marginTop: '8px' }}>{product.name}</h1>

            <div className="pdp-price">
              {compareAtPrice && <span className="compare-at">{formatPrice(compareAtPrice)}</span>}
              <span className="current-price">{formatPrice(currentPrice)} {currency}</span>
              <span>{selectedSize ? ((product.inventory?.[`${selectedColor}_${selectedSize}`] ?? 0)>0 ? "In stock" : "Out of stock") : Object.values(product.inventory||{}).some(n=>n>0)?"In stock":"Out of stock"}</span>
            </div>
          </PageIntro>

          <Reveal disabled as="p" className="pdp-description-text">{product.description}</Reveal>

          <Reveal disabled className="pdp-selections-box">
            {/* Colors Selectors */}
            <div className="pdp-option-row color-option-row">
              <span className="option-label">Color</span>
              <div className="color-swatches-container">
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
                <span className="selected-color-name">{getColorName(selectedColor)}</span>
              </div>
            </div>

            <div className="pdp-divider" />

            {/* Sizes Selectors */}
            {product.sizes.length > 0 && product.sizes[0] !== "OS" && (
              <div className="pdp-option-row size-option-row" id="mobile-pdp-size-section">
                <div className="pdp-size-label-row">
                  <span className="option-label">Size</span>
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
                    const stock = product.inventory && product.inventory[stockKey] !== undefined ? product.inventory[stockKey] : 0;
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
                <div className="mobile-model-info">
                  Model is 183 cm and wears size M.
                </div>
              </div>
            )}

            <div className="pdp-divider" />

            {/* Quantity Stepper */}
            <div className="pdp-option-row quantity-option-row">
              <span className="option-label">Quantity</span>
              <div className="quantity">
                <button type="button" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => handleQuantityChange(1)} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="pdp-divider" />

            {error && <p className="pdp-error-alert" role="alert">{error}</p>}

            <div className="pdp-action-buttons" ref={actionsRef}>
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
                ) : !!(product.inventory && selectedSize && product.inventory[`${selectedColor}_${selectedSize}`] === 0) ? (
                  "Out of Stock"
                ) : (
                  "Add to Bag"
                )}
              </button>
              <motion.button
                className={`wishlist-toggle-cta-btn ${isSaved ? "saved" : ""}`}
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: isSaved ? [1, 1.3, 1] : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Heart size={20} fill={isSaved ? "#111" : "none"} color={isSaved ? "#111" : "currentColor"} style={{ transition: "fill 0.3s ease, color 0.3s ease" }} />
              </motion.button>

            </div>

            <div className="mobile-pdp-availability">
              <span className="availability-dot">●</span>
              <span className="availability-text">
                {!!(product.inventory && selectedSize && product.inventory[`${selectedColor}_${selectedSize}`] === 0)
                  ? "OUT OF STOCK"
                  : "IN STOCK — READY TO SHIP"}
              </span>
            </div>
          </Reveal>

          {/* Size Chart Modal */}
          <AnimatePresence>{sizeChartOpen && product.sizeChart && (
            <SizeChartModal chart={product.sizeChart} onClose={() => setSizeChartOpen(false)} />
          )}</AnimatePresence>

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
                                    <td key={col}>{getChartValue(row, col) ?? "—"}</td>
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



      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pdp-related-section">
          <Reveal style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>
              The First Release
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.8rem', margin: 0 }}>
              THE OTHER TWO PIECES.
            </h2>
          </Reveal>
          <RevealGroup className="product-grid">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onQuickShop={() => onQuickShop(p)}
              />
            ))}
          </RevealGroup>
        </section>
      )}

      {/* Sticky Mobile Purchase Bar */}
      <div className={`mobile-sticky-purchase-bar ${showStickyBar ? "show" : ""}`}>
        <div className="sticky-bar-content">
          <div className="sticky-bar-info">
            <span className="sticky-price">{formatPrice(currentPrice)}</span>
            <span className="sticky-size">
              {selectedSize ? `SIZE ${selectedSize}` : "SELECT SIZE"}
            </span>
          </div>
          <button
            className="sticky-add-to-bag-btn"
            type="button"
            onClick={handleAddToCart}
            disabled={addedToCartText || !!(product.inventory && selectedSize && product.inventory[`${selectedColor}_${selectedSize}`] === 0)}
          >
            {addedToCartText ? "ADDED" : !!(product.inventory && selectedSize && product.inventory[`${selectedColor}_${selectedSize}`] === 0) ? "OUT OF STOCK" : "ADD TO BAG"}
          </button>
        </div>
      </div>
    </div>
  );
}

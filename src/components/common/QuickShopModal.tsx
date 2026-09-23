import { useDialogFocus } from '../../hooks/useDialogFocus';
import { RevealOverlay, RevealModal } from "../../animation/Reveal";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useState, useEffect, useRef } from "react";
import { X, Check, ShoppingBag } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { isProductInStock, variantStock } from '../../../shared/shop';
import { useCart } from "../../context/CartContext";
import { type Product } from "../../data";
import { useCurrency } from "../../context/CurrencyContext";
import ProductImage from "./ProductImage";
import { getProductPrice } from "../../utils/productMedia";

type QuickShopProps = {
  product: Product | null;
  onClose: () => void;
};

export default function QuickShopModal({ product, onClose }: QuickShopProps) {
  useScrollLock(!!product);
  useDialogFocus(!!product, onClose, '.qs-modal');
  const { addToCart, openCart, cart } = useCart();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { formatPrice: money, currency } = useCurrency();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  // Reset local states when product changes
  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors.find(c => product.sizes.some(s => variantStock(product,c,s)>0)) || product.colors[0] || "");
      if (product.sizes.length === 1 && product.sizes[0] === "OS") {
        setSelectedSize("OS");
      } else {
        setSelectedSize("");
      }
      setError("");
      setAdded(false);
    }
    return () => clearTimeout(timer.current);
  }, [product]);

  // Close on Escape
  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [product, onClose]);

  if (!product) return null;
  const inStock = isProductInStock(product);
  const price = product.prices?.[currency];
  const availablePrice = !!price && price.isActive !== false && !!price.priceListId;

  const handleAddToCart = () => {
    if (added || !availablePrice || !inStock) return;
    if (!selectedSize) {
      setError("Please select a size.");
      return;
    }
    const quantity = cart.find(item => item.product.id===product.id && item.selectedSize===selectedSize && item.selectedColor===selectedColor)?.quantity || 0;
    if (variantStock(product,selectedColor,selectedSize) <= quantity) { setError('This size is unavailable or all remaining pieces are already in your bag.'); return; }
    addToCart(product, selectedSize, selectedColor);
    setAdded(true);
    // Close modal and open cart after a brief confirmation flash
    timer.current = setTimeout(() => {
      onClose();
      openCart();
    }, 650);
  };

  return (
    <AnimatePresence>
      <RevealOverlay
        className="qs-backdrop"
        onClick={onClose}
        role="presentation"
      >
        <RevealModal
          className="qs-modal"
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
            <ProductImage product={product} variant="shop" />
          </div>

          {/* Details */}
          <div className="qs-details">
            <p className="qs-category">{product.category}</p>
            <h2 id="qs-title" className="qs-name">{product.name}</h2>
            <p className="qs-price">{availablePrice ? money(getProductPrice(product, currency)) : 'Unavailable in this currency'}</p>

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
                    disabled={!product.sizes.some(s => variantStock(product,color,s)>0)}
                    aria-pressed={selectedColor===color}
                    onClick={() => { setSelectedColor(color); if (variantStock(product,color,selectedSize)<=0) setSelectedSize(product.sizes.length===1&&product.sizes[0]==='OS'?'OS':''); setError(''); }}
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
                      disabled={variantStock(product,selectedColor,size)<=0}
                      aria-pressed={selectedSize===size}
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
              disabled={added || !inStock || !availablePrice}
            >
              {added ? (
                <span className="qs-btn-inner">
                  <Check size={16} /> Added to Bag
                </span>
              ) : (
                <span className="qs-btn-inner">
                  <ShoppingBag size={16} /> {!inStock ? 'Sold out' : !availablePrice ? 'Unavailable' : 'Add to Bag'}
                </span>
              )}
            </button>
          </div>
        </RevealModal>
      </RevealOverlay>
    </AnimatePresence>
  );
}

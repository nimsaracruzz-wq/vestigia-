import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, X, Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useAdmin } from "../../admin/AdminContext";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

// Spring config — fast entry, slight resistance on exit
const DRAWER_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 36,
  mass: 0.8,
};

const BACKDROP_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.22 } },
};

const DRAWER_VARIANTS = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: DRAWER_SPRING },
  exit: { x: "100%", transition: { ...DRAWER_SPRING, stiffness: 260, damping: 30 } },
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    cart,
    cartCount,
    cartTotalBeforeDiscount,
    cartTotal,
    discountAmount,
    promoCode,
    promoError,
    applyPromoCode,
    removePromoCode,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { formatPrice: money } = useCurrency();
  const { settings } = useAdmin();

  const [promoInput, setPromoInput] = useState("");

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoInput.trim()) {
      const success = applyPromoCode(promoInput.trim());
      if (success) setPromoInput("");
    }
  };

  const freeShippingThreshold = settings.shippingThreshold;
  const progressPercent = freeShippingThreshold > 0 ? Math.min(100, (cartTotalBeforeDiscount / freeShippingThreshold) * 100) : 100;
  const remaining = Math.max(0, freeShippingThreshold - cartTotalBeforeDiscount);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────── */}
          <motion.div
            key="cart-backdrop"
            className="cart-drawer-backdrop"
            variants={BACKDROP_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Drawer panel ──────────────────────────── */}
          <motion.aside
            key="cart-drawer"
            className="cart-drawer"
            variants={DRAWER_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-modal="true"
            role="dialog"
            aria-label="Shopping Cart"
          >
            {/* Header */}
            <div className="cart-drawer__header">
              <div className="cart-drawer__title">
                <ShoppingBag size={18} />
                <h2>Your Bag {cartCount > 0 && <span className="cart-drawer__count">{cartCount}</span>}</h2>
              </div>
              <button
                className="cart-drawer__close"
                type="button"
                onClick={onClose}
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free shipping progress */}
            <AnimatePresence>
              {cart.length > 0 && settings.complimentaryShippingEnabled && (
                <motion.div
                  className="cart-drawer__shipping-bar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="cart-drawer__shipping-text">
                    {remaining > 0 ? (
                      <>Spend <strong>{money(remaining)}</strong> more for complimentary shipping</>
                    ) : (
                      <span className="cart-drawer__shipping-achieved">✓ You qualify for complimentary shipping!</span>
                    )}
                  </p>
                  <div className="cart-drawer__progress-track">
                    <motion.div
                      className="cart-drawer__progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items */}
            <div className="cart-drawer__items">
              {cart.length === 0 ? (
                <div className="cart-drawer__empty">
                  <ShoppingBag size={40} strokeWidth={1.2} />
                  <p>Your bag is empty.</p>
                  <Link to="/shop" onClick={onClose} className="cart-drawer__shop-link">
                    Shop the First Release <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cart.map((item, index) => (
                    <motion.article
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                      className="cart-drawer__item"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0, overflow: "hidden" }}
                      transition={{ duration: 0.22 }}
                      layout
                    >
                      <div className="cart-drawer__item-img-wrap">
                        <img src={item.product.image} alt={item.product.alt} />
                      </div>
                      <div className="cart-drawer__item-info">
                        <div className="cart-drawer__item-top">
                          <h3>{item.product.name}</h3>
                          <button
                            className="cart-drawer__remove"
                            type="button"
                            onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                            aria-label={`Remove ${item.product.name}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="cart-drawer__item-variant">
                          {item.selectedSize !== "OS" && `Size ${item.selectedSize}`}
                          {item.selectedSize !== "OS" && item.selectedColor && " · "}
                          {item.selectedColor && (
                            <span
                              className="cart-drawer__color-dot"
                              style={{ backgroundColor: item.selectedColor }}
                              aria-hidden="true"
                            />
                          )}
                        </p>
                        <div className="cart-drawer__item-bottom">
                          <div className="cart-drawer__qty">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="cart-drawer__item-price">{money(item.product.price * item.quantity)}</span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="cart-drawer__footer">
                {/* Promo code */}
                <div className="cart-drawer__promo">
                  {promoCode ? (
                    <div className="cart-drawer__promo-applied">
                      <span><Tag size={13} /> Code <strong>{promoCode}</strong> applied</span>
                      <button type="button" onClick={removePromoCode}>Remove</button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyPromo} className="cart-drawer__promo-form">
                      <input
                        type="text"
                        placeholder="Discount code…"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                      />
                      <button type="submit">Apply</button>
                    </form>
                  )}
                  {promoError && <p className="cart-drawer__promo-error">{promoError}</p>}
                </div>

                {/* Totals */}
                <div className="cart-drawer__totals">
                  <span>Subtotal</span>
                  {discountAmount > 0 ? (
                    <div className="cart-drawer__total-values">
                      <span className="cart-drawer__struck">{money(cartTotalBeforeDiscount)}</span>
                      <strong>{money(cartTotal)}</strong>
                    </div>
                  ) : (
                    <strong>{money(cartTotalBeforeDiscount)}</strong>
                  )}
                </div>
                <p className="cart-drawer__tax-note">Shipping &amp; taxes calculated at checkout</p>

                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="cart-drawer__checkout-btn"
                >
                  Checkout <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

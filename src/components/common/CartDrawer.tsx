import { variantQuantityLimit } from "../../../shared/stock";
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useScrollLock } from "../../hooks/useScrollLock";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, X, Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useAdmin } from "../../admin/AdminContext";
import ProductImage from "./ProductImage";
import EmptyBag from "./EmptyBag";
import { Reveal, useEntrance, useDrawerEntrance } from "../../animation/Reveal";
import { animationConfig, staggerDelay } from "../../animation/config";
import { getProductPrice } from "../../utils/productMedia";
import { useUser } from "../../context/UserContext";
import { detectVisitorLocation } from "../../utils/phoneUtils";
import { API_BASE_URL } from "../../config/api";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  useScrollLock(open);
  useDialogFocus(open, onClose, '.cart-drawer');
  const backdropEntrance = useEntrance("fade");
  const drawerEntrance = useDrawerEntrance();
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
  const { settings, products, isSynced } = useAdmin();
  const { formatPrice: money, currency } = useCurrency();
  const { user } = useUser();
  const [shippingOffer, setShippingOffer] = useState<{ threshold: number; method: string; country: string; currency: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    setShippingOffer(null);
    void (async () => {
      try {
        const address = user?.addresses?.find(a => a.isDefaultShipping || a.isDefault) || user?.addresses?.[0];
        const destination = address?.country || user?.country || (await detectVisitorLocation())?.iso;
        if (!destination || !active) return;
        const response = await fetch(`${API_BASE_URL}/shipping/methods/${encodeURIComponent(destination)}?currency=${currency}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.isEnabled || !Array.isArray(data.methods)) return;
        const offers = data.methods.filter((m: any) => m.currency === currency && (m.amountMinor === 0 || (Number.isFinite(m.freeShippingThreshold) && m.freeShippingThreshold >= 0)))
          .map((m: any) => ({ threshold: m.amountMinor === 0 ? 0 : m.freeShippingThreshold, method: m.name, country: data.country.countryName, currency }))
          .sort((a: { threshold: number }, b: { threshold: number }) => a.threshold - b.threshold);
        if (active) setShippingOffer(offers[0] || null);
      } catch { /* Hide eligibility when current shipping rules cannot be verified. */ }
    })();
    return () => { active = false; controller.abort(); };
  }, [open, currency, user]);

  const [promoInput, setPromoInput] = useState("");
  // Only flag items as unavailable after the product list has finished syncing from the API.
  // During the initial load (isSynced=false, products=[]) we must not block checkout.
  const hasUnavailableItems = isSynced && cart.some(item => {
    const liveProduct = products.find(p => p.id === item.product.id);
    if (!liveProduct) return true; // product deleted

    return !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > variantQuantityLimit(liveProduct.inventory, item.selectedColor, item.selectedSize);
  });


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

  const freeShippingThreshold = shippingOffer?.threshold ?? 0;
  const progressPercent = freeShippingThreshold > 0 ? Math.min(100, (cartTotal / freeShippingThreshold) * 100) : 100;
  const remaining = Math.max(0, freeShippingThreshold - cartTotal);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────── */}
          <motion.div
            key="cart-backdrop"
            className="cart-drawer-backdrop"
            {...backdropEntrance}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Drawer panel ──────────────────────────── */}
          <motion.aside
            key="cart-drawer"
            className="cart-drawer"
            {...drawerEntrance}
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
              {cart.length > 0 && Number.isFinite(cartTotal) && settings.complimentaryShippingEnabled && shippingOffer?.currency === currency && (
                <motion.div
                  className="cart-drawer__shipping-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="cart-drawer__shipping-text">
                    {remaining > 0 ? (
                      <>Spend <strong>{money(remaining)}</strong> more for complimentary delivery via {shippingOffer.method} to {shippingOffer.country}</>
                    ) : (
                      <Link to="/shipping-policy" onClick={onClose} className="cart-drawer__shipping-achieved">✓ Your bag qualifies for complimentary delivery via {shippingOffer.method} to {shippingOffer.country}</Link>
                    )}
                  </p>
                  <p className="cart-drawer__shipping-note">Final eligibility is confirmed at checkout after discounts. <Link to="/shipping-policy" onClick={onClose}>Delivery details</Link></p>
                  <div className="cart-drawer__progress-track">
                    <motion.div
                      className="cart-drawer__progress-fill"
                      style={{ width: "100%", transformOrigin: "left" }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: progressPercent / 100 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items */}
            <div className="cart-drawer__items">
              {cart.length === 0 ? (
                <EmptyBag variant="drawer" onNavigate={onClose} />
              ) : (
                <AnimatePresence>
                  {cart.map((item, index) => {
                    const liveProduct = products.find(p => p.id === item.product.id);
                    // Only treat as deleted if the product list has fully loaded
                    const isDeleted = isSynced && !liveProduct;

                    const limit = variantQuantityLimit(liveProduct?.inventory, item.selectedColor, item.selectedSize);
                    const isOutOfStock = isSynced && limit === 0;
                    const exceedsStock = isSynced && item.quantity > limit;
                    const isUnavailable = isDeleted || isOutOfStock || exceedsStock;

                    return (
                      <Reveal as="article" duration={animationConfig.duration.fast} delay={staggerDelay(index, 0.05)}
                        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                        className="cart-drawer__item"
                        style={isUnavailable ? { borderLeft: "3px solid #dc2626", paddingLeft: "10px" } : {}}
                        exit={{ opacity: 0 }}
                        layout
                      >
                        <div className="cart-drawer__item-img-wrap" style={isUnavailable ? { opacity: 0.5 } : {}}>
                          <ProductImage product={item.product} variant="product" />
                        </div>
                        <div className="cart-drawer__item-info">
                          <div className="cart-drawer__item-top">
                            <h3 style={isUnavailable ? { color: "#888", textDecoration: "line-through" } : {}}>{item.product.name}</h3>
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
                          {isUnavailable && (
                            <p style={{ color: "#dc2626", fontSize: "11px", fontWeight: 600, margin: "4px 0" }}>
                              {isDeleted ? "This item is no longer available" : isOutOfStock ? "This item is out of stock" : `Only ${limit} units available. Please reduce the quantity.`}
                            </p>
                          )}
                          <div className="cart-drawer__item-bottom">
                            <div className="cart-drawer__qty">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, -1)}
                                aria-label="Decrease quantity"
                                style={{}}
                              >
                                <Minus size={12} />
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                disabled={!isSynced || isUnavailable || item.quantity >= limit}
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, 1)}
                                aria-label="Increase quantity"
                                style={!isSynced || isUnavailable || item.quantity >= limit ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="cart-drawer__item-price" style={isUnavailable ? { color: "#888" } : {}}>{money(getProductPrice(item.product, currency) * item.quantity)}</span>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
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

                {hasUnavailableItems ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="cart-drawer__checkout-btn"
                      style={{
                        background: "#888",
                        cursor: "not-allowed",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        opacity: 0.6,
                        width: "100%",
                      }}
                    >
                      Checkout (Unavailable items) <ArrowRight size={15} />
                    </button>
                    <p style={{ color: "#dc2626", fontSize: "11px", marginTop: "8px", textAlign: "center", fontWeight: 500 }}>
                      Reduce quantities to available stock, or remove unavailable items before checkout.
                    </p>
                  </>
                ) : (
                  <Link
                    to="/checkout"
                    onClick={onClose}
                    className="cart-drawer__checkout-btn"
                  >
                    Checkout <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

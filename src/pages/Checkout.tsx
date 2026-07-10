import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CreditCard, Shield, Truck, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

type Step = "shipping" | "payment" | "success";

type ShippingDetails = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  shippingMethod: "standard" | "express";
};

export default function Checkout() {
  const {
    cart,
    cartCount,
    cartTotalBeforeDiscount,
    cartTotal,
    discountAmount,
    promoCode,
    promoError,
    shippingCost,
    taxCost,
    grandTotal,
    applyPromoCode,
    removePromoCode,
    clearCart,
  } = useCart();

  const { formatPrice: money } = useCurrency();

  const [step, setStep] = useState<Step>("shipping");
  const [promoInput, setPromoInput] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [shippingMethodSelected, setShippingMethodSelected] = useState<"standard" | "express">("standard");

  // Shipping form fields
  const [shippingForm, setShippingForm] = useState<ShippingDetails>({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    shippingMethod: "standard",
  });

  const [shippingErrors, setShippingErrors] = useState<Partial<ShippingDetails>>({});

  // Payment form fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState("");

  // Sync title
  useEffect(() => {
    document.title = "Secure Checkout | Vestigia";
  }, []);

  if (cart.length === 0 && step !== "success") {
    return (
      <div className="empty-checkout-state">
        <h2>Your bag is empty</h2>
        <p>You cannot checkout with an empty shopping bag. Add some tailored items first.</p>
        <Link to="/shop" className="primary-link dark">
          Shop the catalog
        </Link>
      </div>
    );
  }

  // Handle promo code application
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoInput.trim()) {
      applyPromoCode(promoInput.trim());
      setPromoInput("");
    }
  };

  // Validate shipping details form
  const validateShipping = () => {
    const errors: Partial<ShippingDetails> = {};
    if (!shippingForm.email || !shippingForm.email.includes("@")) {
      errors.email = "Valid email address is required.";
    }
    if (!shippingForm.firstName.trim()) errors.firstName = "First name is required.";
    if (!shippingForm.lastName.trim()) errors.lastName = "Last name is required.";
    if (!shippingForm.address.trim()) errors.address = "Address is required.";
    if (!shippingForm.city.trim()) errors.city = "City is required.";
    if (!shippingForm.state.trim()) errors.state = "State is required.";
    if (!shippingForm.zip.trim() || shippingForm.zip.length < 5) {
      errors.zip = "Valid zip code is required.";
    }
    if (!shippingForm.phone.trim()) errors.phone = "Phone number is required.";

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateShipping()) {
      setStep("payment");
    }
  };

  // Validate payment form
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) {
      setPaymentError("Cardholder name is required.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      setPaymentError("Card number must be 16 digits.");
      return;
    }
    if (!cardExpiry.includes("/")) {
      setPaymentError("Expiry date must be in MM/YY format.");
      return;
    }
    if (cardCvv.length < 3) {
      setPaymentError("CVV must be 3 or 4 digits.");
      return;
    }

    setPaymentError("");
    
    // Generate random order number
    const randomOrder = "VEST-" + Math.floor(100000 + Math.random() * 900000);
    setOrderNumber(randomOrder);
    
    // Transition and clear
    setStep("success");
    clearCart();
  };

  // Calculate final numbers based on shipping method
  const activeShippingCost = shippingMethodSelected === "express" ? 25 : shippingCost;
  const activeGrandTotal = cartTotal + activeShippingCost + taxCost;

  return (
    <div className="checkout-page-shell">
      <div className="checkout-container">
        
        {/* Left Column: Form steps */}
        <div className="checkout-main-content">
          
          {/* Form step navigation display */}
          {step !== "success" && (
            <div className="checkout-steps-breadcrumbs">
              <span className={step === "shipping" ? "active-step" : ""}>Shipping</span>
              <ChevronRight size={14} />
              <span className={step === "payment" ? "active-step" : ""}>Payment</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "shipping" && (
              <motion.section
                key="shipping"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h2>Shipping details</h2>
                <form onSubmit={handleShippingSubmit} className="checkout-form-grid">
                  <div className="form-input-box full-width">
                    <label htmlFor="chk-email">Email Address</label>
                    <input
                      id="chk-email"
                      type="email"
                      className={shippingErrors.email ? "input-error" : ""}
                      value={shippingForm.email}
                      onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                    />
                    {shippingErrors.email && <span className="error-text">{shippingErrors.email}</span>}
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-firstname">First Name</label>
                    <input
                      id="chk-firstname"
                      type="text"
                      className={shippingErrors.firstName ? "input-error" : ""}
                      value={shippingForm.firstName}
                      onChange={(e) => setShippingForm({ ...shippingForm, firstName: e.target.value })}
                    />
                    {shippingErrors.firstName && <span className="error-text">{shippingErrors.firstName}</span>}
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-lastname">Last Name</label>
                    <input
                      id="chk-lastname"
                      type="text"
                      className={shippingErrors.lastName ? "input-error" : ""}
                      value={shippingForm.lastName}
                      onChange={(e) => setShippingForm({ ...shippingForm, lastName: e.target.value })}
                    />
                    {shippingErrors.lastName && <span className="error-text">{shippingErrors.lastName}</span>}
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-address">Address</label>
                    <input
                      id="chk-address"
                      type="text"
                      className={shippingErrors.address ? "input-error" : ""}
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                    />
                    {shippingErrors.address && <span className="error-text">{shippingErrors.address}</span>}
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-city">City</label>
                    <input
                      id="chk-city"
                      type="text"
                      className={shippingErrors.city ? "input-error" : ""}
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                    />
                    {shippingErrors.city && <span className="error-text">{shippingErrors.city}</span>}
                  </div>

                  <div className="form-input-box-row">
                    <div className="form-input-box half">
                      <label htmlFor="chk-state">State</label>
                      <input
                        id="chk-state"
                        type="text"
                        placeholder="CA"
                        className={shippingErrors.state ? "input-error" : ""}
                        value={shippingForm.state}
                        onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                      />
                      {shippingErrors.state && <span className="error-text">{shippingErrors.state}</span>}
                    </div>
                    <div className="form-input-box half">
                      <label htmlFor="chk-zip">Zip Code</label>
                      <input
                        id="chk-zip"
                        type="text"
                        className={shippingErrors.zip ? "input-error" : ""}
                        value={shippingForm.zip}
                        onChange={(e) => setShippingForm({ ...shippingForm, zip: e.target.value })}
                      />
                      {shippingErrors.zip && <span className="error-text">{shippingErrors.zip}</span>}
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-phone">Phone Number</label>
                    <input
                      id="chk-phone"
                      type="tel"
                      className={shippingErrors.phone ? "input-error" : ""}
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                    />
                    {shippingErrors.phone && <span className="error-text">{shippingErrors.phone}</span>}
                  </div>

                  {/* Shipping Method Selector */}
                  <div className="shipping-methods-wrapper full-width">
                    <h3>Shipping Method</h3>
                    <div className="shipping-methods-options">
                      <label className={`shipping-method-option-card ${shippingMethodSelected === "standard" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="shipping_opt"
                          checked={shippingMethodSelected === "standard"}
                          onChange={() => setShippingMethodSelected("standard")}
                        />
                        <div className="shipping-method-info">
                          <strong>Standard Delivery</strong>
                          <span>3-5 business days</span>
                        </div>
                        <span className="price-tag">{shippingCost === 0 ? "Free" : money(shippingCost)}</span>
                      </label>

                      <label className={`shipping-method-option-card ${shippingMethodSelected === "express" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="shipping_opt"
                          checked={shippingMethodSelected === "express"}
                          onChange={() => setShippingMethodSelected("express")}
                        />
                        <div className="shipping-method-info">
                          <strong>Express Delivery</strong>
                          <span>1-2 business days</span>
                        </div>
                        <span className="price-tag">$25</span>
                      </label>
                    </div>
                  </div>

                  <button className="checkout-continue-btn full-width" type="submit">
                    Continue to Payment
                  </button>
                </form>
              </motion.section>
            )}

            {step === "payment" && (
              <motion.section
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="checkout-step-header">
                  <h2>Secure payment</h2>
                  <button className="back-to-shipping-btn" type="button" onClick={() => setStep("shipping")}>
                    Edit shipping details
                  </button>
                </div>
                <form onSubmit={handlePaymentSubmit} className="checkout-form-grid">
                  <div className="payment-security-notice full-width">
                    <Shield size={16} />
                    <span>All transactions are secure and encrypted.</span>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="pay-name">Name on Card</label>
                    <input
                      id="pay-name"
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="pay-number">Card Number</label>
                    <div className="card-input-with-icon">
                      <CreditCard size={18} className="card-input-icon" />
                      <input
                        id="pay-number"
                        type="text"
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => {
                          const formatted = e.target.value
                            .replace(/\s?/g, "")
                            .replace(/(\d{4})/g, "$1 ")
                            .trim();
                          setCardNumber(formatted);
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-input-box-row">
                    <div className="form-input-box half">
                      <label htmlFor="pay-expiry">Expiry Date</label>
                      <input
                        id="pay-expiry"
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length >= 2) {
                            val = val.slice(0, 2) + "/" + val.slice(2, 4);
                          }
                          setCardExpiry(val);
                        }}
                      />
                    </div>
                    <div className="form-input-box half">
                      <label htmlFor="pay-cvv">CVV</label>
                      <input
                        id="pay-cvv"
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>

                  {paymentError && <p className="payment-error-message" role="alert">{paymentError}</p>}

                  <button className="checkout-continue-btn full-width" type="submit">
                    Pay {money(activeGrandTotal)}
                  </button>
                </form>
              </motion.section>
            )}

            {step === "success" && (
              <motion.section
                key="success"
                className="checkout-success-view"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <CheckCircle2 size={64} className="success-icon-svg" />
                <h1>Thank you for your order</h1>
                <p className="order-number-receipt">Order ID: <strong>{orderNumber}</strong></p>
                <p className="success-thank-you-paragraph">
                  Your order has been placed successfully. A confirmation receipt has been sent to{" "}
                  <strong>{shippingForm.email || "your email address"}</strong>.
                </p>

                <div className="order-timeline-card">
                  <Truck size={20} />
                  <div>
                    <h4>Delivery expected:</h4>
                    <p>
                      {shippingMethodSelected === "express"
                        ? "Expected delivery: 1-2 business days"
                        : "Expected delivery: 3-5 business days"}
                    </p>
                  </div>
                </div>

                <Link to="/" className="success-back-home-btn">
                  Continue Shopping <ArrowRight size={16} />
                </Link>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Checkout Summary Review */}
        {step !== "success" && (
          <aside className="checkout-summary-pane">
            <h3>Order Summary ({cartCount})</h3>
            <div className="checkout-summary-items-list">
              {cart.map((item, idx) => (
                <div key={idx} className="checkout-summary-item-card">
                  <div className="img-holder">
                    <img src={item.product.image} alt={item.product.alt} />
                    <span className="qty-tag">{item.quantity}</span>
                  </div>
                  <div className="details-col">
                    <h4>{item.product.name}</h4>
                    <p>
                      {item.selectedSize !== "OS" && `Size: ${item.selectedSize}`}
                      {item.selectedSize !== "OS" && item.selectedColor && "  /  "}
                      {item.selectedColor && "Color selected"}
                    </p>
                  </div>
                  <span className="price-tag">{money(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Promo Form in Summary */}
            <div className="checkout-promo-box">
              {promoCode ? (
                <div className="promo-tag-applied">
                  <span>Code <strong>{promoCode}</strong> applied</span>
                  <button type="button" onClick={removePromoCode}>Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="summary-promo-form">
                  <input
                    type="text"
                    placeholder="Discount code (e.g. VESTIGIA20)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                  />
                  <button type="submit">Apply</button>
                </form>
              )}
              {promoError && <p className="promo-error-text">{promoError}</p>}
            </div>

            {/* Price Calculations breakdown */}
            <div className="checkout-calculations">
              <div>
                <span>Subtotal</span>
                <span>{money(cartTotalBeforeDiscount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="discount-row">
                  <span>Discount ({promoCode})</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <span>{activeShippingCost === 0 ? "Complimentary" : money(activeShippingCost)}</span>
              </div>
              <div>
                <span>Taxes (8%)</span>
                <span>{money(taxCost)}</span>
              </div>
              <div className="grand-total-row">
                <span>Total</span>
                <strong>{money(activeGrandTotal)}</strong>
              </div>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}

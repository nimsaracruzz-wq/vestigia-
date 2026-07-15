import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CreditCard, Shield, Truck, CheckCircle2, ArrowRight, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useUser } from "../context/UserContext";

// Initialize Stripe (using test key)
const stripePromise = loadStripe("pk_test_51234567890123456789012345678901234567890123");

// Countries list
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Côte d'Ivoire", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macao", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Republic of the Congo", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

type Step = "shipping" | "payment" | "success";

type PhoneCountryOption = {
  country: string;
  iso: string;
  dialCode: string;
  flag: string;
};

type ShippingDetails = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  phoneCountry: string;
  phoneDialCode: string;
  shippingMethod: "standard" | "express";
};

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutContent />
    </Elements>
  );
}

function CheckoutContent() {
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
  const { user, isAuthenticated, createAccount, updateUser } = useUser();

  const [step, setStep] = useState<Step>("shipping");
  const [promoInput, setPromoInput] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [shippingMethodSelected, setShippingMethodSelected] = useState<"standard" | "express">("standard");
  const [checkoutMode, setCheckoutMode] = useState<"guest" | "createAccount" | null>(null);
  const [checkoutPromptError, setCheckoutPromptError] = useState("");

  const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
    { country: "United States", iso: "US", dialCode: "+1", flag: "🇺🇸" },
    { country: "Canada", iso: "CA", dialCode: "+1", flag: "🇨🇦" },
    { country: "United Kingdom", iso: "GB", dialCode: "+44", flag: "🇬🇧" },
    { country: "Australia", iso: "AU", dialCode: "+61", flag: "🇦🇺" },
    { country: "New Zealand", iso: "NZ", dialCode: "+64", flag: "🇳🇿" },
    { country: "Japan", iso: "JP", dialCode: "+81", flag: "🇯🇵" },
    { country: "France", iso: "FR", dialCode: "+33", flag: "🇫🇷" },
    { country: "Germany", iso: "DE", dialCode: "+49", flag: "🇩🇪" },
    { country: "Spain", iso: "ES", dialCode: "+34", flag: "🇪🇸" },
    { country: "Italy", iso: "IT", dialCode: "+39", flag: "🇮🇹" },
    { country: "India", iso: "IN", dialCode: "+91", flag: "🇮🇳" },
    { country: "Brazil", iso: "BR", dialCode: "+55", flag: "🇧🇷" },
    { country: "South Africa", iso: "ZA", dialCode: "+27", flag: "🇿🇦" },
  ];

  const getCountryOption = (iso: string) => PHONE_COUNTRY_OPTIONS.find((option) => option.iso === iso);
  const getDialCodeByIso = (iso: string) => getCountryOption(iso)?.dialCode ?? "+1";

  // Shipping form fields
  const [shippingForm, setShippingForm] = useState<ShippingDetails>({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    phone: "",
    phoneCountry: "US",
    phoneDialCode: "+1",
    shippingMethod: "standard",
  });

  const [shippingErrors, setShippingErrors] = useState<Partial<ShippingDetails>>({});

  useEffect(() => {
    if (user) {
      setShippingForm((prev) => ({
        ...prev,
        ...user,
        phoneCountry: user.phoneCountry || prev.phoneCountry,
        phoneDialCode: user.phoneDialCode || prev.phoneDialCode,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (user) return;

    const detectPhoneCountry = async () => {
      try {
        const res = await fetch("https://ipwho.is/");
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success) return;

        const iso = data.country_code;
        const option = getCountryOption(iso);
        if (option) {
          setShippingForm((prev) => ({
            ...prev,
            phoneCountry: option.iso,
            phoneDialCode: option.dialCode,
          }));
        }
      } catch (error) {
        console.error("Phone country detection failed:", error);
      }
    };

    detectPhoneCountry();
  }, [user]);

  // Payment form fields
  const [cardName, setCardName] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (!shippingForm.country.trim()) errors.country = "Country is required.";
    if (!shippingForm.phone.trim()) errors.phone = "Phone number is required.";
    if (!shippingForm.phoneDialCode.trim()) errors.phone = "Please select your phone country code.";

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated && checkoutMode === null) {
      setCheckoutPromptError("Please choose whether to create an account or continue as guest.");
      return;
    }
    setCheckoutPromptError("");
    if (validateShipping()) {
      if (isAuthenticated) {
        updateUser({ ...shippingForm });
      } else if (checkoutMode === "createAccount") {
        createAccount({ ...shippingForm });
      }
      setStep("payment");
    }
  };

  // Validate payment form
  const handlePaymentSubmit = async () => {
    if (!cardName.trim()) {
      setPaymentError("Cardholder name is required.");
      return;
    }

    setPaymentError("");
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate random order number
      const randomOrder = "VEST-" + Math.floor(100000 + Math.random() * 900000);
      setOrderNumber(randomOrder);
      
      // Transition and clear
      setStep("success");
      clearCart();
    } catch (error) {
      setPaymentError("Payment processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // Calculate final numbers based on shipping method
  const activeShippingCost = shippingMethodSelected === "express" ? 25 : shippingCost;
  const activeGrandTotal = cartTotal + activeShippingCost + taxCost;

  return (
    <div className="checkout-page-shell">
      <header className="checkout-minimal-header">
        <div className="checkout-header-content">
          <Link to="/shop" className="back-to-shop-link">
            <span>← Return to cart</span>
          </Link>
          <Link to="/" className="checkout-brand-logo">
            VESTIGIA
          </Link>
          <div className="checkout-secure-badge">
            <Shield size={13} className="lock-icon" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      <div className="checkout-container">
        
        {/* Left Column: Form steps */}
        <div className="checkout-main-content">
          
          {/* Form step navigation display */}
          {step !== "success" && (
            <div className="checkout-steps-breadcrumbs">
              <span className={step === "shipping" ? "active-step" : "completed-step"} onClick={() => step === "payment" && setStep("shipping")}>
                <span className="step-num">01</span> Shipping
              </span>
              <span className="step-divider">—</span>
              <span className={step === "payment" ? "active-step" : ""}>
                <span className="step-num">02</span> Payment
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "shipping" && (
              <motion.section
                key="shipping"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="checkout-section-title">Shipping address</h2>
                {!isAuthenticated && (
                  <div className="checkout-account-choice">
                    <p>Checkout faster next time. Create an account or continue as guest.</p>
                    <div className="checkout-account-choice-actions">
                      <button
                        type="button"
                        className={checkoutMode === "createAccount" ? "account-choice-btn active" : "account-choice-btn"}
                        onClick={() => setCheckoutMode("createAccount")}
                      >
                        Create account
                      </button>
                      <button
                        type="button"
                        className={checkoutMode === "guest" ? "account-choice-btn active" : "account-choice-btn"}
                        onClick={() => setCheckoutMode("guest")}
                      >
                        Guest checkout
                      </button>
                    </div>
                  </div>
                )}
                {isAuthenticated && (
                  <div className="checkout-account-mode-note">
                    Logged in as <strong>{user?.email}</strong>. Details pre-filled from your profile.
                  </div>
                )}
                {(!isAuthenticated && checkoutMode !== null) && (
                  <div className="checkout-account-mode-note checkout-account-mode-note--guest">
                    {checkoutMode === "createAccount"
                      ? "Your account will be created automatically using the details below."
                      : "Proceeding as a guest. You can still create an account later."}
                  </div>
                )}
                {checkoutPromptError && (
                  <div className="checkout-prompt-error">{checkoutPromptError}</div>
                )}
                <form onSubmit={handleShippingSubmit} className="checkout-form-grid">
                  <div className="form-input-box full-width">
                    <label htmlFor="chk-email">Email Address</label>
                    <input
                      id="chk-email"
                      type="email"
                      className={shippingErrors.email ? "input-error" : ""}
                      value={shippingForm.email}
                      onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                      placeholder="email@example.com"
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
                      placeholder="Jane"
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
                      placeholder="Doe"
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
                      placeholder="123 Main St, Apt 4B"
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
                      placeholder="New York"
                    />
                    {shippingErrors.city && <span className="error-text">{shippingErrors.city}</span>}
                  </div>

                  <div className="form-input-box-row">
                    <div className="form-input-box half">
                      <label htmlFor="chk-state">State</label>
                      <input
                        id="chk-state"
                        type="text"
                        placeholder="NY"
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
                        placeholder="10001"
                      />
                      {shippingErrors.zip && <span className="error-text">{shippingErrors.zip}</span>}
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-country">Country</label>
                    <select
                      id="chk-country"
                      className={shippingErrors.country ? "input-error" : ""}
                      value={shippingForm.country}
                      onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {shippingErrors.country && <span className="error-text">{shippingErrors.country}</span>}
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-phone">Phone Number</label>
                    <div className="phone-input-row">
                      <div className="phone-prefix-select">
                        <select
                          id="chk-phone-code"
                          value={shippingForm.phoneDialCode}
                          onChange={(e) => {
                            const selected = PHONE_COUNTRY_OPTIONS.find(
                              (option) => option.dialCode === e.target.value,
                            );
                            setShippingForm({
                              ...shippingForm,
                              phoneDialCode: e.target.value,
                              phoneCountry: selected?.iso ?? shippingForm.phoneCountry,
                            });
                          }}
                        >
                          {PHONE_COUNTRY_OPTIONS.map((option) => (
                            <option key={option.iso} value={option.dialCode}>
                              {option.flag} {option.dialCode}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        id="chk-phone"
                        type="tel"
                        className={shippingErrors.phone ? "input-error" : ""}
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                        placeholder="123 456 7890"
                      />
                    </div>
                    {shippingErrors.phone && <span className="error-text">{shippingErrors.phone}</span>}
                  </div>

                  {/* Shipping Method Selector */}
                  <div className="shipping-methods-wrapper full-width">
                    <h3 className="shipping-methods-title">Shipping Method</h3>
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

                  <button
                    className="checkout-continue-btn full-width"
                    type="submit"
                    disabled={!isAuthenticated && checkoutMode === null}
                  >
                    Continue to payment
                  </button>
                </form>
              </motion.section>
            )}

            {step === "payment" && (
              <motion.section
                key="payment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="checkout-step-header">
                  <h2 className="checkout-section-title">Payment method</h2>
                  <button className="back-to-shipping-btn" type="button" onClick={() => setStep("shipping")}>
                    Edit shipping
                  </button>
                </div>
                <form className="checkout-form-grid">
                  <div className="payment-security-notice full-width">
                    <Shield size={14} />
                    <span>Powered by Stripe. Transactions are secure and encrypted.</span>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="pay-name">Name on Card</label>
                    <input
                      id="pay-name"
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jane Doe"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="card-element">Card Details</label>
                    <div className="stripe-card-element-wrapper">
                      <CardElement
                        id="card-element"
                        options={{
                          style: {
                            base: {
                              fontSize: "16px",
                              color: "#171412",
                              "::placeholder": {
                                color: "#aaa",
                              },
                            },
                            invalid: {
                              color: "#fa755a",
                            },
                          },
                          disabled: isProcessing,
                        }}
                      />
                    </div>
                  </div>

                  {paymentError && <p className="payment-error-message" role="alert">{paymentError}</p>}

                  <button
                    className="checkout-continue-btn full-width"
                    type="button"
                    onClick={handlePaymentSubmit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader size={16} className="spinner" />
                        Processing...
                      </>
                    ) : (
                      `Pay ${money(activeGrandTotal)}`
                    )}
                  </button>
                </form>
              </motion.section>
            )}

            {step === "success" && (
              <motion.section
                key="success"
                className="checkout-success-view"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.4 }}
              >
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={40} className="success-icon-svg" />
                </div>
                <h1>Order confirmed</h1>
                <p className="order-number-receipt">Receipt ID: <strong>{orderNumber}</strong></p>
                <p className="success-thank-you-paragraph">
                  Thank you for placing your order with Vestigia. A confirmation containing receipt details and updates has been sent to{" "}
                  <strong>{shippingForm.email || "your email address"}</strong>.
                </p>

                <div className="order-timeline-card">
                  <Truck size={18} className="timeline-icon" />
                  <div>
                    <h4>Delivery timeframe</h4>
                    <p>
                      {shippingMethodSelected === "express"
                        ? "Expected delivery: 1-2 business days"
                        : "Expected delivery: 3-5 business days"}
                    </p>
                  </div>
                </div>

                <Link to="/shop" className="success-back-home-btn">
                  Continue Shopping <ArrowRight size={14} />
                </Link>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Checkout Summary Review */}
        {step !== "success" && (
          <aside className="checkout-summary-pane">
            <h3>Order summary ({cartCount})</h3>
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
                      {item.selectedColor && `Color: ${item.selectedColor}`}
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

      {step !== "success" && (
        <footer className="checkout-minimal-footer">
          <div className="footer-links">
            <a href="#refund">Refund Policy</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Vestigia. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}

import { checkoutQuoteSignature, type CheckoutQuotePayload } from "../utils/checkoutQuote";
import { animationConfig } from "../animation/config";
import { Reveal } from "../animation/Reveal";
import { formatMoney, toMinor, toMajor } from "../../shared/money";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CreditCard, Shield, Truck, CheckCircle2, ArrowRight, Loader, User, Info, Lock, Gift, Building } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useUser, type Address } from "../context/UserContext";
import { useAdmin } from "../admin/AdminContext";
import { API_BASE_URL } from "../config/api";
import { formatPhoneNumber } from "../utils/phoneUtils";
import ProductImage from "../components/common/ProductImage";
import EmptyBag from "../components/common/EmptyBag";
import { getProductPrice } from "../utils/productMedia";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePublishableKeyLooksValid = /^pk_(test|live)_[A-Za-z0-9_]+$/.test(String(stripePublishableKey || "").trim());
const stripePromise = stripePublishableKeyLooksValid ? loadStripe(stripePublishableKey!) : Promise.resolve(null);

const getColorName = (hex: string) => {
  const mapping: Record<string, string> = {
    "#f3eedf": "IVORY",
    "#1c1a1a": "CHARCOAL",
    "#8b8882": "STONE GREY",
  };
  return mapping[hex.toLowerCase()] || hex.toUpperCase();
};

// Countries list
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface PhoneCountryOption {
  country: string;
  iso: string;
  dialCode: string;
  flag: string;
}

interface ShippingDetails {
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
  shippingMethod: string;
}

type Step = "shipping" | "payment" | "success";

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutContent />
    </Elements>
  );
}

function CheckoutContent() {
  const stripe = useStripe();
  const elements = useElements();
  const {
    cart, acceptQuote,
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

  const { currency, market, priceListId, lockCheckout, unlockCheckout } = useCurrency();
  const [lockedCurrency] = useState(currency);
  const money = (amount: number) => Number.isFinite(amount) ? formatMoney(toMinor(String(amount), lockedCurrency), lockedCurrency) : 'Awaiting quote';
  useEffect(() => { lockCheckout(); return () => unlockCheckout(); }, []);
  const { products, isSynced } = useAdmin();
  const { user, isAuthenticated, createAccount, updateUser, checkEmailStatus, activateAccount, login } = useUser();

  const [step, setStep] = useState<Step>("shipping");
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    stepContentRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    stepContentRef.current?.focus({ preventScroll: true });
  }, [step]);
  const [promoInput, setPromoInput] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [shippingMethodSelected, setShippingMethodSelected] = useState<"standard" | "express">("standard");
  const [checkoutMode, setCheckoutMode] = useState<"guest" | "createAccount" | null>("createAccount");
  const [checkoutPromptError, setCheckoutPromptError] = useState("");

  // Checkout Auth & Customer Case state
  const [emailCase, setEmailCase] = useState<"NEW_CUSTOMER" | "EXISTS_PASSWORD" | "GUEST_WITH_PAST_ORDERS" | null>(null);
  const [emailCaseMessage, setEmailCaseMessage] = useState("");
  const [existingName, setExistingName] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Account options & Billing Address state
  const [autoCreateAccount, setAutoCreateAccount] = useState(true);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingForm, setBillingForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  });

  // Corporate & Gift fields
  const [companyName, setCompanyName] = useState("");
  const [vatId, setVatId] = useState("");
  const [isGiftOrder, setIsGiftOrder] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const handleEmailBlur = async () => {
    if (!shippingForm.email || !shippingForm.email.includes("@")) return;
    try {
      const res = await checkEmailStatus(shippingForm.email);
      setEmailCase(res.case as any);
      setEmailCaseMessage(res.message || "");
      if (res.name) setExistingName(res.name);
    } catch (err) {
      console.error("Email status check error:", err);
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const res = await login(shippingForm.email, passwordInput);
    setLoginLoading(false);
    if (!res.success) {
      setLoginError(res.error || "Invalid password. Please try again.");
    } else {
      setEmailCase(null);
    }
  };

  const [successCart, setSuccessCart] = useState<any[]>([]);
  const [receiptSummary, setReceiptSummary] = useState({
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    promoCode: ""
  });

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
  const getCountryOptionByCountry = (country: string) => PHONE_COUNTRY_OPTIONS.find((option) => option.country === country);
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
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [shippingErrors, setShippingErrors] = useState<Partial<ShippingDetails>>({});

  const getAddressNameParts = (address: Address) => {
    const [firstName = "", ...lastNameParts] = (address.name || "").trim().split(/\s+/);
    return {
      firstName: address.firstName || firstName,
      lastName: address.lastName || lastNameParts.join(" "),
    };
  };

  const applySavedAddress = (address: Address) => {
    const nameParts = getAddressNameParts(address);
    setShippingForm((prev) => ({
      ...prev,
      firstName: nameParts.firstName || prev.firstName,
      lastName: nameParts.lastName || prev.lastName,
      address: address.line1 || prev.address,
      city: address.city || prev.city,
      state: address.state || prev.state,
      zip: address.zip || prev.zip,
      country: address.country || prev.country,
      phone: address.phone || prev.phone,
      phoneCountry: address.phoneCountry || prev.phoneCountry,
      phoneDialCode: address.phoneDialCode || prev.phoneDialCode,
    }));
  };

  useEffect(() => {
    if (user) {
      const savedAddresses = user.addresses ?? [];
      const defaultAddress = savedAddresses.find((address) => address.isDefault || address.isDefaultShipping) || savedAddresses[0];
      setShippingForm((prev) => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        address: user.address || prev.address,
        city: user.city || prev.city,
        state: user.state || prev.state,
        zip: user.zip || prev.zip,
        country: user.country || defaultAddress?.country || prev.country || "United States",
        phone: user.phone || prev.phone,
        phoneCountry: user.phoneCountry || prev.phoneCountry,
        phoneDialCode: user.phoneDialCode || prev.phoneDialCode,
      }));
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        applySavedAddress(defaultAddress);
      }
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      setCheckoutMode(null);
      setCheckoutPromptError("");
      return;
    }

    setCheckoutMode((current) => current ?? "createAccount");
  }, [isAuthenticated]);

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
        const detectedCountry = COUNTRIES.find((country) => country.toLowerCase() === String(data.country || "").toLowerCase());
        if (option || detectedCountry) {
          setShippingForm((prev) => ({
            ...prev,
            country: detectedCountry && (!prev.country || prev.country === "United States") ? detectedCountry : prev.country || "United States",
            phoneCountry: option?.iso ?? prev.phoneCountry,
            phoneDialCode: option?.dialCode ?? prev.phoneDialCode,
          }));
          if (detectedCountry) {
            setBillingForm((prev) => ({ ...prev, country: detectedCountry }));
          }
        }
      } catch (error) {
        console.error("Country detection failed:", error);
      }
    };

    detectPhoneCountry();
  }, [user]);

  // Payment form fields
  const [cardName, setCardName] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quotedCheckout, setServerQuote] = useState<any>(null);
  const [reviewedInputKey, setReviewedInputKey] = useState("");
  const paymentInFlight = useRef(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteReload, setQuoteReload] = useState(0);
  const [checkoutConfig, setCheckoutConfig] = useState({
    stripeConfigured: false,
    mockPaymentsEnabled: false,
    publishableKeyRequired: true,
    issue: "",
  });

  // Dynamic Shipping Management state
  const [shippingValidationLoading, setShippingValidationLoading] = useState(false);
  const [shippingBlocked, setShippingBlocked] = useState(false);
  const [shippingBlockedMessage, setShippingBlockedMessage] = useState("");
  const [dynamicMethods, setDynamicMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [shippingRegionName, setShippingRegionName] = useState("");
  const [shippingCountryName, setShippingCountryName] = useState("");
  const [shippingCountryCode, setShippingCountryCode] = useState("");
  const [estimatedDeliveryText, setEstimatedDeliveryText] = useState("");
  const [shippingAnnouncements, setShippingAnnouncements] = useState<any[]>([]);
  const shippingLookupSeq = useRef(0);

  const quotePayload: CheckoutQuotePayload = {
    currency: lockedCurrency, market, priceListId, email: shippingForm.email,
    shippingCountry: shippingForm.country,
    shippingCountryCode: shippingCountryCode || undefined,
    shippingMethodId: selectedMethodId,
    promoCode: promoCode || undefined,
    items: cart.map(item => ({
      productId: item.product.id, quantity: item.quantity,
      size: item.selectedSize || "OS", color: item.selectedColor || "",
      unitPriceMinor: item.unitPriceMinor, currency: item.currency,
      priceVersion: item.priceVersion, priceListId: item.priceListId,
    })),
  };
  const quoteInputKey = checkoutQuoteSignature(quotePayload);
  const latestQuoteInputKey = useRef(quoteInputKey);
  latestQuoteInputKey.current = quoteInputKey;
  const serverQuote = reviewedInputKey === quoteInputKey ? quotedCheckout : null;

  // Prepare the final amount automatically. Accepting its price snapshots must
  // not restart this request or invalidate the quote that the customer sees.
  useEffect(() => {
    if (step !== "payment" || !quotePayload.items.length || !quotePayload.shippingMethodId) return;
    const controller = new AbortController();
    const requestedKey = quoteInputKey;
    setQuoteLoading(true);
    setQuoteError("");
    setServerQuote(null);
    const prepareTotal = async () => {
      try {
        const response = await fetch(API_BASE_URL + "/checkout/quote", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quotePayload), signal: controller.signal,
        });
        const quote = await response.json();
        if (!response.ok) throw new Error(quote.error || "Unable to calculate your total.");
        if (quote.currency !== lockedCurrency) throw new Error("Checkout currency mismatch.");
        if (controller.signal.aborted || latestQuoteInputKey.current !== requestedKey) return;
        setReviewedInputKey(requestedKey);
        setServerQuote(quote);
        acceptQuote(quote);
      } catch (error: any) {
        if (!controller.signal.aborted) setQuoteError(error.message || "Unable to calculate your total.");
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    };
    void prepareTotal();
    return () => controller.abort();
  }, [step, quoteInputKey, quoteReload]);

  useEffect(() => {
    const lookupId = shippingLookupSeq.current + 1;
    shippingLookupSeq.current = lookupId;
    setSelectedMethodId(null);
    setEstimatedDeliveryText("");

    if (!shippingForm.country) {
      setShippingBlocked(false);
      setDynamicMethods([]);
      setShippingCountryCode("");
      return;
    }

    const validateCountryShipping = async () => {
      setShippingValidationLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/shipping/methods/${encodeURIComponent(shippingForm.country)}?currency=${lockedCurrency}`);
        const data = await res.json();
        if (shippingLookupSeq.current !== lookupId) return;

        if (!data.isEnabled) {
          setShippingBlocked(true);
          setShippingBlockedMessage(data.message || "Sorry, we currently do not ship to your country.");
          setDynamicMethods([]);
          setSelectedMethodId(null);
          setShippingCountryCode("");
          setShippingAnnouncements(data.announcements || []);
        } else {
          setShippingBlocked(false);
          setShippingBlockedMessage("");
          setDynamicMethods(data.methods || []);
          setShippingRegionName(data.region?.name || "");
          setShippingCountryName(data.country?.countryName || shippingForm.country);
          setShippingCountryCode(data.country?.countryCode || "");
          setShippingAnnouncements(data.announcements || []);

          if (data.methods && data.methods.length > 0) {
            setSelectedMethodId(data.methods[0].id);
            setEstimatedDeliveryText(data.methods[0].estimatedDays);
          }
        }
      } catch (err) {
        if (shippingLookupSeq.current !== lookupId) return;
        console.error("Shipping validation error:", err);
      } finally {
        if (shippingLookupSeq.current === lookupId) setShippingValidationLoading(false);
      }
    };

    validateCountryShipping();
  }, [shippingForm.country, lockedCurrency]);

  useEffect(() => {
    const loadCheckoutConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/checkout/config`);
        if (!res.ok) return;
        const data = await res.json();
        setCheckoutConfig({
          stripeConfigured: Boolean(data.stripeConfigured),
          mockPaymentsEnabled: Boolean(data.mockPaymentsEnabled),
          publishableKeyRequired: Boolean(data.publishableKeyRequired),
          issue: data.issue || "",
        });
      } catch (error) {
        console.error("Checkout config check failed:", error);
      }
    };

    void loadCheckoutConfig();
  }, []);


  // Sync title
  useEffect(() => {
    document.title = "Secure Checkout | Vestigia";
  }, []);

  if (cart.length === 0 && step !== "success") {
    return <EmptyBag />;
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
      }
      setStep("payment");
    }
  };

  // Validate payment form
  const handlePaymentSubmit = async () => {
    if (paymentInFlight.current || quoteLoading || !serverQuote) return;
    if (checkoutConfig.publishableKeyRequired && !stripePublishableKeyLooksValid) {
      setPaymentError("Stripe is not ready. Add VITE_STRIPE_PUBLISHABLE_KEY to the frontend environment and restart the dev server.");
      return;
    }

    if (!cardName.trim()) {
      setPaymentError("Cardholder name is required.");
      return;
    }

    // Check if any cart item is unavailable — only reliable after products have synced
    const hasUnavailable = isSynced && cart.some(item => {
      const liveProduct = products.find(p => p.id === item.product.id);
      if (!liveProduct) return true;
      const stockKey = `${item.selectedColor}_${item.selectedSize}`;
      return liveProduct.inventory != null && liveProduct.inventory[stockKey] === 0;
    });

    if (hasUnavailable) {
      setPaymentError("Your bag contains items that are no longer available. Please remove them before checkout.");
      return;
    }

    setPaymentError("");
    paymentInFlight.current = true;
    setIsProcessing(true);

    try {
      if (shippingBlocked || !selectedMethodId) throw new Error("Please select an available shipping method.");
      const activeMethodId = selectedMethodId;
      const resolvedShippingCountryCode = shippingCountryCode;
      const checkoutShippingCountry = shippingForm.country;
      const checkoutItems = quotePayload.items;
      const quote = serverQuote;
      if (new Date(quote.expiresAt).getTime() <= Date.now()) {
        setServerQuote(null);
        setQuoteReload(value => value + 1);
        throw new Error("Your total is being refreshed. Check the updated amount, then confirm payment.");
      }
      const paymentPayload={...quotePayload,checkoutId:quote.checkoutId};

      const intentResponse = await fetch(`${API_BASE_URL}/checkout/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });
      const paymentIntent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(paymentIntent.error || "Unable to initialize payment");

      let stripePaymentIntentId = paymentIntent.mockPaymentIntentId as string | undefined;

      if (paymentIntent.clientSecret) {
        if (!stripe || !elements) throw new Error("Payment form is still loading. Please try again.");
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Card details are required.");
        const paymentAddress = sameAsShipping ? shippingForm : billingForm;

        const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
          payment_method: {
            card,
            billing_details: {
              name: cardName.trim(),
              email: shippingForm.email,
              phone: shippingForm.phone,
              address: {
                line1: paymentAddress.address,
                line2: !sameAsShipping ? billingForm.apartment || undefined : undefined,
                city: paymentAddress.city,
                state: paymentAddress.state,
                postal_code: paymentAddress.zip.trim(),
                country: getCountryOptionByCountry(paymentAddress.country)?.iso,
              },
            },
          },
        });

        if (result.error) throw new Error(result.error.message || "Card payment was declined.");
        if (result.paymentIntent?.status !== "succeeded") {
          throw new Error("Payment was not completed.");
        }
        stripePaymentIntentId = result.paymentIntent.id;
      }

      if (!stripePaymentIntentId) throw new Error("Payment confirmation is required.");

      // Save items and calculations for success screen before clearing
      setSuccessCart([...cart]);
      setReceiptSummary({
        subtotal: quote.subtotalMinor / (quote.currency === "JPY" ? 1 : 100),
        discount: (quote.discountMinor || 0) / (quote.currency === "JPY" ? 1 : 100),
        shipping: quote.shippingMinor / (quote.currency === "JPY" ? 1 : 100),
        tax: quote.taxMinor / (quote.currency === "JPY" ? 1 : 100),
        total: quote.totalMinor / (quote.currency === "JPY" ? 1 : 100),
        promoCode: quote.promoCode || promoCode || ""
      });

      const orderPayload = {
        currency: lockedCurrency, market, priceListId, checkoutId: quote.checkoutId,
        customer: `${shippingForm.firstName} ${shippingForm.lastName}`,
        email: shippingForm.email,
        phone: shippingForm.phone,
        address: `${shippingForm.address}, ${shippingForm.city}, ${shippingForm.state} ${shippingForm.zip}, ${checkoutShippingCountry}`,
        shippingForm: { ...shippingForm, country: checkoutShippingCountry },
        shippingCountryCode: resolvedShippingCountryCode || undefined,
        autoCreateAccount,
        sameAsShipping,
        billingAddress: sameAsShipping ? null : billingForm,
        giftOrder: isGiftOrder,
        giftMessage: isGiftOrder ? giftMessage : null,
        companyName,
        vatId,
        shippingMethodId: activeMethodId,
        promoCode: quote.promoCode || promoCode || undefined,
        stripePaymentIntentId,
        items: checkoutItems,
      };

      const orderResponse = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });
      const createdOrder = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(createdOrder.error || "Unable to create order");
      setOrderNumber(createdOrder.id);

      // Transition and clear
      setStep("success");
      unlockCheckout();
      clearCart();
    } catch (error: any) {
      setPaymentError(error.message || "Payment processing failed. Please try again.");
      if (/quote|prices changed/i.test(String(error.message))) { setServerQuote(null); setQuoteReload(value => value + 1); }
    } finally {
      paymentInFlight.current = false;
      setIsProcessing(false);
    }
  };

  // Calculate final numbers based on dynamic shipping method
  const selectedMethod = dynamicMethods.find((m) => m.id === selectedMethodId);
  let activeShippingCost = 0;
  let isFreeShipping = false;

  if (selectedMethod) {
    if (selectedMethod.freeShippingThreshold !== null && cartTotalBeforeDiscount >= selectedMethod.freeShippingThreshold) {
      activeShippingCost = 0;
      isFreeShipping = true;
    } else {
      activeShippingCost = selectedMethod.price;
    }
  } else {
    activeShippingCost = shippingCost;
  }

  const activeGrandTotal = serverQuote ? toMajor(serverQuote.totalMinor, serverQuote.currency) : Math.max(0, cartTotal + activeShippingCost + taxCost);
  const summarySubtotal = serverQuote ? toMajor(serverQuote.subtotalMinor, lockedCurrency) : cartTotalBeforeDiscount;
  const summaryDiscount = serverQuote ? toMajor(serverQuote.discountMinor, lockedCurrency) : discountAmount;
  const summaryShipping = serverQuote ? toMajor(serverQuote.shippingMinor, lockedCurrency) : activeShippingCost;
  const summaryTax = serverQuote ? toMajor(serverQuote.taxMinor, lockedCurrency) : taxCost;
  const stripeFrontendMissing = checkoutConfig.publishableKeyRequired && !stripePublishableKeyLooksValid;
  const stripeSetupMessage = stripeFrontendMissing
    ? "Stripe is not ready. Add VITE_STRIPE_PUBLISHABLE_KEY to the frontend environment and restart the dev server."
    : checkoutConfig.issue;

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

      <div className={`checkout-container ${step === "success" ? "success-mode" : ""}`}>

        {/* Left Column: Form steps */}
        <div className="checkout-main-content" ref={stepContentRef} tabIndex={-1}>

          {/* Form step navigation display */}
          {step !== "success" && (
            <div className="checkout-steps-breadcrumbs">
              <span className={step === "shipping" ? "active-step" : "completed-step"} onClick={() => !isProcessing && step === "payment" && setStep("shipping")}>
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
              <Reveal trigger="mount" duration={animationConfig.duration.fast} variant="fade" as="section"
                key="shipping"
              >
                <h2 className="checkout-section-title">Shipping address</h2>
                {!isAuthenticated && (
                  <div className="checkout-account-choice">
                    <p>Checkout faster next time. Create an account or continue as guest.</p>
                    <div className="checkout-account-choice-actions">
                      <button
                        type="button"
                        className={checkoutMode === "createAccount" ? "account-choice-btn active" : "account-choice-btn"}
                        onClick={() => {
                          setCheckoutMode("createAccount");
                          setAutoCreateAccount(true);
                          setCheckoutPromptError("");
                        }}
                      >
                        Create account
                      </button>
                      <button
                        type="button"
                        className={checkoutMode === "guest" ? "account-choice-btn active" : "account-choice-btn"}
                        onClick={() => {
                          setCheckoutMode("guest");
                          setAutoCreateAccount(false);
                          setCheckoutPromptError("");
                        }}
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
                    <label htmlFor="chk-email">Email Address *</label>
                    <input
                      id="chk-email" autoComplete="email"
                      type="email"
                      className={shippingErrors.email ? "input-error" : ""}
                      value={shippingForm.email}
                      onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                      onBlur={handleEmailBlur}
                      placeholder="email@example.com"
                      required
                    />
                    {shippingErrors.email && <span className="error-text">{shippingErrors.email}</span>}
                  </div>

                  {/* CASE 1: Existing Account with Password */}
                  {emailCase === "EXISTS_PASSWORD" && !isAuthenticated && (
                    <div className="inline-welcome-login-box full-width" style={{
                      background: "#fcf8f2",
                      border: "1px solid #f0e9df",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      marginTop: "0.5rem",
                      marginBottom: "1rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#171412" }}>
                        <User size={18} style={{ color: "#c8a96e" }} />
                        <strong style={{ fontSize: "1rem" }}>Welcome back{existingName ? `, ${existingName}` : ""}!</strong>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "#6a645c", margin: "0 0 1rem" }}>
                        An account associated with <strong>{shippingForm.email}</strong> already exists. Enter your password to log in and access saved addresses.
                      </p>

                      {loginError && (
                        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                          {loginError}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter your password"
                          style={{ flex: 1, minWidth: "180px", padding: "0.6rem 0.85rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.9rem" }}
                        />
                        <button
                          type="button"
                          onClick={handleInlineLogin}
                          disabled={loginLoading}
                          style={{ padding: "0.6rem 1.25rem", background: "#171412", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
                        >
                          {loginLoading ? "Logging in..." : "Log In"}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", fontSize: "0.82rem" }}>
                        <Link to="/account" target="_blank" style={{ color: "#c8a96e", textDecoration: "underline" }}>Forgot password?</Link>
                        <button type="button" onClick={() => setEmailCase(null)} style={{ background: "none", border: "none", color: "#6a645c", cursor: "pointer", textDecoration: "underline" }}>
                          Continue as guest or another email
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: Guest with Past Orders */}
                  {emailCase === "GUEST_WITH_PAST_ORDERS" && !isAuthenticated && (
                    <div className="inline-guest-activation-box full-width" style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1e40af",
                      padding: "1rem",
                      borderRadius: "10px",
                      marginTop: "0.5rem",
                      marginBottom: "1rem",
                      fontSize: "0.88rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                        <Info size={18} />
                        <span>Account Activation Available</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "0.84rem" }}>
                        You have placed past orders with us! We will automatically set up your account so you can manage order history and saved addresses.
                      </p>
                    </div>
                  )}

                  {isAuthenticated && (user?.addresses?.length ?? 0) > 0 && (
                    <div className="form-input-box full-width">
                      <label htmlFor="saved-address-select">Saved Address</label>
                      <select
                        id="saved-address-select"
                        value={selectedAddressId}
                        onChange={(e) => {
                          setSelectedAddressId(e.target.value);
                          const selected = user?.addresses?.find((address) => address.id === e.target.value);
                          if (selected) applySavedAddress(selected);
                        }}
                      >
                        {(user?.addresses ?? []).map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label || "Saved address"} - {address.line1}, {address.city}, {address.country}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-input-box">
                    <label htmlFor="chk-firstname">First Name *</label>
                    <input
                      id="chk-firstname" autoComplete="shipping given-name"
                      type="text"
                      className={shippingErrors.firstName ? "input-error" : ""}
                      value={shippingForm.firstName}
                      onChange={(e) => setShippingForm({ ...shippingForm, firstName: e.target.value })}
                      placeholder="Jane"
                      required
                    />
                    {shippingErrors.firstName && <span className="error-text">{shippingErrors.firstName}</span>}
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-lastname">Last Name *</label>
                    <input
                      id="chk-lastname" autoComplete="shipping family-name"
                      type="text"
                      className={shippingErrors.lastName ? "input-error" : ""}
                      value={shippingForm.lastName}
                      onChange={(e) => setShippingForm({ ...shippingForm, lastName: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                    {shippingErrors.lastName && <span className="error-text">{shippingErrors.lastName}</span>}
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-address">Street Address *</label>
                    <input
                      id="chk-address" autoComplete="shipping street-address"
                      type="text"
                      className={shippingErrors.address ? "input-error" : ""}
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                      placeholder="123 Main St, Apt 4B"
                      required
                    />
                    {shippingErrors.address && <span className="error-text">{shippingErrors.address}</span>}
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-city">City *</label>
                    <input
                      id="chk-city" autoComplete="shipping address-level2"
                      type="text"
                      className={shippingErrors.city ? "input-error" : ""}
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                      placeholder="New York"
                      required
                    />
                    {shippingErrors.city && <span className="error-text">{shippingErrors.city}</span>}
                  </div>

                  <div className="form-input-box-row">
                    <div className="form-input-box half">
                      <label htmlFor="chk-state">State / Province *</label>
                      <input
                        id="chk-state" autoComplete="shipping address-level1"
                        type="text"
                        placeholder="NY"
                        className={shippingErrors.state ? "input-error" : ""}
                        value={shippingForm.state}
                        onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                        required
                      />
                      {shippingErrors.state && <span className="error-text">{shippingErrors.state}</span>}
                    </div>
                    <div className="form-input-box half">
                      <label htmlFor="chk-zip">Zip / Postal Code *</label>
                      <input
                        id="chk-zip" autoComplete="shipping postal-code"
                        type="text"
                        className={shippingErrors.zip ? "input-error" : ""}
                        value={shippingForm.zip}
                        onChange={(e) => setShippingForm({ ...shippingForm, zip: e.target.value })}
                        placeholder="10001"
                        required
                      />
                      {shippingErrors.zip && <span className="error-text">{shippingErrors.zip}</span>}
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-country">Country *</label>
                    <select
                      id="chk-country" autoComplete="shipping country-name"
                      className={shippingErrors.country ? "input-error" : ""}
                      value={shippingForm.country}
                      onChange={(e) => {
                        const selectedPhoneCountry = getCountryOptionByCountry(e.target.value);
                        setShippingForm({
                          ...shippingForm,
                          country: e.target.value,
                          phoneCountry: selectedPhoneCountry?.iso ?? shippingForm.phoneCountry,
                          phoneDialCode: selectedPhoneCountry?.dialCode ?? shippingForm.phoneDialCode,
                        });
                      }}
                      required
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {shippingErrors.country && <span className="error-text">{shippingErrors.country}</span>}
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="chk-phone">Phone Number *</label>
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
                        id="chk-phone" autoComplete="shipping tel-national"
                        type="tel"
                        className={shippingErrors.phone ? "input-error" : ""}
                        value={shippingForm.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value, shippingForm.phoneCountry);
                          setShippingForm({ ...shippingForm, phone: formatted });
                        }}
                        placeholder="123 456 7890"
                        required
                      />
                    </div>
                    {shippingErrors.phone && <span className="error-text">{shippingErrors.phone}</span>}
                  </div>

                  {/* Corporate & VAT Fields (Optional) */}
                  <div className="form-input-box">
                    <label htmlFor="chk-company">Company Name (Optional)</label>
                    <input
                      id="chk-company" autoComplete="organization"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corp"
                    />
                  </div>

                  <div className="form-input-box">
                    <label htmlFor="chk-vat">VAT / Tax ID (Optional)</label>
                    <input
                      id="chk-vat"
                      type="text"
                      value={vatId}
                      onChange={(e) => setVatId(e.target.value)}
                      placeholder="VAT12345678"
                    />
                  </div>

                  {/* Billing Address & Account Options */}
                  <div className="checkout-options-section full-width" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0e9df" }}>
                    <label className="checkout-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", color: "#171412", marginBottom: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                        style={{ accentColor: "#171412", width: "16px", height: "16px" }}
                      />
                      <span>Billing address is same as shipping address</span>
                    </label>

                    {!sameAsShipping && (
                      <div className="billing-address-form-box" style={{ background: "#fdfbf7", border: "1px solid #f0e9df", padding: "1.25rem", borderRadius: "10px", marginBottom: "1rem" }}>
                        <h4 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#171412" }}>Billing Address Details</h4>
                        <div className="checkout-form-grid checkout-billing-grid">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={billingForm.firstName}
                            onChange={(e) => setBillingForm({ ...billingForm, firstName: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={billingForm.lastName}
                            onChange={(e) => setBillingForm({ ...billingForm, lastName: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="Address"
                            value={billingForm.address}
                            onChange={(e) => setBillingForm({ ...billingForm, address: e.target.value })}
                            style={{ gridColumn: "1 / -1", padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="City"
                            value={billingForm.city}
                            onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={billingForm.state}
                            onChange={(e) => setBillingForm({ ...billingForm, state: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="Zip Code"
                            value={billingForm.zip}
                            onChange={(e) => setBillingForm({ ...billingForm, zip: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                          <input
                            type="text"
                            placeholder="Country"
                            value={billingForm.country}
                            onChange={(e) => setBillingForm({ ...billingForm, country: e.target.value })}
                            style={{ padding: "0.65rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                          />
                        </div>
                      </div>
                    )}

                    {!isAuthenticated && (
                      <label className="checkout-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", color: "#374151", marginBottom: "0.75rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={autoCreateAccount}
                          onChange={(e) => {
                            setAutoCreateAccount(e.target.checked);
                            setCheckoutMode(e.target.checked ? "createAccount" : "guest");
                            setCheckoutPromptError("");
                          }}
                          style={{ accentColor: "#171412", width: "16px", height: "16px" }}
                        />
                        <span>Create my Vestigia account automatically after purchase (Recommended)</span>
                      </label>
                    )}

                    <label className="checkout-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", color: "#374151", marginBottom: "0.75rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isGiftOrder}
                        onChange={(e) => setIsGiftOrder(e.target.checked)}
                        style={{ accentColor: "#171412", width: "16px", height: "16px" }}
                      />
                      <span> This is a gift order (Include complimentary gift packaging)</span>
                    </label>

                    {isGiftOrder && (
                      <div style={{ marginBottom: "1rem" }}>
                        <textarea
                          placeholder="Write a personalized gift message..."
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          rows={3}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.88rem" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Shipping Blocked Warning */}
                  {shippingBlocked && (
                    <div className="shipping-blocked-alert full-width" style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      padding: "1rem",
                      borderRadius: "8px",
                      marginTop: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem"
                    }}>
                      <Shield size={20} style={{ color: "#dc2626" }} />
                      <div>
                        <strong>Shipping Unavailable</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "0.88rem" }}>{shippingBlockedMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Announcement Banner */}
                  {shippingAnnouncements.length > 0 && !shippingBlocked && (
                    <div className="shipping-announcement-banner full-width" style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1e40af",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      marginTop: "0.75rem",
                      fontSize: "0.88rem"
                    }}>
                      📢 <strong>Notice:</strong> {shippingAnnouncements[0].message}
                    </div>
                  )}

                  {/* Dynamic Shipping Method Selector */}
                  {!shippingBlocked && dynamicMethods.length > 0 && (
                    <div className="shipping-methods-wrapper full-width">
                      <h3 className="shipping-methods-title">
                        Shipping Method ({shippingRegionName ? `${shippingRegionName} Region` : "Available"})
                      </h3>

                      {isFreeShipping && (
                        <div className="free-shipping-qualify-banner" style={{
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          color: "#065f46",
                          padding: "0.6rem 0.85rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          marginBottom: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}>
                          <CheckCircle2 size={16} />
                          Congratulations! Your order qualifies for FREE Shipping.
                        </div>
                      )}

                      <div className="shipping-methods-options">
                        {dynamicMethods.map((m) => {
                          const methodQualifiesFree = m.freeShippingThreshold !== null && cartTotalBeforeDiscount >= m.freeShippingThreshold;
                          const finalPrice = methodQualifiesFree ? 0 : m.price;
                          const isSelected = selectedMethodId === m.id;

                          return (
                            <label key={m.id} className={`shipping-method-option-card ${isSelected ? "active" : ""}`}>
                              <input
                                type="radio"
                                name="shipping_opt"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedMethodId(m.id);
                                  setEstimatedDeliveryText(m.estimatedDays);
                                }}
                              />
                              <div className="shipping-method-info">
                                <strong>{m.name}</strong>
                                <span>Estimated: {m.estimatedDays} {m.description ? `• ${m.description}` : ""}</span>
                              </div>
                              <span className="price-tag">
                                {finalPrice === 0 ? "FREE" : money(finalPrice)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    className="checkout-continue-btn full-width"
                    type="submit"
                    disabled={shippingValidationLoading || shippingBlocked || !selectedMethodId || (!isAuthenticated && checkoutMode === null)}
                  >
                    {shippingBlocked ? "Shipping Unavailable for Selected Country" : shippingValidationLoading ? "Checking shipping..." : "Continue to payment"}
                  </button>
                </form>
              </Reveal>
            )}

            {step === "payment" && (
              <Reveal trigger="mount" duration={animationConfig.duration.fast} variant="fade" as="section"
                key="payment"
              >
                <div className="checkout-step-header">
                  <h2 className="checkout-section-title">Payment method</h2>
                  <button className="back-to-shipping-btn" disabled={isProcessing} type="button" onClick={() => setStep("shipping")}>
                    Edit shipping
                  </button>
                </div>
                <form className="checkout-form-grid" onSubmit={(event) => event.preventDefault()}>
                  <div className="payment-security-notice full-width">
                    <Shield size={14} />
                    <span>
                      {checkoutConfig.mockPaymentsEnabled
                        ? "Local mock payments are enabled. No card will be charged."
                        : "Powered by Stripe. Transactions are secure and encrypted."}
                    </span>
                  </div>

                  {stripeSetupMessage && (
                    <p className="payment-error-message full-width" role="alert">
                      {stripeSetupMessage}
                    </p>
                  )}

                  <div className="form-input-box full-width">
                    <label htmlFor="pay-name">Name on Card</label>
                    <input
                      id="pay-name" autoComplete="cc-name"
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
                      {stripePublishableKeyLooksValid ? (
                        <CardElement
                          id="card-element"
                          options={{
                            hidePostalCode: true,
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
                      ) : (
                        <span style={{ color: "#991b1b", fontSize: "0.9rem" }}>
                          Stripe card input is unavailable until the frontend publishable key is configured.
                        </span>
                      )}
                    </div>
                  </div>

                  {paymentError && <p className="payment-error-message full-width" role="alert">{paymentError}</p>}
                  {serverQuote ? (
                    <section className="checkout-quote-review full-width" aria-labelledby="quote-review-title">
                      <h3 id="quote-review-title">Your order total</h3>
                      <p role="status">
                        {serverQuote.priceChanged
                          ? "An item price has changed. Check the updated amount before confirming."
                          : "Shipping, discounts and tax are included in the total below."}
                      </p>
                      <ul className="checkout-quote-items">
                        {serverQuote.items.map((item: any) => (
                          <li key={JSON.stringify([item.productId, item.size, item.color])}>
                            <span>{item.productName} &times; {item.quantity}</span>
                            <strong>{formatMoney(item.subtotalMinor, lockedCurrency)}</strong>
                          </li>
                        ))}
                      </ul>
                      <dl className="checkout-quote-totals">
                        {([
                          ["Subtotal", serverQuote.subtotalMinor],
                          ["Discount", serverQuote.discountMinor],
                          ["Shipping", serverQuote.shippingMinor],
                          [`Tax (${serverQuote.taxRateBps / 100}%)`, serverQuote.taxMinor],
                        ] as [string, number][]).map(([label, amount]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{label === "Discount" && amount > 0 ? "-" : ""}{formatMoney(amount, lockedCurrency)}</dd>
                          </div>
                        ))}
                        <div className="checkout-quote-total">
                          <dt>Total to pay</dt>
                          <dd>{formatMoney(serverQuote.totalMinor, lockedCurrency)} {lockedCurrency}</dd>
                        </div>
                      </dl>
                      <p>You will be charged in {lockedCurrency} when you select Confirm payment.</p>
                    </section>
                  ) : (
                    <div className="checkout-review-note full-width" role={quoteError ? "alert" : "status"}>
                      <p>{quoteError || "Calculating your total..."}</p>
                      {quoteError && <button type="button" className="checkout-total-retry" onClick={() => setQuoteReload(value => value + 1)}>Retry</button>}
                    </div>
                  )}

                  <button
                    className="checkout-continue-btn full-width"
                    type="button"
                    onClick={handlePaymentSubmit}
                    disabled={isProcessing || stripeFrontendMissing || quoteLoading || !serverQuote}
                  >
                    {isProcessing ? (
                      <>
                        <Loader size={16} className="spinner" />
                        Processing payment...
                      </>
                    ) : (
                      serverQuote ? `Confirm payment - ${money(activeGrandTotal)} ${lockedCurrency}` : "Confirm payment"
                    )}
                  </button>
                </form>
              </Reveal>
            )}

            {step === "success" && (
              <Reveal trigger="mount" duration={animationConfig.duration.fast} variant="fade" as="section"
                key="success"
                className="checkout-success-view"
              >
                <Reveal className="success-hero-section">
                  {/* VESTIGIA emblem \u2014 premium confirmation moment */}
                  <div className="success-emblem-wrap">
                    <img
                      src="/images/products/vestigia_logo.png"
                      alt="VESTIGIA"
                      className="vst-emblem vst-emblem--lg vst-emblem--shadow"
                    />
                  </div>
                  <h1>Thank you, {shippingForm.firstName}.</h1>
                  <p className="success-subheading">Your order is confirmed and is now being processed.</p>
                  <p className="order-number-receipt">Receipt ID: <strong>{orderNumber}</strong></p>
                </Reveal>


                <div className="success-details-layout">
                  {/* Left Column: Tracking and Info */}
                  <div className="success-info-col">
                    {/* Status Timeline */}
                    <Reveal className="success-card timeline-card">
                      <h3>Order Status</h3>
                      <div className="status-timeline">
                        <div className="timeline-step completed">
                          <div className="timeline-marker">
                            <span className="dot"></span>
                          </div>
                          <div className="timeline-content">
                            <h4>Order Confirmed</h4>
                            <p>We've received your order and payment.</p>
                          </div>
                        </div>
                        <div className="timeline-step active">
                          <div className="timeline-marker">
                            <span className="dot"></span>
                          </div>
                          <div className="timeline-content">
                            <h4>Processing</h4>
                            <p>Preparing items for dispatch.</p>
                          </div>
                        </div>
                        <div className="timeline-step upcoming">
                          <div className="timeline-marker">
                            <span className="dot"></span>
                          </div>
                          <div className="timeline-content">
                            <h4>Shipped</h4>
                            <p>Expected delivery: {shippingMethodSelected === "express" ? "1-2" : "3-5"} business days.</p>
                          </div>
                        </div>
                        <div className="timeline-step upcoming">
                          <div className="timeline-marker">
                            <span className="dot"></span>
                          </div>
                          <div className="timeline-content">
                            <h4>Delivered</h4>
                            <p>Arrival at your address.</p>
                          </div>
                        </div>
                      </div>
                    </Reveal>

                    {/* Delivery & Billing Details Grid */}
                    <Reveal className="success-card details-grid-card">
                      <h3>Delivery Details</h3>
                      <div className="details-grid">
                        <div className="grid-item">
                          <span>Shipping Address</span>
                          <p>
                            {shippingForm.firstName} {shippingForm.lastName}<br />
                            {shippingForm.address}<br />
                            {shippingForm.city}, {shippingForm.state} {shippingForm.zip}<br />
                            {shippingForm.country}
                          </p>
                        </div>
                        <div className="grid-item">
                          <span>Delivery Method</span>
                          <p>
                            {shippingMethodSelected === "express" ? "Express Delivery" : "Standard Delivery"}<br />
                            Est: {shippingMethodSelected === "express" ? "1-2 business days" : "3-5 business days"}
                          </p>
                        </div>
                        <div className="grid-item">
                          <span>Contact Info</span>
                          <p>
                            {shippingForm.email}<br />
                            {shippingForm.phone}
                          </p>
                        </div>
                        <div className="grid-item">
                          <span>Payment Method</span>
                          <p>
                            Credit Card<br />
                            ending in **** (Secure)
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  </div>

                  {/* Right Column: Order Items Summary & Totals */}
                  <div className="success-summary-col">
                    <Reveal className="success-card items-summary-card">
                      <h3>Purchased Items ({successCart.reduce((sum, item) => sum + item.quantity, 0)})</h3>
                      <div className="purchased-items-list">
                        {successCart.map((item, idx) => (
                          <div key={idx} className="purchased-item-card">
                            <ProductImage product={item.product} variant="product" className="item-thumbnail" />
                            <div className="item-meta">
                              <h4>{item.product.name}</h4>
                              <p className="item-variant">
                                {item.selectedSize !== "OS" && `Size: ${item.selectedSize}`}
                                {item.selectedSize !== "OS" && item.selectedColor && " / "}
                                {item.selectedColor && `Color: ${getColorName(item.selectedColor)}`}
                              </p>
                              <span className="item-qty">Qty: {item.quantity}</span>
                            </div>
                            <span className="item-price">{money(getProductPrice(item.product, currency) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="receipt-calculation-breakdown">
                        <div className="calc-row">
                          <span>Subtotal</span>
                          <span>{money(receiptSummary.subtotal)}</span>
                        </div>
                        {receiptSummary.discount > 0 && (
                          <div className="calc-row discount">
                            <span>Discount ({receiptSummary.promoCode})</span>
                            <span>-{money(receiptSummary.discount)}</span>
                          </div>
                        )}
                        <div className="calc-row">
                          <span>Shipping</span>
                          <span>{receiptSummary.shipping === 0 ? "Complimentary" : money(receiptSummary.shipping)}</span>
                        </div>
                        <div className="calc-row">
                          <span>Tax</span>
                          <span>{money(receiptSummary.tax)}</span>
                        </div>
                        <div className="calc-row grand-total-row">
                          <span>Total Paid</span>
                          <strong>{money(receiptSummary.total)}</strong>
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </div>

                <div className="success-action-buttons">
                  <Link to="/shop" className="btn-primary-success">
                    Continue Shopping
                  </Link>
                  <button type="button" onClick={() => window.print()} className="btn-secondary-success">
                    Print Receipt
                  </button>
                </div>
              </Reveal>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Checkout Summary Review */}
        {step !== "success" && (
          <Reveal as="aside" className="checkout-summary-pane">
            <h3>Order summary ({cartCount})</h3>
            <div className="checkout-summary-items-list">
              {cart.map((item, idx) => {
                const liveProduct = products.find(p => p.id === item.product.id);
                const isDeleted = !liveProduct;
                const stockKey = `${item.selectedColor}_${item.selectedSize}`;
                const isOutOfStock = liveProduct && liveProduct.inventory && liveProduct.inventory[stockKey] === 0;
                const isUnavailable = isDeleted || isOutOfStock;

                return (
                  <div key={idx} className="checkout-summary-item-card" style={isUnavailable ? { opacity: 0.6 } : {}}>
                    <div className="img-holder">
                      <ProductImage product={item.product} variant="product" />
                      <span className="qty-tag">{item.quantity}</span>
                    </div>
                    <div className="details-col">
                      <h4 style={isUnavailable ? { textDecoration: "line-through", color: "#888" } : {}}>{item.product.name}</h4>
                      <p>
                        {item.selectedSize !== "OS" && `Size: ${item.selectedSize}`}
                        {item.selectedSize !== "OS" && item.selectedColor && "  /  "}
                        {item.selectedColor && `Color: ${item.selectedColor}`}
                      </p>
                      {isUnavailable && (
                        <p style={{ color: "#dc2626", fontSize: "11px", fontWeight: 600, marginTop: "2px" }}>
                          {isDeleted ? "No longer available" : "Out of stock"}
                        </p>
                      )}
                    </div>
                    <span className="price-tag" style={isUnavailable ? { color: "#888" } : {}}>{money(getProductPrice(item.product, currency) * item.quantity)}</span>
                  </div>
                );
              })}
            </div>

            {/* Promo Form in Summary */}
            <div className="checkout-promo-box">
              {promoCode ? (
                <div className="promo-tag-applied">
                  <span>Code <strong>{promoCode}</strong> applied</span>
                  <button type="button" disabled={isProcessing} onClick={removePromoCode}>Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="summary-promo-form">
                  <input
                    type="text"
                    aria-label="Discount code"
                    disabled={isProcessing}
                    placeholder="Discount code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                  />
                  <button type="submit" disabled={isProcessing}>Apply</button>
                </form>
              )}
              {promoError && <p className="promo-error-text">{promoError}</p>}
            </div>

            {/* Price Calculations breakdown */}
            <div className="checkout-calculations">
              <div>
                <span>Subtotal</span>
                <span>{money(summarySubtotal)}</span>
              </div>
              {summaryDiscount > 0 && (
                <div className="discount-row">
                  <span>Discount ({promoCode})</span>
                  <span>-{money(summaryDiscount)}</span>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <span>{summaryShipping === 0 ? "Complimentary" : money(summaryShipping)}</span>
              </div>
              <div>
                <span>Tax</span>
                <span>{serverQuote ? money(summaryTax) : "Calculated at payment"}</span>
              </div>
              <div className="grand-total-row">
                <span>Total</span>
                <strong>{money(activeGrandTotal)}</strong>
              </div>
            </div>
          </Reveal>
        )}

      </div>

      {step !== "success" && (
        <footer className="checkout-minimal-footer">
          <div className="footer-links">
            <Link to="/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</Link>
            <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
            <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Vestigia. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}

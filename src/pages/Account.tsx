import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  User, ShoppingBag, Heart, MapPin, Trash2, Plus, Eye, EyeOff,
  Lock, Mail, Info, LogOut, Package, RotateCcw, FileText,
  ChevronRight, CheckCircle, X, Printer, ShieldCheck, Truck, Phone
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useUser, Address } from "../context/UserContext";
import { useAdmin } from "../admin/AdminContext";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { products, type Product } from "../data";
import {
  COUNTRY_PHONE_OPTIONS,
  detectVisitorCountry,
  formatPhoneNumber,
  DEFAULT_COUNTRY,
  type CountryPhoneOption,
} from "../utils/phoneUtils";

type Tab = "orders" | "wishlist" | "addresses" | "profile";
type AuthScreen = "login" | "register" | "forgot";

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

// ── Time-of-day greeting ───────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ── Format status display text ─────────────────────────────────────────────────
function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Monogram Avatar ────────────────────────────────────────────────────────────
function MonogramAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="account-monogram" aria-hidden="true">
      {initials}
    </div>
  );
}

// ── Order Skeleton ─────────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="order-skeleton-list">
      {[1, 2].map((i) => (
        <div key={i} className="order-skeleton-card">
          <div className="skeleton-row">
            <div className="skeleton-block" style={{ width: "140px", height: "14px" }} />
            <div className="skeleton-block" style={{ width: "80px", height: "22px", borderRadius: "12px" }} />
          </div>
          <div className="skeleton-block" style={{ width: "100px", height: "12px", marginTop: "6px" }} />
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <div className="skeleton-block" style={{ width: "56px", height: "72px", borderRadius: "4px" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-block" style={{ width: "60%", height: "13px" }} />
              <div className="skeleton-block" style={{ width: "40%", height: "11px", marginTop: "8px" }} />
            </div>
            <div className="skeleton-block" style={{ width: "60px", height: "13px" }} />
          </div>
          <div className="skeleton-row" style={{ marginTop: "20px" }}>
            <div className="skeleton-block" style={{ width: "110px", height: "36px", borderRadius: "4px" }} />
            <div className="skeleton-block" style={{ width: "100px", height: "36px", borderRadius: "4px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Resolve Order Item Image Helper ──────────────────────────────────────────
function resolveOrderItemImage(item: any, adminProducts: Product[] = []): string {
  if (!item) return "";

  const directImg = item.image || item.productImage || item.product_image || item.img;
  if (directImg && typeof directImg === "string" && directImg.trim() !== "") {
    return directImg;
  }

  const allProducts = [...(adminProducts || []), ...products];

  if (item.productId) {
    const byId = allProducts.find((p) => String(p.id) === String(item.productId));
    if (byId?.image) return byId.image;
  }

  if (item.productName) {
    const cleanName = String(item.productName).trim().toLowerCase();
    const byName = allProducts.find(
      (p) => p.name.trim().toLowerCase() === cleanName || cleanName.includes(p.name.trim().toLowerCase())
    );
    if (byName?.image) return byName.image;
  }

  return "";
}

// ── Order Details Modal ────────────────────────────────────────────────────────
function OrderDetailsModal({
  order,
  onClose,
  onReorder,
  onInvoice,
  money,
  adminProducts,
}: {
  order: any;
  onClose: () => void;
  onReorder: (order: any) => void;
  onInvoice: (order: any) => void;
  money: (val: number) => string;
  adminProducts: Product[];
}) {
  if (!order) return null;

  const items = order.items ?? [];
  const subtotal = order.subtotal ?? items.reduce((acc: number, it: any) => acc + (it.price * (it.quantity || 1)), 0);
  const shipping = order.shipping ?? 15;
  const tax = order.tax ?? (subtotal * 0.08);
  const total = order.total ?? (subtotal + shipping + tax);

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <motion.div
        className="order-modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        <div className="order-modal-header">
          <div>
            <div className="modal-title-row">
              <h3>Order {order.id}</h3>
              <span className={`order-status-badge status-${(order.status || "pending").toLowerCase().replace(/ /g, "-")}`}>
                {formatStatus(order.status || "pending")}
              </span>
            </div>
            <p className="order-modal-date">Placed on {order.date}</p>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="order-modal-body">
          {/* Shipping & Payment Summary */}
          <div className="order-modal-meta-grid">
            <div className="meta-box">
              <h4><MapPin size={15} /> Shipping Address</h4>
              <p><strong>{order.customerName || order.name || "Customer"}</strong></p>
              <p>{order.address || order.shippingAddress?.line1 || "Standard Shipping Address"}</p>
              {order.city && <p>{order.city}, {order.state} {order.zip}</p>}
              {order.country && <p>{order.country}</p>}
              {order.phone && <p className="phone-sub">{order.phone}</p>}
            </div>

            <div className="meta-box">
              <h4><ShieldCheck size={15} /> Order Information</h4>
              <p><span>Payment Status:</span> <strong>Paid / Confirmed</strong></p>
              <p><span>Payment Method:</span> <strong>{order.paymentMethod || "Credit Card (Stripe)"}</strong></p>
              <p><span>Fulfillment:</span> <strong>{formatStatus(order.status || "Processing")}</strong></p>
              {["shipped", "delivered"].includes((order.status || "").toLowerCase()) && (
                <div style={{ marginTop: "8px" }}>
                  <a
                    href="https://www.dhl.com/gb-en/home/tracking.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-track-link"
                  >
                    <Truck size={13} /> Track with DHL Express
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="order-modal-items-section">
            <h4>Ordered Items ({items.length})</h4>
            <div className="modal-items-list">
              {items.map((item: any, idx: number) => {
                const imgUrl = resolveOrderItemImage(item, adminProducts);
                return (
                  <div key={idx} className="modal-item-row">
                    <div className="modal-item-thumb">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.productName || "Item"} />
                      ) : (
                        <Package size={20} />
                      )}
                    </div>
                    <div className="modal-item-details">
                      <h5>{item.productName}</h5>
                      <p className="modal-item-specs">
                        {item.size && <span>Size: <strong>{item.size}</strong></span>}
                        {item.color && (
                          <span className="color-spec">
                            Color: <span className="color-dot" style={{ backgroundColor: item.color }} />
                          </span>
                        )}
                        <span>Qty: <strong>{item.quantity || 1}</strong></span>
                      </p>
                    </div>
                    <div className="modal-item-pricing">
                      <span className="unit-p">{money(item.price)} each</span>
                      <strong className="total-p">{money((item.price || 0) * (item.quantity || 1))}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="order-modal-summary-box">
            <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? "Complimentary" : money(shipping)}</span></div>
            <div className="summary-row"><span>Tax (8%)</span><span>{money(tax)}</span></div>
            <div className="summary-row grand-total"><span>Grand Total</span><strong>{money(total)}</strong></div>
          </div>
        </div>

        <div className="order-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={() => onInvoice(order)}>
            <FileText size={15} /> View Invoice
          </button>
          <button type="button" className="admin-btn primary" onClick={() => { onReorder(order); onClose(); }}>
            <RotateCcw size={15} /> Reorder Items
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Order Invoice Modal ───────────────────────────────────────────────────────
function OrderInvoiceModal({
  order,
  onClose,
  money,
}: {
  order: any;
  onClose: () => void;
  money: (val: number) => string;
}) {
  if (!order) return null;

  const items = order.items ?? [];
  const subtotal = order.subtotal ?? items.reduce((acc: number, it: any) => acc + (it.price * (it.quantity || 1)), 0);
  const shipping = order.shipping ?? 15;
  const tax = order.tax ?? (subtotal * 0.08);
  const total = order.total ?? (subtotal + shipping + tax);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop-overlay invoice-overlay" onClick={onClose}>
      <motion.div
        className="invoice-modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
      >
        <div className="no-print invoice-modal-header">
          <h3>Official Order Invoice</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="admin-btn primary" onClick={handlePrint}>
              <Printer size={15} /> Print / Save PDF
            </button>
            <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close invoice">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="invoice-printable-area" id="printable-invoice">
          <div className="invoice-document-sheet">
            {/* Header */}
            <div className="invoice-sheet-header">
              <div>
                <h1 className="brand-logo-title">VESTIGIA</h1>
                <p className="brand-sub">ATELIER IMPULSE — HIGH LUXURY APPAREL</p>
                <p className="tax-reg">VAT / TAX ID: REG-882947192-EU</p>
              </div>
              <div className="inv-meta-right">
                <h2 className="inv-title">TAX INVOICE</h2>
                <p className="inv-num"><strong>Invoice #:</strong> INV-{order.id}</p>
                <p className="inv-date"><strong>Date:</strong> {order.date}</p>
                <p className="inv-status"><strong>Status:</strong> PAID</p>
              </div>
            </div>

            <hr className="inv-divider" />

            {/* Addresses */}
            <div className="invoice-addresses-grid">
              <div className="inv-address-col">
                <h4>Issued By:</h4>
                <p><strong>VESTIGIA Atelier Impulse</strong></p>
                <p>75001 Rue Saint-Honoré</p>
                <p>Paris, France</p>
                <p>concierge@vestigia-official.com</p>
              </div>
              <div className="inv-address-col">
                <h4>Billed & Shipped To:</h4>
                <p><strong>{order.customerName || order.name || "Customer"}</strong></p>
                <p>{order.address || order.shippingAddress?.line1 || "Registered Customer Address"}</p>
                {order.city && <p>{order.city}, {order.state} {order.zip}</p>}
                {order.country && <p>{order.country}</p>}
                {order.email && <p>{order.email}</p>}
              </div>
            </div>

            {/* Items table */}
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Description</th>
                  <th>Variant</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Unit Price</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{item.productName}</strong>
                    </td>
                    <td>
                      {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                        .filter(Boolean)
                        .join(" / ") || "Standard"}
                    </td>
                    <td style={{ textAlign: "center" }}>{item.quantity || 1}</td>
                    <td style={{ textAlign: "right" }}>{money(item.price)}</td>
                    <td style={{ textAlign: "right" }}>{money((item.price || 0) * (item.quantity || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div className="invoice-footer-summary">
              <div className="inv-notes">
                <p><strong>Payment Method:</strong> {order.paymentMethod || "Credit Card (Stripe)"}</p>
                <p className="inv-thankyou">Thank you for choosing VESTIGIA. For customer support or returns, visit vestigia.com/contact.</p>
              </div>
              <div className="inv-totals-box">
                <div className="tot-row"><span>Subtotal:</span><span>{money(subtotal)}</span></div>
                <div className="tot-row"><span>Shipping:</span><span>{shipping === 0 ? "Complimentary" : money(shipping)}</span></div>
                <div className="tot-row"><span>Sales Tax (8%):</span><span>{money(tax)}</span></div>
                <hr />
                <div className="tot-row final-grand"><span>Total Paid:</span><strong>{money(total)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Account() {
  const { formatPrice: money } = useCurrency();
  const { products: adminProducts } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const tokenParam = searchParams.get("token");

  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "orders");
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");

  const { wishlist, toggleWishlist, addToCart, openCart } = useCart();
  const {
    user, isAuthenticated, isLoading: authLoading,
    login, registerUser, forgotPassword, resetPassword,
    changePassword, updateUser, addAddress, removeAddress,
    setDefaultAddress, logout, getOrders
  } = useUser();

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerCountry, setRegisterCountry] = useState<CountryPhoneOption>(DEFAULT_COUNTRY);
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    let active = true;
    void detectVisitorCountry().then((c) => {
      if (active) setRegisterCountry(c);
    });
    return () => { active = false; };
  }, []);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotDevLink, setForgotDevLink] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const [changeOldPassword, setChangeOldPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState("");
  const [changePwdMessage, setChangePwdMessage] = useState("");
  const [changePwdError, setChangePwdError] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    document.title = isAuthenticated ? "My Account | Vestigia" : "Sign In | Vestigia";
  }, [isAuthenticated]);

  useEffect(() => {
    const loadOrders = async () => {
      if (isAuthenticated) {
        setOrdersLoading(true);
        try {
          const data = await getOrders();
          setOrders(data);
        } catch (e) {
          console.error("Failed to load customer orders:", e);
        } finally {
          setOrdersLoading(false);
        }
      }
    };
    void loadOrders();
  }, [isAuthenticated]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    searchParams.set("tab", tab);
    setSearchParams(searchParams);
  };

  const getProductImageByName = (name: string) => {
    const matched = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
    return matched?.image || "";
  };

  const handleMoveToCart = (product: Product) => {
    const size = product.sizes[0] || "OS";
    const color = product.colors[0] || "";
    addToCart(product, size, color);
    toggleWishlist(product);
  };

  const handleReorder = (order: any) => {
    if (!order || !order.items || order.items.length === 0) return;
    let addedCount = 0;
    (order.items ?? []).forEach((item: any) => {
      const matchedProduct = products.find(
        (p) => p.id === item.productId || p.name.toLowerCase() === (item.productName || "").toLowerCase()
      );

      const targetProduct: Product = matchedProduct || {
        id: Number(item.productId) || Math.floor(Math.random() * 100000) + 9000,
        name: item.productName || "Apparel Item",
        price: item.price || 0,
        category: "Clothing",
        image: item.image || getProductImageByName(item.productName) || "/placeholder.jpg",
        images: [item.image || getProductImageByName(item.productName) || "/placeholder.jpg"],
        alt: item.productName || "Item",
        sizes: [item.size || "M"],
        colors: [item.color || "#000000"],
        description: "",
        details: [],
        care: [],
        rating: 5,
        reviews: [],
      };

      const size = item.size || targetProduct.sizes[0] || "M";
      const color = item.color || targetProduct.colors[0] || "";
      const qty = item.quantity || 1;

      addToCart(targetProduct, size, color, qty);
      addedCount += qty;
    });

    if (addedCount > 0) {
      setReorderSuccess(order.id);
      openCart();
      setTimeout(() => setReorderSuccess(null), 3000);
    }
  };

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) { setLoginError("Please enter your email and password."); return; }
    setFormLoading(true);
    const result = await login(loginEmail, loginPassword);
    setFormLoading(false);
    if (!result.success) { setLoginError(result.error || "Login failed."); }
    else { setLoginEmail(""); setLoginPassword(""); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (!registerName || !registerEmail || !registerPassword) { setRegisterError("Full name, email, and password are required."); return; }
    if (registerPassword !== registerConfirmPassword) { setRegisterError("Passwords do not match."); return; }
    setFormLoading(true);
    const fullPhone = registerPhone.trim()
      ? `${registerCountry.dialCode} ${registerPhone.trim()}`
      : "";
    const result = await registerUser(registerName, registerEmail, registerPassword, fullPhone);
    setFormLoading(false);
    if (!result.success) { setRegisterError(result.error || "Registration failed."); }
    else { setRegisterName(""); setRegisterEmail(""); setRegisterPhone(""); setRegisterPassword(""); setRegisterConfirmPassword(""); }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(""); setForgotMessage(""); setForgotDevLink("");
    if (!forgotEmail) { setForgotError("Email address is required."); return; }
    setFormLoading(true);
    const result = await forgotPassword(forgotEmail);
    setFormLoading(false);
    if (!result.success) { setForgotError(result.error || "An error occurred."); }
    else {
      setForgotMessage("If this email exists, recovery instructions have been sent.");
      if (result.devLink) setForgotDevLink(result.devLink);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(""); setResetMessage("");
    if (!tokenParam) { setResetError("Reset token is missing from the URL."); return; }
    if (!resetNewPassword) { setResetError("Please enter a new password."); return; }
    if (resetNewPassword !== resetConfirmPassword) { setResetError("Passwords do not match."); return; }
    setFormLoading(true);
    const result = await resetPassword(tokenParam, resetNewPassword);
    setFormLoading(false);
    if (!result.success) { setResetError(result.error || "Password reset failed."); }
    else {
      setResetMessage("Your password has been reset. Redirecting…");
      setTimeout(() => {
        searchParams.delete("token");
        setSearchParams(searchParams);
        setAuthScreen("login");
        setResetNewPassword(""); setResetConfirmPassword(""); setResetMessage("");
      }, 3000);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwdError(""); setChangePwdMessage("");
    if (!changeOldPassword || !changeNewPassword) { setChangePwdError("Current password and new password are required."); return; }
    if (changeNewPassword !== changeConfirmPassword) { setChangePwdError("Passwords do not match."); return; }
    setFormLoading(true);
    const result = await changePassword(changeOldPassword, changeNewPassword);
    setFormLoading(false);
    if (!result.success) { setChangePwdError(result.error || "Failed to update password."); }
    else {
      setChangePwdMessage("Password updated successfully.");
      setChangeOldPassword(""); setChangeNewPassword(""); setChangeConfirmPassword("");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="account-auth-loading">
        <div className="account-auth-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  // ── Reset Password view ────────────────────────────────────────────────────
  if (tokenParam && !isAuthenticated) {
    return (
      <motion.div className="account-page-container auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="auth-card-container">
          <div className="auth-card-header">
            <h2>Reset Password</h2>
            <p>Enter your new password below.</p>
          </div>
          <form onSubmit={handleResetSubmit} className="auth-card-form">
            {resetError && <div className="auth-error-alert" role="alert">{resetError}</div>}
            {resetMessage && <div className="auth-success-alert" role="status">{resetMessage}</div>}
            <div className="form-input-box full-width">
              <label htmlFor="rst-pwd">New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input id="rst-pwd" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="Minimum 6 characters" required />
              </div>
            </div>
            <div className="form-input-box full-width">
              <label htmlFor="rst-pwd-conf">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input id="rst-pwd-conf" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Repeat your password" required />
              </div>
            </div>
            <button type="submit" className="save-profile-btn" disabled={formLoading}>
              {formLoading ? "Saving…" : "Reset Password"}
            </button>
          </form>
          <div className="auth-card-footer">
            <button onClick={() => { searchParams.delete("token"); setSearchParams(searchParams); setAuthScreen("login"); }} className="auth-toggle-link">
              Back to Login
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Auth view ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <motion.div className="account-page-container auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <div className="auth-card-container">
          <AnimatePresence mode="wait">
            {authScreen === "login" && (
              <motion.div key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
                <div className="auth-card-header">
                  <h2>Welcome to VESTIGIA</h2>
                  <p>Access your orders and account settings.</p>
                </div>
                <form onSubmit={handleLoginSubmit} className="auth-card-form">
                  {loginError && <div className="auth-error-alert" role="alert">{loginError}</div>}
                  <div className="form-input-box full-width">
                    <label htmlFor="login-email">Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="email@example.com" required />
                    </div>
                  </div>
                  <div className="form-input-box full-width">
                    <div className="label-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label htmlFor="login-pass">Password</label>
                      <button type="button" onClick={() => setAuthScreen("forgot")} className="forgot-password-link">Forgot?</button>
                    </div>
                    <div className="input-with-icon">
                      <Lock size={16} />
                      <input id="login-pass" type={showLoginPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter password" required />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="password-toggle-btn" aria-label="Toggle password visibility">
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="save-profile-btn" disabled={formLoading}>
                    {formLoading ? "Accessing…" : "Log In"}
                  </button>
                </form>
                <div className="auth-card-footer">
                  <span>Don't have an account?</span>
                  <button onClick={() => setAuthScreen("register")} className="auth-toggle-link">Create one</button>
                </div>
              </motion.div>
            )}

            {authScreen === "register" && (
              <motion.div key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
                <div className="auth-card-header">
                  <h2>Create Account</h2>
                  <p>Register to unlock premium member benefits.</p>
                </div>
                <form onSubmit={handleRegisterSubmit} className="auth-card-form">
                  {registerError && <div className="auth-error-alert" role="alert">{registerError}</div>}
                  <div className="form-input-box full-width">
                    <label htmlFor="reg-name">Full Name</label>
                    <div className="input-with-icon"><User size={16} /><input id="reg-name" type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="John Doe" required /></div>
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="reg-email">Email Address</label>
                    <div className="input-with-icon"><Mail size={16} /><input id="reg-email" type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="john@example.com" required /></div>
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="reg-phone">Phone Number <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <select
                        id="reg-phone-country"
                        value={registerCountry.iso}
                        onChange={(e) => {
                          const found = COUNTRY_PHONE_OPTIONS.find((c) => c.iso === e.target.value);
                          if (found) {
                            setRegisterCountry(found);
                            setRegisterPhone(formatPhoneNumber(registerPhone, found.iso));
                          }
                        }}
                        style={{
                          padding: "0.65rem 0.5rem",
                          borderRadius: "6px",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "inherit",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        {COUNTRY_PHONE_OPTIONS.map((c) => (
                          <option key={c.iso} value={c.iso} style={{ background: "#18181b", color: "#fff" }}>
                            {c.flag} {c.dialCode} ({c.iso})
                          </option>
                        ))}
                      </select>
                      <div className="input-with-icon" style={{ flex: 1 }}>
                        <Phone size={16} />
                        <input
                          id="reg-phone"
                          type="tel"
                          value={registerPhone}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value, registerCountry.iso);
                            setRegisterPhone(formatted);
                          }}
                          placeholder={registerCountry.placeholder}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="reg-pass">Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} />
                      <input id="reg-pass" type={showRegisterPassword ? "text" : "password"} value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} placeholder="Create strong password" required />
                      <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="password-toggle-btn" aria-label="Toggle password visibility">
                        {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="reg-pass-conf">Confirm Password</label>
                    <div className="input-with-icon"><Lock size={16} /><input id="reg-pass-conf" type="password" value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} placeholder="Repeat password" required /></div>
                  </div>
                  <button type="submit" className="save-profile-btn" disabled={formLoading}>{formLoading ? "Creating Account…" : "Create Account"}</button>
                </form>
                <div className="auth-card-footer">
                  <span>Already have an account?</span>
                  <button onClick={() => setAuthScreen("login")} className="auth-toggle-link">Log In</button>
                </div>
              </motion.div>
            )}

            {authScreen === "forgot" && (
              <motion.div key="forgot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
                <div className="auth-card-header">
                  <h2>Forgot Password</h2>
                  <p>Provide your email to receive recovery instructions.</p>
                </div>
                <form onSubmit={handleForgotSubmit} className="auth-card-form">
                  {forgotError && <div className="auth-error-alert" role="alert">{forgotError}</div>}
                  {forgotMessage && <div className="auth-success-alert" role="status">{forgotMessage}</div>}
                  <div className="form-input-box full-width">
                    <label htmlFor="forgot-email">Email Address</label>
                    <div className="input-with-icon"><Mail size={16} /><input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="email@example.com" required /></div>
                  </div>
                  {forgotDevLink && (
                    <div className="dev-helper-alert">
                      <Info size={15} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Developer Mode</strong>
                        <p style={{ margin: "4px 0 0" }}>Test reset link:</p>
                        <a href={forgotDevLink} style={{ color: "#171412", fontWeight: 700, textDecoration: "underline", wordBreak: "break-all" }}>{forgotDevLink}</a>
                      </div>
                    </div>
                  )}
                  <button type="submit" className="save-profile-btn" disabled={formLoading}>{formLoading ? "Sending…" : "Send Reset Link"}</button>
                </form>
                <div className="auth-card-footer">
                  <button onClick={() => setAuthScreen("login")} className="auth-toggle-link">← Back to Log In</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const totalOrders = orders.length;
  const savedAddresses = (user?.addresses ?? []).length;
  const savedWishlist = wishlist.length;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "VESTIGIA Member";

  // ── Tabs config ────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "orders",    label: "Orders",    icon: <ShoppingBag size={17} strokeWidth={1.5} /> },
    { key: "wishlist",  label: "Wishlist",  icon: <Heart      size={17} strokeWidth={1.5} /> },
    { key: "addresses", label: "Addresses", icon: <MapPin     size={17} strokeWidth={1.5} /> },
    { key: "profile",   label: "Profile",   icon: <User       size={17} strokeWidth={1.5} /> },
  ];

  // ── Authenticated Dashboard ────────────────────────────────────────────────
  return (
    <motion.div className="account-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>

      {/* ── Account Header ── */}
      <div className="account-header-v2">
        <div className="account-header-identity">
          <MonogramAvatar name={fullName} />
          <div className="account-header-text">
            <span className="account-greeting">{getGreeting()}</span>
            <h1 className="account-name">{fullName}</h1>
            <span className="account-member-label">Vestigia Member</span>
          </div>
        </div>
        <div className="account-stats-strip">
          <div className="account-stat">
            <span className="account-stat-value">{totalOrders}</span>
            <span className="account-stat-label">{totalOrders === 1 ? "Order" : "Orders"}</span>
          </div>
          <div className="account-stat-divider" />
          <div className="account-stat">
            <span className="account-stat-value">{savedWishlist}</span>
            <span className="account-stat-label">Wishlist</span>
          </div>
          <div className="account-stat-divider" />
          <div className="account-stat">
            <span className="account-stat-value">{savedAddresses}</span>
            <span className="account-stat-label">{savedAddresses === 1 ? "Address" : "Addresses"}</span>
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Bar ── */}
      <nav className="account-mobile-tabs" aria-label="Account navigation">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`account-mobile-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
            type="button"
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="account-layout">

        {/* ── Sidebar ── */}
        <nav className="account-sidebar-navigation" aria-label="Account navigation">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "active-tab-btn" : ""}
              onClick={() => handleTabChange(tab.key)}
              type="button"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.key === "wishlist" && savedWishlist > 0 && (
                <span className="sidebar-badge">{savedWishlist}</span>
              )}
            </button>
          ))}
          <button
            onClick={logout}
            type="button"
            className="sidebar-logout-btn"
            aria-label="Sign out of your account"
          >
            <LogOut size={17} strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </nav>

        {/* ── Content pane ── */}
        <main className="account-content-pane">
          <AnimatePresence mode="wait">

            {/* ── Orders Tab ── */}
            {activeTab === "orders" && (
              <motion.section
                key="orders"
                className="account-pane-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="pane-section-header">
                  <h2 className="pane-section-title">Order History</h2>
                  {orders.length > 0 && <span className="pane-section-count">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>}
                </div>

                {ordersLoading ? (
                  <OrderSkeleton />
                ) : orders.length === 0 ? (
                  <div className="account-empty-state">
                    <ShoppingBag size={36} strokeWidth={1} className="empty-state-icon" />
                    <p>You haven't placed any orders yet.</p>
                    <Link to="/shop" className="empty-state-cta">Shop the Collection</Link>
                  </div>
                ) : (
                  <div className="orders-history-list">
                    {orders.map((order) => (
                      <motion.article
                        className="order-history-card"
                        key={order.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(23,20,18,0.07)" }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Card Header */}
                        <div className="order-card-header">
                          <div className="order-card-header-left">
                            <h3 className="order-card-id">Order {order.id}</h3>
                            <span className="order-date-span">{order.date}</span>
                          </div>
                          <span className={`order-status-badge status-${(order.status || "pending").toLowerCase().replace(/ /g, "-")}`}>
                            {formatStatus(order.status || "pending")}
                          </span>
                        </div>

                        {/* Items */}
                        <div className="order-card-items">
                          {(order.items ?? []).map((item: any, idx: number) => (
                            <div key={idx} className="order-card-item-row">
                              <div className="order-card-item-info">
                                <div className="order-item-thumb-wrap">
                                  {resolveOrderItemImage(item, adminProducts) ? (
                                    <img
                                      src={resolveOrderItemImage(item, adminProducts)}
                                      alt={item.productName || "Product"}
                                      className="order-item-thumbnail"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="order-item-thumb-placeholder">
                                      <Package size={18} strokeWidth={1} />
                                    </div>
                                  )}
                                </div>
                                <div className="order-item-details">
                                  <h4>{item.productName}</h4>
                                  <p className="order-item-meta">
                                    {item.size && <span>Size {item.size}</span>}
                                    {item.size && item.color && <span className="meta-dot">·</span>}
                                    {item.color && (
                                      <>
                                        <span className="variant-color-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                                        <span className="sr-only">{item.color}</span>
                                      </>
                                    )}
                                    {item.quantity > 1 && <><span className="meta-dot">·</span><span>Qty {item.quantity}</span></>}
                                  </p>
                                </div>
                              </div>
                              <span className="order-item-price">{money(item.price)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Card Footer */}
                        <div className="order-card-footer">
                          <div className="order-card-total">
                            <span>Total</span>
                            <strong>{money(order.total)}</strong>
                          </div>
                          <div className="order-card-actions">
                            <button
                              type="button"
                              className="order-action-btn secondary"
                              onClick={() => setSelectedOrderDetail(order)}
                              aria-label={`View details for order ${order.id}`}
                            >
                              View Details
                              <ChevronRight size={14} />
                            </button>
                            {["shipped", "processing", "quality_check", "packed"].includes((order.status || "").toLowerCase()) && (
                              <a
                                href={`https://www.dhl.com/gb-en/home/tracking.html`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="order-action-btn ghost"
                                aria-label={`Track order ${order.id}`}
                              >
                                <Package size={13} />
                                Track
                              </a>
                            )}
                            <button
                              type="button"
                              className={`order-action-btn ghost${reorderSuccess === order.id ? " success" : ""}`}
                              onClick={() => handleReorder(order)}
                              aria-label={`Reorder items from order ${order.id}`}
                            >
                              {reorderSuccess === order.id ? (
                                <><CheckCircle size={13} /> Added!</>
                              ) : (
                                <><RotateCcw size={13} /> Reorder</>
                              )}
                            </button>
                            <button
                              type="button"
                              className="order-action-btn ghost"
                              onClick={() => setSelectedInvoice(order)}
                              aria-label={`View invoice for order ${order.id}`}
                            >
                              <FileText size={13} />
                              Invoice
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* ── Wishlist Tab ── */}
            {activeTab === "wishlist" && (
              <motion.section
                key="wishlist"
                className="account-pane-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="pane-section-header">
                  <h2 className="pane-section-title">My Wishlist</h2>
                  {wishlist.length > 0 && <span className="pane-section-count">{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</span>}
                </div>
                {wishlist.length === 0 ? (
                  <div className="account-empty-state">
                    <Heart size={36} strokeWidth={1} className="empty-state-icon" />
                    <p>Your wishlist is empty. Save items you love while browsing.</p>
                    <Link to="/shop" className="empty-state-cta">Shop the Collection</Link>
                  </div>
                ) : (
                  <div className="wishlist-items-grid">
                    {wishlist.map((item) => (
                      <motion.article
                        className="wishlist-item-card"
                        key={item.id}
                        layout
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.22 }}
                      >
                        <div className="item-media">
                          <img src={item.image} alt={item.alt} loading="lazy" />
                          <button
                            className="wishlist-remove-icon-btn"
                            type="button"
                            onClick={() => toggleWishlist(item)}
                            aria-label={`Remove ${item.name} from wishlist`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="item-info">
                          <h3>{item.name}</h3>
                          <strong>{money(item.price)}</strong>
                          <div className="wishlist-actions-row">
                            <button className="wishlist-move-btn" type="button" onClick={() => handleMoveToCart(item)}>
                              Add to Bag
                            </button>
                            <Link className="wishlist-view-btn" to={`/product/${item.id}`}>View</Link>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* ── Addresses Tab ── */}
            {activeTab === "addresses" && (
              <motion.section
                key="addresses"
                className="account-pane-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="pane-section-header">
                  <h2 className="pane-section-title">Saved Addresses</h2>
                </div>
                <div className="addresses-cards-grid">
                  {(user?.addresses ?? []).length === 0 ? (
                    <div className="account-empty-state" style={{ gridColumn: "span 2" }}>
                      <MapPin size={36} strokeWidth={1} className="empty-state-icon" />
                      <p>No saved addresses yet.</p>
                    </div>
                  ) : (
                    (user?.addresses ?? []).map((addr: Address) => (
                      <article className={`address-card${addr.isDefault ? " default" : ""}`} key={addr.id}>
                        {addr.isDefault && <span className="address-badge">Default</span>}
                        <h3>{addr.name}</h3>
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} {addr.zip}</p>
                        <p>{addr.country}</p>
                        {addr.phone && <p className="phone-line">{addr.phone}</p>}
                        <div className="address-actions-row">
                          <button type="button" onClick={() => setDefaultAddress(addr.id)} disabled={addr.isDefault}>
                            {addr.isDefault ? "Default" : "Set Default"}
                          </button>
                          <button type="button" onClick={() => removeAddress(addr.id)} className="address-remove-btn">
                            Remove
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <AddAddressButton addAddress={addAddress} />
              </motion.section>
            )}

            {/* ── Profile Tab ── */}
            {activeTab === "profile" && (
              <motion.section
                key="profile"
                className="account-pane-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="pane-section-header">
                  <h2 className="pane-section-title">Personal Information</h2>
                </div>
                <form className="profile-form-grid" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-input-box">
                    <label htmlFor="prof-fname">First Name</label>
                    <input id="prof-fname" type="text" defaultValue={user?.firstName || ""} />
                  </div>
                  <div className="form-input-box">
                    <label htmlFor="prof-lname">Last Name</label>
                    <input id="prof-lname" type="text" defaultValue={user?.lastName || ""} />
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="prof-email">Email Address <span className="field-locked-note">— cannot be changed</span></label>
                    <input id="prof-email" type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="form-input-box full-width">
                    <label htmlFor="prof-phone">Phone Number</label>
                    <input id="prof-phone" type="tel" defaultValue={user?.phone || ""} />
                  </div>
                  <button
                    className="save-profile-btn"
                    type="button"
                    onClick={() => {
                      const updated = {
                        firstName: (document.getElementById("prof-fname") as HTMLInputElement).value || "",
                        lastName: (document.getElementById("prof-lname") as HTMLInputElement).value || "",
                        phone: (document.getElementById("prof-phone") as HTMLInputElement).value || "",
                      } as any;
                      updateUser({ ...(user || {}), ...updated });
                    }}
                  >
                    Save Changes
                  </button>
                </form>

                <div className="profile-section-divider" />

                <div className="pane-section-header">
                  <h2 className="pane-section-title">Security</h2>
                </div>
                <form onSubmit={handleChangePasswordSubmit} className="profile-form-grid" style={{ maxWidth: "560px" }}>
                  {changePwdError && <div className="auth-error-alert" style={{ gridColumn: "span 2" }} role="alert">{changePwdError}</div>}
                  {changePwdMessage && <div className="auth-success-alert" style={{ gridColumn: "span 2" }} role="status">{changePwdMessage}</div>}
                  <div className="form-input-box full-width">
                    <label htmlFor="prof-pwd-old">Current Password</label>
                    <input id="prof-pwd-old" type="password" value={changeOldPassword} onChange={(e) => setChangeOldPassword(e.target.value)} placeholder="Enter current password" required />
                  </div>
                  <div className="form-input-box">
                    <label htmlFor="prof-pwd-new">New Password</label>
                    <input id="prof-pwd-new" type="password" value={changeNewPassword} onChange={(e) => setChangeNewPassword(e.target.value)} placeholder="Minimum 6 characters" required />
                  </div>
                  <div className="form-input-box">
                    <label htmlFor="prof-pwd-conf">Confirm Password</label>
                    <input id="prof-pwd-conf" type="password" value={changeConfirmPassword} onChange={(e) => setChangeConfirmPassword(e.target.value)} placeholder="Repeat new password" required />
                  </div>
                  <button type="submit" className="save-profile-btn" disabled={formLoading}>
                    {formLoading ? "Updating…" : "Update Password"}
                  </button>
                </form>
              </motion.section>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Render Order Details Modal */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <OrderDetailsModal
            order={selectedOrderDetail}
            onClose={() => setSelectedOrderDetail(null)}
            onReorder={handleReorder}
            onInvoice={(ord) => {
              setSelectedOrderDetail(null);
              setSelectedInvoice(ord);
            }}
            money={money}
            adminProducts={adminProducts}
          />
        )}
      </AnimatePresence>

      {/* Render Order Invoice Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <OrderInvoiceModal
            order={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            money={money}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Add Address Modal ──────────────────────────────────────────────────────── */
interface AddAddressButtonProps {
  addAddress: (address: any) => void;
}

function AddAddressButton({ addAddress }: AddAddressButtonProps) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    addAddress({
      name: formData.get("name"),
      line1: formData.get("line1"),
      line2: formData.get("line2"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
      country: formData.get("country"),
      phone: formData.get("phone"),
      isDefault: formData.get("isDefault") === "on",
    });
    form.reset();
    setShowForm(false);
  };

  return (
    <>
      <button className="add-new-address-btn" type="button" onClick={() => setShowForm(!showForm)} style={{ marginTop: "20px" }}>
        <Plus size={16} />
        Add New Address
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="address-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="address-form-modal"
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Add New Address</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-input-box"><label htmlFor="addr-name">Full Name</label><input id="addr-name" name="name" type="text" required /></div>
                <div className="form-input-box full-width"><label htmlFor="addr-line1">Address Line 1</label><input id="addr-line1" name="line1" type="text" required /></div>
                <div className="form-input-box full-width"><label htmlFor="addr-line2">Address Line 2 <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span></label><input id="addr-line2" name="line2" type="text" /></div>
                <div className="form-input-box"><label htmlFor="addr-city">City</label><input id="addr-city" name="city" type="text" required /></div>
                <div className="form-input-box"><label htmlFor="addr-state">State / Region</label><input id="addr-state" name="state" type="text" required /></div>
                <div className="form-input-box"><label htmlFor="addr-zip">ZIP Code</label><input id="addr-zip" name="zip" type="text" required /></div>
                <div className="form-input-box full-width">
                  <label htmlFor="addr-country">Country</label>
                  <select id="addr-country" name="country" required>
                    <option value="">Select a country</option>
                    {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                  </select>
                </div>
                <div className="form-input-box full-width"><label htmlFor="addr-phone">Phone <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span></label><input id="addr-phone" name="phone" type="tel" /></div>
                <div className="form-checkbox-box">
                  <input id="addr-default" name="isDefault" type="checkbox" />
                  <label htmlFor="addr-default">Set as default address</label>
                </div>
                <div className="form-actions-row">
                  <button type="submit" className="form-submit-btn">Add Address</button>
                  <button type="button" className="form-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

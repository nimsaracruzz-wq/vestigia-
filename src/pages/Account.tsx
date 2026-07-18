import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { User, ShoppingBag, Heart, MapPin, Trash2, Plus, Eye, EyeOff, Lock, Mail, Info } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useUser, Address } from "../context/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { products, type Product } from "../data";

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

export default function Account() {
  const { formatPrice: money } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const tokenParam = searchParams.get("token"); // reset token

  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "orders");
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");

  // Core states & contexts
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    login,
    registerUser,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser,
    addAddress,
    removeAddress,
    setDefaultAddress,
    logout,
    getOrders
  } = useUser();

  // Orders fetching state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");

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

  // Sync tab status with URL params
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Set document title
  useEffect(() => {
    document.title = isAuthenticated ? "My Account | Vestigia" : "Sign In | Vestigia";
  }, [isAuthenticated]);

  // Fetch real order history from database when authenticated
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
    const matched = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    return matched?.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=80&q=80";
  };

  const handleMoveToCart = (product: Product) => {
    const size = product.sizes[0] || "OS";
    const color = product.colors[0] || "";
    addToCart(product, size, color);
    toggleWishlist(product);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setFormLoading(true);
    const result = await login(loginEmail, loginPassword);
    setFormLoading(false);
    if (!result.success) {
      setLoginError(result.error || "Login failed.");
    } else {
      setLoginEmail("");
      setLoginPassword("");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (!registerName || !registerEmail || !registerPassword) {
      setRegisterError("Full name, email, and password are required.");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }
    setFormLoading(true);
    const result = await registerUser(registerName, registerEmail, registerPassword, registerPhone);
    setFormLoading(false);
    if (!result.success) {
      setRegisterError(result.error || "Registration failed.");
    } else {
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotDevLink("");
    if (!forgotEmail) {
      setForgotError("Email address is required.");
      return;
    }
    setFormLoading(true);
    const result = await forgotPassword(forgotEmail);
    setFormLoading(false);
    if (!result.success) {
      setForgotError(result.error || "An error occurred.");
    } else {
      setForgotMessage("Instructions logged to server terminal.");
      if (result.devLink) {
        setForgotDevLink(result.devLink);
      }
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    if (!tokenParam) {
      setResetError("Reset token is missing from the URL.");
      return;
    }
    if (!resetNewPassword) {
      setResetError("Please enter a new password.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setFormLoading(true);
    const result = await resetPassword(tokenParam, resetNewPassword);
    setFormLoading(false);
    if (!result.success) {
      setResetError(result.error || "Password reset failed.");
    } else {
      setResetMessage("Your password has been reset successfully. Redirecting you to Login...");
      setTimeout(() => {
        searchParams.delete("token");
        setSearchParams(searchParams);
        setAuthScreen("login");
        setResetNewPassword("");
        setResetConfirmPassword("");
        setResetMessage("");
      }, 3000);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwdError("");
    setChangePwdMessage("");
    if (!changeOldPassword || !changeNewPassword) {
      setChangePwdError("Current password and new password are required.");
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      setChangePwdError("Passwords do not match.");
      return;
    }
    setFormLoading(true);
    const result = await changePassword(changeOldPassword, changeNewPassword);
    setFormLoading(false);
    if (!result.success) {
      setChangePwdError(result.error || "Failed to update password.");
    } else {
      setChangePwdMessage("Password updated successfully.");
      setChangeOldPassword("");
      setChangeNewPassword("");
      setChangeConfirmPassword("");
    }
  };

  // Loading animation state for context mounting checks
  if (authLoading) {
    return (
      <div className="account-loading-spinner" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner-border" style={{ border: "2px solid #ddd5cc", borderTop: "2px solid #171412", width: "40px", height: "40px", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Render RESET PASSWORD view
  if (tokenParam && !isAuthenticated) {
    return (
      <motion.div className="account-page-container auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="auth-card-container">
          <div className="auth-card-header">
            <h2>Reset Password</h2>
            <p>Enter your new password below.</p>
          </div>

          <form onSubmit={handleResetSubmit} className="auth-card-form">
            {resetError && <div className="auth-error-alert">{resetError}</div>}
            {resetMessage && <div className="auth-success-alert">{resetMessage}</div>}

            <div className="form-input-box full-width">
              <label htmlFor="rst-pwd">New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="rst-pwd"
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </div>

            <div className="form-input-box full-width">
              <label htmlFor="rst-pwd-conf">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="rst-pwd-conf"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="save-profile-btn" disabled={formLoading}>
              {formLoading ? "Saving Changes..." : "Reset Password"}
            </button>
          </form>

          <div className="auth-card-footer">
            <button onClick={() => {
              searchParams.delete("token");
              setSearchParams(searchParams);
              setAuthScreen("login");
            }} className="auth-toggle-link">
              Back to Login
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Render AUTHENTICATION view (Login / Register / Forgot Password)
  if (!isAuthenticated) {
    return (
      <motion.div className="account-page-container auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="auth-card-container">
          <AnimatePresence mode="wait">
            {authScreen === "login" && (
              <motion.div key="login" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                <div className="auth-card-header">
                  <h2>Welcome to VESTIGIA</h2>
                  <p>Access your orders and account settings.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="auth-card-form">
                  {loginError && <div className="auth-error-alert">{loginError}</div>}

                  <div className="form-input-box full-width">
                    <label htmlFor="login-email">Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <div className="label-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label htmlFor="login-pass">Password</label>
                      <button type="button" onClick={() => setAuthScreen("forgot")} className="forgot-password-link">Forgot?</button>
                    </div>
                    <div className="input-with-icon">
                      <Lock size={16} />
                      <input
                        id="login-pass"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="password-toggle-btn"
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="save-profile-btn" disabled={formLoading}>
                    {formLoading ? "Accessing..." : "Log In"}
                  </button>
                </form>

                <div className="auth-card-footer">
                  <span>Don't have an account?</span>
                  <button onClick={() => setAuthScreen("register")} className="auth-toggle-link">Create one</button>
                </div>
              </motion.div>
            )}

            {authScreen === "register" && (
              <motion.div key="register" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                <div className="auth-card-header">
                  <h2>Create Account</h2>
                  <p>Register to unlock premium member benefits.</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="auth-card-form">
                  {registerError && <div className="auth-error-alert">{registerError}</div>}

                  <div className="form-input-box full-width">
                    <label htmlFor="reg-name">Full Name</label>
                    <div className="input-with-icon">
                      <User size={16} />
                      <input
                        id="reg-name"
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="reg-email">Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input
                        id="reg-email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="reg-phone">Phone Number (Optional)</label>
                    <div className="input-with-icon">
                      <Plus size={16} />
                      <input
                        id="reg-phone"
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="+39 123 456 7890"
                      />
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="reg-pass">Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} />
                      <input
                        id="reg-pass"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Create strong password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="password-toggle-btn"
                        aria-label="Toggle password visibility"
                      >
                        {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-input-box full-width">
                    <label htmlFor="reg-pass-conf">Confirm Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} />
                      <input
                        id="reg-pass-conf"
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="save-profile-btn" disabled={formLoading}>
                    {formLoading ? "Creating Account..." : "Create Account"}
                  </button>
                </form>

                <div className="auth-card-footer">
                  <span>Already have an account?</span>
                  <button onClick={() => setAuthScreen("login")} className="auth-toggle-link">Log In</button>
                </div>
              </motion.div>
            )}

            {authScreen === "forgot" && (
              <motion.div key="forgot" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                <div className="auth-card-header">
                  <h2>Forgot Password</h2>
                  <p>Provide your email to receive recovery instructions.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="auth-card-form">
                  {forgotError && <div className="auth-error-alert">{forgotError}</div>}
                  {forgotMessage && <div className="auth-success-alert">{forgotMessage}</div>}

                  <div className="form-input-box full-width">
                    <label htmlFor="forgot-email">Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>

                  {forgotDevLink && (
                    <div className="dev-helper-alert" style={{ background: "#fdf8e2", border: "1px solid #f9e29a", color: "#8a6d3b", padding: "12px", borderRadius: "6px", fontSize: "0.85rem", margin: "10px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <strong>Developer Mode Helper</strong>
                        <p style={{ margin: "4px 0 0" }}>Click link below to test the reset password form directly:</p>
                        <a href={forgotDevLink} style={{ color: "#171412", fontWeight: 700, textDecoration: "underline", wordBreak: "break-all" }}>{forgotDevLink}</a>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="save-profile-btn" disabled={formLoading}>
                    {formLoading ? "Sending Recovery..." : "Send Reset Link"}
                  </button>
                </form>

                <div className="auth-card-footer">
                  <button onClick={() => setAuthScreen("login")} className="auth-toggle-link">Back to Log In</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Render DASHBOARD view (Authenticated)
  return (
    <motion.div
      className="account-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="account-header">
        <p>Welcome back</p>
        <h1>{user ? `${user.firstName} ${user.lastName}` : "VESTIGIA Customer"}</h1>
      </div>

      <div className="account-layout">
        {/* Navigation Sidebar Tabs */}
        <nav className="account-sidebar-navigation" aria-label="Account navigation">
          <button
            className={activeTab === "orders" ? "active-tab-btn" : ""}
            onClick={() => handleTabChange("orders")}
            type="button"
          >
            <ShoppingBag size={18} />
            <span>Order History</span>
          </button>
          <button
            className={activeTab === "wishlist" ? "active-tab-btn" : ""}
            onClick={() => handleTabChange("wishlist")}
            type="button"
          >
            <Heart size={18} />
            <span>My Wishlist ({wishlist.length})</span>
          </button>
          <button
            className={activeTab === "addresses" ? "active-tab-btn" : ""}
            onClick={() => handleTabChange("addresses")}
            type="button"
          >
            <MapPin size={18} />
            <span>Saved Addresses</span>
          </button>
          <button
            className={activeTab === "profile" ? "active-tab-btn" : ""}
            onClick={() => handleTabChange("profile")}
            type="button"
          >
            <User size={18} />
            <span>Profile Settings</span>
          </button>
          <button
            onClick={logout}
            type="button"
            className="sidebar-logout-btn"
            style={{ borderTop: "1px solid #ddd5cc", marginTop: "24px", paddingTop: "16px", color: "#c62828" }}
          >
            <EyeOff size={18} />
            <span>Log Out</span>
          </button>
        </nav>

        {/* Content pane */}
        <main className="account-content-pane">
          {activeTab === "orders" && (
            <section className="account-pane-section">
              <h2>Order history</h2>
              {ordersLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div className="spinner-border" style={{ border: "2px solid #ddd5cc", borderTop: "2px solid #171412", width: "30px", height: "30px", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                </div>
              ) : orders.length === 0 ? (
                <p className="no-records-text">You haven't placed any orders yet.</p>
              ) : (
                <div className="orders-history-list">
                  {orders.map((order) => (
                    <article className="order-history-card" key={order.id}>
                      <div className="order-card-header">
                        <div>
                          <h3>{order.id}</h3>
                          <span className="order-date-span">Placed on {order.date}</span>
                        </div>
                        <div className="order-badge-and-price">
                          <span className={`order-status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                          <strong>{money(order.total)}</strong>
                        </div>
                      </div>
                      <div className="order-card-items">
                        {(order.items ?? []).map((item: any, idx: number) => (
                          <div key={idx} className="order-card-item-row">
                            <div className="order-card-item-info">
                              <img src={getProductImageByName(item.productName)} alt={item.productName} className="order-item-thumbnail" />
                              <div>
                                <h4>{item.productName}</h4>
                                <p>Size: {item.size} | Color: <span className="variant-color-dot" style={{ backgroundColor: item.color }} /></p>
                              </div>
                            </div>
                            <span className="order-item-price">{money(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "wishlist" && (
            <section className="account-pane-section">
              <h2>My wishlist ({wishlist.length})</h2>
              {wishlist.length === 0 ? (
                <div className="empty-wishlist-panel">
                  <p className="no-records-text">Your wishlist is empty. Save items you like while browsing.</p>
                  <Link to="/shop" className="primary-link dark">
                    Shop Collection
                  </Link>
                </div>
              ) : (
                <div className="wishlist-items-grid">
                  {wishlist.map((item) => (
                    <article className="wishlist-item-card" key={item.id}>
                      <div className="item-media">
                        <img src={item.image} alt={item.alt} />
                        <button
                          className="wishlist-remove-icon-btn"
                          type="button"
                          onClick={() => toggleWishlist(item)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="item-info">
                        <h3>{item.name}</h3>
                        <strong>{money(item.price)}</strong>
                        <div className="wishlist-actions-row">
                          <button
                            className="wishlist-move-btn"
                            type="button"
                            onClick={() => handleMoveToCart(item)}
                          >
                            Add to Bag
                          </button>
                          <Link className="wishlist-view-btn" to={`/product/${item.id}`}>
                            View Details
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "addresses" && (
            <section className="account-pane-section">
              <h2>Saved addresses</h2>
              <div className="addresses-cards-grid">
                {(user?.addresses ?? []).length === 0 ? (
                  <p className="no-records-text">You have no saved addresses.</p>
                ) : (
                  (user?.addresses ?? []).map((addr: Address) => (
                    <article className={`address-card ${addr.isDefault ? "default" : ""}`} key={addr.id}>
                      {addr.isDefault && <span className="address-badge">Default</span>}
                      <h3>{addr.name}</h3>
                      <p>{addr.line1}</p>
                      {addr.line2 && <p>{addr.line2}</p>}
                      <p>{addr.city}, {addr.state} {addr.zip}</p>
                      <p>{addr.country}</p>
                      {addr.phone && <p className="phone-line">Phone: {addr.phone}</p>}
                      <div className="address-actions-row">
                        <button type="button" onClick={() => setDefaultAddress(addr.id)}>{addr.isDefault ? "Default" : "Set Default"}</button>
                        <button type="button" onClick={() => removeAddress(addr.id)}>Remove</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <AddAddressButton addAddress={addAddress} />
            </section>
          )}

          {activeTab === "profile" && (
            <section className="account-pane-section">
              <h2>Profile settings</h2>
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
                  <label htmlFor="prof-email">Email Address</label>
                  <input id="prof-email" type="email" value={user?.email || ""} disabled style={{ background: "#fbfaf8", color: "#8c8276", cursor: "not-allowed" }} />
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

              <hr style={{ border: "0", borderTop: "1px solid #ddd5cc", margin: "40px 0" }} />

              <h2>Change Password</h2>
              <form onSubmit={handleChangePasswordSubmit} className="profile-form-grid" style={{ maxWidth: "600px" }}>
                {changePwdError && <div className="auth-error-alert" style={{ gridColumn: "span 2" }}>{changePwdError}</div>}
                {changePwdMessage && <div className="auth-success-alert" style={{ gridColumn: "span 2" }}>{changePwdMessage}</div>}

                <div className="form-input-box full-width">
                  <label htmlFor="prof-pwd-old">Current Password</label>
                  <input
                    id="prof-pwd-old"
                    type="password"
                    value={changeOldPassword}
                    onChange={(e) => setChangeOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-input-box">
                  <label htmlFor="prof-pwd-new">New Password</label>
                  <input
                    id="prof-pwd-new"
                    type="password"
                    value={changeNewPassword}
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                <div className="form-input-box">
                  <label htmlFor="prof-pwd-conf">Confirm New Password</label>
                  <input
                    id="prof-pwd-conf"
                    type="password"
                    value={changeConfirmPassword}
                    onChange={(e) => setChangeConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button type="submit" className="save-profile-btn" disabled={formLoading}>
                  {formLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </section>
          )}
        </main>
      </div>
    </motion.div>
  );
}

/* Add Address Modal Button Component */
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
      isDefault: (formData.get("isDefault") === "on"),
    });

    form.reset();
    setShowForm(false);
  };

  return (
    <>
      <button
        className="add-new-address-btn"
        type="button"
        onClick={() => setShowForm(!showForm)}
        style={{ marginTop: "20px" }}
      >
        <Plus size={18} />
        Add New Address
      </button>

      {showForm && (
        <motion.div
          className="address-form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowForm(false)}
        >
          <motion.div
            className="address-form-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add New Address</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-input-box">
                <label htmlFor="addr-name">Full Name</label>
                <input id="addr-name" name="name" type="text" required />
              </div>
              <div className="form-input-box full-width">
                <label htmlFor="addr-line1">Address Line 1</label>
                <input id="addr-line1" name="line1" type="text" required />
              </div>
              <div className="form-input-box full-width">
                <label htmlFor="addr-line2">Address Line 2 (Optional)</label>
                <input id="addr-line2" name="line2" type="text" />
              </div>
              <div className="form-input-box">
                <label htmlFor="addr-city">City</label>
                <input id="addr-city" name="city" type="text" required />
              </div>
              <div className="form-input-box">
                <label htmlFor="addr-state">State</label>
                <input id="addr-state" name="state" type="text" required />
              </div>
              <div className="form-input-box">
                <label htmlFor="addr-zip">ZIP Code</label>
                <input id="addr-zip" name="zip" type="text" required />
              </div>
              <div className="form-input-box full-width">
                <label htmlFor="addr-country">Country</label>
                <select id="addr-country" name="country" required>
                  <option value="">Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-input-box full-width">
                <label htmlFor="addr-phone">Phone (Optional)</label>
                <input id="addr-phone" name="phone" type="tel" />
              </div>
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
    </>
  );
}

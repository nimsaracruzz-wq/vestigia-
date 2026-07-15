import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { User, ShoppingBag, Heart, MapPin, Trash2, Plus } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useUser, Address } from "../context/UserContext";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { products, type Product } from "../data";

type Tab = "orders" | "wishlist" | "addresses" | "profile";

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

export default function Account() {
  const { formatPrice: money } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "orders");

  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { user, updateUser, addAddress, removeAddress, setDefaultAddress } = useUser();

  // Sync tab status with URL params
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Set document title
  useEffect(() => {
    document.title = "My Account | Vestigia";
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    searchParams.set("tab", tab);
    setSearchParams(searchParams);
  };



  const mockOrders = [
    {
      id: "VST-2026-001",
      date: "June 28, 2026",
      status: "Delivered",
      total: 78,
      items: [
        { name: "VESTIGIA SIGNATURE TEE", price: 78, size: "M", color: "#f3eedf" },
      ],
    },
    {
      id: "VST-2026-002",
      date: "July 01, 2026",
      status: "Shipped",
      total: 153,
      items: [
        { name: "VESTIGIA ORIGIN TEE", price: 85, size: "M", color: "#1c1a1a" },
        { name: "VESTIGIA ESSENTIAL TEE", price: 68, size: "S", color: "#8b8882" },
      ],
    },
  ];

  const getProductImageByName = (name: string) => {
    const matched = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    return matched?.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=80&q=80";
  };

  const handleMoveToCart = (product: Product) => {
    // If it has sizes, prompt to go to PDP, or just use the first available size by default
    const size = product.sizes[0] || "OS";
    const color = product.colors[0] || "";
    addToCart(product, size, color);
    toggleWishlist(product); // Remove from wishlist
  };

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
        </nav>

        {/* Content pane */}
        <main className="account-content-pane">
          {activeTab === "orders" && (
            <section className="account-pane-section">
              <h2>Order history</h2>
              {mockOrders.length === 0 ? (
                <p className="no-records-text">You haven't placed any orders yet.</p>
              ) : (
                <div className="orders-history-list">
                  {mockOrders.map((order) => (
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
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-card-item-row">
                            <div className="order-card-item-info">
                              <img src={getProductImageByName(item.name)} alt={item.name} className="order-item-thumbnail" />
                              <div>
                                <h4>{item.name}</h4>
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
                  <input id="prof-email" type="email" defaultValue={user?.email || ""} />
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
                      email: (document.getElementById("prof-email") as HTMLInputElement).value || "",
                      phone: (document.getElementById("prof-phone") as HTMLInputElement).value || "",
                    } as any;
                    updateUser({ ...(user || {}), ...updated });
                  }}
                >
                  Save Changes
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

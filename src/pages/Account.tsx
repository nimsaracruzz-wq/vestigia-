import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { User, ShoppingBag, Heart, MapPin, Trash2, ArrowRight } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { products, type Product } from "../data";

type Tab = "orders" | "wishlist" | "addresses" | "profile";

export default function Account() {
  const { formatPrice: money } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "orders");

  const { wishlist, toggleWishlist, addToCart } = useCart();

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
      id: "ORD-948274",
      date: "May 12, 2026",
      status: "Delivered",
      total: 218,
      items: [
        { name: "Linen Draped Vest", price: 128, size: "S", color: "#e8ded1" },
        { name: "Sculpted Sandal", price: 92, size: "8", color: "#e7d4bd" },
      ],
    },
    {
      id: "ORD-739281",
      date: "April 28, 2026",
      status: "Delivered",
      total: 148,
      items: [
        { name: "Tapered City Trouser", price: 148, size: "28", color: "#0f1115" },
      ],
    },
  ];

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
        <h1>Alexander Vestigia</h1>
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
                          <span className="order-status-badge">{order.status}</span>
                          <strong>{money(order.total)}</strong>
                        </div>
                      </div>
                      <div className="order-card-items">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-card-item-row">
                            <div>
                              <h4>{item.name}</h4>
                              <p>Size: {item.size} | Color: <span className="variant-color-dot" style={{ backgroundColor: item.color }} /></p>
                            </div>
                            <span>{money(item.price)}</span>
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
                <article className="address-card default">
                  <span className="address-badge">Default Shipping</span>
                  <h3>Alexander Vestigia</h3>
                  <p>1084 Tailoring Way</p>
                  <p>Apartment 4B</p>
                  <p>San Francisco, CA 94103</p>
                  <p>United States</p>
                  <p className="phone-line">Phone: (415) 555-0199</p>
                  <div className="address-actions-row">
                    <button type="button">Edit</button>
                    <button type="button">Remove</button>
                  </div>
                </article>

                <article className="address-card">
                  <span className="address-badge">Default Billing</span>
                  <h3>Alexander Vestigia</h3>
                  <p>1084 Tailoring Way</p>
                  <p>Apartment 4B</p>
                  <p>San Francisco, CA 94103</p>
                  <p>United States</p>
                  <p className="phone-line">Phone: (415) 555-0199</p>
                  <div className="address-actions-row">
                    <button type="button">Edit</button>
                    <button type="button">Remove</button>
                  </div>
                </article>
              </div>
              <button className="add-new-address-btn" type="button">
                Add New Address
              </button>
            </section>
          )}

          {activeTab === "profile" && (
            <section className="account-pane-section">
              <h2>Profile settings</h2>
              <form className="profile-form-grid" onSubmit={(e) => e.preventDefault()}>
                <div className="form-input-box">
                  <label htmlFor="prof-fname">First Name</label>
                  <input id="prof-fname" type="text" defaultValue="Alexander" />
                </div>
                <div className="form-input-box">
                  <label htmlFor="prof-lname">Last Name</label>
                  <input id="prof-lname" type="text" defaultValue="Vestigia" />
                </div>
                <div className="form-input-box full-width">
                  <label htmlFor="prof-email">Email Address</label>
                  <input id="prof-email" type="email" defaultValue="alexander@vestigia.com" />
                </div>
                <div className="form-input-box full-width">
                  <label htmlFor="prof-phone">Phone Number</label>
                  <input id="prof-phone" type="tel" defaultValue="(415) 555-0199" />
                </div>
                <button className="save-profile-btn" type="button">
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

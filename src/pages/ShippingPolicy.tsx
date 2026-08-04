import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Globe, Clock, PackageCheck, ShieldCheck, ArrowLeft, Mail } from "lucide-react";

export default function ShippingPolicy() {
  useEffect(() => {
    document.title = "Shipping & Delivery Policy | VESTIGIA";
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      className="policy-page-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero Header */}
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <span className="policy-eyebrow">Global Logistics & Express Delivery</span>
          <h1 className="policy-title">Shipping & Delivery Policy</h1>
          <p className="policy-subtitle">
            VESTIGIA dispatches garments globally directly from our Sri Lankan crafting studio using express international couriers. 
            Discover our delivery speeds, complimentary shipping thresholds, and customs information.
          </p>
          <div className="policy-meta">
            <span><Clock size={14} /> Last Updated: August 2026</span>
            <span><Globe size={14} /> Worldwide Express Delivery</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="policy-layout">
        {/* Sidebar Index */}
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card">
            <h3>Policy Index</h3>
            <nav className="policy-nav">
              <a href="#shipping-overview">1. Delivery Overview</a>
              <a href="#rates-timeframes">2. Rates & Delivery Timeframes</a>
              <a href="#tracking">3. Order Tracking & Dispatch</a>
              <a href="#customs">4. Customs & Import Duties</a>
              <a href="#address-changes">5. Address Changes & Redirects</a>
              <a href="#contact">6. Shipping Support</a>
            </nav>
          </div>
        </aside>

        {/* Policy Body */}
        <main className="policy-body">
          <section id="shipping-overview" className="policy-section">
            <h2>1. Delivery Overview</h2>
            <p>
              We partner with global premier carriers (DHL Express, FedEx Priority, and UPS International) 
              to ensure your tailored apparel arrives swiftly and securely. Orders are processed Monday through Friday 
              within <strong>24 to 48 hours</strong> of placement.
            </p>

            <div className="policy-highlight-grid">
              <div className="policy-highlight-box">
                <Truck size={24} />
                <h4>Complimentary Delivery</h4>
                <p>Free standard shipping on all global orders exceeding $150 (€140 / ¥22,000).</p>
              </div>
              <div className="policy-highlight-box">
                <Globe size={24} />
                <h4>Over 120 Countries</h4>
                <p>Door-to-door express courier service covering Europe, Americas, Asia, and Oceania.</p>
              </div>
              <div className="policy-highlight-box">
                <PackageCheck size={24} />
                <h4>Signature Required</h4>
                <p>All shipments are insured and require a signature upon delivery for ultimate peace of mind.</p>
              </div>
            </div>
          </section>

          <section id="rates-timeframes" className="policy-section">
            <h2>2. Rates & Estimated Timeframes</h2>
            <p>Delivery times and shipping costs vary depending on the destination region:</p>

            <table className="policy-table" style={{ width: "100%", borderCollapse: "collapse", margin: "20px 0", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#111111", color: "#ffffff", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Destination Region</th>
                  <th style={{ padding: "12px 16px" }}>Shipping Method</th>
                  <th style={{ padding: "12px 16px" }}>Estimated Time</th>
                  <th style={{ padding: "12px 16px" }}>Standard Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>Europe & UK</td>
                  <td style={{ padding: "12px 16px" }}>DHL Express Priority</td>
                  <td style={{ padding: "12px 16px" }}>3 - 5 Business Days</td>
                  <td style={{ padding: "12px 16px" }}>€15 (Free over €140)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>North America (US & CA)</td>
                  <td style={{ padding: "12px 16px" }}>FedEx International Priority</td>
                  <td style={{ padding: "12px 16px" }}>3 - 5 Business Days</td>
                  <td style={{ padding: "12px 16px" }}>$15 (Free over $150)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>Asia & Oceania (JP, AU, SG)</td>
                  <td style={{ padding: "12px 16px" }}>DHL Express Priority</td>
                  <td style={{ padding: "12px 16px" }}>2 - 4 Business Days</td>
                  <td style={{ padding: "12px 16px" }}>$18 (Free over $150)</td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>Rest of the World</td>
                  <td style={{ padding: "12px 16px" }}>UPS Worldwide Saver</td>
                  <td style={{ padding: "12px 16px" }}>5 - 7 Business Days</td>
                  <td style={{ padding: "12px 16px" }}>$25</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="tracking" className="policy-section">
            <h2>3. Order Tracking & Dispatch</h2>
            <p>
              As soon as your package is scanned by our courier partner, you will receive a dispatch confirmation email 
              containing your official tracking link and real-time transit updates. You can also view real-time shipping status 
              directly within your <Link to="/account?tab=orders">VESTIGIA Account Orders</Link> portal.
            </p>
          </section>

          <section id="customs" className="policy-section">
            <h2>4. Customs, Duties & Taxes</h2>
            <p>
              Shipments may be subject to local import tariffs, customs duties, or value-added tax (VAT) depending on your destination country’s regulations. 
              These fees are levied once the shipment reaches your country and are the responsibility of the customer.
            </p>
          </section>

          <section id="address-changes" className="policy-section">
            <h2>5. Address Changes & Redirects</h2>
            <p>
              If you discover an error in your shipping address after placing an order, please contact our concierge immediately 
              at <a href="mailto:support@vestigia.com">support@vestigia.com</a> within <strong>2 hours</strong> of order confirmation. 
              Once an order has been dispatched with the courier, address changes must be requested directly via DHL On Demand Delivery or FedEx Delivery Manager.
            </p>
          </section>

          <section id="contact" className="policy-section policy-contact-card">
            <Mail size={28} />
            <h3>Questions Regarding Delivery?</h3>
            <p>Our logistics specialists are standing by to assist with shipment tracking or delivery adjustments.</p>
            <div className="policy-contact-links">
              <a href="mailto:shipping@vestigia.com" className="primary-link dark">Email Shipping Team</a>
              <Link to="/contact" className="secondary-link">Visit Contact Us Page</Link>
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
}

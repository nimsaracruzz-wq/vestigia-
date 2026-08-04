import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw, Truck, ShieldCheck, ArrowLeft, Mail, Clock } from "lucide-react";

export default function RefundPolicy() {
  useEffect(() => {
    document.title = "Refund & Return Policy | VESTIGIA";
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
      <header className="policy-hero">
        <div className="policy-hero__inner">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <span className="policy-eyebrow">Client Care & Guarantees</span>
          <h1 className="policy-title">Refund & Return Policy</h1>
          <p className="policy-subtitle">
            At VESTIGIA, every garment is crafted with Italian design precision and Sri Lankan craftsmanship. 
            If your piece is not tailored to your absolute satisfaction, we welcome your return.
          </p>
          <div className="policy-meta">
            <span><Clock size={14} /> Last Updated: August 2026</span>
            <span><ShieldCheck size={14} /> 30-Day Satisfaction Guarantee</span>
          </div>
        </div>
      </header>

      <div className="policy-layout">
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card">
            <h3>Policy Index</h3>
            <nav className="policy-nav">
              <a href="#returns-overview">1. Returns Overview</a>
              <a href="#eligibility">2. Return Eligibility</a>
              <a href="#process">3. How to Initiate a Return</a>
              <a href="#refunds">4. Refund Processing</a>
              <a href="#exchanges">5. Size & Color Exchanges</a>
              <a href="#damaged">6. Damaged or Defective Goods</a>
              <a href="#contact">7. Client Support</a>
            </nav>
          </div>
        </aside>

        <main className="policy-body">
          <section id="returns-overview" className="policy-section">
            <h2>1. Returns Overview</h2>
            <p>
              We want you to be completely satisfied with your VESTIGIA purchase. We offer a 
              <strong> 30-day complimentary return period</strong> from the date your order is delivered. 
              Items returned within this timeframe in original, unworn condition are eligible for a full refund.
            </p>
            <div className="policy-highlight-grid">
              <div className="policy-highlight-box">
                <RefreshCw size={24} />
                <h4>30 Days to Return</h4>
                <p>Enjoy 30 calendar days from delivery date to request a return.</p>
              </div>
              <div className="policy-highlight-box">
                <Truck size={24} />
                <h4>Easy Shipping</h4>
                <p>Pre-printed prepaid return labels provided upon request.</p>
              </div>
              <div className="policy-highlight-box">
                <ShieldCheck size={24} />
                <h4>Full Guarantee</h4>
                <p>100% refund credited back to your original payment method.</p>
              </div>
            </div>
          </section>

          <section id="eligibility" className="policy-section">
            <h2>2. Return Eligibility</h2>
            <p>To qualify for a full refund or exchange, all returned items must meet the following criteria:</p>
            <ul className="policy-checklist">
              <li>Must be in original, unworn, unwashed, and unaltered condition.</li>
              <li>Must have all original VESTIGIA security tags, woven labels, and packaging intact.</li>
              <li>Free of fragrance, makeup marks, deodorant stains, or any signs of wear.</li>
              <li>Accompanied by the original order receipt or proof of purchase.</li>
            </ul>
          </section>

          <section id="process" className="policy-section">
            <h2>3. How to Initiate a Return</h2>
            <ol className="policy-steps">
              <li>
                <strong>Contact Client Care:</strong> Email us at <a href="mailto:support@vestigia.com">support@vestigia.com</a> with your order number.
              </li>
              <li>
                <strong>Receive Return Label:</strong> Our team will issue a pre-paid printable shipping label within 24 hours.
              </li>
              <li>
                <strong>Package Your Items:</strong> Securely package the items in their original box or garment pouch.
              </li>
            </ol>
          </section>

          <section id="refunds" className="policy-section">
            <h2>4. Refund Processing</h2>
            <p>
              Upon approval, your refund will be processed within <strong>2 to 3 business days</strong>. 
              Refunds automatically post to your original payment method (Stripe, Visa, Mastercard, Amex, Apple Pay).
            </p>
          </section>

          <section id="exchanges" className="policy-section">
            <h2>5. Size & Color Exchanges</h2>
            <p>
              If you require a different size or color variant, we offer complimentary express exchanges. 
              Contact our Client Care concierge with your requested size.
            </p>
          </section>

          <section id="damaged" className="policy-section">
            <h2>6. Damaged or Defective Goods</h2>
            <p>
              In the rare event that an item arrives damaged or with a manufacturing fault, please notify us within 
              <strong> 48 hours of receipt</strong> at <a href="mailto:quality@vestigia.com">quality@vestigia.com</a>.
            </p>
          </section>

          <section id="contact" className="policy-section policy-contact-card">
            <Mail size={28} />
            <h3>Need Assistance with Your Return?</h3>
            <p>Our Client Care specialists are available Monday through Saturday to assist you.</p>
            <div className="policy-contact-links">
              <a href="mailto:support@vestigia.com" className="primary-link dark">Email Client Care</a>
              <Link to="/contact" className="secondary-link">Contact Us Page</Link>
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
}

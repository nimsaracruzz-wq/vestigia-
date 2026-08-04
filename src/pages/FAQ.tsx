import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ArrowLeft, Mail, ShieldCheck, Truck, RefreshCw } from "lucide-react";

type FAQItem = {
  question: string;
  answer: string;
  category: "Orders & Shipping" | "Returns & Refunds" | "Products & Sizing" | "Account & Payments";
};

const FAQ_DATA: FAQItem[] = [
  {
    category: "Orders & Shipping",
    question: "Where do VESTIGIA garments ship from?",
    answer: "All garments are dispatched directly from our luxury studio in Sri Lanka, where each piece undergoes meticulous hand-inspection prior to express shipment via DHL, FedEx, or UPS."
  },
  {
    category: "Orders & Shipping",
    question: "How long does shipping take?",
    answer: "Standard express delivery takes 3 to 5 business days for Western Europe, North America, and Australia. Orders are processed within 24 to 48 hours."
  },
  {
    category: "Orders & Shipping",
    question: "Is complimentary shipping available?",
    answer: "Yes, we offer complimentary express delivery worldwide on all orders exceeding $150 (€140 / ¥22,000)."
  },
  {
    category: "Returns & Refunds",
    question: "What is your return policy?",
    answer: "We offer a 30-day complimentary return period. Garments must be unworn, unwashed, with all original tags attached. Returns are refunded back to your original payment method."
  },
  {
    category: "Returns & Refunds",
    question: "How do I exchange for a different size?",
    answer: "Contact our Client Concierge at support@vestigia.com with your order number and requested size. We will reserve the size and dispatch it as soon as your return package is scanned in transit."
  },
  {
    category: "Products & Sizing",
    question: "How do VESTIGIA garments fit?",
    answer: "Our fits are designed in Italy with a refined, tailored silhouette. We recommend selecting your true size. Detailed garment measurements are available on each Product Detail page size chart."
  },
  {
    category: "Products & Sizing",
    question: "What materials do you use?",
    answer: "We utilize premium heavy-grade organic cotton (260+ GSM), luxury linen blends, and Italian woven trims crafted for softness, structure, and longevity."
  },
  {
    category: "Account & Payments",
    question: "What payment methods are accepted?",
    answer: "We accept Visa, Mastercard, American Express, Apple Pay, and Stripe secure payments. All transactions are encrypted with 256-bit SSL technology."
  },
  {
    category: "Account & Payments",
    question: "Do I need an account to place an order?",
    answer: "No, you can complete your purchase using Guest Checkout. However, creating a VESTIGIA account allows you to save delivery addresses, track real-time orders, and manage wishlist items easily."
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    document.title = "Frequently Asked Questions (FAQ) | VESTIGIA";
    window.scrollTo(0, 0);
  }, []);

  const categories = ["All", "Orders & Shipping", "Returns & Refunds", "Products & Sizing", "Account & Payments"];

  const filteredFaqs = activeCategory === "All" 
    ? FAQ_DATA 
    : FAQ_DATA.filter((item) => item.category === activeCategory);

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
          <span className="policy-eyebrow">Client Support & Answers</span>
          <h1 className="policy-title">Frequently Asked Questions</h1>
          <p className="policy-subtitle">
            Find immediate answers regarding orders, global express shipping, garment care, sizing, returns, and payment options.
          </p>
        </div>
      </header>

      {/* Main Layout */}
      <div className="policy-layout" style={{ marginTop: "40px" }}>
        {/* Category Tabs Sidebar */}
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card" style={{ top: "100px" }}>
            <h3>Categories</h3>
            <div className="policy-nav">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setOpenIndex(0);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.86rem",
                    fontWeight: activeCategory === cat ? 700 : 500,
                    color: activeCategory === cat ? "#111111" : "#666666",
                    backgroundColor: activeCategory === cat ? "#f4f2ee" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Accordion List */}
        <main className="policy-body">
          <section className="policy-section">
            <h2>{activeCategory === "All" ? "All Questions" : activeCategory}</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e8e6e3",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#ffffff",
                      transition: "border-color 0.2s"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "18px 20px",
                        background: isOpen ? "#faf9f7" : "#ffffff",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#111111"
                      }}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.25s ease",
                          color: "#888"
                        }}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div style={{ padding: "0 20px 20px", fontSize: "0.9rem", color: "#555555", lineHeight: "1.65" }}>
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact Box */}
          <section className="policy-section policy-contact-card" style={{ marginTop: "40px" }}>
            <HelpCircle size={28} />
            <h3>Still Have Questions?</h3>
            <p>Our client care concierges are ready to assist you personally.</p>
            <div className="policy-contact-links">
              <Link to="/contact" className="primary-link dark">Contact Us</Link>
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
}

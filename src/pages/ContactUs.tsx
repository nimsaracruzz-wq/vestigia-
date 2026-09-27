import { PageIntro } from '../animation/PageIntro';
import { SectionReveal as Reveal } from '../animation/SectionReveal';
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { m as motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { SEOHead } from "../components/common/SEOHead";

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Client Concierge — VESTIGIA®",
  "description": "Get in touch with VESTIGIA® Client Concierge for order inquiries, sizing assistance, or bespoke assistance.",
  "url": "https://thevestigia.com/contact/",
  "isPartOf": { "@id": "https://thevestigia.com/#website" },
  "mainEntity": {
    "@type": "ContactPoint",
    "email": "concierge@thevestigia.com",
    "contactType": "customer service",
    "availableLanguage": ["English", "Italian"]
  }
};

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    orderNumber: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div
      className="policy-page-container"
    >
      <SEOHead
        title="Contact Client Concierge | VESTIGIA®"
        description="Get in touch with VESTIGIA® Client Concierge for order inquiries, sizing assistance, or bespoke assistance."
        canonicalUrl="https://thevestigia.com/contact/"
        ogImage="https://thevestigia.com/images/products/vestigia_logo.png"
        ogType="website"
        jsonLd={contactJsonLd}
      />
      {/* Hero Header */}
      <header className="policy-hero">
        <PageIntro as="div" className="policy-hero__inner">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <span className="policy-eyebrow">Client Support & Advisory</span>
          <h1 className="policy-title">Contact Us</h1>
          <p className="policy-subtitle">
            Have a question regarding fit, order status, tailored garment care, or bespoke requests? 
            Our Client Concierge team is here to assist you with dedicated attention.
          </p>
        </PageIntro>
      </header>

      {/* Content Layout */}
      <div className="policy-layout" style={{ marginTop: "40px" }}>
        {/* Contact Info Sidebar */}
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card" style={{ top: "100px" }}>
            <h3>Client Concierge</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <Mail size={18} style={{ color: "#111", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block", fontSize: "0.84rem", color: "#111" }}>Email Concierge</strong>
                  <a href="mailto:support@thevestigia.com" style={{ fontSize: "0.82rem", color: "#666", textDecoration: "underline" }}>
                    support@thevestigia.com
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <Phone size={18} style={{ color: "#111", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block", fontSize: "0.84rem", color: "#111" }}>Direct Advisory Line</strong>
                  <span style={{ fontSize: "0.82rem", color: "#666" }}>+39 329 728 5468 (Italy)</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <Clock size={18} style={{ color: "#111", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block", fontSize: "0.84rem", color: "#111" }}>Support Hours</strong>
                  <span style={{ fontSize: "0.82rem", color: "#666", display: "block" }}>Mon – Fri: 9:00 – 19:00 CET</span>
                  <span style={{ fontSize: "0.82rem", color: "#666", display: "block" }}>Sat: 10:00 – 16:00 CET</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", paddingTop: "12px", borderTop: "1px solid #eee" }}>
                <MapPin size={18} style={{ color: "#111", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block", fontSize: "0.84rem", color: "#111" }}>Head Office</strong>
                  <span style={{ fontSize: "0.82rem", color: "#666", display: "block" }}>Via Giacomo Puccini 8/1</span>
                  <span style={{ fontSize: "0.82rem", color: "#666", display: "block" }}>Camposampiero Padua,Italy</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Contact Form */}
        <main className="policy-body">
          <Reveal as="section" className="policy-section">
            <h2>Send Us a Message</h2>
            <p>Fill in the form below and one of our dedicated client care advisors will respond within 24 hours.</p>

            {submitted ? (
              <div style={{ background: "#f4faf6", border: "1px solid #c8e6c9", borderRadius: "10px", padding: "32px", textAlign: "center", margin: "24px 0" }}>
                <CheckCircle2 size={40} style={{ color: "#27ae60", marginBottom: "12px" }} />
                <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "#1b5e20" }}>Message Received</h3>
                <p style={{ color: "#2e7d32", fontSize: "0.9rem", margin: 0 }}>
                  Thank you for reaching out to VESTIGIA. A client care advisor will review your inquiry and reply shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  style={{ marginTop: "20px", background: "#111", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form-grid">
                <div className="form-input-box" style={{ margin: 0 }}>
                  <label htmlFor="contact-name">Full Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-input-box" style={{ margin: 0 }}>
                  <label htmlFor="contact-email">Email Address *</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-input-box" style={{ margin: 0 }}>
                  <label htmlFor="contact-subject">Topic / Subject</label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ddd5cc", background: "#fff", fontSize: "0.9rem" }}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Status">Order Status & Tracking</option>
                    <option value="Returns & Exchanges">Returns & Exchanges</option>
                    <option value="Sizing & Fit Advice">Sizing & Fit Advice</option>
                    <option value="Bespoke / Custom Order">Bespoke / Wholesale Inquiry</option>
                  </select>
                </div>

                <div className="form-input-box" style={{ margin: 0 }}>
                  <label htmlFor="contact-order">Order Number (Optional)</label>
                  <input
                    id="contact-order"
                    type="text"
                    placeholder="VST-7A3F92C1D8E4B605"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  />
                </div>

                <div className="form-input-box full-width" style={{ gridColumn: "1 / -1", margin: 0 }}>
                  <label htmlFor="contact-message">Your Message *</label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    placeholder="How can our client care concierge assist you today?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ddd5cc", background: "#fff", fontSize: "0.9rem", fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="save-profile-btn"
                    style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 28px" }}
                  >
                    <Send size={16} />
                    {loading ? "Sending Message..." : "Submit Message"}
                  </button>
                </div>
              </form>
            )}
          </Reveal>
        </main>
      </div>
    </div>
  );
}

import { Reveal } from "../animation/Reveal";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, UserCheck, Server, ArrowLeft, Mail, Clock } from "lucide-react";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | VESTIGIA";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="policy-page-container"
    >
      <header className="policy-hero">
        <Reveal className="policy-hero__inner">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <span className="policy-eyebrow">Data Privacy & Security</span>
          <h1 className="policy-title">Privacy Policy</h1>
          <p className="policy-subtitle">
            At VESTIGIA, your privacy and personal data protection are fundamental to our commitment to luxury service. 
            This policy details how we collect, safeguard, and utilize your information.
          </p>
          <div className="policy-meta">
            <span><Clock size={14} /> Last Updated: August 2026</span>
            <span><Shield size={14} /> Encrypted & GDPR Compliant</span>
          </div>
        </Reveal>
      </header>

      <div className="policy-layout">
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card">
            <h3>Policy Index</h3>
            <nav className="policy-nav">
              <a href="#overview">1. Commitment to Privacy</a>
              <a href="#data-collection">2. Data We Collect</a>
              <a href="#data-use">3. How We Use Data</a>
              <a href="#payments">4. Payment & Security</a>
              <a href="#sharing">5. Third-Party Sharing</a>
              <a href="#rights">6. Your Privacy Rights</a>
              <a href="#contact">7. Contact Data Officer</a>
            </nav>
          </div>
        </aside>

        <main className="policy-body">
          <Reveal as="section" id="overview" className="policy-section">
            <h2>1. Commitment to Privacy</h2>
            <p>
              VESTIGIA operates the website <code>vestigia.com</code> and related e-commerce services. 
              We respect your right to privacy and are committed to protecting all personal data in compliance with GDPR and CCPA.
            </p>
          </Reveal>

          <Reveal as="section" id="data-collection" className="policy-section">
            <h2>2. Information We Collect</h2>
            <p>We collect information you provide directly to us when interacting with our boutique:</p>
            <div className="policy-card-grid">
              <div className="policy-card">
                <UserCheck size={20} />
                <h4>Account & Contact Info</h4>
                <p>Full name, email address, phone number, shipping address, and password credentials.</p>
              </div>
              <div className="policy-card">
                <Lock size={20} />
                <h4>Order & Transaction Data</h4>
                <p>Order history, wishlist items, payment verification tokens, and billing addresses.</p>
              </div>
              <div className="policy-card">
                <Server size={20} />
                <h4>Technical & Device Data</h4>
                <p>IP address, browser type, operating system, localized currency preferences, and IP-based country detection.</p>
              </div>
            </div>
          </Reveal>

          <Reveal as="section" id="data-use" className="policy-section">
            <h2>3. How We Use Your Data</h2>
            <p>Your data is used strictly to deliver an exceptional luxury shopping experience:</p>
            <ul className="policy-checklist">
              <li>To process, fulfill, and ship your luxury apparel orders.</li>
              <li>To manage your VESTIGIA client account and saved address book securely.</li>
              <li>To deliver tailored editorial newsletters (when opted in).</li>
              <li>To detect and prevent fraudulent transactions or security incidents.</li>
            </ul>
          </Reveal>

          <Reveal as="section" id="payments" className="policy-section">
            <h2>4. Payment Security</h2>
            <p>
              All payment transactions are processed securely through <strong>Stripe Payment Gateway</strong> 
              using 256-bit SSL encryption and PCI-DSS Level 1 compliance. 
              VESTIGIA servers do not store raw credit card numbers or CVV codes.
            </p>
          </Reveal>

          <Reveal as="section" id="sharing" className="policy-section">
            <h2>5. Third-Party Data Sharing</h2>
            <p>
              We do not sell or rent your personal information. We share data only with 
              trusted service providers essential to fulfilling your orders (DHL, FedEx, Stripe).
            </p>
          </Reveal>

          <Reveal as="section" id="rights" className="policy-section">
            <h2>6. Your Rights & Choices</h2>
            <p>As a VESTIGIA client, you maintain full control over your personal information:</p>
            <ul className="policy-checklist">
              <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> Update or correct your profile details via your account portal.</li>
              <li><strong>Right to Erasure:</strong> Request the deletion of your account and associated personal data.</li>
            </ul>
          </Reveal>

          <Reveal as="section" id="contact" className="policy-section policy-contact-card">
            <Mail size={28} />
            <h3>Privacy Questions or Data Requests</h3>
            <p>If you have questions regarding our Privacy Policy, please contact our Data Protection Officer.</p>
            <div className="policy-contact-links">
              <a href="mailto:privacy@vestigia.com" className="primary-link dark">Contact Data Officer</a>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}

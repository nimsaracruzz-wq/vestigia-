import { PageIntro } from '../animation/PageIntro';
import { SectionReveal as Reveal } from '../animation/SectionReveal';
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { m as motion } from "framer-motion";
import { FileText, Scale, ArrowLeft, Mail, Clock } from "lucide-react";
import { SEOHead } from "../components/common/SEOHead";

const termsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Terms of Service — VESTIGIA®",
  "description": "Review VESTIGIA® terms of service, client purchase conditions, privacy protections, and legal governance.",
  "url": "https://thevestigia.com/terms/",
  "isPartOf": { "@id": "https://thevestigia.com/#website" }
};

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="policy-page-container"
    >
      <SEOHead
        title="Terms of Service | VESTIGIA® Legal Terms"
        description="Review VESTIGIA® terms of service, client purchase conditions, privacy protections, and legal governance."
        canonicalUrl="https://thevestigia.com/terms/"
        ogImage="https://thevestigia.com/images/products/vestigia_logo.png"
        ogType="website"
        jsonLd={termsJsonLd}
      />
      <header className="policy-hero">
        <PageIntro as="div" className="policy-hero__inner">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <span className="policy-eyebrow">Legal Terms & Conditions</span>
          <h1 className="policy-title">Terms of Service</h1>
          <p className="policy-subtitle">
            Welcome to VESTIGIA. By accessing our platform or purchasing our tailored apparel, 
            you agree to be bound by the following terms and conditions governing our services.
          </p>
          <div className="policy-meta">
            <span><Clock size={14} /> Last Updated: August 2026</span>
            <span><Scale size={14} /> International E-Commerce Terms</span>
          </div>
        </PageIntro>
      </header>

      <div className="policy-layout">
        <aside className="policy-sidebar">
          <div className="policy-sidebar__card">
            <h3>Policy Index</h3>
            <nav className="policy-nav">
              <a href="#acceptance">1. Acceptance of Terms</a>
              <a href="#store-terms">2. Online Store Terms</a>
              <a href="#products">3. Products & Pricing</a>
              <a href="#orders">4. Order Verification</a>
              <a href="#shipping">5. Shipping & Customs</a>
              <a href="#intellectual">6. Intellectual Property</a>
              <a href="#contact">7. Contact Information</a>
            </nav>
          </div>
        </aside>

        <main className="policy-body">
          <Reveal as="section" id="acceptance" className="policy-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your use of the website <code>vestigia.com</code> and all online purchases 
              made through VESTIGIA. By placing an order or creating an account, you acknowledge that you have 
              read and agreed to these Terms.
            </p>
          </Reveal>

          <Reveal as="section" id="store-terms" className="policy-section">
            <h2>2. Online Store Terms</h2>
            <p>
              By agreeing to these Terms, you represent that you are at least the age of majority in your country of residence. 
              You may not use our garments or platform for any illegal or unauthorized purpose.
            </p>
          </Reveal>

          <Reveal as="section" id="products" className="policy-section">
            <h2>3. Products & Pricing</h2>
            <p>
              We make every effort to display the colors and fit of our tailored garments as accurately as possible. 
              Prices for our products are subject to change without prior notice and are displayed in your selected currency (EUR, USD, JPY).
            </p>
          </Reveal>

          <Reveal as="section" id="orders" className="policy-section">
            <h2>4. Order Acceptance & Billing Information</h2>
            <p>
              We reserve the right to refuse or cancel any order placed with us. You agree to provide current, complete, 
              and accurate purchase and account information for all orders.
            </p>
          </Reveal>

          <Reveal as="section" id="shipping" className="policy-section">
            <h2>5. Shipping, Taxes & Customs Duty</h2>
            <p>
              We ship internationally from our studio in Sri Lanka using express global logistics networks (DHL / FedEx). 
              International shipments may be subject to local import duties and taxes.
            </p>
          </Reveal>

          <Reveal as="section" id="intellectual" className="policy-section">
            <h2>6. Intellectual Property Rights</h2>
            <p>
              All content on this site—including garment designs, editorial imagery, brand trademarks, logos, and text—is the exclusive 
              intellectual property of VESTIGIA. No portion of this platform may be reproduced without prior written permission.
            </p>
          </Reveal>

          <Reveal as="section" id="contact" className="policy-section policy-contact-card">
            <FileText size={28} />
            <h3>Questions Regarding Terms of Service</h3>
            <p>If you have questions or require legal clarification, please reach out to our legal department.</p>
            <div className="policy-contact-links">
              <a href="mailto:legal@vestigia.com" className="primary-link dark">Contact Legal Department</a>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { SEOHead } from "../components/common/SEOHead";

const storyJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "Our Story — VESTIGIA® | Italy × Sri Lanka",
  "description": "Inspired by Italian design and crafted in Sri Lanka, VESTIGIA creates timeless essentials that combine contemporary style with exceptional craftsmanship.",
  "url": "https://thevestigia.com/about/",
  "isPartOf": { "@id": "https://thevestigia.com/#website" },
  "about": { "@id": "https://thevestigia.com/#organization" },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://thevestigia.com/" },
      { "@type": "ListItem", "position": 2, "name": "Our Story", "item": "https://thevestigia.com/about/" }
    ]
  }
};

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="story-page-shell" style={{ background: "#ffffff", color: "#171412", overflowX: "hidden" }}>
      <SEOHead
        title="Our Story | VESTIGIA® — Italy × Sri Lanka"
        description="Inspired by Italian design and crafted in Sri Lanka, VESTIGIA creates timeless essentials that combine contemporary style with exceptional craftsmanship."
        canonicalUrl="https://thevestigia.com/about/"
        ogImage="https://thevestigia.com/images/products/vestigia_logo.png"
        ogType="website"
        jsonLd={storyJsonLd}
      />

      {/* EDITORIAL HEADER */}
      <header
        className="story-header"
        style={{
          padding: "130px 24px 70px",
          textAlign: "center",
          background: "#faf9f6",
          borderBottom: "1px solid #eee8df",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ maxWidth: "720px", margin: "0 auto" }}
        >
          <div style={{ display: "inline-block", marginBottom: "16px" }}>
            <img
              src="/images/products/vestigia_logo.png"
              alt="VESTIGIA Primary Emblem Logo"
              style={{ width: "56px", height: "56px", objectFit: "contain" }}
            />
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#888888",
              marginBottom: "12px",
            }}
          >
            VESTIGIA® ARCHIVE
          </p>
          <h1
            style={{
              fontFamily: "'Cinzel', 'Georgia', serif",
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#171412",
              margin: 0,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            OUR STORY
          </h1>
        </motion.div>
      </header>

      {/* SECTION 1 — ORIGINS */}
      <section
        className="story-section story-section--origins"
        aria-label="Italy and Sri Lanka Origins"
        style={{
          padding: "120px 24px",
          maxWidth: "1240px",
          margin: "0 auto",
        }}
      >
        <div
          className="story-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "80px",
            alignItems: "center",
          }}
        >
          {/* Text Left */}
          <motion.article
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8 }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#999999",
                display: "block",
                marginBottom: "16px",
              }}
            >
              ITALY × SRI LANKA
            </span>
            <h2
              style={{
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: "clamp(2.2rem, 4vw, 3.2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#171412",
                margin: "0 0 24px 0",
              }}
            >
              Different Origins.
              <br />
              <span style={{ fontWeight: 400, color: "#666666" }}>Shared Vision.</span>
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.05rem",
                lineHeight: 1.8,
                color: "#444444",
                maxWidth: "480px",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Inspired by Italian design and crafted in Sri Lanka, VESTIGIA creates timeless essentials that combine contemporary style with exceptional craftsmanship.
            </p>
          </motion.article>

          {/* Image Right */}
          <motion.figure
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9 }}
            style={{ margin: 0 }}
          >
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "4px",
                background: "#f4f1ea",
                aspectRatio: "3/4",
              }}
            >
              <img
                src="/uploads/1784373355678-vestigia-black-oversized-tshirt-model-main.png"
                alt="Model wearing VESTIGIA Aurelius Oversized Tee in an architectural space"
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
            <figcaption
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#888888",
                marginTop: "12px",
                textAlign: "right",
              }}
            >
              FIG 01. — THE SILHOUETTE
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* SECTION 2 — CRAFTSMANSHIP */}
      <section
        className="story-section story-section--craftsmanship"
        aria-label="Garment Craftsmanship"
        style={{
          padding: "120px 24px",
          background: "#faf9f6",
          borderTop: "1px solid #eee8df",
          borderBottom: "1px solid #eee8df",
        }}
      >
        <div
          className="story-grid"
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "80px",
            alignItems: "center",
          }}
        >
          {/* Image Left */}
          <motion.figure
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9 }}
            style={{ margin: 0 }}
          >
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "4px",
                background: "#e8e4dc",
                aspectRatio: "3/4",
              }}
            >
              <img
                src="/images/products/signature_detail.png"
                alt="Detailed close-up of VESTIGIA 280 GSM heavyweight cotton fabric texture and gold embroidery"
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
            <figcaption
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#888888",
                marginTop: "12px",
              }}
            >
              FIG 02. — FABRIC &amp; DETAIL
            </figcaption>
          </motion.figure>

          {/* Text Right */}
          <motion.article
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8 }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#999999",
                display: "block",
                marginBottom: "16px",
              }}
            >
              CRAFTSMANSHIP
            </span>
            <h2
              style={{
                fontFamily: "'Cinzel', 'Georgia', serif",
                fontSize: "clamp(2.2rem, 4vw, 3.2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#171412",
                margin: "0 0 24px 0",
              }}
            >
              Made With Purpose.
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.05rem",
                lineHeight: 1.8,
                color: "#444444",
                maxWidth: "480px",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Every garment is thoughtfully produced using premium materials, refined construction, and meticulous attention to every detail.
            </p>
          </motion.article>
        </div>
      </section>

      {/* SECTION 3 — OUR PHILOSOPHY */}
      <section
        className="story-section story-section--philosophy"
        aria-label="Our Philosophy"
        style={{
          padding: "140px 24px 160px",
          maxWidth: "1100px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <motion.article
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: "680px", margin: "0 auto 64px auto" }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#999999",
              display: "block",
              marginBottom: "16px",
            }}
          >
            OUR PHILOSOPHY
          </span>
          <h2
            style={{
              fontFamily: "'Cinzel', 'Georgia', serif",
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#171412",
              margin: "0 0 24px 0",
            }}
          >
            Crafted Beyond Time.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1.1rem",
              lineHeight: 1.8,
              color: "#444444",
              margin: "0 auto",
              fontWeight: 400,
            }}
          >
            We don't chase trends. We create elevated essentials designed to be worn, appreciated, and remembered for years to come.
          </p>
        </motion.article>

        {/* Hero Architectural Campaign Image */}
        <motion.figure
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9 }}
          style={{ margin: 0 }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "4px",
              background: "#171412",
              maxHeight: "560px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
            }}
          >
            <img
              src="/images/products/Vestigia_Hero.png"
              alt="VESTIGIA campaign imagery in a minimalist architectural space"
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                maxHeight: "560px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
          <figcaption
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888888",
              marginTop: "16px",
              textAlign: "center",
            }}
          >
            FIG 03. — ENDURING ELEVATION
          </figcaption>
        </motion.figure>
      </section>

      {/* CLOSING BRAND FOOTER EMBLEM BAR */}
      <footer
        style={{
          padding: "60px 24px",
          textAlign: "center",
          borderTop: "1px solid #eee8df",
          background: "#faf9f6",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <img
            src="/images/products/vestigia_logo.png"
            alt="VESTIGIA Emblem"
            style={{ width: "40px", height: "40px", objectFit: "contain" }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Cinzel', 'Georgia', serif",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#171412",
            margin: "0 0 6px 0",
            textTransform: "uppercase",
          }}
        >
          VESTIGIA®
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            color: "#888888",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          DESIGNED IN ITALY &bull; MADE IN SRI LANKA &bull; LEAVE YOUR MARK.
        </p>
      </footer>
    </main>
  );
}

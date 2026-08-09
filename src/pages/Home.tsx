import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { type Product } from "../data";
import { useAdmin } from "../admin/AdminContext";
import ProductCard from "../components/common/ProductCard";

import { SEOHead } from "../components/common/SEOHead";

type HomeProps = {
  onQuickShop: (product: Product) => void;
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://thevestigia.com/#webpage",
      "url": "https://thevestigia.com/",
      "name": "VESTIGIA® — Refined Luxury Apparel & Oversized Streetwear | Italy",
      "description": "VESTIGIA® is an independent contemporary luxury apparel brand designed in Italy and crafted in Sri Lanka. Discover our 280 GSM heavyweight organic cotton oversized T-shirts.",
      "isPartOf": { "@id": "https://thevestigia.com/#website" },
      "about": { "@id": "https://thevestigia.com/#organization" },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://thevestigia.com/" }
        ]
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://thevestigia.com/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where are VESTIGIA garments designed and produced?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "VESTIGIA garments are designed in Italy under architectural design principles and ethically handcrafted by artisan tailors in Sri Lanka using 280 GSM heavyweight organic cotton."
          }
        },
        {
          "@type": "Question",
          "name": "What makes VESTIGIA 280 GSM heavyweight cotton unique?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our 280 GSM (Grams per Square Meter) combed organic jersey provides exceptional structural form, durability, and a relaxed drop-shoulder drape without losing shape over time."
          }
        }
      ]
    }
  ]
};

export default function Home({ onQuickShop }: HomeProps) {
  const { products } = useAdmin();

  // Dynamically find Black and White Aurelius products
  const blackProduct = products.find(
    (p) => p.slug === "vestigia-aurelius-oversized-tee-black" || (p.name.toLowerCase().includes("aurelius") && p.name.toLowerCase().includes("black"))
  ) || products[0];

  const whiteProduct = products.find(
    (p) => p.slug === "vestigia-aurelius-oversized-tee-white" || (p.name.toLowerCase().includes("aurelius") && p.name.toLowerCase().includes("white"))
  ) || products[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="home-page-container"
    >
      <SEOHead
        title="VESTIGIA® | Luxury Clothing & Premium Essentials"
        description="VESTIGIA® is an independent contemporary luxury apparel brand designed in Italy and crafted in Sri Lanka. Discover our 280 GSM heavyweight organic cotton oversized T-shirts."
        canonicalUrl="https://thevestigia.com/"
        ogImage="https://thevestigia.com/images/products/vestigia_logo.png"
        ogType="website"
        jsonLd={homeJsonLd}
      />
      {/* SECTION 01 — HERO */}
      <section className="hero" id="top">
        <img
          src="/images/products/Vestigia_Hero.png"
          alt="Model wearing the VESTIGIA Signature T-Shirt in a minimalist architectural space"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="hero-shade" />

        {/* Hotspot pointing to Black Product */}
        {blackProduct && (
          <button
            className="hotspot hotspot-one"
            type="button"
            onClick={() => onQuickShop(blackProduct)}
            style={{ left: '25%', top: '25%' }}
            aria-label={`Quick shop ${blackProduct.name}`}
          >
            <Plus size={16} />
            <div className="hotspot-tooltip">
              <span className="tooltip-title">{blackProduct.name}</span>
              <span className="tooltip-price">€{blackProduct.price.toFixed(2)}</span>
              <span className="tooltip-cta">Quick Shop +</span>
            </div>
          </button>
        )}

        {/* Second Hotspot pointing to White Product */}
        {whiteProduct && (
          <button
            className="hotspot hotspot-two"
            type="button"
            onClick={() => onQuickShop(whiteProduct)}
            style={{ left: '65%', top: '30%' }}
            aria-label={`Quick shop ${whiteProduct.name}`}
          >
            <Plus size={16} />
            <div className="hotspot-tooltip">
              <span className="tooltip-title">{whiteProduct.name}</span>
              <span className="tooltip-price">€{whiteProduct.price.toFixed(2)}</span>
              <span className="tooltip-cta">Quick Shop +</span>
            </div>
          </button>
        )}

        <div className="hero-copy">
          <p className="hero-eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.8rem', opacity: 0.9 }}>
            The First Release
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', margin: '12px 0 24px', fontWeight: 400 }}>
            LEAVE YOUR MARK.
          </h1>
          <p className="hero-sub" style={{ fontSize: '1rem', maxWidth: '480px', margin: '0 auto 32px', opacity: 0.8, lineHeight: 1.6 }}>
            Contemporary clothing shaped by Italian vision and made in Sri Lanka.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="primary-link" to="/shop">
              Shop the First Release
            </Link>
            <Link className="primary-link outline" to="/story" style={{ border: '1px solid #fff', background: 'transparent' }}>
              Discover Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 02 — BRAND INTRODUCTION */}
      <section className="section brand-intro" style={{ padding: '120px 24px', textAlign: 'center', background: '#f6f3ed' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Primary emblem — prestige placement */}
          <div className="about-hero-emblem-wrap">
            <img
              src="/images/products/vestigia_logo.png"
              alt="VESTIGIA Emblem"
              className="vst-emblem vst-emblem--lg vst-emblem--shadow"
            />
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            The VESTIGIA Philosophy
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#171412', fontWeight: 400, marginBottom: '24px' }}>
            DESIGNED TO REMAIN.
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#444', fontWeight: 300 }}>
            VESTIGIA creates contemporary clothing inspired by the traces people, places, and moments leave behind.
            Designed in Italy and made in Sri Lanka, each piece is shaped with restraint, intention, and a focus on lasting identity.
          </p>
        </div>
      </section>

      {/* SECTION 03 — THE FIRST RELEASE (PRODUCT GRID) */}
      <section className="section products-section" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '58px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>
            The First Release
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, margin: '0 0 12px' }}>
            THREE PIECES. ONE BEGINNING.
          </h2>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>
            The first VESTIGIA release introduces three T-shirts that establish the foundation of our identity.
          </p>
        </div>

        <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickShop={() => onQuickShop(product)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 04 — SIGNATURE PRODUCT STORY */}
      <section className="section signature-story" style={{ padding: '80px 24px', background: '#f6f3ed' }}>
        <div className="lookbook" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="lookbook-copy" style={{ padding: '0 16px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
              The Signature
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              BUILT AROUND IDENTITY.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '32px', fontSize: '0.95rem' }}>
              Heavyweight construction. Relaxed proportions. Understated details. The Signature Tee establishes the foundation of VESTIGIA.
            </p>
            <Link className="primary-link dark" to="/product/vestigia-signature-tee">
              Discover the Signature Tee
            </Link>
          </div>
          <div className="lookbook-image-container" style={{ overflow: 'hidden' }}>
            <img
              src="/images/products/BRAND INTRODUCTION_Vestigia.png"
              alt="VESTIGIA Signature Tee worn by model"
              style={{ width: '80%', objectFit: 'cover', maxHeight: '550px' }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 05 — PHILOSOPHY */}
      <section className="section origin-story-block" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ overflow: 'hidden', order: 2 }}>
            <img
              src="/images/products/Vestigia_Hero.png"
              alt="VESTIGIA luxury editorial fashion campaign featuring modern architectural minimalism"
              loading="lazy"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '500px' }}
            />
          </div>
          <div style={{ padding: '0 16px', order: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
              OUR PHILOSOPHY
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Crafted Beyond Time.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '32px', fontSize: '0.95rem' }}>
              VESTIGIA creates timeless luxury essentials inspired by Italian design philosophy and crafted with uncompromising attention to detail. Every piece is designed to outlast trends and become part of your story.
            </p>
            <Link className="primary-link dark" to="/story">
              Discover Our Story &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 06 — DESIGN LANGUAGE */}
      <section className="lookbook-full-bleed-scene" style={{ position: 'relative', overflow: 'hidden', height: '60vh', minHeight: '400px' }}>
        <img
          src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1600&q=85"
          alt="Italian-inspired modern architectural details and luxury fashion design studio aesthetic"
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', color: '#fff' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            DESIGN LANGUAGE
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inspired by Italian Elegance.
          </h2>
          <p style={{ maxWidth: '580px', fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.6 }}>
            Clean silhouettes, refined proportions, and contemporary Italian aesthetics define every collection, creating elevated essentials that combine modern luxury with timeless style.
          </p>
        </div>
      </section>

      {/* SECTION 07 — CRAFTSMANSHIP */}
      <section className="section craftsmanship-block" style={{ padding: '80px 24px', background: '#f6f3ed' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ padding: '0 16px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
              CRAFTSMANSHIP
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Made With Precision.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '24px', fontSize: '0.95rem' }}>
              Each VESTIGIA garment is carefully produced using premium materials, expert craftsmanship, and meticulous quality control to deliver exceptional comfort, durability, and lasting quality.
            </p>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <img
              src="/images/products/signature_detail.png"
              alt="Close-up of VESTIGIA luxury 280 GSM organic cotton fabric texture, fine stitching, and gold embroidery"
              loading="lazy"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '450px' }}
            />
          </div>
        </div>
      </section>

    </motion.div>
  );
}

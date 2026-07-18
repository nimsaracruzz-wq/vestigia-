import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { type Product } from "../data";
import { useAdmin } from "../admin/AdminContext";
import ProductCard from "../components/common/ProductCard";

type HomeProps = {
  onQuickShop: (product: Product) => void;
};

export default function Home({ onQuickShop }: HomeProps) {
  const { products } = useAdmin();

  // Update document title for SEO
  useEffect(() => {
    document.title = "VESTIGIA — Designed in Italy. Made in Sri Lanka.";
  }, []);

  const featuredProduct = products[0];

  const slideUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="home-page-container"
    >
      {/* SECTION 01 — HERO */}
      <section className="hero" id="top">
        <img
          src="/images/products/Vestigia_Hero.png"
          alt="Model wearing the VESTIGIA Signature T-Shirt in a minimalist architectural space"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="hero-shade" />

        {/* Hotspot pointing to Signature Tee (ID 1) */}
        {featuredProduct && (
          <button
            className="hotspot hotspot-one"
            type="button"
            onClick={() => onQuickShop(featuredProduct)}
            style={{ left: '25%', top: '25%' }}
            aria-label={`Quick shop ${featuredProduct.name}`}
          >
            <Plus size={16} />
            <div className="hotspot-tooltip">
              <span className="tooltip-title">{featuredProduct.name}</span>
              <span className="tooltip-price">€{featuredProduct.price.toFixed(2)}</span>
              <span className="tooltip-cta">Quick Shop +</span>
            </div>
          </button>
        )}

        {/* Second Hotspot pointing to Signature Tee (White T-shirt) */}
        {featuredProduct && (
          <button
            className="hotspot hotspot-two"
            type="button"
            onClick={() => onQuickShop(featuredProduct)}
            style={{ left: '65%', top: '30%' }}
            aria-label={`Quick shop ${featuredProduct.name}`}
          >
            <Plus size={16} />
            <div className="hotspot-tooltip">
              <span className="tooltip-title">{featuredProduct.name}</span>
              <span className="tooltip-price">€{featuredProduct.price.toFixed(2)}</span>
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
            <Link className="primary-link dark" to="/product/1">
              Discover the Signature Tee
            </Link>
          </div>
          <div className="lookbook-image-container" style={{ overflow: 'hidden' }}>
            <img
              src="/images/products/signature_model.png"
              alt="VESTIGIA Signature Tee worn by model"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '550px' }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 05 — ORIGIN STORY */}
      <section className="section origin-story-block" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ overflow: 'hidden', order: 2 }}>
            <img
              src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=85"
              alt="Mediterranean foliage close up with warm sunlight, connecting cultures"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '500px' }}
            />
          </div>
          <div style={{ padding: '0 16px', order: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
              Our Origin
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              TWO PLACES. ONE IDENTITY.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '32px', fontSize: '0.95rem' }}>
              VESTIGIA was born from the connection between Italy and Sri Lanka.
              Guided by contemporary Italian creative direction and brought to life through Sri Lankan garment production,
              we create clothing shaped by different places and a shared vision.
            </p>
            <Link className="primary-link dark" to="/story">
              Discover Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 06 — CAMPAIGN */}
      <section className="lookbook-full-bleed-scene" style={{ position: 'relative', overflow: 'hidden', height: '60vh', minHeight: '400px' }}>
        <img
          src="/images/products/signature_model.png"
          alt="VESTIGIA campaign visual"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center', color: '#fff' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Italy × Sri Lanka
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Different origins. Shared vision.
          </h2>
          <p style={{ maxWidth: '580px', fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.6 }}>
            From creative direction in Italy to production in Sri Lanka, VESTIGIA exists between cultures, perspectives, and places.
          </p>
        </div>
      </section>

      {/* SECTION 07 — CRAFTSMANSHIP / PRODUCTION */}
      <section className="section craftsmanship-block" style={{ padding: '80px 24px', background: '#f6f3ed' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ padding: '0 16px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
              Made in Sri Lanka
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              MADE WITH INTENTION.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '24px', fontSize: '0.95rem' }}>
              Our garments are produced in Sri Lanka, home to a globally established apparel manufacturing industry.
              VESTIGIA focuses on considered construction, quality, and clothing designed to become part of the wearer's own story.
            </p>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <img
              src="/images/products/signature_detail.png"
              alt="Close-up of premium knitwear fabric, seams, and detail print of VESTIGIA garment"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '450px' }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 08 — NEWSLETTER */}
      <section className="section journal-newsletter-strip" style={{ padding: '100px 24px', background: '#fff', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, marginBottom: '12px' }}>
            JOIN THE VESTIGIA COMMUNITY.
          </h2>
          <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '32px' }}>
            Early access to releases, stories, and everything that comes next.
          </p>

          <form style={{ display: 'flex', gap: '8px', maxWidth: '420px', margin: '0 auto' }} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="YOUR EMAIL ADDRESS"
              required
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #111',
                fontSize: '0.85rem',
                outline: 'none',
                background: 'transparent',
                letterSpacing: '0.05em'
              }}
            />
            <button
              type="submit"
              style={{
                background: '#111',
                color: '#fff',
                padding: '12px 24px',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600
              }}
            >
              Join VESTIGIA
            </button>
          </form>
        </div>
      </section>
    </motion.div>
  );
}

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function About() {
  useEffect(() => {
    document.title = "About Us — VESTIGIA";
  }, []);

  return (
    <motion.div
      className="about-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: '#fff', color: '#171412', minHeight: '100vh' }}
    >
      {/* PAGE HERO */}
      <header 
        className="about-hero" 
        style={{ 
          padding: '120px 24px 80px', 
          textAlign: 'center', 
          background: '#f6f3ed',
          borderBottom: '1px solid #eaeaea'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            VESTIGIA
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 400, margin: '0 0 24px', lineHeight: 1.15 }}>
            EVERY TRACE HAS AN ORIGIN.
          </h1>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: '#444', maxWidth: '640px', margin: '0 auto', fontWeight: 300 }}>
            VESTIGIA is an independent contemporary clothing brand based in Italy and made in Sri Lanka.
          </p>
        </div>
      </header>

      {/* SECTION 01 — ITALY */}
      <section 
        className="about-section italy-section" 
        style={{ 
          padding: '100px 24px', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '64px', 
          alignItems: 'center' 
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>
            01 — ITALY
          </span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, margin: '0 0 20px' }}>
            THE VISION.
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
            Italy shapes the creative direction of VESTIGIA — a perspective informed by contemporary fashion, design, architecture, visual culture, and the belief that clothing can carry identity beyond a single moment. 
            We draw inspiration from the raw texture of Mediterranean stone, geometric shadows of urban spaces, and the quiet dignity of Italian minimalism.
          </p>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <img 
            src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=85" 
            alt="Minimalist concrete and stone design in Italy" 
            style={{ width: '100%', objectFit: 'cover', maxHeight: '400px' }}
          />
        </div>
      </section>

      {/* SECTION 02 — SRI LANKA */}
      <section 
        className="about-section srilanka-section" 
        style={{ 
          padding: '100px 24px', 
          background: '#f6f3ed' 
        }}
      >
        <div 
          style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '64px', 
            alignItems: 'center' 
          }}
        >
          <div style={{ overflow: 'hidden', order: 2 }}>
            <img 
              src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=85" 
              alt="Sri Lankan coastal vegetation and natural textures" 
              style={{ width: '100%', objectFit: 'cover', maxHeight: '400px' }}
            />
          </div>
          <div style={{ order: 1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>
              02 — SRI LANKA
            </span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, margin: '0 0 20px' }}>
              WHERE IT IS MADE.
            </h2>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
              VESTIGIA garments are made in Sri Lanka, connecting the brand's creative direction with the country's established apparel production expertise. 
              Sri Lankan garment makers bring years of craftsmanship, technological precision, and deep textile care to every single VESTIGIA T-shirt.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 03 — VESTIGIA */}
      <section 
        className="about-section brand-identity-section" 
        style={{ 
          padding: '100px 24px', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '64px', 
          alignItems: 'center' 
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>
            03 — VESTIGIA
          </span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, margin: '0 0 20px' }}>
            WHAT REMAINS.
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
            VESTIGIA exists between cultures, places, and experiences. 
            We create clothing designed to become part of people's lives — carrying memories, movement, and the traces we leave behind. 
            The shirts are objects of connection, embodying a shared journey between Italian design and Sri Lankan production.
          </p>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <img 
            src="/images/products/signature_detail.png" 
            alt="VESTIGIA print label close-up detail" 
            style={{ width: '100%', objectFit: 'cover', maxHeight: '400px' }}
          />
        </div>
      </section>

      {/* FINAL BRAND STATEMENT */}
      <footer 
        className="about-final-bar" 
        style={{ 
          background: '#11100f', 
          color: '#fff', 
          padding: '120px 24px', 
          textAlign: 'center' 
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 400, margin: '0 0 16px', letterSpacing: '0.05em' }}>
            DESIGNED IN ITALY.
          </h3>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 400, margin: '0 0 32px', letterSpacing: '0.05em' }}>
            MADE IN SRI LANKA.
          </h3>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.25em', fontSize: '0.85rem', color: '#888' }}>
            LEAVE YOUR MARK.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Story() {
  useEffect(() => {
    document.title = "Our Story — VESTIGIA";
  }, []);

  const slideUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6 },
  };

  return (
    <motion.div
      className="story-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: '#fff', color: '#171412', minHeight: '100vh' }}
    >
      {/* PAGE HERO */}
      <header 
        className="story-hero" 
        style={{ 
          padding: '140px 24px 100px', 
          textAlign: 'center', 
          background: '#f6f3ed',
          borderBottom: '1px solid #eaeaea'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem, 6vw, 4.2rem)', fontWeight: 400, margin: '0 0 24px', letterSpacing: '0.02em', lineHeight: 1.1 }}>
            THE TRACES WE LEAVE.
          </h1>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.7, color: '#444', maxWidth: '600px', margin: '0 auto', fontWeight: 300 }}>
            Vestigia means traces — evidence of where we have been, what we have experienced, and what remains.
          </p>
        </div>
      </header>

      {/* STORY MOVEMENT PANEL */}
      <section style={{ padding: '100px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <motion.div {...slideUp} style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            01 / MOVEMENT
          </h2>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, margin: '0 0 16px' }}>
            WE MOVE.
          </h3>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
            Life is in constant motion. We traverse cities, cross oceans, move through rooms, and inhabit fleeting moments. 
            The clothes we wear should not just cover us; they should be designed to move seamlessly through these transitions, carrying themselves with effortless elegance.
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            02 / CONNECTION
          </h2>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, margin: '0 0 16px' }}>
            WE EXPERIENCE.
          </h3>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
            Every texture we touch, every light that warms us, and every landscape we pass creates an impression. 
            VESTIGIA combines the sharp architectural angles of Rome with the coastal, earth-like textures of Sri Lanka. 
            Our garments capture this interplay—bringing structured lines together with natural, breathable comfort.
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            03 / CONTEMPLATION
          </h2>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, margin: '0 0 16px' }}>
            WE REMEMBER.
          </h3>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#444', fontWeight: 300 }}>
            What remains when a moment passes? A memory. A mark. A trace. 
            Our T-shirts are constructed from premium cotton designed to age beautifully, softening with wear and reflecting the personal history of whoever puts them on.
          </p>
        </motion.div>

        <motion.div {...slideUp} style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>
            04 / BRAND VISION
          </h2>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, margin: '0 0 16px' }}>
            WE LEAVE TRACES.
          </h3>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#444', fontWeight: 300, marginBottom: '32px' }}>
            VESTIGIA creates clothing intended to move through those experiences with us. 
            From the heavy structured drop of our **Signature Tee**, to the subtle geographic coordinates of the **Origin Tee**, and the pure simplicity of the **Essential Tee**—each piece is built to help you carry your identity.
          </p>
          <div style={{ padding: '16px 0' }}>
            <Link className="primary-link dark" to="/shop">
              Shop the First Release
            </Link>
          </div>
        </motion.div>
      </section>

      {/* MIDDLE IMAGE SPREAD */}
      <section style={{ overflow: 'hidden', padding: '0 24px', marginBottom: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <img 
            src="/images/products/signature_model.png" 
            alt="Model in VESTIGIA Signature T-Shirt" 
            style={{ width: '100%', objectFit: 'cover', height: '400px' }}
          />
          <img 
            src="/images/products/signature_detail.png" 
            alt="Macro detail of VESTIGIA knit fabric" 
            style={{ width: '100%', objectFit: 'cover', height: '400px' }}
          />
        </div>
      </section>

      {/* FINAL BRAND OUTRO */}
      <footer 
        className="story-footer" 
        style={{ 
          background: '#f6f3ed', 
          padding: '100px 24px', 
          textAlign: 'center', 
          borderTop: '1px solid #eaeaea' 
        }}
      >
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
            THE COMMITTMENT
          </p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 400, color: '#171412', margin: '0 0 20px' }}>
            THREE PIECES.
          </h2>
          <p style={{ color: '#555', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '24px' }}>
            We release garments slowly, focusing on refined details and robust construction rather than seasonal trend cycles. 
            This first release marks the trail.
          </p>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.85rem', fontWeight: 600 }}>
            DESIGNED IN ITALY · MADE IN SRI LANKA
          </p>
        </div>
      </footer>
    </motion.div>
  );
}

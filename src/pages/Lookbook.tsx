import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { heroProducts, type Product } from "../data";

type LookbookProps = {
  onQuickShop: (product: Product) => void;
};

export default function Lookbook({ onQuickShop }: LookbookProps) {
  useEffect(() => {
    document.title = "Lookbook | Summer 2026 Capsule | Vestigia";
  }, []);

  const slideUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6 },
  };

  return (
    <motion.div
      className="lookbook-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Intro Header */}
      <header className="lookbook-header-section">
        <p>Summer Editorial 2026</p>
        <h1>Under the Solstice Sun</h1>
        <span>A cinematic study of raw fabrics, quiet statements, and fluid silhouettes.</span>
      </header>

      {/* Slide 1: Neutral Tailoring */}
      <section className="lookbook-scene-section">
        <div className="scene-media-block">
          <img
            src="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1600&q=85"
            alt="Vestigia Models wearing matching neutral linen sets"
          />
          {/* Tagged products overlays */}
          <button
            className="hotspot hotspot-one"
            type="button"
            onClick={() => onQuickShop(heroProducts[0])}
            aria-label={`Shop ${heroProducts[0].name}`}
          >
            <Plus size={18} />
          </button>
          <button
            className="hotspot hotspot-two"
            type="button"
            onClick={() => onQuickShop(heroProducts[1])}
            aria-label={`Shop ${heroProducts[1].name}`}
          >
            <Plus size={18} />
          </button>
        </div>
        <motion.div className="scene-caption-block" {...slideUp}>
          <span>Scene 01</span>
          <h2>Quiet Tailoring</h2>
          <p>
            Crisp linen vests met with flowing, tapered trousers in shades of natural sand, stone, and bone. Built for the heat of the city, styled with effortless ease.
          </p>
          <div className="scene-products-list">
            <Link to={`/product/${heroProducts[0].id}`} className="scene-product-link">
              <span>01. {heroProducts[0].name}</span>
              <strong>$128</strong>
            </Link>
            <Link to={`/product/${heroProducts[1].id}`} className="scene-product-link">
              <span>02. {heroProducts[1].name}</span>
              <strong>$148</strong>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Quote Breakout */}
      <section className="lookbook-quote-breakout">
        <motion.blockquote {...slideUp}>
          "Style is a language of restraint. It is the art of leaving spaces unfilled, allowing the natural textures to breathe."
          <span>— Vestigia Studio</span>
        </motion.blockquote>
      </section>

      {/* Slide 2: Jewelry Accent */}
      <section className="lookbook-scene-section reverse">
        <div className="scene-media-block">
          <img
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=85"
            alt="Model wearing Fine Hoop Set in warm golden sunlight"
          />
          <button
            className="hotspot hotspot-three"
            type="button"
            onClick={() => onQuickShop(heroProducts[2])}
            aria-label={`Shop ${heroProducts[2].name}`}
          >
            <Plus size={18} />
          </button>
        </div>
        <motion.div className="scene-caption-block" {...slideUp}>
          <span>Scene 02</span>
          <h2>Organic Accents</h2>
          <p>
            Finishing details that carry intent. Dual-sized lightweight gold vermeil hoops capturing the warm reflection of summer solstice sunlight.
          </p>
          <div className="scene-products-list">
            <Link to={`/product/${heroProducts[2].id}`} className="scene-product-link">
              <span>03. {heroProducts[2].name}</span>
              <strong>$58</strong>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Slide 3: Monochrome Silhouette */}
      <section className="lookbook-full-bleed-scene">
        <div className="full-bleed-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1800&q=85"
            alt="Editorial model standing in monochromatic draped dress"
          />
          <div className="full-bleed-shade" />
          <motion.div className="full-bleed-overlay-content" {...slideUp}>
            <span>Scene 03</span>
            <h2>Flowing Monochromes</h2>
            <p>A study of cotton poplin volume and structural shadows against the sky.</p>
            <Link className="primary-link" to="/shop?category=Clothing">
              Shop clothing
            </Link>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

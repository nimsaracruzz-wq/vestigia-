import { PageIntro } from '../animation/PageIntro';
import { SectionReveal as Reveal } from '../animation/SectionReveal';
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { m as motion } from "framer-motion";
import { heroProducts, type Product } from "../data";
import { useAdmin } from "../admin/AdminContext";
import { collectionPath } from "../utils/seo";
import { SEOHead } from "../components/common/SEOHead";
import { breadcrumbJsonLd } from "../utils/seo";
import { moneyLabel } from "../utils/money";
import { useCurrency } from "../context/CurrencyContext";

type LookbookProps = {
  onQuickShop: (product: Product) => void;
};

export default function Lookbook({ onQuickShop }: LookbookProps) {
  const { products } = useAdmin();
  const { currency } = useCurrency();
  const productPrice = (product: Product) => {
    const price = product.prices?.[currency];
    return price ? moneyLabel(price.priceMinor, currency) : "Unavailable in this market";
  };


  const lookbookProducts = [0, 1, 2].map((index) => products[index] ?? heroProducts[index]);

  return (
    <div
      className="lookbook-page-shell"
    >
      <SEOHead
        title="Lookbook | Summer 2026 Capsule | VESTIGIA"
        description="Explore the VESTIGIA summer editorial lookbook featuring refined silhouettes, heavyweight cotton, and contemporary luxury styling."
        canonicalUrl="https://thevestigia.com/lookbook"
        ogImage="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1600&q=85"
        jsonLd={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Lookbook", path: "/lookbook" },
        ])}
      />
      {/* Intro Header */}
      <PageIntro as="header" className="lookbook-header-section">
        <p>Summer Editorial 2026</p>
        <h1>Under the Solstice Sun</h1>
        <span>A cinematic study of raw fabrics, quiet statements, and fluid silhouettes.</span>
      </PageIntro>

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
            onClick={() => onQuickShop(lookbookProducts[0])}
            aria-label={`Shop ${lookbookProducts[0].name}`}
          >
            <Plus size={18} />
          </button>
          <button
            className="hotspot hotspot-two"
            type="button"
            onClick={() => onQuickShop(lookbookProducts[1])}
            aria-label={`Shop ${lookbookProducts[1].name}`}
          >
            <Plus size={18} />
          </button>
        </div>
        <Reveal className="scene-caption-block">
          <span>Scene 01</span>
          <h2>Quiet Tailoring</h2>
          <p>
            Crisp linen vests met with flowing, tapered trousers in shades of natural sand, stone, and bone. Built for the heat of the city, styled with effortless ease.
          </p>
          <div className="scene-products-list">
            <Link to={`/product/${lookbookProducts[0].slug || lookbookProducts[0].id}`} className="scene-product-link">
              <span>01. {lookbookProducts[0].name}</span>
              <strong>{productPrice(lookbookProducts[0])}</strong>
            </Link>
            <Link to={`/product/${lookbookProducts[1].slug || lookbookProducts[1].id}`} className="scene-product-link">
              <span>02. {lookbookProducts[1].name}</span>
              <strong>{productPrice(lookbookProducts[1])}</strong>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Quote Breakout */}
      <section className="lookbook-quote-breakout">
        <Reveal as="blockquote">
          "Style is a language of restraint. It is the art of leaving spaces unfilled, allowing the natural textures to breathe."
          <span>— Vestigia Studio</span>
        </Reveal>
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
            onClick={() => onQuickShop(lookbookProducts[2])}
            aria-label={`Shop ${lookbookProducts[2].name}`}
          >
            <Plus size={18} />
          </button>
        </div>
        <Reveal className="scene-caption-block">
          <span>Scene 02</span>
          <h2>Organic Accents</h2>
          <p>
            Finishing details that carry intent. Dual-sized lightweight gold vermeil hoops capturing the warm reflection of summer solstice sunlight.
          </p>
          <div className="scene-products-list">
            <Link to={`/product/${lookbookProducts[2].slug || lookbookProducts[2].id}`} className="scene-product-link">
              <span>03. {lookbookProducts[2].name}</span>
              <strong>{productPrice(lookbookProducts[2])}</strong>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Slide 3: Monochrome Silhouette */}
      <section className="lookbook-full-bleed-scene">
        <div className="full-bleed-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1800&q=85"
            alt="Editorial model standing in monochromatic draped dress"
          />
          <div className="full-bleed-shade" />
          <Reveal className="full-bleed-overlay-content">
            <span>Scene 03</span>
            <h2>Flowing Monochromes</h2>
            <p>A study of cotton poplin volume and structural shadows against the sky.</p>
            <Link className="primary-link" to={collectionPath("Clothing")}>
              Shop clothing
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

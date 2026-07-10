import { useState, useMemo, useEffect } from "react";
import { Plus, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { collections, heroProducts, products, journalArticles, type Product } from "../data";
import ProductCard from "../components/common/ProductCard";

type HomeProps = {
  onQuickShop: (product: Product) => void;
};

type Category = "All" | Product["category"];
const categories: Category[] = ["All", "New", "Clothing", "Accessories", "Sale"];

export default function Home({ onQuickShop }: HomeProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  // Dynamic document title update for SEO
  useEffect(() => {
    document.title = "Vestigia | Refined Tailoring & Modern Staples";
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => selectedCategory === "All" || p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="hero" id="top">
        <img
          src="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1800&q=85"
          alt="Models wearing neutral tailored summer apparel by Vestigia"
        />
        <div className="hero-shade" />

        {/* Hotspots */}
        <button
          className="hotspot hotspot-one"
          type="button"
          onClick={() => onQuickShop(heroProducts[0])}
          aria-label={`Quick shop ${heroProducts[0].name}`}
        >
          <Plus size={18} />
        </button>
        <button
          className="hotspot hotspot-two"
          type="button"
          onClick={() => onQuickShop(heroProducts[1])}
          aria-label={`Quick shop ${heroProducts[1].name}`}
        >
          <Plus size={18} />
        </button>
        <button
          className="hotspot hotspot-three"
          type="button"
          onClick={() => onQuickShop(heroProducts[2])}
          aria-label={`Quick shop ${heroProducts[2].name}`}
        >
          <Plus size={18} />
        </button>

        <div className="hero-copy">
          <p>Summer capsule 2026</p>
          <h1>Ease, tailored.</h1>
          <Link className="primary-link" to="/shop">
            Shop the capsule
          </Link>
        </div>

        <div className="floating-cta">
          <div>
            <strong>New season edit</strong>
            <span>Lightweight layers, refined accessories, organic statement lines.</span>
          </div>
          <Link to="/shop">Shop now</Link>
        </div>
      </section>

      {/* Collections Section */}
      <section className="section collections" aria-labelledby="collection-title">
        <div className="section-heading">
          <div>
            <p>Curated departments</p>
            <h2 id="collection-title">Designed for discovery</h2>
          </div>
        </div>
        <div className="collection-grid">
          {collections.map((collection, index) => (
            <motion.article
              className="collection-card"
              key={collection.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <img src={collection.image} alt={collection.alt} />
              <div>
                <span>{collection.kicker}</span>
                <h3>{collection.title}</h3>
                <Link to="/shop">Explore</Link>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section products-section" id="new" aria-labelledby="products-title">
        <div className="toolbar">
          <div>
            <p>Featured products</p>
            <h2 id="products-title">Built for conversion</h2>
          </div>
          <div className="filters" aria-label="Product filters">
            <SlidersHorizontal size={17} />
            {categories.map((item) => (
              <button
                className={item === selectedCategory ? "active" : ""}
                key={item}
                type="button"
                onClick={() => setSelectedCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          className="product-grid"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickShop={() => onQuickShop(product)}
            />
          ))}
        </motion.div>
      </section>

      {/* Lookbook Section */}
      <section className="lookbook" id="lookbook">
        <div className="lookbook-copy">
          <p>The lookbook</p>
          <h2>Layered neutrals for long, bright days.</h2>
          <Link className="primary-link dark" to="/lookbook">
            Shop looks
          </Link>
        </div>
        <div className="lookbook-image-container">
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1600&q=85"
            alt="Minimalist monochromatic styling by Vestigia"
          />
        </div>
      </section>

      {/* Journal / Stories Section */}
      <section className="section journal" id="journal" aria-labelledby="journal-title">
        <div className="section-heading">
          <div>
            <p>Journal</p>
            <h2 id="journal-title">Stories that sell the collection</h2>
          </div>
          <Link to="/journal" className="view-journal-link">
            Read all stories <ArrowRight size={16} />
          </Link>
        </div>
        <div className="journal-grid">
          {journalArticles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <span>0{index + 1}</span>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <Link to={`/journal?read=${article.id}`}>Read story</Link>
            </motion.article>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

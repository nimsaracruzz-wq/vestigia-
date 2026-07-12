import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { products, type Product } from "../data";
import ProductCard from "../components/common/ProductCard";

type ShopProps = {
  onQuickShop: (product: Product) => void;
};

export default function Shop({ onQuickShop }: ShopProps) {
  // Set document title for SEO
  useEffect(() => {
    document.title = "Shop — The First Release — VESTIGIA";
  }, []);

  return (
    <motion.div
      className="shop-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: '#fff', minHeight: '100vh' }}
    >
      {/* Top Banner */}
      <div className="shop-header-banner" style={{ padding: '80px 24px 60px', textAlign: 'center', background: '#f6f3ed' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
          SHOP
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#171412', margin: '0 0 16px' }}>
          THE FIRST RELEASE.
        </h1>
        <p style={{ fontSize: '1rem', color: '#666', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Three essential pieces introducing the world of VESTIGIA.
        </p>
      </div>

      {/* Product Catalog Grid (No filters/sidebar for 3 items, exclusive centered layout) */}
      <div className="shop-layout-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 100px' }}>
        <div className="shop-product-results">
          <div 
            className="product-grid" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '40px',
              justifyContent: 'center'
            }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickShop={() => onQuickShop(product)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Brand Statement */}
      <section 
        className="shop-bottom-statement" 
        style={{ 
          background: '#f6f3ed', 
          borderTop: '1px solid #eaeaea',
          padding: '100px 24px' 
        }}
      >
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '48px', 
            alignItems: 'center', 
            maxWidth: '1200px', 
            margin: '0 auto' 
          }}
        >
          <div style={{ padding: '0 16px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 400, margin: '0 0 20px', color: '#171412' }}>
              THIS IS ONLY THE BEGINNING.
            </h2>
            <p style={{ color: '#444', lineHeight: 1.8, marginBottom: '32px', fontSize: '0.95rem' }}>
              The first VESTIGIA release establishes the foundation of our identity. 
              New pieces, stories, and expressions will follow.
            </p>
            <Link className="primary-link dark" to="/story">
              Discover Our Story
            </Link>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <img
              src="/images/products/signature_detail.png"
              alt="VESTIGIA textile close-up campaign illustration"
              style={{ width: '100%', objectFit: 'cover', maxHeight: '400px' }}
            />
          </div>
        </div>
      </section>
    </motion.div>
  );
}

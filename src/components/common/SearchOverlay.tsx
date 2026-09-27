import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useEntrance } from "../../animation/Reveal";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "../../context/CurrencyContext";
import { useAdmin } from "../../admin/AdminContext";
import ProductImage from "./ProductImage";
import { getProductPrice } from "../../utils/productMedia";

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  useScrollLock(open);
  useDialogFocus(open, onClose, '.search-panel');
  const backdropEntrance = useEntrance("fade");
  const panelEntrance = useEntrance("scale");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { formatPrice: money, currency } = useCurrency();
  const { products } = useAdmin();

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Live filtering products
  const results = useMemo(() => {
    if (query.trim().length > 1) {
      const lowerQuery = query.toLowerCase();
      return products.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          product.category.toLowerCase().includes(lowerQuery) ||
          product.description.toLowerCase().includes(lowerQuery)
      );
    }
    return [];
  }, [query, products]);

  const popularSearches = ["signature", "origin", "essential", "vestigia", "tee"];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dim backdrop — click to close */}
          <motion.div
            className="search-backdrop"
            {...backdropEntrance}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Search Panel */}
          <motion.div
            className="search-panel"
            {...panelEntrance}
            role="dialog"
            aria-modal="true"
            aria-label="Site Search Overlay"
          >
            <button
              className="icon-button close-search-btn"
              type="button"
              onClick={onClose}
              aria-label="Close search"
            >
              <X size={22} />
            </button>

            <div className="search-panel-content">
              <label htmlFor="site-search">Search Vestigia</label>
              <div className="search-input-wrapper">
                <Search size={23} className="search-icon-svg" />
                <input
                  ref={inputRef}
                  id="site-search"
                  type="text"
                  placeholder="Search signature, origin, essential..."
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="search-clear-btn"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {results.length === 0 && !query.trim() && (
                <div className="popular-tags-row">
                  <span>Popular searches:</span>
                  {popularSearches.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="search-results-container">
                  <h3>Search Results ({results.length})</h3>
                  <div className="search-results-grid">
                    {results.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.slug || product.id}`}
                        onClick={onClose}
                        className="search-result-item"
                      >
                        <ProductImage product={product} variant="product" />
                        <div>
                          <h4>{product.name}</h4>
                          <p>{product.category}</p>
                          <strong>{money(getProductPrice(product, currency))}</strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {query.trim().length > 1 && results.length === 0 && (
                <p className="no-search-results">
                  No products found matching "{query}". Try checking your spelling or searching for another keyword.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

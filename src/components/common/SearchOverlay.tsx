import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useOverlayEntrance } from "../../animation/Reveal";
import { useOverlayNavigation } from "../../hooks/useOverlayNavigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "../../context/CurrencyContext";
import { useAdmin } from "../../admin/AdminContext";
import ProductImage from "./ProductImage";
import { getProductPrice } from "../../utils/productMedia";
import { API_BASE_URL } from "../../config/api";
import { useCookieConsent } from "../../context/CookieConsentContext";

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const overlayNavigation = useOverlayNavigation(open, onClose);
  useDialogFocus(open, onClose, '.search-panel');
  const backdropEntrance = useOverlayEntrance();
  const panelEntrance = useOverlayEntrance(true);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { formatPrice: money, currency } = useCurrency();
  const { products } = useAdmin();
  const { consent } = useCookieConsent();
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/search/popular`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then((items: Array<{ query?: string }>) => setPopularSearches(items.map(item => item.query || '').filter(Boolean).slice(0, 6)))
      .catch(() => {});
    fetch(`${API_BASE_URL}/storefront/homepage/best-sellers`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then((ids: number[]) => setBestSellerIds(Array.isArray(ids) ? ids : []))
      .catch(() => {});
    return () => controller.abort();
  }, [open]);

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
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
      return products.map(product => ({ product, score:
        (product.name.toLowerCase().includes(lowerQuery) ? 4 : 0) +
        (product.category.toLowerCase().includes(lowerQuery) ? 2 : 0) +
        (product.description.toLowerCase().includes(lowerQuery) ? 1 : 0)
      })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).map(item => item.product);
    }
    return [];
  }, [query, products]);

  const recommendations = [...products].sort((a, b) => {
    const aRank = bestSellerIds.indexOf(a.id), bRank = bestSellerIds.indexOf(b.id);
    return (aRank < 0 ? Number.MAX_SAFE_INTEGER : aRank) - (bRank < 0 ? Number.MAX_SAFE_INTEGER : bRank) || a.name.localeCompare(b.name);
  }).slice(0, 3);
  const recordSearch = (value: string) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (!consent?.analytics || clean.length < 2 || !results.length) return;
    void fetch(`${API_BASE_URL}/search/query`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: clean, consent: true }), keepalive: true,
    }).catch(() => {});
  };

  return (
    <AnimatePresence onExitComplete={() => { setQuery(""); overlayNavigation.onExitComplete(); }}>
      {open && (
        <>
          {/* Dim backdrop — click to close */}
          <motion.div
            key="search-backdrop"
            className="search-backdrop"
            {...backdropEntrance}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Search Panel */}
          <motion.div
            key="search-panel"
            className="search-panel"
            {...panelEntrance}
            onClickCapture={overlayNavigation.onClickCapture}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') recordSearch(query); }}
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
                  {!popularSearches.length && <small>Popular searches will appear as shoppers search the collection.</small>}
                </div>
              )}

              {results.length === 0 && !query.trim() && recommendations.length > 0 && (
                <div className="search-results-container">
                  <h3>Recommended pieces</h3>
                  <div className="search-results-grid">
                    {recommendations.map(product => (
                      <Link key={product.id} to={`/product/${product.slug || product.id}`} onClick={onClose} className="search-result-item">
                        <ProductImage product={product} variant="product" />
                        <div><h4>{product.name}</h4><p>{product.category}</p><strong>{money(getProductPrice(product, currency))}</strong></div>
                      </Link>
                    ))}
                  </div>
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
                        onClick={() => { recordSearch(query); onClose(); }}
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

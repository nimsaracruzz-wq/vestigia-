import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="lux-footer">
      {/* Newsletter strip */}
      <div className="lux-footer__newsletter">
        <p className="lux-footer__newsletter-eyebrow">Private Access</p>
        <h2 className="lux-footer__newsletter-heading">
          Join the Inner Circle
        </h2>
        <p className="lux-footer__newsletter-sub">
          Receive first access to new collections, private sales, and editorial
          stories.
        </p>
        {subscribed ? (
          <p className="lux-footer__newsletter-thanks">
            Welcome to Vestigia. &nbsp;You are now on the list.
          </p>
        ) : (
          <form className="lux-footer__form" onSubmit={handleSubscribe}>
            <input
              id="footer-email"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="lux-footer__input"
            />
            <button type="submit" className="lux-footer__submit">
              Subscribe
            </button>
          </form>
        )}
      </div>

      {/* Main links grid */}
      <div className="lux-footer__main">
        <div className="lux-footer__brand">
          <span className="lux-footer__wordmark" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>VESTIGIA</span>
          <div className="lux-footer__tagline" style={{ fontSize: '0.75rem', lineHeight: '1.6', color: '#bbb', marginTop: '12px' }}>
            <p style={{ margin: '2px 0', letterSpacing: '0.05em' }}>DESIGNED IN ITALY.</p>
            <p style={{ margin: '2px 0', letterSpacing: '0.05em' }}>MADE IN SRI LANKA.</p>
            <p style={{ margin: '8px 0 2px', letterSpacing: '0.15em', fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>LEAVE YOUR MARK.</p>
          </div>
        </div>

        <nav className="lux-footer__nav">
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Shop</p>
            <ul className="lux-footer__nav-list">
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/product/vestigia-signature-tee">Signature Tee</Link></li>
              <li><Link to="/product/vestigia-origin-tee">Origin Tee</Link></li>
              <li><Link to="/product/vestigia-essential-tee">Essential Tee</Link></li>
            </ul>
          </div>
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Information</p>
            <ul className="lux-footer__nav-list">
              <li><Link to="/about">About</Link></li>
              <li><Link to="/story">Our Story</Link></li>
              <li><a href="#shipping">Shipping</a></li>
              <li><a href="#returns">Returns</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Social</p>
            <ul className="lux-footer__nav-list">
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">TikTok</a></li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="lux-footer__bottom">
        <p className="lux-footer__copy">
          &copy; 2026 VESTIGIA. ALL RIGHTS RESERVED.
        </p>
        
        <div className="lux-footer__bottom-right">
          <CurrencySwitcher />
          
          <div className="lux-footer__payments">
            {["Visa", "Mastercard", "Amex", "Apple Pay"].map((method) => (
              <span key={method} className="lux-footer__payment-badge">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useCurrency, type CurrencyCode } from "../../context/CurrencyContext";

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  
  return (
    <div className="currency-switcher" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label htmlFor="currency-select" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Currency</label>
      <select 
        id="currency-select"
        value={currency} 
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="EUR" style={{ color: '#000' }}>EUR (€)</option>
        <option value="USD" style={{ color: '#000' }}>USD ($)</option>
        <option value="JPY" style={{ color: '#000' }}>JPY (¥)</option>
      </select>
    </div>
  );
}

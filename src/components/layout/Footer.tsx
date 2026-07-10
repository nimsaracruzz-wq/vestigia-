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
          <span className="lux-footer__wordmark">Vestigia</span>
          <p className="lux-footer__tagline">
            Refined apparel for enduring style.
          </p>
        </div>

        <nav className="lux-footer__nav">
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Shop</p>
            <ul className="lux-footer__nav-list">
              <li><Link to="/shop">All Clothing</Link></li>
              <li><Link to="/shop?category=New">New Arrivals</Link></li>
              <li><Link to="/shop?category=Accessories">Accessories</Link></li>
              <li><Link to="/shop?category=Sale">Sale</Link></li>
            </ul>
          </div>
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Brand</p>
            <ul className="lux-footer__nav-list">
              <li><Link to="/lookbook">Lookbook</Link></li>
              <li><Link to="/journal">Journal</Link></li>
              <li><Link to="/account">My Account</Link></li>
            </ul>
          </div>
          <div className="lux-footer__nav-col">
            <p className="lux-footer__nav-label">Support</p>
            <ul className="lux-footer__nav-list">
              <li><a href="#shipping">Shipping</a></li>
              <li><a href="#returns">Returns &amp; Exchanges</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="lux-footer__bottom">
        <p className="lux-footer__copy">
          &copy; {new Date().getFullYear()} Vestigia. All rights reserved.
        </p>
        
        <div className="lux-footer__bottom-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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

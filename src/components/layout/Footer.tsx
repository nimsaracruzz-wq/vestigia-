import { Reveal, RevealGroup } from "../../animation/Reveal";
import React, { useState } from "react";
import { API_BASE_URL } from "../../config/api";
import FooterNavigation, { type FooterGroup, type FooterLink } from "./FooterNavigation";

const footerGroups: FooterGroup[] = [
  { id: "shop", title: "Shop", links: [{ label: "All Products", url: "/shop" }, { label: "The First Release", url: "/shop" }] },
  { id: "about", title: "About", links: [{ label: "Our Story", url: "/story" }, { label: "About VESTIGIA", url: "/about" }, { label: "Journal", url: "/journal" }] },
  { id: "services", title: "Client Services", links: [{ label: "Contact", url: "/contact" }, { label: "Shipping & Delivery", url: "/shipping-policy" }, { label: "Frequently Asked Questions", url: "/faq" }, { label: "Returns", url: "/refund-policy" }] },
  { id: "legal", title: "Legal", links: [{ label: "Privacy Policy", url: "/privacy-policy" }, { label: "Terms of Service", url: "/terms-of-service" }] },
];

const socialLinks: FooterLink[] = [
  { label: "Instagram", url: "https://instagram.com/thevestigia" },
  { label: "TikTok", url: "https://tiktok.com/@thevestigia" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, source: "footer_inner_circle" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "Please try again in a moment.");
      setSubscribed(true);
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RevealGroup className="lux-footer__newsletter">
        <div className="lux-footer__newsletter-emblem-wrap"><img src="/images/products/vestigia-logo-192.png" decoding="async" alt="" aria-hidden="true" className="vst-emblem vst-emblem--sm" /></div>
        <Reveal as="p" className="lux-footer__newsletter-eyebrow">Private Access</Reveal>
        <Reveal as="h2" className="lux-footer__newsletter-heading">JOIN THE INNER CIRCLE</Reveal>
        <Reveal as="p" className="lux-footer__newsletter-sub">Be the first to discover new collections, exclusive offers, styling inspiration, and special Vestigia updates.</Reveal>
        {subscribed ? <p className="lux-footer__newsletter-thanks">Please check your email to confirm your subscription.</p> : (
          <Reveal as="form" className="lux-footer__form" onSubmit={handleSubscribe}>
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input id="footer-email" type="email" placeholder="Enter your email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} className="lux-footer__input" />
            <button type="submit" className="lux-footer__submit lux-footer__submit--inner-circle" disabled={loading}>{loading ? "…" : "Subscribe"}</button>
            <p className="lux-footer__newsletter-consent">By subscribing, you agree to receive Vestigia emails. You can unsubscribe at any time.</p>
            {error && <p role="alert" className="lux-footer__newsletter-error">{error}</p>}
          </Reveal>
        )}
      </RevealGroup>
      <FooterNavigation description={"DESIGNED IN ITALY.\nMADE IN SRI LANKA.\nEVERY THREAD LEAVES A LEGACY"} groups={footerGroups} socials={socialLinks} copyright="© 2026 VESTIGIA. ALL RIGHTS RESERVED." adminLink />
    </>
  );
}

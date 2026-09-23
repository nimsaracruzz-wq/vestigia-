import { Reveal } from "../../animation/Reveal";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import "./EmptyBag.css";

type EmptyBagProps = {
  variant?: "page" | "drawer";
  onNavigate?: () => void;
};

export default function EmptyBag({ variant = "page", onNavigate }: EmptyBagProps) {
  const isPage = variant === "page";
  const Heading = isPage ? "h1" : "h2";

  return (
    <div className={`empty-bag empty-bag--${variant}`}>
      {isPage && (
        <header className="empty-bag__header">
          <Link to="/" className="empty-bag__brand" aria-label="VESTIGIA home">VESTIGIA</Link>
          <Link to="/shop" className="empty-bag__back"><ArrowLeft size={16} aria-hidden="true" /> Back to shop</Link>
        </header>
      )}

      <section className="empty-bag__layout" aria-label="Your empty shopping bag">
        <Reveal className="empty-bag__content">
          <div className="empty-bag__icon" aria-hidden="true"><ShoppingBag size={32} strokeWidth={1} /></div>
          <p className="empty-bag__eyebrow">A little space for something lasting</p>
          <Heading>Your bag is empty.</Heading>
          <p className="empty-bag__description">Discover considered essentials, made to become part of your everyday.</p>
          <Link to="/shop" onClick={onNavigate} className="empty-bag__shop">
            Explore the collection <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/story" onClick={onNavigate} className="empty-bag__story">Discover our story</Link>
          <div className="empty-bag__signature">
            <span>Designed in Italy</span><span>Made in Sri Lanka</span>
          </div>
        </Reveal>

        {isPage && (
          <Link to="/shop" className="empty-bag__editorial" aria-label="Shop the first VESTIGIA release">
            <img
              src="/images/products/vestigia-hero-768.jpg"
              srcSet="/images/products/vestigia-hero-768.jpg 768w, /images/products/vestigia-hero-1254.jpg 1254w"
              sizes="(max-width: 720px) 100vw, 50vw"
              width={1254}
              height={1254}
              decoding="async"
              alt="The VESTIGIA collection in black and ivory"
            />
            <div className="empty-bag__caption">
              <span>The first release</span>
              <strong>Leave your mark.</strong>
              <ArrowRight size={24} aria-hidden="true" />
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}

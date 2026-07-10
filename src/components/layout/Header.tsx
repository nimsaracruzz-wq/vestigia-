import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu, Search, ShoppingBag, User, Heart } from "lucide-react";
import { useCart } from "../../context/CartContext";

type HeaderProps = {
  onCartToggle: () => void;
  onMenuToggle: () => void;
  onSearchToggle: () => void;
};

export default function Header({ onCartToggle, onMenuToggle, onSearchToggle }: HeaderProps) {
  const { cartCount, wishlist } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Certain pages (like Shop, PDP, Account, Checkout) should have a solid header.
  // Home page starts transparent and gets solid on scroll.
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerClass = `header ${scrolled || !isHome ? "scrolled" : "transparent"}`;

  return (
    <header className={headerClass}>
      <button
        className="icon-button mobile-only"
        type="button"
        onClick={onMenuToggle}
        aria-label="Open mobile menu"
      >
        <Menu size={22} />
      </button>

      <nav className="desktop-nav" aria-label="Primary navigation">
        <Link to="/shop" className={location.pathname === "/shop" ? "active-link" : ""}>Shop</Link>
        <Link to="/lookbook" className={location.pathname === "/lookbook" ? "active-link" : ""}>Lookbook</Link>
        <Link to="/journal" className={location.pathname.startsWith("/journal") ? "active-link" : ""}>Journal</Link>
      </nav>

      <Link className="brand" to="/" aria-label="Vestigia home">
        Vestigia
      </Link>

      <div className="header-actions">
        <button className="icon-button" type="button" onClick={onSearchToggle} aria-label="Search site">
          <Search size={20} />
        </button>
        <Link className="icon-button wishlist-button" to="/account?tab=wishlist" aria-label="View wishlist">
          <Heart size={20} />
          {wishlist.length > 0 && <span className="wishlist-dot" />}
        </Link>
        <Link className="icon-button account-button" to="/account" aria-label="Go to account">
          <User size={20} />
        </Link>
        <button className="icon-button bag-button" type="button" onClick={onCartToggle} aria-label="Open bag">
          <ShoppingBag size={20} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

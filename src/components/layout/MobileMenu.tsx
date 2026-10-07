import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, ChevronDown } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useOverlayEntrance, useDrawerEntrance } from '../../animation/Reveal';
import { useOverlayNavigation } from '../../hooks/useOverlayNavigation';
import { useCurrency, type CurrencyCode } from '../../context/CurrencyContext';
import { useHomepage } from '../../homepage/HomepageContext';
import './MobileMenu.css';

type MobileMenuProps = { open: boolean; onClose: () => void };

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const overlayNavigation = useOverlayNavigation(open, onClose);
  useDialogFocus(open, onClose, '.menu-drawer');
  const backdropEntrance = useOverlayEntrance();
  const drawerEntrance = useDrawerEntrance('left');
  const { currency, setCurrency, checkoutLocked } = useCurrency();
  const { config } = useHomepage();
  const [shopOpen, setShopOpen] = useState(false);
  const shopId = useId();
  const currencyId = useId();

  const hasFirstRelease = config?.sections.some(section => section.id === 'first-release' && section.type === 'product_carousel' && section.enabled);

  return <AnimatePresence onExitComplete={() => { setShopOpen(false); overlayNavigation.onExitComplete(); }}>{open && <>
    <motion.div key="menu-backdrop" className="drawer-backdrop vestigia-menu-backdrop" {...backdropEntrance} onClick={onClose} aria-hidden="true" />
    <motion.aside key="menu-panel" className="menu-drawer vestigia-menu" {...drawerEntrance} onClickCapture={overlayNavigation.onClickCapture} aria-modal="true" role="dialog" aria-label="VESTIGIA navigation">
      <div className="vestigia-menu__header">
        <Link className="vestigia-menu__brand" to="/" onClick={onClose} aria-label="VESTIGIA home">
          <img src="/images/products/vestigia-logo-192.png" alt="" width={34} height={34} />
          <span>VESTIGIA</span>
        </Link>
        <button className="vestigia-menu__close" type="button" onClick={onClose} aria-label="Close menu"><X size={22} strokeWidth={1.4} aria-hidden="true" /></button>
      </div>
      <nav className="vestigia-menu__primary" aria-label="Main navigation">
        <div className="vestigia-menu__shop">
          <button className="vestigia-menu__primary-link" type="button" aria-expanded={shopOpen} aria-controls={shopId} onClick={() => setShopOpen(value => !value)}>
            <span>Shop</span>{shopOpen ? <Minus size={20} strokeWidth={1.3} aria-hidden="true" /> : <Plus size={20} strokeWidth={1.3} aria-hidden="true" />}
          </button>
          <div id={shopId} className={`vestigia-menu__accordion${shopOpen ? ' is-open' : ''}`} inert={!shopOpen} aria-hidden={!shopOpen}>
            <div className="vestigia-menu__submenu">
              <Link to="/shop?category=all&sort=newest" onClick={onClose}>New arrivals</Link>
              {hasFirstRelease && <Link to="/shop?category=first-release" onClick={onClose}>The first release</Link>}
              <Link to="/shop?category=all" onClick={onClose}>All products</Link>
            </div>
          </div>
        </div>
        <Link className="vestigia-menu__primary-link" to="/about" onClick={onClose}>About</Link>
        <Link className="vestigia-menu__primary-link" to="/story" onClick={onClose}>Story</Link>
        <Link className="vestigia-menu__primary-link" to="/account" onClick={onClose}>Account</Link>
      </nav>
      <nav className="vestigia-menu__utility" aria-label="Client services">
        <p className="vestigia-menu__eyebrow">Client services</p>
        <Link to="/account?tab=wishlist" onClick={onClose}>Wishlist</Link>
        <Link to="/contact" onClick={onClose}>Contact</Link>
        <div className="vestigia-menu__policies"><Link to="/shipping-policy" onClick={onClose}>Shipping</Link><span aria-hidden="true">&amp;</span><Link to="/refund-policy" onClick={onClose}>Returns</Link></div>
        <label className="vestigia-menu__currency" htmlFor={currencyId}>
          <span>Currency</span>
          <span className="vestigia-menu__currency-control">
            <select id={currencyId} value={currency} onChange={event => setCurrency(event.target.value as CurrencyCode)} disabled={checkoutLocked} title={checkoutLocked ? 'Currency is locked during checkout' : 'Choose currency'}>
              {(['EUR', 'USD', 'JPY', 'GBP'] as const).map(code => <option key={code} value={code}>{code}</option>)}
            </select><ChevronDown size={14} strokeWidth={1.4} aria-hidden="true" />
          </span>
        </label>
        <a href="https://instagram.com/thevestigia" target="_blank" rel="noopener noreferrer" onClick={onClose}>Instagram<span className="sr-only"> (opens in a new tab)</span></a>
      </nav>
      <p className="vestigia-menu__signature">Every thread leaves a legacy</p>
    </motion.aside>
  </>}</AnimatePresence>;
}

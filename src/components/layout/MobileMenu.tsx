import { Link } from "react-router-dom";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onCartToggle: () => void;
};

export default function MobileMenu({ open, onClose, onCartToggle }: MobileMenuProps) {
  const menuItems = [
    { name: "Shop", path: "/shop" },
    { name: "About", path: "/about" },
    { name: "Story", path: "/story" },
    { name: "Account", path: "/account" },
    { name: "Cart", path: "#cart", isCart: true },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Menu Drawer */}
          <motion.aside
            className="menu-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            aria-modal="true"
            role="dialog"
            aria-label="Mobile Navigation Menu"
          >
            <div className="drawer-header">
              <h2>Menu</h2>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Close menu">
                <X size={21} />
              </button>
            </div>

            <nav className="mobile-nav-links">
              {menuItems.map((item) => {
                if (item.isCart) {
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        onClose();
                        onCartToggle();
                      }}
                      className="mobile-nav-link-item"
                      style={{ background: 'transparent', textAlign: 'left', width: '100%', border: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{item.name}</span>
                      <ChevronRight size={16} />
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className="mobile-nav-link-item"
                  >
                    <span>{item.name}</span>
                    <ChevronRight size={16} />
                  </Link>
                );
              })}
            </nav>

            <div className="mobile-menu-footer">
              <p>VESTIGIA Storefront</p>
              <span>Complimentary shipping over $150</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

import { Link } from "react-router-dom";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const menuItems = [
    { name: "Shop All", path: "/shop" },
    { name: "New Arrivals", path: "/shop?category=New" },
    { name: "Clothing", path: "/shop?category=Clothing" },
    { name: "Accessories", path: "/shop?category=Accessories" },
    { name: "Sale", path: "/shop?category=Sale" },
    { name: "Lookbook", path: "/lookbook" },
    { name: "Journal", path: "/journal" },
    { name: "My Account", path: "/account" },
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
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className="mobile-nav-link-item"
                >
                  <span>{item.name}</span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </nav>

            <div className="mobile-menu-footer">
              <p>Vestigia Storefront</p>
              <span>Complimentary shipping over $150</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

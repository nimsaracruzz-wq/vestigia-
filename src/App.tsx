import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Core components & context
import { CartProvider } from "./context/CartContext";
import { useCart } from "./context/CartContext";
import { type Product } from "./data";
import { UserProvider } from "./context/UserContext";

// Layout components
import Announcement from "./components/layout/Announcement";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import MobileMenu from "./components/layout/MobileMenu";

// Common UI components
import Preloader from "./components/common/Preloader";
import CartDrawer from "./components/common/CartDrawer";
import SearchOverlay from "./components/common/SearchOverlay";
import QuickShopModal from "./components/common/QuickShopModal";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import ActivateAccount from "./pages/ActivateAccount";
import Lookbook from "./pages/Lookbook";
import Journal from "./pages/Journal";
import About from "./pages/About";
import Story from "./pages/Story";
import RefundPolicy from "./pages/RefundPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ShippingPolicy from "./pages/ShippingPolicy";
import ContactUs from "./pages/ContactUs";
import FAQ from "./pages/FAQ";

// Admin pages & context
import { AdminProvider } from "./admin/AdminContext";
import AdminShell from "./admin/AdminShell";
import Dashboard from "./admin/pages/Dashboard";
import Products from "./admin/pages/Products";
import Orders from "./admin/pages/Orders";
import Customers from "./admin/pages/Customers";
import Analytics from "./admin/pages/Analytics";
import Promotions from "./admin/pages/Promotions";
import AdminJournal from "./admin/pages/AdminJournal";
import AdminSettings from "./admin/pages/AdminSettings";
import AdminNotifications from "./admin/pages/AdminNotifications";
import AdminNewsletter from "./admin/pages/AdminNewsletter";
import AdminShipping from "./admin/AdminShipping";

// ScrollToTop helper component to reset window scroll position on route change
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

function MainAppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const location = useLocation();
  const { cartOpen, openCart, closeCart } = useCart();

  const isCheckout = location.pathname === "/checkout";

  return (
    <>
      <Preloader />
      <div className="site-shell">
        {!isCheckout && <Announcement />}
        {!isCheckout && (
          <Header
            onCartToggle={openCart}
            onMenuToggle={() => setMenuOpen(true)}
            onSearchToggle={() => setSearchOpen(true)}
          />
        )}

        <main className={isCheckout ? "main-content-area checkout-mode" : "main-content-area"}>
          <ScrollToTop />
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/shop" element={<Shop onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/product/:id" element={<ProductDetail onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/account" element={<Account />} />
              <Route path="/activate" element={<ActivateAccount />} />
              <Route path="/lookbook" element={<Lookbook onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/about" element={<About />} />
              <Route path="/story" element={<Story />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/faq" element={<FAQ />} />
            </Routes>
          </AnimatePresence>
        </main>

        {!isCheckout && <Footer />}

        {/* Global drawers & modals */}
        <CartDrawer open={cartOpen} onClose={closeCart} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onCartToggle={openCart} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        <QuickShopModal product={quickProduct} onClose={() => setQuickProduct(null)} />
      </div>
    </>
  );
}

function AdminAppShell() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="journal" element={<AdminJournal />} />
        <Route path="newsletter" element={<AdminNewsletter />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}

import { CurrencyProvider } from "./context/CurrencyContext";

export default function App() {
  return (
    <AdminProvider>
      <CurrencyProvider>
        <UserProvider>
          <CartProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/admin/*" element={<AdminAppShell />} />
                <Route path="/*" element={<MainAppShell />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </UserProvider>
      </CurrencyProvider>
    </AdminProvider>
  );
}

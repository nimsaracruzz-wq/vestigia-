import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Core components & context
import { CartProvider } from "./context/CartContext";
import { useCart } from "./context/CartContext";
import { type Product } from "./data";

// Layout components
import Announcement from "./components/layout/Announcement";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import MobileMenu from "./components/layout/MobileMenu";

// Common UI components
import CartDrawer from "./components/common/CartDrawer";
import SearchOverlay from "./components/common/SearchOverlay";
import QuickShopModal from "./components/common/QuickShopModal";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Lookbook from "./pages/Lookbook";
import Journal from "./pages/Journal";

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

  return (
    <div className="site-shell">
      <Announcement />
      <Header
        onCartToggle={openCart}
        onMenuToggle={() => setMenuOpen(true)}
        onSearchToggle={() => setSearchOpen(true)}
      />

      <main className="main-content-area">
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home onQuickShop={setQuickProduct} />} />
            <Route path="/shop" element={<Shop onQuickShop={setQuickProduct} />} />
            <Route path="/product/:id" element={<ProductDetail onQuickShop={setQuickProduct} />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route path="/lookbook" element={<Lookbook onQuickShop={setQuickProduct} />} />
            <Route path="/journal" element={<Journal />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />

      {/* Global drawers & modals */}
      <CartDrawer open={cartOpen} onClose={closeCart} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickShopModal product={quickProduct} onClose={() => setQuickProduct(null)} />
    </div>
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
        <Route path="journal" element={<AdminJournal />} />
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
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/*" element={<AdminAppShell />} />
              <Route path="/*" element={<MainAppShell />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </CurrencyProvider>
    </AdminProvider>
  );
}

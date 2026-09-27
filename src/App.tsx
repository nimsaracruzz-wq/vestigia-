import { HomepageProvider, useHomepage } from './homepage/HomepageContext';
import CmsFooter from './homepage/CmsFooter';
const HomepageAdmin = lazy(() => import('./admin/homepage/HomepageAdmin'));
const HomepagePreview = lazy(() => import('./homepage/HomepagePreview'));
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { MotionProvider } from './animation/MotionProvider';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './animation/PageTransition';
import { RevealProvider } from "./animation/Reveal";

function LegacyProductRedirect() {
  const { id } = useParams();
  return <Navigate to={`/product/${id}`} replace />;
}

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
import CartDrawer from "./components/common/CartDrawer";
import SearchOverlay from "./components/common/SearchOverlay";
import QuickShopModal from "./components/common/QuickShopModal";
import CookieConsent from "./components/common/CookieConsent";
import { CookieConsentProvider } from "./context/CookieConsentContext";

// Pages
import Home from "./pages/Home";
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const ActivateAccount = lazy(() => import("./pages/ActivateAccount"));
const Lookbook = lazy(() => import("./pages/Lookbook"));
const Journal = lazy(() => import("./pages/Journal"));
const About = lazy(() => import("./pages/About"));
const Story = lazy(() => import("./pages/Story"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NewsletterConfirm = lazy(() => import("./pages/NewsletterConfirm"));
const NewsletterUnsubscribe = lazy(() => import("./pages/NewsletterUnsubscribe"));

// Admin pages & context
const PricingControl = lazy(() => import("./admin/pages/PricingControl"));
import { AdminProvider } from "./admin/AdminContext";
const AdminShell = lazy(() => import("./admin/AdminShell"));
const Dashboard = lazy(() => import("./admin/pages/Dashboard"));
const Products = lazy(() => import("./admin/pages/Products"));
const Orders = lazy(() => import("./admin/pages/Orders"));
const Customers = lazy(() => import("./admin/pages/Customers"));
const Analytics = lazy(() => import("./admin/pages/Analytics"));
const Promotions = lazy(() => import("./admin/pages/Promotions"));
const AdminJournal = lazy(() => import("./admin/pages/AdminJournal"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminNotifications = lazy(() => import("./admin/pages/AdminNotifications"));
const AdminNewsletter = lazy(() => import("./admin/pages/AdminNewsletter"));
const AdminBackupRestore = lazy(() => import("./admin/pages/AdminBackupRestore"));
const AdminShipping = lazy(() => import("./admin/AdminShipping"));

// ScrollToTop helper component to reset window scroll position on route change
function ScrollToTop() {
  const { pathname, search } = useLocation();
  const previousPath = useRef('');

  useEffect(() => {
    const sameCatalog = previousPath.current === pathname && (pathname === '/shop' || pathname.startsWith('/collections/'));
    previousPath.current = pathname;
    if (sameCatalog) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
  const { config: homepage } = useHomepage();

  return (
    <>
      <div className="site-shell">
        {!isCheckout && (
          <div className={`storefront-header-region${location.pathname === '/shop' || location.pathname.startsWith('/collections/') ? ' shop-header-region' : ''}`}>
            <Announcement />
            <Header
              onCartToggle={openCart}
              onMenuToggle={() => setMenuOpen(true)}
              onSearchToggle={() => setSearchOpen(true)}
            />
          </div>
        )}

        <main className={isCheckout ? "main-content-area checkout-mode" : "main-content-area"}>
          <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
            <PageTransition><Routes>
              <Route path="/" element={<Home onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/shop" element={<Shop onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/collections/:category" element={<Shop onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/product/:id" element={<ProductDetail onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/shop/product/:id" element={<LegacyProductRedirect />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/account" element={<Account />} />
              <Route path="/activate" element={<ActivateAccount />} />
              <Route path="/activate-account" element={<ActivateAccount />} />
              <Route path="/lookbook" element={<Lookbook onQuickShop={(p) => setQuickProduct(p)} />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:articleId" element={<Journal />} />
              <Route path="/about" element={<About />} />
              <Route path="/story" element={<Story />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/newsletter/confirm" element={<NewsletterConfirm />} />
              <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribe />} />
              <Route path="*" element={<NotFound />} />
            </Routes></PageTransition>
          </Suspense>
        </main>

        {!isCheckout && (homepage ? <CmsFooter config={homepage} showNewsletter={location.pathname !== "/"} /> : <Footer />)}

        {/* Global drawers & modals */}
        <CartDrawer open={cartOpen} onClose={closeCart} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        <AnimatePresence>{quickProduct && <QuickShopModal key={quickProduct.id} product={quickProduct} onClose={() => setQuickProduct(null)} />}</AnimatePresence>
      </div>
    </>
  );
}

function AdminAppShell() {
  return (
    <RevealProvider tone="admin">
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Dashboard />} />
        <Route path="homepage" element={<HomepageAdmin />} />
        <Route path="products" element={<Products />} />
        <Route path="pricing" element={<PricingControl />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="journal" element={<AdminJournal />} />
        <Route path="newsletter" element={<AdminNewsletter />} />
        <Route path="backup" element={<AdminBackupRestore />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
    </RevealProvider>
  );
}

import { CurrencyProvider } from "./context/CurrencyContext";

export default function App() {
  return (
    <MotionProvider>
      <AdminProvider>
        <CurrencyProvider>
          <UserProvider>
            <CartProvider>
              <CookieConsentProvider>
                <HomepageProvider><BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
                    <Routes>
                      <Route path="/admin/*" element={<AdminAppShell />} />
                      <Route path="/homepage-preview" element={<HomepagePreview />} />
                      <Route path="/*" element={<MainAppShell />} />
                    </Routes>
                  </Suspense>
                  <CookieConsent />
                </BrowserRouter></HomepageProvider>
              </CookieConsentProvider>
            </CartProvider>
          </UserProvider>
        </CurrencyProvider>
      </AdminProvider>
    </MotionProvider>
  );
}

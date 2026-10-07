import "../admin.css";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { PageTransition } from "../animation/PageTransition";
import {
  Activity,
  Aperture,
  Bell,
  CircleHelp,
  CreditCard,
  DatabaseBackup,
  Home,
  LayoutDashboard,
  BarChart2,
  ListChecks,
  Monitor,
  Newspaper,
  Package,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingCart,
  Mail,
  Truck,
  Users,
  LogOut,
  Menu
} from "lucide-react";
import { useState } from "react";
import { useAdmin } from "./AdminContext";
import AdminLogin from "./AdminLogin";

export default function AdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, logout } = useAdmin();

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  const mainNavItems = [
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard size={22} />, exact: true },
    { name: "Orders", path: "/admin/orders", icon: <Package size={22} /> },
    { name: "Customers", path: "/admin/customers", icon: <Users size={22} /> },
    { name: "Analytics", path: "/admin/analytics", icon: <BarChart2 size={22} /> },
    { name: "Marketing", path: "/admin/promotions", icon: <Monitor size={22} /> },
  ];
  const financeNavItems = [
    { name: "Payments", path: "/admin/orders", icon: <CreditCard size={22} /> },
    { name: "Shipping", path: "/admin/shipping", icon: <Truck size={22} /> },
    { name: "Taxes", path: "/admin/settings", icon: <ReceiptText size={22} /> },
    { name: "Activity Log", path: "/admin/notifications", icon: <Activity size={22} /> },
    { name: "Help Center", path: "/admin/settings", icon: <CircleHelp size={22} /> },
  ];
  const storeNavItems = [
    { name: "Homepage", path: "/admin/homepage", icon: <Home size={22} /> },
    { name: "Products", path: "/admin/products", icon: <ShoppingCart size={22} /> },
    { name: "Inventory", path: "/admin/inventory", icon: <ShoppingCart size={22} /> },
    { name: "Pricing Control", path: "/admin/pricing", icon: <ShoppingCart size={22} /> },
    { name: "Newsletter", path: "/admin/newsletter", icon: <Mail size={22} /> },
    { name: "Journal", path: "/admin/journal", icon: <Newspaper size={22} /> },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={22} /> },
  ];
  const systemNavItems = [
    { name: "Backup & Restore", path: "/admin/backup", icon: <DatabaseBackup size={22} /> },
    { name: "Notifications", path: "/admin/notifications", icon: <Bell size={22} /> },
  ];
  const utilityItems = [
    { name: "Store", path: "/", icon: <Home size={23} />, exact: true },
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard size={23} />, exact: true },
    { name: "Orders", path: "/admin/orders", icon: <PackageCheck size={23} /> },
    { name: "Tasks", path: "/admin/products", icon: <ListChecks size={23} /> },
    { name: "Customers", path: "/admin/customers", icon: <Users size={23} /> },
    { name: "Alerts", path: "/admin/notifications", icon: <Bell size={23} /> },
  ];
  const isItemActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="admin-layout admin-reference-shell">
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <div className="admin-brand">
          <Link to="/admin">VESTIGIA ADMIN</Link>
        </div>
        <button
          className="admin-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={24} />
        </button>
      </div>

      <aside className="admin-rail" aria-label="Primary admin shortcuts">
        <Link to="/admin" className="admin-rail-logo" aria-label="Vestigia admin dashboard">
          <Aperture size={32} strokeWidth={2.6} />
        </Link>
        <span className="admin-rail-label">Main</span>
        <nav className="admin-rail-nav">
          {utilityItems.map((item) => (
            <NavLink
              key={`${item.name}-${item.path}`}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => isActive || isItemActive(item.path, item.exact) ? "admin-rail-link active" : "admin-rail-link"}
              title={item.name}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <span>eCommerce</span>
          <button type="button" aria-label="Collapse eCommerce menu">-</button>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-label">Main</p>
          <ul>
            {mainNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="admin-nav-label section-label">Finance <span>-</span></p>
          <ul>
            {financeNavItems.map((item) => (
              <li key={`${item.name}-${item.path}`}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="admin-nav-label section-label">Store <span>-</span></p>
          <ul>
            {storeNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="admin-nav-label section-label">System <span>-</span></p>
          <ul>
            {systemNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                className="admin-nav-link logout-btn"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={22} />
                <span>Exit to Store</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <div className="admin-content-wrapper">
          <PageTransition><Outlet /></PageTransition>
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}

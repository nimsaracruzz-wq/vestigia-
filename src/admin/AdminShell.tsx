import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart2, 
  Tag, 
  BookOpen, 
  Settings, 
  LogOut,
  Menu
} from "lucide-react";
import { useState } from "react";
import { useAdmin } from "./AdminContext";
import AdminLogin from "./AdminLogin";

export default function AdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, login, logout } = useAdmin();

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard size={18} />, exact: true },
    { name: "Products", path: "/admin/products", icon: <Package size={18} /> },
    { name: "Orders", path: "/admin/orders", icon: <ShoppingCart size={18} /> },
    { name: "Customers", path: "/admin/customers", icon: <Users size={18} /> },
    { name: "Analytics", path: "/admin/analytics", icon: <BarChart2 size={18} /> },
    { name: "Promotions", path: "/admin/promotions", icon: <Tag size={18} /> },
    { name: "Journal", path: "/admin/journal", icon: <BookOpen size={18} /> },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="admin-layout">
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

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo">
            VESTIGIA <span>ADMIN</span>
          </Link>
        </div>
        
        <nav className="admin-nav">
          <p className="admin-nav-label">Management</p>
          <ul>
            {navItems.slice(0, 7).map((item) => (
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

          <p className="admin-nav-label">System</p>
          <ul>
            <li>
              <NavLink 
                to="/admin/settings"
                className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
            </li>
            <li>
              <button 
                className="admin-nav-link logout-btn"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={18} />
                <span>Exit to Store</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <div className="admin-content-wrapper">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}

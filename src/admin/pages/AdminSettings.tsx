import { Reveal } from "../../animation/Reveal";
import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

import { Link } from "react-router-dom";
import { Truck, ArrowRight } from "lucide-react";

export default function AdminSettings() {
  const { settings, updateSettings } = useAdmin();
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="admin-page">
      <Reveal className="admin-page-header">
        <div>
          <h1>Store Settings</h1>
          <p>Configure store preferences, currency, tax rates, and shipping matrices.</p>
        </div>
      </Reveal>

      <div className="shipping-settings-quick-banner mb-6" style={{
        background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
        color: "#fff",
        padding: "1.5rem",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "1rem",
            borderRadius: "50%",
            display: "flex"
          }}>
            <Truck size={28} style={{ color: "#d97706" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Shipping Management System</h3>
            <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "0.9rem" }}>
              Configure global shipping regions, country eligibility, courier delivery rates & holiday suspension alerts.
            </p>
          </div>
        </div>
        <Link to="/admin/shipping" className="admin-btn primary" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#d97706",
          color: "#fff",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          fontWeight: 600,
          textDecoration: "none"
        }}>
          Manage Shipping Matrix <ArrowRight size={16} />
        </Link>
      </div>

      <div className="admin-settings-layout">
        <form onSubmit={handleSubmit}>
          <Reveal variant="fade" className="admin-panel mb-8">
            <div className="admin-panel-header">
              <h2>General Setup</h2>
            </div>
            <div className="admin-panel-content">
              <div className="admin-form-group">
                <label>Store Name</label>
                <input 
                  type="text" 
                  value={formData.storeName}
                  onChange={e => setFormData({...formData, storeName: e.target.value})}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Tagline / Description</label>
                <textarea 
                  value={formData.tagline}
                  onChange={e => setFormData({...formData, tagline: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="admin-form-group">
                <label>Store Currency</label>
                <select 
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </Reveal>

          <Reveal variant="fade" className="admin-panel mb-8">
            <div className="admin-panel-header">
              <h2>Order Notifications &amp; Owner Alerts</h2>
            </div>
            <div className="admin-panel-content">
              <div className="admin-form-group">
                <label style={{ fontWeight: 600 }}>Owner Order Notification Email</label>
                <input 
                  type="email" 
                  value={formData.orderNotificationEmail || ""}
                  onChange={e => setFormData({...formData, orderNotificationEmail: e.target.value})}
                  placeholder="owner@thevestigia.com"
                />
                <p className="admin-form-help" style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "6px" }}>
                  Instant order receipt notifications will be sent to this email address whenever a customer places an order. You can change this email anytime.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal variant="fade" className="admin-panel mb-8">
            <div className="admin-panel-header">
              <h2>Top Bar Announcement</h2>
            </div>
            <div className="admin-panel-content">
              <div className="admin-form-group flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  id="announcementEnabled"
                  checked={formData.announcementEnabled}
                  onChange={e => setFormData({...formData, announcementEnabled: e.target.checked})}
                />
                <label htmlFor="announcementEnabled" className="m-0">Enable Announcement Bar</label>
              </div>
              <div className="admin-form-group">
                <label>Announcement Text</label>
                <input 
                  type="text" 
                  value={formData.announcementText}
                  onChange={e => setFormData({...formData, announcementText: e.target.value})}
                  disabled={!formData.announcementEnabled}
                />
              </div>
            </div>
          </Reveal>

          <Reveal variant="fade" className="admin-panel mb-8">
            <div className="admin-panel-header">
              <h2>Checkout Settings</h2>
            </div>
            <div className="admin-panel-content">
              <div className="admin-form-group flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="complimentaryShippingEnabled"
                  checked={formData.complimentaryShippingEnabled}
                  onChange={e => setFormData({...formData, complimentaryShippingEnabled: e.target.checked})}
                />
                <label htmlFor="complimentaryShippingEnabled" className="m-0">Enable complimentary shipping message</label>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Complimentary Shipping Threshold ({formData.currency})</label>
                  <input 
                    type="number" 
                    value={formData.shippingThreshold}
                    onChange={e => setFormData({...formData, shippingThreshold: Number(e.target.value)})}
                    min="0"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Tax Rate (%)</label>
                  <input 
                    type="number" 
                    value={formData.taxRate}
                    onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <div className="admin-form-actions justify-end">
            {saved && <span className="text-success mr-4">Settings saved successfully!</span>}
            <button type="submit" className="admin-btn admin-btn-primary">
              Save All Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

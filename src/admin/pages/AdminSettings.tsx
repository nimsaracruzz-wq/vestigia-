import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";

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
      <div className="admin-page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure store preferences and policies.</p>
        </div>
      </div>

      <div className="admin-settings-layout">
        <form onSubmit={handleSubmit}>
          <div className="admin-panel mb-8">
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
          </div>

          <div className="admin-panel mb-8">
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
          </div>

          <div className="admin-panel mb-8">
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
          </div>

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

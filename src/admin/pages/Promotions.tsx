import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Modal } from "../components/Modal";
import { Plus, Trash2 } from "lucide-react";

export default function Promotions() {
  const { promoCodes, addPromoCode, togglePromoCode, deletePromoCode } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discount: 10,
    type: "percentage",
    maxUses: "",
    expiry: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPromoCode({
      code: formData.code.toUpperCase(),
      discount: Number(formData.discount),
      type: formData.type as "percentage" | "fixed",
      maxUses: formData.maxUses ? Number(formData.maxUses) : null,
      expiry: formData.expiry || null,
      active: true
    });
    setIsModalOpen(false);
    setFormData({ code: "", discount: 10, type: "percentage", maxUses: "", expiry: "" });
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Promotions</h1>
          <p>Create and manage discount codes.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Add Promo Code
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-content p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map(promo => (
                <tr key={promo.id}>
                  <td><strong>{promo.code}</strong></td>
                  <td>
                    {promo.type === "percentage" ? `${promo.discount}%` : `$${promo.discount}`}
                  </td>
                  <td>
                    {promo.uses} {promo.maxUses ? `/ ${promo.maxUses}` : ""}
                  </td>
                  <td>
                    <button 
                      className={`admin-toggle-btn ${promo.active ? 'active' : ''}`}
                      onClick={() => togglePromoCode(promo.id)}
                    >
                      {promo.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="text-right">
                    <button onClick={() => deletePromoCode(promo.id)} className="text-danger" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Promo Code">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label>Code</label>
            <input 
              type="text" 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value})} 
              required 
              placeholder="e.g. SUMMER26"
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Discount Type</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Discount Value</label>
              <input 
                type="number" 
                value={formData.discount} 
                onChange={e => setFormData({...formData, discount: Number(e.target.value)})} 
                required 
                min="1"
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Max Uses (Optional)</label>
              <input 
                type="number" 
                value={formData.maxUses} 
                onChange={e => setFormData({...formData, maxUses: e.target.value})} 
                min="1"
              />
            </div>
            <div className="admin-form-group">
              <label>Expiry Date (Optional)</label>
              <input 
                type="date" 
                value={formData.expiry} 
                onChange={e => setFormData({...formData, expiry: e.target.value})} 
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={() => setIsModalOpen(false)} className="admin-btn admin-btn-secondary">Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary">Create Code</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState } from "react";
import { type Product, type SizeChart, type SizeChartRow } from "../../data";
import { Plus, Trash2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const DEFAULT_COLUMNS = ["Size", "Chest", "Waist", "Length"];

function buildEmptySizeChart(): SizeChart {
  return {
    unit: "in",
    columns: [...DEFAULT_COLUMNS],
    rows: [],
    notes: "",
  };
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    category: initialData?.category || "Clothing",
    price: initialData?.price || 0,
    compareAt: initialData?.compareAt || "",
    badge: initialData?.badge || "",
    image: initialData?.image || "",
    description: initialData?.description || "",
    sizes: initialData?.sizes.join(", ") || "",
    colors: initialData?.colors.join(", ") || "",
  });

  const [hasSizeChart, setHasSizeChart] = useState(!!initialData?.sizeChart);
  const [sizeChart, setSizeChart] = useState<SizeChart>(
    initialData?.sizeChart ?? buildEmptySizeChart()
  );

  // ── form field changes ──────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── size chart helpers ──────────────────────────────────────────────────
  const updateColumn = (idx: number, value: string) => {
    setSizeChart(prev => {
      const cols = [...prev.columns];
      cols[idx] = value;
      return { ...prev, columns: cols };
    });
  };

  const addColumn = () => {
    setSizeChart(prev => ({
      ...prev,
      columns: [...prev.columns, ""],
    }));
  };

  const removeColumn = (idx: number) => {
    if (idx === 0) return; // never remove "Size" column
    setSizeChart(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== idx),
    }));
  };

  const addRow = () => {
    setSizeChart(prev => ({
      ...prev,
      rows: [...prev.rows, { size: "" }],
    }));
  };

  const removeRow = (rowIdx: number) => {
    setSizeChart(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== rowIdx),
    }));
  };

  const updateCell = (rowIdx: number, colKey: string, value: string) => {
    setSizeChart(prev => {
      const rows = prev.rows.map((row, i) =>
        i === rowIdx ? { ...row, [colKey]: value } : row
      );
      return { ...prev, rows };
    });
  };

  // ── submit ──────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: Number(formData.price),
      compareAt: formData.compareAt ? Number(formData.compareAt) : undefined,
      sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean),
      colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
      images: initialData?.images || [formData.image],
      alt: initialData?.alt || formData.name,
      details: initialData?.details || [],
      care: initialData?.care || [],
      rating: initialData?.rating || 0,
      reviews: initialData?.reviews || [],
      id: initialData?.id,
      sizeChart: hasSizeChart ? sizeChart : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-group">
        <label>Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label>Category</label>
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="New">New</option>
            <option value="Clothing">Clothing</option>
            <option value="Accessories">Accessories</option>
            <option value="Sale">Sale</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>Badge (Optional)</label>
          <input type="text" name="badge" value={formData.badge} onChange={handleChange} />
        </div>
      </div>

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label>Price</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" />
        </div>
        <div className="admin-form-group">
          <label>Compare At Price (Optional)</label>
          <input type="number" name="compareAt" value={formData.compareAt} onChange={handleChange} min="0" step="0.01" />
        </div>
      </div>

      <div className="admin-form-group">
        <label>Image URL</label>
        <input type="url" name="image" value={formData.image} onChange={handleChange} required />
      </div>

      <div className="admin-form-row">
        <div className="admin-form-group">
          <label>Sizes (comma separated)</label>
          <input type="text" name="sizes" value={formData.sizes} onChange={handleChange} placeholder="XS, S, M, L, XL" />
        </div>
        <div className="admin-form-group">
          <label>Colors (comma separated hex/names)</label>
          <input type="text" name="colors" value={formData.colors} onChange={handleChange} placeholder="#000, #fff" />
        </div>
      </div>

      <div className="admin-form-group">
        <label>Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows={4} required />
      </div>

      {/* ── Size Chart Section ──────────────────────────────────────────────── */}
      <div className="admin-size-chart-section">
        <div className="admin-size-chart-toggle-row">
          <label className="admin-toggle-label">
            <input
              type="checkbox"
              checked={hasSizeChart}
              onChange={(e) => setHasSizeChart(e.target.checked)}
            />
            <span>Include Size Chart</span>
          </label>
          {hasSizeChart && (
            <div className="admin-form-group inline-unit">
              <label>Unit</label>
              <select
                value={sizeChart.unit}
                onChange={(e) => setSizeChart(prev => ({ ...prev, unit: e.target.value as "in" | "cm" }))}
              >
                <option value="in">inches (in)</option>
                <option value="cm">centimetres (cm)</option>
              </select>
            </div>
          )}
        </div>

        {hasSizeChart && (
          <div className="admin-size-chart-editor">
            {/* Columns editor */}
            <div className="admin-sc-columns-row">
              <span className="admin-sc-label">Columns:</span>
              {sizeChart.columns.map((col, idx) => (
                <div key={idx} className="admin-sc-column-cell">
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => updateColumn(idx, e.target.value)}
                    placeholder={idx === 0 ? "Size" : `Measure ${idx}`}
                    disabled={idx === 0}
                  />
                  {idx > 0 && (
                    <button type="button" className="admin-sc-remove-col" onClick={() => removeColumn(idx)} title="Remove column">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="admin-sc-add-col-btn" onClick={addColumn} title="Add column">
                <Plus size={14} /> Col
              </button>
            </div>

            {/* Rows editor */}
            <div className="admin-sc-rows-wrapper">
              <table className="admin-sc-table">
                <thead>
                  <tr>
                    {sizeChart.columns.map((col) => (
                      <th key={col}>{col || "—"}</th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sizeChart.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td>
                        <input
                          type="text"
                          value={row.size}
                          onChange={(e) => updateCell(rowIdx, "size", e.target.value)}
                          placeholder="XS"
                        />
                      </td>
                      {sizeChart.columns.slice(1).map((col) => {
                        const key = col.toLowerCase();
                        return (
                          <td key={col}>
                            <input
                              type="text"
                              value={row[key] ?? ""}
                              onChange={(e) => updateCell(rowIdx, key, e.target.value)}
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                      <td>
                        <button type="button" className="admin-sc-remove-row" onClick={() => removeRow(rowIdx)} title="Remove row">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="admin-sc-add-row-btn" onClick={addRow}>
                <Plus size={14} /> Add Row
              </button>
            </div>

            {/* Notes */}
            <div className="admin-form-group">
              <label>Fit Notes (optional)</label>
              <input
                type="text"
                value={sizeChart.notes ?? ""}
                onChange={(e) => setSizeChart(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. This style runs slightly oversized."
              />
            </div>
          </div>
        )}
      </div>

      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary">Save Product</button>
      </div>
    </form>
  );
}

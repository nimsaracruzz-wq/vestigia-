import React, { useEffect, useState } from "react";
import { type Product, type SizeChart, type SizeChartRow } from "../../data";
import { Plus, Trash2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const DEFAULT_COLUMNS = ["Size", "Chest", "Waist", "Length"];
const API_BASE_URL = "http://127.0.0.1:4000/api";

const normalizeColumnKey = (label: string) =>
  label.trim().toLowerCase().replace(/\s+/g, "_");

function buildRowFromColumns(columns: string[]): SizeChartRow {
  const row: SizeChartRow = { size: "" };
  columns.slice(1).forEach((column) => {
    row[normalizeColumnKey(column)] = "";
  });
  return row;
}

function buildEmptySizeChart(): SizeChart {
  return {
    unit: "in",
    columns: [...DEFAULT_COLUMNS],
    rows: [],
    notes: "",
  };
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [photos, setPhotos] = useState<string[]>(() => {
    const list: string[] = [];
    if (initialData?.image) list.push(initialData.image);
    if (initialData?.images) {
      initialData.images.forEach(img => {
        if (img && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    return list.slice(0, 6);
  });
  const [mainPhoto, setMainPhoto] = useState<string>(initialData?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 6) {
      setImageError("Maximum 6 photos allowed.");
      return;
    }

    setIsUploading(true);
    setImageError("");

    try {
      const data = new FormData();
      data.append("file", file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: data
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const resJson = await response.json();
      const uploadedUrl = resJson.url;

      setPhotos(prev => {
        const next = [...prev, uploadedUrl];
        if (!mainPhoto) {
          setMainPhoto(uploadedUrl);
        }
        return next;
      });
    } catch (err: any) {
      console.error(err);
      setImageError("Error uploading image. Please try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const movePhoto = (index: number, direction: "left" | "right") => {
    setPhotos(prev => {
      const next = [...prev];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const removedUrl = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (mainPhoto === removedUrl) {
        setMainPhoto(next[0] || "");
      }
      return next;
    });
  };

  const setAsMain = (url: string) => {
    setMainPhoto(url);
  };

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
    seoTitle: initialData?.seoTitle || "",
    seoDescription: initialData?.seoDescription || "",
    seoKeywords: initialData?.seoKeywords || "",
    alt: initialData?.alt || "",
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
      const oldKey = normalizeColumnKey(cols[idx]);
      cols[idx] = value;
      const newKey = normalizeColumnKey(value);

      if (idx === 0) {
        return { ...prev, columns: cols };
      }

      const rows = prev.rows.map((row) => {
        const nextRow = { ...row };
        if (oldKey !== newKey && oldKey in nextRow) {
          nextRow[newKey] = nextRow[oldKey];
          delete nextRow[oldKey];
        }
        if (!(newKey in nextRow)) {
          nextRow[newKey] = "";
        }
        return nextRow;
      });

      return { ...prev, columns: cols, rows };
    });
  };

  const addColumn = () => {
    setSizeChart(prev => {
      const nextColumn = `Measure ${prev.columns.length}`;
      const nextKey = normalizeColumnKey(nextColumn);
      return {
        ...prev,
        columns: [...prev.columns, nextColumn],
        rows: prev.rows.map((row) => ({ ...row, [nextKey]: "" })),
      };
    });
  };

  const removeColumn = (idx: number) => {
    if (idx === 0) return; // never remove "Size" column
    setSizeChart(prev => {
      const removedKey = normalizeColumnKey(prev.columns[idx]);
      return {
        ...prev,
        columns: prev.columns.filter((_, i) => i !== idx),
        rows: prev.rows.map((row) => {
          const { [removedKey]: _, ...rest } = row as Record<string, string | undefined>;
          return {
            ...rest,
            size: row.size,
          } as SizeChartRow;
        }),
      };
    });
  };

  const addRow = () => {
    setSizeChart(prev => ({
      ...prev,
      rows: [...prev.rows, buildRowFromColumns(prev.columns)],
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
    if (photos.length === 0) {
      setImageError("Please upload at least one product photo.");
      return;
    }

    const primaryImage = mainPhoto || photos[0];

    setImageError("");
    onSubmit({
      ...formData,
      price: Number(formData.price),
      compareAt: formData.compareAt ? Number(formData.compareAt) : undefined,
      sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean),
      colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
      image: primaryImage,
      images: photos,
      alt: formData.alt || formData.name,
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

      <div className="admin-form-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
          Product Photos (Max 6, Reorder & Select Main)
        </label>
        
        {/* Photos Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "14px",
          marginBottom: "12px"
        }}>
          {photos.map((url, index) => {
            const isMain = url === mainPhoto;
            return (
              <div key={index} style={{
                position: "relative",
                border: isMain ? "2px solid #111" : "1px solid #ddd",
                borderRadius: "8px",
                padding: "4px",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}>
                <img
                  src={url}
                  alt={`Product pic ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    marginBottom: "6px"
                  }}
                />
                
                {/* Main badge */}
                {isMain && (
                  <span style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    background: "#111",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: "700",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase"
                  }}>
                    Main
                  </span>
                )}

                {/* Actions overlay / bottom */}
                <div style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  gap: "4px"
                }}>
                  <button
                    type="button"
                    onClick={() => setAsMain(url)}
                    disabled={isMain}
                    style={{
                      flex: 1,
                      fontSize: "9px",
                      padding: "4px 2px",
                      background: isMain ? "#eee" : "#111",
                      color: isMain ? "#888" : "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isMain ? "not-allowed" : "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Main
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    style={{
                      padding: "4px 6px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    title="Delete photo"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Move controls */}
                <div style={{
                  display: "flex",
                  width: "100%",
                  marginTop: "6px",
                  gap: "4px"
                }}>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePhoto(index, "left")}
                    style={{
                      flex: 1,
                      fontSize: "9px",
                      padding: "3px",
                      background: "#f3f4f6",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: index === 0 ? "not-allowed" : "pointer"
                    }}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={index === photos.length - 1}
                    onClick={() => movePhoto(index, "right")}
                    style={{
                      flex: 1,
                      fontSize: "9px",
                      padding: "3px",
                      background: "#f3f4f6",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: index === photos.length - 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            );
          })}

          {/* Upload slot (if < 6 photos) */}
          {photos.length < 6 && (
            <label style={{
              border: "2px dashed #ccc",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "195px",
              cursor: isUploading ? "wait" : "pointer",
              background: "#fafafa"
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: "none" }}
              />
              <Plus size={20} color="#888" />
              <span style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>
                {isUploading ? "Uploading..." : "Add Photo"}
              </span>
            </label>
          )}
        </div>
        
        {imageError && <span className="error-text" style={{ color: "#dc2626", fontSize: "12px" }}>{imageError}</span>}
      </div>

      <div className="admin-form-group">
        <label>Image Alt Text (Accessibility &amp; SEO)</label>
        <input
          type="text"
          name="alt"
          value={formData.alt}
          onChange={handleChange}
          placeholder="Describe the image context (e.g. Charcoal merino wool sweater)"
        />
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

      {/* ── SEO Settings Section ────────────────────────────────────────────── */}
      <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "14px", color: "#111" }}>SEO Settings</h3>
        <div className="admin-form-group">
          <label>Meta Title</label>
          <input
            type="text"
            name="seoTitle"
            value={formData.seoTitle}
            onChange={handleChange}
            placeholder="Search engine title tag"
          />
        </div>
        <div className="admin-form-group">
          <label>Meta Description</label>
          <textarea
            name="seoDescription"
            value={formData.seoDescription}
            onChange={handleChange}
            placeholder="Search engine description snippet"
            rows={2}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", fontFamily: "inherit" }}
          />
        </div>
        <div className="admin-form-group">
          <label>Meta Keywords</label>
          <input
            type="text"
            name="seoKeywords"
            value={formData.seoKeywords}
            onChange={handleChange}
            placeholder="e.g. luxury apparel, minimalist, Italian cotton"
          />
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary">Save Product</button>
      </div>
    </form>
  );
}

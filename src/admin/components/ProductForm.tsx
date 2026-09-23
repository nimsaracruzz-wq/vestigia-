import React, { useEffect, useState } from "react";
import { type Product, type SizeChart, type SizeChartRow } from "../../data";
import { Plus, Trash2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const DEFAULT_COLUMNS = ["Size", "Chest", "Waist", "Length"];
const API_BASE_URL = "/api";

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
    const list = initialData?.images?.filter(Boolean) || [];
    return list.length > 0 ? list.slice(0, 6) : initialData?.image ? [initialData.image] : [];
  });
  const [modelImage, setModelImage] = useState(initialData?.modelImage || initialData?.image || "");
  const [productImage, setProductImage] = useState(initialData?.productImage || initialData?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, role: "model" | "product" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (role === "gallery" && photos.length >= 6) {
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
        let errMsg = `Server error ${response.status}`;
        try {
          const errJson = await response.json();
          errMsg = errJson.error || errMsg;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      const uploadedUrl = resJson.url;

      if (!uploadedUrl) {
        throw new Error("No URL returned from server");
      }

      if (role === "model") setModelImage(uploadedUrl);
      if (role === "product") setProductImage(uploadedUrl);
      if (role === "gallery") setPhotos(prev => [...prev, uploadedUrl]);
    } catch (err: any) {
      console.error("Image upload error:", err);
      setImageError(`Error uploading image: ${err.message || "Please try again."}`);
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
      return next;
    });
  };

  const mainPhoto = modelImage;
  const setAsMain = (url: string) => setModelImage(url);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    category: initialData?.category || "Clothing",
    productType: initialData?.productType || "",
    price: initialData?.price || 0,
    compareAt: initialData?.compareAt || "",
    badge: initialData?.badge || "",
    image: initialData?.image || "",
    modelImage: initialData?.modelImage || initialData?.image || "",
    productImage: initialData?.productImage || initialData?.image || "",
    description: initialData?.description || "",
    sizes: initialData?.sizes.join(", ") || "",
    colors: initialData?.colors.join(", ") || "",
    seoTitle: initialData?.seoTitle || "",
    seoDescription: initialData?.seoDescription || "",
    seoKeywords: initialData?.seoKeywords || "",
    canonicalUrl: initialData?.canonicalUrl || "",
    robotsIndex: initialData?.robotsIndex ?? true,
    robotsFollow: initialData?.robotsFollow ?? true,
    brand: initialData?.brand || "Vestigia",
    sku: initialData?.sku || "",
    gtin: initialData?.gtin || "",
    mpn: initialData?.mpn || "",
    condition: initialData?.condition || "new",
    googleProductCategory: initialData?.googleProductCategory || "Apparel & Accessories > Clothing",
    material: initialData?.material || "",
    gender: initialData?.gender || "unisex",
    ageGroup: initialData?.ageGroup || "adult",
    imageTitle: initialData?.imageTitle || "",
    alt: initialData?.alt || "",
  });

  const [prices, setPrices] = useState(() => ({
    USD: initialData?.prices?.USD ?? { priceMinor: 0, compareAtMinor: null },
    EUR: initialData?.prices?.EUR ?? { priceMinor: 0, compareAtMinor: null },
    JPY: initialData?.prices?.JPY ?? { priceMinor: 0, compareAtMinor: null },
  }));

  const [isSlugEdited, setIsSlugEdited] = useState(!!initialData?.slug);
  const [isSeoTitleEdited, setIsSeoTitleEdited] = useState(!!initialData?.seoTitle);
  const [isSeoDescriptionEdited, setIsSeoDescriptionEdited] = useState(!!initialData?.seoDescription);
  const [isSeoKeywordsEdited, setIsSeoKeywordsEdited] = useState(!!initialData?.seoKeywords);
  const [isAltEdited, setIsAltEdited] = useState(!!initialData?.alt);

  const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start
      .replace(/-+$/, '');            // Trim - from end
  };

  // Safely parse sizeChart — backend may return it as a raw JSON string or a pre-parsed object
  const parsedSizeChart = (() => {
    const sc = initialData?.sizeChart;
    if (!sc) return null;
    if (typeof sc === "string") {
      try { return JSON.parse(sc) as SizeChart; } catch { return null; }
    }
    return sc as SizeChart;
  })();

  const [hasSizeChart, setHasSizeChart] = useState(!!parsedSizeChart);
  const [sizeChart, setSizeChart] = useState<SizeChart>(
    parsedSizeChart ?? buildEmptySizeChart()
  );

  const [stockLevels, setStockLevels] = useState<Record<string, number>>(() => {
    const inv = initialData?.inventory;
    if (!inv) return {};
    if (typeof inv === "string") {
      try { return JSON.parse(inv); } catch { return {}; }
    }
    return inv as Record<string, number>;
  });

  const handleStockChange = (color: string, size: string, val: number) => {
    setStockLevels(prev => ({
      ...prev,
      [`${color}_${size}`]: val
    }));
  };

  const colorsList = formData.colors.split(",").map(c => c.trim()).filter(Boolean);
  const sizesList = formData.sizes.split(",").map(s => s.trim()).filter(Boolean);

  // ── form field changes ──────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const fieldValue = e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : value;
    
    // Mark manual edits
    if (name === "slug") setIsSlugEdited(true);
    if (name === "seoTitle") setIsSeoTitleEdited(true);
    if (name === "seoDescription") setIsSeoDescriptionEdited(true);
    if (name === "seoKeywords") setIsSeoKeywordsEdited(true);
    if (name === "alt") setIsAltEdited(true);

    setFormData(prev => {
      const next = { ...prev, [name]: fieldValue };

      // Auto-generate fields on name/title change
      if (name === "name") {
        if (!isSlugEdited) {
          next.slug = slugify(value);
        }
        if (!isSeoTitleEdited) {
          next.seoTitle = value ? `${value} | Vestigia` : "";
        }
        if (!isSeoKeywordsEdited) {
          next.seoKeywords = value
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .join(", ");
        }
        if (!isAltEdited) {
          next.alt = value;
        }
        if (!next.sku) {
          next.sku = slugify(value).toUpperCase().replace(/-/g, "-").slice(0, 40);
        }
      }

      // Auto-generate description metadata on description change
      if (name === "description") {
        if (!isSeoDescriptionEdited) {
          next.seoDescription = value.replace(/\r?\n/g, " ").substring(0, 155);
        }
      }

      return next;
    });
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
    if (photos.length === 0 && !modelImage && !productImage) {
      setImageError("Please upload at least one product photo.");
      return;
    }

    const primaryImage = modelImage || productImage || photos[0];
    const galleryImages = photos.length > 0 ? photos : [primaryImage];

    setImageError("");
    onSubmit({
      ...formData,
      price: Number(formData.price),
      prices: initialData?.prices || {},
      priceChangeReason: "Product details updated; use Pricing Control for prices",
      compareAt: formData.compareAt ? Number(formData.compareAt) : undefined,
      sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean),
      colors: formData.colors.split(",").map(c => c.trim()).filter(Boolean),
      image: primaryImage,
      modelImage,
      productImage,
      images: galleryImages,
      alt: formData.alt || formData.name,
      details: initialData?.details || [],
      care: initialData?.care || [],
      rating: initialData?.rating || 0,
      reviews: initialData?.reviews || [],
      id: initialData?.id,
      sizeChart: hasSizeChart ? sizeChart : undefined,
      inventory: (() => {
        const cleaned: Record<string, number> = {};
        colorsList.forEach(color => {
          sizesList.forEach(size => {
            const key = `${color}_${size}`;
            cleaned[key] = stockLevels[key] !== undefined ? stockLevels[key] : 10;
          });
        });
        return cleaned;
      })(),
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
        <div className="admin-form-group product-type-field">
          <label htmlFor="product-type-input">Product Type / Subtitle</label>
          <input id="product-type-input" type="text" name="productType" value={formData.productType} onChange={handleChange} placeholder="e.g. Premium Heavyweight Oversized T-Shirt" />
          <span className="product-type-hint">Shown beneath the product name across the storefront.</span>
        </div>
      </div>

      <p>Base and market prices are managed in <a href="/admin/pricing">Pricing Control</a>, with a confirmation and change history.</p>
      <div className="admin-form-group">
        <label>Badge (Optional)</label>
        <input type="text" name="badge" value={formData.badge} onChange={handleChange} />
      </div>

      <div className="admin-form-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>PRODUCT MEDIA</label>
        <p style={{ color: "#666", fontSize: "12px", margin: "0 0 14px" }}>
          Assign exactly which image is used for editorial discovery, transactional references, and product detail.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
          {([
            ["MODEL / LIFESTYLE IMAGE", modelImage, setModelImage, "Shop / Collection / Featured Products"],
            ["PRODUCT-ONLY IMAGE", productImage, setProductImage, "Search / Cart / Checkout / Orders"],
          ] as const).map(([label, value, setter, usage]) => (
            <div key={label} style={{ border: "1px solid #e2e2e2", borderRadius: "8px", padding: "12px", background: "#fff" }}>
              <strong style={{ display: "block", fontSize: "11px", letterSpacing: "0.04em" }}>{label}</strong>
              <span style={{ display: "block", color: "#777", fontSize: "11px", margin: "5px 0 10px" }}>Used for: {usage}</span>
              {value ? <img src={value} alt={label} style={{ width: "100%", height: "145px", objectFit: "cover", borderRadius: "5px", marginBottom: "8px" }} /> : <div style={{ height: "145px", background: "#f5f5f5", borderRadius: "5px", marginBottom: "8px" }} />}
              <div style={{ display: "flex", gap: "6px" }}>
                <label style={{ flex: 1, cursor: isUploading ? "wait" : "pointer", background: "#111", color: "#fff", borderRadius: "4px", padding: "8px", textAlign: "center", fontSize: "11px" }}>
                  {value ? "Replace Image" : "Upload Image"}
                  <input type="file" accept="image/*" disabled={isUploading} onChange={(event) => handleFileChange(event, label.startsWith("MODEL") ? "model" : "product")} style={{ display: "none" }} />
                </label>
                {value && <button type="button" onClick={() => setter("")} style={{ border: "1px solid #ddd", borderRadius: "4px", background: "#fff", padding: "0 9px" }}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-form-group" style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
          PRODUCT GALLERY (Optional, Max 6)
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
                    Model
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
                onChange={(event) => handleFileChange(event, "gallery")}
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

      {/* ── Variant Stock Management ── */}
      <div style={{
        border: "1px solid #e8e8e8",
        borderRadius: "8px",
        padding: "20px",
        background: "#fafafa",
        marginBottom: "12px"
      }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "4px" }}>Variant Stock Levels</h3>
        <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "16px" }}>
          Configure inventory stock counts for each size and color variant combination.
        </p>

        {colorsList.length === 0 || sizesList.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
            Add colors and sizes above to configure variant stock levels.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            {colorsList.map(color => (
              sizesList.map(size => {
                const key = `${color}_${size}`;
                const stockVal = stockLevels[key] !== undefined ? stockLevels[key] : 10;
                return (
                  <div key={key} style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "#fff",
                    border: "1px solid #eaeaea",
                    borderRadius: "6px",
                    padding: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        className="color-dot"
                        style={{
                          backgroundColor: color,
                          border: color.toLowerCase() === "#ffffff" || color.toLowerCase() === "white" ? "1px solid #ddd" : "none",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%"
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#333" }}>
                        {color} / {size}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={stockVal}
                      min="0"
                      onChange={(e) => handleStockChange(color, size, Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        padding: "6px 8px",
                        fontSize: "0.9rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px"
                      }}
                    />
                  </div>
                );
              })
            ))}
          </div>
        )}
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
          <label>URL Slug (e.g. vestigia-signature-tee)</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ paddingRight: "6px", color: "#888", fontSize: "14px" }}>https://thevestigia.com/product/</span>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="url-slug"
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>
              <input
                type="checkbox"
                name="robotsIndex"
                checked={Boolean(formData.robotsIndex)}
                onChange={handleChange}
                style={{ marginRight: "8px" }}
              />
              Allow search indexing
            </label>
          </div>
          <div className="admin-form-group">
            <label>
              <input
                type="checkbox"
                name="robotsFollow"
                checked={Boolean(formData.robotsFollow)}
                onChange={handleChange}
                style={{ marginRight: "8px" }}
              />
              Allow link following
            </label>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Canonical URL Override</label>
          <input
            type="url"
            name="canonicalUrl"
            value={String(formData.canonicalUrl)}
            onChange={handleChange}
            placeholder="Leave blank to use the product slug URL"
          />
        </div>
        <div className="admin-form-group">
          <label>Meta Title</label>
          <input
            type="text"
            name="seoTitle"
            value={formData.seoTitle}
            onChange={handleChange}
            placeholder="Search engine title tag"
          />
          <span className="product-type-hint">{String(formData.seoTitle).length}/60 characters</span>
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
          <span className="product-type-hint">{String(formData.seoDescription).length}/155 characters</span>
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
        <div className="admin-form-group">
          <label>Image Title</label>
          <input
            type="text"
            name="imageTitle"
            value={String(formData.imageTitle)}
            onChange={handleChange}
            placeholder="Optional image title for image sitemap"
          />
        </div>
      </div>

      <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "14px", color: "#111" }}>Merchant Catalog</h3>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Brand</label>
            <input type="text" name="brand" value={String(formData.brand)} onChange={handleChange} />
          </div>
          <div className="admin-form-group">
            <label>SKU</label>
            <input type="text" name="sku" value={String(formData.sku)} onChange={handleChange} placeholder="VST-AURELIUS-BLK" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>GTIN</label>
            <input type="text" name="gtin" value={String(formData.gtin)} onChange={handleChange} placeholder="Optional barcode/GTIN" />
          </div>
          <div className="admin-form-group">
            <label>MPN</label>
            <input type="text" name="mpn" value={String(formData.mpn)} onChange={handleChange} placeholder="Manufacturer part number" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Condition</label>
            <select name="condition" value={String(formData.condition)} onChange={handleChange}>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>Google Product Category</label>
            <input
              type="text"
              name="googleProductCategory"
              value={String(formData.googleProductCategory)}
              onChange={handleChange}
              placeholder="Apparel & Accessories > Clothing"
            />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Material</label>
            <input type="text" name="material" value={String(formData.material)} onChange={handleChange} placeholder="280 GSM cotton jersey" />
          </div>
          <div className="admin-form-group">
            <label>Gender</label>
            <select name="gender" value={String(formData.gender)} onChange={handleChange}>
              <option value="unisex">Unisex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Age Group</label>
          <select name="ageGroup" value={String(formData.ageGroup)} onChange={handleChange}>
            <option value="adult">Adult</option>
            <option value="teen">Teen</option>
            <option value="kids">Kids</option>
          </select>
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary">Save Product</button>
      </div>
    </form>
  );
}

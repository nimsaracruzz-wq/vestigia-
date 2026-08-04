import React, { useState, useEffect } from "react";
import {
  Globe,
  Truck,
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Info,
  DollarSign,
  Clock,
  Shield,
  FileText,
  Calendar
} from "lucide-react";

type Region = {
  id: number;
  name: string;
  isActive: boolean;
  countries?: Country[];
  methods?: ShippingMethod[];
};

type Country = {
  id: number;
  regionId: number;
  countryCode: string;
  countryName: string;
  isEnabled: boolean;
  currency: string;
  displayOrder: number;
  region?: { id: number; name: string };
};

type ShippingMethod = {
  id: number;
  regionId: number;
  name: string;
  description: string | null;
  price: number;
  estimatedDays: string;
  freeShippingThreshold: number | null;
  isActive: boolean;
  region?: { id: number; name: string };
};

type Announcement = {
  id: number;
  countryCode: string | null;
  message: string;
  isSuspended: boolean;
  active: boolean;
  createdAt: string;
};

type Log = {
  id: number;
  action: string;
  details: string;
  createdAt: string;
};

type Stats = {
  totalCountries: number;
  enabledCountries: number;
  disabledCountries: number;
  totalRegions: number;
  avgCost: number;
  mostUsedMethod: string;
};

export default function AdminShipping() {
  const [activeTab, setActiveTab] = useState<"regions" | "countries" | "methods" | "announcements" | "stats">("regions");

  // State
  const [regions, setRegions] = useState<Region[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [selectedCountryIds, setSelectedCountryIds] = useState<number[]>([]);

  // Modals
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionNameInput, setRegionNameInput] = useState("");
  const [regionActiveInput, setRegionActiveInput] = useState(true);

  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [cRegionId, setCRegionId] = useState<number>(0);
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [cEnabled, setCEnabled] = useState(true);
  const [cCurrency, setCCurrency] = useState("USD");

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [mRegionId, setMRegionId] = useState<number>(0);
  const [mName, setMName] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mPrice, setMPrice] = useState<number>(15);
  const [mDays, setMDays] = useState("3-5 Days");
  const [mThreshold, setMThreshold] = useState<string>("");
  const [mActive, setMActive] = useState(true);

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [aCountryCode, setACountryCode] = useState("");
  const [aMessage, setAMessage] = useState("");
  const [aIsSuspended, ASetIsSuspended] = useState(false);

  // Toast / Feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [rRes, cRes, mRes, aRes, lRes, sRes] = await Promise.all([
        fetch("/api/admin/shipping/regions").then((r) => r.json()),
        fetch("/api/admin/shipping/countries").then((r) => r.json()),
        fetch("/api/admin/shipping/methods").then((r) => r.json()),
        fetch("/api/admin/shipping/announcements").then((r) => r.json()),
        fetch("/api/admin/shipping/logs").then((r) => r.json()),
        fetch("/api/admin/shipping/stats").then((r) => r.json()),
      ]);

      if (Array.isArray(rRes)) setRegions(rRes);
      if (Array.isArray(cRes)) setCountries(cRes);
      if (Array.isArray(mRes)) setMethods(mRes);
      if (Array.isArray(aRes)) setAnnouncements(aRes);
      if (Array.isArray(lRes)) setLogs(lRes);
      if (sRes && !sRes.error) setStats(sRes);
    } catch (err: any) {
      showToast("Failed to load shipping data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ── REGION ACTIONS ──
  const handleOpenRegionModal = (reg?: Region) => {
    if (reg) {
      setEditingRegion(reg);
      setRegionNameInput(reg.name);
      setRegionActiveInput(reg.isActive);
    } else {
      setEditingRegion(null);
      setRegionNameInput("");
      setRegionActiveInput(true);
    }
    setRegionModalOpen(true);
  };

  const handleSaveRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionNameInput.trim()) return;

    try {
      const url = editingRegion
        ? `/api/admin/shipping/region/${editingRegion.id}`
        : "/api/admin/shipping/region";
      const method = editingRegion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regionNameInput.trim(), isActive: regionActiveInput }),
      });

      if (!res.ok) throw new Error("Failed to save region");

      showToast(`Region "${regionNameInput}" saved successfully`);
      setRegionModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteRegion = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete region "${name}"? This will delete associated methods.`)) return;

    try {
      const res = await fetch(`/api/admin/shipping/region/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete region");
      showToast(`Region "${name}" deleted`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ── COUNTRY ACTIONS ──
  const handleOpenCountryModal = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setCRegionId(country.regionId);
      setCCode(country.countryCode);
      setCName(country.countryName);
      setCEnabled(country.isEnabled);
      setCCurrency(country.currency || "USD");
    } else {
      setEditingCountry(null);
      setCRegionId(regions[0]?.id || 1);
      setCCode("");
      setCName("");
      setCEnabled(true);
      setCCurrency("USD");
    }
    setCountryModalOpen(true);
  };

  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim() || !cName.trim() || !cRegionId) return;

    try {
      const url = editingCountry
        ? `/api/admin/shipping/country/${editingCountry.id}`
        : "/api/admin/shipping/country";
      const method = editingCountry ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: cRegionId,
          countryCode: cCode.trim().toUpperCase(),
          countryName: cName.trim(),
          isEnabled: cEnabled,
          currency: cCurrency.trim().toUpperCase(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save country");

      showToast(`Country "${cName}" saved successfully`);
      setCountryModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleToggleCountryStatus = async (country: Country) => {
    try {
      const res = await fetch(`/api/admin/shipping/country/${country.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !country.isEnabled }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setCountries((prev) =>
        prev.map((c) => (c.id === country.id ? { ...c, isEnabled: !c.isEnabled } : c))
      );
      showToast(`${country.countryName} shipping ${!country.isEnabled ? "Enabled" : "Disabled"}`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleBulkToggleCountries = async (isEnabled: boolean) => {
    if (selectedCountryIds.length === 0) return;

    try {
      const res = await fetch("/api/admin/shipping/countries/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedCountryIds, isEnabled }),
      });

      if (!res.ok) throw new Error("Failed to update countries");

      showToast(`Updated ${selectedCountryIds.length} countries to ${isEnabled ? "Enabled" : "Disabled"}`);
      setSelectedCountryIds([]);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ── METHOD ACTIONS ──
  const handleOpenMethodModal = (methodItem?: ShippingMethod) => {
    if (methodItem) {
      setEditingMethod(methodItem);
      setMRegionId(methodItem.regionId);
      setMName(methodItem.name);
      setMDesc(methodItem.description || "");
      setMPrice(methodItem.price);
      setMDays(methodItem.estimatedDays);
      setMThreshold(methodItem.freeShippingThreshold ? String(methodItem.freeShippingThreshold) : "");
      setMActive(methodItem.isActive);
    } else {
      setEditingMethod(null);
      setMRegionId(regions[0]?.id || 1);
      setMName("");
      setMDesc("");
      setMPrice(15);
      setMDays("3-5 Days");
      setMThreshold("");
      setMActive(true);
    }
    setMethodModalOpen(true);
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim() || !mRegionId) return;

    try {
      const url = editingMethod
        ? `/api/admin/shipping/method/${editingMethod.id}`
        : "/api/admin/shipping/method";
      const method = editingMethod ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: mRegionId,
          name: mName.trim(),
          description: mDesc.trim() || null,
          price: Number(mPrice),
          estimatedDays: mDays.trim(),
          freeShippingThreshold: mThreshold !== "" ? Number(mThreshold) : null,
          isActive: mActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to save shipping method");

      showToast(`Method "${mName}" saved successfully`);
      setMethodModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteMethod = async (id: number, name: string) => {
    if (!window.confirm(`Delete method "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/shipping/method/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete method");
      showToast(`Shipping method "${name}" deleted`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ── ANNOUNCEMENTS ACTIONS ──
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aMessage.trim()) return;

    try {
      const res = await fetch("/api/admin/shipping/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: aCountryCode.trim() ? aCountryCode.trim().toUpperCase() : null,
          message: aMessage.trim(),
          isSuspended: aIsSuspended,
          active: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create announcement");

      showToast("Shipping announcement added");
      setAnnouncementModalOpen(false);
      setAMessage("");
      setACountryCode("");
      ASetIsSuspended(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await fetch(`/api/admin/shipping/announcements/${id}`, { method: "DELETE" });
      showToast("Announcement removed");
      fetchAllData();
    } catch (err: any) {
      showToast("Failed to delete announcement", "error");
    }
  };

  // Export JSON
  const handleExportJSON = async () => {
    try {
      const res = await fetch("/api/admin/shipping/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vestigia_shipping_config_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      showToast("Shipping configuration exported");
    } catch (err) {
      showToast("Failed to export settings", "error");
    }
  };

  // Filtered Countries
  const filteredCountries = countries.filter((c) => {
    const matchesSearch =
      c.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === "ALL" || String(c.regionId) === regionFilter;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="admin-shipping-page">
      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Truck size={24} /> Shipping Management System
          </h1>
          <p className="admin-page-subtitle">
            Configure global shipping regions, country eligibility, dynamic courier rates, and suspension alerts.
          </p>
        </div>
        <div className="admin-header-actions">
          <button className="admin-btn secondary" onClick={handleExportJSON}>
            <Download size={16} /> Export Config
          </button>
          <button className="admin-btn secondary" onClick={fetchAllData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {stats && (
        <div className="shipping-stats-grid">
          <div className="shipping-stat-card">
            <div className="stat-icon enabled">
              <CheckCircle size={22} />
            </div>
            <div>
              <span className="stat-label">Countries Enabled</span>
              <h3 className="stat-value">{stats.enabledCountries}</h3>
            </div>
          </div>
          <div className="shipping-stat-card">
            <div className="stat-icon disabled">
              <XCircle size={22} />
            </div>
            <div>
              <span className="stat-label">Countries Blocked</span>
              <h3 className="stat-value">{stats.disabledCountries}</h3>
            </div>
          </div>
          <div className="shipping-stat-card">
            <div className="stat-icon primary">
              <Globe size={22} />
            </div>
            <div>
              <span className="stat-label">Active Regions</span>
              <h3 className="stat-value">{stats.totalRegions}</h3>
            </div>
          </div>
          <div className="shipping-stat-card">
            <div className="stat-icon info">
              <Truck size={22} />
            </div>
            <div>
              <span className="stat-label">Top Courier Method</span>
              <h3 className="stat-value small">{stats.mostUsedMethod}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="shipping-tabs">
        <button
          className={`shipping-tab ${activeTab === "regions" ? "active" : ""}`}
          onClick={() => setActiveTab("regions")}
        >
          <Globe size={16} /> Regions ({regions.length})
        </button>
        <button
          className={`shipping-tab ${activeTab === "countries" ? "active" : ""}`}
          onClick={() => setActiveTab("countries")}
        >
          <MapPin size={16} /> Countries ({countries.length})
        </button>
        <button
          className={`shipping-tab ${activeTab === "methods" ? "active" : ""}`}
          onClick={() => setActiveTab("methods")}
        >
          <Truck size={16} /> Shipping Methods ({methods.length})
        </button>
        <button
          className={`shipping-tab ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          <AlertTriangle size={16} /> Suspensions & Alerts ({announcements.length})
        </button>
        <button
          className={`shipping-tab ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <FileText size={16} /> Audit History
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="shipping-skeleton">
          <RefreshCw className="spin-icon" size={32} />
          <p>Loading shipping matrix...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: REGIONS */}
          {activeTab === "regions" && (
            <div className="shipping-tab-content">
              <div className="tab-actions">
                <h3>Global Regions Configuration</h3>
                <button className="admin-btn primary" onClick={() => handleOpenRegionModal()}>
                  <Plus size={16} /> Add Region
                </button>
              </div>

              <div className="regions-grid">
                {regions.map((reg) => {
                  const regCountries = countries.filter((c) => c.regionId === reg.id);
                  const regMethods = methods.filter((m) => m.regionId === reg.id);
                  const enabledCount = regCountries.filter((c) => c.isEnabled).length;

                  return (
                    <div className={`region-card ${!reg.isActive ? "inactive" : ""}`} key={reg.id}>
                      <div className="region-card-header">
                        <div>
                          <h4>{reg.name}</h4>
                          <span className={`status-badge ${reg.isActive ? "active" : "disabled"}`}>
                            {reg.isActive ? "Active Region" : "Disabled"}
                          </span>
                        </div>
                        <div className="card-actions">
                          <button className="icon-btn" onClick={() => handleOpenRegionModal(reg)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn danger" onClick={() => handleDeleteRegion(reg.id, reg.name)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="region-card-body">
                        <div className="region-metric">
                          <span>Countries Served</span>
                          <strong>
                            {enabledCount} / {regCountries.length}
                          </strong>
                        </div>
                        <div className="region-metric">
                          <span>Courier Methods</span>
                          <strong>{regMethods.length} Available</strong>
                        </div>

                        <div className="region-country-preview">
                          {regCountries.slice(0, 6).map((c) => (
                            <span key={c.id} className={`country-chip ${c.isEnabled ? "enabled" : "disabled"}`}>
                              {c.countryName} {!c.isEnabled && "❌"}
                            </span>
                          ))}
                          {regCountries.length > 6 && (
                            <span className="country-chip more">+{regCountries.length - 6} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: COUNTRIES */}
          {activeTab === "countries" && (
            <div className="shipping-tab-content">
              <div className="table-filter-bar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search country by name or code (e.g. Japan, LK, US)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="admin-select"
                  >
                    <option value="ALL">All Regions</option>
                    {regions.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <button className="admin-btn secondary" onClick={() => handleBulkToggleCountries(true)}>
                    <CheckCircle size={16} /> Bulk Enable
                  </button>
                  <button className="admin-btn secondary" onClick={() => handleBulkToggleCountries(false)}>
                    <XCircle size={16} /> Bulk Disable
                  </button>
                  <button className="admin-btn primary" onClick={() => handleOpenCountryModal()}>
                    <Plus size={16} /> Add Country
                  </button>
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCountryIds(filteredCountries.map((c) => c.id));
                            } else {
                              setSelectedCountryIds([]);
                            }
                          }}
                          checked={
                            filteredCountries.length > 0 &&
                            selectedCountryIds.length === filteredCountries.length
                          }
                        />
                      </th>
                      <th>Country</th>
                      <th>ISO Code</th>
                      <th>Region</th>
                      <th>Currency</th>
                      <th>Shipping Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountries.map((c) => {
                      const isSelected = selectedCountryIds.includes(c.id);
                      return (
                        <tr key={c.id} className={!c.isEnabled ? "disabled-row" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCountryIds((prev) => [...prev, c.id]);
                                } else {
                                  setSelectedCountryIds((prev) => prev.filter((id) => id !== c.id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <strong>{c.countryName}</strong>
                          </td>
                          <td>
                            <code className="iso-code">{c.countryCode}</code>
                          </td>
                          <td>{c.region?.name || "Unassigned"}</td>
                          <td>{c.currency}</td>
                          <td>
                            <button
                              className={`status-toggle-btn ${c.isEnabled ? "enabled" : "disabled"}`}
                              onClick={() => handleToggleCountryStatus(c)}
                            >
                              {c.isEnabled ? (
                                <>
                                  <CheckCircle size={14} /> Shipping Enabled
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} /> Shipping Blocked
                                </>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="icon-btn" onClick={() => handleOpenCountryModal(c)}>
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SHIPPING METHODS */}
          {activeTab === "methods" && (
            <div className="shipping-tab-content">
              <div className="tab-actions">
                <h3>Courier & Delivery Options</h3>
                <button className="admin-btn primary" onClick={() => handleOpenMethodModal()}>
                  <Plus size={16} /> Add Shipping Method
                </button>
              </div>

              <div className="methods-list-grid">
                {methods.map((m) => (
                  <div key={m.id} className={`method-card ${!m.isActive ? "inactive" : ""}`}>
                    <div className="method-card-header">
                      <div>
                        <span className="region-tag">{m.region?.name || "Global"}</span>
                        <h4>{m.name}</h4>
                        {m.description && <p className="method-desc">{m.description}</p>}
                      </div>
                      <div className="card-actions">
                        <button className="icon-btn" onClick={() => handleOpenMethodModal(m)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn danger" onClick={() => handleDeleteMethod(m.id, m.name)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="method-card-details">
                      <div className="method-detail-item">
                        <DollarSign size={16} />
                        <span>Price: <strong>${m.price.toFixed(2)}</strong></span>
                      </div>
                      <div className="method-detail-item">
                        <Clock size={16} />
                        <span>Estimated: <strong>{m.estimatedDays}</strong></span>
                      </div>
                      <div className="method-detail-item">
                        <Shield size={16} />
                        <span>
                          Free Shipping Threshold:{" "}
                          <strong>
                            {m.freeShippingThreshold !== null ? `$${m.freeShippingThreshold}` : "Disabled"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ANNOUNCEMENTS & SUSPENSIONS */}
          {activeTab === "announcements" && (
            <div className="shipping-tab-content">
              <div className="tab-actions">
                <div>
                  <h3>Holiday Suspensions & Alerts</h3>
                  <p>Display real-time delivery alerts or temporarily suspend shipping for specific countries.</p>
                </div>
                <button className="admin-btn primary" onClick={() => setAnnouncementModalOpen(true)}>
                  <Plus size={16} /> Add Alert / Suspension
                </button>
              </div>

              <div className="announcements-grid">
                {announcements.length === 0 ? (
                  <div className="empty-state">
                    <Info size={32} />
                    <p>No active holiday suspensions or delivery alerts.</p>
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className={`announcement-card ${a.isSuspended ? "suspended" : "notice"}`}>
                      <div className="announcement-header">
                        <span className="scope-tag">
                          {a.countryCode ? `Country: ${a.countryCode}` : "Global Storefront Banner"}
                        </span>
                        {a.isSuspended && <span className="suspended-badge">Shipping Blocked</span>}
                      </div>
                      <p className="announcement-msg">{a.message}</p>
                      <div className="announcement-footer">
                        <span className="date-tag">
                          <Calendar size={14} /> Created: {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                        <button className="icon-btn danger" onClick={() => handleDeleteAnnouncement(a.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT HISTORY */}
          {activeTab === "stats" && (
            <div className="shipping-tab-content">
              <h3>System Audit Log History</h3>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action Code</th>
                      <th>Log Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>
                          <code className="action-code">{log.action}</code>
                        </td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* REGION MODAL */}
      {regionModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>{editingRegion ? "Edit Region" : "Add Shipping Region"}</h3>
            <form onSubmit={handleSaveRegion}>
              <div className="form-group">
                <label>Region Name (e.g. Europe, South America)</label>
                <input
                  type="text"
                  required
                  value={regionNameInput}
                  onChange={(e) => setRegionNameInput(e.target.value)}
                  placeholder="Region Name"
                  className="admin-input"
                />
              </div>
              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={regionActiveInput}
                    onChange={(e) => setRegionActiveInput(e.target.checked)}
                  />
                  Region Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="admin-btn secondary" onClick={() => setRegionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUNTRY MODAL */}
      {countryModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>{editingCountry ? "Edit Country" : "Add Shipping Country"}</h3>
            <form onSubmit={handleSaveCountry}>
              <div className="form-group">
                <label>Assigned Region</label>
                <select
                  value={cRegionId}
                  onChange={(e) => setCRegionId(Number(e.target.value))}
                  className="admin-select"
                  required
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Country ISO Code (2 letters, e.g. US, JP, LK)</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value.toUpperCase())}
                  placeholder="US"
                  className="admin-input"
                />
              </div>
              <div className="form-group">
                <label>Full Country Name</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="United States"
                  className="admin-input"
                />
              </div>
              <div className="form-group">
                <label>Display Currency</label>
                <input
                  type="text"
                  required
                  value={cCurrency}
                  onChange={(e) => setCCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  className="admin-input"
                />
              </div>
              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={cEnabled}
                    onChange={(e) => setCEnabled(e.target.checked)}
                  />
                  Allow Checkout Shipping to this Country
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="admin-btn secondary" onClick={() => setCountryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Country
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* METHOD MODAL */}
      {methodModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>{editingMethod ? "Edit Shipping Method" : "Add Courier Shipping Method"}</h3>
            <form onSubmit={handleSaveMethod}>
              <div className="form-group">
                <label>Target Region</label>
                <select
                  value={mRegionId}
                  onChange={(e) => setMRegionId(Number(e.target.value))}
                  className="admin-select"
                  required
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Method Title (e.g. Standard Shipping, Express DHL)</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  placeholder="Express DHL"
                  className="admin-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={mDesc}
                  onChange={(e) => setMDesc(e.target.value)}
                  placeholder="Priority international courier delivery"
                  className="admin-input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mPrice}
                    onChange={(e) => setMPrice(Number(e.target.value))}
                    className="admin-input"
                  />
                </div>
                <div className="form-group">
                  <label>Estimated Days (e.g. 3-5 Days)</label>
                  <input
                    type="text"
                    required
                    value={mDays}
                    onChange={(e) => setMDays(e.target.value)}
                    placeholder="3-5 Days"
                    className="admin-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Free Shipping Minimum Threshold ($) (Leave blank if disabled)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mThreshold}
                  onChange={(e) => setMThreshold(e.target.value)}
                  placeholder="300"
                  className="admin-input"
                />
              </div>
              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={mActive}
                    onChange={(e) => setMActive(e.target.checked)}
                  />
                  Method Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="admin-btn secondary" onClick={() => setMethodModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Shipping Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {announcementModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Add Holiday Suspension or Banner Alert</h3>
            <form onSubmit={handleSaveAnnouncement}>
              <div className="form-group">
                <label>Specific Country Code (Leave blank for global banner)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={aCountryCode}
                  onChange={(e) => setACountryCode(e.target.value.toUpperCase())}
                  placeholder="CA (or leave empty)"
                  className="admin-input"
                />
              </div>
              <div className="form-group">
                <label>Banner / Warning Message</label>
                <textarea
                  required
                  rows={3}
                  value={aMessage}
                  onChange={(e) => setAMessage(e.target.value)}
                  placeholder="e.g. No shipping to Canada until August 25 due to postal holiday."
                  className="admin-input"
                />
              </div>
              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={aIsSuspended}
                    onChange={(e) => ASetIsSuspended(e.target.checked)}
                  />
                  <strong>Block Checkout for target country during this period</strong>
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setAnnouncementModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Add Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

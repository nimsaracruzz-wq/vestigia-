import { useState, useMemo } from "react";
import { useAdmin } from "../AdminContext";
import { 
  Search, ArrowLeft, Mail, Phone, Calendar, 
  ShoppingBag, DollarSign, Award, ChevronDown, ChevronUp, MapPin 
} from "lucide-react";
import { type Customer, type Order } from "../AdminContext";

// Simple Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const mapping: Record<string, { label: string; color: string; bg: string }> = {
    pending:            { label: "Pending",            color: "#92400e", bg: "#fef3c7" },
    confirmed:          { label: "Confirmed",          color: "#1e40af", bg: "#dbeafe" },
    processing:         { label: "Processing",         color: "#5b21b6", bg: "#ede9fe" },
    quality_check:      { label: "Quality Check",      color: "#0f766e", bg: "#ccfbf1" },
    packed:             { label: "Packed",             color: "#0369a1", bg: "#e0f2fe" },
    ready_for_shipment: { label: "Ready to Ship",      color: "#0c4a6e", bg: "#bae6fd" },
    shipped:            { label: "Shipped",            color: "#1d4ed8", bg: "#bfdbfe" },
    out_for_delivery:   { label: "Out for Delivery",   color: "#0369a1", bg: "#e0f2fe" },
    delivered:          { label: "Delivered",          color: "#15803d", bg: "#dcfce7" },
    cancelled:          { label: "Cancelled",          color: "#6b7280", bg: "#f3f4f6" },
    refunded:           { label: "Refunded",           color: "#6b7280", bg: "#f3f4f6" },
  };
  const cfg = mapping[status] ?? { label: status, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
      color: cfg.color, backgroundColor: cfg.bg, textTransform: "capitalize"
    }}>
      {cfg.label}
    </span>
  );
}

export default function Customers() {
  const { customers, orders } = useAdmin();
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => o.email.toLowerCase() === selectedCustomer.email.toLowerCase());
  }, [orders, selectedCustomer]);

  const uniqueAddresses = useMemo(() => {
    const list = customerOrders.map(o => o.address).filter(Boolean);
    return Array.from(new Set(list));
  }, [customerOrders]);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (selectedCustomer) {
    const avgOrderValue = selectedCustomer.orders > 0 
      ? selectedCustomer.totalSpend / selectedCustomer.orders 
      : 0;

    return (
      <div className="admin-page">
        {/* Header navigation */}
        <div style={{ marginBottom: "20px" }}>
          <button 
            onClick={() => setSelectedCustomerId(null)} 
            style={{ 
              display: "inline-flex", alignItems: "center", gap: "8px", 
              background: "none", border: "none", cursor: "pointer", 
              fontSize: "13px", fontWeight: "600", color: "#666", padding: 0 
            }}
          >
            <ArrowLeft size={15} /> Back to Customers
          </button>
        </div>

        {/* Customer Header Info */}
        <div style={{ 
          background: "#fff", border: "1px solid #eee", borderRadius: "12px", 
          padding: "24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "20px" 
        }}>
          <div style={{ 
            width: "60px", height: "60px", borderRadius: "50%", background: "#111", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "600" 
          }}>
            {getInitials(selectedCustomer.name)}
          </div>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "700" }}>{selectedCustomer.name}</h1>
            <div style={{ display: "flex", gap: "16px", color: "#666", fontSize: "13px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Mail size={13} /> {selectedCustomer.email}</span>
              {selectedCustomer.phone && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Phone size={13} /> {selectedCustomer.phone}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={13} /> Joined {new Date(selectedCustomer.joined).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* LTV Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Lifetime Value", value: `€${selectedCustomer.totalSpend.toFixed(2)}`, icon: <DollarSign size={18} color="#15803d" /> },
            { label: "Total Orders", value: selectedCustomer.orders, icon: <ShoppingBag size={18} color="#1d4ed8" /> },
            { label: "Average Order Value", value: `€${avgOrderValue.toFixed(2)}`, icon: <Award size={18} color="#7c3aed" /> },
          ].map((stat, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</span>
                {stat.icon}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#111" }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Detailed Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          {/* Left Column: Order History */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Order History</h3>
              </div>
              
              <div style={{ padding: "10px" }}>
                {customerOrders.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#888", fontSize: "14px" }}>
                    No orders placed yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {customerOrders.map(order => {
                      const isOpen = !!expandedOrders[order.id];
                      return (
                        <div key={order.id} style={{ 
                          border: "1px solid #eee", borderRadius: "8px", overflow: "hidden"
                        }}>
                          {/* Order Summary Row (Clickable) */}
                          <div 
                            onClick={() => toggleOrderExpand(order.id)}
                            style={{ 
                              padding: "14px 16px", background: "#fafafa", cursor: "pointer",
                              display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}
                          >
                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                              <span style={{ fontWeight: "700", fontSize: "13px", fontFamily: "monospace" }}>{order.id}</span>
                              <span style={{ fontSize: "13px", color: "#666" }}>
                                {new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                              <StatusBadge status={order.status} />
                              <strong style={{ fontSize: "13px" }}>€{order.total.toFixed(2)}</strong>
                              {isOpen ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                            </div>
                          </div>

                          {/* Expandable Itemized List */}
                          {isOpen && (
                            <div style={{ padding: "16px", background: "#fff", borderTop: "1px solid #eee" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {order.items.map((item, idx) => (
                                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                      <img src={item.image} alt={item.productName} style={{ 
                                        width: "40px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "1px solid #eee" 
                                      }} />
                                      <div>
                                        <div style={{ fontSize: "13px", fontWeight: "600" }}>{item.productName}</div>
                                        <div style={{ fontSize: "11px", color: "#888" }}>
                                          Size: {item.size} · Color: <span style={{ 
                                            display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", 
                                            backgroundColor: item.color, verticalAlign: "middle", marginLeft: "2px" 
                                          }} />
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#666" }}>
                                      {item.quantity} x €{item.price.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Profile Info & Addresses */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Contact Card */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "700" }}>Contact Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Email Address</div>
                  <a href={`mailto:${selectedCustomer.email}`} style={{ color: "#111", textDecoration: "none" }}>{selectedCustomer.email}</a>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Phone Number</div>
                  <div>{selectedCustomer.phone || "—"}</div>
                </div>
              </div>
            </div>

            {/* Delivery Locations */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "700" }}>Shipping Addresses</h3>
              {uniqueAddresses.length === 0 ? (
                <div style={{ color: "#888", fontSize: "13px" }}>No addresses saved yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {uniqueAddresses.map((addr, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#333", lineHeight: 1.5 }}>
                      <MapPin size={15} color="#888" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{addr}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Customers</h1>
          <p>View customer history and lifetime value.</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div className="admin-search-wrapper">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        <div className="admin-panel-content p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Joined</th>
                <th>Last Order</th>
                <th>Orders</th>
                <th>Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomerId(customer.id)}
                  style={{ cursor: "pointer" }}
                  className="admin-table-row-hover"
                >
                  <td>
                    <div className="admin-customer-cell">
                      <div className="admin-avatar">
                        {getInitials(customer.name)}
                      </div>
                      <div>
                        <strong>{customer.name}</strong>
                        <div className="text-sm text-muted">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(customer.joined).toLocaleDateString()}</td>
                  <td>{customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : "—"}</td>
                  <td>{customer.orders}</td>
                  <td><strong>€{customer.totalSpend.toFixed(2)}</strong></td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    No customers found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

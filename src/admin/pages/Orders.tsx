import { useState } from "react";
import { useAdmin, type Order, type OrderStatus } from "../AdminContext";
import { OrderDrawer } from "../components/OrderDrawer";
import { Search, Eye } from "lucide-react";

export default function Orders() {
  const { orders, updateOrderStatus } = useAdmin();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.customer.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = (orderId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    updateOrderStatus(orderId, e.target.value as OrderStatus);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Orders</h1>
          <p>Manage fulfillments and view order details.</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div className="admin-search-wrapper">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by order ID, name, or email..." 
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
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.id}</strong></td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>
                    {order.customer}
                    <div className="text-sm text-muted">{order.email}</div>
                  </td>
                  <td>${order.total.toFixed(2)}</td>
                  <td>
                    <select 
                      className={`admin-status-select badge-${order.status}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e)}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)} 
                      className="admin-btn-icon"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    No orders found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDrawer 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
}

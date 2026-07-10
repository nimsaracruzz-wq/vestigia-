import { useAdmin } from "../AdminContext";
import { StatCard, BarChart } from "../components/DashboardShared";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { orders, products, customers } = useAdmin();

  // Basic stats
  const totalRevenue = orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const ordersToday = orders.filter(o => o.date === new Date().toISOString().split('T')[0]).length;
  // If no orders today (since mock dates are hardcoded to July 1/2), just show a mock stat or recent
  const recentOrdersCount = orders.filter(o => o.status === "pending" || o.status === "processing").length;

  const lowStockProducts = products.filter(p => p.badge === "Low stock");

  // Mock chart data (last 7 days simulated revenue)
  const chartData = [1200, 1900, 800, 2400, 1600, 3100, 2200];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <p>Overview of your store's performance today.</p>
      </div>

      <div className="admin-grid-4">
        <StatCard 
          title="Total Revenue" 
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          label="All time sales" 
        />
        <StatCard 
          title="Active Orders" 
          value={recentOrdersCount} 
          label="Pending or processing" 
        />
        <StatCard 
          title="Products" 
          value={products.length} 
          label="Active in catalog" 
        />
        <StatCard 
          title="Customers" 
          value={customers.length} 
          label="Registered users" 
        />
      </div>

      <div className="admin-dashboard-layout">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Revenue (Last 7 Days)</h2>
          </div>
          <div className="admin-panel-content">
            <BarChart data={chartData} />
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Recent Orders</h2>
            <Link to="/admin/orders" className="admin-link">View All</Link>
          </div>
          <div className="admin-panel-content p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>{order.customer}</td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>
                      <span className={`admin-badge badge-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useAdmin } from "../AdminContext";
import { BarChart } from "../components/DashboardShared";
import { DonutChart } from "../components/DonutChart";

export default function Analytics() {
  const { orders, products } = useAdmin();

  const revenueData = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const dayKey = date.toISOString().split("T")[0];
    return orders
      .filter((order) => String(order.date).startsWith(dayKey) && order.status !== "cancelled")
      .reduce((sum, order) => sum + order.total, 0);
  });

  const categoryTotals: Record<string, number> = {};
  const productCategoryById = new Map(products.map((product) => [product.id, product.category]));

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    order.items.forEach((item) => {
      const category = productCategoryById.get(item.productId) ?? "Other";
      categoryTotals[category] = (categoryTotals[category] ?? 0) + item.price * item.quantity;
    });
  });

  const categoryPalette = ["#111", "#666", "#999", "#ccc"];
  const categoryData = Object.entries(categoryTotals).map(([label, value], index) => ({
    label,
    value,
    color: categoryPalette[index % categoryPalette.length],
  }));

  // Top products calculation from real (simulated) orders
  const productSales: Record<string, { qty: number, rev: number }> = {};
  
  orders.forEach(o => {
    if (o.status !== "cancelled") {
      o.items.forEach(item => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { qty: 0, rev: 0 };
        }
        productSales[item.productName].qty += item.quantity;
        productSales[item.productName].rev += (item.price * item.quantity);
      });
    }
  });

  const topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Analytics</h1>
          <p>Monitor your store's traffic and revenue.</p>
        </div>
      </div>

      <div className="admin-panel mb-8">
        <div className="admin-panel-header">
          <h2>Revenue Overview (Last 30 Days)</h2>
        </div>
        <div className="admin-panel-content">
          <BarChart data={revenueData} />
        </div>
      </div>

      <div className="admin-dashboard-layout">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Sales by Category</h2>
          </div>
          <div className="admin-panel-content">
            <DonutChart data={categoryData} />
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Top Products</h2>
          </div>
          <div className="admin-panel-content p-0">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Units Sold</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td><strong>{p.name}</strong></td>
                    <td className="text-right">{p.qty}</td>
                    <td className="text-right">${p.rev.toFixed(2)}</td>
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

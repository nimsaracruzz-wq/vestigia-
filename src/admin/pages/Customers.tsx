import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Search } from "lucide-react";

export default function Customers() {
  const { customers } = useAdmin();
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

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
                <tr key={customer.id}>
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
                  <td>{new Date(customer.lastOrder).toLocaleDateString()}</td>
                  <td>{customer.orders}</td>
                  <td><strong>${customer.totalSpend.toFixed(2)}</strong></td>
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

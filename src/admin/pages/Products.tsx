import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Modal } from "../components/Modal";
import { ProductForm } from "../components/ProductForm";
import { type Product } from "../../data";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useAdmin();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProduct(id);
    }
  };

  const handleSubmit = (data: any) => {
    if (editingProduct) {
      updateProduct(data as Product);
    } else {
      addProduct(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your catalog, pricing, and inventory.</p>
        </div>
        <button onClick={handleAddClick} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <div className="admin-panel-content p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th style={{ width: "100px" }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>
                    <img src={product.image} alt={product.name} className="admin-table-img" />
                  </td>
                  <td><strong>{product.name}</strong></td>
                  <td>{product.category}</td>
                  <td>${product.price.toFixed(2)}</td>
                  <td>
                    {product.badge ? (
                      <span className="admin-badge badge-warning">{product.badge}</span>
                    ) : (
                      <span className="admin-badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="admin-table-actions">
                      <button onClick={() => handleEditClick(product)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id, product.name)} className="text-danger" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    No products found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Edit Product" : "Add New Product"}
      >
        <ProductForm 
          key={editingProduct ? `edit-${editingProduct.id}` : "new"}
          initialData={editingProduct} 
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

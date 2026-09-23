import { Reveal } from "../../animation/Reveal";
import { moneyLabel } from "../../utils/money";
import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Modal } from "../components/Modal";
import { ProductForm } from "../components/ProductForm";
import { type Product } from "../../data";
import { Plus, Edit2, Trash2 } from "lucide-react";

const seoChecks = (product: Product) => [
  Boolean(product.slug),
  Boolean(product.seoTitle && product.seoTitle.length <= 70),
  Boolean(product.seoDescription && product.seoDescription.length <= 170),
  Boolean(product.alt),
  Boolean(product.sku),
  product.robotsIndex !== false,
];

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useAdmin();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );
  const seoReadyCount = products.filter((product) => seoChecks(product).every(Boolean)).length;

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
      <Reveal className="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your catalog, pricing, inventory, and product SEO.</p>
        </div>
        <button onClick={handleAddClick} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </Reveal>

      <Reveal variant="fade" className="admin-panel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", padding: "16px 16px 0" }}>
          <Reveal className="admin-price-card">
            <label>SEO Ready</label>
            <strong>{seoReadyCount}/{products.length}</strong>
          </Reveal>
          <Reveal className="admin-price-card">
            <label>Missing Meta Descriptions</label>
            <strong>{products.filter((product) => !product.seoDescription).length}</strong>
          </Reveal>
          <Reveal className="admin-price-card">
            <label>Missing SKU</label>
            <strong>{products.filter((product) => !product.sku).length}</strong>
          </Reveal>
        </div>
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
                <th>SEO</th>
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
                  <td>{product.basePriceMinor != null && product.baseCurrency ? moneyLabel(product.basePriceMinor, product.baseCurrency) : "Set base price in Pricing Control"}</td>
                  <td>
                    {seoChecks(product).every(Boolean) ? (
                      <span className="admin-badge badge-success">Ready</span>
                    ) : (
                      <span className="admin-badge badge-warning">{seoChecks(product).filter(Boolean).length}/6</span>
                    )}
                  </td>
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
                  <td colSpan={7} className="text-center py-8">
                    No products found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Reveal>

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

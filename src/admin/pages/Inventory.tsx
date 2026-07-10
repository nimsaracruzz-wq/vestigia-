import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { type Product } from "../../data";
import { Search, Save } from "lucide-react";

export default function Inventory() {
  const { products, updateProductInventory } = useAdmin();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Local state for the selected product's inventory so we can edit before saving
  const [localInventory, setLocalInventory] = useState<Record<string, number>>({});

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // Initialize local inventory from the product, or create defaults
    const inv = product.inventory || {};
    const newInv: Record<string, number> = {};
    
    product.colors.forEach(color => {
      product.sizes.forEach(size => {
        const key = `${color}_${size}`;
        newInv[key] = inv[key] !== undefined ? inv[key] : 10; // Default to 10 if not set
      });
    });
    
    setLocalInventory(newInv);
  };

  const handleStockChange = (color: string, size: string, value: string) => {
    const key = `${color}_${size}`;
    setLocalInventory(prev => ({
      ...prev,
      [key]: Math.max(0, parseInt(value) || 0)
    }));
  };

  const handleSave = () => {
    if (selectedProduct) {
      updateProductInventory(selectedProduct.id, localInventory);
      alert("Inventory updated successfully.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Track and update stock levels across all variants.</p>
        </div>
      </div>

      <div className="admin-dashboard-layout">
        {/* Left Col: Product List */}
        <div className="admin-panel h-fit">
          <div className="admin-panel-toolbar">
            <div className="admin-search-wrapper">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-search-input"
              />
            </div>
          </div>
          <div className="admin-panel-content p-0" style={{ maxHeight: "600px", overflowY: "auto" }}>
            <table className="admin-table">
              <tbody>
                {filteredProducts.map(product => (
                  <tr 
                    key={product.id} 
                    onClick={() => handleSelectProduct(product)}
                    style={{ cursor: "pointer", background: selectedProduct?.id === product.id ? "#f0f0f0" : "" }}
                  >
                    <td width="50">
                      <img src={product.image} alt={product.name} className="admin-table-img" style={{ width: "40px", height: "40px" }} />
                    </td>
                    <td><strong>{product.name}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Editor */}
        <div className="admin-panel h-fit">
          {selectedProduct ? (
            <>
              <div className="admin-panel-header">
                <h2>{selectedProduct.name} - Stock Levels</h2>
                <button onClick={handleSave} className="admin-btn admin-btn-primary py-1 px-3">
                  <Save size={16} /> Save Changes
                </button>
              </div>
              <div className="admin-panel-content">
                {selectedProduct.colors.map(color => (
                  <div key={color} className="mb-8">
                    <h3 className="text-sm uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                      <span className="color-dot" style={{ backgroundColor: color, border: color === "#ffffff" ? "1px solid #ddd" : "none" }} />
                      Color: {color}
                    </h3>
                    <div className="admin-grid-4">
                      {selectedProduct.sizes.map(size => {
                        const key = `${color}_${size}`;
                        return (
                          <div key={size} className="admin-form-group">
                            <label>Size {size}</label>
                            <input 
                              type="number" 
                              value={localInventory[key]}
                              onChange={(e) => handleStockChange(color, size, e.target.value)}
                              min="0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="admin-panel-content text-center py-8 text-muted">
              Select a product from the list to manage its inventory.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

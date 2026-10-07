import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { type Product } from '../../data';
import { Search, Save, RefreshCw } from 'lucide-react';

export default function Inventory() {
  const { products, orders, updateProductInventory, isSynced } = useAdmin();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [localInventory, setLocalInventory] = useState<Record<string, number>>({});
  const [expected, setExpected] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const activeItems = orders.filter(o => o.status !== 'cancelled' && ['PAID','PARTIALLY_REFUNDED'].includes(o.paymentStatus || '')).flatMap(o => o.items);
  const allStock = products.flatMap(p => p.colors.flatMap(color => p.sizes.map(size => p.inventory?.[color+'_'+size] ?? 0)));
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selectProduct = (product: Product) => {
    const inventory: Record<string, number> = {};
    for (const color of product.colors) for (const size of product.sizes) inventory[color+'_'+size] = product.inventory?.[color+'_'+size] ?? 0;
    setSelectedProduct(product); setLocalInventory(inventory); setExpected(inventory); setError(''); setSuccess('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedProduct || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try { await updateProductInventory(selectedProduct.id, localInventory, expected); setExpected({...localInventory}); setSuccess('Stock saved successfully.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Stock could not be saved.'); }
    finally { setSaving(false); }
  };
  return <div className="admin-page">
    <div className="admin-page-header"><div><h1>Stock & order quantities</h1><p>Manage available units by color and size. Order quantities remain part of the original financial record.</p></div><button type="button" className="admin-btn" onClick={() => window.location.reload()} disabled={saving}><RefreshCw size={16}/> Reload inventory</button></div>
    <div className="admin-grid-4" style={{marginBottom:24}}>
      {[["Available units",allStock.reduce((a,b)=>a+b,0)],["Low-stock variants (1-5)",allStock.filter(n=>n>0&&n<=5).length],["Out-of-stock variants",allStock.filter(n=>n===0).length],["Units in active paid orders",activeItems.reduce((n,i)=>n+i.quantity,0)]].map(([label,value])=><div key={label} className="admin-panel"><div className="admin-panel-content"><span>{label}</span><h2>{isSynced?value:'...'}</h2></div></div>)}
    </div>
    <div className="admin-dashboard-layout">
      <div className="admin-panel"><div className="admin-panel-toolbar"><div className="admin-search-wrapper"><Search size={16}/><input className="admin-search-input" aria-label="Search inventory" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
        <div className="admin-panel-content">{filtered.map(product=><button key={product.id} type="button" className="admin-btn" aria-pressed={selectedProduct?.id===product.id} onClick={()=>selectProduct(product)} disabled={saving} style={{display:'flex',width:'100%',textAlign:'left',marginBottom:8}}>{product.name}</button>)}{!filtered.length&&<p>{isSynced?'No products found.':'Loading inventory...'}</p>}</div>
      </div>
      <div className="admin-panel">{selectedProduct?<form onSubmit={save}>
        <div className="admin-panel-header"><h2>{selectedProduct.name}</h2><button className="admin-btn admin-btn-primary" type="submit" disabled={saving}><Save size={16}/>{saving?'Saving...':'Save stock'}</button></div>
        <div className="admin-panel-content">
          {error&&<p role="alert" className="auth-error-alert">{error}</p>}{success&&<p role="status" className="auth-success-alert">{success}</p>}
          <p>Available stock is deducted when an order is placed. Missing variants have zero stock. Reload before editing to see recent orders.</p>
          <div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Color / size</th><th>Available units</th><th>Units in active paid orders</th><th>Stock level</th></tr></thead><tbody>
            {selectedProduct.colors.flatMap(color=>selectedProduct.sizes.map(size=>{const key=color+'_'+size;const stock=localInventory[key];const ordered=activeItems.filter(i=>i.productId===selectedProduct.id&&i.color===color&&i.size===size).reduce((n,i)=>n+i.quantity,0);return <tr key={key}><td>{color} / {size}</td><td><input aria-label={color+' '+size+' available stock'} type="number" min={0} max={100000} step={1} required disabled={saving} value={Number.isFinite(stock) ? stock : ''} onChange={e=>{setLocalInventory(prev=>({...prev,[key]:e.target.value===''?NaN:Number(e.target.value)}));setSuccess('');}} style={{width:100,maxWidth:'100%',minHeight:44,padding:8}}/></td><td>{ordered}</td><td>{stock===0?'Out of stock':stock<=5?'Low stock':'In stock'}</td></tr>}))}
          </tbody></table></div>
        </div>
      </form>:<div className="admin-panel-content"><p>Select a product to view stock and order quantities.</p></div>}</div>
    </div>
  </div>;
}

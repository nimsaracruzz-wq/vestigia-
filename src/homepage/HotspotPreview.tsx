import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Product } from '../data';
import { useCurrency } from '../context/CurrencyContext';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useScrollLock } from '../hooks/useScrollLock';
import ProductImage from '../components/common/ProductImage';
import { getProductPrice } from '../utils/productMedia';
import { isProductInStock } from '../../shared/shop';
export default function HotspotPreview({product,onClose,onQuickShop}:{product:Product;onClose:()=>void;onQuickShop:(p:Product)=>void}) {
 useScrollLock(true);useDialogFocus(true,onClose,'.hp-product-preview');
 const {currency,formatPrice}=useCurrency(),price=product.prices?.[currency],available=!!price&&price.isActive!==false,stock=isProductInStock(product);
 return createPortal(<div className="hp-preview-backdrop" onClick={onClose}><section className="hp-product-preview" role="dialog" aria-modal="true" aria-labelledby="hp-preview-title" onClick={e=>e.stopPropagation()}>
 <button className="hp-preview-close" type="button" onClick={onClose} aria-label="Close product preview"><X size={20}/></button>
 <ProductImage product={product} variant="product"/>
 <div><h2 id="hp-preview-title">{product.name}</h2><p>{product.colors.join(' / ')}</p><p>{available?formatPrice(getProductPrice(product,currency)):'Unavailable in this currency'}</p><p>{stock?'In stock':'Sold out'}</p></div>
 <div className="hp-preview-actions"><Link to={`/product/${product.slug||product.id}`} onClick={onClose}>View product</Link><button type="button" disabled={!available||!stock} onClick={()=>{onClose();onQuickShop(product);}}>Quick add</button></div>
 </section></div>,document.body);
}

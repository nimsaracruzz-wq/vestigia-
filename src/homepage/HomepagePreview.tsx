import { useEffect, useState } from 'react';
import type { HomepageConfig } from '../../shared/homepage';
import type { Product } from '../data';
import { homepageApi } from './api';
import HomepageRenderer, { CmsAnnouncement } from './HomepageRenderer';
import CmsFooter from './CmsFooter';
import Header from '../components/layout/Header';
import MobileMenu from '../components/layout/MobileMenu';
import SearchOverlay from '../components/common/SearchOverlay';
import QuickShopModal from '../components/common/QuickShopModal';
import CartDrawer from '../components/common/CartDrawer';
import { useCart } from '../context/CartContext';
export default function HomepagePreview() {
 const [config,setConfig]=useState<HomepageConfig|null>(null),[error,setError]=useState(''),[menu,setMenu]=useState(false),[search,setSearch]=useState(false),[product,setProduct]=useState<Product|null>(null);
 const {cartOpen,openCart,closeCart}=useCart();
 useEffect(()=>{const controller=new AbortController();homepageApi<{config:HomepageConfig}>('/admin/homepage/preview',{signal:controller.signal}).then(r=>setConfig(r.config)).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
 if(!config)return <p className="hp-loading" role={error?'alert':'status'}>{error||'Loading private preview…'}</p>;
 const bar=config.sections.find(s=>s.type==='announcement'&&s.enabled);
 return <><div className="storefront-header-region">{bar?.type==='announcement'&&<CmsAnnouncement settings={bar.settings}/>}<Header onCartToggle={openCart} onMenuToggle={()=>setMenu(true)} onSearchToggle={()=>setSearch(true)}/></div><main><HomepageRenderer config={config} preview onQuickShop={setProduct}/></main><CmsFooter config={config}/><MobileMenu open={menu} onClose={()=>setMenu(false)} onCartToggle={openCart}/><SearchOverlay open={search} onClose={()=>setSearch(false)}/><QuickShopModal product={product} onClose={()=>setProduct(null)}/><CartDrawer open={cartOpen} onClose={closeCart}/></>;
}

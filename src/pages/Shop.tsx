import { PageIntro } from '../animation/PageIntro';
import { AnimatePresence } from 'framer-motion';
import { collectionDescription } from '../../shared/seo/catalog';
import { urlPolicy } from '../../shared/seo/policy';
﻿import { useEffect,useRef,useState } from 'react';
import { Link,useParams,useSearchParams } from 'react-router-dom';
import type { Product } from '../data';
import { useAdmin } from '../admin/AdminContext';
import { useCurrency } from '../context/CurrencyContext';
import { useHomepage } from '../homepage/HomepageContext';
import ProductCard from '../components/common/ProductCard';
import { SEOHead } from '../components/common/SEOHead';
import { absoluteUrl,breadcrumbJsonLd,collectionJsonLd,slugifySeo } from '../utils/seo';
import { defaultShopSettings,emptyShopFilters,readShopFilters,writeShopFilters,filterShopProducts,type ShopFilters } from '../../shared/shop';
import { selectHomepageProducts } from '../../shared/homepageProducts';
import FilterDrawer from '../shop/FilterDrawer';
import SortSheet from '../shop/SortSheet';
import { API_BASE_URL } from '../config/api';
import '../shop/shop.css';
import '../shop/mobile-polish.css';
export default function Shop({onQuickShop}:{onQuickShop:(p:Product)=>void}) {
 const {products,isSynced}=useAdmin(),{currency}=useCurrency(),{config}=useHomepage();
 const {category}=useParams(),[params,setParams]=useSearchParams(),[filterOpen,setFilterOpen]=useState(false),[bestSellers,setBestSellers]=useState<number[]>([]);
 const nav=useRef<HTMLElement>(null);const settings={...defaultShopSettings,...config?.shop};
 const [sortOpen,setSortOpen]=useState(false);
 const requested=category||params.get('category')||settings.defaultCollection;
 const active=requested==='all'?'':requested;
 const merchandising=config?.sections.filter(s=>s.type==='product_carousel'&&s.enabled)||[];
 const selectedSection=merchandising.find(s=>s.id===active);
 const categories=[...new Set(products.flatMap(p=>[p.category,p.productType||'']).filter(Boolean))];
 const currentCategory=categories.find(c=>slugifySeo(c)===slugifySeo(active||''));
 const filters=readShopFilters(params);
 if(filters.priceCurrency&&filters.priceCurrency!==currency){filters.min='';filters.max='';}
 const needsSales=selectedSection?.type==='product_carousel'&&selectedSection.settings.source==='best_selling';
 useEffect(()=>{if(!needsSales)return;const controller=new AbortController();fetch(API_BASE_URL+'/storefront/homepage/best-sellers',{signal:controller.signal}).then(r=>r.ok?r.json():[]).then(setBestSellers).catch(()=>{});return()=>controller.abort();},[needsSales]);
 useEffect(()=>{nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[active]);
 const collectionProducts=selectedSection?.type==='product_carousel'?selectHomepageProducts(products,{...selectedSection.settings,maxProducts:Number.MAX_SAFE_INTEGER},currency,bestSellers):active?products.filter(p=>slugifySeo(p.category)===slugifySeo(active)||slugifySeo(p.productType||'')===slugifySeo(active)):products;
 let filtered:Product[]=[],filterError='';try{filtered=filterShopProducts(collectionProducts,filters,currency);}catch{filterError=`The price filter is invalid for ${currency}. Clear filters or enter a valid range.`;}
 const page=Math.min(100,Math.max(1,Math.floor(Number(params.get('page'))||1))),visible=filtered.slice(0,settings.pageSize*page);
 const title=selectedSection?.type==='product_carousel'?selectedSection.settings.heading:currentCategory||settings.heading;
 const description=selectedSection?.type==='product_carousel'?collectionDescription(title,selectedSection.settings.body,collectionProducts):currentCategory?`Explore ${currentCategory} from VESTIGIA. ${settings.description}`:settings.description;
 const canonical=urlPolicy(category?`/collections/${encodeURIComponent(category)}`:'/shop',params.toString()).canonical;
 const hasFilters=filters.sizes.length+filters.colors.length+Number(!!filters.availability)+Number(!!filters.min)+Number(!!filters.max)+Number(!!filters.search);
 const apply=(value:ShopFilters)=>setParams(writeShopFilters(params,value,currency));
 const links=[{id:'',label:'All',url:'/shop?category=all'},...merchandising.map(s=>({id:s.id,label:s.type==='product_carousel'?s.settings.heading:s.label,url:`/collections/${s.id}`})),...categories.filter(c=>!merchandising.some(s=>s.id===slugifySeo(c))).map(c=>({id:slugifySeo(c),label:c,url:`/collections/${slugifySeo(c)}`}))];
 const shopBreadcrumbs = [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, ...(category ? [{ name: currentCategory || category, path: `/collections/${category}` }] : [])];
 return <div className="vestigia-shop"><SEOHead title={`${title} | VESTIGIA`} description={description} canonicalUrl={absoluteUrl(canonical)} noIndex={!!hasFilters||params.has('sort')||params.has('category')} jsonLd={[collectionJsonLd(title,description,canonical,visible),breadcrumbJsonLd(shopBreadcrumbs)]}/>
 {settings.introEnabled?<PageIntro className="vs-intro"><nav aria-label="Breadcrumb" className="vs-breadcrumbs"><ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: '0 0 12px 0', padding: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888' }}><li><Link to="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link></li><li aria-hidden="true">/</li><li>{category ? <Link to="/shop" style={{ color: '#888', textDecoration: 'none' }}>Shop</Link> : <span aria-current="page" style={{ color: 'inherit' }}>Shop</span>}</li>{category && (<><li aria-hidden="true">/</li><li aria-current="page"><span style={{ color: 'inherit' }}>{currentCategory || category}</span></li></>)}</ol></nav><p>{settings.label}</p><h1>{title}</h1>{description&&<div>{description}</div>}</PageIntro>:<h1 className="sr-only">{title}</h1>}
 <div className="vs-catalog">{settings.collectionNavigation&&<nav ref={nav} className="vs-collections" aria-label="Collections">{links.map(l=><Link key={l.id} to={l.url} aria-current={(active===l.id||!active&&!l.id)?'page':undefined}>{l.label}</Link>)}</nav>}
 <div className="vs-toolbar">{settings.productCount&&<span role="status">{isSynced?`${filtered.length} ${filtered.length===1?'product':'products'}`:'Loading pieces…'}</span>}<div>{settings.filters&&<button type="button" onClick={()=>setFilterOpen(true)} aria-expanded={filterOpen} aria-haspopup="dialog">Filter{hasFilters?` (${hasFilters})`:''}</button>}{settings.sort&&<><button className="vs-mobile-sort" type="button" aria-haspopup="dialog" aria-expanded={sortOpen} onClick={()=>setSortOpen(true)}>Sort</button><label className="vs-desktop-sort">Sort <select aria-label="Sort products" value={filters.sort} onChange={e=>apply({...filters,sort:e.target.value})}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label></>}</div></div>
 {!!hasFilters&&<div className="vs-active-filters"><span>{[...filters.sizes,...filters.colors,filters.availability.replaceAll('_',' '),filters.min&&`From ${filters.min} ${currency}`,filters.max&&`To ${filters.max} ${currency}`,filters.search].filter(Boolean).join(' · ')}</span><button onClick={()=>apply({...emptyShopFilters,sort:filters.sort})}>Clear filters</button></div>}
 {!isSynced?<div className="vs-grid vs-skeleton" aria-label="Loading products" aria-busy="true">{[0,1,2,3].map(i=><div key={i}><div/><p/><span/></div>)}</div>:filtered.length?<><div className="vs-grid">{visible.map((product,i)=><ProductCard key={product.id} product={product} priority={i<2} reveal={i<8} revealIndex={i} onQuickShop={()=>onQuickShop(product)} display={{quickAdd:settings.quickAdd,wishlist:settings.wishlist,colors:true,badges:true,badge:''}}/>)}</div>{visible.length<filtered.length&&<div className="vs-load-more"><p>Showing {visible.length} of {filtered.length}</p><Link to={{pathname:category?`/collections/${category}`:'/shop',search:(()=>{const next=new URLSearchParams(params);next.set('page',String(page+1));return next.toString();})()}} preventScrollReset>Load more</Link></div>}</>:<section className="vs-empty"><h2>No pieces found.</h2><p>{filterError||'Adjust your filters to continue exploring.'}</p><button onClick={()=>apply({...emptyShopFilters})}>Clear filters</button>{active&&<Link to="/shop?category=all">Explore all pieces</Link>}</section>}
 </div><AnimatePresence>{sortOpen&&<SortSheet value={filters.sort} onChange={sort=>apply({...filters,sort})} onClose={()=>setSortOpen(false)}/>} {filterOpen&&<FilterDrawer products={collectionProducts} value={filters} onApply={apply} onClose={()=>setFilterOpen(false)}/>}</AnimatePresence></div>;
}

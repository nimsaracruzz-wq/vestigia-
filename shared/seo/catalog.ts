import type { HomepageConfig } from '../homepage.js';
import { orderedSections } from '../homepage.js';
import { selectHomepageProducts } from '../homepageProducts.js';
import { defaultShopSettings } from '../shop.js';
import { slug,text,type SeoProduct } from './product.js';
export const collectionDescription=(title:string,body:string,products:SeoProduct[])=>text(body||'Explore '+title+' from VESTIGIA. '+products.slice(0,2).map(p=>p.name).join(' and ')+'.',160);
export function catalog(config:HomepageConfig,products:SeoProduct[],pathname:string,search=''){
 const settings=config.shop||defaultShopSettings,params=new URLSearchParams(search),key=pathname.startsWith('/collections/')?decodeURIComponent(pathname.slice(13)):params.get('category')||settings.defaultCollection;
 const sections=orderedSections(config).filter(s=>s.type==='product_carousel');
 const feed=sections.find(s=>s.id===key);
 const category=[...new Set(products.flatMap(p=>[p.category,p.productType||'']))].find(c=>slug(c)===key);
 const items=feed?.type==='product_carousel'?selectHomepageProducts(products,{...feed.settings,maxProducts:Number.MAX_SAFE_INTEGER},'EUR',[],true):key&&key!=='all'?products.filter(p=>[p.category,p.productType].some(c=>c&&slug(c)===key)):products;
 const title=feed?.type==='product_carousel'?feed.settings.heading:category||settings.heading;
 const description=feed?.type==='product_carousel'?collectionDescription(title,feed.settings.body,items):category?'Explore '+category+' from VESTIGIA. '+settings.description:settings.description;
 const links=[...sections.map(s=>({path:'/collections/'+s.id,title:s.type==='product_carousel'?s.settings.heading:s.label})),...[...new Set(products.flatMap(p=>[p.category,p.productType||'']).filter(Boolean))].map(c=>({path:'/collections/'+slug(c),title:c}))];
 return {items,title,description,links,exists:!key||key==='all'||!!feed||!!category,pageSize:settings.pageSize};
}

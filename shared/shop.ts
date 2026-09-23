import { toMinor, type Currency } from './money.js';
export const defaultShopSettings = { introEnabled:true,label:'SHOP',heading:'THE FIRST RELEASE.',description:'Essential pieces introducing the world of VESTIGIA.',defaultCollection:'',collectionNavigation:true,productCount:true,filters:true,sort:true,quickAdd:true,wishlist:true,pageSize:24,mobileColumns:2,desktopColumns:4 };
export type ShopSettings = typeof defaultShopSettings;
export type CatalogProduct = { id:number;name:string;category:string;productType?:string;colors:string[];sizes:string[];inventory?:Record<string,number>;prices?:Partial<Record<Currency,{priceMinor:number;isActive?:boolean}>> };
export type ShopFilters = { sizes:string[];colors:string[];availability:string;min:string;max:string;priceCurrency:string;search:string;sort:string };
export const emptyShopFilters: ShopFilters = {sizes:[],colors:[],availability:'',min:'',max:'',priceCurrency:'',search:'',sort:'featured'};
export function variantStock(product:CatalogProduct,color:string,size:string) { return product.inventory?.[`${color}_${size}`] ?? 0; }
export function isProductInStock(product:CatalogProduct) { return product.colors.some(c=>product.sizes.some(s=>variantStock(product,c,s)>0)); }
export function readShopFilters(params:URLSearchParams):ShopFilters {
 return {sizes:params.getAll('size'),colors:params.getAll('color'),availability:params.get('availability')||'',min:params.get('min')||'',max:params.get('max')||'',priceCurrency:params.get('priceCurrency')||'',search:params.get('search')||'',sort:['featured','newest','price_asc','price_desc'].includes(params.get('sort')||'')?params.get('sort')!:'featured'};
}
export function writeShopFilters(current:URLSearchParams,filters:ShopFilters,currency:Currency) {
 const next=new URLSearchParams(current);for(const key of ['size','color','availability','min','max','priceCurrency','search','sort','page'])next.delete(key);
 for(const size of filters.sizes)next.append('size',size);for(const color of filters.colors)next.append('color',color);
 for(const key of ['availability','min','max','search','sort'] as const)if(filters[key]&&!(key==='sort'&&filters[key]==='featured'))next.set(key,filters[key]);
 if(filters.min||filters.max)next.set('priceCurrency',currency);return next;
}
export function priceBounds(filters:ShopFilters,currency:Currency) {
 if(filters.priceCurrency&&filters.priceCurrency!==currency)return {min:undefined,max:undefined};
 const min=filters.min?toMinor(filters.min,currency):undefined,max=filters.max?toMinor(filters.max,currency):undefined;
 if(min!==undefined&&max!==undefined&&min>max)throw new Error('Minimum price must not exceed maximum price.');return {min,max};
}
export function filterShopProducts<T extends CatalogProduct>(products:T[],filters:ShopFilters,currency:Currency):T[] {
 const bounds=priceBounds(filters,currency);
 const selected=products.filter(p=>{
  const price=p.prices?.[currency];if(!price||price.isActive===false)return false;
  if(filters.search&&!`${p.name} ${p.category} ${p.productType||''}`.toLowerCase().includes(filters.search.toLowerCase()))return false;
  const colors=p.colors.filter(c=>!filters.colors.length||filters.colors.some(v=>v.toLowerCase()===c.toLowerCase())),sizes=p.sizes.filter(s=>!filters.sizes.length||filters.sizes.includes(s));
  if(!colors.length||!sizes.length)return false;
  const stock=colors.some(c=>sizes.some(s=>variantStock(p,c,s)>0));
  if(filters.availability==='in_stock'&&!stock||filters.availability==='out_of_stock'&&stock)return false;
  return (bounds.min===undefined||price.priceMinor>=bounds.min)&&(bounds.max===undefined||price.priceMinor<=bounds.max);
 });
 if(filters.sort==='newest')selected.sort((a,b)=>b.id-a.id);
 if(filters.sort==='price_asc'||filters.sort==='price_desc')selected.sort((a,b)=>(a.prices![currency]!.priceMinor-b.prices![currency]!.priceMinor)*(filters.sort==='price_asc'?1:-1));
 return selected;
}

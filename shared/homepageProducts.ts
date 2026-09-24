import type { CarouselSettings } from './homepage.js';
type Candidate = { id:number; category:string; prices?:Partial<Record<string,{priceMinor:number;isActive?:boolean}>> };
export function selectHomepageProducts<T extends Candidate>(products:T[], settings:CarouselSettings, currency:string, bestSellers:number[],includeUnpriced=false) {
  const eligible=products.filter(p=>!settings.excludedIds.includes(p.id)&&(includeUnpriced||p.prices?.[currency]&&p.prices[currency]!.isActive!==false));
  if(settings.source==='manual'||settings.source==='best_selling') {
    const ids=settings.source==='manual'?settings.productIds:bestSellers;
    return ids.flatMap(id=>{const product=eligible.find(p=>p.id===id);return product?[product]:[];}).slice(0,settings.maxProducts);
  }
  const filtered=settings.source==='category'?eligible.filter(p=>p.category===settings.category):eligible;
  return [...filtered].sort((a,b)=>settings.sort==='oldest'?a.id-b.id:settings.sort==='price_asc'||settings.sort==='price_desc'?((a.prices?.[currency]?.priceMinor??Number.MAX_SAFE_INTEGER)-(b.prices?.[currency]?.priceMinor??Number.MAX_SAFE_INTEGER))*(settings.sort==='price_asc'?1:-1):b.id-a.id).slice(0,settings.maxProducts);
}

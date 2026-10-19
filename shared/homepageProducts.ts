import type { CarouselSettings } from './homepage.js';
type Candidate = { id:number; published?:boolean; category:string; prices?:Partial<Record<string,{priceMinor:number;isActive?:boolean}>> };
export function selectHomepageProducts<T extends Candidate>(products:T[], settings:CarouselSettings, currency:string, bestSellers:number[],includeUnpriced=false) {
  const eligible=products.filter(p=>p.published!==false&&!settings.excludedIds.includes(p.id)&&(includeUnpriced||p.prices?.[currency]&&p.prices[currency]!.isActive!==false));
  if(settings.source==='manual'||settings.source==='best_selling') {
    const ids=settings.source==='manual'?settings.productIds:bestSellers;
    return ids.flatMap(id=>{const product=eligible.find(p=>p.id===id);return product?[product]:[];}).slice(0,settings.maxProducts);
  }
  const filtered=settings.source==='category'?eligible.filter(p=>p.category===settings.category):eligible;
  return [...filtered].sort((a,b)=>{
    if(settings.sort==='oldest')return a.id-b.id;
    if(settings.sort==='price_asc'||settings.sort==='price_desc'){
      const ap=a.prices?.[currency],bp=b.prices?.[currency];
      if(!ap)return bp?1:0;
      if(!bp)return -1;
      return (ap.priceMinor-bp.priceMinor)*(settings.sort==='price_asc'?1:-1);
    }
    return b.id-a.id;
  }).slice(0,settings.maxProducts);
}

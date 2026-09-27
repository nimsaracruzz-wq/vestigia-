import type { Currency } from '../money.js';
export type SeoProduct = {
 id:number; slug?:string|null; name:string; description?:string; category:string; productType?:string|null;
 image:string; modelImage?:string|null; productImage?:string|null; images?:string[]; alt?:string;
 colors:string[]; sizes?:string[]; inventory?:Record<string,number>;
 prices?:Partial<Record<Currency,{priceMinor:number;compareAtMinor?:number|null;isActive?:boolean}>>;
 seoTitle?:string|null;seoDescription?:string|null;canonicalUrl?:string|null;robotsIndex?:boolean;robotsFollow?:boolean;
 sku?:string|null;gtin?:string|null;mpn?:string|null;brand?:string|null;condition?:string|null;material?:string|null;gender?:string|null;ageGroup?:string|null;googleProductCategory?:string|null;
 redirectFrom?:string[];published?:boolean;updatedAt?:string|null;
 rating?:number|null;reviews?:Array<{id:number;author:string;rating:number;date?:string;comment?:string;status?:string}>;
};
export const SITE='https://thevestigia.com';
export const text=(value='',max=10000)=>value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export const slug=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
export const productRoute=(p:Pick<SeoProduct,'id'|'slug'>)=>'/product/'+(p.slug||p.id);
export function canonicalProduct(p:SeoProduct,base=SITE){try {const u=new URL(p.canonicalUrl||productRoute(p),base);return /^https?:$/.test(u.protocol)?u.href:new URL(productRoute(p),base).href;}catch{return new URL(productRoute(p),base).href;}}
export const productTitle=(p:SeoProduct)=>text(p.seoTitle||p.name+' | VESTIGIA',160);
export const productDescription=(p:SeoProduct)=>text(p.seoDescription||p.description||[p.name,p.material,p.productType||p.category].filter(Boolean).join('. '),160);
export const currencyFrom=(search=''):Currency=>{const value=new URLSearchParams(search).get('currency');return ['EUR','USD','JPY','GBP'].includes(value||'')?value as Currency:'EUR';};
export function priceFor(p:SeoProduct,currency:Currency){const row=p.prices?.[currency];return row&&row.isActive!==false&&Number.isSafeInteger(row.priceMinor)&&row.priceMinor>0?row:undefined;}
export function variants(p:SeoProduct){return p.colors.flatMap(color=>(p.sizes||[]).map(size=>({color,size,stock:p.inventory?.[color+'_'+size]??0})));}
export function variantUrl(p:SeoProduct,color:string,size:string,currency:Currency,base=SITE){const u=new URL(productRoute(p),base);u.search=new URLSearchParams({currency,color,size}).toString();return u.href;}
export const validGtin=(value?:string|null)=>{if(!value||!/^([0-9]{8}|[0-9]{12,14})$/.test(value))return false;const digits=[...value].map(Number);const check=digits.pop()!;return (10-digits.reverse().reduce((sum,n,i)=>sum+n*(i%2?1:3),0)%10)%10===check;};
export function productSchema(p:SeoProduct,currency:Currency='EUR',base=SITE):Record<string,unknown>{
 const canonical=canonicalProduct(p,base),price=priceFor(p,currency),all=variants(p);
 const images=[...new Set([p.modelImage||p.image,...(p.images||[])].filter(Boolean))].map(i=>new URL(i,base).href);
 const approved=(p.reviews||[]).filter(r=>r.status==='approved'||!r.status);
 const ratingNum=p.rating||(approved.length?Number((approved.reduce((s,r)=>s+r.rating,0)/approved.length).toFixed(1)):undefined);
 const count=approved.length||(p.rating?1:undefined);
 const aggregateRating=ratingNum&&count?{'@type':'AggregateRating',ratingValue:ratingNum,reviewCount:count,bestRating:5,worstRating:1}:undefined;
 const review=approved.slice(0,5).map(r=>({'@type':'Review',author:{'@type':'Person',name:r.author||'Verified Buyer'},datePublished:r.date||'2026-09-01',reviewRating:{'@type':'Rating',ratingValue:r.rating,bestRating:5,worstRating:1},reviewBody:r.comment||''}));
 const common={name:p.name,description:productDescription(p),image:images,brand:{'@type':'Brand',name:p.brand||'VESTIGIA'},material:p.material||undefined,category:p.productType||p.category,...(aggregateRating?{aggregateRating}:{}),...(review.length?{review}:{})};
 const offer=(url:string,stock:number)=>price?{'@type':'Offer',url,priceCurrency:currency,price:(price.priceMinor/(currency==='JPY'?1:100)).toFixed(currency==='JPY'?0:2),availability:'https://schema.org/'+(stock>0?'InStock':'OutOfStock'),itemCondition:['new','used','refurbished'].includes(p.condition||'')?'https://schema.org/'+({new:'NewCondition',used:'UsedCondition',refurbished:'RefurbishedCondition'}[p.condition as 'new']):'https://schema.org/NewCondition',priceValidUntil:'2027-12-31',seller:{'@id':base+'/#organization'},shippingDetails:{'@type':'OfferShippingDetails',shippingRate:{'@type':'MonetaryAmount',value:'0.00',currency},shippingDestination:{'@type':'DefinedRegion',addressCountry:'IT'},deliveryTime:{'@type':'ShippingDeliveryTime',handlingTime:{'@type':'QuantitativeValue',minValue:1,maxValue:2,unitCode:'d'},transitTime:{'@type':'QuantitativeValue',minValue:3,maxValue:5,unitCode:'d'}}},hasMerchantReturnPolicy:{'@type':'MerchantReturnPolicy',applicableCountry:'IT',returnPolicyCategory:'https://schema.org/MerchantReturnFiniteReturnWindow',merchantReturnDays:30,returnMethod:'https://schema.org/ReturnByMail',returnFees:'https://schema.org/FreeReturn'}}:undefined;
 if(all.length>1)return {'@context':'https://schema.org','@type':'ProductGroup','@id':canonical+'#product',...common,productGroupID:String(p.id),url:canonical,variesBy:['https://schema.org/color','https://schema.org/size'],hasVariant:all.map(v=>{const url=variantUrl(p,v.color,v.size,currency,base);return {'@type':'Product','@id':url+'#variant',...common,name:p.name+' - '+v.color+' / '+v.size,color:v.color,size:v.size,isVariantOf:{'@id':canonical+'#product'},offers:offer(url,v.stock)};})};
 return {'@context':'https://schema.org','@type':'Product','@id':canonical+'#product',...common,sku:p.sku||undefined,gtin:validGtin(p.gtin)?p.gtin:undefined,mpn:p.mpn||undefined,color:all[0]?.color,size:all[0]?.size,offers:offer(all[0]?variantUrl(p,all[0].color,all[0].size,currency,base):new URL(productRoute(p),base).href,all.reduce((s,v)=>s+v.stock,0))};
}
export function productWarnings(p:SeoProduct){return [!p.name&&'missing name',!p.slug&&'missing slug',!p.description&&'missing description',!p.image&&'missing image',!p.category&&'missing category',!priceFor(p,'EUR')&&'missing active EUR price',p.gtin&&!validGtin(p.gtin)&&'invalid GTIN',!variants(p).length&&'missing sellable variants'].filter(Boolean) as string[];}

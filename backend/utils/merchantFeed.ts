import { canonicalProduct,productRoute,priceFor,variants,variantUrl,validGtin,productWarnings,text,type SeoProduct } from '../../shared/seo/product.js';
import type { Express, RequestHandler } from 'express';
export const xmlEscape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function merchantFeed(products:SeoProduct[],base:string){
 const warnings:string[]=[],items:string[]=[];
 const tag=(name:string,value:string)=>'<g:'+name+'>'+xmlEscape(value)+'</g:'+name+'>';
 for(const p of products){if(p.published===false||p.robotsIndex===false||canonicalProduct(p,base)!==new URL(productRoute(p),base).href)continue;
 const issues=productWarnings(p),price=priceFor(p,'EUR');if(issues.length)warnings.push('Product '+p.id+': '+issues.join(', '));
 if(p.gtin&&!validGtin(p.gtin))continue;
 if(!price||!p.name||!p.description||!p.image||!variants(p).length)continue;
 const productCategory=(p.googleProductCategory||p.productType||p.category||'').toLowerCase();
 const isApparel=/apparel|clothing|footwear|shoes/.test(productCategory);
 const validGender=['male','female','unisex'].includes((p.gender||'').toLowerCase());
 const validAgeGroup=['newborn','infant','toddler','kids','adult'].includes((p.ageGroup||'').toLowerCase());
 if(isApparel&&(!validGender||!validAgeGroup)){warnings.push('Product '+p.id+': missing or invalid apparel gender/age group');continue;}
 let primaryImage:string;try{const image=new URL(p.modelImage||p.image,base);if(!['https:','http:'].includes(image.protocol))throw Error('protocol');primaryImage=image.href;}catch{warnings.push('Product '+p.id+': invalid image URL');continue;}
 for(const v of variants(p)){
 const hasSale=Boolean(price.compareAtMinor&&price.compareAtMinor>price.priceMinor);
 const values:Record<string,string>={id:p.id+'-'+encodeURIComponent(v.color)+'-'+encodeURIComponent(v.size),item_group_id:String(p.id),title:text(p.name+' - '+v.color+' / '+v.size,150),description:text(p.description,5000),link:variantUrl(p,v.color,v.size,'EUR',base),image_link:primaryImage,availability:v.stock>0?'in_stock':'out_of_stock',price:(hasSale?(price.compareAtMinor!/100):(price.priceMinor/100)).toFixed(2)+' EUR',brand:p.brand||'VESTIGIA',color:v.color,size:v.size};
 if(hasSale)values.sale_price=(price.priceMinor/100).toFixed(2)+' EUR';
 for(const key of ['mpn','material'] as const)if(p[key])values[key]=p[key]!;
 if(p.gender)values.gender=p.gender.toLowerCase();
 if(p.ageGroup)values.age_group=p.ageGroup.toLowerCase();
 if(p.googleProductCategory)values.google_product_category=p.googleProductCategory;
 if(p.productType||p.category)values.product_type=p.productType||p.category;
 if(['new','used','refurbished'].includes(p.condition||''))values.condition=p.condition!;
 // These catalog variants have no GTIN or MPN. Do not fabricate identifiers.
 // Only claim identifiers exist when an identifier is actually emitted for this item.
 if(!p.gtin&&!p.mpn)values.identifier_exists='no';
 else if(variants(p).length===1&&(validGtin(p.gtin)||p.mpn))values.identifier_exists='yes';
 // Parent identifiers cannot be assigned to every size/color variant.
 if(variants(p).length===1&&validGtin(p.gtin))values.gtin=p.gtin!;
 if(variants(p).length>1)delete values.mpn;
 const extraImages=(p.images||[]).map(img=>{try{const u=new URL(img,base);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}).filter(h=>h&&h!==primaryImage).slice(0,5);
 const extraTags=extraImages.map(img=>tag('additional_image_link',img)).join('');
 items.push('<item>'+Object.entries(values).map(([k,value])=>tag(k,value)).join('')+extraTags+'</item>');
 }}
 return {warnings,xml:'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>VESTIGIA EUR product feed</title><link>'+xmlEscape(base)+'</link><description>VESTIGIA products</description>'+items.join('')+'</channel></rss>'};
}

export const MERCHANT_FEED_PATHS=['/google-shopping.xml','/api/feeds/google-shopping','/api/products/google-feed','/feeds/google-shopping.xml','/feeds/google-shopping','/feeds/products.xml'] as const;
export function merchantFeedHandler(loadProducts:()=>Promise<SeoProduct[]>,base:()=>string):RequestHandler{
 return async (_req,res)=>{
  try{
   const result=merchantFeed(await loadProducts(),base());
   for(const warning of result.warnings)console.warn('[Merchant]',warning);
   res.set('Cache-Control','no-cache').type('application/xml').send(result.xml);
  }catch{res.status(503).json({error:'Product feed temporarily unavailable'});}
 };
}
export function installMerchantFeedRoutes(app:Pick<Express,'get'>,loadProducts:()=>Promise<SeoProduct[]>,base:()=>string){
 const handler=merchantFeedHandler(loadProducts,base);
 for(const route of MERCHANT_FEED_PATHS)app.get(route,handler);
}

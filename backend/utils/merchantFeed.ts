import { canonicalProduct,productRoute,priceFor,variants,variantUrl,validGtin,productWarnings,text,type SeoProduct } from '../../shared/seo/product.js';
export const xmlEscape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function merchantFeed(products:SeoProduct[],base:string){
 const warnings:string[]=[],items:string[]=[];
 const tag=(name:string,value:string)=>'<g:'+name+'>'+xmlEscape(value)+'</g:'+name+'>';
 for(const p of products){if(p.published===false||p.robotsIndex===false||canonicalProduct(p,base)!==new URL(productRoute(p),base).href)continue;
 const issues=productWarnings(p),price=priceFor(p,'EUR');if(issues.length)warnings.push('Product '+p.id+': '+issues.join(', '));
 if(!price||!p.name||!p.description||!p.image||!variants(p).length)continue;
 let primaryImage:string;try{const image=new URL(p.modelImage||p.image,base);if(!['https:','http:'].includes(image.protocol))throw Error('protocol');primaryImage=image.href;}catch{warnings.push('Product '+p.id+': invalid image URL');continue;}
 for(const v of variants(p)){
 const hasSale=Boolean(price.compareAtMinor&&price.compareAtMinor>price.priceMinor);
 const values:Record<string,string>={id:p.id+'-'+encodeURIComponent(v.color)+'-'+encodeURIComponent(v.size),item_group_id:String(p.id),title:p.name+' - '+v.color+' / '+v.size,description:text(p.description),link:variantUrl(p,v.color,v.size,'EUR',base),image_link:primaryImage,availability:v.stock>0?'in_stock':'out_of_stock',price:(hasSale?(price.compareAtMinor!/100):(price.priceMinor/100)).toFixed(2)+' EUR',brand:p.brand||'VESTIGIA',color:v.color,size:v.size};
 if(hasSale)values.sale_price=(price.priceMinor/100).toFixed(2)+' EUR';
 for(const key of ['mpn','material','gender'] as const)if(p[key])values[key]=p[key]!;
 if(p.ageGroup)values.age_group=p.ageGroup;
 if(p.googleProductCategory)values.google_product_category=p.googleProductCategory;
 if(p.productType||p.category)values.product_type=p.productType||p.category;
 if(['new','used','refurbished'].includes(p.condition||''))values.condition=p.condition!;
 values.return_policy_label='standard_30_days';
 // Parent identifiers cannot be assigned to every size/color variant.
 if(variants(p).length===1&&validGtin(p.gtin))values.gtin=p.gtin!;
 if(variants(p).length>1)delete values.mpn;
 const extraImages=(p.images||[]).map(img=>{try{return new URL(img,base).href;}catch{return '';}}).filter(h=>h&&h!==primaryImage).slice(0,5);
 const extraTags=extraImages.map(img=>tag('additional_image_link',img)).join('');
 const shippingTag='<g:shipping><g:country>IT</g:country><g:service>Express Delivery</g:service><g:price>0.00 EUR</g:price></g:shipping>';
 items.push('<item>'+Object.entries(values).map(([k,value])=>tag(k,value)).join('')+extraTags+shippingTag+'</item>');
 }}
 return {warnings,xml:'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>VESTIGIA EUR product feed</title><link>'+xmlEscape(base)+'</link><description>VESTIGIA products</description>'+items.join('')+'</channel></rss>'};
}

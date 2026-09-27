import PublicProduct from './PublicProduct.js';
import { HeroHeading } from './HeroHeading.js';
import { catalog } from './seo/catalog.js';
import { urlPolicy } from './seo/policy.js';
import type { SeoProduct } from './seo/product.js';
import { createElement } from 'react';
import { orderedSections,type HomepageConfig,type HomepageSection,type Copy } from './homepage.js';
import { selectHomepageProducts } from './homepageProducts.js';
import { formatMoney } from './money.js';
import { defaultShopSettings } from './shop.js';
type Product=SeoProduct;
function CopyBlock({copy,hero=false}:{copy:Copy;hero?:boolean}){return <div className={`hp-copy hp-align-${copy.alignment} hp-copy-${copy.textWidth}`}><p className="hp-eyebrow">{copy.eyebrow}</p>{createElement(hero?'h1':'h2',null,hero?<HeroHeading text={copy.heading}/>:copy.heading)}<p className="hp-body">{copy.body}</p><div className="hp-actions">{[copy.cta,copy.secondaryCta].map((link,i)=>link.url&&<a key={i} className="hp-link" href={link.url}>{link.label}</a>)}</div></div>;}
function Cards({products}:{products:Product[]}){return <div className="vs-grid">{products.map(p=><article className="vc-card" key={p.id}><div className="vc-media"><a className="vc-image-link" href={`/product/${p.slug||p.id}`}><img src={p.modelImage||p.image} alt={p.alt||p.name} width={600} height={750} loading="lazy"/></a></div><div className="vc-info"><h3><a href={`/product/${p.slug||p.id}`}>{p.name}</a></h3><p className="vc-color">{p.colors.join(' / ')}</p>{p.prices?.EUR&&p.prices.EUR.isActive!==false&&<p className="vc-price">{formatMoney(p.prices.EUR.priceMinor,'EUR')}</p>}</div></article>)}</div>;}
function Section({section,products}:{section:HomepageSection;products:Product[]}){
 const s=section.settings;
 if(section.type==='announcement')return null;
 if(section.type==='hero'||section.type==='editorial_banner'){
  const t=section.settings,hero=section.type==='hero',f=hero?section.settings:null;
  return <section className={`hp-banner hp-${section.type} hp-overlay-${t.overlay} hp-text-${t.textTheme} hp-vertical-${t.vertical} hp-height-${t.desktopHeight} hp-mobile-height-${t.mobileHeight}`}>
   <picture className={`hp-media ${hero?'hp-hero-media':''}`} style={f?{'--hero-desktop-x':`${f.desktopFocalX}%`,'--hero-desktop-y':`${f.desktopFocalY}%`,'--hero-tablet-x':`${f.tabletFocalX}%`,'--hero-tablet-y':`${f.tabletFocalY}%`,'--hero-mobile-x':`${f.mobileFocalX}%`,'--hero-mobile-y':`${f.mobileFocalY}%`} as import('react').CSSProperties:undefined}><source media="(max-width:767px)" srcSet={t.mobileImage||t.image}/><img src={t.image} alt={t.alt} width={1254} height={1254} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'}/></picture><CopyBlock copy={t} hero={hero}/>
  </section>;
 }
 if(section.type==='product_carousel'){const selected=selectHomepageProducts(products,section.settings,'EUR',[],true);return selected.length?<section className="hp-section"><CopyBlock copy={section.settings}/><Cards products={selected}/></section>:null;}
 if(section.type==='editorial_split')return <section className={`hp-section hp-split hp-${section.settings.layout}`}><picture className="hp-media"><source media="(max-width:767px)" srcSet={section.settings.mobileImage||section.settings.image}/><img src={section.settings.image} alt={section.settings.alt} loading="lazy"/></picture><CopyBlock copy={section.settings}/></section>;
 if(section.type==='lookbook')return <section className="hp-section"><CopyBlock copy={section.settings}/><div className="hp-gallery">{section.settings.items.filter(i=>i.enabled).map(i=><figure key={i.id}><img src={i.image} alt={i.alt} loading="lazy" style={{width:'100%'}}/><figcaption>{i.caption}</figcaption></figure>)}</div></section>;
 if(section.type==='newsletter')return <section className="hp-section hp-newsletter hp-theme-black"><CopyBlock copy={section.settings}/></section>;
 if('heading' in s)return <section className={`hp-section hp-theme-${s.background}`}><CopyBlock copy={s}/></section>;
 return null;
}
export default function PublicStorefront({config,products,pathname='/',search=''}:{config:HomepageConfig;products:Product[];pathname?:string;search?:string}){
 const home=pathname==='/',sections=orderedSections(config),hero=sections.find(s=>s.type==='hero');
 const product=pathname.startsWith('/product/')?products.find(p=>(p.slug||String(p.id))===decodeURIComponent(pathname.slice(9))):undefined;
 const listing=catalog(config,products,pathname,search),{items:filtered,title}=listing;
 const page=urlPolicy(pathname,search).page,visible=filtered.slice(0,listing.pageSize*page);
 return <div className="site-shell public-document"><header className="public-document-nav"><a href="/">VESTIGIA</a><nav aria-label="Main navigation"><a href="/shop">Shop</a><a href="/story">Our story</a><a href="/account">Account</a></nav></header><main className="hp-page">{product?<PublicProduct product={product} search={search}/>:home?<>{!hero&&<h1>{config.seo.title}</h1>}{sections.map(s=><Section key={s.id} section={s} products={products}/>)}</>:<div className="vestigia-shop"><header className="vs-intro"><p>SHOP</p><h1>{title}</h1><p>{listing.description}</p></header><div className="vs-catalog"><nav className="vs-collections"><a href="/shop">All</a>{listing.links.map(l=><a key={l.path} href={l.path}>{l.title}</a>)}</nav><p>{filtered.length} products</p><Cards products={visible}/>{visible.length<filtered.length&&page<100&&<a href={pathname+'?page='+(page+1)}>More products</a>}</div></div>}</main><footer className="hp-footer"><p>{config.footer.description}</p><nav>{config.footer.groups.map(g=><section key={g.id}><h2>{g.title}</h2>{g.links.filter(l=>l.enabled).map(l=><p key={l.url}><a href={l.url}>{l.label}</a></p>)}</section>)}</nav><p>{config.footer.copyright}</p></footer></div>;
}

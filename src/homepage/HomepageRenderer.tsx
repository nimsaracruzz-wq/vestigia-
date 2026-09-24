import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { orderedSections, type HomepageConfig, type HomepageSection, type Media, type Copy, type LinkContent, type NewsletterSettings, type AnnouncementSettings } from '../../shared/homepage';
import { useAdmin } from '../admin/AdminContext';
import { useCurrency } from '../context/CurrencyContext';
import type { Product } from '../data';
import { API_BASE_URL } from '../config/api';
import { resolveProductImageUrl } from '../utils/productMedia';
import { Reveal } from '../animation/Reveal';
import { SEOHead } from '../components/common/SEOHead';
import ProductCarousel, { selectHomepageProducts } from './ProductCarousel';
import HeroImage from './HeroImage';
import HotspotPreview from './HotspotPreview';
import './homepage.css';
import SectionBoundary from './SectionBoundary';
import './hero-hotspots.css';

export function CmsLink({value,className}: {value:LinkContent;className?:string}) { return value.label&&value.url ? value.url.startsWith('/')?<Link className={className} to={value.url}>{value.label}</Link>:<a className={className} href={value.url}>{value.label}</a>:null; }
export function ResponsiveMedia({media,priority=false}: {media:Media;priority?:boolean}) {
  return <picture className="hp-media" style={{'--image-position':media.desktopPosition,'--mobile-image-position':media.mobilePosition} as CSSProperties}>
    {media.mobileImage&&<source media="(max-width: 767px)" srcSet={resolveProductImageUrl(media.mobileImage)} />}
    {!media.mobileImage&&media.image==='/images/products/vestigia-hero-1254.jpg'&&<source media="(max-width: 767px)" srcSet="/images/products/vestigia-hero-768.jpg" />}
    <img src={resolveProductImageUrl(media.image)} alt={media.alt} width={1200} height={1500} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" onError={e=>{e.currentTarget.style.opacity='0';}} />
  </picture>;
}
function SectionCopy({copy,hero=false}: {copy:Copy;hero?:boolean}) { const Heading=hero?'h1':'h2';return <div className={`hp-copy hp-align-${copy.alignment} hp-width-${copy.textWidth}`}>
  {copy.eyebrow&&<p className="hp-eyebrow">{copy.eyebrow}</p>}<Heading>{copy.heading}</Heading>{copy.body&&<p className="hp-body">{copy.body}</p>}
  <div className="hp-actions"><CmsLink value={copy.cta} className="hp-link"/><CmsLink value={copy.secondaryCta} className="hp-link hp-link-secondary"/></div>
  </div>; }
export function CmsAnnouncement({settings}: {settings:AnnouncementSettings}) {
  const messages=settings.messages.filter(m=>m.enabled),[index,setIndex]=useState(0),[paused,setPaused]=useState(false),reduced=useReducedMotion();
  useEffect(()=>{if(!settings.rotation||messages.length<2||reduced||paused)return;const timer=setInterval(()=>setIndex(i=>(i+1)%messages.length),settings.interval*1000);return()=>clearInterval(timer);},[settings.rotation,settings.interval,messages.length,reduced,paused]);
  const current=messages[index%messages.length];if(!current)return null;
  return <div className={`announcement hp-announcement hp-theme-${settings.background} hp-text-${settings.textTheme}`} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)}><span>{current.url?<CmsLink value={{label:current.text,url:current.url}}/>:current.text}</span>{settings.rotation&&messages.length>1&&<button type="button" aria-label={paused?'Resume announcements':'Pause announcements'} onClick={()=>setPaused(v=>!v)}>{paused?'▶':'Ⅱ'}</button>}</div>;
}
export function NewsletterSection({settings}: {settings:NewsletterSettings}) {
  const id=useId(),[email,setEmail]=useState(''),[state,setState]=useState<'idle'|'sending'|'sent'>('idle'),[error,setError]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();if(state==='sending')return;setState('sending');setError('');try{const res=await fetch(API_BASE_URL+'/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),source:'homepage_inner_circle'})});const data=await res.json();if(!res.ok)throw new Error(data.message||data.error||'Please try again.');setState('sent');}catch(e){setError(e instanceof Error?e.message:'Please try again.');setState('idle');}};
  return <section className={`hp-section hp-newsletter hp-theme-${settings.background}`}>
    {settings.crest&&<img className="hp-crest" src="/images/products/vestigia-logo-192.png" alt="" width={80} height={80} loading="lazy"/>}<SectionCopy copy={settings}/>
    {state==='sent'?<p role="status">{settings.successMessage}</p>:<form onSubmit={submit}><label className="sr-only" htmlFor={id}>Email address</label><input id={id} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={settings.placeholder} required disabled={state==='sending'}/><button disabled={state==='sending'}>{state==='sending'?'Joining…':settings.buttonLabel}</button><p className="hp-privacy">{settings.privacyCopy} <Link to="/privacy-policy">Privacy policy</Link></p>{error&&<p role="alert">{error}</p>}</form>}
  </section>;
}
function RenderSection({section,products,bestSellers,onQuickShop}: {section:HomepageSection;products:Product[];bestSellers:number[];onQuickShop:(p:Product)=>void}) {
 const [previewId,setPreviewId]=useState<number|null>(null);
 const previewProduct=products.find(p=>p.id===previewId);
  const {currency}=useCurrency();
  const {isSynced}=useAdmin();
  switch(section.type) {
    case 'announcement': return null;
    case 'hero': case 'editorial_banner': {const s=section.settings;return <section className={`hp-banner hp-${section.type} hp-overlay-${s.overlay} hp-text-${s.textTheme} hp-vertical-${s.vertical} hp-height-${s.desktopHeight} hp-mobile-height-${s.mobileHeight}`}>{section.type==='hero'?<HeroImage settings={section.settings} hotspots={section.settings.hotspots.filter(h=>products.some(p=>p.id===h.productId))} label={id=>products.find(p=>p.id===id)?.name||'Product'} onOpen={setPreviewId}/>:<ResponsiveMedia media={s}/>}<SectionCopy copy={s} hero={section.type==='hero'}/>{previewProduct&&<HotspotPreview product={previewProduct} onClose={()=>setPreviewId(null)} onQuickShop={onQuickShop}/>}</section>;}
    case 'manifesto': return <Reveal as="section" className={`hp-section hp-manifesto hp-theme-${section.settings.background}`}><SectionCopy copy={section.settings}/></Reveal>;
    case 'editorial_split': {const s=section.settings;return <section className={`hp-section hp-split hp-theme-${s.background} hp-${s.layout} hp-ratio-${s.ratio}`}><ResponsiveMedia media={s}/><Reveal><SectionCopy copy={s}/></Reveal></section>;}
    case 'product_carousel': {if(!isSynced)return <section className={`hp-section hp-theme-${section.settings.background}`} aria-busy="true"><SectionCopy copy={section.settings}/><div className="hp-product-skeleton" aria-label="Loading products" role="status">{[0,1,2,3].map(n=><div key={n}/>)}</div></section>;const selected=selectHomepageProducts(products,section.settings,currency,bestSellers);if(!selected.length)return null;return <section className={`hp-section hp-merchandising hp-theme-${section.settings.background}`}><Reveal><SectionCopy copy={section.settings}/></Reveal><ProductCarousel products={selected} settings={section.settings} onQuickShop={onQuickShop}/></section>;}
    case 'lookbook': return <section className={`hp-section hp-lookbook hp-theme-${section.settings.background}`}><SectionCopy copy={section.settings}/><div className={`hp-gallery hp-gallery-${section.settings.layout}`}>{section.settings.items.filter(i=>i.enabled).map(i=><figure key={i.id}>{i.url?<a href={i.url}><ResponsiveMedia media={i}/></a>:<ResponsiveMedia media={i}/>}<figcaption>{i.caption}</figcaption></figure>)}</div></section>;
    case 'newsletter':return <NewsletterSection settings={section.settings}/>;
  }
}
export default function HomepageRenderer({config,onQuickShop,preview=false}: {config:HomepageConfig;onQuickShop:(p:Product)=>void;preview?:boolean}) {
  const {products,isSynced}=useAdmin(),[bestSellers,setBestSellers]=useState<number[]>([]);
  const needsSales=config.sections.some(s=>s.enabled&&s.type==='product_carousel'&&s.settings.source==='best_selling');
  useEffect(()=>{if(!needsSales)return;const controller=new AbortController();fetch(API_BASE_URL+'/storefront/homepage/best-sellers',{signal:controller.signal}).then(r=>r.ok?r.json():[]).then(setBestSellers).catch(()=>{});return()=>controller.abort();},[needsSales]);
  const sections=orderedSections(config).filter(s=>s.type!=='announcement');
  return <div className="hp-page"><SEOHead title={config.seo.title} description={config.seo.description} ogImage={config.seo.image} canonicalUrl={config.seo.canonical||'/'} noIndex={preview||!config.seo.index}/>{!sections.some(s=>s.type==='hero')&&<h1 className="sr-only">{config.seo.title}</h1>}{sections.map(s=><SectionBoundary key={s.id} resetKey={s}><RenderSection section={s} products={isSynced?products:[]} bestSellers={bestSellers} onQuickShop={onQuickShop}/></SectionBoundary>)}{!isSynced&&<p className="hp-loading" role="status">Loading the collection…</p>}</div>;
}

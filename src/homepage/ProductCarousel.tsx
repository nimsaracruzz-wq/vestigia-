import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { CarouselSettings } from '../../shared/homepage';
import type { Product } from '../data';
import ProductCard from '../components/common/ProductCard';

export { selectHomepageProducts } from '../../shared/homepageProducts';

export default function ProductCarousel({products,settings,onQuickShop}: {products: Product[];settings: CarouselSettings;onQuickShop:(p:Product)=>void}) {
  const track=useRef<HTMLDivElement>(null), reduced=useReducedMotion();
  const [paused,setPaused]=useState(false),[userPaused,setUserPaused]=useState(false),[edges,setEdges]=useState({start:true,end:false});
  const update=()=>{const e=track.current;if(e){const start=e.scrollLeft<2,end=e.scrollLeft+e.clientWidth>=e.scrollWidth-2;setEdges(prev=>prev.start===start&&prev.end===end?prev:{start,end});}};
  const move=(direction:number)=>{const e=track.current;if(!e)return;const end=e.scrollLeft+e.clientWidth>=e.scrollWidth-2;const start=e.scrollLeft<2;if(settings.loop&&(direction>0&&end||direction<0&&start))e.scrollTo({left:direction>0?0:e.scrollWidth,behavior:reduced?'instant':'smooth'});else e.scrollBy({left:direction*(e.firstElementChild?.getBoundingClientRect().width || e.clientWidth)*1.05,behavior:reduced?'instant':'smooth'});};
  useEffect(()=>{update();const observer=new ResizeObserver(update);if(track.current)observer.observe(track.current);return()=>observer.disconnect();},[products.length]);
  useEffect(()=>{if(!settings.autoplay||paused||userPaused||reduced)return;const timer=setInterval(()=>{if(!document.hidden)move(1);},6000);return()=>clearInterval(timer);},[settings.autoplay,settings.loop,paused,userPaused,reduced]);
  const style={'--desktop-items':settings.desktopItems,'--tablet-items':settings.tabletItems,'--mobile-items':settings.mobileItems} as CSSProperties;
  return <div className={`hp-products hp-products--${settings.layout}`} style={style} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false);}}>
    {(settings.arrows||settings.autoplay)&&<div className="hp-carousel-controls">{settings.arrows&&<><button type="button" aria-label="Previous products" disabled={!settings.loop&&edges.start} onClick={()=>move(-1)}>←</button><button type="button" aria-label="Next products" disabled={!settings.loop&&edges.end} onClick={()=>move(1)}>→</button></>}{settings.autoplay&&<button type="button" aria-pressed={userPaused} onClick={()=>setUserPaused(p=>!p)}>{userPaused?'Play':'Pause'}</button>}</div>}
    <div ref={track} className="hp-product-track" onScroll={update} tabIndex={0} role="region" aria-roledescription="carousel" aria-label={settings.heading} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}>
      {products.map((p,i)=><ProductCard reveal={i<8} revealIndex={i} key={p.id} product={p} onQuickShop={()=>onQuickShop(p)} display={{wishlist:settings.wishlist,quickAdd:settings.quickAdd,colors:settings.colors,badges:settings.badges,badge:settings.badge}} />)}
    </div>
  </div>;
}

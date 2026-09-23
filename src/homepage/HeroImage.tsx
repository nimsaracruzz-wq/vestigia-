import { useEffect,useRef,useState, type CSSProperties } from 'react';
import type { HeroFocalPoints, Media, Hotspot } from '../../shared/homepage';
import { heroImageSources, heroMediaStyle } from '../../shared/heroMedia';
import { coverGeometry,heroFocal,hotspotPoint,toFrame,toImage,type HeroMode } from '../../shared/heroHotspots';
import { resolveProductImageUrl } from '../utils/productMedia';

type Props={settings:Media & HeroFocalPoints;hotspots?:Hotspot[];mode?:HeroMode;label?:(id:number)=>string;onOpen?:(id:number)=>void;onMove?:(index:number,x:number,y:number)=>void};
/** Image and markers share one measured frame; cover cropping is applied to image anchors. */
export default function HeroImage({settings,hotspots=[],mode:forcedMode,label,onOpen,onMove}:Props) {
 const frame=useRef<HTMLDivElement>(null),img=useRef<HTMLImageElement>(null);
 const [size,setSize]=useState({width:0,height:0,imageWidth:0,imageHeight:0});
 const [viewport,setViewport]=useState<HeroMode>('desktop');
 const mode=forcedMode||viewport,sources=heroImageSources(settings),focal=heroFocal(settings,mode);
 const measure=()=>{const el=frame.current,image=img.current;if(el&&image)setSize({width:el.clientWidth,height:el.clientHeight,imageWidth:image.naturalWidth,imageHeight:image.naturalHeight});};
 useEffect(()=>{const update=()=>{setViewport(window.innerWidth<=767?'mobile':window.innerWidth<1100?'tablet':'desktop');measure();};update();const observer=new ResizeObserver(update);if(frame.current)observer.observe(frame.current);window.addEventListener('resize',update);return()=>{observer.disconnect();window.removeEventListener('resize',update);};},[]);
 const ready=size.width>0&&size.height>0&&size.imageWidth>0&&size.imageHeight>0;
 const geometry=ready?coverGeometry(size.width,size.height,size.imageWidth,size.imageHeight,focal.x,focal.y):null;
 const source=mode==='mobile'?sources.mobile:sources.desktop;
 return <div ref={frame} className="hp-hero-stage" style={heroMediaStyle(settings) as CSSProperties}>
  <picture className="hp-media hp-hero-media">
   {!forcedMode&&<><source media="(max-width:767px)" srcSet={resolveProductImageUrl(sources.mobile)}/><source media="(min-width:768px)" srcSet={resolveProductImageUrl(sources.desktop)}/></>}
   <img ref={img} src={resolveProductImageUrl(forcedMode?source:sources.desktop)} alt={settings.alt} width={1254} height={1254} loading="eager" fetchPriority={onMove?'auto':'high'} decoding="async" onLoad={measure} style={forcedMode?{objectPosition:`${focal.x}% ${focal.y}%`}:undefined}/>
  </picture>
  <div className="hp-hotspot-layer">{hotspots.map((spot,index)=>{
   if(spot.enabled===false)return null;
   const point=hotspotPoint(spot,mode),position=spot.coordinateSpace==='image'?(geometry?toFrame(point,geometry):null):point;
   if(!position)return null;
   const move=(clientX:number,clientY:number)=>{if(!onMove||!frame.current||!geometry)return;const r=frame.current.getBoundingClientRect();const visible={x:(clientX-r.left)/r.width*100,y:(clientY-r.top)/r.height*100};const next=spot.coordinateSpace==='image'?toImage(visible,geometry):visible;onMove(index,Math.round(Math.max(0,Math.min(100,next.x))*10)/10,Math.round(Math.max(0,Math.min(100,next.y))*10)/10);};
   return <button key={spot.productId} type="button" className="hp-hotspot" style={{left:`${position.x}%`,top:`${position.y}%`,touchAction:onMove?'none':undefined}} aria-label={`${onMove?'Position':'Preview'} ${label?.(spot.productId)||`product ${spot.productId}`}`} aria-haspopup={onMove?undefined:'dialog'} onClick={()=>{if(!onMove)onOpen?.(spot.productId);}} onPointerDown={e=>{if(onMove){e.currentTarget.setPointerCapture(e.pointerId);move(e.clientX,e.clientY);}}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(e.clientX,e.clientY);}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onKeyDown={e=>{if(!onMove||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();onMove(index,Math.max(0,Math.min(100,point.x+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0))),Math.max(0,Math.min(100,point.y+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0))));}}><span aria-hidden="true">+</span></button>;
  })}</div>
 </div>;
}

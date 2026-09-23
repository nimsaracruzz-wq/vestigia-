import { useRef,useState } from 'react';
import type { SectionSettings,Hotspot } from '../../../shared/homepage';
import type { HeroMode } from '../../../shared/heroHotspots';
import { useAdmin } from '../AdminContext';
import { ProductPicker } from './Pickers';
import HeroImage from '../../homepage/HeroImage';
import '../../homepage/hero-hotspots.css';

export default function HotspotEditor({settings,onChange}:{settings:SectionSettings['hero'];onChange:(patch:Partial<SectionSettings['hero']>)=>void}) {
 const [mode,setMode]=useState<HeroMode>('mobile'),[width,setWidth]=useState(390);
 const originalImage=useRef(`${settings.image}|${settings.mobileImage}`),{products}=useAdmin();
 const changed=originalImage.current!==`${settings.image}|${settings.mobileImage}`;
 const update=(index:number,patch:Partial<Hotspot>)=>onChange({hotspots:settings.hotspots.map((h,i)=>i===index?{...h,...patch}:h)});
 const dimensions=mode==='desktop'?{width:1440,height:Math.round(900*.88)}:mode==='tablet'?{width:820,height:Math.round(1180*.84)}:{width,height:Math.round(({375:812,390:844,430:932}[width]||844)*.88)};
 const height=mode==='mobile'?(settings.mobileHeight==='full'?dimensions.height:settings.mobileHeight==='compact'?420:580):(settings.desktopHeight==='full'?dimensions.height:settings.desktopHeight==='compact'?480:650);
 return <fieldset><legend>Product hotspots</legend><p>Drag each + onto its shirt, or use the percentage fields and arrow keys. Image coordinates follow the garment through cover cropping; legacy frame coordinates remain supported.</p>
 {changed&&<p role="alert" className="cms-warning">Hero image changed. Review product hotspot positions before publishing.</p>}
 <ProductPicker ids={settings.hotspots.map(h=>h.productId)} onChange={ids=>onChange({hotspots:ids.map(id=>settings.hotspots.find(h=>h.productId===id)||{productId:id,x:50,y:50,tabletX:50,tabletY:50,mobileX:50,mobileY:50,enabled:true,coordinateSpace:'image'})})}/>
 <div className="cms-actions">{(['desktop','tablet','mobile'] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>setMode(m)}>{m}</button>)}</div>
 {mode==='mobile'&&<label>Mobile viewport<select value={width} onChange={e=>setWidth(Number(e.target.value))}>{[375,390,430].map(w=><option key={w} value={w}>{w}px</option>)}</select></label>}
 <p>Preview uses the selected image, focal point and hero height. Scroll horizontally for larger views. Use Preview Draft to also check text overlap.</p>
 <div className="cms-hotspot-scroll"><div className="cms-hotspot-frame" style={{width:dimensions.width,height}}><HeroImage settings={settings} hotspots={settings.hotspots} mode={mode} label={id=>products.find(p=>p.id===id)?.name||`Product ${id}`} onMove={(index,x,y)=>update(index,mode==='mobile'?{mobileX:x,mobileY:y}:mode==='tablet'?{tabletX:x,tabletY:y}:{x,y})}/></div></div>
 {settings.hotspots.map((spot,index)=><fieldset key={spot.productId}><legend>{products.find(p=>p.id===spot.productId)?.name||`Product #${spot.productId}`}</legend><label className="cms-toggle"><input type="checkbox" checked={spot.enabled!==false} onChange={e=>update(index,{enabled:e.target.checked})}/>Enabled</label><p>{spot.coordinateSpace==='image'?'Image':'Legacy frame'} coordinates (%)</p>{([['Desktop X','x'],['Desktop Y','y'],['Tablet X','tabletX'],['Tablet Y','tabletY'],['Mobile X','mobileX'],['Mobile Y','mobileY']] as const).map(([label,key])=><label key={key}>{label}<input type="number" min={0} max={100} step={.1} value={spot[key]??(key==='tabletX'?spot.x:spot.y)} onChange={e=>update(index,{[key]:Number(e.target.value)})}/></label>)}</fieldset>)}
 </fieldset>;
}

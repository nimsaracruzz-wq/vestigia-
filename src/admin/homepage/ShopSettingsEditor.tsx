import type { HomepageConfig } from '../../../shared/homepage';
import { defaultShopSettings, type ShopSettings } from '../../../shared/shop';
import { TextField, Toggle, SelectField } from './SectionEditor';

export default function ShopSettingsEditor({config,onChange}:{config:HomepageConfig;onChange:(value:ShopSettings)=>void}) {
 const value={...defaultShopSettings,...config.shop};
 const patch=(update:Partial<ShopSettings>)=>onChange({...value,...update});
 return <div className="cms-editor"><h2>Shop &amp; collections</h2><p>Published product carousels supply collection membership and featured order on both the homepage and shop. Edit their products in the section list. Save and publish to apply shop settings.</p>
 <TextField label="Intro label" value={value.label} onChange={label=>patch({label})}/>
 <TextField label="Shop heading" value={value.heading} onChange={heading=>patch({heading})}/>
 <TextField label="Shop description" multiline value={value.description} onChange={description=>patch({description})}/>
 <label>Default collection<select value={value.defaultCollection} onChange={e=>patch({defaultCollection:e.target.value})}><option value="">All products</option>{config.sections.filter(s=>s.type==='product_carousel'&&s.enabled).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
 <SelectField label="Products per page" value={value.pageSize} options={[8,12,24,48]} onChange={v=>patch({pageSize:Number(v)})}/>
 {([['introEnabled','Show intro'],['collectionNavigation','Show collection navigation'],['productCount','Show product count'],['filters','Enable filters'],['sort','Enable sorting'],['quickAdd','Enable quick add'],['wishlist','Enable wishlist']] as const).map(([key,label])=><Toggle key={key} label={label} value={value[key]} onChange={v=>patch({[key]:v})}/>)}
 <p>Grid: two columns on mobile, two or three on tablet, four on desktop.</p></div>;
}

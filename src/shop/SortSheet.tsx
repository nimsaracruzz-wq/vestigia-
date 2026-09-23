import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useScrollLock } from '../hooks/useScrollLock';

export default function SortSheet({value,onChange,onClose}:{value:string;onChange:(value:string)=>void;onClose:()=>void}) {
 useScrollLock(true);
 useDialogFocus(true,onClose,'.shop-sort-dialog');
 useEffect(()=>{
  const query=window.matchMedia('(min-width:768px)');
  const closeOnDesktop=()=>{if(query.matches)onClose();};
  query.addEventListener('change',closeOnDesktop);
  return()=>query.removeEventListener('change',closeOnDesktop);
 },[onClose]);
 return createPortal(<div className="shop-sort-backdrop" onClick={onClose}>
  <section className="shop-sort-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-sort-title" onClick={e=>e.stopPropagation()}>
   <header><h2 id="shop-sort-title">Sort by</h2><button type="button" onClick={onClose} aria-label="Close sort"><X size={20}/></button></header>
   <fieldset><legend className="sr-only">Sort products</legend>
    {([['featured','Featured'],['newest','Newest'],['price_asc','Price: low to high'],['price_desc','Price: high to low']] as const).map(([key,label])=><label key={key}><input type="radio" name="shop-sort" value={key} checked={value===key} onChange={()=>onChange(key)}/><span>{label}</span></label>)}
   </fieldset>
   <button className="shop-sort-done" type="button" onClick={onClose}>Done</button>
  </section>
 </div>,document.body);
}

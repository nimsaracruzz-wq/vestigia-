import { useEffect, useRef } from 'react';
const dialogs: symbol[] = [];
/** Keep keyboard navigation inside the active drawer and restore its trigger. */
export function useDialogFocus(open:boolean, onClose:()=>void, selector:string) {
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const token=Symbol('dialog');dialogs.push(token);
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const root=()=>document.querySelector<HTMLElement>(selector);
  const focusable=()=>Array.from(root()?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')||[]).filter(e=>e.getClientRects().length>0&&!e.closest('[inert], [aria-hidden="true"]'));
  const frame=requestAnimationFrame(()=>focusable()[0]?.focus({preventScroll:true}));
  const key=(e:KeyboardEvent)=>{
   if(dialogs.at(-1)!==token)return;
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close.current();return;}
   if(e.key!=='Tab')return;
   const items=focusable();if(!items.length){e.preventDefault();return;}
   if(e.shiftKey&&(document.activeElement===items[0]||!root()?.contains(document.activeElement))){e.preventDefault();items.at(-1)?.focus();}
   else if(!e.shiftKey&&(document.activeElement===items.at(-1)||!root()?.contains(document.activeElement))){e.preventDefault();items[0].focus();}
  };
  document.addEventListener('keydown',key,true);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',key,true);const wasTop=dialogs.at(-1)===token;const index=dialogs.indexOf(token);if(index>=0)dialogs.splice(index,1);if(wasTop&&previous?.isConnected)previous.focus({preventScroll:true});};
 },[open,selector]);
}

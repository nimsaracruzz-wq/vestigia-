import { publicHomepage } from '../../shared/publicHomepage';
import type { Product } from '../data';
export function readPublicBootstrap():{config:ReturnType<typeof publicHomepage>;products:Product[]}|null {
 if(typeof document==='undefined')return null;
 try{const raw=document.getElementById('vestigia-public-data')?.textContent;if(!raw)return null;const data=JSON.parse(raw);return {config:publicHomepage(data.config),products:Array.isArray(data.products)?data.products:[]};}catch{return null;}
}

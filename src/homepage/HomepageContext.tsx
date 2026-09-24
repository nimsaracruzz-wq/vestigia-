import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HomepageConfig } from '../../shared/homepage';
import { API_BASE_URL } from '../config/api';
import { initialHomepage } from '../../shared/homepage';
import { publicHomepage } from '../../shared/publicHomepage';
import { readPublicBootstrap } from './bootstrap';
function initialConfig(){const bootstrap=readPublicBootstrap();if(bootstrap)return bootstrap.config;try{const saved=localStorage.getItem('vestigia_public_homepage');if(saved)return publicHomepage(JSON.parse(saved));}catch{}return initialHomepage();}
const Context = createContext<{config: HomepageConfig | null; loading: boolean; error: string; reload: () => void}>({config:null,loading:true,error:'',reload:()=>{}});
export function HomepageProvider({children}: {children: ReactNode}) {
  const [config,setConfig] = useState<HomepageConfig | null>(initialConfig), [loading,setLoading] = useState(true), [error,setError] = useState(''), [tick,setTick] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    fetch(API_BASE_URL+'/storefront/homepage',{signal:controller.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw new Error(`Public homepage request failed (${r.status})`);return r.json();}).then(data=>{if(!data.config)throw new Error('Invalid public homepage response');const next=publicHomepage(data.config,message=>console.warn('[Homepage]',message));setConfig(next);try{localStorage.setItem('vestigia_public_homepage',JSON.stringify(next));}catch{}setError('');}).catch(e=>{if(!controller.signal.aborted){console.warn('[Homepage] Keeping published/default content:',e.message);setError(e.message);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    const timeout=setTimeout(()=>{controller.abort();setLoading(false);},8000);return ()=>{clearTimeout(timeout);controller.abort();};
  },[tick]);
  useEffect(()=>{const refresh=()=>setTick(t=>t+1);const storage=(e:StorageEvent)=>{if(e.key==='vestigia_homepage_published')refresh();};window.addEventListener('focus',refresh);window.addEventListener('homepage-published',refresh);window.addEventListener('storage',storage);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('homepage-published',refresh);window.removeEventListener('storage',storage);};},[]);
  return <Context.Provider value={{config,loading,error,reload:()=>setTick(t=>t+1)}}>{children}</Context.Provider>;
}
export const useHomepage = ()=>useContext(Context);

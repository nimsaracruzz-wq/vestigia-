import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HomepageConfig } from '../../shared/homepage';
import { API_BASE_URL } from '../config/api';
const Context = createContext<{config: HomepageConfig | null; loading: boolean; error: string; reload: () => void}>({config:null,loading:true,error:'',reload:()=>{}});
export function HomepageProvider({children}: {children: ReactNode}) {
  const [config,setConfig] = useState<HomepageConfig | null>(null), [loading,setLoading] = useState(true), [error,setError] = useState(''), [tick,setTick] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    fetch(API_BASE_URL+'/storefront/homepage',{signal:controller.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw new Error('The homepage is temporarily unavailable.');return r.json();}).then(data=>{setConfig(data.config);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[tick]);
  useEffect(()=>{const refresh=()=>setTick(t=>t+1);const storage=(e:StorageEvent)=>{if(e.key==='vestigia_homepage_published')refresh();};window.addEventListener('focus',refresh);window.addEventListener('homepage-published',refresh);window.addEventListener('storage',storage);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('homepage-published',refresh);window.removeEventListener('storage',storage);};},[]);
  return <Context.Provider value={{config,loading,error,reload:()=>setTick(t=>t+1)}}>{children}</Context.Provider>;
}
export const useHomepage = ()=>useContext(Context);

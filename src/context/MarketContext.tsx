import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { MARKETS, marketForCurrency, type Currency, type Market, formatMoney, toMinor } from '../../shared/money';
import { localeCurrency, visitorCurrency } from '../../shared/visitorCurrency';
export type CurrencyCode = Currency;
function savedCurrency(): Currency {
  const locked = sessionStorage.getItem('vestigia_checkout_currency');
  const requested = new URLSearchParams(window.location.search).get('currency');
  const landingCurrency = ['EUR','USD','JPY','GBP'].includes(requested||'') ? requested : null;
  const saved = locked || landingCurrency || localStorage.getItem('vstigia_currency') || sessionStorage.getItem('vestigia_detected_currency');
  if (['JPY','USD','EUR','GBP'].includes(saved || '')) return saved as Currency;
  return localeCurrency(navigator.language);
}
type Context = { currency: Currency; market: Market; priceListId: string; setCurrency: (c: Currency) => void; formatPrice: (amount: number) => string; rates: null; isLoading: boolean; lockCheckout: () => void; unlockCheckout: () => void; checkoutLocked: boolean };
const MarketContext = createContext<Context | undefined>(undefined);
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setState] = useState<Currency>(savedCurrency);
  const [checkoutLocked, setLocked] = useState(!!sessionStorage.getItem('vestigia_checkout_currency'));
  const explicit = useRef(!!localStorage.getItem('vstigia_currency') || ['EUR','USD','JPY','GBP'].includes(new URLSearchParams(window.location.search).get('currency')||''));
  const market = marketForCurrency(currency);
  const setCurrency = (c: Currency) => {
    if (c === currency) return;
    if (sessionStorage.getItem('vestigia_checkout_currency')) { window.alert('Checkout currency is locked. Return to your bag and restart checkout to change market.'); return; }
    const cart = JSON.parse(localStorage.getItem('vestigia_cart') || '[]');
    if (cart.length && !window.confirm(`Change to ${MARKETS[marketForCurrency(c)].name} / ${c}? Your bag will be repriced and must be reviewed before payment.`)) return;
    explicit.current = true;
    localStorage.setItem('vstigia_currency',c);
    setState(c);
  };
  useEffect(() => {
    const requested=new URLSearchParams(window.location.search).get('currency');
    if(['EUR','USD','JPY','GBP'].includes(requested||'')&&!sessionStorage.getItem('vestigia_checkout_currency'))localStorage.setItem('vstigia_currency',requested!);
    const onStorage=(event: StorageEvent)=> {
      if(event.key==='vstigia_currency'&&!sessionStorage.getItem('vestigia_checkout_currency')) {
        explicit.current = ['EUR','USD','JPY','GBP'].includes(event.newValue || '');
        setState(savedCurrency());
      }
    };
    window.addEventListener('storage',onStorage);
    // A saved selection and an active checkout always outrank a late geolocation response.
    if (!explicit.current && !sessionStorage.getItem('vestigia_checkout_currency')) {
      const controller = new AbortController();
      const timer=setTimeout(()=>controller.abort(),4000);
      fetch('https://ipwho.is/',{signal:controller.signal}).then(r=>r.json()).then(data=>{
        if(!data.success || explicit.current || sessionStorage.getItem('vestigia_checkout_currency'))return;
        if(controller.signal.aborted || !/^[A-Z]{2}$/i.test(data.country_code || ''))return;
        // Never reprice a bag automatically or override a newer manual selection.
        if(JSON.parse(localStorage.getItem('vestigia_cart')||'[]').length)return;
        const detected = visitorCurrency(data.country_code);
        sessionStorage.setItem('vestigia_detected_currency', detected);
        setState(detected);
      }).catch(()=>{}).finally(()=>clearTimeout(timer));
      return()=>{controller.abort();clearTimeout(timer);window.removeEventListener('storage',onStorage);};
    }
    return()=>window.removeEventListener('storage',onStorage);
  },[]);
  const lockCheckout=()=>{sessionStorage.setItem('vestigia_checkout_currency',currency);setLocked(true);};
  const unlockCheckout=()=>{sessionStorage.removeItem('vestigia_checkout_currency');setLocked(false);};
  const formatPrice=(amount:number)=>{ if(!Number.isFinite(amount))return 'Unavailable in this market';try{return formatMoney(toMinor(String(amount),currency),currency);}catch{return 'Price requires review';} };
  return <MarketContext.Provider value={{currency,market,priceListId:MARKETS[market].priceListId,setCurrency,formatPrice,rates:null,isLoading:false,lockCheckout,unlockCheckout,checkoutLocked}}>{children}</MarketContext.Provider>;
}
export function useCurrency(){const c=useContext(MarketContext);if(!c)throw new Error('CurrencyProvider is required');return c;}

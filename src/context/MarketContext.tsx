import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { MARKETS, marketForCurrency, type Currency, type Market, formatMoney, toMinor } from '../../shared/money';
export type CurrencyCode = Currency;
function savedCurrency(): Currency {
  const locked = sessionStorage.getItem('vestigia_checkout_currency');
  const saved = locked || localStorage.getItem('vstigia_currency');
  if (['JPY','USD','EUR','GBP'].includes(saved || '')) return saved as Currency;
  const locale = navigator.language.toUpperCase();
  return locale.includes('JP') ? 'JPY' : locale.includes('GB') ? 'GBP' : 'EUR';
}
type Context = { currency: Currency; market: Market; priceListId: string; setCurrency: (c: Currency) => void; formatPrice: (amount: number) => string; rates: null; isLoading: boolean; lockCheckout: () => void; unlockCheckout: () => void; checkoutLocked: boolean };
const MarketContext = createContext<Context | undefined>(undefined);
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setState] = useState<Currency>(savedCurrency);
  const [checkoutLocked, setLocked] = useState(!!sessionStorage.getItem('vestigia_checkout_currency'));
  const explicit = useRef(!!localStorage.getItem('vstigia_currency'));
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
    const onStorage=(event: StorageEvent)=> { if(event.key==='vstigia_currency'&&!sessionStorage.getItem('vestigia_checkout_currency'))setState(savedCurrency()); };
    window.addEventListener('storage',onStorage);
    const syncAvailableMarket = async () => {
      if (sessionStorage.getItem('vestigia_checkout_currency')) return;
      try {
        const response = await fetch('/api/markets');
        const lists = await response.json();
        const activeCurrencies = Array.isArray(lists)
          ? lists.filter((list: any) => list.status === 'ACTIVE').map((list: any) => list.currency)
          : [];
        if (activeCurrencies.length && !activeCurrencies.includes(currency)) {
          const next = activeCurrencies[0] as Currency;
          localStorage.setItem('vstigia_currency', next);
          explicit.current = false;
          setState(next);
        }
      } catch {
        // Keep the local default when the market endpoint is temporarily unavailable.
      }
    };
    void syncAvailableMarket();
    // A saved selection and an active checkout always outrank a late geolocation response.
    if (!explicit.current && !sessionStorage.getItem('vestigia_checkout_currency')) {
      const controller = new AbortController();
      const timer=setTimeout(()=>controller.abort(),4000);
      fetch('https://ipwho.is/',{signal:controller.signal}).then(r=>r.json()).then(data=>{
        if(!data.success || explicit.current || sessionStorage.getItem('vestigia_checkout_currency'))return;
        const code=data.country_code;
        const c:Currency=code==='JP'?'JPY':code==='GB'?'GBP':['AT','BE','BG','CY','EE','FI','FR','DE','GR','IE','IT','HR','LV','LT','LU','MT','NL','PT','SK','SI','ES'].includes(code)?'EUR':'EUR';
        // Once an item is in the bag, automatic market changes stop.
        if(JSON.parse(localStorage.getItem('vestigia_cart')||'[]').length)return;
        fetch('/api/markets').then(r=>r.json()).then(lists=>{
          const activeCurrencies = Array.isArray(lists)
            ? lists.filter((list: any) => list.status === 'ACTIVE').map((list: any) => list.currency)
            : [];
          if (activeCurrencies.includes(c) && !explicit.current && !sessionStorage.getItem('vestigia_checkout_currency')) setState(c);
        }).catch(()=>{});
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

import { RevealGroup, Reveal } from "../../animation/Reveal";
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { MARKETS, SUPPORTED_CURRENCIES, moneyLabel, toMinor, toMajor, type Currency } from '../../utils/money';
import { useAdmin } from '../AdminContext';
async function request(path: string, body?: any, method = 'POST') {
  const res=await fetch(API_BASE_URL+path,{method:body===undefined?'GET':method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('vstigia_adm_token')}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed');return data;
}
export default function PricingControl(){
 const { refreshAdminData }=useAdmin();
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [productId,setProductId]=useState(''),[currency,setCurrency]=useState<Currency>('JPY'),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[mode,setMode]=useState('FIXED'),[rateId,setRateId]=useState('');
 const [baseCurrency,setBaseCurrency]=useState<Currency>('JPY'),[baseAmount,setBaseAmount]=useState('');
 const [methodId,setMethodId]=useState(''),[shippingAmount,setShippingAmount]=useState(''),[threshold,setThreshold]=useState('');
 const [pending,setPending]=useState<{message:string;path:string;body:any}|null>(null);
 const reload=async()=>setData(await request('/admin/pricing'));
 useEffect(()=>{reload().catch(e=>setError(e.message));},[]);
 const product=data?.products.find((p:any)=>p.id===Number(productId));
 const existing=data?.prices.find((p:any)=>p.productId===Number(productId)&&p.currency===currency);
 useEffect(()=>{setAmount(existing?String(toMajor(existing.priceMinor,currency)):'');setMode(existing?.mode||'FIXED');},[productId,currency,data]);
 useEffect(()=>{setBaseCurrency(product?.baseCurrency||'JPY');setBaseAmount(product?.basePriceMinor!=null?String(toMajor(product.basePriceMinor,product.baseCurrency)):'');},[productId,data]);
 const act=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();await reload();await refreshAdminData();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const preparePrice=()=>{try{
   if(!product||!reason.trim())throw new Error('Choose a product and enter a change reason');
   const priceMinor=toMinor(amount,currency);
   setPending({message:`Change ${product.name}, ${currency}, from ${existing?moneyLabel(existing.priceMinor,currency):'unconfigured'} to ${moneyLabel(priceMinor,currency)}?`,path:`/admin/pricing/products/${product.id}`,body:{reason,prices:{[currency]:{priceMinor,mode,exchangeRateId:rateId}}}});
 }catch(e:any){setError(e.message);}};
 if(!data)return <div className="admin-page"><h1>Pricing Control</h1><p>{error||'Loading pricing records…'}</p></div>;
 return <div className="admin-page pricing-control"><h1>Pricing Control</h1><p>Original currencies are preserved. Prices use integer minor units and audited versions.</p>
 {error&&<p role="alert" className="pricing-error">{error}</p>}
 <RevealGroup className="pricing-markets">{data.lists.map((l:any)=><Reveal as="section" key={l.id}><h2>{l.name} · {l.currency}</h2><p>{l.status} · Version {l.version}</p><p>{l.priced} products priced · {l.missing.length} missing</p>
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setPending({message:`Update ${l.name} tax and availability settings? Existing orders will retain their snapshots.`,path:`/admin/pricing/lists/${l.id}`,body:{status:f.get('status'),taxRateBps:Number(f.get('tax')),taxJurisdiction:f.get('jurisdiction'),reason:f.get('reason')}});}}>
 <label>Status<select name="status" defaultValue={l.status}><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></select></label>
 <label>Tax rate (basis points; 800 = 8%)<input name="tax" type="number" min="0" max="10000" defaultValue={l.taxRateBps} required/></label>
 <label>Delivery jurisdictions (ISO codes)<input name="jurisdiction" defaultValue={l.taxJurisdiction} required/></label>
 <label>Reason<input name="reason" required/></label><button disabled={busy}>Review market settings</button></form>
 {l.missing.length>0&&<details><summary>Products missing prices</summary>{l.missing.map((id:number)=><p key={id}>{data.products.find((p:any)=>p.id===id)?.name}</p>)}</details>}</Reveal>)}</RevealGroup>
 <Reveal as="section"><h2>Product prices</h2><label>Product<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Select a product</option>{data.products.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <RevealGroup className="pricing-markets"><div><h3>Base price</h3><label>Currency<select value={baseCurrency} onChange={e=>setBaseCurrency(e.target.value as Currency)}>{SUPPORTED_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Amount ({baseCurrency})<input value={baseAmount} onChange={e=>setBaseAmount(e.target.value)} inputMode="decimal"/></label>
 <button disabled={!product||busy} onClick={()=>{try{const basePriceMinor=toMinor(baseAmount,baseCurrency);setPending({message:`Set the base price of ${product.name} to ${moneyLabel(basePriceMinor,baseCurrency)}?`,path:`/admin/pricing/products/${product.id}`,body:{baseCurrency,basePriceMinor,prices:{},reason}});}catch(e:any){setError(e.message);}}}>Review base price</button></div>
 <div><h3>Market price</h3><label>Market / Currency<select value={currency} onChange={e=>setCurrency(e.target.value as Currency)}>{Object.values(MARKETS).map(m=><option key={m.currency} value={m.currency}>{m.name} / {m.currency}</option>)}</select></label>
 <label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option>FIXED</option><option>CONVERTED</option></select></label>
 {mode==='CONVERTED'&&<><label>Audited rate<select value={rateId} onChange={e=>setRateId(e.target.value)}><option value="">Select rate</option>{data.rates.filter((r:any)=>r.targetCurrency===currency&&r.sourceCurrency===product?.baseCurrency).map((r:any)=><option key={r.id} value={r.id}>{r.sourceCurrency} → {r.targetCurrency}: {r.rate} · {r.provider}</option>)}</select></label><button onClick={()=>act(async()=>{const result=await request('/admin/pricing/convert',{productId,rateId});setAmount(String(toMajor(result.amountMinor,result.currency)));})}>Calculate on server</button><p>Conversion is an audited price publication. It does not change automatically with rates.</p></>}
 <label>New amount ({currency})<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" readOnly={mode==='CONVERTED'}/></label><p>Current: {existing?moneyLabel(existing.priceMinor,currency):'Not configured'}</p><button disabled={!product||busy} onClick={preparePrice}>Review market price</button></div></RevealGroup>
 <label>Change reason<input value={reason} onChange={e=>setReason(e.target.value)} required placeholder="e.g. Seasonal pricing"/></label></Reveal>
 <Reveal as="section"><h2>Shipping prices</h2><p>Uses the currency selected above: {currency}. Existing unlabelled shipping amounts are not copied.</p><label>Method<select value={methodId} onChange={e=>setMethodId(e.target.value)}><option value="">Select shipping method</option>{data.shippingMethods.map((m:any)=><option key={m.id} value={m.id}>{m.name} · region {m.regionId}</option>)}</select></label>
 <label>Amount ({currency})<input value={shippingAmount} onChange={e=>setShippingAmount(e.target.value)} inputMode="decimal"/></label><label>Free shipping threshold ({currency}; blank disables)<input value={threshold} onChange={e=>setThreshold(e.target.value)} inputMode="decimal"/></label>
 <button disabled={!methodId||busy} onClick={()=>{try{const amountMinor=toMinor(shippingAmount,currency);setPending({message:`Set shipping to ${moneyLabel(amountMinor,currency)}?`,path:`/admin/pricing/shipping/${methodId}`,body:{currency,amountMinor,freeThresholdMinor:threshold?toMinor(threshold,currency):null,reason}});}catch(e:any){setError(e.message);}}}>Review shipping price</button>
 {data.shippingPrices.map((p:any)=><p key={p.id}>Method {p.shippingMethodId}: {moneyLabel(p.amountMinor,p.currency)}</p>)}</Reveal>
 <Reveal as="section"><h2>Exchange-rate record</h2><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{await request('/admin/pricing/rates',Object.fromEntries(f));});}}><label>Source currency<select name="sourceCurrency">{SUPPORTED_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Target currency<select name="targetCurrency">{SUPPORTED_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Rate<input name="rate" required/></label><label>Provider<input name="provider" required/></label><label>Rate timestamp<input name="fetchedAt" type="datetime-local" required/></label><button disabled={busy}>Record rate</button></form></Reveal>
 <Reveal as="section"><h2>Currency alerts and reconciliation</h2><p>Historical amounts have not been changed. Review original payment evidence before any correction.</p>{data.alerts.length?data.alerts.map((a:any)=><details key={a.id}><summary>{a.type} · {a.status}</summary><pre>{JSON.stringify(JSON.parse(a.details),null,2)}</pre></details>):<p>No mismatches detected.</p>}</Reveal>
 <Reveal as="section"><h2>Price history</h2><table><thead><tr><th>Product</th><th>Market</th><th>Before</th><th>After</th><th>Version / Actor</th><th>Reason / Date</th></tr></thead><tbody>{data.history.map((h:any)=><tr key={h.id}><td>{data.products.find((p:any)=>p.id===h.productId)?.name||h.productId}</td><td>{h.market}</td><td>{h.oldAmountMinor==null?'—':moneyLabel(h.oldAmountMinor,h.currency)}</td><td>{moneyLabel(h.newAmountMinor,h.currency)}</td><td>{h.priceVersion} / {h.changedBy}</td><td>{h.reason}<br/>{new Date(h.createdAt).toLocaleString()}</td></tr>)}</tbody></table></Reveal>
 {pending&&<div className="pricing-confirm" role="dialog" aria-modal="true" aria-label="Confirm price change"><div><h2>Review change</h2><p>{pending.message}</p><p>Reason: {pending.body.reason}</p><button disabled={busy} onClick={()=>setPending(null)}>Cancel</button><button disabled={busy} onClick={()=>act(async()=>{await request(pending.path,pending.body,'PUT');setPending(null);})}>Save price</button></div></div>}
 </div>;
}

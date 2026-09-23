import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { moneyLabel, toMinor, toMajor } from '../../utils/money';
import { type Order, useAdmin } from '../AdminContext';
export default function RefundControl({order}:{order:Order}){
 const [rows,setRows]=useState<any[]>([]),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[review,setReview]=useState(false);
 const [requestId,setRequestId]=useState('');const {refreshAdminData}=useAdmin();
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('vstigia_adm_token')}`};
 const reload=()=>fetch(`${API_BASE_URL}/orders/${order.id}/refunds`,{headers}).then(r=>r.json()).then(data=>{if(Array.isArray(data))setRows(data);});
 useEffect(()=>{void reload();setReview(false);setAmount('');setRequestId('');},[order.id]);
 const refunded=rows.filter(r=>r.status==='SUCCEEDED').reduce((s,r)=>s+r.amountMinor,0);
 const submit=async()=>{setBusy(true);setError('');try{const res=await fetch(`${API_BASE_URL}/orders/${order.id}/refunds`,{method:'POST',headers,body:JSON.stringify({amountMinor:toMinor(amount,order.currency),currency:order.currency,reason,requestId})});const data=await res.json();if(!res.ok)throw new Error(data.error);await reload();await refreshAdminData();setReview(false);setRequestId('');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 return <section className="pricing-control"><h3>Refunds · {order.currency}</h3><p>Refunded: {moneyLabel(refunded,order.currency)}</p><p>Remaining paid: {moneyLabel(Math.max(0,order.totalMinor-refunded),order.currency)}</p>{rows.map(r=><p key={r.id}>{moneyLabel(r.amountMinor,r.currency)} · {r.status} · {r.reason}</p>)}
 {order.pricingVersion>0&&['PAID','PARTIALLY_REFUNDED'].includes(order.paymentStatus)&&<><label>Refund amount ({order.currency})<input value={amount} disabled={review} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><label>Reason<input value={reason} disabled={review} onChange={e=>setReason(e.target.value)}/></label>
 {review?<><p>Confirm refund of {moneyLabel(toMinor(amount,order.currency),order.currency)} to the original payment method?</p><button disabled={busy} onClick={()=>setReview(false)}>Cancel</button><button disabled={busy} onClick={()=>void submit()}>Confirm refund</button></>:<button onClick={()=>{try{if(!reason.trim()||toMinor(amount,order.currency)<=0)throw new Error('Enter an amount and reason');const bytes=crypto.getRandomValues(new Uint8Array(16));setRequestId(Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''));setReview(true);}catch(e:any){setError(e.message);}}}>Review refund</button>}</>}{error&&<p role="alert">{error}</p>}</section>;
}

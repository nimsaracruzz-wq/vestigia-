import { RevealGroup, Reveal } from "../../animation/Reveal";
import { Link } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { SUPPORTED_CURRENCIES, moneyLabel, roundedRatio } from '../../utils/money';
export default function RevenueReport({title='Dashboard'}:{title?:string}){
 const {orders,customers}=useAdmin();
 const paid=orders.filter(o=>['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(o.paymentStatus)&&o.pricingVersion>0);
 return <div className="admin-page pricing-control"><Reveal className="admin-page-header"><div><h1>{title}</h1><p>Sales are grouped by original order currency. No exchange-rate conversion is applied.</p></div><Link to="/admin/pricing">Open Pricing Control</Link></Reveal>
 <RevealGroup className="pricing-markets">{SUPPORTED_CURRENCIES.map(currency=>{const rows=paid.filter(o=>o.currency===currency);const total=rows.reduce((s,o)=>s+o.totalMinor,0);return <Reveal as="section" key={currency}><h2>{currency} sales</h2><strong>{moneyLabel(total,currency)}</strong><p>{rows.length} verified orders</p><p>Average order: {moneyLabel(rows.length?roundedRatio(total,1n,BigInt(rows.length)):0,currency)}</p><p>Gross sales before refunds</p></Reveal>;})}</RevealGroup>
 <Reveal as="section"><h2>Orders requiring review</h2><p>{orders.filter(o=>!o.pricingVersion||o.paymentStatus==='PAYMENT_MISMATCH').length} orders excluded from verified sales. Review reconciliation alerts before reporting them.</p><p>{customers.length} customers · {orders.length} total orders</p></Reveal>
 <Reveal as="section"><h2>Recent orders</h2><table><thead><tr><th>Order</th><th>Amount</th><th>Payment</th><th>Fulfillment</th></tr></thead><tbody>{orders.slice(0,20).map(o=><tr key={o.id}><td><Link to="/admin/orders">{o.id}</Link></td><td>{moneyLabel(o.totalMinor,o.currency)}</td><td>{o.paymentStatus}</td><td>{o.status}</td></tr>)}</tbody></table></Reveal></div>;
}

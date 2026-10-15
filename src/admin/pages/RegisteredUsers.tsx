import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw, Search, Users } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { customerAccountStatus, filterRegisteredAccounts, isRegisteredAccount } from '../../../shared/customerAccounts';
import './registered-users.css';

const PAGE_SIZE = 25;
const dateLabel = (value?: string | null, fallback = 'Not recorded') => {
  if (!value || !Number.isFinite(Date.parse(value))) return fallback;
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
};

export default function RegisteredUsers() {
  const {customers, customersLoaded, customerDataError, refreshCustomers} = useAdmin();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { void refreshCustomers(); }, [refreshCustomers]);
  const accounts = useMemo(() => customers.filter(isRegisteredAccount), [customers]);
  const filtered = useMemo(() => filterRegisteredAccounts(customers, search, status, sort), [customers, search, status, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = accounts.find(customer => customer.id === selectedId);

  const refresh = async () => {
    setRefreshing(true);
    try { await refreshCustomers(); } finally { setRefreshing(false); }
  };

  return <div className="admin-page registered-users">
    <header className="admin-page-header ru-header">
      <div><p className="ru-eyebrow">Customer accounts</p><h1>Registered users</h1>
        <p>Everyone who created an account, including people who have not placed an order.</p></div>
      <button type="button" className="admin-btn admin-btn-secondary" onClick={refresh} disabled={refreshing}>
        <RefreshCw size={15} aria-hidden="true" /> {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </header>

    {customerDataError && <div className="ru-error" role="alert">{customerDataError}</div>}
    <section className="ru-stats" aria-label="Account overview">
      {[
        ['Registered accounts', accounts.length],
        ['Verified', accounts.filter(c => customerAccountStatus(c) === 'Verified').length],
        ['Awaiting verification', accounts.filter(c => customerAccountStatus(c) === 'Awaiting verification').length],
        ['No orders yet', accounts.filter(c => c.orders === 0).length],
      ].map(([label, count]) => <div className="ru-stat" key={label}><span>{label}</span><strong>{customersLoaded ? count : '—'}</strong></div>)}
    </section>

    {selected ? <section className="admin-panel ru-profile" aria-label="User profile">
      <button type="button" className="ru-back" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> Back to registered users</button>
      <div className="ru-profile-heading"><div className="ru-avatar"><Users size={23} /></div><div><h2>{selected.name || 'Unnamed account'}</h2><p>{selected.email}</p></div></div>
      <dl className="ru-profile-fields">
        {[
          ['Account ID', String(selected.id)],
          ['Account status', customerAccountStatus(selected)],
          ['Email verified', selected.emailVerified ? 'Yes' : 'No'],
          ['Verification date', dateLabel(selected.emailVerifiedAt, 'Not verified')],
          ['Registered', dateLabel(selected.joined)],
          ['Last sign-in', dateLabel(selected.lastLogin, 'No sign-in recorded')],
          ['Phone', selected.phone || 'Not provided'],
          ['Country', selected.country || 'Not provided'],
          ['Orders placed', String(selected.orders)],
          ['Last order', dateLabel(selected.lastOrder, 'No orders yet')],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="ru-note">Email verification and account access are separate: a verified address can still belong to a suspended or banned account.</p>
      <Link to="/admin/customers" className="admin-btn admin-btn-secondary">Open customer directory <ArrowRight size={14} /></Link>
    </section> : <section className="admin-panel">
      <div className="ru-toolbar">
        <label className="ru-search"><Search size={16} aria-hidden="true" /><span className="ru-sr-only">Search registered users</span>
          <input type="search" placeholder="Search name, email or account ID" value={search} onChange={e => {setSearch(e.target.value); setPage(1);}} />
        </label>
        <label>Status<select value={status} onChange={e => {setStatus(e.target.value); setPage(1);}}>
          <option value="all">All statuses</option><option value="verified">Verified</option><option value="unverified">Awaiting verification</option><option value="restricted">Suspended or banned</option>
        </select></label>
        <label>Sort by<select value={sort} onChange={e => {setSort(e.target.value); setPage(1);}}>
          <option value="newest">Newest registrations</option><option value="oldest">Oldest registrations</option><option value="name">Name A–Z</option><option value="orders">Most orders</option>
        </select></label>
      </div>
      <div className="ru-table-wrap">
        <table className="admin-table"><thead><tr><th>User</th><th>Account status</th><th>Registered</th><th>Last sign-in</th><th>Orders</th><th><span className="ru-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {!customersLoaded ? <tr><td colSpan={6} className="ru-empty" role="status">{customerDataError ? 'Accounts could not be loaded.' : 'Loading registered users...'}</td></tr> : visible.map(customer => <tr key={customer.id}>
              <td><strong>{customer.name || 'Unnamed account'}</strong><span className="ru-email">{customer.email}</span></td>
              <td><span className={`ru-badge ru-badge-${customer.accountStatus === 'BANNED' || customer.accountStatus === 'SUSPENDED' ? 'restricted' : customer.emailVerified ? 'verified' : 'pending'}`}>{customerAccountStatus(customer)}</span></td>
              <td>{dateLabel(customer.joined)}</td><td>{dateLabel(customer.lastLogin, 'No sign-in recorded')}</td><td>{customer.orders}</td>
              <td><button type="button" className="ru-view" onClick={() => setSelectedId(customer.id)} aria-label={`View profile for ${customer.email}`}>View profile <ArrowRight size={14} /></button></td>
            </tr>)}
            {customersLoaded && !visible.length && <tr><td colSpan={6} className="ru-empty">
              <strong>{accounts.length ? 'No accounts match these filters.' : 'No registered users yet.'}</strong>
              <p>{accounts.length ? 'Try another search or account status.' : 'New signups appear here even before their first purchase. Guest checkout alone does not create a registered account.'}</p>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="ru-pagination">
        <span aria-live="polite">{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : '0'} registered users</span>
        <div><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={15} /></button><span>Page {currentPage} of {pages}</span><button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ArrowRight size={15} /></button></div>
      </footer>
    </section>}
    <p className="ru-note">Looking for guest checkout records? <Link to="/admin/customers">View all customers</Link>.</p>
  </div>;
}

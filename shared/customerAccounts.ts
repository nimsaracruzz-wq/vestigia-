export type CustomerAccount = {
  id: number;
  name: string;
  email: string;
  customerType?: string;
  activationStatus?: string;
  accountStatus?: string;
  emailVerified?: boolean;
  joined: string;
  lastLogin?: string | null;
  orders: number;
};

export function isRegisteredAccount(customer: CustomerAccount): boolean {
  return customer.customerType === 'REGISTERED'
    || customer.accountStatus?.startsWith('REGISTERED_') === true
    || customer.activationStatus === 'ACTIVATED';
}

export function customerAccountStatus(customer: CustomerAccount): string {
  if (customer.accountStatus === 'BANNED') return 'Banned';
  if (customer.accountStatus === 'SUSPENDED') return 'Suspended';
  if (!isRegisteredAccount(customer)) return 'Guest';
  return customer.emailVerified ? 'Verified' : 'Awaiting verification';
}

export function filterRegisteredAccounts<T extends CustomerAccount>(
  customers: T[], search: string, status: string, order: string,
): T[] {
  const query = search.trim().toLowerCase();
  return customers.filter(customer => {
    if (!isRegisteredAccount(customer)) return false;
    if (query && !`${customer.name} ${customer.email} ${customer.id}`.toLowerCase().includes(query)) return false;
    const label = customerAccountStatus(customer);
    if (status === 'verified' && label !== 'Verified') return false;
    if (status === 'unverified' && label !== 'Awaiting verification') return false;
    if (status === 'restricted' && !['Banned', 'Suspended'].includes(label)) return false;
    return true;
  }).sort((a, b) => {
    const joined = (Date.parse(a.joined) || 0) - (Date.parse(b.joined) || 0);
    if (order === 'oldest') return joined || a.id - b.id;
    if (order === 'name') return a.name.localeCompare(b.name) || a.id - b.id;
    if (order === 'orders') return b.orders - a.orders || -joined || b.id - a.id;
    return -joined || b.id - a.id;
  });
}

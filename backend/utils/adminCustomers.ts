import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';

export function adminCustomerDirectory(db: Pick<PrismaClient, 'customer' | 'order'>): RequestHandler {
  return async (_req, res, next) => {
    try {
      const [customers, orders] = await Promise.all([
        db.customer.findMany({ select: {
          id: true, name: true, firstName: true, lastName: true, email: true,
          phone: true, country: true, customerType: true, activationStatus: true,
          accountStatus: true, emailVerified: true, emailVerifiedAt: true,
          joined: true, lastLogin: true,
        }}),
        db.order.findMany({ select: {customerId: true, email: true, date: true} }),
      ]);
      const summaries = new Map<string, {orders: number; lastOrder: string | null}>();
      for (const order of orders) {
        // Registered orders follow the account even after an email change.
        // Legacy guest orders can still be matched by normalized email.
        const key = order.customerId == null ? 'email:' + order.email.trim().toLowerCase() : 'id:' + order.customerId;
        const summary = summaries.get(key) ?? {orders: 0, lastOrder: null};
        summary.orders++;
        if (!summary.lastOrder || Date.parse(order.date) > Date.parse(summary.lastOrder)) summary.lastOrder = order.date;
        summaries.set(key, summary);
      }
      res.set('Cache-Control', 'no-store').json(customers.map(customer => {
        const linked = summaries.get('id:' + customer.id);
        const legacy = summaries.get('email:' + customer.email.trim().toLowerCase());
        const dates = [linked?.lastOrder, legacy?.lastOrder].filter((date): date is string => Boolean(date));
        return {
          id: customer.id, name: customer.name, firstName: customer.firstName,
          lastName: customer.lastName, email: customer.email, phone: customer.phone,
          country: customer.country, customerType: customer.customerType,
          activationStatus: customer.activationStatus, accountStatus: customer.accountStatus,
          emailVerified: customer.emailVerified, emailVerifiedAt: customer.emailVerifiedAt,
          joined: customer.joined, lastLogin: customer.lastLogin,
          orders: (linked?.orders ?? 0) + (legacy?.orders ?? 0),
          lastOrder: dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
        };
      }).sort((a, b) => (Date.parse(b.joined) || 0) - (Date.parse(a.joined) || 0) || b.id - a.id));
    } catch (error) {
      next(error);
    }
  };
}

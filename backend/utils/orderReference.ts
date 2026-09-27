import { randomBytes } from 'node:crypto';

type OrderLookup = { order: { findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<unknown> } };

/** Random public reference; the Order primary key also enforces uniqueness. */
export async function randomOrderReference(db: OrderLookup): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = `VST-${randomBytes(8).toString('hex').toUpperCase()}`;
    if (!await db.order.findUnique({ where: { id }, select: { id: true } })) return id;
  }
  throw new Error('Unable to allocate a unique order reference. Please retry.');
}

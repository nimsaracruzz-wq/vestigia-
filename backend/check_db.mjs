import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./vestigia-dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orders = await prisma.order.findMany({ include: { items: true } });
  const customers = await prisma.customer.findMany({ include: { savedAddresses: true } });
  console.log('--- DATABASE CHECK ---');
  console.log('ORDERS COUNT:', orders.length);
  console.log('CUSTOMERS COUNT:', customers.length);
  if (orders.length > 0) {
    console.log('LAST ORDER:', JSON.stringify(orders[orders.length - 1], null, 2));
  }
  if (customers.length > 0) {
    console.log('LAST CUSTOMER:', JSON.stringify(customers[customers.length - 1], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dbPath=path.resolve(String(process.env.DATABASE_URL||'file:./vestigia-dev.db').replace(/^file:/,''));
if(!dbPath.startsWith(path.resolve('.')+path.sep))throw new Error('Migration only supports the project local database');
const db=new Database(dbPath);
const migrationName='20260921140000_pricing_control';
if(db.prepare("PRAGMA table_info('Order')").all().some(r=>r.name==='pricingVersion')) { console.log('Pricing migration already applied'); process.exit(0); }
const folder=path.resolve('../scratch/pricing-migration');fs.mkdirSync(folder,{recursive:true});
await db.backup(path.join(folder,'before.sqlite'));
const orders=db.prepare('SELECT id,currency,total,totalMinor FROM "Order"').all();
const payments=db.prepare('SELECT orderId,currency,amountMinor FROM Payment').all();
const report={createdAt:new Date().toISOString(),policy:'No financial amounts or currencies changed. Historical records require provenance review.',orders:orders.map(o=>({...o,payments:payments.filter(p=>p.orderId===o.id),status:'REQUIRES_REVIEW'}))};
fs.writeFileSync(path.join(folder,'reconciliation.json'),JSON.stringify(report,null,2));
const sql=fs.readFileSync(`prisma/migrations/${migrationName}/migration.sql`,'utf8');
db.pragma('foreign_keys=OFF');
try { db.exec('BEGIN IMMEDIATE');db.exec(sql.replace(/PRAGMA[^;]+;/gi,''));
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key validation failed');
  if(db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get()) db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(crypto.randomUUID(),crypto.createHash('sha256').update(sql).digest('hex'),Date.now(),migrationName,Date.now());
  db.exec('COMMIT');
}catch(e){db.exec('ROLLBACK');throw e;}finally{db.pragma('foreign_keys=ON');}
console.log(JSON.stringify({migration:migrationName,ordersPreserved:orders.length,paymentsPreserved:payments.length,backup:path.join(folder,'before.sqlite'),report:path.join(folder,'reconciliation.json')}));
db.close();

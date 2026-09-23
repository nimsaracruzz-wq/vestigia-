import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Additive migration for the existing local database, whose older migrations
// may be present in the schema without a Prisma migration ledger.
const dbPath = path.resolve(String(process.env.DATABASE_URL || 'file:./vestigia-dev.db').replace(/^file:/, ''));
if (!dbPath.startsWith(path.resolve('.') + path.sep)) throw new Error('Expected a project-local database');
const db = new Database(dbPath, { fileMustExist: true });
const migration = '20260923000000_country_tax_rules';
if (db.prepare("PRAGMA table_info('ShippingCountry')").all().some(row => row.name === 'taxRateBps')) {
  console.log('Country tax migration already applied; existing rates preserved');
  db.close();
  process.exit(0);
}
const backupDir = path.resolve('../scratch/country-tax-migration');
fs.mkdirSync(backupDir, { recursive: true });
await db.backup(path.join(backupDir, `before-${Date.now()}.sqlite`));
const sql = fs.readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8');
db.transaction(() => {
  db.exec(sql);
  if (db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get()) {
    db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)')
      .run(crypto.randomUUID(), crypto.createHash('sha256').update(sql).digest('hex'), Date.now(), migration, Date.now());
  }
})();
console.log({ migration, countriesAtOnePercent: db.prepare('SELECT count(*) AS count FROM ShippingCountry WHERE taxRateBps=100').get() });
db.close();

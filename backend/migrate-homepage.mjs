import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initialHomepage, validateHomepage } from './dist/shared/homepage.js';

const dbPath=path.resolve(String(process.env.DATABASE_URL||'file:./vestigia-dev.db').replace(/^file:/,''));
if(!dbPath.startsWith(path.resolve('.')+path.sep))throw new Error('This helper only migrates the project-local SQLite database');
const db=new Database(dbPath,{fileMustExist:true});
const migration='20260924000000_homepage_cms';
const backupDir=path.resolve('../scratch/homepage-migration');
fs.mkdirSync(backupDir,{recursive:true});
await db.backup(path.join(backupDir,`before-${Date.now()}.sqlite`));
db.transaction(()=>{
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='Homepage'").get()) {
  const sql=fs.readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8');db.exec(sql);
  if(db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get())db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(crypto.randomUUID(),crypto.createHash('sha256').update(sql).digest('hex'),Date.now(),migration,Date.now());
 }
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='HomepageMedia'").get()) {
  const mediaMigration='20260924000001_homepage_media';
  const mediaSql=fs.readFileSync('prisma/migrations/'+mediaMigration+'/migration.sql','utf8');
  db.exec(mediaSql);
  if(db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get())db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(crypto.randomUUID(),crypto.createHash('sha256').update(mediaSql).digest('hex'),Date.now(),mediaMigration,Date.now());
 }
 const current=db.prepare('SELECT draft FROM Homepage WHERE id=1').get();
 if(current && JSON.parse(current.draft).sections.some(s=>s.type==='hero' && s.settings.desktopFocalX===undefined)) {
  const focalMigration='20260924000002_homepage_hero_art_direction';
  const focalSql=fs.readFileSync('prisma/migrations/'+focalMigration+'/migration.sql','utf8');
  db.exec(focalSql);
  if(db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get())db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(crypto.randomUUID(),crypto.createHash('sha256').update(focalSql).digest('hex'),Date.now(),focalMigration,Date.now());
 }
 const mobileRecord=db.prepare('SELECT draft,published FROM Homepage WHERE id=1').get();
 if(mobileRecord && ['draft','published'].some(key=>JSON.parse(mobileRecord[key]).sections.some(s=>s.type==='hero' && s.settings.image==='/images/products/vestigia-hero-1254.jpg' && !s.settings.mobileImage))) {
  const mobileMigration='20260924000003_homepage_mobile_source';
  const mobileSql=fs.readFileSync('prisma/migrations/'+mobileMigration+'/migration.sql','utf8');db.exec(mobileSql);
  if(db.prepare("SELECT name FROM sqlite_master WHERE name='_prisma_migrations'").get())db.prepare('INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(crypto.randomUUID(),crypto.createHash('sha256').update(mobileSql).digest('hex'),Date.now(),mobileMigration,Date.now());
 }
 if(!db.prepare('SELECT id FROM Homepage WHERE id=1').get()) {
  const ids=db.prepare('SELECT id FROM Product ORDER BY id LIMIT 8').all().map(p=>p.id);
  const settings=db.prepare('SELECT announcementText,announcementEnabled FROM StoreSettings WHERE id=1').get();
  const config=validateHomepage(initialHomepage(ids,settings?{enabled:!!settings.announcementEnabled,text:settings.announcementText}:undefined));
  const json=JSON.stringify(config);
  db.prepare('INSERT INTO Homepage (id,draft,published,updatedAt) VALUES (1,?,?,?)').run(json,json,Date.now());
 }
})();
console.log({migration,homepage:db.prepare('SELECT id,revision,publishedRevision FROM Homepage').get()});
db.close();

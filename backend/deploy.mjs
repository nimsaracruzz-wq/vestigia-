import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
if(!process.env.DATABASE_URL?.startsWith('file:'))throw Error('Deployment requires a persistent SQLite file: DATABASE_URL matching the committed Prisma schema. Do not point this schema at PostgreSQL.');
const databasePath=path.resolve(process.env.DATABASE_URL.slice(5));
process.env.DATABASE_URL='file:'+databasePath.replaceAll('\\','/');
fs.mkdirSync(path.dirname(databasePath),{recursive:true});
// Prisma's SQLite engine expects the target file to exist on some hosts.
if(!fs.existsSync(databasePath))fs.closeSync(fs.openSync(databasePath,'wx'));
const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:process.env});
if(migration.status!==0){console.error('Production migrations failed. Startup stopped without resetting or overwriting data. See PRODUCTION_DEPLOYMENT.md for existing-database baselining.');process.exit(migration.status||1);}
await import('./dist/backend/server.js');

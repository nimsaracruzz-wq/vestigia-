import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';
import {PrismaClient} from '@prisma/client';
import {PrismaBetterSqlite3} from '@prisma/adapter-better-sqlite3';
import {adminCustomerDirectory} from '../utils/adminCustomers.js';
import {safeErrorHandler} from '../utils/requestSafety.js';
import {customerAccountStatus, filterRegisteredAccounts, isRegisteredAccount} from '../../shared/customerAccounts.js';

test('admin directory includes zero-order signups, links orders across email changes and excludes credentials', async () => {
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-directory-'));
  const file=path.join(folder,'directory.db');
  const sqlite=new Database(file);
  const migrations=path.resolve('backend/prisma/migrations');
  for(const name of (await fs.readdir(migrations)).sort()) {
    if(name==='migration_lock.toml') continue;
    sqlite.exec(await fs.readFile(path.join(migrations,name,'migration.sql'),'utf8'));
  }
  sqlite.close();
  const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:'file:'+file.replaceAll('\\','/')})});
  const signup=await db.customer.create({data:{name:'No purchase yet',email:'signup@example.invalid',joined:'2026-10-15T00:00:00Z',customerType:'REGISTERED',accountStatus:'REGISTERED_UNVERIFIED',activationStatus:'PENDING',password:'must-not-be-returned',passwordHash:'private-hash',resetToken:'private-reset-token'}});
  const buyer=await db.customer.create({data:{name:'Email changed',email:'new@example.invalid',joined:'2026-10-14T00:00:00Z',customerType:'REGISTERED',accountStatus:'REGISTERED_VERIFIED',emailVerified:true}});
  await db.customer.create({data:{name:'Guest checkout',email:'guest@example.invalid',joined:'2026-10-13T00:00:00Z',customerType:'GUEST'}});
  const order={customer:'Buyer',date:'2026-10-15T01:00:00Z',subtotal:10,shipping:0,tax:0,total:10,address:'Test',currency:'EUR',status:'pending'};
  await db.order.create({data:{...order,id:'linked',customerId:buyer.id,email:'old@example.invalid'}});
  await db.order.create({data:{...order,id:'legacy',email:' NEW@example.invalid '}});
  const app=express();
  app.get('/api/customers',(req,res,next)=>{
    if(req.headers.authorization!=='Bearer admin-test') {res.sendStatus(401);return;}
    next();
  },adminCustomerDirectory(db));
  app.use(safeErrorHandler);
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customers';
  try {
    assert.equal((await fetch(url)).status,401);
    const response=await fetch(url,{headers:{Authorization:'Bearer admin-test'}});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const customers=await response.json();
    assert.equal(customers.length,3);
    assert.equal(customers[0].id,signup.id);
    assert.equal(customers[0].orders,0);
    assert.equal(customers[0].lastOrder,null);
    assert.equal(customers.find((c:any)=>c.id===buyer.id).orders,2);
    const raw=JSON.stringify(customers);
    for(const secret of ['must-not-be-returned','private-hash','private-reset-token','password','resetToken']) assert.ok(!raw.includes(secret));
    assert.equal(filterRegisteredAccounts(customers,'','all','newest').length,2);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await db.$disconnect();
  }
});

test('registered filters distinguish pending signups, verified accounts, restrictions and guests',()=>{
  const base={id:1,name:'Alice',email:'alice@example.invalid',joined:'2026-10-14T00:00:00Z',orders:0};
  const pending={...base,customerType:'REGISTERED',accountStatus:'REGISTERED_UNVERIFIED',emailVerified:false};
  const verified={...base,id:2,name:'Bob',email:'bob@example.invalid',joined:'2026-10-15T00:00:00Z',orders:3,customerType:'REGISTERED',accountStatus:'REGISTERED_VERIFIED',emailVerified:true};
  const banned={...verified,id:3,accountStatus:'BANNED'};
  const guest={...base,id:4,customerType:'AUTO_CREATED',activationStatus:'PENDING',accountStatus:'GUEST'};
  const all=[pending,verified,banned,guest];
  assert.equal(isRegisteredAccount(pending),true);
  assert.equal(isRegisteredAccount(guest),false);
  assert.equal(customerAccountStatus(banned),'Banned');
  assert.deepEqual(filterRegisteredAccounts(all,'','unverified','newest'),[pending]);
  assert.deepEqual(filterRegisteredAccounts(all,'','verified','newest'),[verified]);
  assert.deepEqual(filterRegisteredAccounts(all,'','restricted','newest'),[banned]);
  assert.deepEqual(filterRegisteredAccounts(all,' ALICE@ ','all','newest'),[pending]);
  assert.equal(filterRegisteredAccounts(all,'','all','orders')[0].orders,3);
  assert.equal(filterRegisteredAccounts(all,'','all','oldest')[0].id,1);
  assert.equal(all[0],pending);
});

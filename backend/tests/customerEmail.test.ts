import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {PrismaClient} from '@prisma/client';
import {PrismaBetterSqlite3} from '@prisma/adapter-better-sqlite3';
import {correctUnverifiedEmail, verifyCustomerEmail, confirmUnverifiedEmailChange} from '../utils/customerEmail.js';

const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
const expires=()=>new Date(Date.now()+3600000);
async function database() {
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-email-'));
  const file=path.join(folder,'test.db');
  const sqlite=new Database(file);
  const migrations=path.resolve('backend/prisma/migrations');
  for(const name of (await fs.readdir(migrations)).sort()) {
    if(name!=='migration_lock.toml') sqlite.exec(await fs.readFile(path.join(migrations,name,'migration.sql'),'utf8'));
  }
  sqlite.close();
  return new PrismaClient({adapter:new PrismaBetterSqlite3({url:'file:'+file.replaceAll('\\','/')})});
}
async function account(db:PrismaClient,email='typo@example.invalid') {
  return db.customer.create({data:{name:'Email test',email,joined:new Date().toISOString(),customerType:'REGISTERED',accountStatus:'REGISTERED_UNVERIFIED',activationStatus:'PENDING',passwordHash:'unchanged-login-hash',verificationCode:'old-code'}});
}

test('email correction keeps login intact, invalidates old links, then verification permanently locks email',async()=>{
  const db=await database();
  try {
    const customer=await account(db);
    await db.verificationToken.create({data:{customerId:customer.id,tokenHash:digest('old-link'),expiresAt:expires()}});
    await db.emailChangeToken.create({data:{customerId:customer.id,newEmail:'stale@example.invalid',tokenHash:digest('stale-change'),expiresAt:expires()}});
    await db.passwordResetToken.create({data:{customerId:customer.id,tokenHash:digest('old-reset'),expiresAt:expires()}});
    const session=await db.customerSession.create({data:{customerId:customer.id,sessionTokenHash:digest('session'),expiresAt:expires()}});
    const result=await correctUnverifiedEmail(db,customer.id,' CORRECT@example.invalid ');
    assert.equal(result.customer.email,'correct@example.invalid');
    assert.equal(result.customer.emailVerified,false);
    assert.equal(result.customer.emailVerifiedAt,null);
    assert.equal(result.customer.passwordHash,'unchanged-login-hash');
    assert.equal(result.customer.verificationCode,null);
    assert.equal((await db.customerSession.findUniqueOrThrow({where:{id:session.id}})).revokedAt,null);
    assert.equal(await db.passwordResetToken.count({where:{customerId:customer.id,usedAt:null}}),0);
    await assert.rejects(verifyCustomerEmail(db,'old-link'),{code:'INVALID_VERIFICATION_LINK'});
    await assert.rejects(confirmUnverifiedEmailChange(db,'stale-change'),{code:'INVALID_VERIFICATION_LINK'});
    await verifyCustomerEmail(db,result.token);
    const verified=await db.customer.findUniqueOrThrow({where:{id:customer.id}});
    assert.equal(verified.emailVerified,true);
    assert.equal(verified.accountStatus,'REGISTERED_VERIFIED');
    assert.equal(verified.activationStatus,'ACTIVATED');
    await assert.rejects(correctUnverifiedEmail(db,customer.id,'another@example.invalid'),{code:'EMAIL_LOCKED'});
    await assert.rejects(verifyCustomerEmail(db,result.token),{code:'INVALID_VERIFICATION_LINK'});
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:customer.id}})).email,'correct@example.invalid');
  } finally {await db.$disconnect();}
});

test('duplicate email correction rolls back without consuming the original verification link',async()=>{
  const db=await database();
  try {
    const customer=await account(db);
    await account(db,'taken@example.invalid');
    await db.verificationToken.create({data:{customerId:customer.id,tokenHash:digest('still-valid'),expiresAt:expires()}});
    await assert.rejects(correctUnverifiedEmail(db,customer.id,'taken@example.invalid'),{code:'P2002'});
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:customer.id}})).email,'typo@example.invalid');
    await verifyCustomerEmail(db,'still-valid');
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:customer.id}})).emailVerified,true);
  } finally {await db.$disconnect();}
});

test('legacy email-change links cannot bypass verification locks, and valid ones revoke prior sessions',async()=>{
  const db=await database();
  try {
    const customer=await account(db);
    const session=await db.customerSession.create({data:{customerId:customer.id,sessionTokenHash:digest('legacy-session'),expiresAt:expires()}});
    await db.emailChangeToken.create({data:{customerId:customer.id,newEmail:'new@example.invalid',tokenHash:digest('legacy'),expiresAt:expires()}});
    await confirmUnverifiedEmailChange(db,'legacy');
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:customer.id}})).email,'new@example.invalid');
    assert.ok((await db.customerSession.findUniqueOrThrow({where:{id:session.id}})).revokedAt);
    await db.emailChangeToken.create({data:{customerId:customer.id,newEmail:'bypass@example.invalid',tokenHash:digest('bypass'),expiresAt:expires()}});
    await assert.rejects(confirmUnverifiedEmailChange(db,'bypass'),{code:'EMAIL_LOCKED'});
    // A historical verification timestamp also keeps the address locked.
    await db.customer.update({where:{id:customer.id},data:{emailVerified:false}});
    await assert.rejects(correctUnverifiedEmail(db,customer.id,'bypass@example.invalid'),{code:'EMAIL_LOCKED'});
  } finally {await db.$disconnect();}
});

test('expired links, invalid addresses and restricted accounts cannot change verification state',async()=>{
  const db=await database();
  try {
    const customer=await account(db);
    await assert.rejects(correctUnverifiedEmail(db,customer.id,'not-an-email'),{code:'INVALID_EMAIL'});
    await assert.rejects(correctUnverifiedEmail(db,customer.id,customer.email),{code:'EMAIL_UNCHANGED'});
    await db.verificationToken.create({data:{customerId:customer.id,tokenHash:digest('expired'),expiresAt:new Date(0)}});
    await assert.rejects(verifyCustomerEmail(db,'expired'),{code:'INVALID_VERIFICATION_LINK'});
    await db.verificationToken.create({data:{customerId:customer.id,tokenHash:digest('restricted'),expiresAt:expires()}});
    await db.customer.update({where:{id:customer.id},data:{accountStatus:'SUSPENDED'}});
    await assert.rejects(correctUnverifiedEmail(db,customer.id,'new@example.invalid'),{code:'ACCOUNT_RESTRICTED'});
    await assert.rejects(verifyCustomerEmail(db,'restricted'),{code:'INVALID_VERIFICATION_LINK'});
    assert.equal((await db.customer.findUniqueOrThrow({where:{id:customer.id}})).emailVerified,false);
  } finally {await db.$disconnect();}
});

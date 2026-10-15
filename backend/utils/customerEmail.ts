import {createHash, randomBytes} from 'node:crypto';
import type {PrismaClient, Prisma} from '@prisma/client';
import {PublicError} from './requestSafety.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const invalidLink = () => new PublicError(400, 'INVALID_VERIFICATION_LINK', 'This verification link is invalid or expired. Request a new email from your account.');
const lockedEmail = () => new PublicError(403, 'EMAIL_LOCKED', 'Your email address is verified and cannot be changed.');
const unlocked = {emailVerified: false, emailVerifiedAt: null, accountStatus: {notIn: ['SUSPENDED', 'BANNED']}};

async function invalidateEmailTokens(tx: Prisma.TransactionClient, customerId: number) {
  const usedAt = new Date();
  await tx.verificationToken.updateMany({where: {customerId, usedAt: null}, data: {usedAt}});
  await tx.emailChangeToken.updateMany({where: {customerId, usedAt: null}, data: {usedAt}});
  await tx.passwordResetToken.updateMany({where: {customerId, usedAt: null}, data: {usedAt}});
  await tx.activationToken.updateMany({where: {customerId, usedAt: null}, data: {usedAt}});
}

export async function correctUnverifiedEmail(db: PrismaClient, customerId: number, input: unknown) {
  const email = String(input ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PublicError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  }
  return db.$transaction(async tx => {
    const current = await tx.customer.findUnique({where: {id: customerId}});
    if (!current) throw new PublicError(404, 'NOT_FOUND', 'Account not found.');
    if (current.emailVerified || current.emailVerifiedAt) throw lockedEmail();
    if (['SUSPENDED', 'BANNED'].includes(current.accountStatus)) throw new PublicError(403, 'ACCOUNT_RESTRICTED', 'Account access is restricted.');
    if (current.email.toLowerCase() === email) throw new PublicError(400, 'EMAIL_UNCHANGED', 'Enter a different email address, or resend the verification email.');
    const changed = await tx.customer.updateMany({where: {id: customerId, ...unlocked}, data: {
      email, verificationCode: null, resetToken: null, resetTokenExpiry: null,
      customerType: 'REGISTERED', activationStatus: 'PENDING', accountStatus: 'REGISTERED_UNVERIFIED',
    }});
    if (changed.count !== 1) throw lockedEmail();
    await invalidateEmailTokens(tx, customerId);
    const token = randomBytes(32).toString('hex');
    await tx.verificationToken.create({data: {customerId, tokenHash: digest(token), expiresAt: new Date(Date.now() + 86400000)}});
    const customer = await tx.customer.findUniqueOrThrow({where: {id: customerId}, include: {savedAddresses: true}});
    return {customer, token};
  });
}

export async function verifyCustomerEmail(db: PrismaClient, token: string) {
  if (!token || token.length > 300) throw invalidLink();
  return db.$transaction(async tx => {
    const record = await tx.verificationToken.findUnique({where: {tokenHash: digest(token)}, include: {customer: true}});
    if (!record || record.usedAt || record.expiresAt <= new Date() || ['SUSPENDED', 'BANNED'].includes(record.customer.accountStatus)) throw invalidLink();
    const claimed = await tx.verificationToken.updateMany({where: {id: record.id, usedAt: null, expiresAt: {gt: new Date()}}, data: {usedAt: new Date()}});
    if (claimed.count !== 1) throw invalidLink();
    const changed = await tx.customer.updateMany({where: {id: record.customerId, ...unlocked}, data: {
      emailVerified: true, emailVerifiedAt: new Date(), activationStatus: 'ACTIVATED', accountStatus: 'REGISTERED_VERIFIED', verificationCode: null,
    }});
    if (changed.count !== 1) throw invalidLink();
    await tx.verificationToken.updateMany({where: {customerId: record.customerId, usedAt: null}, data: {usedAt: new Date()}});
    await tx.emailChangeToken.updateMany({where: {customerId: record.customerId, usedAt: null}, data: {usedAt: new Date()}});
    return record.customerId;
  });
}

// Honor outstanding legacy email-change links only while the account is unverified.
export async function confirmUnverifiedEmailChange(db: PrismaClient, token: string) {
  if (!token || token.length > 300) throw invalidLink();
  return db.$transaction(async tx => {
    const record = await tx.emailChangeToken.findUnique({where: {tokenHash: digest(token)}, include: {customer: true}});
    if (!record || record.usedAt || record.expiresAt <= new Date() || ['SUSPENDED', 'BANNED'].includes(record.customer.accountStatus)) throw invalidLink();
    if (record.customer.emailVerified || record.customer.emailVerifiedAt) throw lockedEmail();
    const claimed = await tx.emailChangeToken.updateMany({where: {id: record.id, usedAt: null, expiresAt: {gt: new Date()}}, data: {usedAt: new Date()}});
    if (claimed.count !== 1) throw invalidLink();
    const changed = await tx.customer.updateMany({where: {id: record.customerId, ...unlocked}, data: {
      email: record.newEmail, emailVerified: true, emailVerifiedAt: new Date(),
      activationStatus: 'ACTIVATED', accountStatus: 'REGISTERED_VERIFIED',
      verificationCode: null, resetToken: null, resetTokenExpiry: null,
    }});
    if (changed.count !== 1) throw lockedEmail();
    await invalidateEmailTokens(tx, record.customerId);
    await tx.customerSession.updateMany({where: {customerId: record.customerId, revokedAt: null}, data: {revokedAt: new Date(), revokeReason: 'email_changed'}});
    return record.customer;
  });
}

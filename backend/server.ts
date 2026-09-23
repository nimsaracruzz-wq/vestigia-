import { installHomepageRoutes } from './utils/homepageRoutes.js';
import { normalizeCountryTaxRate } from './utils/countryTax.js';
import 'dotenv/config';
// Shipping Management System Enabled
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { products as seedProducts } from './data.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail, sendOrderConfirmationEmail, sendOrderStatusEmail, sendOwnerOrderNotificationEmail, sendWelcomeAccountEmail, sendVerificationEmail, sendSecurityNoticeEmail, sendNewsletterConfirmationEmail, sendNewsletterWelcomeEmail } from './utils/mailer.js';
import Stripe from 'stripe';
import { getCurrencyForCountry, SUPPORTED_CURRENCIES, PricingService, syncPrices, pricingAudit, paymentMatches, type SupportedCurrency } from './utils/pricing.js';
import { requireCurrency, minor, toMinor, toMajor, formatMoney, MARKETS } from '../shared/money.js';
import { installPricingRoutes, processPaymentEvent } from './utils/pricingRoutes.js';
import {
  createBackupPackage,
  decryptArchive,
  generateBackupId,
  getBackupStorageDir,
  materializeBackupPackage,
  resolveSqliteDatabasePath,
  verifyBackupArchive,
  verifyDecryptedPackage,
  type BackupType,
} from './utils/backupSystem.js';

const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
const stripeSecretKeyIsPlaceholder = stripeSecretKey.includes('1234567890') || stripeSecretKey.endsWith('...');
const stripeSecretKeyLooksValid = /^sk_(test|live)_[A-Za-z0-9_]+$/.test(stripeSecretKey)
  && !stripeSecretKeyIsPlaceholder;
const stripe = stripeSecretKeyLooksValid
  ? new Stripe(stripeSecretKey)
  : null;
const stripeConfigurationIssue = stripeSecretKey && !stripeSecretKeyLooksValid
  ? stripeSecretKey.startsWith('pk_')
    ? 'STRIPE_SECRET_KEY must be a Stripe secret key such as sk_test_... or sk_live_..., not a publishable key such as pk_test_....'
    : stripeSecretKeyIsPlaceholder
      ? 'STRIPE_SECRET_KEY is still a placeholder. Use your full Stripe test secret key from Developers > API keys, starting with sk_test_.'
      : 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_ and contain the full Stripe secret key value.'
  : null;

// ─── Prisma: SQLite locally, PostgreSQL on Railway ───────────────────────────
let prisma: PrismaClient;
if (process.env.DATABASE_PROVIDER === 'sqlite') {
  // Local development with BetterSqlite3 adapter
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./vestigia-dev.db' });
  prisma = new PrismaClient({ adapter } as any);
} else {
  // Railway / PostgreSQL — standard PrismaClient uses DATABASE_URL env var
  prisma = new PrismaClient();
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ─── HTTP Security Headers ───────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

const PORT = process.env.PORT || 4000;
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const backupStorageDir = getBackupStorageDir(process.cwd());
let maintenanceMode = false;
let maintenanceReason = '';

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(backupStorageDir, { recursive: true });

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

// Safe Multer upload configuration: image MIME allowlist + 5MB limit
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomUUID()}${IMAGE_MIME_EXTENSIONS[file.mimetype] ?? '.bin'}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (Object.prototype.hasOwnProperty.call(IMAGE_MIME_EXTENSIONS, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only JPG, PNG, WebP, GIF, and AVIF images are allowed.'));
    }
  },
});

type SizeChartPayload = {
  unit: 'in' | 'cm';
  columns: string[];
  rows: Array<Record<string, string>>;
  notes?: string;
};

const DEFAULT_SETTINGS = {
  storeName: 'Vestigia',
  tagline: 'Refined apparel for enduring style.',
  currency: 'EUR',
  announcementText: 'Complimentary shipping on orders over €150',
  announcementEnabled: true,
  shippingThreshold: 150,
  complimentaryShippingEnabled: true,
  taxRate: 0.12,
  orderNotificationEmail: 'owner@thevestigia.com',
  adminPassword: 'deprecated-not-used',
};

const isDevMode = process.env.NODE_ENV !== 'production';
const allowMockPayments = process.env.ALLOW_MOCK_PAYMENTS === 'true' || (isDevMode && !stripe);

if (stripeConfigurationIssue && !isDevMode) {
  throw new Error(stripeConfigurationIssue);
}

if (!process.env.JWT_SECRET && !isDevMode) {
  throw new Error('JWT_SECRET must be configured in production.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'vestigia-local-dev-jwt-secret-change-before-production';
const BCRYPT_ROUNDS = 12;
const MAX_CART_ITEMS = 50;
const MAX_ITEM_QUANTITY = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const createRateLimiter = ({ windowMs, max, keyPrefix }: RateLimitOptions) => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const now = Date.now();
  const key = `${keyPrefix}:${req.ip}:${req.method}:${req.path}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= max) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  current.count += 1;
  next();
};

const authRateLimit = createRateLimiter({ keyPrefix: 'auth', windowMs: 15 * 60 * 1000, max: 20 });
const checkoutRateLimit = createRateLimiter({ keyPrefix: 'checkout', windowMs: 5 * 60 * 1000, max: 60 });
const formRateLimit = createRateLimiter({ keyPrefix: 'form', windowMs: 10 * 60 * 1000, max: 20 });
const adminWriteRateLimit = createRateLimiter({ keyPrefix: 'admin-write', windowMs: 60 * 1000, max: 120 });

const normalizeEmail = (value: unknown) => String(value ?? '').toLowerCase().trim();
const isValidEmail = (value: unknown) => EMAIL_RE.test(normalizeEmail(value)) && normalizeEmail(value).length <= 254;
const cleanText = (value: unknown, max = 255) => String(value ?? '')
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/[<>]/g, '')
  .trim()
  .slice(0, max);
const parseRequiredInt = (value: unknown, label = 'id') => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid ${label}`);
  return parsed;
};
const publicSiteUrl = () => String(process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.FRONTEND_URL || 'https://thevestigia.com').replace(/\/+$/, '');
const xmlEscape = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');
const absolutePublicUrl = (value: string | null | undefined) => {
  const baseUrl = publicSiteUrl();
  const safeValue = String(value || '/images/products/vestigia_logo.png');
  if (/^https?:\/\//i.test(safeValue)) return safeValue;
  return `${baseUrl}${safeValue.startsWith('/') ? safeValue : `/${safeValue}`}`;
};
const productPublicPath = (product: { id: number; slug?: string | null }) => `/product/${product.slug || product.id}`;
const productPublicUrl = (product: { id: number; slug?: string | null; canonicalUrl?: string | null }) =>
  product.canonicalUrl || `${publicSiteUrl()}${productPublicPath(product)}`;
const parseBooleanField = (value: unknown, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() !== 'false';
};
const normalizeTaxRate = (value: unknown) => {
  const rate = Number(value || 0);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return rate > 1 ? rate / 100 : rate;
};
const validatePassword = (value: unknown) => {
  const password = String(value ?? '');
  if (password.length < 12 || password.length > 128) {
    throw new Error('Password must be between 12 and 128 characters.');
  }
  const normalized = password.toLowerCase().replace(/\s+/g, '');
  const blocked = new Set([
    'password1234',
    'password12345',
    'password123456',
    '123456789012',
    'qwertyuiop12',
    'letmeinplease',
    'vestigia1234',
  ]);
  if (blocked.has(normalized)) {
    throw new Error('Please choose a less common password.');
  }
  return password;
};
const moneyFromMinor = (minor: number, currency: SupportedCurrency) => minor / (currency === 'JPY' ? 1 : 100);
const cartHash = (payload: unknown) => crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const isRestrictedStatus = (status: unknown) => ['SUSPENDED', 'BANNED'].includes(String(status || '').toUpperCase());
const isSafeAccountStatus = (status: unknown) => !isRestrictedStatus(status);
const customerStatusFor = (emailVerified: boolean, fallback = 'REGISTERED_UNVERIFIED') => (
  emailVerified ? 'REGISTERED_VERIFIED' : fallback
);

const parseCookies = (req: express.Request) => {
  const header = req.headers.cookie;
  if (!header) return {} as Record<string, string>;
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index < 0) return acc;
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
};

const secureCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: '/',
});

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: '/',
});

const clearCustomerCookies = (res: express.Response) => {
  res.clearCookie('vestigia_session', { path: '/' });
  res.clearCookie('vestigia_csrf', { path: '/' });
};

const clientIp = (req: express.Request) => String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
const userAgent = (req: express.Request) => cleanText(req.headers['user-agent'] || '', 300);

const removeUploadedFile = (file?: Express.Multer.File) => {
  if (!file) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    // Best-effort cleanup.
  }
};

const isSafeUploadedImage = (file: Express.Multer.File) => {
  const bytes = fs.readFileSync(file.path);
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/gif') return bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (file.mimetype === 'image/webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (file.mimetype === 'image/avif') return bytes.subarray(4, 8).toString('ascii') === 'ftyp' && bytes.subarray(8, 16).toString('ascii').includes('avif');
  return false;
};

const validateUploadedImageOrThrow = (file?: Express.Multer.File) => {
  if (!file) return;
  if (!isSafeUploadedImage(file)) {
    removeUploadedFile(file);
    throw new Error('Uploaded file content does not match an allowed image type.');
  }
};

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins: (string | RegExp)[] = [
  // Local dev — any localhost port
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // LAN / mobile access (192.168.x.x, 10.x.x.x, 172.x.x.x)
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/,
  ...(isDevMode ? [
    /\.loca\.lt$/,
    /\.ngrok\.io$/,
    /\.ngrok-free\.app$/,
    /\.trycloudflare\.com$/,
  ] : []),
  ...String(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/server-to-server requests. Browser cross-origin requests must match the allowlist.
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
}));

app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ error: 'Missing Stripe signature.' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    await processPaymentEvent(prisma, event, stripe);

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook verification failed.');
    res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
  }
});

app.use(express.json({ limit: '64kb' }));
app.use('/uploads', express.static(uploadDir, {
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

// ─── Health check (Railway uses this to verify the service is up) ─────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/checkout/config', (_req, res) => {
  res.json({
    stripeConfigured: Boolean(stripe),
    mockPaymentsEnabled: allowMockPayments,
    publishableKeyRequired: Boolean(stripe),
    issue: stripeConfigurationIssue,
  });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'VESTIGIA Backend API is active',
    status: 'healthy',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      settings: '/api/settings'
    }
  });
});

app.use((req, res, next) => {
  if (!maintenanceMode) {
    next();
    return;
  }
  const allowedDuringMaintenance =
    req.path === '/api/health'
    || req.path === '/api/auth/login'
    || req.path.startsWith('/api/admin')
    || req.path.startsWith('/uploads');
  if (allowedDuringMaintenance) {
    next();
    return;
  }
  res.status(503).json({
    error: 'Vestigia is temporarily unavailable while we perform scheduled maintenance.',
    maintenanceMode: true,
    reason: maintenanceReason || 'Restore in progress',
  });
});

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const serializeProduct = (product: {
  id: number;
  name: string;
  category: string;
  productType?: string | null;
  price: number;
  compareAt: number | null;
  badge: string | null;
  slug?: string | null;
  colors: string;
  image: string;
  modelImage?: string | null;
  productImage?: string | null;
  images: string;
  alt: string;
  sizes: string;
  description: string;
  details: string;
  care: string;
  sizeChart?: string | null;
  rating: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  brand?: string | null;
  sku?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  condition?: string | null;
  googleProductCategory?: string | null;
  material?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  imageTitle?: string | null;
  redirectFrom?: string | null;
  reviews?: Array<{ id: number; author: string; rating: number; date: string; comment: string; status: string }>;
  inventory?: Array<{ color: string; size: string; stock: number }>;
  basePriceMinor?: number | null;
  baseCurrency?: string | null;
  prices?: Array<{ currency: string; priceMinor: number; compareAtMinor: number | null; isActive: boolean; priceListId?: string | null; priceVersion?: number; mode?: string }>;
}) => ({
  ...product,
  colors: parseJson<string[]>(product.colors, []),
  images: parseJson<string[]>(product.images, []),
  sizes: parseJson<string[]>(product.sizes, []),
  details: parseJson<string[]>(product.details, []),
  care: parseJson<string[]>(product.care, []),
  sizeChart: product.sizeChart ? parseJson<object | null>(product.sizeChart, null) : null,
  redirectFrom: product.redirectFrom ? parseJson<string[]>(product.redirectFrom, []) : [],
  inventory: (product.inventory ?? []).reduce((acc, curr) => {
    acc[`${curr.color}_${curr.size}`] = curr.stock;
    return acc;
  }, {} as Record<string, number>),
  baseMoney: product.basePriceMinor != null && product.baseCurrency ? { amountMinor: product.basePriceMinor, currency: product.baseCurrency } : null,
  prices: (product.prices ?? []).reduce((acc, price) => {
    if (!price.isActive) return acc;
    acc[price.currency as SupportedCurrency] = {
      ...price,
      priceMinor: price.priceMinor,
      compareAtMinor: price.compareAtMinor,
    };
    return acc;
  }, {} as Record<string, { priceMinor: number; compareAtMinor: number | null }>),
});

const serializeOrder = (order: any) => ({ ...order,
  subtotal: toMajor(order.subtotalMinor, requireCurrency(order.currency)),
  shipping: toMajor(order.shippingMinor, requireCurrency(order.currency)),
  tax: toMajor(order.taxMinor, requireCurrency(order.currency)),
  total: toMajor(order.totalMinor, requireCurrency(order.currency)),
  items: order.items.map((i: any) => ({ ...i, price: toMajor(i.unitPriceMinor, requireCurrency(i.currency)) })),
});

// ─── Sequential Order Number Generator ────────────────────────────────────────
async function generateOrderId(db: any = prisma): Promise<{ orderId: string; invoiceNumber: string }> {
  const year = new Date().getFullYear();
  const counter = await db.orderCounter.upsert({
    where: { id: 1 },
    update: {
      count: { increment: 1 },
      year,
    },
    create: { id: 1, year, count: 1 },
  });
  // Reset count if year changed
  const count = counter.year === year ? counter.count : 1;
  const padded = String(count).padStart(4, '0');
  return {
    orderId: `VST-${year}-${padded}`,
    invoiceNumber: `INV-${year}-${padded}`,
  };
}

const serializeCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.name,
  firstName: customer.firstName ?? '',
  lastName: customer.lastName ?? '',
  email: customer.email,
  phone: customer.phone ?? '',
  accountStatus: customer.accountStatus ?? (customer.emailVerified ? 'REGISTERED_VERIFIED' : customer.activationStatus ?? 'GUEST'),
  emailVerified: Boolean(customer.emailVerified),
  emailVerifiedAt: customer.emailVerifiedAt ?? null,
  customerType: customer.customerType ?? 'GUEST',
  activationStatus: customer.activationStatus ?? 'GUEST',
  orders: customer.orders,
  totalSpend: customer.totalSpend,
  joined: customer.joined,
  lastOrder: customer.lastOrder ?? customer.joined,
  lastLogin: customer.lastLogin ?? null,
});

const serializePromoCode = (promo: {
  id: number;
  code: string;
  discount: number;
  type: string;
  uses: number;
  maxUses: number | null;
  active: boolean;
  expiry: string | null;
}) => promo;

const serializeJournalArticle = (article: {
  id: number;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: string;
  image: string;
}) => ({
  ...article,
  content: parseJson<string[]>(article.content, []),
});

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

const mapProductInput = (body: any) => ({
  name: String(body.name ?? ''),
  slug: body.slug ? String(body.slug) : (body.name ? slugify(body.name) : null),
  category: String(body.category ?? 'Clothing'),
  productType: body.productType ? String(body.productType) : null,
  price: body.basePriceMinor !== undefined ? toMajor(minor(body.basePriceMinor), requireCurrency(body.baseCurrency)) : Number(body.price ?? 0),
  ...(body.basePriceMinor !== undefined ? { basePriceMinor: minor(body.basePriceMinor), baseCurrency: requireCurrency(body.baseCurrency) } : {}),
  compareAt: body.compareAt === '' || body.compareAt === undefined || body.compareAt === null ? null : Number(body.compareAt),
  badge: body.badge ? String(body.badge) : null,
  colors: JSON.stringify(Array.isArray(body.colors) ? body.colors : []),
  image: String(body.image ?? ''),
  modelImage: body.modelImage ? String(body.modelImage) : null,
  productImage: body.productImage ? String(body.productImage) : null,
  images: JSON.stringify(Array.isArray(body.images) && body.images.length > 0 ? body.images : [String(body.image ?? '')]),
  alt: String(body.alt ?? body.name ?? ''),
  sizes: JSON.stringify(Array.isArray(body.sizes) ? body.sizes : []),
  description: String(body.description ?? ''),
  details: JSON.stringify(Array.isArray(body.details) ? body.details : []),
  care: JSON.stringify(Array.isArray(body.care) ? body.care : []),
  sizeChart: body.sizeChart
    ? (typeof body.sizeChart === 'string' ? body.sizeChart : JSON.stringify(body.sizeChart))
    : null,
  rating: Number(body.rating ?? 0),
  seoTitle: body.seoTitle ? String(body.seoTitle) : null,
  seoDescription: body.seoDescription ? String(body.seoDescription) : null,
  seoKeywords: body.seoKeywords ? String(body.seoKeywords) : null,
  canonicalUrl: body.canonicalUrl ? String(body.canonicalUrl) : null,
  robotsIndex: parseBooleanField(body.robotsIndex, true),
  robotsFollow: parseBooleanField(body.robotsFollow, true),
  brand: body.brand ? String(body.brand) : 'Vestigia',
  sku: body.sku ? String(body.sku).trim() : null,
  gtin: body.gtin ? String(body.gtin).trim() : null,
  mpn: body.mpn ? String(body.mpn).trim() : null,
  condition: ['new', 'used', 'refurbished'].includes(String(body.condition ?? '').toLowerCase())
    ? String(body.condition).toLowerCase()
    : 'new',
  googleProductCategory: body.googleProductCategory ? String(body.googleProductCategory) : null,
  material: body.material ? String(body.material) : null,
  gender: body.gender ? String(body.gender) : null,
  ageGroup: body.ageGroup ? String(body.ageGroup) : null,
  imageTitle: body.imageTitle ? String(body.imageTitle) : null,
  redirectFrom: Array.isArray(body.redirectFrom) ? JSON.stringify(body.redirectFrom) : (body.redirectFrom ? String(body.redirectFrom) : null),
});

async function calculateOrderQuote(payload: any, db: any = prisma): Promise<any> {
  return new PricingService(db).calculateCart(payload);
}

async function verifyPaymentIntentForQuote(paymentIntentId: unknown, quote: Awaited<ReturnType<typeof calculateOrderQuote>>) {
  const id = cleanText(paymentIntentId, 120);
  if (id !== quote.providerPaymentId) throw new Error('Payment does not belong to this checkout');

  if (allowMockPayments && id.startsWith('pi_mock_')) {
    return id;
  }

  if (!stripe) {
    throw new Error('Stripe payments are not configured.');
  }

  if (!id.startsWith('pi_')) {
    throw new Error('Valid Stripe payment intent is required.');
  }

  const intent = await stripe.paymentIntents.retrieve(id);
  if (intent.status !== 'succeeded') {
    throw new Error('Payment has not been completed.');
  }
  if (intent.amount !== quote.totalMinor || intent.currency.toUpperCase() !== quote.currency || intent.metadata.checkoutId !== quote.checkoutId) {
    await logSecurityEvent(null, 'PAYMENT_CURRENCY_OR_AMOUNT_MISMATCH', { metadata: { checkoutId: quote.checkoutId, expectedAmount: quote.totalMinor, expectedCurrency: quote.currency, receivedAmount: intent.amount, receivedCurrency: intent.currency } });
    throw new Error('Payment amount or currency does not match the checkout.');
  }

  return intent.id;
}

async function assessCheckoutRisk(req: express.Request, payload: any, quote: Awaited<ReturnType<typeof calculateOrderQuote>>) {
  const reasons: string[] = [];
  let score = 0;
  const ipAddress = clientIp(req);
  const email = normalizeEmail(payload.email);
  const total = quote.totalMinor;

  if (total >= 50000) {
    score += 25;
    reasons.push('Sudden high-value order');
  }
  if (payload.billingAddress && !payload.sameAsShipping) {
    score += 10;
    reasons.push('Billing and shipping address differ');
  }
  if (payload.checkoutStartedAt) {
    const elapsedMs = Date.now() - Number(payload.checkoutStartedAt);
    if (Number.isFinite(elapsedMs) && elapsedMs > 0 && elapsedMs < 15_000) {
      score += 15;
      reasons.push('Abnormally fast checkout attempt');
    }
  }
  const recentIpOrders = await prisma.order.count({
    where: {
      date: { gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      OR: [
        { email },
        { notes: { contains: ipAddress } },
      ],
    },
  });
  if (recentIpOrders >= 5) {
    score += 20;
    reasons.push('Unusual number of recent orders');
  }
  const failedPayments = await prisma.securityEvent.count({
    where: {
      eventType: 'PAYMENT_FAILED',
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      OR: [
        { ipAddress },
        { metadata: { contains: email } },
      ],
    },
  });
  if (failedPayments >= 3) {
    score += 25;
    reasons.push('Multiple recent failed payment signals');
  }

  const riskLevel = score >= 80 ? 'BLOCKED' : score >= 50 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
  return { riskLevel, riskScore: score, reasons };
}

const parseInventoryField = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, number>;
  }
  return undefined;
};

const parseJsonBody = <T>(value: unknown, fallback: T): T => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const resolveProductImage = (body: any, file?: Express.Multer.File) => {
  if (file) {
    return `/uploads/${file.filename}`;
  }
  return String(body.image ?? '');
};

const parseArrayField = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getProductPayload = (body: any, file?: Express.Multer.File) => ({
  name: body.name,
  slug: body.slug,
  category: body.category,
  productType: body.productType,
  price: body.price,
  compareAt: body.compareAt,
  badge: body.badge,
  colors: parseArrayField(body.colors),
  image: resolveProductImage(body, file),
  modelImage: body.modelImage ? String(body.modelImage) : null,
  productImage: body.productImage ? String(body.productImage) : null,
  prices: body.prices,
  baseCurrency: body.baseCurrency, basePriceMinor: body.basePriceMinor, priceChangeReason: body.priceChangeReason,
  images: parseArrayField(body.images),
  alt: body.alt,
  sizes: parseArrayField(body.sizes),
  description: body.description,
  details: parseArrayField(body.details),
  care: parseArrayField(body.care),
  sizeChart: body.sizeChart,
  rating: body.rating,
  seoTitle: body.seoTitle,
  seoDescription: body.seoDescription,
  seoKeywords: body.seoKeywords,
  canonicalUrl: body.canonicalUrl,
  robotsIndex: body.robotsIndex,
  robotsFollow: body.robotsFollow,
  brand: body.brand,
  sku: body.sku,
  gtin: body.gtin,
  mpn: body.mpn,
  condition: body.condition,
  googleProductCategory: body.googleProductCategory,
  material: body.material,
  gender: body.gender,
  ageGroup: body.ageGroup,
  imageTitle: body.imageTitle,
  redirectFrom: parseArrayField(body.redirectFrom),
});

const syncInventory = async (productId: number, inventory: Record<string, number> | undefined) => {
  await prisma.inventory.deleteMany({ where: { productId } });

  if (!inventory) return;

  const entries = Object.entries(inventory).map(([key, stock]) => {
    const [color, size] = key.split('_');
    return {
      productId,
      color,
      size,
      stock: Number(stock) || 0,
    };
  });

  if (entries.length > 0) {
    await prisma.inventory.createMany({ data: entries });
  }
};

const seedDatabase = async () => {
  const settingsCount = await prisma.storeSettings.count();
  if (settingsCount === 0) {
    await prisma.storeSettings.create({ data: { id: 1, ...DEFAULT_SETTINGS } });
  }

  const adminCount = await prisma.adminUser.count();
  if (adminCount === 0) {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || (isDevMode ? 'admin123Secure' : '');
    if (!initialPassword) {
      throw new Error('ADMIN_INITIAL_PASSWORD must be configured before creating the first production admin.');
    }
    const hashedPassword = await bcrypt.hash(validatePassword(initialPassword), BCRYPT_ROUNDS);
    await prisma.adminUser.create({ data: { username: 'admin', password: hashedPassword } });
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    for (const product of seedProducts) {
      const createdProduct = await prisma.product.create({
        data: {
          ...mapProductInput(product),
        },
      });

      if (product.inventory) {
        await syncInventory(createdProduct.id, product.inventory);
      }

      for (const review of product.reviews ?? []) {
        await prisma.review.create({
          data: {
            productId: createdProduct.id,
            author: review.author,
            rating: review.rating,
            date: review.date,
            comment: review.comment,
            status: review.status || 'approved',
          },
        });
      }
    }
  }

  // Fill missing slugs for legacy database products
  const legacyProducts = await prisma.product.findMany({ where: { slug: null } });
  for (const legacyP of legacyProducts) {
    await prisma.product.update({
      where: { id: legacyP.id },
      data: { slug: slugify(legacyP.name) }
    });
  }

  const journalCount = await prisma.journalArticle.count();
  if (journalCount === 0) {
    // Leave journal empty until real content is created in the admin panel.
  }

  // Seed Shipping Regions, Countries, and Methods if empty
  const defaultRegions = [
    {
      name: 'Europe',
      isActive: true,
      countries: [
        { countryCode: 'GB', countryName: 'United Kingdom', isEnabled: true, currency: 'GBP', displayOrder: 1 },
        { countryCode: 'FR', countryName: 'France', isEnabled: true, currency: 'EUR', displayOrder: 2 },
        { countryCode: 'DE', countryName: 'Germany', isEnabled: true, currency: 'EUR', displayOrder: 3 },
        { countryCode: 'IT', countryName: 'Italy', isEnabled: true, currency: 'EUR', displayOrder: 4 },
        { countryCode: 'ES', countryName: 'Spain', isEnabled: true, currency: 'EUR', displayOrder: 5 },
        { countryCode: 'NL', countryName: 'Netherlands', isEnabled: true, currency: 'EUR', displayOrder: 6 },
        { countryCode: 'CH', countryName: 'Switzerland', isEnabled: true, currency: 'CHF', displayOrder: 7 },
        { countryCode: 'SE', countryName: 'Sweden', isEnabled: true, currency: 'SEK', displayOrder: 8 },
      ],
      methods: [
        { name: 'Standard Shipping', description: 'Reliable postal express delivery', price: 15, estimatedDays: '4-7 Days', freeShippingThreshold: 200, isActive: true },
        { name: 'Express DHL', description: 'Guaranteed priority courier delivery', price: 35, estimatedDays: '2-3 Days', freeShippingThreshold: null, isActive: true },
        { name: 'Economy Shipping', description: 'Budget friendly standard shipping', price: 10, estimatedDays: '7-14 Days', freeShippingThreshold: 150, isActive: true },
      ],
    },
    {
      name: 'North America',
      isActive: true,
      countries: [
        { countryCode: 'US', countryName: 'United States', isEnabled: true, currency: 'USD', displayOrder: 1 },
        { countryCode: 'CA', countryName: 'Canada', isEnabled: true, currency: 'CAD', displayOrder: 2 },
      ],
      methods: [
        { name: 'Standard Shipping', description: 'Insured ground express delivery', price: 20, estimatedDays: '5-8 Days', freeShippingThreshold: 300, isActive: true },
        { name: 'Express FedEx', description: 'Next-flight priority courier', price: 45, estimatedDays: '2-4 Days', freeShippingThreshold: null, isActive: true },
      ],
    },
    {
      name: 'Asia',
      isActive: true,
      countries: [
        { countryCode: 'LK', countryName: 'Sri Lanka', isEnabled: true, currency: 'LKR', displayOrder: 1 },
        { countryCode: 'JP', countryName: 'Japan', isEnabled: true, currency: 'JPY', displayOrder: 2 },
        { countryCode: 'SG', countryName: 'Singapore', isEnabled: true, currency: 'SGD', displayOrder: 3 },
        { countryCode: 'AE', countryName: 'United Arab Emirates', isEnabled: true, currency: 'AED', displayOrder: 4 },
        { countryCode: 'IN', countryName: 'India', isEnabled: false, currency: 'INR', displayOrder: 5 },
        { countryCode: 'RU', countryName: 'Russia', isEnabled: false, currency: 'RUB', displayOrder: 6 },
        { countryCode: 'KP', countryName: 'North Korea', isEnabled: false, currency: 'KPW', displayOrder: 7 },
      ],
      methods: [
        { name: 'Standard Shipping', description: 'Express Asian distribution hub shipping', price: 15, estimatedDays: '3-6 Days', freeShippingThreshold: 150, isActive: true },
        { name: 'Express Courier', description: 'Priority air courier delivery', price: 30, estimatedDays: '2-3 Days', freeShippingThreshold: null, isActive: true },
      ],
    },
    {
      name: 'Oceania',
      isActive: true,
      countries: [
        { countryCode: 'AU', countryName: 'Australia', isEnabled: true, currency: 'AUD', displayOrder: 1 },
        { countryCode: 'NZ', countryName: 'New Zealand', isEnabled: true, currency: 'NZD', displayOrder: 2 },
      ],
      methods: [
        { name: 'Standard International', description: 'Insured international air mail', price: 25, estimatedDays: '6-10 Days', freeShippingThreshold: 350, isActive: true },
        { name: 'DHL Express', description: 'Express international delivery', price: 55, estimatedDays: '3-5 Days', freeShippingThreshold: null, isActive: true },
      ],
    },
  ];

  for (const reg of defaultRegions) {
    let region = await prisma.shippingRegion.findUnique({ where: { name: reg.name } });
    if (!region) {
      try {
        region = await prisma.shippingRegion.create({
          data: {
            name: reg.name,
            isActive: reg.isActive,
          },
        });
      } catch (e) {
        region = await prisma.shippingRegion.findUnique({ where: { name: reg.name } });
      }
    }
    if (!region) continue;

    for (const c of reg.countries) {
      try {
        const existingCountry = await prisma.shippingCountry.findFirst({
          where: { countryCode: c.countryCode },
        });
        if (!existingCountry) {
          await prisma.shippingCountry.create({
            data: {
              regionId: region.id,
              ...c,
            },
          });
        }
      } catch (err) {
        // Ignored for existing seeded entries
      }
    }

    for (const m of reg.methods) {
      try {
        const existingMethod = await prisma.shippingMethod.findFirst({
          where: { regionId: region.id, name: m.name },
        });
        if (!existingMethod) {
          await prisma.shippingMethod.create({
            data: {
              regionId: region.id,
              ...m,
            },
          });
        }
      } catch (err) {
        // Ignored for existing seeded entries
      }
    }
  }
};

const serializeCustomerProfile = (customer: any) => {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    email: customer.email,
    phone: customer.phone ?? '',
    country: customer.country ?? '',
    addresses: customer.savedAddresses && customer.savedAddresses.length > 0
      ? customer.savedAddresses
      : parseJson<any[]>(customer.addresses, []),
    savedAddresses: customer.savedAddresses ?? [],
    orders: customer.orders,
    totalSpend: customer.totalSpend,
    joined: customer.joined,
    lastOrder: customer.lastOrder ?? customer.joined,
    customerType: customer.customerType ?? 'GUEST',
    activationStatus: customer.activationStatus ?? 'GUEST',
    emailVerified: Boolean(customer.emailVerified),
    emailVerifiedAt: customer.emailVerifiedAt ?? null,
    accountStatus: customer.accountStatus ?? (customer.emailVerified ? 'REGISTERED_VERIFIED' : customer.activationStatus ?? 'GUEST'),
    companyName: customer.companyName ?? null,
    vatId: customer.vatId ?? null,
    marketingConsent: Boolean(customer.marketingConsent),
  };
};

const logSecurityEvent = async (
  req: express.Request | null,
  eventType: string,
  options: {
    customerId?: number | null;
    actorType?: string;
    actorId?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  } = {},
) => {
  try {
    await prisma.securityEvent.create({
      data: {
        customerId: options.customerId ?? null,
        eventType,
        actorType: options.actorType ?? null,
        actorId: options.actorId ?? null,
        orderId: options.orderId ?? null,
        ipAddress: req ? clientIp(req) : null,
        userAgent: req ? userAgent(req) : null,
        metadata: options.metadata ? JSON.stringify(options.metadata).slice(0, 2000) : null,
      },
    });
  } catch (error) {
    console.error('Failed to record security event:', error);
  }
};

const createVerificationToken = async (customerId: number, db: any = prisma) => {
  const token = randomToken(32);
  await db.verificationToken.create({
    data: {
      customerId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
};

const createCustomerSession = async (req: express.Request, res: express.Response, customerId: number) => {
  const sessionToken = randomToken(48);
  const csrfToken = randomToken(24);
  await prisma.customerSession.create({
    data: {
      customerId,
      sessionTokenHash: tokenHash(sessionToken),
      csrfTokenHash: tokenHash(csrfToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: clientIp(req),
      userAgent: userAgent(req),
      lastUsedAt: new Date(),
    },
  });
  res.cookie('vestigia_session', sessionToken, secureCookieOptions());
  res.cookie('vestigia_csrf', csrfToken, csrfCookieOptions());
  await logSecurityEvent(req, 'CUSTOMER_SESSION_CREATED', { customerId });
  return { sessionToken, csrfToken };
};

const revokeCustomerSessions = async (customerId: number, reason: string, exceptSessionId?: number) => {
  await prisma.customerSession.updateMany({
    where: {
      customerId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: {
      revokedAt: new Date(),
      revokeReason: reason,
    },
  });
};

const sendCustomerVerificationEmail = async (customer: any, token: string) => {
  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(customer.email, customer.firstName || customer.name || 'there', verifyLink, 24);
};

// ─── JWT Authentication Middlewares ─────────────────────────────────────────

const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const cookies = parseCookies(req);
  const cookieToken = cookies.vestigia_session;
  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const session = await prisma.customerSession.findUnique({
      where: { sessionTokenHash: tokenHash(token) },
      include: { customer: { include: { savedAddresses: true } } },
    });

    if (session) {
      if (session.revokedAt || session.expiresAt <= new Date()) {
        clearCustomerCookies(res);
        res.status(403).json({ error: 'Invalid or expired session' });
        return;
      }
      if (!isSafeAccountStatus(session.customer.accountStatus)) {
        await revokeCustomerSessions(session.customerId, 'account_restricted');
        clearCustomerCookies(res);
        res.status(403).json({ error: 'Account access is restricted.' });
        return;
      }
      if (!bearerToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const headerToken = String(req.headers['x-csrf-token'] || '');
        if (!headerToken || !session.csrfTokenHash || tokenHash(headerToken) !== session.csrfTokenHash) {
          res.status(403).json({ error: 'CSRF token is missing or invalid.' });
          return;
        }
      }
      await prisma.customerSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
      (req as any).user = { id: session.customerId, email: session.customer.email, sessionId: session.id };
      (req as any).customer = session.customer;
      next();
      return;
    }

    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err || !decoded?.id) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }
      const customer = await prisma.customer.findUnique({
        where: { id: Number(decoded.id) },
        include: { savedAddresses: true },
      });
      if (!customer || !isSafeAccountStatus(customer.accountStatus)) {
        res.status(403).json({ error: 'Account access is restricted.' });
        return;
      }
      (req as any).user = { id: customer.id, email: customer.email };
      (req as any).customer = customer;
      next();
    });
  } catch (error) {
    console.error('Customer authentication failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Admin authentication token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err || !decoded || decoded.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: Admin privileges required' });
      return;
    }
    (req as any).admin = decoded;
    next();
  });
};

// --- CHECKOUT AUTHENTICATION & EMAIL CHECK ENDPOINTS ---

app.post('/api/customers/check-email', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const customer = await prisma.customer.findUnique({
      where: { email: cleanEmail },
      include: { savedAddresses: true },
    });

    if (!customer) {
      res.json({
        case: 'NEW_CUSTOMER',
        email: cleanEmail,
        message: 'New customer checkout. Continue without password.',
      });
      return;
    }

    if (customer.password && (customer.customerType === 'REGISTERED' || customer.activationStatus === 'ACTIVATED')) {
      res.json({
        case: 'EXISTS_PASSWORD',
        email: cleanEmail,
        message: 'Welcome back! Enter your password to log in and use saved addresses.',
      });
      return;
    }

    res.json({
      case: 'GUEST_WITH_PAST_ORDERS',
      email: cleanEmail,
      message: 'You have placed past orders with us. Would you like to activate your Vestigia account?',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check customer email' });
  }
});

app.post('/api/customers/activate-account', authRateLimit, async (req, res) => {
  try {
    const { token, password, email } = req.body ?? {};
    let customerToActivate: any = null;

    if (!token || !password) {
      res.status(400).json({ error: 'Activation token and password are required.' });
      return;
    }

    const actToken = await prisma.activationToken.findUnique({
      where: { token: tokenHash(String(token)) },
    });
    if (!actToken || actToken.usedAt || actToken.expiresAt < new Date()) {
      res.status(400).json({ error: 'Activation link has expired or is invalid.' });
      return;
    }
    customerToActivate = await prisma.customer.findUnique({
      where: { id: actToken.customerId },
      include: { savedAddresses: true },
    });

    if (email && normalizeEmail(email) !== customerToActivate?.email) {
      res.status(400).json({ error: 'Activation request is invalid.' });
      return;
    }

    if (!customerToActivate) {
      res.status(404).json({ error: 'Customer account not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatePassword(password), BCRYPT_ROUNDS);

    const updated = await prisma.customer.update({
      where: { id: customerToActivate.id },
      data: {
        password: hashedPassword,
        passwordHash: hashedPassword,
        customerType: 'REGISTERED',
        activationStatus: 'ACTIVATED',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        accountStatus: 'REGISTERED_VERIFIED',
      },
      include: { savedAddresses: true },
    });

    await prisma.activationToken.update({ where: { id: actToken.id }, data: { usedAt: new Date() } });
    await prisma.activationToken.deleteMany({ where: { customerId: customerToActivate.id, usedAt: null } });
    await logSecurityEvent(req, 'CUSTOMER_EMAIL_VERIFIED', { customerId: updated.id });
    const { sessionToken, csrfToken } = await createCustomerSession(req, res, updated.id);

    res.json({
      token: sessionToken,
      csrfToken,
      user: serializeCustomerProfile(updated),
      message: 'Account activated successfully!',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to activate account' });
  }
});

// ADDRESS BOOK ENDPOINTS
app.get('/api/customers/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const addresses = await prisma.address.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer addresses' });
  }
});

app.post('/api/customers/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { label, firstName, lastName, company, address, apartment, city, state, zip, country, phone, phoneCountry, phoneDialCode, isDefaultShipping, isDefaultBilling } = req.body ?? {};

    if (!firstName || !lastName || !address || !city || !state || !zip || !country) {
      res.status(400).json({ error: 'Required address fields are missing' });
      return;
    }

    if (isDefaultShipping) {
      await prisma.address.updateMany({ where: { customerId: userId }, data: { isDefaultShipping: false } });
    }
    if (isDefaultBilling) {
      await prisma.address.updateMany({ where: { customerId: userId }, data: { isDefaultBilling: false } });
    }

    const created = await prisma.address.create({
      data: {
        customerId: userId,
        label: label ? String(label).trim() : 'Home',
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        company: company ? String(company).trim() : null,
        address: String(address).trim(),
        apartment: apartment ? String(apartment).trim() : null,
        city: String(city).trim(),
        state: String(state).trim(),
        zip: String(zip).trim(),
        country: String(country).trim(),
        phone: phone ? String(phone).trim() : null,
        phoneCountry: phoneCountry ? String(phoneCountry).trim() : null,
        phoneDialCode: phoneDialCode ? String(phoneDialCode).trim() : null,
        isDefaultShipping: Boolean(isDefaultShipping),
        isDefaultBilling: Boolean(isDefaultBilling),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address' });
  }
});

app.delete('/api/customers/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);
    await prisma.address.deleteMany({ where: { id, customerId: userId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// --- CUSTOMER PORTAL AUTHENTICATION & MANAGEMENT ---
app.post('/api/customers/register', authRateLimit, async (req, res) => {
  try {
    const { firstName, lastName, name, email, password, confirmPassword, country, phone, marketingConsent } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);
    const safeFirstName = cleanText(firstName || String(name || '').split(' ')[0], 80);
    const safeLastName = cleanText(lastName || String(name || '').split(' ').slice(1).join(' '), 80);
    const safeName = cleanText(`${safeFirstName} ${safeLastName}`.trim() || name, 120);
    const safeCountry = cleanText(country, 80);
    const safePhone = phone ? cleanText(phone, 40) : '';

    if (!safeFirstName || !safeLastName || !isValidEmail(normalizedEmail) || !password || !safeCountry) {
      res.status(400).json({ error: 'First name, last name, email, password and country are required.' });
      return;
    }
    if (confirmPassword !== undefined && String(password) !== String(confirmPassword)) {
      res.status(400).json({ error: 'Password confirmation does not match.' });
      return;
    }
    const validPassword = validatePassword(password);

    const existing = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (isRestrictedStatus(existing.accountStatus)) {
        await logSecurityEvent(req, 'CUSTOMER_REGISTER_RESTRICTED_ATTEMPT', { customerId: existing.id });
        res.status(403).json({ error: 'Account access is restricted.' });
        return;
      }
      if (existing.password || existing.passwordHash) {
        res.status(409).json({ error: 'An account already exists for this email. Please sign in or continue as guest.' });
        return;
      }

      const hashedPassword = await bcrypt.hash(validPassword, BCRYPT_ROUNDS);
      const { updated, verificationToken } = await prisma.$transaction(async (tx) => {
        await tx.verificationToken.updateMany({
          where: { customerId: existing.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        const updatedCustomer = await tx.customer.update({
          where: { email: normalizedEmail },
          data: {
            name: safeName,
            firstName: safeFirstName,
            lastName: safeLastName,
            password: hashedPassword,
            passwordHash: hashedPassword,
            phone: safePhone || existing.phone,
            country: safeCountry || existing.country,
            emailVerified: false,
            emailVerifiedAt: null,
            customerType: 'REGISTERED',
            activationStatus: 'PENDING',
            accountStatus: 'REGISTERED_UNVERIFIED',
            marketingConsent: Boolean(marketingConsent),
          },
          include: { savedAddresses: true },
        });
        const token = await createVerificationToken(updatedCustomer.id, tx);
        return { updated: updatedCustomer, verificationToken: token };
      });
      sendCustomerVerificationEmail(updated, verificationToken).catch((mailError) => {
        console.error('Verification email failed:', mailError);
      });
      await logSecurityEvent(req, 'CUSTOMER_REGISTERED_FROM_GUEST', { customerId: updated.id });
      res.status(200).json({
        success: true,
        user: serializeCustomerProfile(updated),
        message: 'Your account has been created. Please check your email to verify your account.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(validPassword, BCRYPT_ROUNDS);
    const { created, verificationToken } = await prisma.$transaction(async (tx) => {
      const createdCustomer = await tx.customer.create({
        data: {
          name: safeName,
          firstName: safeFirstName,
          lastName: safeLastName,
          email: normalizedEmail,
          password: hashedPassword,
          passwordHash: hashedPassword,
          phone: safePhone,
          country: safeCountry,
          joined: new Date().toISOString(),
          addresses: JSON.stringify([]),
          emailVerified: false,
          emailVerifiedAt: null,
          customerType: 'REGISTERED',
          activationStatus: 'PENDING',
          accountStatus: 'REGISTERED_UNVERIFIED',
          marketingConsent: Boolean(marketingConsent),
        },
        include: { savedAddresses: true },
      });
      const token = await createVerificationToken(createdCustomer.id, tx);
      return { created: createdCustomer, verificationToken: token };
    });

    sendCustomerVerificationEmail(created, verificationToken).catch((mailError) => {
      console.error('Verification email failed:', mailError);
    });
    await logSecurityEvent(req, 'CUSTOMER_REGISTERED', { customerId: created.id });
    res.status(201).json({
      success: true,
      user: serializeCustomerProfile(created),
      message: 'Your account has been created. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/customers/resend-verification', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!isValidEmail(email)) {
      res.json({ success: true, message: 'If an account exists and needs verification, we will send an email.' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { email: normalizeEmail(email) } });
    if (customer && !customer.emailVerified && !isRestrictedStatus(customer.accountStatus)) {
      await prisma.verificationToken.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = await createVerificationToken(customer.id);
      sendCustomerVerificationEmail(customer, token).catch((mailError) => {
        console.error('Verification email failed:', mailError);
      });
      await logSecurityEvent(req, 'CUSTOMER_VERIFICATION_RESENT', { customerId: customer.id });
    }

    res.json({ success: true, message: 'If an account exists and needs verification, we will send an email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to send verification email.' });
  }
});

const verifyEmailTokenHandler = async (req: express.Request, res: express.Response) => {
  try {
    const token = String((req.query.token || req.body?.token || '') as string);
    if (!token || token.length > 300) {
      res.status(400).json({ error: 'Verification link is invalid or expired.' });
      return;
    }

    const hashed = tokenHash(token);
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashed },
      include: { customer: true },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date() || !isSafeAccountStatus(record.customer.accountStatus)) {
      res.status(400).json({ error: 'Verification link is invalid or expired.' });
      return;
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: record.customerId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          activationStatus: 'ACTIVATED',
          accountStatus: 'REGISTERED_VERIFIED',
        },
      }),
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.verificationToken.updateMany({
        where: { customerId: record.customerId, id: { not: record.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    await logSecurityEvent(req, 'CUSTOMER_EMAIL_VERIFIED', { customerId: record.customerId });
    res.json({ success: true, message: 'Your email has been verified.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to verify email.' });
  }
};

app.get('/api/customers/verify-email', authRateLimit, verifyEmailTokenHandler);
app.post('/api/customers/verify-email', authRateLimit, verifyEmailTokenHandler);

app.post('/api/customers/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
      include: { savedAddresses: true },
    });
    const storedHash = customer?.passwordHash || customer?.password;
    if (!customer || !storedHash) {
      await logSecurityEvent(req, 'CUSTOMER_LOGIN_FAILED', { metadata: { reason: 'invalid_credentials', email: normalizedEmail } });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    if (isRestrictedStatus(customer.accountStatus)) {
      await logSecurityEvent(req, 'CUSTOMER_LOGIN_RESTRICTED', { customerId: customer.id });
      res.status(403).json({ error: 'Account access is restricted.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
      await logSecurityEvent(req, 'CUSTOMER_LOGIN_FAILED', { customerId: customer.id, metadata: { reason: 'invalid_credentials' } });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!customer.passwordHash && customer.password) {
      await prisma.customer.update({ where: { id: customer.id }, data: { passwordHash: customer.password } });
    }
    const { sessionToken, csrfToken } = await createCustomerSession(req, res, customer.id);
    await prisma.customer.update({ where: { id: customer.id }, data: { lastLogin: new Date().toISOString() } });
    await logSecurityEvent(req, 'CUSTOMER_LOGIN_SUCCESS', { customerId: customer.id });
    res.json({
      token: sessionToken,
      csrfToken,
      user: serializeCustomerProfile(customer),
      requiresEmailVerification: !customer.emailVerified,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/customers/logout', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    if (userPayload.sessionId) {
      await prisma.customerSession.update({
        where: { id: userPayload.sessionId },
        data: { revokedAt: new Date(), revokeReason: 'customer_logout' },
      });
    }
    clearCustomerCookies(res);
    await logSecurityEvent(req, 'CUSTOMER_LOGOUT', { customerId: userPayload.id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.post('/api/customers/logout-all', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    await revokeCustomerSessions(userPayload.id, 'customer_logout_all');
    clearCustomerCookies(res);
    await logSecurityEvent(req, 'CUSTOMER_LOGOUT_ALL', { customerId: userPayload.id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/customers/sessions', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const sessions = await prisma.customerSession.findMany({
      where: { customerId: userPayload.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    res.json(sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
      current: session.id === userPayload.sessionId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/api/customers/profile', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const customer = await prisma.customer.findUnique({
      where: { id: userPayload.id },
      include: { savedAddresses: true },
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(serializeCustomerProfile(customer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

app.put('/api/customers/profile', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const { name, phone, addresses } = req.body ?? {};

    const updateData: any = {};
    if (name !== undefined) updateData.name = cleanText(name, 120);
    if (phone !== undefined) updateData.phone = cleanText(phone, 40);
    if (addresses !== undefined) {
      updateData.addresses = typeof addresses === 'string' ? addresses : JSON.stringify(addresses);
    }

    const updated = await prisma.customer.update({
      where: { id: userPayload.id },
      data: updateData,
      include: { savedAddresses: true },
    });

    res.json(serializeCustomerProfile(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/customers/request-email-change', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const { newEmail } = req.body ?? {};
    if (!isValidEmail(newEmail)) {
      res.status(400).json({ error: 'A valid new email address is required.' });
      return;
    }

    const normalizedNewEmail = normalizeEmail(newEmail);
    const existing = await prisma.customer.findUnique({ where: { email: normalizedNewEmail } });
    if (existing && existing.id !== userPayload.id) {
      res.status(409).json({ error: 'Unable to use this email address.' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: userPayload.id } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const token = randomToken(32);
    await prisma.$transaction(async (tx) => {
      await tx.emailChangeToken.updateMany({
        where: { customerId: userPayload.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.emailChangeToken.create({
        data: {
          customerId: userPayload.id,
          newEmail: normalizedNewEmail,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-email-change?token=${encodeURIComponent(token)}`;
    sendVerificationEmail(normalizedNewEmail, customer.firstName || customer.name || 'there', verifyLink, 24).catch((mailError) => {
      console.error('Email change verification failed:', mailError);
    });
    await logSecurityEvent(req, 'CUSTOMER_EMAIL_CHANGE_REQUESTED', { customerId: userPayload.id });
    res.json({ success: true, message: 'Please check the new email address to confirm this change.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to request email change' });
  }
});

app.post('/api/customers/confirm-email-change', authRateLimit, async (req, res) => {
  try {
    const token = String(req.body?.token || req.query?.token || '');
    if (!token) {
      res.status(400).json({ error: 'Email change link is invalid or expired.' });
      return;
    }
    const record = await prisma.emailChangeToken.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { customer: true },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date() || isRestrictedStatus(record.customer.accountStatus)) {
      res.status(400).json({ error: 'Email change link is invalid or expired.' });
      return;
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: record.customerId },
        data: {
          email: record.newEmail,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          accountStatus: 'REGISTERED_VERIFIED',
        },
      }),
      prisma.emailChangeToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.customerSession.updateMany({
        where: { customerId: record.customerId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'email_changed' },
      }),
    ]);
    await logSecurityEvent(req, 'CUSTOMER_EMAIL_CHANGED', { customerId: record.customerId });
    sendSecurityNoticeEmail(record.customer.email, record.customer.firstName || record.customer.name || 'there', 'Your Vestigia account email address was changed. If you did not request this, contact support immediately.').catch((mailError) => {
      console.error('Old email security notice failed:', mailError);
    });
    res.json({ success: true, message: 'Your email address has been updated. Please sign in again.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm email change' });
  }
});

app.put('/api/customers/change-password', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const { oldPassword, newPassword } = req.body ?? {};
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: userPayload.id } });
    const storedHash = customer?.passwordHash || customer?.password;
    if (!customer || !storedHash) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, storedHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(validatePassword(newPassword), BCRYPT_ROUNDS);
    await prisma.customer.update({
      where: { id: userPayload.id },
      data: { password: hashedNewPassword, passwordHash: hashedNewPassword },
    });
    await revokeCustomerSessions(userPayload.id, 'password_changed', userPayload.sessionId);
    await logSecurityEvent(req, 'CUSTOMER_PASSWORD_CHANGED', { customerId: userPayload.id });
    sendSecurityNoticeEmail(customer.email, customer.firstName || customer.name || 'there', 'Your Vestigia password was changed. If you did not make this change, contact support immediately.').catch((mailError) => {
      console.error('Password change notice failed:', mailError);
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.post('/api/customers/forgot-password', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body ?? {};
    const generic = { success: true, message: "If an account exists for this email, we'll send password reset instructions." };
    if (!isValidEmail(email)) return res.json(generic);

    const normalizedEmail = normalizeEmail(email);
    const customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });

    if (!customer || isRestrictedStatus(customer.accountStatus)) return res.json(generic);

    const token = randomToken(32);
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 45 * 60 * 1000),
        },
      });
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail(normalizedEmail, resetLink);
    } catch (mailError) {
      console.error('Error sending password reset email:', mailError);
    }
    await logSecurityEvent(req, 'CUSTOMER_PASSWORD_RESET_REQUESTED', { customerId: customer.id });

    res.json(generic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

app.post('/api/customers/reset-password', authRateLimit, async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        OR: [
          { tokenHash: tokenHash(String(token)) },
          { token: String(token) },
        ],
      },
      include: { customer: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date() || isRestrictedStatus(resetToken.customer.accountStatus)) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatePassword(password), BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: resetToken.customerId },
        data: {
          password: hashedPassword,
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: { customerId: resetToken.customerId, id: { not: resetToken.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.customerSession.updateMany({
        where: { customerId: resetToken.customerId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'password_reset' },
      }),
    ]);
    await logSecurityEvent(req, 'CUSTOMER_PASSWORD_RESET_COMPLETED', { customerId: resetToken.customerId });
    sendSecurityNoticeEmail(resetToken.customer.email, resetToken.customer.firstName || resetToken.customer.name || 'there', 'Your Vestigia password was reset. If you did not make this change, contact support immediately.').catch((mailError) => {
      console.error('Password reset notice failed:', mailError);
    });

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── Send OTP ──────────────────────────────────────────────────────────────────
app.post('/api/customers/send-otp', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
    if (!customer) {
      // Return success to avoid user enumeration
      res.json({ success: true, message: 'If an account exists, a code has been sent.' });
      return;
    }

    // Generate a 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = String(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.customer.update({
      where: { email: normalizedEmail },
      data: { resetToken: otp, resetTokenExpiry: expiry },
    });

    try {
      await sendOtpEmail(normalizedEmail, otp, 10);
    } catch (mailErr) {
      console.error('OTP email failed:', mailErr);
    }

    res.json({ success: true, message: 'If an account exists, a code has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.get('/api/customers/orders', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const customer = await prisma.customer.findUnique({ where: { id: userPayload.id } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          { customerId: null, email: customer.email },
        ],
      },
      include: { items: true, payments: true },
      orderBy: { date: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// --- AUTHENTICATION ---
app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required', success: false });
      return;
    }

    const user = await prisma.adminUser.findUnique({ where: { username: cleanText(username, 64) } });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials', success: false });
      return;
    }

    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
      isPasswordValid = await bcrypt.compare(String(password), user.password);
    } else {
      if (!isDevMode) {
        res.status(401).json({ error: 'Invalid credentials', success: false });
        return;
      }
      isPasswordValid = user.password === String(password);
      if (isPasswordValid) {
        const hashed = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
        await prisma.adminUser.update({ where: { id: user.id }, data: { password: hashed } });
      }
    }

    if (isPasswordValid) {
      const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, {
        expiresIn: '24h',
      });
      res.json({ token, success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials', success: false });
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', success: false });
  }
});

// ─── ENTERPRISE SEO: ROBOTS.TXT & SITEMAPS SUITE ────────────────────────────

app.get('/robots.txt', (_req, res) => {
  const baseUrl = publicSiteUrl();
  const robotsTxt = `User-agent: *
Allow: /
Allow: /images/
Allow: /uploads/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/
Disallow: /activate/
Disallow: /api/
Disallow: /*?*search=
Disallow: /*?*sort=
Disallow: /*?*category=

# AI & Search Agent Authorization (GEO / AEO)
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-products.xml
Sitemap: ${baseUrl}/sitemap-categories.xml
Sitemap: ${baseUrl}/sitemap-pages.xml
Sitemap: ${baseUrl}/sitemap-journal.xml
Sitemap: ${baseUrl}/sitemap-images.xml
`;
  res.header('Content-Type', 'text/plain');
  res.status(200).send(robotsTxt);
});

app.get('/sitemap.xml', (_req, res) => {
  const baseUrl = publicSiteUrl();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-categories.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-journal.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-images.xml</loc></sitemap>
</sitemapindex>`;
  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

app.get('/sitemap-pages.xml', (_req, res) => {
  const baseUrl = publicSiteUrl();
  const now = new Date().toISOString();
  const pages = ['', '/shop', '/about', '/story', '/lookbook', '/contact', '/faq', '/journal', '/terms-of-service', '/privacy-policy', '/shipping-policy', '/refund-policy'];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  pages.forEach((p) => {
    xml += `\n  <url>
    <loc>${baseUrl}${p}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p === '' || p === '/shop' ? 'daily' : 'weekly'}</changefreq>
    <priority>${p === '' ? '1.0' : p === '/shop' ? '0.9' : '0.7'}</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

app.get('/sitemap-products.xml', async (_req, res) => {
  try {
    const now = new Date().toISOString();
    const products = await prisma.product.findMany({
      where: { robotsIndex: true, name: { startsWith: 'VESTIGIA' } },
      select: { id: true, slug: true, canonicalUrl: true },
      orderBy: { id: 'asc' },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    products.forEach((p) => {
      xml += `\n  <url>
    <loc>${xmlEscape(productPublicUrl(p))}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    xml += `\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap products error:', error);
    res.status(500).send('Error generating product sitemap');
  }
});

app.get('/sitemap-categories.xml', async (_req, res) => {
  const baseUrl = publicSiteUrl();
  const dbProducts = await prisma.product.findMany({
    where: { robotsIndex: true, name: { startsWith: 'VESTIGIA' } },
    select: { category: true, productType: true },
  });
  const categorySlugs = new Set<string>();
  dbProducts.forEach((product) => {
    [product.category, product.productType].filter(Boolean).forEach((value) => {
      const slug = slugify(String(value));
      if (slug) categorySlugs.add(slug);
    });
  });
  const categories = Array.from(categorySlugs).sort();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  categories.forEach((c) => {
    xml += `\n  <url>
    <loc>${baseUrl}/collections/${c}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

app.get('/sitemap-journal.xml', async (_req, res) => {
  try {
    const baseUrl = publicSiteUrl();
    const now = new Date().toISOString();
    const articles = await prisma.journalArticle.findMany({ select: { id: true } });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    articles.forEach((a) => {
      xml += `\n  <url>
    <loc>${baseUrl}/journal/${a.id}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap journal error:', error);
    res.status(500).send('Error generating journal sitemap');
  }
});

app.get('/sitemap-images.xml', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { robotsIndex: true, name: { startsWith: 'VESTIGIA' } },
      select: { id: true, slug: true, canonicalUrl: true, name: true, image: true, images: true, imageTitle: true, alt: true },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    products.forEach((p) => {
      const allImages = [p.image, ...parseJson<string[]>(p.images, [])].filter(Boolean);
      const uniqueImgs = Array.from(new Set(allImages));

      xml += `\n  <url>
    <loc>${xmlEscape(productPublicUrl(p))}</loc>`;

      uniqueImgs.forEach((img) => {
        const fullImg = absolutePublicUrl(img);
        xml += `\n    <image:image>
      <image:loc>${xmlEscape(fullImg)}</image:loc>
      <image:title>${xmlEscape(p.imageTitle || p.alt || p.name)}</image:title>
    </image:image>`;
      });

      xml += `\n  </url>`;
    });

    xml += `\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send('Error generating image sitemap');
  }
});

// --- PRODUCTS ---
const googleShoppingFeedHandler = async (_req: express.Request, res: express.Response) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: { inventory: true, prices: true },
      where: { robotsIndex: true, name: { startsWith: 'VESTIGIA' } },
      orderBy: { id: 'asc' },
    });

    const baseUrl = publicSiteUrl();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Vestigia Product Feed</title>
    <link>${baseUrl}</link>
    <description>Google Shopping Feed for Vestigia refined apparel</description>
`;

    for (const product of dbProducts) {
      const pUrl = productPublicUrl(product);
      const imgUrl = absolutePublicUrl(product.productImage || product.modelImage || product.image);
      const galleryImages = parseJson<string[]>(product.images, [])
        .filter((image) => image && image !== product.image)
        .slice(0, 10)
        .map(absolutePublicUrl);

      const totalStock = product.inventory.reduce((sum, item) => sum + item.stock, 0);
      const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';
      const usdPrice = product.prices.find((price) => price.currency === 'USD' && price.isActive);
      const currency = usdPrice ? 'USD' : 'EUR';
      const priceMajor = usdPrice ? moneyFromMinor(usdPrice.priceMinor, 'USD') : product.price;
      const compareAtMajor = usdPrice?.compareAtMinor ? moneyFromMinor(usdPrice.compareAtMinor, 'USD') : product.compareAt;
      const hasSalePrice = !!compareAtMajor && compareAtMajor > priceMajor;
      const feedPrice = hasSalePrice ? compareAtMajor : priceMajor;

      const cleanDesc = xmlEscape(product.seoDescription || product.description);
      const cleanName = xmlEscape(product.seoTitle || product.name);
      const feedId = xmlEscape(product.sku || `VST-${String(product.id).padStart(4, '0')}`);

      xml += `    <item>
      <g:id>${feedId}</g:id>
      <title>${cleanName}</title>
      <description>${cleanDesc}</description>
      <link>${xmlEscape(pUrl)}</link>
      <g:image_link>${xmlEscape(imgUrl)}</g:image_link>
${galleryImages.map((image) => `      <g:additional_image_link>${xmlEscape(image)}</g:additional_image_link>`).join('\n')}
      <g:availability>${availability}</g:availability>
      <g:price>${feedPrice.toFixed(2)} ${currency}</g:price>
${hasSalePrice ? `      <g:sale_price>${priceMajor.toFixed(2)} ${currency}</g:sale_price>\n` : ''}      <g:brand>${xmlEscape(product.brand || 'Vestigia')}</g:brand>
      <g:condition>${xmlEscape(product.condition || 'new')}</g:condition>
      <g:google_product_category>${xmlEscape(product.googleProductCategory || 'Apparel & Accessories > Clothing')}</g:google_product_category>
      <g:product_type>${xmlEscape(product.productType || product.category)}</g:product_type>
${product.gtin ? `      <g:gtin>${xmlEscape(product.gtin)}</g:gtin>\n` : ''}${product.mpn ? `      <g:mpn>${xmlEscape(product.mpn)}</g:mpn>\n` : ''}${product.material ? `      <g:material>${xmlEscape(product.material)}</g:material>\n` : ''}${product.gender ? `      <g:gender>${xmlEscape(product.gender)}</g:gender>\n` : ''}${product.ageGroup ? `      <g:age_group>${xmlEscape(product.ageGroup)}</g:age_group>\n` : ''}      <g:identifier_exists>${product.gtin || product.mpn ? 'yes' : 'no'}</g:identifier_exists>
    </item>\n`;
    }

    xml += `  </channel>\n</rss>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to generate Google Shopping feed:', error);
    res.status(500).json({ error: 'Failed to generate product feed' });
  }
};

app.get('/api/feeds/google-shopping', googleShoppingFeedHandler);
app.get('/api/products/google-feed', googleShoppingFeedHandler);

app.get('/api/products', async (_req, res) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        reviews: true,
        inventory: true,
        prices: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json(
      dbProducts
        .map(serializeProduct)
        .filter((product) => String(product.name).startsWith('VESTIGIA')),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/upload', authenticateAdmin, adminWriteRateLimit, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    validateUploadedImageOrThrow(req.file);
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to upload file' });
  }
});

app.get('/api/products/resolve/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = String(req.params.idOrSlug || '').trim();
    const numericId = Number(idOrSlug);
    const dbProducts = await prisma.product.findMany({
      include: {
        reviews: true,
        inventory: true,
        prices: true,
      },
      orderBy: { id: 'asc' },
    });
    const match = dbProducts.find((product) => (
      (Number.isInteger(numericId) && product.id === numericId) ||
      product.slug === idOrSlug ||
      parseJson<string[]>(product.redirectFrom, []).includes(idOrSlug)
    ));

    if (!match) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const serialized = serializeProduct(match);
    res.json({
      product: serialized,
      canonicalPath: productPublicPath(match),
      shouldRedirect: idOrSlug !== match.slug,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve product' });
  }
});

app.post('/api/products', authenticateAdmin, adminWriteRateLimit, upload.single('imageFile'), async (req, res) => {
  try {
    validateUploadedImageOrThrow(req.file ?? undefined);
    const payload = getProductPayload(req.body, req.file ?? undefined);
    if (payload.images.length === 0 && payload.image) {
      payload.images = [payload.image];
    }
    const created = await prisma.$transaction(async tx => {
      const product = await tx.product.create({ data: mapProductInput(payload) });
      await syncPrices(tx, product.id, payload.prices, String((req as any).admin?.username || 'admin'), String(payload.priceChangeReason || 'Initial prices'));
      return product;
    });
    await syncInventory(created.id, parseInventoryField(req.body.inventory));



    const product = await prisma.product.findUnique({
      where: { id: created.id },
      include: { reviews: true, inventory: true, prices: true },
    });

    res.status(201).json(product ? serializeProduct(product) : null);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateAdmin, adminWriteRateLimit, upload.single('imageFile'), async (req, res) => {
  try {
    validateUploadedImageOrThrow(req.file ?? undefined);
    const productId = parseRequiredInt(req.params.id, 'productId');
    const payload = getProductPayload(req.body, req.file ?? undefined);
    if (payload.images.length === 0 && payload.image) {
      payload.images = [payload.image];
    }
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true, redirectFrom: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const nextSlug = payload.slug ? String(payload.slug) : (payload.name ? slugify(String(payload.name)) : null);
    const previousRedirects = existing.redirectFrom ? parseJson<string[]>(existing.redirectFrom, []) : [];
    if (existing.slug && nextSlug && existing.slug !== nextSlug && !previousRedirects.includes(existing.slug)) {
      payload.redirectFrom = [...previousRedirects, existing.slug];
    } else {
      payload.redirectFrom = previousRedirects;
    }
    const updated = await prisma.$transaction(async tx => {
      const product = await tx.product.update({ where: { id: productId }, data: mapProductInput(payload) });
      if (payload.prices) await syncPrices(tx, productId, payload.prices, String((req as any).admin?.username || 'admin'), String(payload.priceChangeReason || ''));
      return product;
    });

    await syncInventory(updated.id, parseInventoryField(req.body.inventory));



    const product = await prisma.product.findUnique({
      where: { id: updated.id },
      include: { reviews: true, inventory: true, prices: true },
    });

    res.json(product ? serializeProduct(product) : null);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const productId = parseRequiredInt(req.params.id, 'productId');

    // Clean up all related records in a transaction to prevent constraint violations
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { productId } }),
      prisma.inventory.deleteMany({ where: { productId } }),
      prisma.review.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.put('/api/products/:id/inventory', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const productId = parseRequiredInt(req.params.id, 'productId');
    const { color, size, stock } = req.body;
    const safeStock = Number(stock);
    if (!Number.isInteger(safeStock) || safeStock < 0 || safeStock > 100000) {
      return res.status(400).json({ error: 'Invalid stock quantity' });
    }

    const inventory = await prisma.inventory.upsert({
      where: {
        productId_color_size: {
          productId,
          color: cleanText(color, 80),
          size: cleanText(size, 40),
        },
      },
      update: { stock: safeStock },
      create: {
        productId,
        color: cleanText(color, 80),
        size: cleanText(size, 40),
        stock: safeStock,
      },
    });

    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// --- SETTINGS ---
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, ...DEFAULT_SETTINGS },
    });
    // Omit sensitive adminPassword from public store settings output
    const { adminPassword: _, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authenticateAdmin, async (req, res) => {
  try {
    const { id: _id, ...payload } = req.body ?? {};
    const settings = await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: {
        storeName: payload.storeName,
        tagline: payload.tagline,
        currency: payload.currency,
        announcementText: payload.announcementText,
        announcementEnabled: Boolean(payload.announcementEnabled),
        shippingThreshold: Number(payload.shippingThreshold),
        complimentaryShippingEnabled: Boolean(payload.complimentaryShippingEnabled),
        taxRate: Number(payload.taxRate),
        orderNotificationEmail: payload.orderNotificationEmail !== undefined ? (payload.orderNotificationEmail ? String(payload.orderNotificationEmail) : null) : undefined,
      },
      create: {
        id: 1,
        storeName: payload.storeName ?? DEFAULT_SETTINGS.storeName,
        tagline: payload.tagline ?? DEFAULT_SETTINGS.tagline,
        currency: payload.currency ?? DEFAULT_SETTINGS.currency,
        announcementText: payload.announcementText ?? DEFAULT_SETTINGS.announcementText,
        announcementEnabled: Boolean(payload.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled),
        shippingThreshold: Number(payload.shippingThreshold ?? DEFAULT_SETTINGS.shippingThreshold),
        complimentaryShippingEnabled: Boolean(payload.complimentaryShippingEnabled ?? DEFAULT_SETTINGS.complimentaryShippingEnabled),
        taxRate: Number(payload.taxRate ?? DEFAULT_SETTINGS.taxRate),
        orderNotificationEmail: payload.orderNotificationEmail ?? DEFAULT_SETTINGS.orderNotificationEmail,
        adminPassword: DEFAULT_SETTINGS.adminPassword,
      },
    });

    const { adminPassword: _, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- NEWSLETTER SUBSCRIBERS ---
const NEWSLETTER_CONSENT_VERSION = '2026-09';
const NEWSLETTER_STATUSES = ['PENDING', 'SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'BLOCKED'];

const newsletterPublicDto = (subscriber: any) => ({
  id: subscriber.id,
  email: subscriber.email,
  firstName: subscriber.firstName,
  status: subscriber.status,
  confirmedAt: subscriber.confirmedAt,
  unsubscribedAt: subscriber.unsubscribedAt,
  createdAt: subscriber.createdAt,
  updatedAt: subscriber.updatedAt,
  source: subscriber.source,
  consentTimestamp: subscriber.consentTimestamp,
  consentVersion: subscriber.consentVersion,
});

const newsletterConfirmUrl = (token: string) => `${publicSiteUrl()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
const newsletterUnsubscribeUrl = (token: string) => `${publicSiteUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

async function issueNewsletterConfirmation(subscriberId: number, email: string, db: any = prisma) {
  const token = randomToken(32);
  await db.newsletterSubscriber.update({
    where: { id: subscriberId },
    data: {
      confirmationTokenHash: tokenHash(token),
      confirmationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendNewsletterConfirmationEmail(email, newsletterConfirmUrl(token), 24);
  return token;
}

async function recordNewsletterConsent(
  req: express.Request | null,
  subscriberId: number,
  eventType: string,
  source?: string | null,
) {
  try {
    await prisma.newsletterConsentEvent.create({
      data: {
        subscriberId,
        eventType,
        source: source || null,
        consentVersion: NEWSLETTER_CONSENT_VERSION,
        ipAddress: req ? clientIp(req) : null,
        userAgent: req ? userAgent(req) : null,
      },
    });
  } catch (error) {
    console.error('Failed to record newsletter consent event:', error);
  }
}

app.post(['/api/newsletter', '/api/newsletter/subscribe'], formRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const firstName = req.body?.firstName ? cleanText(req.body.firstName, 80) : null;
    const source = cleanText(req.body?.source || 'footer', 80);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.status === 'BLOCKED') {
      return res.json({ success: true, message: 'We could not process this subscription request.' });
    }
    if (existing?.status === 'SUBSCRIBED') {
      return res.json({ success: true, status: 'SUBSCRIBED', message: "You're already part of the Vestigia Inner Circle." });
    }
    if (existing?.status === 'PENDING' && existing.confirmationTokenExpiresAt && existing.confirmationTokenExpiresAt > new Date()) {
      return res.json({ success: true, status: 'PENDING', message: 'Please check your email to confirm your subscription.' });
    }

    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          firstName: firstName ?? existing.firstName,
          status: 'PENDING',
          unsubscribedAt: null,
          source,
          consentTimestamp: new Date(),
          consentVersion: NEWSLETTER_CONSENT_VERSION,
        },
      })
      : await prisma.newsletterSubscriber.create({
        data: {
          email,
          firstName,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          source,
          consentTimestamp: new Date(),
          consentVersion: NEWSLETTER_CONSENT_VERSION,
        },
      });

    await recordNewsletterConsent(req, subscriber.id, existing?.status === 'UNSUBSCRIBED' ? 'RESUBSCRIBE_REQUESTED' : 'SUBSCRIBE_REQUESTED', source);
    issueNewsletterConfirmation(subscriber.id, subscriber.email).catch((mailError) => {
      console.error('Newsletter confirmation email failed:', mailError);
    });

    res.status(existing ? 200 : 201).json({
      success: true,
      status: 'PENDING',
      message: 'Please check your email to confirm your subscription.',
    });
  } catch (error) {
    console.error('Failed to subscribe to newsletter:', error);
    res.status(500).json({ success: false, message: 'We could not process your subscription. Please try again.' });
  }
});

const confirmNewsletterHandler = async (req: express.Request, res: express.Response) => {
  try {
    const token = String(req.query.token || req.body?.token || '');
    if (!token || token.length > 300) {
      return res.status(400).json({ success: false, message: 'Your confirmation link is invalid.' });
    }
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmationTokenHash: tokenHash(token) },
    });
    if (!subscriber) {
      return res.status(400).json({ success: false, message: 'Your confirmation link is invalid or has already been used.' });
    }
    if (subscriber.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'This subscription cannot be confirmed.' });
    }
    if (!subscriber.confirmationTokenExpiresAt || subscriber.confirmationTokenExpiresAt <= new Date()) {
      return res.status(400).json({ success: false, expired: true, email: subscriber.email, message: 'Your confirmation link has expired.' });
    }

    const unsubscribeToken = randomToken(32);
    const updated = await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'SUBSCRIBED',
        confirmedAt: new Date(),
        unsubscribedAt: null,
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
        unsubscribeTokenHash: tokenHash(unsubscribeToken),
      },
    });
    await recordNewsletterConsent(req, updated.id, 'CONFIRMED', updated.source);
    sendNewsletterWelcomeEmail(updated.email, newsletterUnsubscribeUrl(unsubscribeToken)).catch((mailError) => {
      console.error('Newsletter welcome email failed:', mailError);
    });
    res.json({ success: true, message: 'Welcome to the Vestigia Inner Circle.' });
  } catch (error) {
    console.error('Failed to confirm newsletter subscription:', error);
    res.status(500).json({ success: false, message: 'We could not confirm your subscription. Please try again.' });
  }
};

app.get('/api/newsletter/confirm', formRateLimit, confirmNewsletterHandler);
app.post('/api/newsletter/confirm', formRateLimit, confirmNewsletterHandler);

app.post('/api/newsletter/resend-confirmation', formRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.json({ success: true, message: 'If a pending subscription exists, we will send another confirmation email.' });
    }
    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (subscriber && subscriber.status === 'PENDING') {
      issueNewsletterConfirmation(subscriber.id, subscriber.email).catch((mailError) => {
        console.error('Newsletter resend confirmation failed:', mailError);
      });
      await recordNewsletterConsent(req, subscriber.id, 'CONFIRMATION_RESENT', subscriber.source);
    }
    res.json({ success: true, message: 'If a pending subscription exists, we will send another confirmation email.' });
  } catch (error) {
    console.error('Failed to resend newsletter confirmation:', error);
    res.status(500).json({ success: false, message: 'We could not send a confirmation email right now.' });
  }
});

const unsubscribeNewsletterHandler = async (req: express.Request, res: express.Response) => {
  try {
    const token = String(req.query.token || req.body?.token || '');
    if (!token || token.length > 300) {
      return res.status(400).json({ success: false, message: 'Your unsubscribe link is invalid.' });
    }
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeTokenHash: tokenHash(token) },
    });
    if (!subscriber) {
      return res.status(400).json({ success: false, message: 'Your unsubscribe link is invalid.' });
    }
    const updated = await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    await recordNewsletterConsent(req, updated.id, 'UNSUBSCRIBED', updated.source);
    res.json({ success: true, message: 'You have been unsubscribed from Vestigia emails.' });
  } catch (error) {
    console.error('Failed to unsubscribe newsletter subscriber:', error);
    res.status(500).json({ success: false, message: 'We could not unsubscribe this address right now.' });
  }
};

app.get('/api/newsletter/unsubscribe', unsubscribeNewsletterHandler);
app.post('/api/newsletter/unsubscribe', unsubscribeNewsletterHandler);

app.get('/api/newsletter', authenticateAdmin, async (req, res) => {
  try {
    const search = cleanText(req.query.search, 120);
    const status = String(req.query.status || 'ALL').toUpperCase();
    const where: any = {};
    if (search) where.email = { contains: search.toLowerCase() };
    if (NEWSLETTER_STATUSES.includes(status)) where.status = status;

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const grouped = await Promise.all(NEWSLETTER_STATUSES.map(async (s) => [s, await prisma.newsletterSubscriber.count({ where: { status: s } })]));
    const stats = Object.fromEntries(grouped);
    res.json({
      subscribers: subscribers.map(newsletterPublicDto),
      stats: {
        total: await prisma.newsletterSubscriber.count(),
        subscribed: stats.SUBSCRIBED || 0,
        pending: stats.PENDING || 0,
        unsubscribed: stats.UNSUBSCRIBED || 0,
        bounced: stats.BOUNCED || 0,
        blocked: stats.BLOCKED || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch newsletter subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter subscribers' });
  }
});

app.post('/api/newsletter/:id/action', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const action = String(req.body?.action || '').toUpperCase();
    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    let updated = subscriber;
    if (action === 'UNSUBSCRIBE') {
      updated = await prisma.newsletterSubscriber.update({ where: { id }, data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() } });
      await recordNewsletterConsent(req, id, 'ADMIN_UNSUBSCRIBED', subscriber.source);
    } else if (action === 'BLOCK') {
      updated = await prisma.newsletterSubscriber.update({ where: { id }, data: { status: 'BLOCKED' } });
      await recordNewsletterConsent(req, id, 'ADMIN_BLOCKED', subscriber.source);
    } else if (action === 'RESEND_CONFIRMATION') {
      if (subscriber.status === 'PENDING') {
        issueNewsletterConfirmation(subscriber.id, subscriber.email).catch((mailError) => {
          console.error('Admin newsletter confirmation resend failed:', mailError);
        });
        await recordNewsletterConsent(req, id, 'ADMIN_RESENT_CONFIRMATION', subscriber.source);
      }
    } else {
      return res.status(400).json({ error: 'Unsupported newsletter action.' });
    }
    res.json({ success: true, subscriber: newsletterPublicDto(updated) });
  } catch (error) {
    console.error('Failed to update newsletter subscriber:', error);
    res.status(500).json({ error: 'Failed to update subscriber' });
  }
});

app.delete('/api/newsletter/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid subscriber ID' });
    const updated = await prisma.newsletterSubscriber.update({
      where: { id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    await recordNewsletterConsent(req, id, 'ADMIN_UNSUBSCRIBED', updated.source);
    res.json({ success: true, subscriber: newsletterPublicDto(updated) });
  } catch (error) {
    console.error('Failed to unsubscribe newsletter subscriber:', error);
    res.status(500).json({ error: 'Failed to update subscriber' });
  }
});

app.get('/api/newsletter/export', authenticateAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'SUBSCRIBED').toUpperCase();
    const where = NEWSLETTER_STATUSES.includes(status) ? { status } : {};
    const subscribers = await prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' } });
    const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ID', 'Email', 'Status', 'Source', 'Created At', 'Confirmed At', 'Unsubscribed At', 'Consent Version'].map(csvEscape).join(','),
      ...subscribers.map((s) => [
        s.id,
        s.email,
        s.status,
        s.source,
        s.createdAt,
        s.confirmedAt?.toISOString?.() ?? '',
        s.unsubscribedAt?.toISOString?.() ?? '',
        s.consentVersion,
      ].map(csvEscape).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
    res.send(`${rows.join('\n')}\n`);
  } catch (error) {
    console.error('Failed to export subscribers:', error);
    res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

app.post('/api/newsletter/campaigns', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const subject = cleanText(req.body?.subject, 180);
    const content = cleanText(req.body?.content, 10000);
    if (!subject || !content) return res.status(400).json({ error: 'Subject and content are required.' });
    const campaign = await prisma.newsletterCampaign.create({
      data: {
        subject,
        previewText: req.body?.previewText ? cleanText(req.body.previewText, 240) : null,
        content,
        status: 'DRAFT',
        scheduledAt: req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null,
      },
    });
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Failed to create newsletter campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.get('/api/orders', authenticateAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, payments: true },
      orderBy: { date: 'desc' },
    });

    res.json(orders.map(serializeOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

app.post('/api/checkout/quote', checkoutRateLimit, async (req, res) => {
  try {
    const quote = await prisma.$transaction(tx => new PricingService(tx).createQuote(req.body ?? {}));
    res.json({
      checkoutId: quote.checkoutId, expiresAt: quote.expiresAt, priceChanged: quote.priceChanged,
      market: quote.market, priceListId: quote.priceListId, priceListVersion: quote.priceListVersion,
      currency: quote.currency,
      subtotalMinor: quote.subtotalMinor,
      discountMinor: quote.discountMinor,
      shippingMinor: quote.shippingMinor,
      taxMinor: quote.taxMinor,
      taxRateBps: quote.taxRateBps,
      totalMinor: quote.totalMinor,
      promoCode: quote.promo?.code ?? null,
      items: quote.pricedItems.map((item: any) => ({
        productId: item.product.id,
        productName: item.product.name,
        image: item.product.productImage || item.product.image,
        size: item.size,
        color: item.color,
        priceVersion: item.priceVersion, priceListId: item.priceListId,
        unitPriceMinor: item.unitPriceMinor,
        subtotalMinor: item.subtotalMinor,
        quantity: item.quantity,
        currency: quote.currency,
      })),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Unable to calculate checkout quote' });
  }
});

app.post('/api/checkout/payment-intent', checkoutRateLimit, async (req, res) => {
  try {
    const payload = req.body ?? {};
    const quote = await new PricingService(prisma).validateCheckout(payload, true);
    const checkoutEmail = normalizeEmail(payload.email);
    if (isValidEmail(checkoutEmail)) {
      const existingCustomer = await prisma.customer.findUnique({ where: { email: checkoutEmail } });
      if (existingCustomer && isRestrictedStatus(existingCustomer.accountStatus)) {
        await logSecurityEvent(req, 'RESTRICTED_CUSTOMER_CHECKOUT_ATTEMPT', { customerId: existingCustomer.id });
        return res.status(403).json({ error: 'Checkout is unavailable for this account.' });
      }
    }
    const risk = await assessCheckoutRisk(req, payload, quote);
    if (risk.riskLevel === 'BLOCKED') {
      await logSecurityEvent(req, 'FRAUD_CHECKOUT_BLOCKED', { metadata: { email: checkoutEmail, riskScore: risk.riskScore, reasons: risk.reasons } });
      return res.status(403).json({ error: 'We could not complete checkout. Please contact support.' });
    }

    if (!stripe) {
      if (!allowMockPayments) {
        return res.status(503).json({
          error: stripeConfigurationIssue || 'Stripe payments are not configured.',
        });
      }
      const mockId = quote.providerPaymentId || `pi_mock_${crypto.randomBytes(16).toString('hex')}`;
      await prisma.checkoutSnapshot.update({ where: { id: quote.checkoutId }, data: { providerPaymentId: mockId, state: 'PAYMENT_CREATED' } });
      return res.json({
        mockPaymentIntentId: mockId,
        amount: quote.totalMinor,
        currency: quote.currency,
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: quote.totalMinor,
      currency: quote.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        checkoutId: quote.checkoutId,
        checkoutHash: cartHash({
          items: quote.pricedItems.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          shippingMethodId: quote.shippingMethod.id,
          promoCode: quote.promo?.code ?? '',
          totalMinor: quote.totalMinor,
          currency: quote.currency,
        }),
      },
    }, { idempotencyKey: `checkout:${quote.checkoutId}` });

    await prisma.checkoutSnapshot.update({ where: { id: quote.checkoutId }, data: { providerPaymentId: intent.id, state: 'PAYMENT_CREATED' } });
    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: quote.totalMinor,
      currency: quote.currency,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Unable to initialize payment' });
  }
});

app.post('/api/orders', checkoutRateLimit, async (req, res) => {
  try {
    const payload = req.body ?? {};
    const preliminaryQuote = await new PricingService(prisma).validateCheckout(payload);
    const existingOrder = await prisma.order.findUnique({ where: { checkoutId: preliminaryQuote.checkoutId }, include: { items: true, payments: true } });
    if (existingOrder) return res.json(serializeOrder(existingOrder));
    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid customer email is required' });
      return;
    }
    const existingCustomerForCheckout = await prisma.customer.findUnique({ where: { email } });
    if (existingCustomerForCheckout && isRestrictedStatus(existingCustomerForCheckout.accountStatus)) {
      await logSecurityEvent(req, 'RESTRICTED_CUSTOMER_CHECKOUT_ATTEMPT', { customerId: existingCustomerForCheckout.id });
      res.status(403).json({ error: 'Checkout is unavailable for this account.' });
      return;
    }
    const risk = await assessCheckoutRisk(req, payload, preliminaryQuote);
    if (risk.riskLevel === 'BLOCKED') {
      await logSecurityEvent(req, 'FRAUD_CHECKOUT_BLOCKED', { customerId: existingCustomerForCheckout?.id, metadata: { email, riskScore: risk.riskScore, reasons: risk.reasons } });
      res.status(403).json({ error: 'We could not complete checkout. Please contact support.' });
      return;
    }
    const paymentIntentId = await verifyPaymentIntentForQuote(payload.stripePaymentIntentId, preliminaryQuote);

    const customerName = cleanText(payload.customer || 'Guest Customer', 120);
    const autoCreateAccount = payload.autoCreateAccount !== undefined ? Boolean(payload.autoCreateAccount) : true;
    const sameAsShipping = payload.sameAsShipping !== undefined ? Boolean(payload.sameAsShipping) : true;
    const giftOrder = Boolean(payload.giftOrder);
    const giftMessage = payload.giftMessage ? cleanText(payload.giftMessage, 500) : null;
    const companyName = payload.companyName ? cleanText(payload.companyName, 120) : null;
    const vatId = payload.vatId ? cleanText(payload.vatId, 64) : null;
    const orderDate = new Date().toISOString();
    const shippingForm = payload.shippingForm && typeof payload.shippingForm === 'object' ? payload.shippingForm : null;

    const { createdOrder, customerRecord, activationToken } = await prisma.$transaction(async (tx) => {
      const quote = await new PricingService(tx).validateCheckout(payload);
      const claimed = await tx.checkoutSnapshot.updateMany({ where: { id: quote.checkoutId, state: 'PAYMENT_CREATED' }, data: { state: 'ORDERED' } });
      if (claimed.count !== 1) throw new Error('Checkout already completed or payment not created');

      if (quote.totalMinor !== preliminaryQuote.totalMinor || quote.currency !== preliminaryQuote.currency) {
        throw new Error('Checkout total changed. Please review your bag and try again.');
      }

      for (const item of quote.pricedItems) {
        if (!item.inventoryControlled) continue;
        const updatedStock = await tx.inventory.updateMany({
          where: {
            productId: item.product.id,
            color: item.color,
            size: item.size,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (updatedStock.count !== 1) {
          throw new Error(`${item.product.name} is no longer available in the requested quantity`);
        }
      }

      if (quote.promo?.id) {
        const updatedPromo = await tx.promoCode.updateMany({
          where: {
            id: quote.promo.id,
            active: true,
            OR: [{ maxUses: null }, { uses: { lt: quote.promo.maxUses ?? 0 } }],
          },
          data: { uses: { increment: 1 } },
        });
        if (updatedPromo.count !== 1) {
          throw new Error('Promo code is no longer available');
        }
      }

      const generated = await generateOrderId(tx);
      const order = await tx.order.create({
        data: {
          id: generated.orderId,
          invoiceNumber: generated.invoiceNumber,
          customer: customerName,
          email,
          phone: payload.phone ? cleanText(payload.phone, 40) : null,
          date: orderDate,
          status: 'confirmed',
          paymentStatus: 'PAID', pricingVersion: 1, checkoutId: quote.checkoutId,
          market: quote.market, priceListId: quote.priceListId, priceListVersion: quote.priceListVersion,
          discountMinor: quote.discountMinor, taxRateBps: quote.taxRateBps,
          subtotal: moneyFromMinor(quote.subtotalMinor, quote.currency),
          shipping: moneyFromMinor(quote.shippingMinor, quote.currency),
          tax: moneyFromMinor(quote.taxMinor, quote.currency),
          total: moneyFromMinor(quote.totalMinor, quote.currency),
          currency: quote.currency,
          subtotalMinor: quote.subtotalMinor,
          shippingMinor: quote.shippingMinor,
          taxMinor: quote.taxMinor,
          totalMinor: quote.totalMinor,
          address: cleanText(payload.address, 500),
          billingAddress: payload.billingAddress ? cleanText(typeof payload.billingAddress === 'string' ? payload.billingAddress : JSON.stringify(payload.billingAddress), 1000) : null,
          sameAsShipping,
          giftOrder,
          giftMessage,
          companyName,
          vatId,
          shippingRegion: cleanText(quote.shippingCountry.region?.name, 120),
          shippingCountry: cleanText(quote.shippingCountry.countryName, 120),
          shippingMethod: cleanText(quote.shippingMethod.name, 120),
          shippingCost: moneyFromMinor(quote.shippingMinor, quote.currency),
          estimatedDelivery: quote.shippingMethod.estimatedDays ? cleanText(quote.shippingMethod.estimatedDays, 80) : null,
          stripePaymentIntentId: paymentIntentId,
          items: {
            create: quote.pricedItems.map((item: any) => ({
              productId: item.product.id,
              productName: cleanText(item.product.name, 180),
              image: cleanText(item.product.productImage || item.product.image, 500),
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              price: moneyFromMinor(item.unitPriceMinor, quote.currency),
              skuSnapshot: item.skuSnapshot, variantId: item.variantId, priceListId: item.priceListId, priceVersion: item.priceVersion,
              discountMinor: item.discountMinor, taxMinor: item.taxMinor, totalMinor: item.totalMinor,
            unitPriceMinor: item.unitPriceMinor,
              subtotalMinor: item.subtotalMinor,
              currency: quote.currency,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      const currentCustomer = await tx.customer.findUnique({
        where: { email },
        include: { savedAddresses: true },
      });

      let customerType = 'GUEST';
      let activationStatus = 'GUEST';
      if (currentCustomer) {
        customerType = currentCustomer.customerType;
        activationStatus = currentCustomer.activationStatus;
      } else if (autoCreateAccount) {
        customerType = 'AUTO_CREATED';
        activationStatus = 'PENDING';
      }

      const customer = await tx.customer.upsert({
        where: { email },
        update: {
          name: order.customer,
          firstName: shippingForm?.firstName ? cleanText(shippingForm.firstName, 80) : currentCustomer?.firstName,
          lastName: shippingForm?.lastName ? cleanText(shippingForm.lastName, 80) : currentCustomer?.lastName,
          phone: order.phone || currentCustomer?.phone || null,
          country: cleanText(quote.shippingCountry.countryName, 120) || currentCustomer?.country || null,
          orders: (currentCustomer?.orders ?? 0) + 1,
          // Legacy unlabelled customer totals are no longer accumulated.
          lastOrder: order.date,
          companyName: companyName || currentCustomer?.companyName || null,
          vatId: vatId || currentCustomer?.vatId || null,
        },
        create: {
          name: order.customer,
          firstName: shippingForm?.firstName ? cleanText(shippingForm.firstName, 80) : null,
          lastName: shippingForm?.lastName ? cleanText(shippingForm.lastName, 80) : null,
          email,
          phone: order.phone || null,
          country: cleanText(quote.shippingCountry.countryName, 120) || null,
          customerType,
          activationStatus,
          accountStatus: activationStatus === 'PENDING' ? 'REGISTERED_UNVERIFIED' : 'GUEST',
          orders: 1,
          totalSpend: 0,
          joined: order.date,
          lastOrder: order.date,
          companyName,
          vatId,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { customerId: customer.id },
      });

      await tx.payment.upsert({
        where: { providerPaymentId: paymentIntentId },
        update: {
          orderId: order.id,
          status: 'succeeded',
          amountMinor: quote.totalMinor,
          currency: quote.currency,
        },
        create: {
          orderId: order.id,
          provider: paymentIntentId.startsWith('pi_mock_') ? 'mock' : 'stripe',
          providerPaymentId: paymentIntentId,
          status: 'succeeded',
          amountMinor: quote.totalMinor,
          currency: quote.currency,
        },
      });

      await tx.fraudReview.create({
        data: {
          orderId: order.id,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          reasons: JSON.stringify(risk.reasons),
          status: risk.riskLevel === 'LOW' ? 'CLOSED' : 'OPEN',
        },
      });

      if (shippingForm) {
        const street = cleanText(shippingForm.address, 180);
        const city = cleanText(shippingForm.city, 120);
        const existingAddr = await tx.address.findFirst({
          where: {
            customerId: customer.id,
            address: street,
            city,
          },
        });

        await tx.address.updateMany({
          where: { customerId: customer.id },
          data: { isDefaultShipping: false },
        });

        if (!existingAddr) {
          await tx.address.create({
            data: {
              customerId: customer.id,
              label: 'Home',
              firstName: cleanText(shippingForm.firstName, 80),
              lastName: cleanText(shippingForm.lastName, 80),
              company: shippingForm.company ? cleanText(shippingForm.company, 120) : null,
              address: street,
              apartment: shippingForm.apartment ? cleanText(shippingForm.apartment, 80) : null,
              city,
              state: cleanText(shippingForm.state, 80),
              zip: cleanText(shippingForm.zip, 30),
              country: cleanText(shippingForm.country, 80),
              phone: shippingForm.phone ? cleanText(shippingForm.phone, 40) : null,
              phoneCountry: shippingForm.phoneCountry ? cleanText(shippingForm.phoneCountry, 8) : null,
              phoneDialCode: shippingForm.phoneDialCode ? cleanText(shippingForm.phoneDialCode, 8) : null,
              isDefaultShipping: true,
            },
          });
        } else {
          await tx.address.update({
            where: { id: existingAddr.id },
            data: {
              firstName: cleanText(shippingForm.firstName, 80),
              lastName: cleanText(shippingForm.lastName, 80),
              state: cleanText(shippingForm.state, 80),
              zip: cleanText(shippingForm.zip, 30),
              country: cleanText(shippingForm.country, 80),
              phone: shippingForm.phone ? cleanText(shippingForm.phone, 40) : existingAddr.phone,
              phoneCountry: shippingForm.phoneCountry ? cleanText(shippingForm.phoneCountry, 8) : existingAddr.phoneCountry,
              phoneDialCode: shippingForm.phoneDialCode ? cleanText(shippingForm.phoneDialCode, 8) : existingAddr.phoneDialCode,
              isDefaultShipping: true,
            },
          });
        }
      }

      let tokenString: string | null = null;
      if (autoCreateAccount && customer.activationStatus === 'PENDING') {
        tokenString = randomToken(32);
        await tx.activationToken.updateMany({
          where: { customerId: customer.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.activationToken.create({
          data: {
            customerId: customer.id,
            token: tokenHash(tokenString),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      return { createdOrder: order, customerRecord: customer, activationToken: tokenString };
    });

    if (activationToken) {
      sendWelcomeAccountEmail(customerRecord.email, customerRecord.name, activationToken, process.env.FRONTEND_URL || 'http://localhost:5173').catch((err) => {
        console.error('Welcome email dispatch failed:', err);
      });
    }

    // Send order confirmation email to Customer (non-blocking)
    sendOrderConfirmationEmail(createdOrder).catch((err) => {
      console.error('Order confirmation email failed:', err);
    });

    // Send order notification email to Store Owner (non-blocking)
    prisma.storeSettings.findUnique({ where: { id: 1 } }).then((st) => {
      const ownerEmail = st?.orderNotificationEmail || DEFAULT_SETTINGS.orderNotificationEmail;
      if (ownerEmail) {
        sendOwnerOrderNotificationEmail(createdOrder, ownerEmail).catch((err) => {
          console.error('Owner order notification email failed:', err);
        });
      }
    }).catch((err) => {
      console.error('Fetching store settings for owner email notification failed:', err);
    });

    res.status(201).json(serializeOrder(createdOrder));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(400).json({ error: message });
  }
});

app.post('/api/admin/test-order-notification', authenticateAdmin, async (req, res) => {
  try {
    const { targetEmail } = req.body ?? {};
    const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    const destination = targetEmail ? String(targetEmail).trim() : (settings?.orderNotificationEmail || DEFAULT_SETTINGS.orderNotificationEmail);

    if (!destination) {
      return res.status(400).json({ error: 'No target email address provided.' });
    }

    const dummyOrder = {
      id: `VST-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: 'Test Client', currency: 'EUR',
      email: 'client.test@thevestigia.com',
      date: new Date().toISOString(),
      status: 'pending',
      subtotal: 180,
      shipping: 0,
      tax: 21.6,
      total: 201.6,
      address: 'Via Montenapoleone 8, 20121 Milano MI, Italy',
      items: [
        {
          productName: 'VESTIGIA Aurelius Black Oversized Tee',
          size: 'L',
          color: 'Washed Black',
          quantity: 1,
          price: 180,
        },
      ],
    };

    await sendOwnerOrderNotificationEmail(dummyOrder, destination);
    res.json({ success: true, message: `Test order notification email sent to ${destination}` });
  } catch (error: any) {
    console.error('Test order notification email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send test notification email.' });
  }
});

app.put('/api/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const orderId = String(req.params.id);
    const { status } = req.body;
    const current = await prisma.order.findUnique({ where: { id: orderId } });
    if (!current) return res.status(404).json({ error: 'Order not found' });
    if (!['pending','confirmed','processing','quality_check','packed','ready_for_shipment','shipped','out_for_delivery','delivered','cancelled'].includes(status)) return res.status(400).json({ error: 'Use the refund action for refunds; otherwise choose a valid fulfillment status.' });
    if (status !== 'cancelled' && status !== 'pending' && current.paymentStatus !== 'PAID' && current.paymentStatus !== 'PARTIALLY_REFUNDED') return res.status(409).json({ error: 'Payment requires review. Fulfillment is blocked.' });
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: String(status) },
      include: { items: true, payments: true },
    });

    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET single order
app.get('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, payments: true },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT full order update (notes, address, etc.)
app.put('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const orderId = String(req.params.id);
    const payload = req.body ?? {};

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.trackingNumber !== undefined ? { trackingNumber: payload.trackingNumber } : {}),
        ...(payload.courier !== undefined ? { courier: payload.courier } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.shippingStatus !== undefined ? { shippingStatus: payload.shippingStatus } : {}),
      },
      include: { items: true, payments: true },
    });

    res.json(serializeOrder(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order
app.delete('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const orderId = String(req.params.id);
    return res.status(409).json({ error: 'Financial order records are immutable. Cancel the order instead.' });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// POST duplicate order
app.post('/api/orders/:id/duplicate', authenticateAdmin, async (req, res) => {
  try {
    const original = await prisma.order.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, payments: true },
    });
    if (!original) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const newId = `VST-${Date.now()}`;
    const duplicated = await prisma.order.create({
      data: {
        id: newId,
        invoiceNumber: `INV-${Date.now()}`,
        customer: `${original.customer} (Copy)`,
        email: original.email,
        phone: original.phone,
        date: new Date().toISOString().split('T')[0],
        status: 'pending', paymentStatus: 'UNPAID', pricingVersion: original.pricingVersion,
        currency: original.currency, market: original.market, priceListId: original.priceListId, priceListVersion: original.priceListVersion,
        subtotalMinor: original.subtotalMinor, shippingMinor: original.shippingMinor, taxMinor: original.taxMinor, discountMinor: original.discountMinor, totalMinor: original.totalMinor,
        subtotal: original.subtotal,
        shipping: original.shipping,
        tax: original.tax,
        total: original.total,
        address: original.address,
        notes: original.notes ? `Duplicated from ${original.id}. ${original.notes}` : `Duplicated from ${original.id}`,
        items: {
          create: original.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            image: item.image,
            size: item.size,
            color: item.color,
            price: item.price,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            subtotalMinor: item.subtotalMinor,
            currency: item.currency,
          })),
        },
      },
      include: { items: true, payments: true },
    });
    res.status(201).json(serializeOrder(duplicated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to duplicate order' });
  }
});

app.get('/api/customers', authenticateAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      select: {
        email: true,
        total: true,
        date: true,
      },
    });

    const statsByEmail = new Map<string, { orders: number; totalSpend: number; lastOrder: string }>();
    for (const order of orders) {
      const email = order.email.toLowerCase().trim();
      const current = statsByEmail.get(email);
      if (!current) {
        statsByEmail.set(email, {
          orders: 1,
          totalSpend: order.total,
          lastOrder: order.date,
        });
        continue;
      }

      current.orders += 1;
      current.totalSpend += order.total;
      if (new Date(order.date).getTime() > new Date(current.lastOrder).getTime()) {
        current.lastOrder = order.date;
      }
    }

    const customers = await prisma.customer.findMany({
      where: { email: { in: Array.from(statsByEmail.keys()) } },
    });

    const serialized = customers
      .map((customer) => {
        const stats = statsByEmail.get(customer.email.toLowerCase().trim());
        return {
          ...serializeCustomer(customer),
          orders: stats?.orders ?? 0,
          totalSpend: stats?.totalSpend ?? 0,
          lastOrder: stats?.lastOrder ?? customer.lastOrder ?? customer.joined,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    res.json(serialized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        savedAddresses: true,
        orderRecords: { include: { items: true, payments: true, fraudReviews: true }, orderBy: { date: 'desc' } },
        sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
        securityEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
        adminNotes: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({
      ...serializeCustomerProfile(customer),
      accountStatus: customer.accountStatus,
      statusReason: customer.statusReason,
      suspendedAt: customer.suspendedAt,
      bannedAt: customer.bannedAt,
      orders: customer.orderRecords,
      sessions: customer.sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        revokeReason: session.revokeReason,
        userAgent: session.userAgent,
      })),
      securityEvents: customer.securityEvents,
      adminNotes: customer.adminNotes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

app.post('/api/admin/customers/:id/status', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const action = String(req.body?.action || '').toUpperCase();
    const reason = req.body?.reason ? cleanText(req.body.reason, 500) : null;
    const admin = (req as any).admin;
    const data: any = { statusReason: reason };
    let eventType = '';

    if (action === 'SUSPEND') {
      data.accountStatus = 'SUSPENDED';
      data.suspendedAt = new Date();
      eventType = 'ADMIN_SUSPENDED_CUSTOMER';
    } else if (action === 'BAN') {
      data.accountStatus = 'BANNED';
      data.bannedAt = new Date();
      eventType = 'ADMIN_BANNED_CUSTOMER';
    } else if (action === 'REACTIVATE') {
      const customer = await prisma.customer.findUnique({ where: { id } });
      data.accountStatus = customer?.emailVerified ? 'REGISTERED_VERIFIED' : 'REGISTERED_UNVERIFIED';
      data.suspendedAt = null;
      data.bannedAt = null;
      eventType = 'ADMIN_REACTIVATED_CUSTOMER';
    } else {
      res.status(400).json({ error: 'Action must be SUSPEND, BAN, or REACTIVATE.' });
      return;
    }

    const updated = await prisma.customer.update({ where: { id }, data, include: { savedAddresses: true } });
    if (action === 'SUSPEND' || action === 'BAN') {
      await revokeCustomerSessions(id, action.toLowerCase());
    }
    await logSecurityEvent(req, eventType, { customerId: id, actorType: 'admin', actorId: String(admin?.id || admin?.username || 'admin'), metadata: { reason } });
    res.json(serializeCustomerProfile(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
});

app.post('/api/admin/customers/:id/force-logout', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await revokeCustomerSessions(id, 'admin_force_logout');
    await logSecurityEvent(req, 'ADMIN_FORCED_CUSTOMER_LOGOUT', { customerId: id, actorType: 'admin' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to force logout' });
  }
});

app.post('/api/admin/customers/:id/resend-verification', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (customer && !customer.emailVerified && !isRestrictedStatus(customer.accountStatus)) {
      await prisma.verificationToken.updateMany({ where: { customerId: id, usedAt: null }, data: { usedAt: new Date() } });
      const token = await createVerificationToken(id);
      sendCustomerVerificationEmail(customer, token).catch((mailError) => {
        console.error('Admin resend verification failed:', mailError);
      });
      await logSecurityEvent(req, 'ADMIN_RESENT_VERIFICATION_EMAIL', { customerId: id, actorType: 'admin' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

app.post('/api/admin/customers/:id/notes', authenticateAdmin, adminWriteRateLimit, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const note = cleanText(req.body?.note, 2000);
    if (!note) {
      res.status(400).json({ error: 'Note is required.' });
      return;
    }
    const admin = (req as any).admin;
    const created = await prisma.customerAdminNote.create({
      data: {
        customerId: id,
        note,
        createdBy: String(admin?.id || admin?.username || 'admin'),
      },
    });
    await logSecurityEvent(req, 'ADMIN_ADDED_CUSTOMER_NOTE', { customerId: id, actorType: 'admin' });
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add customer note' });
  }
});

app.get('/api/promos', async (_req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { id: 'asc' } });
    res.json(promos.map(serializePromoCode));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

app.post('/api/promos', authenticateAdmin, async (req, res) => {
  try {
    const promo = await prisma.promoCode.create({
      data: {
        code: String(req.body.code ?? '').toUpperCase(),
        discount: Number(req.body.discount ?? 0),
        type: String(req.body.type ?? 'percentage'),
        maxUses: req.body.maxUses === null || req.body.maxUses === undefined || req.body.maxUses === '' ? null : Number(req.body.maxUses),
        active: Boolean(req.body.active ?? true),
        expiry: req.body.expiry ? String(req.body.expiry) : null,
        uses: 0,
      },
    });

    res.status(201).json(serializePromoCode(promo));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

app.put('/api/promos/:id', authenticateAdmin, async (req, res) => {
  try {
    const promo = await prisma.promoCode.update({
      where: { id: Number(req.params.id) },
      data: {
        code: String(req.body.code ?? '').toUpperCase(),
        discount: Number(req.body.discount ?? 0),
        type: String(req.body.type ?? 'percentage'),
        maxUses: req.body.maxUses === null || req.body.maxUses === undefined || req.body.maxUses === '' ? null : Number(req.body.maxUses),
        active: Boolean(req.body.active ?? true),
        expiry: req.body.expiry ? String(req.body.expiry) : null,
      },
    });

    res.json(serializePromoCode(promo));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

app.delete('/api/promos/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

app.get('/api/journal', async (_req, res) => {
  try {
    const articles = await prisma.journalArticle.findMany({ orderBy: { date: 'desc' } });
    res.json(articles.map(serializeJournalArticle));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch journal articles' });
  }
});

app.post('/api/journal', authenticateAdmin, async (req, res) => {
  try {
    const article = await prisma.journalArticle.create({
      data: {
        title: String(req.body.title ?? ''),
        date: String(req.body.date ?? new Date().toISOString().split('T')[0]),
        readTime: String(req.body.readTime ?? '5 min read'),
        excerpt: String(req.body.excerpt ?? ''),
        content: JSON.stringify(parseJsonBody<string[]>(req.body.content, [])),
        image: String(req.body.image ?? ''),
      },
    });

    res.status(201).json(serializeJournalArticle(article));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create journal article' });
  }
});

app.put('/api/journal/:id', authenticateAdmin, async (req, res) => {
  try {
    const article = await prisma.journalArticle.update({
      where: { id: Number(req.params.id) },
      data: {
        title: String(req.body.title ?? ''),
        date: String(req.body.date ?? new Date().toISOString().split('T')[0]),
        readTime: String(req.body.readTime ?? '5 min read'),
        excerpt: String(req.body.excerpt ?? ''),
        content: JSON.stringify(parseJsonBody<string[]>(req.body.content, [])),
        image: String(req.body.image ?? ''),
      },
    });

    res.json(serializeJournalArticle(article));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update journal article' });
  }
});

app.delete('/api/journal/:id', authenticateAdmin, async (req, res) => {
  try {
    await prisma.journalArticle.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete journal article' });
  }
});

// ── SHIPPING MANAGEMENT SYSTEM API ENDPOINTS ────────────────

const logShippingAction = async (action: string, details: any) => {
  try {
    await prisma.shippingLog.create({
      data: {
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
      },
    });
  } catch (e) {
    console.error('Failed to record shipping log:', e);
  }
};

// 1. PUBLIC: GET /api/shipping/countries
app.get('/api/shipping/countries', async (_req, res) => {
  try {
    const countries = await prisma.shippingCountry.findMany({
      include: {
        region: {
          select: { id: true, name: true, isActive: true },
        },
      },
      orderBy: [{ isEnabled: 'desc' }, { displayOrder: 'asc' }, { countryName: 'asc' }],
    });
    res.json(countries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shipping countries' });
  }
});

// 2. PUBLIC: GET /api/shipping/regions
app.get('/api/shipping/regions', async (_req, res) => {
  try {
    const regions = await prisma.shippingRegion.findMany({
      where: { isActive: true },
      include: {
        countries: { where: { isEnabled: true } },
        methods: { where: { isActive: true } },
      },
    });
    res.json(regions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shipping regions' });
  }
});

// 3. PUBLIC: GET /api/shipping/methods/:country (Lookup by ISO code or Country Name)
app.get('/api/shipping/methods/:country', async (req, res) => {
  try {
    const param = decodeURIComponent(req.params.country).trim();

    const country = await prisma.shippingCountry.findFirst({
      where: {
        OR: [
          { countryCode: { equals: param.toUpperCase() } },
          { countryName: { equals: param } },
          { countryName: { contains: param } },
        ],
      },
      include: {
        region: {
          include: {
            methods: {
              where: { isActive: true },
              orderBy: { price: 'asc' },
            },
          },
        },
      },
    });

    const announcements = await prisma.shippingAnnouncement.findMany({
      where: {
        active: true,
        OR: [
          { countryCode: null },
          { countryCode: country?.countryCode ?? param.toUpperCase() },
        ],
      },
    });

    const isSuspended = announcements.some((a) => a.isSuspended);

    if (!country || !country.isEnabled || !country.region?.isActive || isSuspended) {
      res.json({
        isEnabled: false,
        countryName: country?.countryName ?? param,
        message: isSuspended
          ? (announcements.find((a) => a.isSuspended)?.message || 'Shipping is temporarily suspended for this destination.')
          : 'Sorry, we currently do not ship to your country.',
        announcements,
        methods: [],
      });
      return;
    }

    res.json({
      isEnabled: true,
      country: {
        id: country.id,
        countryCode: country.countryCode,
        countryName: country.countryName,
        currency: country.currency,
      },
      region: {
        id: country.region.id,
        name: country.region.name,
      },
      methods: await Promise.all(country.region.methods.map(async method => {
        const currency = requireCurrency(req.query.currency);
        const price = await prisma.shippingPrice.findUnique({ where: { shippingMethodId_currency: { shippingMethodId: method.id, currency } } });
        return price ? { ...method, currency, amountMinor: price.amountMinor, price: toMajor(price.amountMinor, currency), freeShippingThreshold: price.freeThresholdMinor == null ? null : toMajor(price.freeThresholdMinor, currency) } : null;
      })).then(rows => rows.filter(Boolean)),
      announcements,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shipping methods for country' });
  }
});

// 4. PUBLIC: GET /api/shipping/announcements
app.get('/api/shipping/announcements', async (_req, res) => {
  try {
    const list = await prisma.shippingAnnouncement.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping announcements' });
  }
});

// ── ADMIN SHIPPING MANAGEMENT ENDPOINTS ──
app.use('/api/admin', authenticateAdmin);

type BackupJobResponse = {
  id: number;
  backupId: string;
  type: string;
  status: string;
  stage: string;
  progress: number;
  createdBy: string | null;
  storage: string;
  sizeBytes: number;
  fileCount: number;
  encrypted: boolean;
  integrity: string;
  checksum: string | null;
  manifest: any;
  errorCode: string | null;
  errorMessage: string | null;
  restoreScope: string | null;
  restoreStatus: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  verifiedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
};

const BACKUP_TYPES = new Set(['DATABASE', 'MEDIA', 'FULL', 'CONFIGURATION']);
const RESTORE_SCOPES = new Set(['DATABASE', 'MEDIA', 'FULL']);

function getBackupEncryptionSecret() {
  const secret = String(process.env.BACKUP_ENCRYPTION_KEY || '').trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BACKUP_ENCRYPTION_KEY must be configured before creating or restoring encrypted backups.');
  }
  return `dev-backup-key:${JWT_SECRET}`;
}

function backupActor(req: express.Request) {
  const admin = (req as any).admin;
  return String(admin?.username || admin?.id || 'admin');
}

function safeBackupError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Backup operation failed';
  return message.replace(/sk_(test|live)_[A-Za-z0-9_]+/g, 'sk_***').slice(0, 500);
}

function parseBackupManifest(value: string | null | undefined) {
  if (!value) return null;
  return parseJson(value, null);
}

function formatBackupJob(job: any): BackupJobResponse {
  return {
    id: job.id,
    backupId: job.backupId,
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    createdBy: job.createdBy ?? null,
    storage: job.storage,
    sizeBytes: Number(job.sizeBytes ?? 0),
    fileCount: job.fileCount ?? 0,
    encrypted: Boolean(job.encrypted),
    integrity: job.integrity,
    checksum: job.checksum ?? null,
    manifest: parseBackupManifest(job.manifest),
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    restoreScope: job.restoreScope ?? null,
    restoreStatus: job.restoreStatus ?? null,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    verifiedAt: job.verifiedAt ?? null,
    deletedAt: job.deletedAt ?? null,
    createdAt: job.createdAt,
  };
}

function backupJobRestoreData(job: any, overrides: Record<string, unknown> = {}) {
  return {
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    createdBy: job.createdBy ?? null,
    storage: job.storage ?? 'LOCAL',
    archivePath: job.archivePath ?? null,
    sizeBytes: job.sizeBytes ?? BigInt(0),
    fileCount: job.fileCount ?? 0,
    encrypted: job.encrypted !== false,
    integrity: job.integrity ?? 'PENDING',
    checksum: job.checksum ?? null,
    manifest: job.manifest ?? null,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    restoreScope: job.restoreScope ?? null,
    restoreStatus: job.restoreStatus ?? null,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    verifiedAt: job.verifiedAt ?? null,
    deletedAt: job.deletedAt ?? null,
    expiresAt: job.expiresAt ?? null,
    createdAt: job.createdAt ?? new Date(),
    ...overrides,
  };
}

async function preserveBackupJobRecord(job: any, overrides: Record<string, unknown> = {}) {
  if (!job?.backupId) return;
  const data = backupJobRestoreData(job, overrides);
  await prisma.backupJob.upsert({
    where: { backupId: job.backupId },
    create: { backupId: job.backupId, ...data },
    update: data,
  });
}

async function getBackupSettings() {
  return prisma.backupSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storagePath: backupStorageDir,
      offsitePath: process.env.BACKUP_OFFSITE_PATH || null,
    },
  });
}

async function auditBackup(req: express.Request | null, eventType: string, metadata: Record<string, unknown>) {
  await logSecurityEvent(req, eventType, {
    actorType: 'admin',
    actorId: req ? backupActor(req) : 'system',
    metadata,
  });
}

async function applyBackupRetention() {
  const settings = await getBackupSettings();
  const maxToKeep = Math.max(1, settings.dailyRetention + settings.weeklyRetention + settings.monthlyRetention);
  const successful = await prisma.backupJob.findMany({
    where: { status: 'SUCCESS', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (successful.length <= maxToKeep) return;
  for (const job of successful.slice(maxToKeep)) {
    if (successful.length <= 1) break;
    try {
      if (job.archivePath && fs.existsSync(job.archivePath)) fs.rmSync(job.archivePath, { force: true });
      await prisma.backupJob.update({
        where: { id: job.id },
        data: { status: 'EXPIRED', deletedAt: new Date(), stage: 'Expired by retention policy' },
      });
      await logSecurityEvent(null, 'RETENTION_DELETED', {
        actorType: 'system',
        actorId: 'backup-retention',
        metadata: { backupId: job.backupId },
      });
    } catch (error) {
      console.error('Retention cleanup failed:', error);
    }
  }
}

async function runBackupJob(backupId: string) {
  const job = await prisma.backupJob.findUnique({ where: { backupId } });
  if (!job) return;
  try {
    await prisma.backupJob.update({
      where: { backupId },
      data: { status: 'RUNNING', stage: 'Preparing...', progress: 5, startedAt: new Date() },
    });
    const settings = await getBackupSettings();
    const storageDir = settings.storagePath ? path.resolve(settings.storagePath) : backupStorageDir;
    await prisma.backupJob.update({
      where: { backupId },
      data: { stage: 'Backing up database/media/configuration...', progress: 35 },
    });
    const result = await createBackupPackage({
      prisma,
      backupId,
      type: job.type as BackupType,
      createdBy: job.createdBy || 'admin',
      rootDir: process.cwd(),
      uploadDir,
      backupStorageDir: storageDir,
      encryptionSecret: getBackupEncryptionSecret(),
    });
    await prisma.backupJob.update({
      where: { backupId },
      data: {
        status: 'VERIFYING',
        stage: 'Verifying encrypted archive...',
        progress: 82,
        archivePath: result.archivePath,
        sizeBytes: BigInt(result.sizeBytes),
        fileCount: result.fileCount,
        checksum: result.archiveChecksum,
        manifest: JSON.stringify(result.manifest),
      },
    });
    await verifyBackupArchive(result.archivePath, getBackupEncryptionSecret());
    if (settings.offsiteEnabled && settings.offsitePath) {
      const offsiteDir = path.resolve(settings.offsitePath);
      fs.mkdirSync(offsiteDir, { recursive: true });
      fs.copyFileSync(result.archivePath, path.join(offsiteDir, path.basename(result.archivePath)));
    }
    await prisma.backupJob.update({
      where: { backupId },
      data: {
        status: 'SUCCESS',
        stage: 'Backup completed',
        progress: 100,
        integrity: 'VERIFIED',
        verifiedAt: new Date(),
        completedAt: new Date(),
      },
    });
    await logSecurityEvent(null, 'BACKUP_COMPLETED', {
      actorType: 'system',
      actorId: job.createdBy || 'admin',
      metadata: { backupId, type: job.type, sizeBytes: result.sizeBytes, storage: settings.storageProvider },
    });
    await applyBackupRetention();
  } catch (error) {
    await prisma.backupJob.update({
      where: { backupId },
      data: {
        status: 'FAILED',
        stage: 'Backup failed',
        progress: 100,
        integrity: 'FAILED',
        errorCode: 'BACKUP_FAILED',
        errorMessage: safeBackupError(error),
        completedAt: new Date(),
      },
    }).catch(() => undefined);
    await logSecurityEvent(null, 'BACKUP_FAILED', {
      actorType: 'system',
      actorId: job.createdBy || 'admin',
      metadata: { backupId, type: job.type, error: safeBackupError(error) },
    });
  }
}

async function backupHealth() {
  const settings = await getBackupSettings();
  const jobs = await prisma.backupJob.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const successes = jobs.filter((job) => job.status === 'SUCCESS');
  const latest = successes[0] ?? null;
  const latestVerified = successes.find((job) => job.integrity === 'VERIFIED') ?? null;
  const latestFull = successes.find((job) => job.type === 'FULL') ?? null;
  const latestDatabase = successes.find((job) => job.type === 'DATABASE' || job.type === 'FULL') ?? null;
  const latestMedia = successes.find((job) => job.type === 'MEDIA' || job.type === 'FULL') ?? null;
  const storageUsed = jobs.reduce((sum, job) => sum + Number(job.sizeBytes ?? 0), 0);
  const ageHours = latestVerified?.verifiedAt
    ? (Date.now() - new Date(latestVerified.verifiedAt).getTime()) / 36e5
    : Number.POSITIVE_INFINITY;
  const hasRecoverableBackup = Boolean(latestFull && latestDatabase && latestMedia);
  const healthStatus = !latestVerified || !hasRecoverableBackup
    ? 'CRITICAL'
    : ageHours > settings.targetRpoHours * 2
      ? 'CRITICAL'
      : ageHours > settings.targetRpoHours
        ? 'ATTENTION'
        : 'HEALTHY';
  return {
    healthStatus,
    targetRpoHours: settings.targetRpoHours,
    actualAgeHours: Number.isFinite(ageHours) ? Math.round(ageHours * 10) / 10 : null,
    lastSuccessfulBackup: latest?.completedAt ?? null,
    lastVerifiedBackup: latestVerified?.verifiedAt ?? null,
    latestFullBackup: latestFull?.completedAt ?? null,
    latestDatabaseBackup: latestDatabase?.completedAt ?? null,
    latestMediaBackup: latestMedia?.completedAt ?? null,
    backupCount: jobs.length,
    successfulBackupCount: successes.length,
    storageUsed,
    oldestBackup: jobs.length ? jobs[jobs.length - 1].createdAt : null,
    latestBackup: jobs[0]?.createdAt ?? null,
    automaticEnabled: settings.automaticEnabled,
    frequency: settings.frequency,
    nextScheduledBackup: settings.automaticEnabled ? 'Calculated by background scheduler' : null,
    maintenanceMode,
    maintenanceReason,
  };
}

async function validateRestoredApplication() {
  const [productsCount, ordersCount, customersCount, inventoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.inventory.count(),
  ]);
  const invalidInventory = await prisma.inventory.count({ where: { stock: { lt: 0 } } });
  return {
    databaseConnection: true,
    requiredTables: true,
    products: productsCount,
    orders: ordersCount,
    customers: customersCount,
    inventory: inventoryCount,
    inventoryValid: invalidInventory === 0,
    mediaAvailable: fs.existsSync(uploadDir),
    paymentConfigurationAvailable: Boolean(stripe) || allowMockPayments,
    emailConfigurationAvailable: Boolean(process.env.SMTP_HOST || process.env.SMTP_USER),
  };
}

app.get('/api/admin/backups', async (_req, res) => {
  try {
    const [jobs, settings, health] = await Promise.all([
      prisma.backupJob.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 100 }),
      getBackupSettings(),
      backupHealth(),
    ]);
    res.json({ health, settings, jobs: jobs.map(formatBackupJob) });
  } catch (error) {
    console.error('Backup history failed:', error);
    res.status(500).json({ error: 'Unable to load backup history' });
  }
});

app.put('/api/admin/backups/settings', adminWriteRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const data = {
      automaticEnabled: Boolean(body.automaticEnabled),
      frequency: ['HOURLY', 'DAILY', 'WEEKLY'].includes(String(body.frequency)) ? String(body.frequency) : 'DAILY',
      dailyRetention: Math.max(1, Math.min(365, Number(body.dailyRetention ?? 14))),
      weeklyRetention: Math.max(1, Math.min(104, Number(body.weeklyRetention ?? 8))),
      monthlyRetention: Math.max(1, Math.min(120, Number(body.monthlyRetention ?? 12))),
      storageProvider: ['LOCAL', 'S3_COMPATIBLE', 'MANAGED'].includes(String(body.storageProvider)) ? String(body.storageProvider) : 'LOCAL',
      storagePath: body.storagePath ? String(body.storagePath).trim() : backupStorageDir,
      offsiteEnabled: Boolean(body.offsiteEnabled),
      offsitePath: body.offsitePath ? String(body.offsitePath).trim() : null,
      encryptionEnabled: true,
      verifyAfterBackup: body.verifyAfterBackup !== false,
      targetRpoHours: Math.max(1, Math.min(168, Number(body.targetRpoHours ?? 24))),
      maintenanceModeOnRestore: body.maintenanceModeOnRestore !== false,
      preRestoreSafetyBackup: body.preRestoreSafetyBackup !== false,
      requireRestoreConfirmation: body.requireRestoreConfirmation !== false,
      notifyOnSuccess: Boolean(body.notifyOnSuccess),
      notifyOnFailure: body.notifyOnFailure !== false,
    };
    const settings = await prisma.backupSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await auditBackup(req, 'BACKUP_SETTINGS_CHANGED', { changed: Object.keys(data) });
    res.json(settings);
  } catch (error) {
    console.error('Backup settings update failed:', error);
    res.status(500).json({ error: 'Unable to update backup settings' });
  }
});

app.post('/api/admin/backups', adminWriteRateLimit, async (req, res) => {
  try {
    const type = String(req.body?.type || 'FULL').toUpperCase();
    if (!BACKUP_TYPES.has(type)) {
      res.status(400).json({ error: 'Invalid backup type' });
      return;
    }
    getBackupEncryptionSecret();
    const backupId = generateBackupId(type === 'FULL' ? 'BKP' : `BKP-${type.slice(0, 3)}`);
    const job = await prisma.backupJob.create({
      data: {
        backupId,
        type,
        status: 'QUEUED',
        stage: 'Queued',
        progress: 0,
        createdBy: backupActor(req),
        storage: 'LOCAL',
        encrypted: true,
      },
    });
    await auditBackup(req, 'BACKUP_CREATED', { backupId, type });
    setImmediate(() => void runBackupJob(backupId));
    res.status(202).json({ message: 'Backup started', job: formatBackupJob(job) });
  } catch (error) {
    console.error('Backup create failed:', error);
    res.status(500).json({ error: safeBackupError(error) });
  }
});

app.post('/api/admin/backups/:backupId/verify', adminWriteRateLimit, async (req, res) => {
  const backupIdParam = String(req.params.backupId);
  try {
    const job = await prisma.backupJob.findUnique({ where: { backupId: backupIdParam } });
    if (!job || !job.archivePath || job.deletedAt) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    const result = await verifyBackupArchive(job.archivePath, getBackupEncryptionSecret());
    const updated = await prisma.backupJob.update({
      where: { id: job.id },
      data: {
        integrity: 'VERIFIED',
        verifiedAt: new Date(),
        checksum: result.archiveChecksum,
        fileCount: result.fileCount,
        manifest: JSON.stringify(result.manifest),
      },
    });
    await auditBackup(req, 'BACKUP_VERIFIED', { backupId: job.backupId });
    res.json({ verified: true, job: formatBackupJob(updated) });
  } catch (error) {
    await prisma.backupJob.updateMany({
      where: { backupId: backupIdParam },
      data: { status: 'CORRUPTED', integrity: 'FAILED', errorMessage: safeBackupError(error) },
    });
    res.status(400).json({ error: 'Backup integrity verification failed. Restore has been cancelled.' });
  }
});

app.get('/api/admin/backups/:backupId/download', async (req, res) => {
  try {
    const backupIdParam = String(req.params.backupId);
    const job = await prisma.backupJob.findUnique({ where: { backupId: backupIdParam } });
    if (!job || !job.archivePath || job.deletedAt || job.status !== 'SUCCESS') {
      res.status(404).json({ error: 'Backup not available for download' });
      return;
    }
    await auditBackup(req, 'BACKUP_DOWNLOADED', { backupId: job.backupId });
    res.download(job.archivePath, `${job.backupId}.vbak`);
  } catch (error) {
    res.status(500).json({ error: 'Unable to download backup' });
  }
});

app.delete('/api/admin/backups/:backupId', adminWriteRateLimit, async (req, res) => {
  try {
    const backupIdParam = String(req.params.backupId);
    const job = await prisma.backupJob.findUnique({ where: { backupId: backupIdParam } });
    if (!job || job.deletedAt) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    const remaining = await prisma.backupJob.count({ where: { status: 'SUCCESS', deletedAt: null, backupId: { not: job.backupId } } });
    if (job.status === 'SUCCESS' && remaining < 1 && req.body?.emergencyOverride !== true) {
      res.status(400).json({ error: 'Cannot delete the only successful backup without emergency override.' });
      return;
    }
    if (job.archivePath && fs.existsSync(job.archivePath)) fs.rmSync(job.archivePath, { force: true });
    await prisma.backupJob.update({
      where: { id: job.id },
      data: { deletedAt: new Date(), status: 'EXPIRED', stage: 'Deleted by administrator' },
    });
    await auditBackup(req, 'BACKUP_DELETED', { backupId: job.backupId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete backup' });
  }
});

app.post('/api/admin/backups/:backupId/restore-test', adminWriteRateLimit, async (req, res) => {
  try {
    const backupIdParam = String(req.params.backupId);
    const job = await prisma.backupJob.findUnique({ where: { backupId: backupIdParam } });
    if (!job || !job.archivePath || job.deletedAt) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    const packageData = decryptArchive(job.archivePath, getBackupEncryptionSecret());
    verifyDecryptedPackage(packageData);
    await auditBackup(req, 'RESTORE_TEST_COMPLETED', { backupId: job.backupId, manifest: packageData.manifest });
    res.json({
      success: true,
      message: 'Backup can be decrypted, parsed, and verified in isolation.',
      manifest: packageData.manifest,
      fileCount: packageData.files.length,
    });
  } catch (error) {
    res.status(400).json({ error: 'Restore test failed: backup could not be verified safely.' });
  }
});

app.post('/api/admin/backups/:backupId/restore', adminWriteRateLimit, async (req, res) => {
  const settings = await getBackupSettings();
  const scope = String(req.body?.scope || 'FULL').toUpperCase();
  const backupIdParam = String(req.params.backupId);
  let restoreDir = '';
  try {
    if (!RESTORE_SCOPES.has(scope)) {
      res.status(400).json({ error: 'Invalid restore scope' });
      return;
    }
    if (settings.requireRestoreConfirmation && req.body?.confirmation !== 'RESTORE VESTIGIA') {
      res.status(400).json({ error: 'Type RESTORE VESTIGIA to confirm this high-risk restore.' });
      return;
    }
    const job = await prisma.backupJob.findUnique({ where: { backupId: backupIdParam } });
    if (!job || !job.archivePath || job.deletedAt || job.status !== 'SUCCESS') {
      res.status(404).json({ error: 'Restorable backup not found' });
      return;
    }

    const selectedJobSnapshot = { ...job };
    let safetyJobSnapshot: any = null;
    const verification = await verifyBackupArchive(job.archivePath, getBackupEncryptionSecret());
    if (settings.preRestoreSafetyBackup && req.body?.skipSafetyBackup !== true) {
      const safetyId = generateBackupId('PRE-RESTORE');
      await prisma.backupJob.create({
        data: {
          backupId: safetyId,
          type: 'FULL',
          status: 'QUEUED',
          stage: `Safety backup before restoring ${job.backupId}`,
          createdBy: backupActor(req),
          encrypted: true,
        },
      });
      await runBackupJob(safetyId);
      safetyJobSnapshot = await prisma.backupJob.findUnique({ where: { backupId: safetyId } });
    }

    await prisma.backupJob.update({
      where: { id: job.id },
      data: { restoreScope: scope, restoreStatus: 'RUNNING', stage: 'Restore running' },
    });
    if (settings.maintenanceModeOnRestore) {
      maintenanceMode = true;
      maintenanceReason = `Restoring ${job.backupId}`;
    }
    await auditBackup(req, 'RESTORE_STARTED', { backupId: job.backupId, scope, manifest: verification.manifest });

    restoreDir = path.join(backupStorageDir, '_restore', job.backupId);
    const manifest = materializeBackupPackage(job.archivePath, getBackupEncryptionSecret(), restoreDir);
    if ((scope === 'MEDIA' || scope === 'FULL') && manifest.includedMedia) {
      const restoredUploads = path.join(restoreDir, 'media', 'uploads');
      fs.rmSync(uploadDir, { recursive: true, force: true });
      fs.mkdirSync(uploadDir, { recursive: true });
      if (fs.existsSync(restoredUploads)) {
        const stack = [restoredUploads];
        while (stack.length) {
          const current = stack.pop()!;
          for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const source = path.join(current, entry.name);
            const relative = path.relative(restoredUploads, source).replace(/\\/g, '/');
            if (entry.isDirectory()) {
              stack.push(source);
            } else if (entry.isFile()) {
              const safe = relative.split('/').includes('..') ? null : relative;
              if (!safe) throw new Error('Unsafe media path in backup');
              const target = path.join(uploadDir, safe);
              fs.mkdirSync(path.dirname(target), { recursive: true });
              fs.copyFileSync(source, target);
            }
          }
        }
      }
    }

    if ((scope === 'DATABASE' || scope === 'FULL') && manifest.includedDatabase) {
      const dbPath = resolveSqliteDatabasePath(process.cwd());
      const snapshotPath = path.join(restoreDir, 'database', 'sqlite-snapshot.db');
      if (!dbPath || !fs.existsSync(snapshotPath)) {
        throw new Error('Database snapshot is not available for this backup.');
      }
      await prisma.$disconnect();
      for (const sidecar of [`${dbPath}-wal`, `${dbPath}-shm`]) {
        if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
      }
      fs.copyFileSync(snapshotPath, dbPath);
      for (const sidecar of [`${dbPath}-wal`, `${dbPath}-shm`]) {
        if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
      }
      await prisma.$connect();
      await preserveBackupJobRecord(selectedJobSnapshot, {
        restoreScope: scope,
        restoreStatus: 'RUNNING',
        stage: 'Restore running',
        integrity: 'VERIFIED',
      });
      if (safetyJobSnapshot) {
        await preserveBackupJobRecord(safetyJobSnapshot);
      }
    }

    const validation = await validateRestoredApplication();
    if (!validation.databaseConnection || !validation.inventoryValid) {
      throw new Error('Post-restore validation failed.');
    }

    await prisma.backupJob.updateMany({
      where: { backupId: job.backupId },
      data: { restoreStatus: 'COMPLETED', stage: 'Restore completed' },
    });
    await auditBackup(req, 'RESTORE_COMPLETED', { backupId: job.backupId, scope, validation });
    res.json({ success: true, manifest, validation });
  } catch (error) {
    await prisma.backupJob.updateMany({
      where: { backupId: backupIdParam },
      data: { restoreStatus: 'FAILED', errorMessage: safeBackupError(error) },
    }).catch(() => undefined);
    await auditBackup(req, 'RESTORE_FAILED', { backupId: backupIdParam, scope, error: safeBackupError(error) }).catch(() => undefined);
    res.status(500).json({ error: 'Restore failed. Current-state safety backup should be reviewed before retrying.' });
  } finally {
    maintenanceMode = false;
    maintenanceReason = '';
    if (restoreDir && path.resolve(restoreDir).startsWith(path.resolve(backupStorageDir, '_restore'))) {
      fs.rmSync(restoreDir, { recursive: true, force: true });
    }
  }
});

// GET /api/admin/shipping/stats
app.get('/api/admin/shipping/stats', async (_req, res) => {
  try {
    const totalCountries = await prisma.shippingCountry.count();
    const enabledCountries = await prisma.shippingCountry.count({ where: { isEnabled: true } });
    const disabledCountries = totalCountries - enabledCountries;
    const totalRegions = await prisma.shippingRegion.count();

    const methods = await prisma.shippingMethod.findMany({ where: { isActive: true } });
    const avgCost = methods.length > 0 ? (methods.reduce((acc, m) => acc + m.price, 0) / methods.length) : 0;

    const orders = await prisma.order.findMany({ select: { shippingMethod: true } });
    const methodCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.shippingMethod) {
        methodCounts[o.shippingMethod] = (methodCounts[o.shippingMethod] || 0) + 1;
      }
    });

    let mostUsedMethod = 'Express DHL';
    let maxCount = 0;
    Object.entries(methodCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedMethod = name;
      }
    });

    res.json({
      totalCountries,
      enabledCountries,
      disabledCountries,
      totalRegions,
      avgCost: Math.round(avgCost * 100) / 100,
      mostUsedMethod,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping stats' });
  }
});

// GET /api/admin/shipping/regions
app.get('/api/admin/shipping/regions', async (_req, res) => {
  try {
    const regions = await prisma.shippingRegion.findMany({
      include: {
        countries: { orderBy: { countryName: 'asc' } },
        methods: { orderBy: { price: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin regions' });
  }
});

// POST /api/admin/shipping/region
app.post(['/api/admin/shipping/region', '/api/admin/shipping/regions'], async (req, res) => {
  try {
    const { name, isActive } = req.body ?? {};
    if (!name) {
      res.status(400).json({ error: 'Region name is required' });
      return;
    }

    const region = await prisma.shippingRegion.create({
      data: {
        name: String(name).trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { countries: true, methods: true },
    });

    await logShippingAction('CREATE_REGION', `Created region ${region.name} (ID: ${region.id})`);
    res.status(201).json(region);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create region' });
  }
});

// PUT /api/admin/shipping/region/:id
app.put(['/api/admin/shipping/region/:id', '/api/admin/shipping/regions/:id'], async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, isActive } = req.body ?? {};

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.shippingRegion.update({
      where: { id },
      data: updateData,
      include: { countries: true, methods: true },
    });

    await logShippingAction('UPDATE_REGION', `Updated region ${updated.name} (ID: ${id})`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update region' });
  }
});

// DELETE /api/admin/shipping/region/:id
app.delete(['/api/admin/shipping/region/:id', '/api/admin/shipping/regions/:id'], async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await prisma.shippingRegion.delete({ where: { id } });
    await logShippingAction('DELETE_REGION', `Deleted region ${deleted.name} (ID: ${id})`);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete region' });
  }
});

// GET /api/admin/shipping/countries
app.get('/api/admin/shipping/countries', async (req, res) => {
  try {
    const { search, regionId, enabled } = req.query;

    const where: any = {};
    if (regionId) where.regionId = Number(regionId);
    if (enabled !== undefined) where.isEnabled = enabled === 'true';
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { countryName: { contains: q } },
        { countryCode: { contains: q.toUpperCase() } },
      ];
    }

    const countries = await prisma.shippingCountry.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: [{ regionId: 'asc' }, { isEnabled: 'desc' }, { countryName: 'asc' }],
    });

    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin countries' });
  }
});

// POST /api/admin/shipping/country
app.post(['/api/admin/shipping/country', '/api/admin/shipping/countries'], async (req, res) => {
  try {
    const { regionId, countryCode, countryName, isEnabled, currency, displayOrder, taxRateBps } = req.body ?? {};
    if (!regionId || !countryCode || !countryName) {
      res.status(400).json({ error: 'Region, Country Code and Country Name are required' });
      return;
    }

    const created = await prisma.shippingCountry.create({
      data: {
        regionId: Number(regionId),
        countryCode: String(countryCode).toUpperCase().trim(),
        countryName: String(countryName).trim(),
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        currency: currency ? String(currency).toUpperCase().trim() : 'USD',
        displayOrder: displayOrder ? Number(displayOrder) : 0,
        taxRateBps: taxRateBps === undefined ? 100 : normalizeCountryTaxRate(taxRateBps),
      },
      include: { region: true },
    });

    await logShippingAction('CREATE_COUNTRY', `Added country ${created.countryName} (${created.countryCode}) to ${created.region.name}`);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create country' });
  }
});

// PUT /api/admin/shipping/country/:id
app.put(['/api/admin/shipping/country/:id', '/api/admin/shipping/countries/:id'], async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { regionId, countryCode, countryName, isEnabled, currency, displayOrder, taxRateBps } = req.body ?? {};

    const updateData: any = {};
    if (regionId !== undefined) updateData.regionId = Number(regionId);
    if (countryCode !== undefined) updateData.countryCode = String(countryCode).toUpperCase().trim();
    if (countryName !== undefined) updateData.countryName = String(countryName).trim();
    if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);
    if (currency !== undefined) updateData.currency = String(currency).toUpperCase().trim();
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (taxRateBps !== undefined) updateData.taxRateBps = normalizeCountryTaxRate(taxRateBps);

    const updated = await prisma.shippingCountry.update({
      where: { id },
      data: updateData,
      include: { region: true },
    });

    await logShippingAction('UPDATE_COUNTRY', `Updated country ${updated.countryName} (Enabled: ${updated.isEnabled}, Tax: ${updated.taxRateBps == null ? "market default" : updated.taxRateBps / 100 + "%"})`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update country' });
  }
});

// PUT /api/admin/shipping/countries/bulk
app.put('/api/admin/shipping/countries/bulk', async (req, res) => {
  try {
    const { ids, isEnabled } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0 || isEnabled === undefined) {
      res.status(400).json({ error: 'Array of country IDs and isEnabled status are required' });
      return;
    }

    const numIds = ids.map((i) => Number(i));
    await prisma.shippingCountry.updateMany({
      where: { id: { in: numIds } },
      data: { isEnabled: Boolean(isEnabled) },
    });

    await logShippingAction('BULK_UPDATE_COUNTRIES', `Bulk set isEnabled=${isEnabled} for ${ids.length} countries`);
    res.json({ success: true, count: ids.length, isEnabled: Boolean(isEnabled) });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to bulk update countries' });
  }
});

// GET /api/admin/shipping/methods
app.get('/api/admin/shipping/methods', async (req, res) => {
  try {
    const { regionId } = req.query;
    const where: any = {};
    if (regionId) where.regionId = Number(regionId);

    const methods = await prisma.shippingMethod.findMany({
      where,
      include: { region: { select: { id: true, name: true } } },
      orderBy: [{ regionId: 'asc' }, { price: 'asc' }],
    });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin shipping methods' });
  }
});

// POST /api/admin/shipping/method
app.post(['/api/admin/shipping/method', '/api/admin/shipping/methods'], async (req, res) => {
  try {
    const { regionId, name, description, price, estimatedDays, freeShippingThreshold, isActive } = req.body ?? {};
    if (!regionId || !name || price === undefined || !estimatedDays) {
      res.status(400).json({ error: 'Region, Method Name, Price, and Estimated Days are required' });
      return;
    }

    const method = await prisma.shippingMethod.create({
      data: {
        regionId: Number(regionId),
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        price: Number(price),
        estimatedDays: String(estimatedDays).trim(),
        freeShippingThreshold: freeShippingThreshold !== null && freeShippingThreshold !== undefined && freeShippingThreshold !== '' ? Number(freeShippingThreshold) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { region: true },
    });

    await logShippingAction('CREATE_METHOD', `Added method "${method.name}" ($${method.price}) to region ${method.region.name}`);
    res.status(201).json(method);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create shipping method' });
  }
});

// PUT /api/admin/shipping/method/:id
app.put(['/api/admin/shipping/method/:id', '/api/admin/shipping/methods/:id'], async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { regionId, name, description, price, estimatedDays, freeShippingThreshold, isActive } = req.body ?? {};

    const updateData: any = {};
    if (regionId !== undefined) updateData.regionId = Number(regionId);
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (price !== undefined) updateData.price = Number(price);
    if (estimatedDays !== undefined) updateData.estimatedDays = String(estimatedDays).trim();
    if (freeShippingThreshold !== undefined) {
      updateData.freeShippingThreshold = (freeShippingThreshold !== null && freeShippingThreshold !== '') ? Number(freeShippingThreshold) : null;
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.shippingMethod.update({
      where: { id },
      data: updateData,
      include: { region: true },
    });

    await logShippingAction('UPDATE_METHOD', `Updated method "${updated.name}" ($${updated.price}) in ${updated.region.name}`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update shipping method' });
  }
});

// DELETE /api/admin/shipping/method/:id
app.delete(['/api/admin/shipping/method/:id', '/api/admin/shipping/methods/:id'], async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await prisma.shippingMethod.delete({ where: { id } });
    await logShippingAction('DELETE_METHOD', `Deleted shipping method "${deleted.name}" (ID: ${id})`);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete shipping method' });
  }
});

// GET & POST /api/admin/shipping/announcements
app.get('/api/admin/shipping/announcements', async (_req, res) => {
  try {
    const list = await prisma.shippingAnnouncement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/admin/shipping/announcements', async (req, res) => {
  try {
    const { countryCode, message, isSuspended, active } = req.body ?? {};
    if (!message) {
      res.status(400).json({ error: 'Announcement message is required' });
      return;
    }

    const created = await prisma.shippingAnnouncement.create({
      data: {
        countryCode: countryCode ? String(countryCode).toUpperCase().trim() : null,
        message: String(message).trim(),
        isSuspended: Boolean(isSuspended),
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    await logShippingAction('CREATE_ANNOUNCEMENT', `Added announcement: "${created.message}"`);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create announcement' });
  }
});

app.delete('/api/admin/shipping/announcements/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.shippingAnnouncement.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to delete announcement' });
  }
});

// GET /api/admin/shipping/export
app.get('/api/admin/shipping/export', async (_req, res) => {
  try {
    const regions = await prisma.shippingRegion.findMany({
      include: { countries: true, methods: true },
    });
    const announcements = await prisma.shippingAnnouncement.findMany();
    res.json({
      exportedAt: new Date().toISOString(),
      regions,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export shipping settings' });
  }
});

// POST /api/admin/shipping/import (CSV / JSON Import)
app.post('/api/admin/shipping/import', async (req, res) => {
  try {
    const { countries } = req.body ?? {};
    if (!Array.isArray(countries)) {
      res.status(400).json({ error: 'Array of countries data is required' });
      return;
    }

    let updatedCount = 0;
    for (const c of countries) {
      if (c.countryCode) {
        await prisma.shippingCountry.upsert({
          where: { countryCode: String(c.countryCode).toUpperCase() },
          update: {
            isEnabled: c.isEnabled !== undefined ? Boolean(c.isEnabled) : true,
            ...(c.taxRateBps !== undefined ? { taxRateBps: normalizeCountryTaxRate(c.taxRateBps) } : {}),
          },
          create: {
            regionId: Number(c.regionId || 1),
            countryCode: String(c.countryCode).toUpperCase(),
            countryName: String(c.countryName || c.countryCode),
            isEnabled: c.isEnabled !== undefined ? Boolean(c.isEnabled) : true,
            ...(c.taxRateBps !== undefined ? { taxRateBps: normalizeCountryTaxRate(c.taxRateBps) } : {}),
            currency: c.currency ? String(c.currency).toUpperCase() : 'USD',
          },
        });
        updatedCount++;
      }
    }

    await logShippingAction('IMPORT_COUNTRIES', `Imported/Updated ${updatedCount} shipping countries`);
    res.json({ success: true, count: updatedCount });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to import shipping data' });
  }
});

// GET /api/admin/shipping/logs
app.get('/api/admin/shipping/logs', async (_req, res) => {
  try {
    const logs = await prisma.shippingLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping logs' });
  }
});

async function maybeRunScheduledBackup() {
  try {
    const settings = await getBackupSettings();
    if (!settings.automaticEnabled) return;
    const running = await prisma.backupJob.count({
      where: { status: { in: ['QUEUED', 'RUNNING', 'VERIFYING'] }, deletedAt: null },
    });
    if (running > 0) return;
    const lastSuccess = await prisma.backupJob.findFirst({
      where: { status: 'SUCCESS', deletedAt: null, type: 'FULL' },
      orderBy: { completedAt: 'desc' },
    });
    const intervalHours = settings.frequency === 'HOURLY' ? 1 : settings.frequency === 'WEEKLY' ? 168 : 24;
    const lastTime = lastSuccess?.completedAt ? new Date(lastSuccess.completedAt).getTime() : 0;
    if (lastTime && Date.now() - lastTime < intervalHours * 60 * 60 * 1000) return;
    const backupId = generateBackupId('AUTO');
    await prisma.backupJob.create({
      data: {
        backupId,
        type: 'FULL',
        status: 'QUEUED',
        stage: 'Queued by automatic backup scheduler',
        createdBy: 'Automatic',
        encrypted: true,
      },
    });
    await logSecurityEvent(null, 'BACKUP_CREATED', {
      actorType: 'system',
      actorId: 'automatic-backup',
      metadata: { backupId, type: 'FULL', frequency: settings.frequency },
    });
    setImmediate(() => void runBackupJob(backupId));
  } catch (error) {
    console.error('Automatic backup scheduler failed:', error);
  }
}

installHomepageRoutes(app, prisma, authenticateAdmin, adminWriteRateLimit, serializeProduct);
installPricingRoutes(app, prisma, authenticateAdmin, stripe, allowMockPayments);

async function startServer() {
  await seedDatabase();
  await pricingAudit(prisma);
  await getBackupSettings();
  void maybeRunScheduledBackup();
  setInterval(() => void maybeRunScheduledBackup(), 15 * 60 * 1000);
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

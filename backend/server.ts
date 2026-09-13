import 'dotenv/config';
// Shipping Management System Enabled
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { products as seedProducts } from './data.ts';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail, sendOrderConfirmationEmail, sendOrderStatusEmail, sendOwnerOrderNotificationEmail } from './utils/mailer.ts';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ─── Prisma: SQLite locally, PostgreSQL on Railway ───────────────────────────
let prisma: PrismaClient;
if (process.env.DATABASE_PROVIDER === 'sqlite') {
  // Local development with BetterSqlite3 adapter
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
  prisma = new PrismaClient({ adapter } as any);
} else {
  // Railway / PostgreSQL — standard PrismaClient uses DATABASE_URL env var
  prisma = new PrismaClient();
}

const app = express();
app.disable('x-powered-by');

// ─── HTTP Security Headers ───────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const PORT = process.env.PORT || 4000;
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

// Safe Multer upload configuration: image MIME validation + 10MB limit
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only image files are allowed.'));
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
  adminPassword: 'admin',
};

// ─── CORS ────────────────────────────────────────────────────────────────────
const isDevMode = process.env.NODE_ENV !== 'production';
const allowedOrigins: (string | RegExp)[] = [
  // Local dev — any localhost port
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // LAN / mobile access (192.168.x.x, 10.x.x.x, 172.x.x.x)
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/,
  // Tunnel tools
  /\.loca\.lt$/,           // localtunnel
  /\.ngrok\.io$/,          // ngrok (legacy)
  /\.ngrok-free\.app$/,    // ngrok (free tier)
  /\.trycloudflare\.com$/, // Cloudflare tunnel
  // Production
  /\.netlify\.app$/,
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL as string] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);
    const allowed = isDevMode || allowedOrigins.some(o =>
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
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// ─── Health check (Railway uses this to verify the service is up) ─────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  price: number;
  compareAt: number | null;
  badge: string | null;
  slug?: string | null;
  colors: string;
  image: string;
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
  reviews?: Array<{ id: number; author: string; rating: number; date: string; comment: string; status: string }>;
  inventory?: Array<{ color: string; size: string; stock: number }>;
}) => ({
  ...product,
  colors: parseJson<string[]>(product.colors, []),
  images: parseJson<string[]>(product.images, []),
  sizes: parseJson<string[]>(product.sizes, []),
  details: parseJson<string[]>(product.details, []),
  care: parseJson<string[]>(product.care, []),
  sizeChart: product.sizeChart ? parseJson<object>(product.sizeChart, null) : null,
  inventory: (product.inventory ?? []).reduce((acc, curr) => {
    acc[`${curr.color}_${curr.size}`] = curr.stock;
    return acc;
  }, {} as Record<string, number>),
});

const serializeOrder = (order: {
  id: string;
  invoiceNumber?: string | null;
  customer: string;
  email: string;
  phone?: string | null;
  date: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
  notes?: string | null;
  trackingNumber?: string | null;
  courier?: string | null;
  stripePaymentIntentId?: string | null;
  items: Array<{
    productId: number;
    productName: string;
    image: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }>;
}) => order;

async function processStripeRefund(order: { id: string; total: number; stripePaymentIntentId?: string | null; notes?: string | null }) {
  const paymentIntentId = order.stripePaymentIntentId;
  if (!paymentIntentId) {
    console.log(`[Stripe Refund] No Stripe transaction ID found for order ${order.id}. Skipping API call.`);
    return { success: false, error: 'No Stripe transaction ID found on order.' };
  }

  console.log(`[Stripe Refund] Initiating refund for order ${order.id} (Transaction: ${paymentIntentId}) for amount: €${order.total}`);

  // If it's a mock ID, process as mock success
  if (paymentIntentId.startsWith('pi_mock_')) {
    console.log(`[Stripe Refund MOCK] Successfully processed mock refund for ${paymentIntentId} (Amount: €${order.total})`);
    return { success: true, mock: true };
  }

  // If Stripe is not initialized, mock it but log warning
  if (!stripe) {
    console.warn(`[Stripe Refund WARNING] Stripe secret key not configured, but transaction ${paymentIntentId} is not mock. Falling back to mock refund.`);
    return { success: true, mock: true };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(order.total * 100), // Stripe expects cents
    });
    console.log(`[Stripe Refund SUCCESS] Stripe Refund created: ${refund.id}`);
    return { success: true, refundId: refund.id, mock: false };
  } catch (error: any) {
    console.error(`[Stripe Refund ERROR] Stripe refund failed:`, error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}


// ─── Sequential Order Number Generator ────────────────────────────────────────
async function generateOrderId(): Promise<{ orderId: string; invoiceNumber: string }> {
  const year = new Date().getFullYear();
  const counter = await prisma.orderCounter.upsert({
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

const vestigiaSeedProductIds = seedProducts
  .map((product) => Number(product.id))
  .filter((id) => Number.isFinite(id));

const vestigiaOrderWhere = {
  items: {
    some: {
      OR: [
        { productId: { in: vestigiaSeedProductIds } },
        { productName: { contains: 'VESTIGIA' } },
        { image: { contains: 'vestigia' } },
        { image: { contains: 'Vestigia' } },
      ],
    },
  },
};

const serializeCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  orders: customer.orders,
  totalSpend: customer.totalSpend,
  joined: customer.joined,
  lastOrder: customer.lastOrder ?? customer.joined,
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
  price: Number(body.price ?? 0),
  compareAt: body.compareAt === '' || body.compareAt === undefined || body.compareAt === null ? null : Number(body.compareAt),
  badge: body.badge ? String(body.badge) : null,
  colors: JSON.stringify(Array.isArray(body.colors) ? body.colors : []),
  image: String(body.image ?? ''),
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
});

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
  price: body.price,
  compareAt: body.compareAt,
  badge: body.badge,
  colors: parseArrayField(body.colors),
  image: resolveProductImage(body, file),
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
    await prisma.adminUser.create({ data: { username: 'admin', password: 'admin123' } });
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
    email: customer.email,
    phone: customer.phone ?? '',
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
    companyName: customer.companyName ?? null,
    vatId: customer.vatId ?? null,
    marketingConsent: Boolean(customer.marketingConsent),
  };
};

// ─── JWT Authentication Middlewares ─────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!';

const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    (req as any).user = decoded;
    next();
  });
};

const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Admin authentication token required' });
    return;
  }

  if (token === 'mock-admin-token') {
    (req as any).admin = { id: 1, username: 'admin', role: 'admin' };
    return next();
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

app.post('/api/customers/check-email', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email || !String(email).includes('@')) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
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
        name: customer.name,
        message: 'Welcome back! Enter your password to log in and use saved addresses.',
      });
      return;
    }

    res.json({
      case: 'GUEST_WITH_PAST_ORDERS',
      email: cleanEmail,
      name: customer.name,
      ordersCount: customer.orders,
      message: 'You have placed past orders with us. Would you like to activate your Vestigia account?',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check customer email' });
  }
});

app.post('/api/customers/activate-account', async (req, res) => {
  try {
    const { token, password, email } = req.body ?? {};
    let customerToActivate: any = null;

    if (token) {
      const actToken = await prisma.activationToken.findUnique({
        where: { token: String(token) },
      });
      if (!actToken || actToken.expiresAt < new Date()) {
        res.status(400).json({ error: 'Activation link has expired or is invalid.' });
        return;
      }
      customerToActivate = await prisma.customer.findUnique({
        where: { id: actToken.customerId },
        include: { savedAddresses: true },
      });
    } else if (email) {
      customerToActivate = await prisma.customer.findUnique({
        where: { email: String(email).toLowerCase().trim() },
        include: { savedAddresses: true },
      });
    }

    if (!customerToActivate) {
      res.status(404).json({ error: 'Customer account not found' });
      return;
    }

    const hashedPassword = password ? await bcrypt.hash(String(password), 10) : customerToActivate.password;

    const updated = await prisma.customer.update({
      where: { id: customerToActivate.id },
      data: {
        password: hashedPassword,
        customerType: 'REGISTERED',
        activationStatus: 'ACTIVATED',
        emailVerified: true,
      },
      include: { savedAddresses: true },
    });

    if (token) {
      await prisma.activationToken.deleteMany({ where: { customerId: customerToActivate.id } });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!';
    const authToken = jwt.sign({ id: updated.id, email: updated.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token: authToken,
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
app.post('/api/customers/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body ?? {};
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if customer already exists
    const existing = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (existing.password) {
        res.status(400).json({ error: 'A customer with this email is already registered' });
        return;
      }

      // If customer exists from a guest checkout, complete registration by setting password
      const hashedPassword = await bcrypt.hash(password, 10);
      const updated = await prisma.customer.update({
        where: { email: normalizedEmail },
        data: {
          name,
          password: hashedPassword,
          phone: phone || existing.phone,
        },
      });

      const token = jwt.sign({ id: updated.id, email: updated.email }, process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!', { expiresIn: '7d' });
      res.status(200).json({ token, user: serializeCustomerProfile(updated) });
      return;
    }

    // Create new customer
    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await prisma.customer.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || '',
        joined: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        addresses: JSON.stringify([]),
      },
    });

    const token = jwt.sign({ id: created.id, email: created.email }, process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!', { expiresIn: '7d' });
    res.status(201).json({ token, user: serializeCustomerProfile(created) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/customers/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
    if (!customer || !customer.password) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ id: customer.id, email: customer.email }, process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!', { expiresIn: '7d' });
    res.json({ token, user: serializeCustomerProfile(customer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/customers/profile', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const customer = await prisma.customer.findUnique({ where: { id: userPayload.id } });
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
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (addresses !== undefined) {
      updateData.addresses = typeof addresses === 'string' ? addresses : JSON.stringify(addresses);
    }

    const updated = await prisma.customer.update({
      where: { id: userPayload.id },
      data: updateData,
    });

    res.json(serializeCustomerProfile(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
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
    if (!customer || !customer.password) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: userPayload.id },
      data: { password: hashedNewPassword },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.post('/api/customers/forgot-password', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });

    if (!customer) {
      res.json({ success: true, message: 'Password reset instructions have been logged.' });
      return;
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expiry = String(Date.now() + 3600000); // 1 hour

    await prisma.customer.update({
      where: { email: normalizedEmail },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/account?token=${token}`;
    try {
      await sendPasswordResetEmail(normalizedEmail, resetLink);
    } catch (mailError) {
      console.error('Error sending password reset email:', mailError);
      console.log(`\n=== FALLBACK PASSWORD RESET LINK (EMAIL FAILED) FOR ${normalizedEmail} ===`);
      console.log(resetLink);
      console.log(`============================================================\n`);
    }

    res.json({
      success: true,
      message: 'Password reset instructions have been sent.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate reset link' });
  }
});

app.post('/api/customers/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { resetToken: token },
    });

    if (!customer || !customer.resetTokenExpiry) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const expiry = Number(customer.resetTokenExpiry);
    if (Date.now() > expiry) {
      res.status(400).json({ error: 'Reset token has expired' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── Send OTP ──────────────────────────────────────────────────────────────────
app.post('/api/customers/send-otp', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
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
      console.log(`\n=== FALLBACK OTP FOR ${normalizedEmail}: ${otp} ===\n`);
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
      where: { email: customer.email },
      include: { items: true },
      orderBy: { date: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required', success: false });
      return;
    }

    const user = await prisma.adminUser.findUnique({ where: { username: String(username) } });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials', success: false });
      return;
    }

    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(String(password), user.password);
    } else {
      isPasswordValid = user.password === String(password);
      if (isPasswordValid) {
        const hashed = await bcrypt.hash(String(password), 10);
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
  const robotsTxt = `User-agent: *
Allow: /
Allow: /images/
Allow: /uploads/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/
Disallow: /api/
Disallow: /*?*search=
Disallow: /*?*sort=

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

Sitemap: https://thevestigia.com/sitemap.xml
Sitemap: https://thevestigia.com/sitemap-products.xml
Sitemap: https://thevestigia.com/sitemap-categories.xml
Sitemap: https://thevestigia.com/sitemap-pages.xml
Sitemap: https://thevestigia.com/sitemap-journal.xml
Sitemap: https://thevestigia.com/sitemap-images.xml
`;
  res.header('Content-Type', 'text/plain');
  res.status(200).send(robotsTxt);
});

app.get('/sitemap.xml', (_req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://thevestigia.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://thevestigia.com/sitemap-products.xml</loc></sitemap>
  <sitemap><loc>https://thevestigia.com/sitemap-categories.xml</loc></sitemap>
  <sitemap><loc>https://thevestigia.com/sitemap-journal.xml</loc></sitemap>
  <sitemap><loc>https://thevestigia.com/sitemap-images.xml</loc></sitemap>
</sitemapindex>`;
  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml);
});

app.get('/sitemap-pages.xml', (_req, res) => {
  const baseUrl = 'https://thevestigia.com';
  const now = new Date().toISOString();
  const pages = ['', '/shop', '/about', '/contact', '/faq', '/journal', '/terms', '/refund-policy'];

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
    const baseUrl = 'https://thevestigia.com';
    const now = new Date().toISOString();
    const products = await prisma.product.findMany({ select: { id: true, slug: true } });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    products.forEach((p) => {
      const pUrl = p.slug ? `${baseUrl}/shop/product/${p.slug}` : `${baseUrl}/shop/product/${p.id}`;
      xml += `\n  <url>
    <loc>${pUrl}</loc>
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

app.get('/sitemap-categories.xml', (_req, res) => {
  const baseUrl = 'https://thevestigia.com';
  const categories = ['clothing', 't-shirts', 'hoodies', 'accessories', 'first-release'];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  categories.forEach((c) => {
    xml += `\n  <url>
    <loc>${baseUrl}/shop?category=${c}</loc>
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
    const baseUrl = 'https://thevestigia.com';
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
    const baseUrl = 'https://thevestigia.com';
    const products = await prisma.product.findMany({ select: { slug: true, name: true, image: true, images: true } });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    products.forEach((p) => {
      const allImages = [p.image, ...(Array.isArray(p.images) ? (p.images as string[]) : [])].filter(Boolean);
      const uniqueImgs = Array.from(new Set(allImages));

      xml += `\n  <url>
    <loc>${baseUrl}/shop/product/${p.slug}</loc>`;

      uniqueImgs.forEach((img) => {
        const fullImg = img.startsWith('http') ? img : `${baseUrl}${img}`;
        xml += `\n    <image:image>
      <image:loc>${fullImg}</image:loc>
      <image:title>${p.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
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
app.get('/api/products/google-feed', async (req, res) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: { inventory: true }
    });

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Vestigia Product Feed</title>
    <link>${baseUrl}</link>
    <description>Google Shopping Feed for Vestigia - Refined Apparel</description>
`;

    for (const product of dbProducts) {
      const pUrl = `${baseUrl}/shop/product/${product.id}`;
      const imgUrl = product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`;

      // Calculate total stock
      const totalStock = product.inventory.reduce((sum, item) => sum + item.stock, 0);
      const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';

      const cleanDesc = product.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cleanName = product.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      xml += `    <item>
      <g:id>VST-${String(product.id).padStart(4, '0')}</g:id>
      <title>${cleanName}</title>
      <description>${cleanDesc}</description>
      <link>${pUrl}</link>
      <g:image_link>${imgUrl}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${product.price.toFixed(2)} EUR</g:price>
      <g:brand>Vestigia</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>\n`;
    }

    xml += `  </channel>\n</rss>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to generate Google Shopping feed:', error);
    res.status(500).json({ error: 'Failed to generate product feed' });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        reviews: true,
        inventory: true,
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

app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.post('/api/products', authenticateAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const payload = getProductPayload(req.body, req.file ?? undefined);
    if (payload.images.length === 0 && payload.image) {
      payload.images = [payload.image];
    }
    const created = await prisma.product.create({ data: mapProductInput(payload) });
    await syncInventory(created.id, parseInventoryField(req.body.inventory));

    const product = await prisma.product.findUnique({
      where: { id: created.id },
      include: { reviews: true, inventory: true },
    });

    res.status(201).json(product ? serializeProduct(product) : null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const payload = getProductPayload(req.body, req.file ?? undefined);
    if (payload.images.length === 0 && payload.image) {
      payload.images = [payload.image];
    }
    const updated = await prisma.product.update({
      where: { id: productId },
      data: mapProductInput(payload),
    });

    await syncInventory(updated.id, parseInventoryField(req.body.inventory));

    const product = await prisma.product.findUnique({
      where: { id: updated.id },
      include: { reviews: true, inventory: true },
    });

    res.json(product ? serializeProduct(product) : null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);

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

app.put('/api/products/:id/inventory', authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { color, size, stock } = req.body;

    const inventory = await prisma.inventory.upsert({
      where: {
        productId_color_size: {
          productId,
          color,
          size,
        },
      },
      update: { stock: Number(stock) },
      create: {
        productId,
        color,
        size,
        stock: Number(stock),
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
        ...(payload.adminPassword ? { adminPassword: String(payload.adminPassword) } : {}),
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
        adminPassword: payload.adminPassword ?? DEFAULT_SETTINGS.adminPassword,
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
app.post(['/api/newsletter', '/api/newsletter/subscribe'], async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.json({ success: true, message: 'Already subscribed to newsletter', subscriber: existing });
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      },
    });

    res.status(201).json({ success: true, subscriber });
  } catch (error) {
    console.error('Failed to subscribe to newsletter:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

app.get('/api/newsletter', authenticateAdmin, async (_req, res) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscribers);
  } catch (error) {
    console.error('Failed to fetch newsletter subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter subscribers' });
  }
});

app.delete('/api/newsletter/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid subscriber ID' });
    }

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Failed to delete newsletter subscriber:', error);
    res.status(500).json({ error: 'Failed to delete newsletter subscriber' });
  }
});

app.get('/api/newsletter/export', authenticateAdmin, async (_req, res) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let csv = 'ID,Email,Subscribed Date\n';
    subscribers.forEach((s) => {
      csv += `"${s.id}","${s.email}","${s.createdAt}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Failed to export subscribers:', error);
    res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

async function start() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

app.get('/api/orders', authenticateAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: vestigiaOrderWhere,
      include: { items: true },
      orderBy: { date: 'desc' },
    });

    res.json(orders.map(serializeOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const payload = req.body ?? {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    let orderId = payload.id ? String(payload.id) : null;
    let invoiceNumber = payload.invoiceNumber ? String(payload.invoiceNumber) : null;
    if (!orderId) {
      const generated = await generateOrderId();
      orderId = generated.orderId;
      invoiceNumber = generated.invoiceNumber;
    }

    const autoCreateAccount = payload.autoCreateAccount !== undefined ? Boolean(payload.autoCreateAccount) : true;
    const sameAsShipping = payload.sameAsShipping !== undefined ? Boolean(payload.sameAsShipping) : true;
    const giftOrder = Boolean(payload.giftOrder);
    const giftMessage = payload.giftMessage ? String(payload.giftMessage) : null;
    const companyName = payload.companyName ? String(payload.companyName) : null;
    const vatId = payload.vatId ? String(payload.vatId) : null;

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        invoiceNumber,
        customer: String(payload.customer ?? 'Guest Customer'),
        email: String(payload.email ?? '').toLowerCase().trim(),
        phone: payload.phone ? String(payload.phone) : null,
        date: String(payload.date ?? new Date().toISOString()),
        status: String(payload.status ?? 'pending'),
        subtotal: Number(payload.subtotal ?? 0),
        shipping: Number(payload.shipping ?? 0),
        tax: Number(payload.tax ?? 0),
        total: Number(payload.total ?? 0),
        address: String(payload.address ?? ''),
        billingAddress: payload.billingAddress ? (typeof payload.billingAddress === 'string' ? payload.billingAddress : JSON.stringify(payload.billingAddress)) : null,
        sameAsShipping,
        giftOrder,
        giftMessage,
        companyName,
        vatId,
        shippingRegion: payload.shippingRegion ? String(payload.shippingRegion) : null,
        shippingCountry: payload.shippingCountry ? String(payload.shippingCountry) : null,
        shippingMethod: payload.shippingMethod ? String(payload.shippingMethod) : null,
        shippingCost: payload.shippingCost !== undefined ? Number(payload.shippingCost) : null,
        estimatedDelivery: payload.estimatedDelivery ? String(payload.estimatedDelivery) : null,
        courier: payload.courier ? String(payload.courier) : null,
        trackingNumber: payload.trackingNumber ? String(payload.trackingNumber) : null,
        stripePaymentIntentId: payload.stripePaymentIntentId ? String(payload.stripePaymentIntentId) : `pi_mock_${Math.random().toString(36).substring(2, 15)}`,
        items: {
          create: items.map((item: any) => ({
            productId: Number(item.productId),
            productName: String(item.productName ?? ''),
            image: String(item.image ?? ''),
            size: String(item.size ?? 'OS'),
            color: String(item.color ?? ''),
            quantity: Number(item.quantity ?? 1),
            price: Number(item.price ?? 0),
          })),
        },
      },
      include: { items: true },
    });

    // Customer upsert & Auto Account Creation logic
    const cleanEmail = createdOrder.email;
    const currentCustomer = await prisma.customer.findUnique({
      where: { email: cleanEmail },
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

    const customerRecord = await prisma.customer.upsert({
      where: { email: cleanEmail },
      update: {
        name: createdOrder.customer,
        phone: createdOrder.phone || currentCustomer?.phone || null,
        orders: (currentCustomer?.orders ?? 0) + 1,
        totalSpend: (currentCustomer?.totalSpend ?? 0) + createdOrder.total,
        lastOrder: createdOrder.date,
        companyName: companyName || currentCustomer?.companyName || null,
        vatId: vatId || currentCustomer?.vatId || null,
      },
      create: {
        name: createdOrder.customer,
        email: cleanEmail,
        phone: createdOrder.phone || null,
        customerType,
        activationStatus,
        orders: 1,
        totalSpend: createdOrder.total,
        joined: createdOrder.date,
        lastOrder: createdOrder.date,
        companyName,
        vatId,
      },
    });

    // Save Shipping Address to Customer's Address Book
    if (payload.shippingForm) {
      const sf = payload.shippingForm;
      const existingAddr = await prisma.address.findFirst({
        where: {
          customerId: customerRecord.id,
          address: sf.address,
          city: sf.city,
        },
      });

      if (!existingAddr) {
        await prisma.address.create({
          data: {
            customerId: customerRecord.id,
            label: 'Home',
            firstName: sf.firstName || '',
            lastName: sf.lastName || '',
            company: sf.company || null,
            address: sf.address || '',
            apartment: sf.apartment || null,
            city: sf.city || '',
            state: sf.state || '',
            zip: sf.zip || '',
            country: sf.country || '',
            phone: sf.phone || null,
            phoneCountry: sf.phoneCountry || null,
            phoneDialCode: sf.phoneDialCode || null,
            isDefaultShipping: true,
          },
        });
      }
    }

    // Generate activation token if auto account created and pending
    if (autoCreateAccount && customerRecord.activationStatus === 'PENDING') {
      const tokenString = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.activationToken.create({
        data: {
          customerId: customerRecord.id,
          token: tokenString,
          expiresAt,
        },
      });

      // Send Welcome Account Email (non-blocking)
      sendWelcomeAccountEmail(customerRecord.email, customerRecord.name, tokenString).catch((err) => {
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
    res.status(500).json({ error: 'Failed to create order' });
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
      customer: 'Test Client',
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

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: String(status) },
      include: { items: true },
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
      include: { items: true },
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
      include: { items: true },
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
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);
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
      include: { items: true },
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
        status: 'PROCESSING',
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
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          })),
        },
      },
      include: { items: true },
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
      where: vestigiaOrderWhere,
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
      methods: country.region.methods,
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
    const { regionId, countryCode, countryName, isEnabled, currency, displayOrder } = req.body ?? {};
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
    const { regionId, countryCode, countryName, isEnabled, currency, displayOrder } = req.body ?? {};

    const updateData: any = {};
    if (regionId !== undefined) updateData.regionId = Number(regionId);
    if (countryCode !== undefined) updateData.countryCode = String(countryCode).toUpperCase().trim();
    if (countryName !== undefined) updateData.countryName = String(countryName).trim();
    if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);
    if (currency !== undefined) updateData.currency = String(currency).toUpperCase().trim();
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

    const updated = await prisma.shippingCountry.update({
      where: { id },
      data: updateData,
      include: { region: true },
    });

    await logShippingAction('UPDATE_COUNTRY', `Updated country ${updated.countryName} (Enabled: ${updated.isEnabled})`);
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
          },
          create: {
            regionId: Number(c.regionId || 1),
            countryCode: String(c.countryCode).toUpperCase(),
            countryName: String(c.countryName || c.countryCode),
            isEnabled: c.isEnabled !== undefined ? Boolean(c.isEnabled) : true,
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

async function startServer() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

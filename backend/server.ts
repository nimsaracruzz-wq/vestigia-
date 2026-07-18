import 'dotenv/config';
// Force reload to load updated Prisma client types
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import multer from 'multer';
import { products as seedProducts } from './data.ts';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail, sendOrderConfirmationEmail, sendOrderStatusEmail } from './utils/mailer.ts';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;


const app = express();
const adapter = new PrismaBetterSqlite3({ url: './dev.db' });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 4000;
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

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
  colors: string;
  image: string;
  images: string;
  alt: string;
  sizes: string;
  description: string;
  details: string;
  care: string;
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

const mapProductInput = (body: any) => ({
  name: String(body.name ?? ''),
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
  } else {
    for (const product of seedProducts) {
      const existingProduct = await prisma.product.findFirst({ where: { name: product.name } });

      if (existingProduct) {
        continue;
      }

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

  const journalCount = await prisma.journalArticle.count();
  if (journalCount === 0) {
    // Leave journal empty until real content is created in the admin panel.
  }
};

const serializeCustomerProfile = (customer: any) => {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? '',
    addresses: parseJson<any[]>(customer.addresses, []),
    orders: customer.orders,
    totalSpend: customer.totalSpend,
    joined: customer.joined,
    lastOrder: customer.lastOrder ?? customer.joined,
  };
};

const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'vestigia_jwt_secret_token_key_12345!', (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    (req as any).user = decoded;
    next();
  });
};

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
  const { username, password } = req.body;
  const user = await prisma.adminUser.findUnique({ where: { username } });

  if (user && user.password === password) {
    res.json({ token: 'admin_token_12345', success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials', success: false });
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
    </item>
`;
    }

    xml += `  </channel>
</rss>`;

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

app.post('/api/upload', upload.single('file'), (req, res) => {
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

app.post('/api/products', upload.single('imageFile'), async (req, res) => {
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

app.put('/api/products/:id', upload.single('imageFile'), async (req, res) => {
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

app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    await prisma.product.delete({ where: { id: productId } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.put('/api/products/:id/inventory', async (req, res) => {
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
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
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
        adminPassword: payload.adminPassword,
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
        adminPassword: payload.adminPassword ?? DEFAULT_SETTINGS.adminPassword,
      },
    });

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
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

app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { date: 'desc' },
    });

    res.json(orders.map(serializeOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const payload = req.body ?? {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    // Generate sequential order ID unless caller supplies one (legacy/test)
    let orderId = payload.id ? String(payload.id) : null;
    let invoiceNumber = payload.invoiceNumber ? String(payload.invoiceNumber) : null;
    if (!orderId) {
      const generated = await generateOrderId();
      orderId = generated.orderId;
      invoiceNumber = generated.invoiceNumber;
    }

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        invoiceNumber,
        customer: String(payload.customer ?? 'Guest Customer'),
        email: String(payload.email ?? ''),
        phone: payload.phone ? String(payload.phone) : null,
        date: String(payload.date ?? new Date().toISOString()),
        status: String(payload.status ?? 'pending'),
        subtotal: Number(payload.subtotal ?? 0),
        shipping: Number(payload.shipping ?? 0),
        tax: Number(payload.tax ?? 0),
        total: Number(payload.total ?? 0),
        address: String(payload.address ?? ''),
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

    const currentCustomer = await prisma.customer.findUnique({ where: { email: createdOrder.email } });
    await prisma.customer.upsert({
      where: { email: createdOrder.email },
      update: {
        name: createdOrder.customer,
        orders: (currentCustomer?.orders ?? 0) + 1,
        totalSpend: (currentCustomer?.totalSpend ?? 0) + createdOrder.total,
        lastOrder: createdOrder.date,
      },
      create: {
        name: createdOrder.customer,
        email: createdOrder.email,
        orders: 1,
        totalSpend: createdOrder.total,
        joined: createdOrder.date,
        lastOrder: createdOrder.date,
      },
    });

    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(createdOrder).catch((err) => {
      console.error('Order confirmation email failed:', err);
    });

    res.status(201).json(serializeOrder(createdOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const currentOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!currentOrder) { res.status(404).json({ error: 'Order not found' }); return; }

    const newStatus = String(req.body?.status ?? 'pending');
    let order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: newStatus },
      include: { items: true },
    });

    if (newStatus === 'refunded' && currentOrder.status !== 'refunded') {
      const refundResult = await processStripeRefund(order);
      const note = refundResult.success
        ? (refundResult.mock
            ? `[System] Automatically processed Stripe refund (Mock Mode).`
            : `[System] Automatically processed Stripe refund: ${refundResult.refundId}.`)
        : `[System ERROR] Automatic Stripe refund failed: ${refundResult.error}`;
      
      const updatedNotes = order.notes ? `${order.notes}\n${note}` : note;
      order = await prisma.order.update({
        where: { id: order.id },
        data: { notes: updatedNotes },
        include: { items: true },
      });
    }

    // Send status update email (non-blocking)
    if (order.email) {
      sendOrderStatusEmail(order).catch((err) => {
        console.error('Order status email failed:', err);
      });
    }

    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// GET single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT full order update (notes, address, etc.)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const currentOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!currentOrder) { res.status(404).json({ error: 'Order not found' }); return; }

    const body = req.body ?? {};
    let order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(body.status         !== undefined && { status: String(body.status) }),
        ...(body.notes          !== undefined && { notes: body.notes === null ? null : String(body.notes) }),
        ...(body.address        !== undefined && { address: String(body.address) }),
        ...(body.customer       !== undefined && { customer: String(body.customer) }),
        ...(body.email          !== undefined && { email: String(body.email) }),
        ...(body.phone          !== undefined && { phone: body.phone === null ? null : String(body.phone) }),
        ...(body.trackingNumber !== undefined && { trackingNumber: body.trackingNumber === null ? null : String(body.trackingNumber) }),
        ...(body.courier        !== undefined && { courier: body.courier === null ? null : String(body.courier) }),
      },
      include: { items: true },
    });

    if (body.status === 'refunded' && currentOrder.status !== 'refunded') {
      const refundResult = await processStripeRefund(order);
      const note = refundResult.success
        ? (refundResult.mock
            ? `[System] Automatically processed Stripe refund (Mock Mode).`
            : `[System] Automatically processed Stripe refund: ${refundResult.refundId}.`)
        : `[System ERROR] Automatic Stripe refund failed: ${refundResult.error}`;
      
      const updatedNotes = order.notes ? `${order.notes}\n${note}` : note;
      order = await prisma.order.update({
        where: { id: order.id },
        data: { notes: updatedNotes },
        include: { items: true },
      });
    }

    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// POST duplicate order
app.post('/api/orders/:id/duplicate', async (req, res) => {
  try {
    const original = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!original) { res.status(404).json({ error: 'Order not found' }); return; }

    const newId = `VST-DUP-${Date.now()}`;
    const { orderId: dupId, invoiceNumber: dupInv } = await generateOrderId();
    const duplicated = await prisma.order.create({
      data: {
        id: dupId,
        invoiceNumber: dupInv,
        customer: original.customer,
        email: original.email,
        phone: original.phone,
        date: new Date().toISOString(),
        status: 'pending',
        subtotal: original.subtotal,
        shipping: original.shipping,
        tax: original.tax,
        total: original.total,
        address: original.address,
        courier: original.courier,
        notes: `Duplicated from ${original.id}`,
        items: {
          create: original.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            image: item.image,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
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

app.get('/api/customers', async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { totalSpend: 'desc' } });
    res.json(customers.map(serializeCustomer));
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

app.post('/api/promos', async (req, res) => {
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

app.put('/api/promos/:id', async (req, res) => {
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

app.delete('/api/promos/:id', async (req, res) => {
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

app.post('/api/journal', async (req, res) => {
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

app.put('/api/journal/:id', async (req, res) => {
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

app.delete('/api/journal/:id', async (req, res) => {
  try {
    await prisma.journalArticle.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete journal article' });
  }
});
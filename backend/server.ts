import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import multer from 'multer';
import { products as seedProducts } from './data.ts';

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
  customer: string;
  email: string;
  date: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
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

const serializeCustomer = (customer: {
  id: number;
  name: string;
  email: string;
  orders: number;
  totalSpend: number;
  joined: string;
  lastOrder: string | null;
}) => ({
  ...customer,
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
    const orderId = String(payload.id ?? `VST-${Date.now()}`);
    const items = Array.isArray(payload.items) ? payload.items : [];

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        customer: String(payload.customer ?? 'Guest Customer'),
        email: String(payload.email ?? ''),
        date: String(payload.date ?? new Date().toISOString()),
        status: String(payload.status ?? 'pending'),
        subtotal: Number(payload.subtotal ?? 0),
        shipping: Number(payload.shipping ?? 0),
        tax: Number(payload.tax ?? 0),
        total: Number(payload.total ?? 0),
        address: String(payload.address ?? ''),
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

    res.status(201).json(serializeOrder(createdOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: String(req.body?.status ?? 'pending') },
      include: { items: true },
    });

    res.json(serializeOrder(order));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
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
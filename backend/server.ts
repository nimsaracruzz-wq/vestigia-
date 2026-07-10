import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const app = express();
const adapter = new PrismaBetterSqlite3({ url: './dev.db' });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.adminUser.findUnique({ where: { username } });
  
  // In production, use bcrypt!
  if (user && user.password === password) {
    // Return a dummy token for prototype purposes
    res.json({ token: 'admin_token_12345', success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials', success: false });
  }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        reviews: true,
        inventory: true,
      },
    });

    // Parse JSON strings back to arrays for the frontend
    const parsedProducts = dbProducts.map(p => ({
      ...p,
      colors: JSON.parse(p.colors),
      images: JSON.parse(p.images),
      sizes: JSON.parse(p.sizes),
      details: JSON.parse(p.details),
      care: JSON.parse(p.care),
      // Transform inventory array to Record<string, number> for frontend compat
      inventory: p.inventory.reduce((acc, curr) => {
        acc[`${curr.color}_${curr.size}`] = curr.stock;
        return acc;
      }, {} as Record<string, number>)
    }));

    res.json(parsedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.put('/api/products/:id/inventory', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { color, size, stock } = req.body;

    const inventory = await prisma.inventory.update({
      where: {
        productId_color_size: {
          productId,
          color,
          size,
        }
      },
      data: { stock }
    });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// --- SETTINGS ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

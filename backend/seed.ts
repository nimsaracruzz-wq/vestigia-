import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { products, journalArticles } from './data.ts';

const adapter = new PrismaBetterSqlite3({ url: './dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // 1. Seed Settings
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      storeName: 'Vestigia',
      tagline: 'Refined apparel for enduring style.',
      currency: 'EUR',
      announcementText: 'Complimentary shipping on orders over €150',
      announcementEnabled: true,
      shippingThreshold: 150,
      taxRate: 0.12,
      adminPassword: 'admin',
    },
  });

  // 2. Seed Admin User
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'admin123', // In a real app, hash this
    },
  });

  // 3. Seed Products
  for (const product of products) {
    const existingProduct = await prisma.product.findFirst({ where: { name: product.name } });

    if (existingProduct) {
      continue;
    }

    // Create product
    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        category: product.category,
        price: product.price,
        compareAt: product.compareAt ?? null,
        badge: product.badge ?? null,
        colors: JSON.stringify(product.colors),
        image: product.image,
        images: JSON.stringify(product.images),
        alt: product.alt,
        sizes: JSON.stringify(product.sizes),
        description: product.description,
        details: JSON.stringify(product.details),
        care: JSON.stringify(product.care),
        rating: product.rating,
      },
    });

    // Seed inventory for this product
    for (const color of product.colors) {
      for (const size of product.sizes) {
        let stock = 10;
        if (product.inventory && product.inventory[`${color}_${size}`] !== undefined) {
          stock = product.inventory[`${color}_${size}`];
        }
        await prisma.inventory.create({
          data: {
            productId: createdProduct.id,
            color,
            size,
            stock,
          },
        });
      }
    }

    // Seed reviews for this product
    if (product.reviews) {
      for (const review of product.reviews) {
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

  // 4. Seed Journal Articles
  for (const article of journalArticles) {
    await prisma.journalArticle.create({
      data: {
        title: article.title,
        date: article.date,
        readTime: article.readTime,
        excerpt: article.excerpt,
        content: JSON.stringify(article.content),
        image: article.image,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    throw e;
  });

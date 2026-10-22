import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createRateLimiter, PublicError } from './requestSafety.js';

const allowedQuery = /^[\p{L}\p{N}][\p{L}\p{N} -]{1,39}$/u;
const normalize = (value: unknown) => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase().slice(0, 40);

export function installProductSearchRoutes(app: Express, db: PrismaClient) {
  const limit = createRateLimiter({ windowMs: 60000, max: 30, keyPrefix: 'product-search' });
  app.get('/api/search/popular', async (_req, res, next) => {
    try {
      const now = Date.now();
      const since = new Date(now - 30 * 86400000);
      await db.productSearchQuery.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * 86400000) } } });
      const rows = await db.productSearchQuery.groupBy({
        by: ['query'], where: { createdAt: { gte: since } },
        _count: { query: true }, orderBy: { _count: { query: 'desc' } }, take: 8,
      });
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
        .json(rows.map(row => ({ query: row.query, searches: row._count.query })));
    } catch (error) { next(error); }
  });

  app.post('/api/search/query', limit, async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      const origin = req.get('origin');
      const allowedOrigins = [process.env.PUBLIC_SITE_URL, process.env.FRONTEND_URL, ...(process.env.FRONTEND_URLS || '').split(',')].filter(Boolean);
      let sameHost = false;
      try { sameHost = !!origin && new URL(origin).host === req.get('host'); } catch { /* Invalid origin. */ }
      if (!origin || (!sameHost && !allowedOrigins.some(value => { try { return new URL(value!).origin === origin; } catch { return false; } }))) {
        throw new PublicError(403, 'SEARCH_ORIGIN', 'Search activity must come from the storefront.');
      }
      if (req.body?.consent !== true || req.get('dnt') === '1' || req.get('sec-gpc') === '1' || /bot|crawler|spider|headless|lighthouse|uptime|preview/i.test(req.get('user-agent') || '')) {
        res.sendStatus(204); return;
      }
      const query = normalize(req.body?.query);
      if (!allowedQuery.test(query) || query.split(' ').length > 5 || /\d{7,}/.test(query) || query.includes('@')) {
        throw new PublicError(400, 'SEARCH_QUERY_INVALID', 'Enter a valid product search.');
      }
      const products = await db.product.findMany({ where: { published: true, robotsIndex: true }, select: { name: true, category: true, description: true } });
      const hasCatalogMatch = products.some(product => [product.name, product.category, product.description].some(value => value.toLocaleLowerCase().includes(query)));
      if (!hasCatalogMatch) { res.sendStatus(204); return; }
      await db.productSearchQuery.create({ data: { query } });
      const cutoff = new Date(Date.now() - 90 * 86400000);
      void db.productSearchQuery.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
      res.sendStatus(204);
    } catch (error) { next(error); }
  });
}

import type { Express, RequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { ACTIVE_WINDOW_SECONDS, TRAFFIC_RETENTION_DAYS, trafficPath } from '../../shared/siteTraffic.js';
import { createRateLimiter, PublicError } from './requestSafety.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dayMs = 86400000;
const bot = /bot|crawler|spider|headless|lighthouse|uptime|preview/i;
const host = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.hostname.slice(0, 253) : '';
  } catch { return ''; }
};

export function installSiteTraffic(app: Express, db: PrismaClient, authenticateAdmin: RequestHandler) {
  let lastCleanup = 0;
  const limit = createRateLimiter({ windowMs: 60000, max: 180, keyPrefix: 'site-traffic' });
  app.post('/api/traffic/event', limit, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const origin = req.get('origin');
      const allowed = [process.env.PUBLIC_SITE_URL, process.env.FRONTEND_URL, ...(process.env.FRONTEND_URLS || '').split(',')].filter(Boolean);
      let sameHost = false;
      try { sameHost = !!origin && new URL(origin).host === req.get('host'); } catch { /* Invalid origin. */ }
      if (!origin || (!sameHost && !allowed.some(url => {
        try { return new URL(url!).origin === origin; } catch { return false; }
      }))) throw new PublicError(403, 'TRAFFIC_ORIGIN', 'Traffic events must come from the storefront.');
      if (req.body?.consent !== true || req.get('dnt') === '1' || req.get('sec-gpc') === '1' || bot.test(req.get('user-agent') || '')) {
        res.sendStatus(204); return;
      }
      const { sessionId, visitorId, eventId, type, device } = req.body || {};
      const path = trafficPath(req.body?.path);
      if (!uuid.test(sessionId || '') || !uuid.test(visitorId || '') || !path || !['pageview', 'heartbeat'].includes(type)) {
        throw new PublicError(400, 'TRAFFIC_INVALID', 'Invalid traffic event.');
      }
      const now = new Date();
      if (type === 'heartbeat') {
        // A heartbeat cannot invent a visit, move a session to another page, or change its owner.
        await db.trafficSession.updateMany({ where: { id: sessionId, visitorId, path }, data: { lastSeen: now } });
      } else {
        if (!uuid.test(eventId || '') || !['mobile', 'tablet', 'desktop'].includes(device)) throw new PublicError(400, 'TRAFFIC_INVALID', 'Invalid page view.');
        const referrerHost = host(req.body?.referrer);
        const referrer = referrerHost === new URL(origin).hostname ? '' : referrerHost;
        try {
          await db.$transaction(async tx => {
            const existing = await tx.trafficSession.findUnique({ where: { id: sessionId } });
            if (existing && existing.visitorId !== visitorId) throw new PublicError(409, 'TRAFFIC_SESSION', 'Session does not match.');
            await tx.trafficPageView.create({ data: { id: eventId, sessionId, visitorId, path, device, referrer, createdAt: now } });
            await tx.trafficSession.upsert({ where: { id: sessionId },
              create: { id: sessionId, visitorId, path, device, referrer, startedAt: now, lastSeen: now },
              update: { lastSeen: now, path, device },
            });
          });
        } catch (error: any) { if (error.code !== 'P2002') throw error; }
      }
      if (now.getTime() - lastCleanup > 3600000) {
        const cutoff = new Date(now.getTime() - TRAFFIC_RETENTION_DAYS * dayMs);
        await db.$transaction([db.trafficPageView.deleteMany({ where: { createdAt: { lt: cutoff } } }), db.trafficSession.deleteMany({ where: { lastSeen: { lt: cutoff } } })]);
        lastCleanup = now.getTime();
      }
      res.sendStatus(204);
    } catch (error) { next(error); }
  });

  app.get('/api/admin/traffic/live', authenticateAdmin, async (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const now = new Date();
      const where = { lastSeen: { gte: new Date(now.getTime() - ACTIVE_WINDOW_SECONDS * 1000) } };
      const [activeSessions, pages] = await Promise.all([
        db.trafficSession.count({ where }),
        db.trafficSession.groupBy({ by: ['path'], where, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 20 }),
      ]);
      res.json({ measuredAt: now.toISOString(), activeWindowSeconds: ACTIVE_WINDOW_SECONDS, activeSessions, pages: pages.map(row => ({ path: row.path, sessions: row._count._all })) });
    } catch (error) { next(error); }
  });

  app.get('/api/admin/traffic/summary', authenticateAdmin, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const days = Number(req.query.days || 7);
      if (![7, 28, 90].includes(days)) throw new PublicError(400, 'TRAFFIC_RANGE', 'Choose 7, 28, or 90 days.');
      const now = new Date(), today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const start = new Date(today - (days - 1) * dayMs), where = { createdAt: { gte: start, lte: now } };
      const [views, visitors, sessions, pages, referrers, devices, firstEvent, daily] = await Promise.all([
        db.trafficPageView.count({ where }),
        db.trafficPageView.findMany({ where, distinct: ['visitorId'], select: { visitorId: true } }),
        db.trafficPageView.findMany({ where, distinct: ['sessionId'], select: { sessionId: true } }),
        db.trafficPageView.groupBy({ by: ['path'], where, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 20 }),
        db.trafficPageView.groupBy({ by: ['referrer'], where, _count: { _all: true }, orderBy: { _count: { referrer: 'desc' } }, take: 20 }),
        db.trafficPageView.groupBy({ by: ['device'], where, _count: { _all: true } }),
        db.trafficPageView.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        Promise.all(Array.from({ length: days }, async (_, index) => {
          const from = new Date(start.getTime() + index * dayMs), until = new Date(from.getTime() + dayMs);
          const count = await db.trafficPageView.count({ where: { createdAt: { gte: from, lt: until, lte: now } } });
          return { date: from.toISOString().slice(0, 10), views: count };
        })),
      ]);
      res.json({ measuredAt: now.toISOString(), days, timezone: 'UTC', start: start.toISOString(), retentionDays: TRAFFIC_RETENTION_DAYS,
        firstRecordedAt: firstEvent?.createdAt || null, views, visitors: visitors.length, sessions: sessions.length, daily,
        pages: pages.map(row => ({ name: row.path, views: row._count._all })),
        referrers: referrers.map(row => ({ name: row.referrer || 'Direct / not provided', views: row._count._all })),
        devices: devices.map(row => ({ name: row.device, views: row._count._all })),
      });
    } catch (error) { next(error); }
  });
}

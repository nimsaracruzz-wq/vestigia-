import { PublishedStorefront } from './publishedStorefront.js';
import type { Express, RequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { initialHomepage, validateHomepage, type HomepageConfig } from '../../shared/homepage.js';

export async function ensureHomepage(db: PrismaClient) {
  const existing = await db.homepage.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  const [products, settings] = await Promise.all([db.product.findMany({ select: { id: true }, orderBy: { id: 'asc' }, take: 8 }), db.storeSettings.findUnique({ where: { id: 1 } })]);
  const config = validateHomepage(initialHomepage(products.map(p => p.id), settings ? { enabled: settings.announcementEnabled, text: settings.announcementText } : undefined));
  const json = JSON.stringify(config);
  return db.homepage.upsert({ where: { id: 1 }, update: {}, create: { id: 1, draft: json, published: json } });
}

export async function homepageWarnings(db: PrismaClient, config: HomepageConfig) {
  const ids = config.sections.flatMap(s => s.type === 'product_carousel' ? s.settings.productIds : s.type === 'hero' ? s.settings.hotspots.map(h => h.productId) : []);
  const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const known = new Set(products.map(p => p.id));
  const warnings=[...new Set(ids)].filter(id => !known.has(id)).map(id => `Product #${id} no longer exists and will be skipped.`);
  const saved=await db.homepage.findUnique({where:{id:1}});
  if(saved){const published=JSON.parse(saved.published) as HomepageConfig;for(const section of config.sections){if(section.type!=='hero')continue;const before=published.sections.find(s=>s.id===section.id);if(before?.type==='hero'&&(before.settings.image!==section.settings.image||before.settings.mobileImage!==section.settings.mobileImage))warnings.push('Hero image changed. Review product hotspot positions before publishing.');}}
  const categories=await db.product.groupBy({by:['category']});
  for(const section of config.sections)if(section.type==='product_carousel'&&section.settings.source==='category'&&!categories.some(c=>c.category===section.settings.category))warnings.push(`${section.label}: category "${section.settings.category}" has no products.`);
  return warnings;
}

export function installHomepageRoutes(app: Express, db: PrismaClient, auth: RequestHandler, rateLimit: RequestHandler, serializeProduct: (product: any) => any) {
  const wrap = (fn: RequestHandler): RequestHandler => async (req,res,next) => { try { await fn(req,res,next); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Homepage request failed' }); } };
  const published=new PublishedStorefront(db,serializeProduct,()=>ensureHomepage(db));
  app.get('/api/storefront/homepage', wrap(async (_req,res) => {
    const snapshot=await published.get();
    res.set('Cache-Control','public, max-age=0, must-revalidate');
    res.set('ETag', `"homepage-${snapshot.version}"`);
    res.json({config:snapshot.config,version:snapshot.version});
  }));
  app.get('/api/admin/homepage', auth, wrap(async (_req,res) => {
    const record = await ensureHomepage(db);
    res.set('Cache-Control','private, no-store');
    res.json({ ...record, draft: JSON.parse(record.draft), published: JSON.parse(record.published), warnings: await homepageWarnings(db, JSON.parse(record.draft)) });
  }));
  app.put('/api/admin/homepage/draft', auth, rateLimit, wrap(async (req,res) => {
    const config = validateHomepage(req.body?.config);
    const revision = Number(req.body?.revision);
    if (!Number.isSafeInteger(revision)) throw new Error('A valid revision is required');
    const result = await db.homepage.updateMany({ where: { id: 1, revision }, data: { draft: JSON.stringify(config), revision: { increment: 1 }, updatedBy: String((req as any).admin?.username || (req as any).admin?.id || 'Admin') } });
    if (!result.count) { res.status(409).json({ error: 'The homepage changed in another session. Reload before saving.' }); return; }
    res.json({ revision: revision + 1, updatedAt: new Date().toISOString(), updatedBy: String((req as any).admin?.username || (req as any).admin?.id || 'Admin'), warnings: await homepageWarnings(db,config) });
  }));
  app.get('/api/admin/homepage/preview', auth, wrap(async (_req,res) => {
    const record = await ensureHomepage(db);
    res.set('Cache-Control','private, no-store').set('X-Robots-Tag','noindex, nofollow');
    res.json({ config: JSON.parse(record.draft), version: record.revision });
  }));
  app.post('/api/admin/homepage/publish', auth, rateLimit, wrap(async (req,res) => {
    const record = await ensureHomepage(db);
    if (record.revision !== req.body?.revision) { res.status(409).json({ error: 'Draft changed. Reload before publishing.' }); return; }
    const config = validateHomepage(JSON.parse(record.draft));
    const warnings = await homepageWarnings(db, config);
    const result = await db.homepage.updateMany({ where: { id: 1, revision: record.revision }, data: { published: JSON.stringify(config), publishedRevision: record.revision, publishedAt: new Date() } });
    if (!result.count) { res.status(409).json({ error: 'Draft changed during publish. Reload and try again.' }); return; }
    await published.published(config,record.revision);
    res.json({ publishedRevision: record.revision, publishedAt: new Date().toISOString(), warnings });
  }));
  app.get('/api/admin/homepage/products', auth, wrap(async (req,res) => {
    const q = String(req.query.q || '').slice(0,120), page = Math.max(0,Math.min(10000,Number(req.query.page) || 0));
    const ids = String(req.query.ids || '').split(',').map(Number).filter(n => Number.isSafeInteger(n) && n > 0).slice(0,100);
    const where = ids.length ? { id: { in: ids } } : q ? { OR: [{name:{contains:q}},{sku:{contains:q}},{category:{contains:q}}] } : {};
    const [items,total] = await Promise.all([db.product.findMany({where,skip:ids.length ? 0 : page*12,take:ids.length ? 100 : 12,orderBy:{id:'desc'},include:{prices:true,inventory:true,reviews:true}}),db.product.count({where})]);
    res.set('Cache-Control','private, no-store').json({items:items.map(serializeProduct),total,page});
  }));
  app.get('/api/admin/homepage/categories', auth, wrap(async (req,res) => {
    const items = await db.product.groupBy({by:['category'],where:{category:{contains:String(req.query.q || '').slice(0,120)}},_count:{id:true}});
    res.json(items.map(p => ({ id: p.category, name: p.category, count: p._count.id })));
  }));
  app.get('/api/admin/homepage/media', auth, wrap(async (req,res) => {
    const q=String(req.query.q||'').toLowerCase().slice(0,120),page=Math.max(0,Math.floor(Number(req.query.page)||0));
    const files: {url:string;name:string;bytes:number;mime:string}[]=[];
    for (const [root,prefix] of [[path.resolve('public/uploads'),'/uploads'],[path.resolve('../public/images'),'/images']]) {
      const walk=async(dir:string,relative=''):Promise<void>=>{
        for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])) {
          const name=relative+entry.name;
          if(entry.isDirectory()) { if(relative.split('/').length<4)await walk(path.join(dir,entry.name),name+'/');continue; }
          if(!entry.isFile()||!name.toLowerCase().includes(q)||! /\.(png|jpe?g|webp|avif)$/i.test(name))continue;
          const info=await fs.stat(path.join(dir,entry.name));
          files.push({url:prefix+'/'+name.split('/').map(encodeURIComponent).join('/'),name,bytes:info.size,mime:'image/'+(name.toLowerCase().endsWith('.jpg')||name.toLowerCase().endsWith('.jpeg')?'jpeg':name.split('.').pop())});
        }
      }; await walk(root);
    }
    files.sort((a,b)=>a.name.localeCompare(b.name));
    const items=files.slice(page*18,page*18+18);
    const metadata=await db.homepageMedia.findMany({where:{url:{in:items.map(i=>i.url)}}});
    res.set('Cache-Control','private, no-store').json({items:items.map(i=>({...i,...metadata.find(m=>m.url===i.url)})),total:files.length,page});
  }));
  app.post('/api/admin/homepage/media', auth, rateLimit, wrap(async (req,res) => {
    const {url,width,height}=req.body||{};
    if(typeof url!=='string'||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>50000||height>50000)throw new Error('Valid image dimensions are required');
    const decoded=decodeURIComponent(url);
    const prefix=decoded.startsWith('/uploads/')?'/uploads/':decoded.startsWith('/images/')?'/images/':null;
    if(!prefix)throw new Error('Only local library images can be registered');
    const root=await fs.realpath(prefix==='/uploads/'?path.resolve('public/uploads'):path.resolve('../public/images'));
    const target=await fs.realpath(path.resolve(root,decoded.slice(prefix.length)));
    if(!target.startsWith(root+path.sep))throw new Error('Invalid image path');
    const ext=path.extname(target).toLowerCase();
    const mime=({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif'} as Record<string,string>)[ext];
    if(!mime)throw new Error('Unsupported image type');
    const info=await fs.stat(target);if(!info.isFile())throw new Error('Image not found');
    const data={width,height,bytes:info.size,mime};
    res.json(await db.homepageMedia.upsert({where:{url},create:{url,...data},update:data}));
  }));
  // Only paid, non-cancelled/refunded orders contribute to this real feed.
  app.get('/api/storefront/homepage/best-sellers', wrap(async (_req,res) => {
    const rows = await db.orderItem.groupBy({by:['productId'],where:{order:{paymentStatus:'PAID',status:{notIn:['cancelled','refunded']}}},_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:24});
    res.set('Cache-Control','no-cache').json(rows.filter(r=>r.productId).map(r=>r.productId));
  }));
  return published;
}

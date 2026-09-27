import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(String(process.env.DATABASE_URL || 'file:./vestigia-dev.db').replace(/^file:/, ''));
if (!target.startsWith(path.resolve('.') + path.sep)) throw Error('Only the project-local database is supported.');
const db = new Database(target, { fileMustExist: true });
try {
  const row = db.prepare('SELECT * FROM Homepage WHERE id=1').get();
  if (!row) throw Error('Homepage is not initialized.');
  const catalog = db.prepare('SELECT id,name,colors FROM Product').all();
  const black = catalog.find(p => /aurelius|aurellius/i.test(p.name) && JSON.parse(p.colors).includes('Black'));
  const white = catalog.find(p => /aurelius|aurellius/i.test(p.name) && JSON.parse(p.colors).includes('White'));
  if (!black || !white) throw Error('Both campaign products are required to align the hotspots.');
  // Image-space anchors just below each logo. The mobile artwork is a separate composition.
  const anchors = new Map([
    [black.id, { x: 27.5, y: 56.9, tabletX: 27.5, tabletY: 56.9, mobileX: 29.2, mobileY: 52 }],
    [white.id, { x: 76.3, y: 53.7, tabletX: 76.3, tabletY: 53.7, mobileX: 74.9, mobileY: 41.6 }],
  ]);
  const patch = raw => {
    const config = JSON.parse(raw);
    for (const section of config.sections) {
      if (section.type !== 'hero') continue;
      section.settings.image = '/images/products/vestigia_hero_desktop.webp';
      section.settings.mobileImage = '/images/products/vestigia_hero_mobile.webp';
      for (const spot of section.settings.hotspots) {
        const anchor = anchors.get(spot.productId);
        if (anchor) Object.assign(spot, anchor, { coordinateSpace: 'image' });
      }
    }
    return JSON.stringify(config);
  };
  const draft = patch(row.draft), published = patch(row.published);
  if (draft !== row.draft || published !== row.published) {
    const folder = path.resolve('../scratch/hero-media-backups');
    fs.mkdirSync(folder, { recursive: true });
    await db.backup(path.join(folder, `before-${Date.now()}.sqlite`));
    db.prepare('UPDATE Homepage SET draft=?,published=?,revision=revision+1,publishedRevision=publishedRevision+1,updatedAt=?,updatedBy=? WHERE id=1 AND revision=? AND publishedRevision=?')
      .run(draft, published, Date.now(), 'Responsive hero media update', row.revision, row.publishedRevision);
    console.log('Updated hero images and aligned desktop/mobile hotspots with the T-shirts.');
  } else console.log('Hero images already updated.');
} finally {
  db.close();
}

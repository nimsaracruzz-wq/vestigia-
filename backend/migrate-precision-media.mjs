import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const ids = ['precision'];
if (!ids.length || ids.some(id => !['precision'].includes(id))) throw Error('Only the precision section is supported.');
const target = path.resolve(String(process.env.DATABASE_URL || 'file:./vestigia-dev.db').replace(/^file:/, ''));
if (!target.startsWith(path.resolve('.') + path.sep)) throw Error('Only the project-local database is supported.');
const db = new Database(target, { fileMustExist: true });
try {
  const row = db.prepare('SELECT * FROM Homepage WHERE id=1').get();
  if (!row) throw Error('Homepage is not initialized.');
  const patch = raw => {
    const config = JSON.parse(raw);
    for (const section of config.sections) {
      if (!ids.includes(section.id)) continue;
      section.settings.image = '/images/products/vestigia_detail.webp';
      section.settings.mobileImage = '';
    }
    return JSON.stringify(config);
  };
  const draft = patch(row.draft), published = patch(row.published);
  if (draft !== row.draft || published !== row.published) {
    const folder = path.resolve('../scratch/precision-media-backups');
    fs.mkdirSync(folder, { recursive: true });
    await db.backup(path.join(folder, `before-${Date.now()}.sqlite`));
    const result = db.prepare('UPDATE Homepage SET draft=?,published=?,revision=revision+1,publishedRevision=publishedRevision+1,updatedAt=?,updatedBy=? WHERE id=1 AND revision=? AND publishedRevision=?')
      .run(draft, published, Date.now(), 'Precision image update', row.revision, row.publishedRevision);
    if (!result.changes) throw Error('Homepage changed during update; retry.');
  }
  console.log(`Updated image for: ${ids.join(', ')}`);
} finally { db.close(); }

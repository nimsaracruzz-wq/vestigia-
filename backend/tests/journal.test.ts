import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';
import { initialHomepage } from '../../shared/homepage.js';
import { PublishedStorefront } from '../utils/publishedStorefront.js';
import { installStorefront } from '../utils/storefrontRoutes.js';

test('deleting a saved journal post removes its public HTML, detail route and sitemap entry', async () => {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE JournalArticle (id INTEGER PRIMARY KEY, title TEXT, date TEXT, readTime TEXT, excerpt TEXT, content TEXT, image TEXT)');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'vestigia-journal-'));
  await fs.writeFile(path.join(folder, 'index.html'), '<html><head></head><body><div id="root"></div></body></html>');
  const previous = process.env.STOREFRONT_DIST;
  process.env.STOREFRONT_DIST = folder;
  const reader = new PublishedStorefront({ journalArticle: {
    findMany: async () => db.prepare('SELECT * FROM JournalArticle ORDER BY date DESC, id DESC').all(),
  }} as any, value => value, async () => null, path.join(folder, 'snapshot.json'));
  const config = initialHomepage([]);
  config.seo.index = true;
  const source = {
    get: async () => ({config, products: [], version: 1}),
    catalog: async () => ({config, products: [], version: 1}),
    journal: () => reader.journal(),
  };
  const app = express();
  installStorefront(app, source as any);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as {port: number}).port;
  try {
    db.prepare('INSERT INTO JournalArticle VALUES (?, ?, ?, ?, ?, ?, ?)').run(123, 'Saved journal story', '2026-10-15', '3 min', 'Saved excerpt', JSON.stringify(['Saved paragraph']), '/cover.webp');
    assert.match(await (await fetch(base + '/journal')).text(), /Saved journal story/);
    const detail = await fetch(base + '/journal/123');
    assert.equal(detail.status, 200);
    assert.match(await detail.text(), /Saved paragraph/);
    assert.match(await (await fetch(base + '/sitemap-journal.xml')).text(), /journal\/123/);

    db.prepare('DELETE FROM JournalArticle WHERE id = ?').run(123);
    const listing = await fetch(base + '/journal');
    assert.equal(listing.status, 200);
    assert.doesNotMatch(await listing.text(), /Saved journal story|journal\/123/);
    assert.equal((await fetch(base + '/journal/123')).status, 404);
    assert.doesNotMatch(await (await fetch(base + '/sitemap-journal.xml')).text(), /journal\/123/);

    db.close();
    assert.equal((await fetch(base + '/journal')).status, 503);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (db.open) db.close();
    if (previous === undefined) delete process.env.STOREFRONT_DIST;
    else process.env.STOREFRONT_DIST = previous;
  }
});

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';

const folder = fs.mkdtempSync(path.resolve('scratch/pdf-test-'));
for (const [input, output] of [['src/utils/orderDocuments.ts', 'orderDocuments.mjs'], ['src/utils/pdfFonts.ts', 'pdfFonts.mjs'], ['shared/businessContact.ts', 'businessContact.mjs']]) {
  const source = fs.readFileSync(input, 'utf8').replace("'../../shared/businessContact'", "'./businessContact.mjs'").replace("'./pdfFonts'", "'./pdfFonts.mjs'");
  fs.writeFileSync(path.join(folder, output), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
}
const { buildOrderDocument } = await import(pathToFileURL(path.join(folder, 'orderDocuments.mjs')));
const nativeFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async url => {
  assert.equal(url, '/fonts/NotoSansJP.ttf');
  requests++;
  if (requests === 1) return new Response('not available', { status: 503 });
  return new Response(fs.readFileSync('public/fonts/NotoSansJP.ttf'));
};
try {
  const order = { id: 'PDF-JP-TEST', customer: '山田 太郎 / José François', address: '〒150-0001 東京都渋谷区神宮前1丁目', currency: 'JPY', subtotalMinor: 15998, shippingMinor: 0, taxMinor: 0, totalMinor: 15998,
    items: [{ productName: 'シグネチャー Tシャツ', size: 'M', color: 'ブラック', quantity: 2, unitPriceMinor: 7999, subtotalMinor: 15998 }] };
  await assert.rejects(() => buildOrderDocument([order], 'invoice'), /font could not be loaded/);
  for (const kind of ['invoice', 'packing-slip']) {
    const pdf = await buildOrderDocument([order], kind);
    assert.equal(pdf.getNumberOfPages(), 1);
    const font = pdf.getFont('VestigiaNoto', 'normal');
    const cmap = font.metadata.cmap.unicode.codeMap;
    for (const character of '山田太郎東京都渋谷区神宮前シグネチャーシャツブラックJoséFrançois') assert.ok(cmap[character.codePointAt(0)] > 0, `Missing glyph: ${character}`);
    assert.ok(pdf.output('arraybuffer').byteLength > 1000);
  }
  const multiplePages = await buildOrderDocument([{ ...order, items: Array.from({ length: 45 }, () => ({ ...order.items[0] })) }], 'invoice');
  assert.ok(multiplePages.getNumberOfPages() > 1, 'long Japanese invoices paginate');
  assert.equal(requests, 2, 'failed font fetch retries, successful fetch is cached');
  console.log('Japanese PDF glyphs, invoice and packing-slip generation, font retry and caching passed.');
} finally { globalThis.fetch = nativeFetch; }

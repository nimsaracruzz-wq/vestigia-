import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {initialHomepage} from '../../shared/homepage.js';
import {publicHomepage} from '../../shared/publicHomepage.js';
import {storefrontHtml,safeJson} from '../utils/storefrontHtml.js';
import {PublishedStorefront} from '../utils/publishedStorefront.js';
const product={id:1,slug:'real-tee',name:'Real catalog tee',category:'Clothing',colors:['Black'],image:'/images/tee.jpg',prices:{EUR:{priceMinor:6500,isActive:true}}};
const template='<!doctype html><html><head><title>Old title</title><meta name="description" content="Old"><meta property="og:title" content="Old"><script type="application/ld+json">{"old":true}</script></head><body><div id="root"></div><script type="module" src="/assets/main.js"></script></body></html>';
test('raw document has one H1, catalog links, published SEO and safe bootstrap before JavaScript',()=>{
 const config=initialHomepage([1]);config.seo.title='Published Vestigia title';
 const html=storefrontHtml(template,{config,products:[product],version:2});
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.match(html,/<h1>LEAVE YOUR MARK\.<\/h1>/);assert.match(html,/href="\/product\/real-tee"/);assert.match(html,/<title>Published Vestigia title<\/title>/);assert.match(html,/property="og:title" content="Published Vestigia title"/);assert.match(html,/id="vestigia-public-data"/);assert.doesNotMatch(html,/Old title|"old":true/);
 assert.equal((html.match(/name="description"/g)||[]).length,1);
 assert.doesNotMatch(safeJson({name:'</script><script>alert(1)</script>'}),/<\/script>/);
});
test('shop and collection source exposes real product anchors',()=>{
 for(const route of ['/shop','/collections/first-release']){const html=storefrontHtml(template,{config:initialHomepage([1]),products:[product],version:1},route);assert.match(html,/href="\/product\/real-tee"/);assert.equal((html.match(/<h1[ >]/g)||[]).length,1);}
});
test('one malformed optional section cannot erase valid hero or published metadata',()=>{
 const config=initialHomepage([1]);config.seo.title='Keep this title';
 (config.sections.find(s=>s.type==='lookbook') as any).settings.items=null;
 const safe=publicHomepage(config);assert.equal(safe.seo.title,'Keep this title');assert.ok(safe.sections.some(s=>s.type==='hero'));assert.ok(!safe.sections.some(s=>s.type==='lookbook'));
 const hero=config.sections.find(s=>s.type==='hero')!;config.sections.push({...hero,id:'duplicate-hero'});assert.equal(publicHomepage(config).sections.filter(s=>s.type==='hero').length,1);
});
test('CMS outage serves persisted published content without querying drafts',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-public-')),file=path.join(folder,'snapshot.json');
 const config=initialHomepage([1]);config.seo.title='Published snapshot';
 await fs.writeFile(file,JSON.stringify({config,products:[product],version:7}));
 const service=new PublishedStorefront({product:{findMany:async()=>{throw Object.assign(Error('private database details'),{code:'P2021'});}}} as any,p=>p,async()=>{throw Error('offline');},file);
 const result=await service.get();assert.equal(result.version,7);assert.equal(result.config.seo.title,'Published snapshot');assert.equal(result.products[0].id,1);
});
test('missing database and missing snapshot retain a usable default homepage',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-empty-'));
 const service=new PublishedStorefront({product:{findMany:async()=>{throw Error('offline');}}} as any,p=>p,async()=>{throw Error('offline');},path.join(folder,'missing.json'));
 const result=await service.get();const html=storefrontHtml(template,result);assert.match(html,/LEAVE YOUR MARK/);assert.match(html,/href="\/shop"/);assert.doesNotMatch(html,/temporarily unavailable/);
});

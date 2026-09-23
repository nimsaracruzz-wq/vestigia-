import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { validateHomepage } from './dist/shared/homepage.js';
const target=path.resolve(String(process.env.DATABASE_URL||'file:./vestigia-dev.db').replace(/^file:/,''));
if(!target.startsWith(path.resolve('.')+path.sep))throw Error('Only the project-local database is supported.');
const db=new Database(target,{fileMustExist:true});
const row=db.prepare('SELECT * FROM Homepage WHERE id=1').get();
if(!row)throw Error('Homepage is not initialized.');
const catalog=db.prepare('SELECT id,name,colors FROM Product').all();
const black=catalog.find(p=>/aurelius|aurellius/i.test(p.name)&&JSON.parse(p.colors).includes('Black'));
const white=catalog.find(p=>/aurelius|aurellius/i.test(p.name)&&JSON.parse(p.colors).includes('White'));
if(!black||!white)throw Error('Both real campaign products are required.');
let changed=false;
const patch=raw=>{const config=JSON.parse(raw),hero=config.sections.find(s=>s.type==='hero');
 if(hero&&hero.settings.image==='/images/products/vestigia-hero-1254.jpg'&&!hero.settings.hotspots.length){
  hero.settings.hotspots=[{productId:black.id,enabled:true,coordinateSpace:'image',x:38,y:35.5,tabletX:38,tabletY:35.5,mobileX:38,mobileY:35.5},{productId:white.id,enabled:true,coordinateSpace:'image',x:66.8,y:36.5,tabletX:66.8,tabletY:36.5,mobileX:66.8,mobileY:36.5}];
  validateHomepage(config);changed=true;
 }
 return JSON.stringify(config);
};
const draft=patch(row.draft),published=patch(row.published);
if(changed){const folder=path.resolve('../scratch/hero-hotspot-backups');fs.mkdirSync(folder,{recursive:true});await db.backup(path.join(folder,`before-${Date.now()}.sqlite`));
 db.prepare('UPDATE Homepage SET draft=?,published=?,revision=revision+1,publishedRevision=publishedRevision+1,updatedAt=?,updatedBy=? WHERE id=1').run(draft,published,Date.now(),'Hero hotspot alignment');
 console.log('Restored Black and White product references on the original campaign image; backup saved.');
}else console.log('Existing hotspot configuration preserved; no update required.');
db.close();

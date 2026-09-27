import {merchantFeed} from '../backend/dist/backend/utils/merchantFeed.js';
// Read-only local crawl target using the real catalog; no seeders, payments or background jobs.
import express from '../backend/node_modules/express/index.js';
import {PrismaClient} from '../backend/node_modules/@prisma/client/index.js';
import {PrismaBetterSqlite3} from '../backend/node_modules/@prisma/adapter-better-sqlite3/dist/index.js';
import {PublishedStorefront} from '../backend/dist/backend/utils/publishedStorefront.js';
import {serializeProduct} from '../backend/dist/backend/utils/publicProduct.js';
import {installStorefront} from '../backend/dist/backend/utils/storefrontRoutes.js';
import path from 'node:path';
process.env.STOREFRONT_DIST=path.resolve('dist');
const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:'file:'+path.resolve('backend/vestigia-dev.db')})});
const published=new PublishedStorefront(db,serializeProduct,()=>db.homepage.findUniqueOrThrow({where:{id:1}}),path.resolve('backend/private/seo-preview-snapshot.json'));
const app=express();app.get('/api/feeds/google-shopping',async(_req,res)=>res.type('xml').send(merchantFeed((await published.catalog()).products,'https://thevestigia.com').xml));app.use('/uploads',express.static('backend/public/uploads'));installStorefront(app,published);
const server=app.listen(4321,'127.0.0.1',()=>console.log('Read-only SEO preview: http://127.0.0.1:4321'));
process.on('SIGINT',async()=>{server.close();await db.$disconnect();process.exit(0);});

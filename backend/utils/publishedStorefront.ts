import type { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { publicHomepage } from '../../shared/publicHomepage.js';
import { initialHomepage } from '../../shared/homepage.js';
export type PublicSnapshot={config:ReturnType<typeof publicHomepage>;products:any[];version:number};
export class PublishedStorefront {
 private snapshot:PublicSnapshot={config:initialHomepage(),products:[],version:0};
 private refreshed=0;
 private pending:Promise<PublicSnapshot>|null=null;
 private ready:Promise<void>;
 constructor(private db:PrismaClient,private serialize:(p:any)=>any,private ensure:()=>Promise<any>,private file=path.resolve(process.env.PUBLIC_SNAPSHOT_PATH||'private/published-storefront.json')){
  this.ready=fs.readFile(file,'utf8').then(raw=>{const saved=JSON.parse(raw);this.snapshot={config:publicHomepage(saved.config),products:Array.isArray(saved.products)?saved.products.filter((p:any)=>p.published!==false):[],version:Number(saved.version)||0};}).catch(()=>{});
 }
 async catalog():Promise<PublicSnapshot>{
  const [snapshot,products]=await Promise.all([this.get(),this.db.product.findMany({include:{prices:true,inventory:true,reviews:true},orderBy:{id:'asc'}})]);
  return {...snapshot,products:products.map(this.serialize).filter(p=>p.published!==false)};
 }
 async get(force=false):Promise<PublicSnapshot>{
  await this.ready;
  if(!force&&Date.now()-this.refreshed<30000)return this.snapshot;
  if(!this.pending)this.pending=this.refresh().finally(()=>{this.pending=null;});
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([this.pending,new Promise<PublicSnapshot>(resolve=>{timer=setTimeout(()=>{console.warn('[Homepage] Database slow; serving published snapshot/default');resolve(this.snapshot);},1500);})]);}finally{clearTimeout(timer);}
 }
 private async refresh(){
  try{
   const [record,products]=await Promise.all([this.ensure(),this.db.product.findMany({include:{prices:true,inventory:true,reviews:true},orderBy:{id:'asc'}})]);
   let content:unknown;
   try{content=JSON.parse(record.published);}catch{console.warn('[Homepage] Published JSON missing or invalid; using safe defaults');content=initialHomepage(products.map(p=>p.id));}
   const config=publicHomepage(content,message=>console.warn('[Homepage]',message));
   this.snapshot={config,products:products.map(this.serialize).filter(p=>p.published!==false),version:record.publishedRevision};this.refreshed=Date.now();
   await this.persist();
   console.info(`[Homepage] Loaded published version ${this.snapshot.version}`);
  }catch(error){this.refreshed=Date.now();console.error('[Homepage] Published retrieval failed; serving snapshot/default',error&&typeof error==='object'&&'code' in error?String(error.code):'read_or_parse_error');}
  return this.snapshot;
 }
 private async persist(){try{await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file+'.tmp',JSON.stringify(this.snapshot),'utf8');await fs.rename(this.file+'.tmp',this.file);}catch{console.warn('[Homepage] Unable to persist published snapshot');}}
 async published(config:unknown,version:number){await this.ready;if(this.pending)await this.pending;this.snapshot={...this.snapshot,config:publicHomepage(config),version};this.refreshed=0;await this.persist();}
}

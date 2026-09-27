import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:844}});
 await page.goto(process.env.MOTION_BASE_URL||'http://localhost:5173');
 await page.locator('.hp-hotspot').first().waitFor();
 const consent=page.getByRole('button',{name:'Essential Only',exact:true});if(await consent.isVisible())await consent.click();
 for(const width of [320,360,375,390,414,430,768,1024,1280]){
  await page.setViewportSize({width,height:844});
  for(const spot of await page.locator('.hp-hotspot').all()){
   await spot.scrollIntoViewIfNeeded();const before=await spot.boundingBox();
   assert(before && before.x>=0 && before.x+before.width<=width+1,'Hotspot clipped at '+width);
   await page.mouse.move(before.x+before.width/2,before.y+before.height/2);
   await page.mouse.down();await page.waitForTimeout(150);
   const pressed=await spot.boundingBox();
   assert(Math.abs(before.x-pressed.x)<1 && Math.abs(before.y-pressed.y)<1,'Hotspot moved on press at '+width+': '+JSON.stringify({before,pressed}));
   await page.mouse.up();await page.locator('.hp-product-preview').waitFor();
   await page.getByRole('button',{name:'Close product preview'}).click();
   await page.locator('.hp-product-preview').waitFor({state:'detached'});
  }
  results.push('Hotspots stay anchored and open at '+width+'px');
 }
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  for(let attempt=0;attempt<3;attempt++){
   const frames=await page.evaluate(async()=>{
    const frames=[],start=performance.now();
    const done=new Promise(resolve=>{function sample(){const el=document.querySelector('.cart-drawer');if(el)frames.push({ms:performance.now()-start,x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width,focused:el.contains(document.activeElement)});if(performance.now()-start<420)requestAnimationFrame(sample);else resolve(frames);}requestAnimationFrame(sample);});
    document.querySelector('button[aria-label="Open bag"]').click();return done;
   });
   const finalX=width-frames.at(-1).width;
   assert(frames.some(f=>f.focused && f.x>finalX+2 && f.x<width-2),'No intermediate slide after focus on open '+attempt+' at '+width);
   assert(Math.abs(frames.at(-1).x-finalX)<1,'Drawer did not settle');
   await page.getByRole('button',{name:'Close cart',exact:true}).click();
   await page.locator('.cart-drawer').waitFor({state:'detached'});
   results.push({width,attempt,frames});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Open bag'}).click();
 await page.locator('.cart-drawer').waitFor();
 const box=await page.locator('.cart-drawer').boundingBox();assert(Math.abs(box.x-(1280-box.width))<1);
 results.push('Reduced-motion drawer immediately positioned');
 console.log('PASS responsive hotspot presses, repeated focused drawer slides, and reduced motion');
} finally {
 await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/drawer-hotspot-check.json',JSON.stringify(results,null,2));await browser.close();
}

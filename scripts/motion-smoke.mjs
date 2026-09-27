import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const base=process.env.MOTION_BASE_URL || 'http://localhost:5173';
const results=[],errors=[];
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
await page.addInitScript(()=>{
 window.__motionMetrics={maxAnimatedNodes:0,layoutShift:0,longTasks:0};
 setInterval(()=>{window.__motionMetrics.maxAnimatedNodes=Math.max(window.__motionMetrics.maxAnimatedNodes,document.getAnimations().filter(a=>a.playState==='running').length);},100);
 if(typeof PerformanceObserver!=='undefined'){
  for(const type of ['layout-shift','longtask'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='layout-shift'&&!e.hadRecentInput)window.__motionMetrics.layoutShift+=e.value;if(type==='longtask')window.__motionMetrics.longTasks++;}}).observe({type,buffered:true});}catch{}
 }
});
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error' && /Maximum update|LazyMotion|hydration/i.test(m.text()))errors.push(m.text());});
const pass=name=>{results.push(name);console.log('PASS',name);};
const measurements=[];
const measure=async label=>measurements.push({label,...await page.evaluate(()=>window.__motionMetrics)});
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow at '+(await page.viewportSize()).width);
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('.hp-hero').waitFor();
 assert.equal(await page.getByLabel('Loading Vestigia').count(),0);
 pass('Homepage immediately accessible without intro');
 for(const width of [320,360,375,390,414,430,768,1024,1280]){
  await page.setViewportSize({width,height:900});await noOverflow();
 }
 pass('Homepage fits 320–1280px');
 await measure('Home and viewport resizing');
 await page.locator('.desktop-nav a[href="/shop"]').click();
 await page.locator('.vc-image-link').first().waitFor();
 pass('Client-side shop entry');
 for(const width of [320,360,375,390,414,430,768,1024,1280]){await page.setViewportSize({width,height:900});await noOverflow();}
 pass('Shop fits 320–1280px');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.vc-inline-add').first().click();
 await page.locator('.qs-modal').waitFor();
 await page.keyboard.press('Escape');
 await page.locator('.qs-modal').waitFor({state:'detached'});
 await page.getByRole('button',{name:'Sort',exact:true}).click();
 await page.getByRole('dialog',{name:'Sort by'}).waitFor();
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.getByRole('dialog',{name:'Sort by'}).waitFor({state:'detached'});
 pass('Mobile quick shop and sort sheet enter/exit');
 await page.getByRole('button',{name:'Filter',exact:true}).click();
 await page.getByRole('dialog',{name:'Filters'}).waitFor();
 await page.keyboard.press('Escape');
 await page.getByRole('dialog',{name:'Filters'}).waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 pass('Filter focus/escape/scroll cleanup');
 const collection=page.locator('.vs-collections a').nth(1);await collection.click();
 await page.waitForURL('**/collections/**');
 await page.locator('.vc-image-link').first().click();
 await page.locator('.size-row button:not([disabled])').first().waitFor();
 pass('Collection → product');
 const productUrl=page.url();
 for(const width of [320,360,375,390,414,430,768,1024,1280]){await page.setViewportSize({width,height:900});await noOverflow();}
 pass('Product fits 320–1280px');
 await page.locator('.vst-gallery-main-image-container').click();
 await page.getByRole('dialog',{name:'Expanded Image Gallery'}).waitFor();
 await page.keyboard.press('Escape');
 await page.getByRole('dialog',{name:'Expanded Image Gallery'}).waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 pass('Gallery opens/closes and restores scrolling');
 const thumbs=page.locator('.vst-thumbnail-btn');
 if(await thumbs.count()>1){await thumbs.nth(1).click();await thumbs.first().click();pass('Rapid gallery selection');}
 await page.locator('.size-row button:not([disabled])').first().click();
 await page.getByRole('button',{name:'Add to Bag',exact:true}).first().click();
 await page.locator('.cart-drawer__checkout-btn').click();
 await page.locator('.checkout-page-shell').waitFor();
 assert.equal(new URL(page.url()).pathname,'/checkout');
 pass('Add to bag → checkout without reload');
 for(const width of [320,360,375,390,414,430,768,1024,1280]){await page.setViewportSize({width,height:900});await noOverflow();}
 pass('Checkout fits 320–1280px');
 await measure('Shopping flow and viewport resizing');
 await page.goBack();await page.locator('.size-row').waitFor();
 await page.goForward();await page.locator('.checkout-page-shell').waitFor();
 await page.reload();await page.locator('.checkout-page-shell').waitFor();
 pass('Back/forward and checkout refresh');
 await page.goto(productUrl);await page.locator('.size-row').waitFor();
 const related=page.locator('.vc-image-link').first();
 if(await related.count()){await related.click();await page.locator('.size-row').waitFor();pass('Product → product');}
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Open mobile menu'}).click();
 await page.getByRole('dialog',{name:'Mobile Navigation Menu'}).waitFor();
 await page.locator('.mobile-nav-links a[href="/account"]').click();
 await page.waitForURL('**/account');
 await page.getByRole('dialog',{name:'Mobile Navigation Menu'}).waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 await noOverflow();pass('Mobile menu → account with scroll restored');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'/shop');await page.locator('.vc-image-link').first().waitFor();
 await page.getByRole('button',{name:'Open mobile menu'}).click();
 await page.locator('.mobile-nav-links a[href="/about"]').click();
 await page.locator('.story-page-shell').waitFor();
 assert.equal(await page.locator('.page-transition').evaluate(e=>getComputedStyle(e).animationName),'none');
 pass('Reduced-motion navigation');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1280,height:900});
 await page.locator('.desktop-nav a[href="/shop"]').click({noWaitAfter:true});
 await page.locator('.desktop-nav a[href="/story"]').click({noWaitAfter:true});
 await page.locator('.desktop-nav a[href="/about"]').click({noWaitAfter:true});
 await page.locator('.story-page-shell').waitFor();
 assert.equal(await page.locator('.page-transition').count(),1);
 pass('Rapid route changes leave one current page');
 await fs.mkdir('reports',{recursive:true});
 await page.screenshot({path:'reports/motion-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'reports/motion-mobile.png'});
 const cdp=await context.newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await cdp.send('Network.enable');
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
 await page.goto(base+'/journal');await page.locator('.journal-page-shell').waitFor();
 await page.reload();await page.locator('.journal-page-shell').waitFor();
 pass('Journal direct entry/refresh with 4× CPU and slow network');
 await measure('Throttled journal');
 await page.locator('.read-more-link').first().click();
 await page.locator('.single-article-container').waitFor();
 await page.getByRole('button',{name:'Back to Journal'}).click();
 await page.locator('.journal-listing-container').waitFor();
 pass('Journal article navigation and return');
 assert.deepEqual(errors,[]);pass('No runtime, hydration, render-loop, or LazyMotion errors');
} finally {
 await fs.mkdir('reports',{recursive:true});
 await fs.writeFile('reports/motion-smoke.json',JSON.stringify({base,results,errors,measurements,measurementNotes:'Browser animation count samples every 100ms; excludes some JS-driven frame updates. CLS includes viewport resizing in this stress test and is not a Lighthouse field score. Long tasks include app/network work under throttling.'},null,2));
 await browser.close();
}

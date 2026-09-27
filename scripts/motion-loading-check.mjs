import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{window.shifts=[];new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.shifts.push({value:entry.value,elements:entry.sources.map(s=>s.node?.className||s.node?.nodeName)});}).observe({type:'layout-shift',buffered:true});});
 const session=await page.context().newCDPSession(page);
 await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await session.send('Network.enable');
 await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
 await page.goto((process.env.MOTION_BASE_URL||'http://localhost:5173')+'/journal');
 await page.locator('.journal-page-shell').waitFor();
 // Allow delayed font/image layout changes to be included in this focused probe.
 await page.waitForTimeout(1500);
 const shifts=await page.evaluate(()=>window.shifts),cls=shifts.reduce((sum,s)=>sum+s.value,0);
 await fs.writeFile('reports/motion-loading.json',JSON.stringify({cls,shifts,viewport:'390×844',cpu:4,latencyMs:150},null,2));
 assert(cls<.1,`Journal cold-load layout shift ${cls} exceeds 0.1`);
 console.log('PASS throttled journal cold-load CLS',cls);
} finally {await browser.close();}

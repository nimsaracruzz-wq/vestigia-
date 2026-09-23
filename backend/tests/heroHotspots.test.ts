import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverGeometry,toFrame,toImage,hotspotPoint} from '../../shared/heroHotspots.js';
import {initialHomepage,validateHomepage} from '../../shared/homepage.js';
test('cover anchors remain on image artwork across mobile, tablet and desktop frames',()=>{
 for(const [width,height] of [[375,812*.88],[390,844*.88],[430,932*.88],[820,1180*.84],[1440,900*.88],[390,740]]){
  const g=coverGeometry(width,height,768,768,50,width>=768?0:50);
  for(const point of [{x:38,y:29.5},{x:66.8,y:30.5}]){
   const shown=toFrame(point,g),restored=toImage(shown,g);
   assert.ok(shown.x>0&&shown.x<100&&shown.y>0&&shown.y<100);
   assert.ok(Math.abs(restored.x-point.x)<.00001&&Math.abs(restored.y-point.y)<.00001);
   assert.ok(Math.abs(shown.x*width/100-(g.offsetX+g.renderedWidth*point.x/100))<.00001);
  }
 }
});
test('all three breakpoint coordinates are independent, with legacy tablet fallback',()=>{
 const spot={productId:1,x:34,y:38,tabletX:40,tabletY:32,mobileX:32,mobileY:29};
 assert.deepEqual(hotspotPoint(spot,'desktop'),{x:34,y:38});assert.deepEqual(hotspotPoint(spot,'tablet'),{x:40,y:32});assert.deepEqual(hotspotPoint(spot,'mobile'),{x:32,y:29});
 assert.deepEqual(hotspotPoint({...spot,tabletX:undefined,tabletY:undefined},'tablet'),{x:34,y:38});
});
test('CMS accepts legacy and image anchors but rejects invalid hotspot coordinates',()=>{
 const config=initialHomepage([1]);const hero=config.sections.find(s=>s.type==='hero')!;
 hero.settings.hotspots=[{productId:1,x:38,y:29,mobileX:32,mobileY:29}];assert.doesNotThrow(()=>validateHomepage(config));
 Object.assign(hero.settings.hotspots[0],{tabletX:40,tabletY:30,enabled:false,coordinateSpace:'image'});assert.doesNotThrow(()=>validateHomepage(config));
 hero.settings.hotspots[0].tabletX=101;assert.throws(()=>validateHomepage(config));
 hero.settings.hotspots[0].tabletX=NaN;assert.throws(()=>validateHomepage(config));
});

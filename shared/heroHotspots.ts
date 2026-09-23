import type { Hotspot, HeroFocalPoints } from './homepage.js';
export type HeroMode='desktop'|'tablet'|'mobile';
export function hotspotPoint(spot:Hotspot,mode:HeroMode) {
 return mode==='mobile'?{x:spot.mobileX,y:spot.mobileY}:mode==='tablet'?{x:spot.tabletX??spot.x,y:spot.tabletY??spot.y}:{x:spot.x,y:spot.y};
}
export function coverGeometry(width:number,height:number,imageWidth:number,imageHeight:number,focalX:number,focalY:number) {
 const scale=Math.max(width/imageWidth,height/imageHeight);
 const renderedWidth=imageWidth*scale,renderedHeight=imageHeight*scale;
 return {width,height,renderedWidth,renderedHeight,offsetX:(width-renderedWidth)*focalX/100,offsetY:(height-renderedHeight)*focalY/100};
}
export function toFrame(point:{x:number;y:number},g:ReturnType<typeof coverGeometry>) {
 return {x:(g.offsetX+g.renderedWidth*point.x/100)/g.width*100,y:(g.offsetY+g.renderedHeight*point.y/100)/g.height*100};
}
export function toImage(point:{x:number;y:number},g:ReturnType<typeof coverGeometry>) {
 return {x:Math.max(0,Math.min(100,(point.x*g.width/100-g.offsetX)/g.renderedWidth*100)),y:Math.max(0,Math.min(100,(point.y*g.height/100-g.offsetY)/g.renderedHeight*100))};
}
export function heroFocal(settings:HeroFocalPoints,mode:HeroMode) {return {x:settings[`${mode}FocalX`],y:settings[`${mode}FocalY`]};}

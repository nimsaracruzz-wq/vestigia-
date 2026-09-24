import { initialHomepage, validateHomepage, type HomepageConfig, type HomepageSection } from './homepage.js';

/** Public reads salvage valid sections; writes still use the strict CMS validator. */
export function publicHomepage(input:unknown,report:(message:string)=>void=()=>{}):HomepageConfig {
 const fallback=initialHomepage();
 if(!input||typeof input!=='object')return fallback;
 const candidate=input as HomepageConfig;
 const sections:HomepageSection[]=[];
 if(Array.isArray(candidate.sections))for(const section of candidate.sections){
  try {
   const trial=structuredClone(fallback);
   trial.sections=trial.sections.filter(s=>s.id!==section?.id&&(s.type!==section?.type||!['hero','announcement','newsletter'].includes(s.type)));
   trial.sections.push(section);
   validateHomepage(trial);
   if(!sections.some(s=>s.id===section.id||s.type===section.type&&['hero','announcement','newsletter'].includes(s.type)))sections.push(section);
  }catch{report('Invalid published section skipped');}
 }
 for(const type of ['hero','announcement','newsletter'] as const)if(!sections.some(s=>s.type===type))sections.push(fallback.sections.find(s=>s.type===type)!);
 const result={...fallback,sections:sections.length?sections:fallback.sections};
 for(const key of ['seo','footer','shop'] as const){
  if(candidate[key]===undefined)continue;
  try{const trial={...fallback,[key]:candidate[key]};validateHomepage(trial);Object.assign(result,{[key]:candidate[key]});}catch{report(`Invalid published ${key}; using default`);}
 }
 return result;
}

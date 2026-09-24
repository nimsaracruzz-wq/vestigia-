const configured=String(import.meta.env.VITE_API_URL||'/api').trim().replace(/\/+$/,'');
if(configured!=='/api'){
 let url:URL;try{url=new URL(configured);}catch{throw Error('VITE_API_URL must be /api or an absolute API URL.');}
 if(import.meta.env.PROD&&(url.protocol!=='https:'||['localhost','127.0.0.1','::1'].includes(url.hostname)))throw Error('Production VITE_API_URL must use HTTPS and a public host.');
 if(url.username||url.password||url.search||url.hash)throw Error('VITE_API_URL cannot include credentials, query parameters or fragments.');
}
export const API_BASE_URL=configured.endsWith('/api')?configured:configured+'/api';

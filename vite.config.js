import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({command,mode}) => {
 const env=loadEnv(mode,process.cwd(),'');
 const api=String(env.VITE_API_URL||'/api').trim();
 if(command==='build'&&api!=='/api'){
  const url=new URL(api);
  if(url.protocol!=='https:'||['localhost','127.0.0.1','::1'].includes(url.hostname)||url.username||url.password||url.search||url.hash)throw Error('Production VITE_API_URL must be /api or an HTTPS public API URL without credentials.');
 }
 return {
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: id => /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id) ? 'motion' : undefined } } },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
};});

import { StrictMode, useEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import PublicStorefront from '../shared/PublicStorefront';
import { readPublicBootstrap } from './homepage/bootstrap';
import App from "./App";
import "./styles.css";
import "./responsive.css";

const bootstrap=readPublicBootstrap();
function StorefrontEntry(){
 const [interactive,setInteractive]=useState(false);
 useEffect(()=>setInteractive(true),[]);
 // Hydrate the exact public document before mounting private/client commerce state.
 return bootstrap&&!interactive?<PublicStorefront config={bootstrap.config} products={bootstrap.products} pathname={location.pathname} search={location.search}/>:<App/>;
}
const root=document.getElementById('root')!;
if(bootstrap)hydrateRoot(root,<StrictMode><StorefrontEntry/></StrictMode>);
else createRoot(root).render(<StrictMode><App/></StrictMode>);

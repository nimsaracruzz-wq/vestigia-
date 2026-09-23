import type { Product } from '../data';
import { useHomepage } from '../homepage/HomepageContext';
import HomepageRenderer from '../homepage/HomepageRenderer';
import { Link } from 'react-router-dom';
export default function Home({onQuickShop}: {onQuickShop:(product:Product)=>void}) {
 const {config,loading,error,reload}=useHomepage();
 if(config)return <HomepageRenderer config={config} onQuickShop={onQuickShop}/>;
 return <section className="hp-loading" style={{minHeight:'75svh',paddingTop:180}}><h1>VESTIGIA</h1><p role={error?'alert':'status'}>{loading?'Preparing the collection?':error}</p>{error&&<><button onClick={reload}>Retry</button><p><Link to="/shop">Explore the collection</Link></p></>}</section>;
}

import type { Product } from '../data';
import { useHomepage } from '../homepage/HomepageContext';
import HomepageRenderer from '../homepage/HomepageRenderer';
import { initialHomepage } from '../../shared/homepage';
export default function Home({onQuickShop}: {onQuickShop:(product:Product)=>void}) {
 const {config}=useHomepage();
 return <HomepageRenderer config={config||initialHomepage()} onQuickShop={onQuickShop}/>;
}

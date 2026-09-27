import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import type { Product } from '../../data';
import { useCurrency } from '../../context/CurrencyContext';
import { SectionReveal as Reveal } from '../../animation/SectionReveal';
import { staggerDelay } from '../../animation/config';
import ProductImage from './ProductImage';
import { getProductCompareAt, getProductPrice, resolveProductImageUrl } from '../../utils/productMedia';
import { isProductInStock } from '../../../shared/shop';
import './ProductCard.css';
type Props={product:Product;onQuickShop:()=>void;reveal?:boolean;revealIndex?:number;priority?:boolean;display?:{wishlist:boolean;quickAdd:boolean;colors:boolean;badges:boolean;badge:string}};
export default function ProductCard({product,onQuickShop,reveal=true,revealIndex=0,priority=false,display}:Props) {
 const {toggleWishlist,isInWishlist}=useCart(),{formatPrice:money,currency}=useCurrency();
 const saved=isInWishlist(product.id),inStock=isProductInStock(product),price=product.prices?.[currency],available=!!price&&price.isActive!==false;
 const main=product.modelImage||product.image,secondary=product.images.find(image=>image&&image!==main);
 const compare=getProductCompareAt(product,currency),current=getProductPrice(product,currency);
 const badge=!inStock?'Sold out':display?.badges!==false?(display?.badge||product.badge):'';
 return <Reveal as="article" disabled={!reveal} delay={staggerDelay(revealIndex)} className="product-card vc-card">
  <div className="product-media vc-media"><Link to={`/product/${product.slug||product.id}`} className="vc-image-link" aria-label={`View ${product.name}`}><ProductImage product={product} variant="shop" alt={product.alt||product.name} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} sizes="(max-width: 767px) 45vw, (max-width: 1279px) 30vw, 24vw" width={600} height={750}/>{secondary&&<img className="vc-secondary" src={resolveProductImageUrl(secondary)} alt="" aria-hidden="true" width={600} height={750} loading="lazy" decoding="async"/>}</Link>
  {badge&&<span className="vc-badge">{badge}</span>}{display?.wishlist!==false&&<button className={`vc-wishlist ${saved?'saved':''}`} onClick={()=>toggleWishlist(product)} aria-pressed={saved} aria-label={`${saved?'Remove':'Add'} ${product.name} ${saved?'from':'to'} wishlist`}><Heart size={17} fill={saved?'currentColor':'none'}/></button>}
  {display?.quickAdd!==false&&<button className="vc-hover-add" onClick={onQuickShop} disabled={!inStock||!available} aria-label={`Select size for ${product.name}`}>{!inStock?'Sold out':!available?'Unavailable':'Select size'}</button>}</div>
  <div className="vc-info"><h3><Link to={`/product/${product.slug||product.id}`}>{product.name}</Link></h3>{display?.colors!==false&&<p className="vc-color">{product.colors.join(' / ')}</p>}<p className="vc-price">{available?<>{compare&&compare>current&&<del>{money(compare)}</del>}<span>{money(current)}</span></>:<span>Unavailable in this market</span>}</p>
  {display?.quickAdd!==false&&<button className="vc-inline-add" onClick={onQuickShop} disabled={!inStock||!available} aria-label={`Quick add ${product.name}`}>{!inStock?'Sold out':!available?'Unavailable':'Quick Add +'}</button>}</div>
 </Reveal>;
}

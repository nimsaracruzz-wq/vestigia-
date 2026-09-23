import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterShopProducts, emptyShopFilters, readShopFilters, writeShopFilters, variantStock, isProductInStock, defaultShopSettings, type CatalogProduct } from '../../shared/shop.js';
import { initialHomepage, validateHomepage } from '../../shared/homepage.js';
const products: CatalogProduct[] = [
 {id:1,name:'Tee',category:'Clothing',colors:['Black','White'],sizes:['S','M'],inventory:{Black_S:0,Black_M:2,White_S:3},prices:{JPY:{priceMinor:8000},USD:{priceMinor:7000},EUR:{priceMinor:6500}}},
 {id:2,name:'Hoodie',category:'Clothing',colors:['Black'],sizes:['S'],inventory:{Black_S:0},prices:{JPY:{priceMinor:7000},USD:{priceMinor:9000},EUR:{priceMinor:6000,isActive:false}}},
 {id:3,name:'Cap',category:'Accessories',colors:['White'],sizes:['OS'],inventory:{White_OS:4},prices:{USD:{priceMinor:3000}}},
];
test('market filtering and sorting use independent currency prices',()=>{
 assert.deepEqual(filterShopProducts(products,{...emptyShopFilters,sort:'price_asc'},'JPY').map(p=>p.id),[2,1]);
 assert.deepEqual(filterShopProducts(products,{...emptyShopFilters,sort:'price_asc'},'USD').map(p=>p.id),[3,1,2]);
 assert.deepEqual(filterShopProducts(products,emptyShopFilters,'EUR').map(p=>p.id),[1]);
 assert.deepEqual(filterShopProducts(products,{...emptyShopFilters,sort:'newest'},'USD').map(p=>p.id),[3,2,1]);
});
test('featured preserves merchandising order without mutating catalog',()=>{
 const ordered=[products[2],products[0],products[1]];
 assert.deepEqual(filterShopProducts(ordered,emptyShopFilters,'USD').map(p=>p.id),[3,1,2]);
 filterShopProducts(ordered,{...emptyShopFilters,sort:'price_desc'},'USD');
 assert.deepEqual(ordered.map(p=>p.id),[3,1,2]);
});
test('size, color and availability must match the same real variant',()=>{
 assert.equal(variantStock(products[0],'Black','S'),0);
 assert.equal(isProductInStock(products[1]),false);
 assert.equal(filterShopProducts(products,{...emptyShopFilters,colors:['Black'],sizes:['S'],availability:'in_stock'},'USD').length,0);
 assert.deepEqual(filterShopProducts(products,{...emptyShopFilters,colors:['White'],sizes:['S'],availability:'in_stock'},'USD').map(p=>p.id),[1]);
});
test('price limits respect decimals and never reuse amounts across currencies',()=>{
 assert.deepEqual(filterShopProducts(products,{...emptyShopFilters,min:'70',max:'70',priceCurrency:'USD'},'USD').map(p=>p.id),[1]);
 assert.equal(filterShopProducts(products,{...emptyShopFilters,min:'70',max:'70',priceCurrency:'USD'},'JPY').length,2);
 assert.throws(()=>filterShopProducts(products,{...emptyShopFilters,min:'70.5'},'JPY'));
 assert.throws(()=>filterShopProducts(products,{...emptyShopFilters,min:'90',max:'70'},'USD'));
});
test('URL round trip preserves multi-select and collection but resets pagination',()=>{
 const value={...emptyShopFilters,colors:['Black','White'],sizes:['S','M'],min:'30',sort:'price_desc'};
 const params=writeShopFilters(new URLSearchParams('category=clothing&page=3'),value,'USD');
 assert.equal(params.get('category'),'clothing');assert.equal(params.has('page'),false);
 assert.deepEqual(readShopFilters(params),{...value,priceCurrency:'USD'});
});
test('older CMS configurations receive safe shop defaults and invalid layouts are rejected',()=>{
 const config=initialHomepage([1]);assert.deepEqual(validateHomepage(config).shop,defaultShopSettings);
 assert.throws(()=>validateHomepage({...config,shop:{...defaultShopSettings,mobileColumns:1}}));
 assert.throws(()=>validateHomepage({...config,shop:{...defaultShopSettings,pageSize:10000}}));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReorderPlan } from '../../shared/reorder.js';

const product = { id: 7, name: 'Signature', sizes: ['M'], colors: ['black'], inventory: { black_M: 5 }, prices: { EUR: {priceMinor:6500,priceListId:'EU_RETAIL'} } };
const item = { productId:7, productName:'Signature', size:'M', color:'black',quantity:2 };
test('reorder resolves the live product and preserves exact variants and quantities',()=>{
  const plan=buildReorderPlan([item],[product],[],'EUR');
  assert.equal(plan.lines[0].product,product);
  assert.equal(plan.lines[0].quantity,2);
  assert.equal(plan.lines[0].size,'M');
  assert.deepEqual(plan.issues,[]);
});
test('missing products, changed variants and unpriced markets are not fabricated',()=>{
  for(const entry of [{...item,productId:99},{...item,size:'L'}]) assert.equal(buildReorderPlan([entry],[product],[],'EUR').lines.length,0);
  assert.equal(buildReorderPlan([item],[product],[],'JPY').lines.length,0);
  assert.equal(buildReorderPlan([item],[{...product,published:false}],[],'EUR').lines.length,0);
});
test('stock limits include quantities already in the bag and duplicate order lines',()=>{
  const bag=[{product,selectedSize:'M',selectedColor:'black',quantity:3}];
  const plan=buildReorderPlan([{...item,quantity:4},item],[product],bag,'EUR');
  assert.equal(plan.lines.length,1);
  assert.equal(plan.lines[0].quantity,2);
  assert.equal(plan.issues.length,2);
  assert.equal(buildReorderPlan([item],[{...product,inventory:{black_M:0}}],[],'EUR').lines.length,0);
});

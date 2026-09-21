'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const SQL = 'Semana 3 - SQL dinamico';
function prepare(original) {
  assert.equal(original.item.length, 21, 'Expected 20 original items and SQL folder');
  const base = original.item.filter(i => i.name !== SQL);
  const folders = original.item.filter(i => i.name === SQL);
  assert.equal(base.length, 20);
  assert(base.every(i => i.request && !i.item));
  assert.equal(folders.length, 1);
  assert.deepEqual(folders[0].item.map(i => i.name), [
    'G7-S3 01 Checkout exitoso con SQL', 'G7-S3 02 Cantidad cero sin inserciones'
  ]);
  assert(folders[0].item.every(i => i.request && !i.item));
  const result = structuredClone(original);
  result.item = structuredClone(base);
  assert.deepEqual(result.item, original.item.slice(0, 20));
  return result;
}
if (require.main === module) {
  const source = path.resolve('postman/grupo-07-carrito-ecommerce.postman_collection.json');
  const output = path.resolve('test-results/grupo07-ci/base.collection.json');
  const bytes = fs.readFileSync(source);
  const result = prepare(JSON.parse(bytes));
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  assert.deepEqual(fs.readFileSync(source), bytes);
  assert.deepEqual(JSON.parse(fs.readFileSync(output)).item, result.item);
  console.log('BASE_READY: 20 original request objects identical; SQL excluded; source unchanged');
}
module.exports = {prepare};

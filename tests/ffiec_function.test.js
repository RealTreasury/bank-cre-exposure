const test = require('node:test');
const assert = require('node:assert/strict');
const { toYYYYMMDD, cleanParams } = require('../dev/netlify/functions/ffiec.js');

test('toYYYYMMDD converts ISO dates to compact form', () => {
  assert.equal(toYYYYMMDD('2024-09-30'), '20240930');
  assert.equal(toYYYYMMDD(undefined), undefined);
});

test('cleanParams removes undefined, null, and empty strings', () => {
  const params = { a: 1, b: null, c: undefined, d: '', e: 0 };
  assert.deepEqual(cleanParams(params), { a: 1, e: 0 });
});

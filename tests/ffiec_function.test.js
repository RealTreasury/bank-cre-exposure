const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveReportingPeriod, asList, applyFilter } = require('../dev/netlify/functions/ffiec.js');

test('coerces unreleased quarter to latest released', async () => {
  const period = await resolveReportingPeriod(
    { reporting_period: '2025-06-30' },
    async () => ({ periods: ['2025-06-30', '2025-03-31'] })
  );
  assert.equal(period, '2025-03-31');
});

test('asList wraps non-arrays', () => {
  assert.deepEqual(asList(5), [5]);
  assert.deepEqual(asList([1, 2]), [1, 2]);
  assert.deepEqual(asList(null), []);
});

test('applyFilter throws when filter removes all', () => {
  assert.throws(() => applyFilter([1], 'zero', () => false), /FILTER_ZERO\(zero\)/);
});

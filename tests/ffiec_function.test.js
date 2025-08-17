const test = require('node:test');
const assert = require('node:assert/strict');
const ffiec = require('../dev/netlify/functions/ffiec.js');
const { resolveReportingPeriod, asList, applyFilter } = ffiec;

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

test('health check reports missing credentials', async () => {
  const savedUser = process.env.FFIEC_USERNAME;
  const savedToken = process.env.FFIEC_TOKEN;
  delete process.env.FFIEC_USERNAME;
  delete process.env.FFIEC_TOKEN;
  const res = await ffiec.handler({ httpMethod: 'GET', queryStringParameters: { test: 'true' } });
  const body = JSON.parse(res.body);
  assert.equal(body.status, 'CREDENTIALS_MISSING');
  assert.equal(body.env.FFIEC_USERNAME, false);
  assert.equal(body.env.FFIEC_TOKEN, false);
  process.env.FFIEC_USERNAME = savedUser;
  process.env.FFIEC_TOKEN = savedToken;
});

test('health check reports credentials available', async () => {
  const savedUser = process.env.FFIEC_USERNAME;
  const savedToken = process.env.FFIEC_TOKEN;
  process.env.FFIEC_USERNAME = 'user';
  process.env.FFIEC_TOKEN = 'token';
  const res = await ffiec.handler({ httpMethod: 'GET', queryStringParameters: { test: 'true' } });
  const body = JSON.parse(res.body);
  assert.equal(body.status, 'CREDENTIALS_AVAILABLE');
  assert.equal(body.env.FFIEC_USERNAME, true);
  assert.equal(body.env.FFIEC_TOKEN, true);
  if (savedUser === undefined) delete process.env.FFIEC_USERNAME; else process.env.FFIEC_USERNAME = savedUser;
  if (savedToken === undefined) delete process.env.FFIEC_TOKEN; else process.env.FFIEC_TOKEN = savedToken;
});

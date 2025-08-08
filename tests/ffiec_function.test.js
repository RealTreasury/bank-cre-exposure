import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReportingPeriod } from '../dev/netlify/functions/ffiec.js';

test('coerces unreleased quarter to latest released', async () => {
  const period = await resolveReportingPeriod(
    { reporting_period: '2025-06-30' },
    async () => ({ periods: ['2025-06-30', '2025-03-31'] })
  );
  assert.equal(period, '2025-03-31');
});

/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as googleAds from '../../cli/live/googleAds';
import { assertReadOnlyRequest, googleRequest } from '../../cli/live/http';
import { gtmTokenFromAdc, adsTokenProvider } from '../../cli/live/auth';
import { parseAdsCSV } from '../../lib/parsers/adsParser';
import { runCli } from '../../cli/run';
import { FAKE, fixture, json, liveEnv, liveRoutes, readJson, fixtureFetch, ROOT, testDeps } from './helpers';

const LIVE_ARGS = ['audit', '--gtm-container', FAKE.container, '--ads-customer', FAKE.customer];
const FILE_ARGS = [
  'audit',
  '--gtm-export', fixture('live', 'gtm-container-export.json'),
  '--ads-csv', fixture('live', 'ads-conversions.csv'),
];

describe('adlint live mode against synthetic API fixtures (documented response shapes)', () => {
  it('reads the live GTM version and Ads conversion actions with read-only requests', async () => {
    const { fetchImpl, requests } = fixtureFetch(liveRoutes());
    const res = await runCli(LIVE_ARGS, testDeps({ fetch: fetchImpl }));

    expect(res.stderr).toBe('');
    expect(res.exitCode).toBe(res.report!.summary.counts.critical > 0 ? 1 : 0);
    expect(res.report!.source).toEqual({
      mode: 'live',
      gtmContainer: FAKE.container,
      gtmContainerVersionId: '42',
      adsCustomer: FAKE.customerDigits,
      adsConversionActions: 6,
    });

    expect(requests).toHaveLength(3);
    const [gtm, ads1, ads2] = requests;
    expect(gtm.method).toBe('GET');
    expect(gtm.url).toBe(`https://tagmanager.googleapis.com/tagmanager/v2/${FAKE.container}/versions:live`);
    expect(gtm.headers.Authorization).toBe(`Bearer ${FAKE.gtmToken}`);

    for (const r of [ads1, ads2]) {
      expect(r.method).toBe('POST');
      expect(r.url).toBe(`https://googleads.googleapis.com/${googleAds.DEFAULT_ADS_API_VERSION}/customers/1234567890/googleAds:search`);
      expect(r.headers.Authorization).toBe(`Bearer ${FAKE.adsToken}`);
      expect(r.headers['developer-token']).toBe(FAKE.developerToken);
      expect(r.headers['login-customer-id']).toBe(FAKE.login);
      expect(JSON.parse(r.body!).query).toBe(googleAds.CONVERSION_ACTION_QUERY);
    }
    for (const r of requests) expect(r.redirect).toBe('error');
    expect(JSON.parse(ads1.body!).pageToken).toBeUndefined();
    expect(JSON.parse(ads2.body!).pageToken).toBe('PAGE-TOKEN-2');

    // Only Google's APIs, never a mutate endpoint.
    for (const r of requests) {
      expect(new URL(r.url).hostname).toMatch(/^(tagmanager|googleads)\.googleapis\.com$/);
      expect(r.url).not.toMatch(/mutate/i);
    }

    // No credential reaches the output.
    for (const secret of [FAKE.gtmToken, FAKE.adsToken, FAKE.developerToken]) {
      expect(res.stdout).not.toContain(secret);
      expect(res.stderr).not.toContain(secret);
    }
  });

  it('gives identical findings to file mode on the same container and conversion actions', async () => {
    const { fetchImpl } = fixtureFetch(liveRoutes());
    const live = await runCli(LIVE_ARGS, testDeps({ fetch: fetchImpl }));
    const file = await runCli(FILE_ARGS, testDeps());

    expect(live.report!.findings.length).toBeGreaterThan(0);
    expect(live.report!.findings).toEqual(file.report!.findings);
    expect(live.report!.summary).toEqual(file.report!.summary);
    expect(live.exitCode).toBe(file.exitCode);
  });

  it('maps GAQL rows onto exactly what the CSV parser produces for the download', () => {
    const rows = [
      ...readJson(fixture('live', 'gaql-conversion-actions.page1.json')).results,
      ...readJson(fixture('live', 'gaql-conversion-actions.page2.json')).results,
    ];
    const fromApi = googleAds.rowsToAdsData(rows);
    const fromCsv = parseAdsCSV(readFileSync(fixture('live', 'ads-conversions.csv'), 'utf8'));
    expect(fromApi).toEqual(fromCsv);
  });

  it('turns enum values into the labels Google Ads downloads use', () => {
    const row = googleAds.toCsvRow({
      conversionAction: {
        name: 'Call',
        category: 'PHONE_CALL_LEAD',
        status: 'HIDDEN',
        countingType: 'MANY_PER_CLICK',
        attributionModelSettings: { attributionModel: 'GOOGLE_SEARCH_ATTRIBUTION_POSITION_BASED' },
        clickThroughLookbackWindowDays: '1',
        viewThroughLookbackWindowDays: '0',
      },
    });
    expect(row).toEqual({
      'Conversion name': 'Call',
      Category: 'Phone call lead',
      Value: '',
      Count: 'Every',
      'Attribution model': 'Position-based',
      'Click-through conversion window': '1 day',
      'View-through conversion window': '0 days',
      Status: 'Hidden',
      'Currency code': '',
      'Action optimization': '',
    });
  });

  it('leaves UNSPECIFIED enums and a missing valueSettings blank', () => {
    const row = googleAds.toCsvRow({
      conversionAction: {
        name: 'Legacy import',
        category: 'UNSPECIFIED',
        status: 'UNKNOWN',
        countingType: 'UNSPECIFIED',
        attributionModelSettings: { attributionModel: 'UNSPECIFIED' },
      },
    });
    expect(row).toEqual({
      'Conversion name': 'Legacy import',
      Category: '',
      Value: '',
      Count: '',
      'Attribution model': '',
      'Click-through conversion window': '',
      'View-through conversion window': '',
      Status: '',
      'Currency code': '',
      'Action optimization': '',
    });
  });

  it('selects primary_for_goal and maps it to the download\'s Primary/Secondary column (#69)', () => {
    expect(googleAds.CONVERSION_ACTION_QUERY).toContain('conversion_action.primary_for_goal');
    expect(googleAds.toCsvRow({ conversionAction: { name: 'P', primaryForGoal: true } })['Action optimization']).toBe('Primary');
    expect(googleAds.toCsvRow({ conversionAction: { name: 'S', primaryForGoal: false } })['Action optimization']).toBe('Secondary');
    expect(googleAds.toCsvRow({ conversionAction: { name: 'U' } })['Action optimization']).toBe('');

    const ads = googleAds.rowsToAdsData([
      { conversionAction: { name: 'P', status: 'ENABLED', primaryForGoal: true } },
      { conversionAction: { name: 'S', status: 'ENABLED', primaryForGoal: false } },
    ]);
    expect(ads.conversions.map(c => c.primary)).toEqual([true, false]);
  });

  it('the synthetic fixtures carry primary status, so no-primary-conversion is checked and passes', async () => {
    const { fetchImpl } = fixtureFetch(liveRoutes());
    const res = await runCli(['audit', '--ads-customer', FAKE.customer], testDeps({ fetch: fetchImpl }));
    expect(res.report!.findings.map(f => f.checkId)).not.toContain('no-primary-conversion');
    const rows = [
      ...readJson(fixture('live', 'gaql-conversion-actions.page1.json')).results,
      ...readJson(fixture('live', 'gaql-conversion-actions.page2.json')).results,
    ];
    expect(rows.every((r: { conversionAction: { primaryForGoal?: boolean } }) => typeof r.conversionAction.primaryForGoal === 'boolean')).toBe(true);
  });

  it('returns no findings for an account with no conversion actions', async () => {
    const { fetchImpl } = fixtureFetch([
      r => (r.url.includes('googleAds:search') ? json({ fieldMask: 'conversionAction.name' }) : undefined),
    ]);
    const res = await runCli(['audit', '--ads-customer', FAKE.customer], testDeps({ fetch: fetchImpl }));
    expect(res.exitCode).not.toBe(2);
    expect(res.report!.source).toMatchObject({ adsConversionActions: 0 });
  });
});

describe('read-only enforcement', () => {
  it('refuses mutate endpoints, other hosts and non-search Ads calls', () => {
    const ok = 'https://googleads.googleapis.com/v26/customers/1234567890/googleAds:search';
    expect(() => assertReadOnlyRequest(ok, 'POST')).not.toThrow();
    expect(() =>
      assertReadOnlyRequest('https://googleads.googleapis.com/v26/customers/1234567890/googleAds:searchStream', 'POST')
    ).not.toThrow();
    expect(() =>
      assertReadOnlyRequest(`https://tagmanager.googleapis.com/tagmanager/v2/${FAKE.container}/versions:live`, 'GET')
    ).not.toThrow();

    for (const [url, method] of [
      ['https://googleads.googleapis.com/v26/customers/1234567890/googleAds:mutate', 'POST'],
      ['https://googleads.googleapis.com/v26/customers/1234567890/conversionActions:mutate', 'POST'],
      ['https://googleads.googleapis.com/v26/customers/1234567890/googleAds:search', 'GET'],
      ['https://tagmanager.googleapis.com/tagmanager/v2/accounts/1/containers/2/versions/3:publish', 'POST'],
      ['https://tagmanager.googleapis.com/tagmanager/v2/accounts/1/containers/2/workspaces/3/tags', 'POST'],
      ['https://example.com/collect', 'GET'],
      ['http://tagmanager.googleapis.com/tagmanager/v2/accounts/1/containers/2/versions:live', 'GET'],
    ]) {
      expect(() => assertReadOnlyRequest(url, method)).toThrow();
    }
  });

  it('the Google Ads client exposes no mutate path', () => {
    for (const [name, value] of Object.entries(googleAds)) {
      expect(name).not.toMatch(/mutate/i);
      if (typeof value === 'string') expect(value).not.toMatch(/mutate/i);
    }
    const source = readFileSync(path.join(ROOT, 'cli/live/googleAds.ts'), 'utf8');
    expect(source).not.toMatch(/mutate/i);
    expect(googleAds.searchUrl('v26', '1234567890')).toMatch(/googleAds:search$/);
  });

  it('a refused request never reaches the network', async () => {
    const { fetchImpl, requests } = fixtureFetch(liveRoutes());
    await expect(
      googleRequest(
        fetchImpl,
        'https://googleads.googleapis.com/v26/customers/1234567890/googleAds:mutate',
        { method: 'POST', headers: {}, body: '{}' },
        'Google Ads API'
      )
    ).rejects.toThrow('read-only');
    expect(requests).toHaveLength(0);
  });
});

describe('credential errors exit 2 with a clear message', () => {
  const noNetwork = () => {
    const { fetchImpl, requests } = fixtureFetch([]);
    return { fetchImpl, requests };
  };

  it('missing GOOGLE_ADS_DEVELOPER_TOKEN, before any request', async () => {
    const { fetchImpl, requests } = noNetwork();
    const res = await runCli(LIVE_ARGS, testDeps({ fetch: fetchImpl, env: {} }));
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('credential error');
    expect(res.stderr).toContain('GOOGLE_ADS_DEVELOPER_TOKEN is not set');
    expect(res.stdout).toBe('');
    expect(requests).toHaveLength(0);
  });

  it('no Application Default Credentials for Tag Manager', async () => {
    const saved = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(ROOT, '__tests__/fixtures/live/does-not-exist.json');
    try {
      const { fetchImpl, requests } = noNetwork();
      const res = await runCli(
        ['audit', '--gtm-container', FAKE.container],
        testDeps({ fetch: fetchImpl, gtmToken: gtmTokenFromAdc })
      );
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('adlint: credential error: Could not get Tag Manager credentials');
      expect(res.stderr).toContain('gcloud auth application-default login');
      expect(res.stderr).toContain('tagmanager.readonly');
      expect(requests).toHaveLength(0);
    } finally {
      if (saved === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      else process.env.GOOGLE_APPLICATION_CREDENTIALS = saved;
    }
  });

  it('partly configured Google Ads OAuth env vars', async () => {
    const { fetchImpl, requests } = noNetwork();
    const res = await runCli(
      ['audit', '--ads-customer', FAKE.customer],
      testDeps({
        fetch: fetchImpl,
        env: { ...liveEnv, GOOGLE_ADS_CLIENT_ID: 'fake-client-id' },
        adsToken: adsTokenProvider,
      })
    );
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('GOOGLE_ADS_CLIENT_SECRET');
    expect(res.stderr).not.toContain('fake-client-id');
    expect(requests).toHaveLength(0);
  });

  it.each([401, 403])('Google answers HTTP %i', async status => {
    const { fetchImpl } = fixtureFetch([
      () =>
        json({ error: { code: status, message: 'Request had invalid authentication credentials.', status: 'UNAUTHENTICATED' } }, status),
    ]);
    const res = await runCli(['audit', '--gtm-container', FAKE.container], testDeps({ fetch: fetchImpl }));
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain(`Tag Manager API rejected the credentials (HTTP ${status}`);
    expect(res.stderr).not.toContain(FAKE.gtmToken);
  });

  it('other API errors and bad IDs also exit 2', async () => {
    const { fetchImpl } = fixtureFetch([
      () => json({ error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } }, 404),
    ]);
    const notFound = await runCli(['audit', '--gtm-container', FAKE.container], testDeps({ fetch: fetchImpl }));
    expect(notFound.exitCode).toBe(2);
    expect(notFound.stderr).toContain('Tag Manager API returned HTTP 404: NOT_FOUND: Not found');

    const badPath = await runCli(['audit', '--gtm-container', 'GTM-TEST001'], testDeps());
    expect(badPath.exitCode).toBe(2);
    expect(badPath.stderr).toContain('accounts/<accountId>/containers/<containerId>');

    const badCustomer = await runCli(['audit', '--ads-customer', '12345'], testDeps());
    expect(badCustomer.exitCode).toBe(2);
    expect(badCustomer.stderr).toContain('10-digit');
  });
});

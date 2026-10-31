import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CliDeps } from '../../cli/run';
import type { Env } from '../../cli/live/auth';

export const ROOT = path.resolve(__dirname, '../..');
export const fixture = (...p: string[]) => path.join(ROOT, '__tests__/fixtures', ...p);
export const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

// Made-up IDs and secrets used by the live-mode tests.
export const FAKE = {
  container: 'accounts/6000000001/containers/7000000001',
  customer: '123-456-7890',
  customerDigits: '1234567890',
  login: '9876543210',
  gtmToken: 'ya29.FAKE-GTM-TOKEN',
  adsToken: 'ya29.FAKE-ADS-TOKEN',
  developerToken: 'FAKE-DEV-TOKEN',
};

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** A fetch that answers from recorded fixtures and records every request. */
export function recordedFetch(routes: Array<(r: RecordedRequest) => Response | undefined>) {
  const requests: RecordedRequest[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const req: RecordedRequest = {
      url,
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string>) },
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    requests.push(req);
    for (const route of routes) {
      const res = route(req);
      if (res) return res;
    }
    return new Response(JSON.stringify({ error: { code: 404, message: 'no fixture', status: 'NOT_FOUND' } }), {
      status: 404,
    });
  };
  return { fetchImpl, requests };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The recorded GTM versions:live and GAQL conversion_action responses. */
export function liveRoutes() {
  const gtmLive = readJson(fixture('live', 'gtm-versions-live.json'));
  const page1 = readJson(fixture('live', 'gaql-conversion-actions.page1.json'));
  const page2 = readJson(fixture('live', 'gaql-conversion-actions.page2.json'));
  return [
    (r: RecordedRequest) =>
      r.url === `https://tagmanager.googleapis.com/tagmanager/v2/${FAKE.container}/versions:live`
        ? json(gtmLive)
        : undefined,
    (r: RecordedRequest) => {
      if (!/^https:\/\/googleads\.googleapis\.com\/v\d+\/customers\/1234567890\/googleAds:search$/.test(r.url)) {
        return undefined;
      }
      const body = JSON.parse(r.body ?? '{}');
      return json(body.pageToken === 'PAGE-TOKEN-2' ? page2 : page1);
    },
  ];
}

export const liveEnv: Env = {
  GOOGLE_ADS_DEVELOPER_TOKEN: FAKE.developerToken,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: FAKE.login,
};

export function testDeps(overrides: Partial<CliDeps> = {}): CliDeps {
  return {
    env: liveEnv,
    fetch: async () => {
      throw new Error('network is not allowed in this test');
    },
    readFile: p => readFile(p, 'utf8'),
    gtmToken: async () => FAKE.gtmToken,
    adsToken: () => async () => FAKE.adsToken,
    ...overrides,
  };
}

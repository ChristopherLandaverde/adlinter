// The only way live mode talks to the network. It refuses any host that is
// not one of Google's two APIs AdLint reads, and any Google Ads path that is
// not a search call, so a read-only run cannot turn into a write by mistake.

import { ApiError, CredentialError } from '../errors';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export const ALLOWED_HOSTS = new Set([
  'tagmanager.googleapis.com',
  'googleads.googleapis.com',
]);

// Google Ads API: AdLint calls GoogleAdsService search only. The `adwords`
// OAuth scope can write, so the restriction is enforced here, in code.
const ADS_READ_PATH = /^\/v\d+\/customers\/\d+\/googleAds:(search|searchStream)$/;
// Tag Manager API: GET only, under accounts/.
const GTM_READ_PATH = /^\/tagmanager\/v2\/accounts\//;

export function assertReadOnlyRequest(url: string, method: string): void {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
    throw new Error(`Refusing to call ${u.hostname}: live mode only calls Google's Tag Manager and Google Ads APIs`);
  }
  if (/mutate/i.test(u.pathname)) {
    throw new Error('Refusing a mutate call: AdLint is read-only');
  }
  if (u.hostname === 'googleads.googleapis.com') {
    if (method !== 'POST' || !ADS_READ_PATH.test(u.pathname)) {
      throw new Error(`Refusing ${method} ${u.pathname}: AdLint only calls GoogleAdsService search`);
    }
  }
  if (u.hostname === 'tagmanager.googleapis.com') {
    if (method !== 'GET' || !GTM_READ_PATH.test(u.pathname)) {
      throw new Error(`Refusing ${method} ${u.pathname}: AdLint only reads from the Tag Manager API`);
    }
  }
}

interface GoogleErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

/** Sends one read request and returns the parsed JSON body. */
export async function googleRequest(
  fetchImpl: FetchLike,
  url: string,
  init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string },
  apiName: string
): Promise<unknown> {
  assertReadOnlyRequest(url, init.method);

  let res: Response;
  try {
    // redirect: 'error' so a redirect can never carry the request (and its
    // Authorization header) to a host the guard above did not check.
    res = await fetchImpl(url, { ...init, redirect: 'error' });
  } catch (e) {
    throw new ApiError(`${apiName}: network error (${e instanceof Error ? e.message : String(e)})`, 0);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = (body as GoogleErrorBody | null)?.error;
    const detail = [err?.status, err?.message].filter(Boolean).join(': ') || res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw new CredentialError(
        `${apiName} rejected the credentials (HTTP ${res.status}${detail ? `, ${detail}` : ''})`
      );
    }
    throw new ApiError(`${apiName} returned HTTP ${res.status}${detail ? `: ${detail}` : ''}`, res.status);
  }

  if (body === null) {
    throw new ApiError(`${apiName} returned a response that is not JSON`, res.status);
  }
  return body;
}

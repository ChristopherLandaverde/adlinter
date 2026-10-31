// Access tokens for live mode. Credentials come from the user's machine:
// Application Default Credentials, or the Google Ads OAuth env vars. Tokens
// are held in memory for one run and never written, logged or printed.

import { CredentialError } from '../errors';

export const GTM_SCOPE = 'https://www.googleapis.com/auth/tagmanager.readonly';
// The Google Ads API has a single OAuth scope, and it permits writes. AdLint
// only calls GoogleAdsService search (enforced in ./http.ts).
export const ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

export type TokenProvider = () => Promise<string>;
export type Env = Record<string, string | undefined>;

function credentialMessage(what: string, e: unknown): string {
  const reason = e instanceof Error ? e.message : String(e);
  return `Could not get ${what} credentials: ${reason}`;
}

async function adcToken(scope: string, what: string, hint: string): Promise<string> {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: [scope] });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('no access token returned');
    return token;
  } catch (e) {
    throw new CredentialError(`${credentialMessage(what, e)}\n${hint}`);
  }
}

export const gtmTokenFromAdc: TokenProvider = () =>
  adcToken(
    GTM_SCOPE,
    'Tag Manager',
    `Set up Application Default Credentials with the read-only scope, e.g.\n  gcloud auth application-default login --scopes=${GTM_SCOPE},https://www.googleapis.com/auth/cloud-platform`
  );

/**
 * Google Ads token: an OAuth refresh token from GOOGLE_ADS_CLIENT_ID,
 * GOOGLE_ADS_CLIENT_SECRET and GOOGLE_ADS_REFRESH_TOKEN when all three are
 * set, otherwise Application Default Credentials with the adwords scope.
 */
export function adsTokenProvider(env: Env): TokenProvider {
  const clientId = env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_ADS_REFRESH_TOKEN;
  const anyOAuth = clientId || clientSecret || refreshToken;

  if (anyOAuth) {
    return async () => {
      if (!clientId || !clientSecret || !refreshToken) {
        throw new CredentialError(
          'Google Ads OAuth is partly configured: set all of GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET and GOOGLE_ADS_REFRESH_TOKEN, or none of them to use Application Default Credentials'
        );
      }
      try {
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client({ clientId, clientSecret });
        client.setCredentials({ refresh_token: refreshToken });
        const { token } = await client.getAccessToken();
        if (!token) throw new Error('no access token returned');
        return token;
      } catch (e) {
        throw new CredentialError(credentialMessage('Google Ads', e));
      }
    };
  }

  return () =>
    adcToken(
      ADS_SCOPE,
      'Google Ads',
      `Set GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET and GOOGLE_ADS_REFRESH_TOKEN, or set up Application Default Credentials with the ${ADS_SCOPE} scope`
    );
}

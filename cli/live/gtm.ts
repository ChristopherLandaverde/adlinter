// Live GTM read: the published (live) container version, via Tag Manager API
// v2 accounts.containers.versions.live. The response is a ContainerVersion,
// the same object a container export holds under `containerVersion`, so it is
// wrapped that way and handed to the web app's own parser.

import { parseGTMJSON } from '../../lib/parsers/gtmParser';
import type { GTMContainer } from '../../lib/types';
import { UsageError } from '../errors';
import { googleRequest, type FetchLike } from './http';

export const GTM_API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const CONTAINER_PATH = /^accounts\/(\d+)\/containers\/(\d+)$/;

export function parseContainerPath(path: string): string {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, '');
  if (!CONTAINER_PATH.test(trimmed)) {
    throw new UsageError(
      `--gtm-container must look like accounts/<accountId>/containers/<containerId> (numeric IDs from the Tag Manager URL), got "${path}"`
    );
  }
  return trimmed;
}

export interface LiveContainer {
  container: GTMContainer;
  containerVersionId?: string;
}

export async function fetchLiveContainer(
  containerPath: string,
  token: string,
  fetchImpl: FetchLike
): Promise<LiveContainer> {
  const url = `${GTM_API_BASE}/${containerPath}/versions:live`;
  const body = (await googleRequest(
    fetchImpl,
    url,
    { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    'Tag Manager API'
  )) as Record<string, unknown>;

  const container = parseGTMJSON(JSON.stringify({ containerVersion: body }));
  const versionId = body.containerVersionId;
  return {
    container,
    containerVersionId: typeof versionId === 'string' ? versionId : undefined,
  };
}

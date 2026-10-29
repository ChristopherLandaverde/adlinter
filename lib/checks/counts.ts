// Every check count shown to users is derived here from the generated
// registry (lib/checks/registry.generated.ts). Do not hardcode check counts
// in copy: __tests__/lib/checkCounts.test.ts fails if a literal count appears
// or if a derived count stops matching what the audit engine actually runs.

import { checkRegistry } from './registry.generated';

/** Check files in lib/checks/ that the audit engine runs. */
export type CheckModule =
  | 'gtmChecks'
  | 'advancedGTMChecks'
  | 'adsChecks'
  | 'advancedAdsChecks'
  | 'structureChecks'
  | 'edgeCaseChecks'
  | 'adsReportChecks'
  | 'performanceChecks'
  | 'signalQualityChecks'
  | 'crossChecks'
  | 'advancedCrossChecks'
  | 'settingsReportCrossChecks'
  | 'metaChecks'
  | 'tiktokChecks'
  | 'linkedinChecks'
  | 'pinterestChecks'
  | 'twitterChecks'
  | 'snapchatChecks';

/** Distinct check IDs, i.e. entries in the /checks reference. */
export const totalCheckCount = checkRegistry.length;

/** Number of registry sources (GTM, Google Ads, Performance Reports, ...). */
export const checkSourceCount = new Set(checkRegistry.map((entry) => entry.source)).size;

/**
 * Checks an audit runs when it executes these check files. Counted per file,
 * so an ID emitted by two of the files (duplicate-conversions runs on the GTM
 * container and on the Google Ads export) counts twice, the same way the
 * audit page's "N checks passed" total counts it.
 */
export function checkCountForModules(modules: readonly CheckModule[]): number {
  return modules.reduce(
    (sum, module) => sum + checkRegistry.filter((entry) => entry.modules.includes(module)).length,
    0
  );
}

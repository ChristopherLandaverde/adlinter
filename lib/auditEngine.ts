import { GTMContainer, AdsData, AuditResults, AuditContext } from './types';
import { allGTMChecks } from './checks/gtmChecks';
import { allAdsChecks } from './checks/adsChecks';
import { allCrossChecks } from './checks/crossChecks';
import { allAdvancedGTMChecks } from './checks/advancedGTMChecks';
import { allAdvancedAdsChecks } from './checks/advancedAdsChecks';
import { allAdvancedCrossChecks } from './checks/advancedCrossChecks';

export const runAudit = (
  gtmData: GTMContainer | null = null,
  adsData: AdsData | null = null,
  context?: AuditContext
): AuditResults => {
  const results: AuditResults = {
    gtm: [],
    ads: [],
    cross: [],
    summary: {
      critical: 0,
      warning: 0,
      info: 0,
      passed: 0,
    },
  };

  // Run GTM checks if GTM file provided
  if (gtmData) {
    const basicGTMResults = allGTMChecks.map(check => check(gtmData, context));
    const advancedGTMResults = allAdvancedGTMChecks.map(check =>
      check(gtmData, context)
    );
    results.gtm = [...basicGTMResults, ...advancedGTMResults];
  }

  // Run Ads checks if Ads file provided
  if (adsData) {
    const basicAdsResults = allAdsChecks.map(check => check(adsData, context));
    const advancedAdsResults = allAdvancedAdsChecks.map(check =>
      check(adsData, context)
    );
    results.ads = [...basicAdsResults, ...advancedAdsResults];
  }

  // Run cross-checks only if both files provided
  if (gtmData && adsData) {
    const basicCrossResults = allCrossChecks.map(check => check(gtmData, adsData, context));
    const advancedCrossResults = allAdvancedCrossChecks.map(check =>
      check(gtmData, adsData, context)
    );
    results.cross = [...basicCrossResults, ...advancedCrossResults];
  }

  // Calculate summary
  const allChecks = [...results.gtm, ...results.ads, ...results.cross];
  allChecks.forEach(check => {
    if (check.passed) {
      results.summary.passed++;
    } else {
      results.summary[check.severity]++;
    }
  });

  return results;
};

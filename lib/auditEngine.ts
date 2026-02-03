import { GTMContainer, AdsData, AdsReportData, AuditResults, AuditContext } from './types';
import { allGTMChecks } from './checks/gtmChecks';
import { allAdsChecks } from './checks/adsChecks';
import { allCrossChecks } from './checks/crossChecks';
import { allAdvancedGTMChecks } from './checks/advancedGTMChecks';
import { allAdvancedAdsChecks } from './checks/advancedAdsChecks';
import { allAdvancedCrossChecks } from './checks/advancedCrossChecks';
import { allReportChecks, allReportCrossChecks } from './checks/adsReportChecks';
// Tiered audit checks
import { allStructureChecks } from './checks/structureChecks';
import { allPerformanceChecks } from './checks/performanceChecks';
import { allSignalQualityChecks } from './checks/signalQualityChecks';
import { allSettingsReportCrossChecks } from './checks/settingsReportCrossChecks';
import { allEdgeCaseChecks } from './checks/edgeCaseChecks';

export const runAudit = (
  gtmData: GTMContainer | null = null,
  adsData: AdsData | null = null,
  context?: AuditContext,
  reportData?: AdsReportData | null
): AuditResults => {
  const results: AuditResults = {
    gtm: [],
    ads: [],
    cross: [],
    report: [],
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
    // Structure audit checks
    const structureResults = allStructureChecks.map(check => check(adsData, context));
    results.ads = [...basicAdsResults, ...advancedAdsResults, ...structureResults];
  }

  // Run cross-checks only if both files provided
  if (gtmData && adsData) {
    const basicCrossResults = allCrossChecks.map(check => check(gtmData, adsData, context));
    const advancedCrossResults = allAdvancedCrossChecks.map(check =>
      check(gtmData, adsData, context)
    );
    results.cross = [...basicCrossResults, ...advancedCrossResults];
  }

  // Run report checks if report data provided
  if (reportData) {
    const pureResults = allReportChecks.map(check => check(reportData));
    const crossResults = allReportCrossChecks.map(check =>
      check(reportData, adsData)
    );
    // Performance audit checks
    const performanceResults = allPerformanceChecks.map(check => check(reportData));
    // Signal quality checks (require report, optionally ads)
    const signalResults = allSignalQualityChecks.map(check =>
      check(reportData, adsData)
    );
    results.report = [...pureResults, ...crossResults, ...performanceResults, ...signalResults];
  }

  // Run settings-report cross checks if both ads settings AND report data provided
  if (adsData && reportData) {
    const settingsReportResults = allSettingsReportCrossChecks.map(check =>
      check(adsData, reportData)
    );
    // Edge case checks (require ads, optionally report)
    const edgeCaseResults = allEdgeCaseChecks.map(check =>
      check(adsData, reportData)
    );
    // Add to cross results since these are cross-file checks
    results.cross = [...results.cross, ...settingsReportResults, ...edgeCaseResults];
  } else if (adsData) {
    // Run edge case checks with null report data
    const edgeCaseResults = allEdgeCaseChecks.map(check =>
      check(adsData, null)
    );
    results.ads = [...results.ads, ...edgeCaseResults];
  }

  // Calculate summary
  const allChecks = [...results.gtm, ...results.ads, ...results.cross, ...results.report];
  allChecks.forEach(check => {
    if (check.passed) {
      results.summary.passed++;
    } else {
      results.summary[check.severity]++;
    }
  });

  return results;
};

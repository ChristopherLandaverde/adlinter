import { AdsData, AdsReportData, AuditCheck } from '../types';
import { areSimilar } from '../utils/stringDistance';

/**
 * Cross-File Mapping Checks
 * Compare Conversion Settings (config) against Performance Report (runtime)
 */

// ── CROSS CHECK #1: Active Settings with Zero Report Volume ──
export const checkZeroVolumeActiveConversions = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const enabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const reportNamesLower = new Map(
    reportData.conversions.map(r => [r.name.toLowerCase().trim(), r])
  );

  const zeroVolume = enabledConversions.filter(setting => {
    const nameLower = setting.name.toLowerCase().trim();
    const report = reportNamesLower.get(nameLower);
    // No match in report, or match exists but has zero volume
    return !report || (report.conversions === 0 && report.allConversions === 0);
  });

  return {
    id: 'cross-zero-volume-active',
    severity: 'critical',
    passed: zeroVolume.length === 0,
    title: 'Active Conversions with Zero Report Volume',
    description: zeroVolume.length > 0
      ? `${zeroVolume.length} conversion(s) enabled in settings but show no volume in performance report`
      : 'All enabled conversions have active volume',
    details: {
      zeroVolumeConversions: zeroVolume.map(c => ({
        name: c.name,
        category: c.category,
        status: c.status,
      })),
    },
    recommendation: 'Verify tag firing, check date range alignment, or disable unused conversion actions',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #2: Report Metrics with No Settings Match ────
export const checkOrphanedReportMetrics = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const settingsNamesLower = new Set(
    adsData.conversions.map(c => c.name.toLowerCase().trim())
  );

  const orphaned = reportData.conversions.filter(r => {
    const nameLower = r.name.toLowerCase().trim();
    // Has volume but no exact match in settings
    return r.conversions > 0 && !settingsNamesLower.has(nameLower);
  });

  // Try fuzzy matching to see if they're just named differently
  const fuzzyMatched: Array<{ reportName: string; possibleMatch: string }> = [];
  const trulyOrphaned: typeof orphaned = [];

  for (const r of orphaned) {
    const fuzzyMatch = adsData.conversions.find(s =>
      areSimilar(s.name, r.name)
    );
    if (fuzzyMatch) {
      fuzzyMatched.push({
        reportName: r.name,
        possibleMatch: fuzzyMatch.name,
      });
    } else {
      trulyOrphaned.push(r);
    }
  }

  return {
    id: 'cross-orphaned-report-metrics',
    severity: trulyOrphaned.length > 0 ? 'warning' : 'info',
    passed: orphaned.length === 0,
    title: 'Report Metrics Without Settings Configuration',
    description: orphaned.length > 0
      ? `${trulyOrphaned.length} conversion(s) in report have no settings match; ${fuzzyMatched.length} have possible fuzzy matches`
      : 'All report metrics have corresponding settings entries',
    details: {
      trulyOrphaned: trulyOrphaned.map(o => ({
        name: o.name,
        volume: o.conversions,
        value: o.conversionsValue,
      })),
      fuzzyMatched,
    },
    recommendation: 'These may be deleted actions, renamed conversions, or imported from another account',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #3: Configured Value vs Actual Value Mismatch ─
export const checkValueConfigMismatch = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const mismatches: Array<{
    name: string;
    configuredValue: number;
    actualAvgValue: number;
    variancePercent: number;
  }> = [];

  for (const config of adsData.conversions) {
    if (config.value <= 0) continue; // Skip if no value configured

    const report = reportData.conversions.find(
      r => r.name.toLowerCase().trim() === config.name.toLowerCase().trim()
    );

    if (report && report.conversions > 0 && report.valuePerConversion > 0) {
      const actualAvg = report.valuePerConversion;
      const variance = Math.abs(actualAvg - config.value) / config.value;

      if (variance > 0.5) { // >50% variance
        mismatches.push({
          name: config.name,
          configuredValue: config.value,
          actualAvgValue: Math.round(actualAvg * 100) / 100,
          variancePercent: Math.round(variance * 100),
        });
      }
    }
  }

  return {
    id: 'cross-value-config-mismatch',
    severity: 'warning',
    passed: mismatches.length === 0,
    title: 'Configured Value vs Actual Value Mismatch',
    description: mismatches.length > 0
      ? `${mismatches.length} conversion(s) have >50% variance between configured and actual reported value`
      : 'Configured and actual conversion values are aligned',
    details: { mismatches },
    recommendation: 'Update static values to match reality, or switch to dynamic value tracking',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #4: Disabled Conversion with Active Volume ───
export const checkDisabledWithVolume = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const disabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'disabled'
  );

  const disabledWithVolume = disabledConversions.filter(setting => {
    const report = reportData.conversions.find(
      r => r.name.toLowerCase().trim() === setting.name.toLowerCase().trim()
    );
    return report && report.conversions > 0;
  }).map(setting => {
    const report = reportData.conversions.find(
      r => r.name.toLowerCase().trim() === setting.name.toLowerCase().trim()
    )!;
    return {
      name: setting.name,
      volume: report.conversions,
      value: report.conversionsValue,
    };
  });

  return {
    id: 'cross-disabled-with-volume',
    severity: 'warning',
    passed: disabledWithVolume.length === 0,
    title: 'Disabled Conversions with Active Volume',
    description: disabledWithVolume.length > 0
      ? `${disabledWithVolume.length} disabled conversion(s) still showing volume in report — data may be stale or tags still firing`
      : 'No disabled conversions with active volume',
    details: { disabledWithVolume },
    recommendation: 'Verify if these should be re-enabled, or if tags need to be removed from GTM',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #5: Settings Count vs Report Count ───────────
export const checkSettingsReportCountMismatch = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const enabledCount = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  ).length;

  const reportWithVolume = reportData.conversions.filter(
    c => c.conversions > 0 || c.allConversions > 0
  ).length;

  const diff = Math.abs(enabledCount - reportWithVolume);
  const maxCount = Math.max(enabledCount, reportWithVolume);
  const diffPercent = maxCount > 0 ? (diff / maxCount) * 100 : 0;

  const hasMismatch = diffPercent > 50 && diff >= 3;

  return {
    id: 'cross-count-mismatch',
    severity: 'info',
    passed: !hasMismatch,
    title: 'Settings vs Report Conversion Count',
    description: hasMismatch
      ? `Settings has ${enabledCount} enabled conversions, but report shows ${reportWithVolume} with volume — ${Math.round(diffPercent)}% difference`
      : `Settings (${enabledCount} enabled) and report (${reportWithVolume} with volume) are reasonably aligned`,
    details: {
      enabledInSettings: enabledCount,
      withVolumeInReport: reportWithVolume,
      difference: diff,
      differencePercent: Math.round(diffPercent),
    },
    recommendation: 'Review for recently added/removed conversions or date range misalignment',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #6: Category Mismatch Between Files ──────────
export const checkCategoryMismatch = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const mismatches: Array<{
    name: string;
    settingsCategory: string;
    reportCategory: string | undefined;
  }> = [];

  for (const setting of adsData.conversions) {
    const report = reportData.conversions.find(
      r => r.name.toLowerCase().trim() === setting.name.toLowerCase().trim()
    );

    if (report && report.category) {
      const settingsCat = setting.category.toLowerCase().trim();
      const reportCat = report.category.toLowerCase().trim();

      // Check if categories are meaningfully different
      if (settingsCat !== reportCat && !settingsCat.includes(reportCat) && !reportCat.includes(settingsCat)) {
        mismatches.push({
          name: setting.name,
          settingsCategory: setting.category,
          reportCategory: report.category,
        });
      }
    }
  }

  return {
    id: 'cross-category-mismatch',
    severity: 'info',
    passed: mismatches.length === 0,
    title: 'Category Mismatch Between Settings and Report',
    description: mismatches.length > 0
      ? `${mismatches.length} conversion(s) have different categories in settings vs report`
      : 'Categories are consistent between settings and report',
    details: { mismatches },
    recommendation: 'Ensure categories are synchronized for accurate reporting segmentation',
    requiresBothFiles: true,
  };
};

// ── CROSS CHECK #7: Name Similarity Suggesting Renames ───────
export const checkPossibleRenames = (
  adsData: AdsData,
  reportData: AdsReportData
): AuditCheck => {
  const settingsNames = adsData.conversions.map(c => c.name);
  const reportNames = reportData.conversions.map(c => c.name);

  // Find report names that are similar to settings names but not exact matches
  const possibleRenames: Array<{
    settingsName: string;
    reportName: string;
    settingsVolume: string;
    reportVolume: number;
  }> = [];

  for (const sName of settingsNames) {
    for (const rName of reportNames) {
      if (sName.toLowerCase() !== rName.toLowerCase() && areSimilar(sName, rName)) {
        const report = reportData.conversions.find(r => r.name === rName);
        const setting = adsData.conversions.find(s => s.name === sName);

        if (report && report.conversions > 0) {
          possibleRenames.push({
            settingsName: sName,
            reportName: rName,
            settingsVolume: setting?.status || 'unknown',
            reportVolume: report.conversions,
          });
        }
      }
    }
  }

  // Deduplicate
  const uniqueRenames = possibleRenames.filter(
    (item, index, self) =>
      index === self.findIndex(t =>
        t.settingsName === item.settingsName && t.reportName === item.reportName
      )
  );

  return {
    id: 'cross-possible-renames',
    severity: 'info',
    passed: uniqueRenames.length === 0,
    title: 'Possible Renamed Conversions',
    description: uniqueRenames.length > 0
      ? `${uniqueRenames.length} conversion pair(s) may be renames or duplicates`
      : 'No suspected renamed conversions detected',
    details: { possibleRenames: uniqueRenames },
    recommendation: 'Verify if these are intentional renames or accidental duplicates',
    requiresBothFiles: true,
  };
};

// Export all settings-report cross checks
export const allSettingsReportCrossChecks: Array<
  (adsData: AdsData, reportData: AdsReportData) => AuditCheck
> = [
  checkZeroVolumeActiveConversions,
  checkOrphanedReportMetrics,
  checkValueConfigMismatch,
  checkDisabledWithVolume,
  checkSettingsReportCountMismatch,
  checkCategoryMismatch,
  checkPossibleRenames,
];

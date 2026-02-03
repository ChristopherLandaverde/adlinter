import { AdsReportData, AuditCheck } from '../types';

// Helper to calculate quartiles for outlier detection
const calculateQuartiles = (values: number[]): { q1: number; q3: number; median: number } => {
  if (values.length === 0) return { q1: 0, q3: 0, median: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  const q1 = lowerHalf.length > 0
    ? lowerHalf[Math.floor(lowerHalf.length / 2)]
    : median;

  const q3 = upperHalf.length > 0
    ? upperHalf[Math.floor(upperHalf.length / 2)]
    : median;

  return { q1, q3, median };
};

// Helper to calculate coefficient of variation
const coefficientOfVariation = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
};

// ── PERFORMANCE CHECK #1: ROAS Statistical Outliers ──────────
export const checkROASOutliers = (reportData: AdsReportData): AuditCheck => {
  const conversionsWithROAS = reportData.conversions.filter(
    c => c.conversions >= 10 && c.conversionValuePerCost > 0
  );

  if (conversionsWithROAS.length < 3) {
    return {
      id: 'perf-roas-outliers',
      severity: 'warning',
      passed: true,
      title: 'ROAS Statistical Outliers',
      description: 'Not enough data points for outlier analysis',
      recommendation: 'Gather more conversion data for statistical analysis',
    };
  }

  const roasValues = conversionsWithROAS.map(c => c.conversionValuePerCost);
  const { q1, q3 } = calculateQuartiles(roasValues);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = conversionsWithROAS.filter(
    c => c.conversionValuePerCost < lowerBound || c.conversionValuePerCost > upperBound
  );

  // Also flag impossible ROAS (>100x or <0.01x)
  const impossible = reportData.conversions.filter(
    c => c.conversions > 10 && (c.conversionValuePerCost > 100 || (c.conversionValuePerCost > 0 && c.conversionValuePerCost < 0.01))
  );

  const allFlagged = Array.from(new Set([...outliers, ...impossible]));

  return {
    id: 'perf-roas-outliers',
    severity: 'warning',
    passed: allFlagged.length === 0,
    title: 'ROAS Statistical Outliers',
    description: allFlagged.length > 0
      ? `${allFlagged.length} conversion(s) have statistically anomalous ROAS values`
      : 'ROAS values are within expected statistical bounds',
    details: {
      outliers: allFlagged.map(c => ({
        name: c.name,
        roas: c.conversionValuePerCost,
        conversions: c.conversions,
      })),
      bounds: { lower: Math.round(lowerBound * 100) / 100, upper: Math.round(upperBound * 100) / 100 },
    },
    recommendation: 'Investigate extreme ROAS values for currency mismatches, data errors, or fraudulent activity',
  };
};

// ── PERFORMANCE CHECK #2: Value per Conversion Variance ──────
export const checkValueVariance = (reportData: AdsReportData): AuditCheck => {
  // Group by category
  const byCategory: Record<string, number[]> = {};
  for (const c of reportData.conversions) {
    const cat = c.category || 'uncategorized';
    if (c.valuePerConversion > 0 && c.conversions > 0) {
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(c.valuePerConversion);
    }
  }

  const highVariance: Array<{
    category: string;
    cv: number;
    min: number;
    max: number;
    count: number;
  }> = [];

  for (const [cat, values] of Object.entries(byCategory)) {
    if (values.length < 2) continue;
    const cv = coefficientOfVariation(values);
    if (cv > 1.5) { // CV > 150%
      highVariance.push({
        category: cat,
        cv: Math.round(cv * 100),
        min: Math.round(Math.min(...values) * 100) / 100,
        max: Math.round(Math.max(...values) * 100) / 100,
        count: values.length,
      });
    }
  }

  return {
    id: 'perf-value-variance',
    severity: 'warning',
    passed: highVariance.length === 0,
    title: 'Value per Conversion Variance',
    description: highVariance.length > 0
      ? `${highVariance.length} category/categories have extreme value variance (CV >150%)`
      : 'Conversion values are stable within categories',
    details: { highVariance },
    recommendation: 'Investigate categories with high variance for data quality issues or mixed conversion types',
  };
};

// ── PERFORMANCE CHECK #3: Pareto Value Concentration ─────────
export const checkParetoConcentration = (reportData: AdsReportData): AuditCheck => {
  const totalValue = reportData.conversions.reduce((sum, c) => sum + c.conversionsValue, 0);
  const totalVolume = reportData.conversions.reduce((sum, c) => sum + c.conversions, 0);

  if (totalValue === 0 || totalVolume === 0) {
    return {
      id: 'perf-pareto-concentration',
      severity: 'info',
      passed: true,
      title: 'Value Concentration (Pareto)',
      description: 'No conversion value/volume to evaluate',
      recommendation: 'Ensure conversion values are being tracked',
    };
  }

  // Sort by value descending
  const sorted = [...reportData.conversions].sort((a, b) => b.conversionsValue - a.conversionsValue);

  let cumulativeValue = 0;
  let cumulativeVolume = 0;
  const topActions: string[] = [];

  for (const conv of sorted) {
    cumulativeValue += conv.conversionsValue;
    cumulativeVolume += conv.conversions;
    topActions.push(conv.name);

    if (cumulativeValue >= totalValue * 0.8) break;
  }

  const volumePercentage = (cumulativeVolume / totalVolume) * 100;

  // 80% of value from <10% of volume = extreme concentration
  const isConcentrated = volumePercentage < 10;

  return {
    id: 'perf-pareto-concentration',
    severity: 'info',
    passed: !isConcentrated,
    title: 'Value Concentration (Pareto)',
    description: isConcentrated
      ? `${Math.round(volumePercentage)}% of conversions drive 80% of value — extreme concentration risk`
      : `${Math.round(volumePercentage)}% of conversions drive 80% of value — healthy distribution`,
    details: {
      topActions,
      volumePercentage: Math.round(volumePercentage),
      valuePercentage: 80,
      totalValue: Math.round(totalValue * 100) / 100,
      totalVolume,
    },
    recommendation: 'Monitor high-value conversions closely; ensure their tracking is reliable',
  };
};

// ── PERFORMANCE CHECK #4: VTC-Only Conversions ───────────────
export const checkVTCOnlyConversions = (reportData: AdsReportData): AuditCheck => {
  // Conversions with significant VTC but zero click-through
  const vtcOnly = reportData.conversions.filter(c => {
    const clickConversions = c.conversions - c.viewThroughConversions;
    return c.viewThroughConversions > 10 && clickConversions === 0;
  });

  return {
    id: 'perf-vtc-only',
    severity: 'warning',
    passed: vtcOnly.length === 0,
    title: 'View-Through Only Conversions',
    description: vtcOnly.length > 0
      ? `${vtcOnly.length} conversion(s) have only view-through volume with zero click-through — suspicious signal`
      : 'All conversions have healthy click-through contribution',
    details: {
      vtcOnlyConversions: vtcOnly.map(c => ({
        name: c.name,
        vtc: c.viewThroughConversions,
        total: c.conversions,
      })),
    },
    recommendation: 'Investigate why these conversions have no click-through. Possible ad fraud or incorrect setup.',
  };
};

// ── PERFORMANCE CHECK #5: Perfect Round ROAS ─────────────────
export const checkPerfectRoundROAS = (reportData: AdsReportData): AuditCheck => {
  const suspiciousRoundNumbers = [1, 2, 5, 10, 20, 50, 100];

  const perfectRoas = reportData.conversions.filter(c =>
    c.conversions > 10 && suspiciousRoundNumbers.includes(c.conversionValuePerCost)
  );

  return {
    id: 'perf-perfect-roas',
    severity: 'info',
    passed: perfectRoas.length === 0,
    title: 'Suspiciously Perfect ROAS',
    description: perfectRoas.length > 0
      ? `${perfectRoas.length} conversion(s) have suspiciously round ROAS values — suggests static value configuration`
      : 'No suspiciously round ROAS values detected',
    details: {
      perfectRoasConversions: perfectRoas.map(c => ({
        name: c.name,
        roas: c.conversionValuePerCost,
        conversions: c.conversions,
      })),
    },
    recommendation: 'Round ROAS values often indicate static conversion values instead of actual transaction data',
  };
};

// ── PERFORMANCE CHECK #6: Negative or Zero Values ────────────
export const checkNegativeValues = (reportData: AdsReportData): AuditCheck => {
  const negativeValue = reportData.conversions.filter(c => c.conversionsValue < 0);
  const zeroValueWithVolume = reportData.conversions.filter(
    c => c.conversionsValue === 0 && c.conversions > 10
  );

  const issues = [...negativeValue, ...zeroValueWithVolume];

  return {
    id: 'perf-negative-values',
    severity: negativeValue.length > 0 ? 'critical' : 'warning',
    passed: issues.length === 0,
    title: 'Problematic Conversion Values',
    description: issues.length > 0
      ? `${negativeValue.length} with negative values, ${zeroValueWithVolume.length} with zero value but significant volume`
      : 'All conversion values are properly configured',
    details: {
      negativeValue: negativeValue.map(c => ({ name: c.name, value: c.conversionsValue })),
      zeroValueWithVolume: zeroValueWithVolume.map(c => ({
        name: c.name,
        conversions: c.conversions,
      })),
    },
    recommendation: 'Fix negative values immediately. Zero values on high-volume conversions may indicate broken value tracking.',
  };
};

// ── PERFORMANCE CHECK #7: Identical Volumes (Duplicate Signal) ─
export const checkIdenticalVolumes = (reportData: AdsReportData): AuditCheck => {
  const volumes = reportData.conversions
    .filter(c => c.conversions > 10) // Only check significant volumes
    .map(c => c.conversions);

  const volumeCounts: Record<number, string[]> = {};
  for (const c of reportData.conversions) {
    if (c.conversions > 10) {
      if (!volumeCounts[c.conversions]) {
        volumeCounts[c.conversions] = [];
      }
      volumeCounts[c.conversions].push(c.name);
    }
  }

  const duplicateVolumes = Object.entries(volumeCounts)
    .filter(([, names]) => names.length > 1)
    .map(([volume, names]) => ({
      volume: parseInt(volume),
      conversions: names,
    }));

  return {
    id: 'perf-identical-volumes',
    severity: 'warning',
    passed: duplicateVolumes.length === 0,
    title: 'Identical Conversion Volumes',
    description: duplicateVolumes.length > 0
      ? `${duplicateVolumes.length} group(s) of conversions with identical volume — possible duplicate tracking`
      : 'No suspicious identical volumes detected',
    details: { duplicateVolumes },
    recommendation: 'Conversions with identical volumes may be duplicate tags firing on the same events',
  };
};

// ── PERFORMANCE CHECK #8: Value Without Volume ───────────────
export const checkValueWithoutVolume = (reportData: AdsReportData): AuditCheck => {
  const valueNoVolume = reportData.conversions.filter(
    c => c.conversionsValue > 0 && c.conversions === 0
  );

  return {
    id: 'perf-value-without-volume',
    severity: 'critical',
    passed: valueNoVolume.length === 0,
    title: 'Conversion Value Without Conversions',
    description: valueNoVolume.length > 0
      ? `${valueNoVolume.length} conversion(s) report value but zero conversions — data integrity issue`
      : 'All values have corresponding conversion counts',
    details: {
      valueNoVolume: valueNoVolume.map(c => ({
        name: c.name,
        value: c.conversionsValue,
        conversions: c.conversions,
      })),
    },
    recommendation: 'This indicates a data corruption issue. Investigate immediately.',
  };
};

// Export all performance checks
export const allPerformanceChecks: Array<(reportData: AdsReportData) => AuditCheck> = [
  checkROASOutliers,
  checkValueVariance,
  checkParetoConcentration,
  checkVTCOnlyConversions,
  checkPerfectRoundROAS,
  checkNegativeValues,
  checkIdenticalVolumes,
  checkValueWithoutVolume,
];

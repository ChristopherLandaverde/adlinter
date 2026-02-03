import { AdsData, AdsReportData, AuditCheck } from '../types';

/**
 * Edge Case Detection Checks
 * Identify rows where data is technically valid but strategically broken
 */

// Category matchers (normalized to handle spaces/underscores)
const PRIMARY_CATEGORIES = ['purchase', 'sale', 'transaction', 'order'];
const MICRO_CATEGORIES = ['page_view', 'page view', 'pageview', 'view_item', 'view item', 'search', 'scroll', 'video_start', 'video start', 'video', 'click', 'other', 'default'];

// ── EDGE CASE #1: Purchase Disabled While Others Enabled ─────
export const checkPurchaseDisabledOthersEnabled = (
  adsData: AdsData,
  _reportData: AdsReportData | null
): AuditCheck => {
  const purchaseConversions = adsData.conversions.filter(c =>
    PRIMARY_CATEGORIES.some(cat => c.category.toLowerCase().includes(cat))
  );

  const otherConversions = adsData.conversions.filter(c =>
    !PRIMARY_CATEGORIES.some(cat => c.category.toLowerCase().includes(cat))
  );

  const purchaseDisabled = purchaseConversions.filter(
    c => c.status.toLowerCase() === 'disabled'
  );
  const othersEnabled = otherConversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const isBroken = purchaseDisabled.length > 0 && othersEnabled.length > 0;

  return {
    id: 'edge-purchase-disabled-others-enabled',
    severity: 'critical',
    passed: !isBroken,
    title: 'Purchase Conversions Disabled While Others Enabled',
    description: isBroken
      ? `${purchaseDisabled.length} purchase conversion(s) disabled while ${othersEnabled.length} other action(s) enabled — Smart Bidding optimizing for wrong goal`
      : 'Primary conversion status is appropriate',
    details: {
      disabledPurchases: purchaseDisabled.map(c => c.name),
      enabledOthers: othersEnabled.slice(0, 5).map(c => c.name), // Limit to 5
    },
    recommendation: 'Enable purchase conversions or verify this is intentional for your campaign goals',
  };
};

// ── EDGE CASE #2: High-Value Actions with Wrong Counting ─────
export const checkHighValueWrongCounting = (
  adsData: AdsData,
  reportData: AdsReportData | null
): AuditCheck => {
  // Find high-value conversions (by configured value or report value) with wrong counting
  const highValueWrongCount = adsData.conversions.filter(c => {
    const isPurchase = PRIMARY_CATEGORIES.some(cat =>
      c.category.toLowerCase().includes(cat)
    );

    // High value: configured >$100 or known purchase category
    const isHighValue = c.value > 100 || isPurchase;

    // Wrong counting: purchase with "One" (should be "Every")
    const wrongCounting = isPurchase && c.count.toLowerCase() === 'one';

    return isHighValue && wrongCounting && c.status.toLowerCase() === 'enabled';
  });

  return {
    id: 'edge-high-value-wrong-counting',
    severity: 'critical',
    passed: highValueWrongCount.length === 0,
    title: 'High-Value Conversions with Wrong Counting Method',
    description: highValueWrongCount.length > 0
      ? `${highValueWrongCount.length} high-value conversion(s) set to count "One" — missing repeat purchases`
      : 'High-value conversions have appropriate counting methods',
    details: {
      highValueWrongCount: highValueWrongCount.map(c => ({
        name: c.name,
        value: c.value,
        count: c.count,
        category: c.category,
      })),
    },
    recommendation: 'Set purchase conversions to count "Every" to track all transactions',
  };
};

// ── EDGE CASE #3: Micro Dominating Total Volume ──────────────
export const checkMicroDominatingVolume = (
  adsData: AdsData,
  reportData: AdsReportData | null
): AuditCheck => {
  if (!reportData) {
    return {
      id: 'edge-micro-dominating',
      severity: 'info',
      passed: true,
      title: 'Micro-Conversion Dominance',
      description: 'Upload report data to check micro-conversion dominance',
      recommendation: 'Upload performance report for this check',
      requiresBothFiles: true,
    };
  }

  const totalVolume = reportData.conversions.reduce(
    (sum, c) => sum + c.conversions,
    0
  );

  if (totalVolume === 0) {
    return {
      id: 'edge-micro-dominating',
      severity: 'info',
      passed: true,
      title: 'Micro-Conversion Dominance',
      description: 'No conversion volume to evaluate',
      recommendation: 'Ensure conversions are tracking',
    };
  }

  const microDominating = reportData.conversions.filter(c => {
    const cat = (c.category || c.name).toLowerCase();
    const isMicro = MICRO_CATEGORIES.some(m => cat.includes(m));
    const volumeShare = c.conversions / totalVolume;
    return isMicro && volumeShare > 0.7; // >70% of total volume
  });

  return {
    id: 'edge-micro-dominating',
    severity: microDominating.length > 0 ? 'critical' : 'info',
    passed: microDominating.length === 0,
    title: 'Micro-Conversion Dominance',
    description: microDominating.length > 0
      ? `${microDominating.length} micro-conversion(s) account for >70% of total volume — severely corrupts bidding`
      : 'No micro-conversions dominating total volume',
    details: {
      microDominating: microDominating.map(c => ({
        name: c.name,
        volume: c.conversions,
        volumeShare: Math.round((c.conversions / totalVolume) * 100),
      })),
      totalVolume,
    },
    recommendation: 'Immediately set micro-conversions as Secondary or remove from account',
    requiresBothFiles: true,
  };
};

// ── EDGE CASE #4: Extreme Attribution Window Mismatch ────────
export const checkExtremeWindowMismatch = (
  adsData: AdsData,
  _reportData: AdsReportData | null
): AuditCheck => {
  // Helper to parse days
  const parseDays = (window: string): number => {
    const match = window.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Find conversions with extreme window differences
  const extremeWindowMismatch = adsData.conversions.filter(c => {
    const clickDays = parseDays(c.clickWindow);
    const viewDays = parseDays(c.viewWindow);

    // Extreme cases:
    // 1. Click window >60 days for purchase category
    // 2. View window >7 days when click window <7 days
    // 3. Click window <1 day for any significant conversion
    const isPurchase = PRIMARY_CATEGORIES.some(cat =>
      c.category.toLowerCase().includes(cat)
    );

    const hasExtremeClickWindow = isPurchase && clickDays > 60;
    const hasInvertedRatio = viewDays > 7 && clickDays < 7;
    const hasTooShortClick = clickDays > 0 && clickDays < 1 && c.status.toLowerCase() === 'enabled';

    return hasExtremeClickWindow || hasInvertedRatio || hasTooShortClick;
  });

  return {
    id: 'edge-extreme-window-mismatch',
    severity: 'warning',
    passed: extremeWindowMismatch.length === 0,
    title: 'Extreme Attribution Window Configuration',
    description: extremeWindowMismatch.length > 0
      ? `${extremeWindowMismatch.length} conversion(s) have unusual attribution window configurations`
      : 'Attribution windows are within normal ranges',
    details: {
      extremeWindowMismatch: extremeWindowMismatch.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
        viewWindow: c.viewWindow,
        category: c.category,
      })),
    },
    recommendation: 'Review and adjust attribution windows to match actual customer behavior',
  };
};

// ── EDGE CASE #5: All Values Are Round Numbers ───────────────
export const checkAllRoundValues = (
  adsData: AdsData,
  reportData: AdsReportData | null
): AuditCheck => {
  const conversionsWithValues = adsData.conversions.filter(c => c.value > 0);

  if (conversionsWithValues.length === 0) {
    return {
      id: 'edge-all-round-values',
      severity: 'info',
      passed: true,
      title: 'Static Round Value Detection',
      description: 'No conversion values configured',
      recommendation: 'Consider adding conversion values for ROAS optimization',
    };
  }

  const roundMultiples = [1, 5, 10, 25, 50, 100, 500, 1000];

  const allRound = conversionsWithValues.every(c =>
    roundMultiples.some(m => c.value % m === 0 && c.value >= m)
  );

  // Also check report data for round values if available
  let reportAllRound = false;
  if (reportData) {
    const reportWithValues = reportData.conversions.filter(c => c.valuePerConversion > 0);
    if (reportWithValues.length > 0) {
      reportAllRound = reportWithValues.every(c =>
        roundMultiples.some(m => c.valuePerConversion % m === 0 && c.valuePerConversion >= m)
      );
    }
  }

  const bothRound = allRound && reportAllRound;

  return {
    id: 'edge-all-round-values',
    severity: bothRound ? 'warning' : 'info',
    passed: !allRound,
    title: 'Static Round Value Detection',
    description: allRound
      ? `All ${conversionsWithValues.length} configured values are round numbers — likely static values, not dynamic tracking`
      : 'Values appear to include dynamic/real transaction data',
    details: {
      values: conversionsWithValues.map(c => ({
        name: c.name,
        value: c.value,
      })),
      allSettingsRound: allRound,
      allReportRound: reportAllRound,
    },
    recommendation: allRound
      ? 'Consider implementing dynamic value tracking for accurate ROAS measurement'
      : 'Value configuration appears appropriate',
  };
};

// ── EDGE CASE #6: Conversion with Only allConversions ────────
export const checkOnlyAllConversions = (
  _adsData: AdsData,
  reportData: AdsReportData | null
): AuditCheck => {
  if (!reportData) {
    return {
      id: 'edge-only-all-conversions',
      severity: 'info',
      passed: true,
      title: 'Secondary-Only Volume',
      description: 'Upload report data to check for secondary-only conversions',
      recommendation: 'Upload performance report for this check',
      requiresBothFiles: true,
    };
  }

  // Conversions with allConversions but zero conversions = secondary only
  const secondaryOnly = reportData.conversions.filter(
    c => c.allConversions > 0 && c.conversions === 0
  );

  return {
    id: 'edge-only-all-conversions',
    severity: secondaryOnly.length > 0 ? 'info' : 'info',
    passed: secondaryOnly.length === 0,
    title: 'Secondary-Only Volume',
    description: secondaryOnly.length > 0
      ? `${secondaryOnly.length} conversion(s) have "All conversions" volume but zero "Conversions" — these are marked Secondary`
      : 'All conversions with volume are tracked as Primary',
    details: {
      secondaryOnly: secondaryOnly.map(c => ({
        name: c.name,
        allConversions: c.allConversions,
        category: c.category,
      })),
    },
    recommendation: 'Review if any secondary-only conversions should be promoted to Primary for bidding',
    requiresBothFiles: true,
  };
};

// ── EDGE CASE #7: Single Category Dominance ──────────────────
export const checkSingleCategoryDominance = (
  adsData: AdsData,
  _reportData: AdsReportData | null
): AuditCheck => {
  const enabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  if (enabledConversions.length < 3) {
    return {
      id: 'edge-single-category-dominance',
      severity: 'info',
      passed: true,
      title: 'Category Diversity',
      description: 'Not enough conversions to evaluate category diversity',
      recommendation: 'Add more conversion actions for robust tracking',
    };
  }

  const categoryCounts: Record<string, number> = {};
  for (const c of enabledConversions) {
    const cat = c.category.toLowerCase().trim() || 'uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);

  const dominantCategory = sortedCategories[0];
  const dominantShare = dominantCategory[1] / enabledConversions.length;

  const isDominant = dominantShare > 0.8 && enabledConversions.length >= 5;

  return {
    id: 'edge-single-category-dominance',
    severity: 'info',
    passed: !isDominant,
    title: 'Category Diversity',
    description: isDominant
      ? `${Math.round(dominantShare * 100)}% of enabled conversions are category "${dominantCategory[0]}" — limited funnel visibility`
      : 'Conversion categories are reasonably diverse',
    details: {
      categoryBreakdown: Object.fromEntries(sortedCategories),
      dominantCategory: dominantCategory[0],
      dominantShare: Math.round(dominantShare * 100),
    },
    recommendation: 'Add conversion actions across the full funnel (awareness → consideration → conversion)',
  };
};

// ── EDGE CASE #8: Very Long Inactive Period ──────────────────
export const checkVeryLongWindow = (
  adsData: AdsData,
  _reportData: AdsReportData | null
): AuditCheck => {
  const parseDays = (window: string): number => {
    const match = window.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Find any conversions with extremely long windows (>90 days)
  const veryLongWindow = adsData.conversions.filter(c => {
    const clickDays = parseDays(c.clickWindow);
    const viewDays = parseDays(c.viewWindow);
    return clickDays > 90 || viewDays > 30;
  });

  return {
    id: 'edge-very-long-window',
    severity: 'warning',
    passed: veryLongWindow.length === 0,
    title: 'Very Long Attribution Windows',
    description: veryLongWindow.length > 0
      ? `${veryLongWindow.length} conversion(s) have attribution windows >90 days click or >30 days view`
      : 'All attribution windows are within standard ranges',
    details: {
      veryLongWindow: veryLongWindow.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
        viewWindow: c.viewWindow,
      })),
    },
    recommendation: 'Long windows may attribute unrelated conversions. Consider shortening unless you have a very long sales cycle.',
  };
};

// Export all edge case checks (require ads data, optionally report data)
export const allEdgeCaseChecks: Array<
  (adsData: AdsData, reportData: AdsReportData | null) => AuditCheck
> = [
  checkPurchaseDisabledOthersEnabled,
  checkHighValueWrongCounting,
  checkMicroDominatingVolume,
  checkExtremeWindowMismatch,
  checkAllRoundValues,
  checkOnlyAllConversions,
  checkSingleCategoryDominance,
  checkVeryLongWindow,
];

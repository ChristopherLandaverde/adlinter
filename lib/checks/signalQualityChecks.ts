import { AdsData, AdsReportData, AuditCheck, AuditContext, Severity } from '../types';

// Helper to extract days from window strings
const parseDays = (window: string): number => {
  const match = window.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Category matchers (normalized to handle spaces/underscores)
const MICRO_CATEGORIES = ['page_view', 'page view', 'pageview', 'view_item', 'view item', 'search', 'scroll', 'video_start', 'video start', 'video_view', 'video view', 'click', 'other', 'default'];
const MACRO_CATEGORIES = ['purchase', 'sale', 'transaction', 'order', 'lead', 'sign_up', 'sign up', 'signup', 'subscription', 'submit_lead_form'];
const PRIMARY_CATEGORIES = ['purchase', 'sale', 'transaction', 'order'];

// ── SIGNAL CHECK #1: Micro-Conversion Pollution ──────────────
export const checkMicroPollution = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  const microVolume = reportData.conversions
    .filter(c => {
      const cat = (c.category || c.name).toLowerCase();
      return MICRO_CATEGORIES.some(m => cat.includes(m));
    })
    .reduce((sum, c) => sum + c.allConversions, 0);

  const macroVolume = reportData.conversions
    .filter(c => {
      const cat = (c.category || c.name).toLowerCase();
      return MACRO_CATEGORIES.some(m => cat.includes(m));
    })
    .reduce((sum, c) => sum + c.allConversions, 0);

  const ratio = macroVolume > 0 ? microVolume / macroVolume : 0;
  const isPolluted = macroVolume > 0 && ratio > 100;

  return {
    id: 'signal-micro-pollution',
    severity: 'critical',
    passed: !isPolluted,
    title: 'Micro-Conversion Signal Pollution',
    description: isPolluted
      ? `Micro-conversion volume (${microVolume.toLocaleString()}) is ${Math.round(ratio)}x macro-conversion volume (${macroVolume.toLocaleString()}) — severely dilutes Smart Bidding signals`
      : macroVolume > 0
        ? `Micro/macro ratio is ${Math.round(ratio)}x — acceptable`
        : 'Unable to calculate micro/macro ratio',
    details: { microVolume, macroVolume, ratio: Math.round(ratio) },
    recommendation: 'Set micro-conversions as "Secondary" so they do not interfere with Smart Bidding optimization',
    requiresBothFiles: true,
  };
};

// ── SIGNAL CHECK #2: Primary Conversion Dilution ─────────────
export const checkPrimaryDilution = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  if (!adsData) {
    return {
      id: 'signal-primary-dilution',
      severity: 'warning',
      passed: true,
      title: 'Primary Conversion Dilution',
      description: 'Upload Ads settings to check for primary conversion dilution',
      recommendation: 'Upload both files for this check',
      requiresBothFiles: true,
    };
  }

  // Count enabled conversions that could be "primary" (purchase/lead categories)
  const primaryCandidates = adsData.conversions.filter(c =>
    c.status.toLowerCase() === 'enabled' &&
    MACRO_CATEGORIES.some(cat => c.category.toLowerCase().includes(cat))
  );

  const isDiluted = primaryCandidates.length > 3;

  return {
    id: 'signal-primary-dilution',
    severity: 'warning',
    passed: !isDiluted,
    title: 'Primary Conversion Dilution',
    description: isDiluted
      ? `${primaryCandidates.length} primary-eligible conversions enabled — Smart Bidding signal may be diluted`
      : `${primaryCandidates.length} primary-eligible conversion(s) — signal is focused`,
    details: {
      primaryCandidates: primaryCandidates.map(c => ({
        name: c.name,
        category: c.category,
      })),
      count: primaryCandidates.length,
    },
    recommendation: 'Focus on 1-3 primary conversions for clearer Smart Bidding optimization',
    requiresBothFiles: true,
  };
};

// ── SIGNAL CHECK #3: Secondary Conversion Leakage ────────────
export const checkSecondaryLeakage = (
  reportData: AdsReportData,
  _adsData: AdsData | null
): AuditCheck => {
  const leaky = reportData.conversions.filter(c => {
    if (c.conversions === 0) return false;
    const ratio = c.allConversions / c.conversions;
    return ratio > 2.0; // 2x more "all" than "primary"
  });

  return {
    id: 'signal-secondary-leakage',
    severity: 'warning',
    passed: leaky.length === 0,
    title: 'Secondary Conversion Leakage',
    description: leaky.length > 0
      ? `${leaky.length} conversion(s) have "All conversions" >2x "Conversions" — secondary actions inflating totals`
      : 'Primary and all-conversion counts are aligned',
    details: {
      leakyConversions: leaky.map(c => ({
        name: c.name,
        conversions: c.conversions,
        allConversions: c.allConversions,
        ratio: (c.allConversions / c.conversions).toFixed(1),
      })),
    },
    recommendation: 'Review whether secondary conversions should be promoted to primary, or investigate duplicate tracking',
  };
};

// ── SIGNAL CHECK #4: Zero-Value Primary Conversions ──────────
export const checkZeroValuePrimary = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  if (!adsData) {
    // Check report data only
    const zeroValuePrimary = reportData.conversions.filter(c => {
      const cat = (c.category || c.name).toLowerCase();
      const isPrimary = PRIMARY_CATEGORIES.some(p => cat.includes(p));
      return isPrimary && c.conversions > 0 && c.valuePerConversion === 0;
    });

    return {
      id: 'signal-zero-value-primary',
      severity: zeroValuePrimary.length > 0 ? 'critical' : 'info',
      passed: zeroValuePrimary.length === 0,
      title: 'Zero-Value Primary Conversions',
      description: zeroValuePrimary.length > 0
        ? `${zeroValuePrimary.length} primary conversion(s) reporting zero value — breaks value-based bidding`
        : 'All primary conversions have values',
      details: {
        zeroValuePrimary: zeroValuePrimary.map(c => c.name),
      },
      recommendation: 'Configure conversion values for purchase/sale actions to enable ROAS bidding',
    };
  }

  const zeroValuePrimary = adsData.conversions.filter(c =>
    c.status.toLowerCase() === 'enabled' &&
    PRIMARY_CATEGORIES.some(cat => c.category.toLowerCase().includes(cat)) &&
    c.value === 0
  );

  return {
    id: 'signal-zero-value-primary',
    severity: zeroValuePrimary.length > 0 ? 'critical' : 'info',
    passed: zeroValuePrimary.length === 0,
    title: 'Zero-Value Primary Conversions',
    description: zeroValuePrimary.length > 0
      ? `${zeroValuePrimary.length} primary conversion(s) configured with $0 value — breaks value-based bidding`
      : 'All primary conversions have values configured',
    details: {
      zeroValuePrimary: zeroValuePrimary.map(c => ({
        name: c.name,
        category: c.category,
      })),
    },
    recommendation: 'Add static or dynamic values to purchase/sale conversions for ROAS optimization',
    requiresBothFiles: true,
  };
};

// ── SIGNAL CHECK #5: Attribution Window Overkill ─────────────
export const checkWindowOverkill = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  if (!adsData) {
    return {
      id: 'signal-window-overkill',
      severity: 'info',
      passed: true,
      title: 'Attribution Window Overkill',
      description: 'Upload Ads settings to check attribution windows',
      recommendation: 'Upload both files for this check',
      requiresBothFiles: true,
    };
  }

  // For purchase/immediate conversions, windows >30 days are likely overkill
  const overkill = adsData.conversions.filter(c => {
    const isPurchase = PRIMARY_CATEGORIES.some(cat =>
      c.category.toLowerCase().includes(cat)
    );
    const clickDays = parseDays(c.clickWindow);
    return isPurchase && clickDays > 30;
  });

  return {
    id: 'signal-window-overkill',
    severity: 'info',
    passed: overkill.length === 0,
    title: 'Attribution Window Overkill',
    description: overkill.length > 0
      ? `${overkill.length} purchase conversion(s) have >30 day windows — may capture unrelated conversions`
      : 'Attribution windows are appropriately sized',
    details: {
      overkillConversions: overkill.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
        category: c.category,
      })),
    },
    recommendation: 'Shorten attribution windows for purchase actions to match actual buying behavior',
    requiresBothFiles: true,
  };
};

// ── SIGNAL CHECK #6: Cross-Account Import Detection ──────────
export const checkCrossAccountImport = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  const crossAccountPatterns = [
    /^imported_/i,
    /\[mcc\]/i,
    /_shared$/i,
    /^ga4_/i,
    /^firebase_/i,
    /^sf_/i, // Salesforce imports
    /^hubspot_/i,
  ];

  const allConversions = adsData
    ? adsData.conversions.map(c => c.name)
    : reportData.conversions.map(c => c.name);

  const imported = allConversions.filter(name =>
    crossAccountPatterns.some(p => p.test(name))
  );

  return {
    id: 'signal-cross-account-import',
    severity: 'info',
    passed: imported.length === 0,
    title: 'Cross-Account Imported Conversions',
    description: imported.length > 0
      ? `${imported.length} conversion(s) appear to be imported from external sources`
      : 'No cross-account imports detected',
    details: { importedConversions: imported },
    recommendation: 'Verify imported conversions are properly deduplicated and not double-counting',
  };
};

// ── SIGNAL CHECK #7: Micro as Primary Detection ──────────────
export const checkMicroAsPrimary = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  if (!adsData) {
    // Use report data to infer
    const totalVolume = reportData.conversions.reduce((sum, c) => sum + c.conversions, 0);

    const microDominant = reportData.conversions.filter(c => {
      const cat = (c.category || c.name).toLowerCase();
      const isMicro = MICRO_CATEGORIES.some(m => cat.includes(m));
      const volumeShare = totalVolume > 0 ? c.conversions / totalVolume : 0;
      return isMicro && volumeShare > 0.5; // Micro action is >50% of volume
    });

    return {
      id: 'signal-micro-as-primary',
      severity: microDominant.length > 0 ? 'critical' : 'info',
      passed: microDominant.length === 0,
      title: 'Micro-Conversion Used as Primary',
      description: microDominant.length > 0
        ? `${microDominant.length} micro-conversion(s) dominate total volume — likely configured as primary bidding action`
        : 'No micro-conversions dominating volume',
      details: {
        microDominant: microDominant.map(c => ({
          name: c.name,
          category: c.category,
          volumeShare: Math.round((c.conversions / totalVolume) * 100),
        })),
      },
      recommendation: 'Micro-conversions (page views, scrolls) should be secondary. Set macro-conversions as primary.',
    };
  }

  const microAsPrimary = adsData.conversions.filter(c =>
    c.status.toLowerCase() === 'enabled' &&
    MICRO_CATEGORIES.some(m => c.category.toLowerCase().includes(m) || c.name.toLowerCase().includes(m))
  );

  return {
    id: 'signal-micro-as-primary',
    severity: microAsPrimary.length > 0 ? 'critical' : 'info',
    passed: microAsPrimary.length === 0,
    title: 'Micro-Conversion Enabled as Primary',
    description: microAsPrimary.length > 0
      ? `${microAsPrimary.length} micro-conversion(s) are enabled — may pollute Smart Bidding signals`
      : 'No micro-conversions enabled as primary',
    details: {
      microAsPrimary: microAsPrimary.map(c => ({
        name: c.name,
        category: c.category,
      })),
    },
    recommendation: 'Set micro-conversions (page views, scrolls, video starts) as Secondary actions',
    requiresBothFiles: true,
  };
};

// Export all signal quality checks (require report data, optionally ads data)
export const allSignalQualityChecks: Array<
  (reportData: AdsReportData, adsData: AdsData | null) => AuditCheck
> = [
  checkMicroPollution,
  checkPrimaryDilution,
  checkSecondaryLeakage,
  checkZeroValuePrimary,
  checkWindowOverkill,
  checkCrossAccountImport,
  checkMicroAsPrimary,
];

import { AdsReportData, AdsData, AuditCheck } from '../types';
import { areSimilar } from '../utils/stringDistance';

// ── A. Greedy Impression Index (VTC/Click ratio) ────────────
export const checkVTCClickRatio = (reportData: AdsReportData): AuditCheck => {
  const flagged = reportData.conversions.filter(c => {
    const clickConversions = c.conversions - c.viewThroughConversions;
    return clickConversions > 0 && c.viewThroughConversions / clickConversions > 3.0;
  });

  return {
    id: 'vtc-click-ratio',
    severity: 'warning',
    passed: flagged.length === 0,
    title: 'Greedy Impression Index',
    description:
      flagged.length > 0
        ? `${flagged.length} conversion action(s) have view-through conversions exceeding 3x click conversions — may inflate reported performance`
        : 'View-through to click ratios look healthy',
    details: {
      conversions: flagged.map(c => ({
        name: c.name,
        vtc: c.viewThroughConversions,
        clickConversions: c.conversions - c.viewThroughConversions,
        ratio: ((c.viewThroughConversions / (c.conversions - c.viewThroughConversions)) || 0).toFixed(1),
      })),
    },
    recommendation:
      'Review view-through conversion windows. Consider shortening VTC windows or excluding VTC from bidding.',
  };
};

// ── B. Leak Detector (funnel volume inversion) ──────────────
export const checkFunnelVolumeInversion = (
  reportData: AdsReportData
): AuditCheck => {
  const lowerFunnelCategories = ['purchase', 'sale', 'transaction', 'order'];
  const upperFunnelCategories = [
    'lead',
    'sign-up',
    'signup',
    'contact',
    'subscribe',
    'add_to_cart',
    'add to cart',
    'begin_checkout',
    'begin checkout',
    'page_view',
    'page view',
  ];

  const lowerVolume = reportData.conversions
    .filter(c =>
      c.category &&
      lowerFunnelCategories.some(cat => c.category!.toLowerCase().includes(cat))
    )
    .reduce((sum, c) => sum + c.conversions, 0);

  const upperVolume = reportData.conversions
    .filter(c =>
      c.category &&
      upperFunnelCategories.some(cat => c.category!.toLowerCase().includes(cat))
    )
    .reduce((sum, c) => sum + c.conversions, 0);

  const inverted = upperVolume > 0 && lowerVolume > upperVolume;

  return {
    id: 'funnel-volume-inversion',
    severity: 'info',
    passed: !inverted,
    title: 'Leak Detector',
    description: inverted
      ? `Lower-funnel conversions (${lowerVolume}) exceed upper-funnel (${upperVolume}) — possible tracking gap or missing micro-conversions`
      : 'Funnel volume progression looks normal',
    details: { lowerFunnelVolume: lowerVolume, upperFunnelVolume: upperVolume },
    recommendation:
      'Verify that all upper-funnel events (add-to-cart, begin checkout) are being tracked. Lower-funnel should not exceed upper-funnel volume.',
  };
};

// ── C. ROAS Sanity ──────────────────────────────────────────
export const checkROASSanity = (reportData: AdsReportData): AuditCheck => {
  const flagged = reportData.conversions.filter(c => {
    const roas = c.conversionValuePerCost;
    return c.conversions > 10 && (roas > 50 || (roas > 0 && roas < 0.1));
  });

  return {
    id: 'roas-sanity',
    severity: 'warning',
    passed: flagged.length === 0,
    title: 'ROAS Sanity',
    description:
      flagged.length > 0
        ? `${flagged.length} conversion action(s) have suspicious ROAS values (>50x or <0.1x with volume >10)`
        : 'ROAS values look reasonable',
    details: {
      conversions: flagged.map(c => ({
        name: c.name,
        roas: c.conversionValuePerCost,
        conversions: c.conversions,
      })),
    },
    recommendation:
      'Extremely high ROAS may indicate currency mismatch or incorrect value tracking. Very low ROAS may indicate broken value pass-through.',
  };
};

// ── D. Active Duplicates (cross-check) ──────────────────────
export const checkActiveDuplicates = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  const activeConversions = reportData.conversions.filter(c => c.conversions > 0);
  const pairs: Array<{ name1: string; name2: string; vol1: number; vol2: number }> = [];

  for (let i = 0; i < activeConversions.length; i++) {
    for (let j = i + 1; j < activeConversions.length; j++) {
      const a = activeConversions[i];
      const b = activeConversions[j];
      if (areSimilar(a.name, b.name)) {
        pairs.push({
          name1: a.name,
          name2: b.name,
          vol1: a.conversions,
          vol2: b.conversions,
        });
      }
    }
  }

  // Also check against settings data if available
  if (adsData) {
    const settingsNames = adsData.conversions.map(c => c.name);
    const reportNames = reportData.conversions
      .filter(c => c.conversions > 0)
      .map(c => c.name);

    for (const sName of settingsNames) {
      for (const rName of reportNames) {
        if (
          sName.toLowerCase() !== rName.toLowerCase() &&
          areSimilar(sName, rName) &&
          !pairs.some(
            p =>
              (p.name1 === sName && p.name2 === rName) ||
              (p.name1 === rName && p.name2 === sName)
          )
        ) {
          const rc = reportData.conversions.find(c => c.name === rName);
          pairs.push({
            name1: sName,
            name2: rName,
            vol1: 0,
            vol2: rc?.conversions ?? 0,
          });
        }
      }
    }
  }

  return {
    id: 'volume-weighted-duplicates',
    severity: 'critical',
    passed: pairs.length === 0,
    title: 'Active Duplicates',
    description:
      pairs.length > 0
        ? `${pairs.length} pair(s) of similar conversion names with active volume — likely double-counting`
        : 'No duplicate active conversions detected',
    details: { duplicatePairs: pairs },
    recommendation:
      'Consolidate duplicate conversion actions. Active duplicates inflate reported conversions and corrupt Smart Bidding signals.',
    requiresBothFiles: true,
  };
};

// ── E. Attribution Drift ────────────────────────────────────
export const checkAttributionDrift = (reportData: AdsReportData): AuditCheck => {
  const flagged = reportData.conversions.filter(c => {
    if (c.conversions === 0 || c.currentModelAttributedConversions === 0) return false;
    const diff = Math.abs(c.currentModelAttributedConversions - c.conversions);
    return diff / c.conversions > 0.5;
  });

  return {
    id: 'model-attribution-drift',
    severity: 'info',
    passed: flagged.length === 0,
    title: 'Attribution Drift',
    description:
      flagged.length > 0
        ? `${flagged.length} conversion action(s) show >50% difference between model-attributed and standard conversions`
        : 'Model-attributed and standard conversions are aligned',
    details: {
      conversions: flagged.map(c => ({
        name: c.name,
        standard: c.conversions,
        modelAttributed: c.currentModelAttributedConversions,
        driftPct: Math.round(
          (Math.abs(c.currentModelAttributedConversions - c.conversions) /
            c.conversions) *
            100
        ),
      })),
    },
    recommendation:
      'Large drift suggests your attribution model is significantly re-distributing credit. Review model settings and ensure the selected model aligns with your measurement strategy.',
  };
};

// ── F. Concentration Risk ───────────────────────────────────
export const checkConversionConcentration = (
  reportData: AdsReportData
): AuditCheck => {
  const totalVolume = reportData.conversions.reduce(
    (sum, c) => sum + c.conversions,
    0
  );

  if (totalVolume === 0) {
    return {
      id: 'conversion-concentration',
      severity: 'warning',
      passed: true,
      title: 'Concentration Risk',
      description: 'No conversion volume to evaluate',
      recommendation: 'Ensure conversions are tracking properly.',
    };
  }

  const dominant = reportData.conversions.find(
    c => c.conversions / totalVolume > 0.9
  );

  return {
    id: 'conversion-concentration',
    severity: 'warning',
    passed: !dominant,
    title: 'Concentration Risk',
    description: dominant
      ? `"${dominant.name}" accounts for ${Math.round((dominant.conversions / totalVolume) * 100)}% of total volume — single point of failure`
      : 'Conversion volume is reasonably distributed',
    details: dominant
      ? {
          dominantAction: dominant.name,
          volume: dominant.conversions,
          totalVolume,
          percentage: Math.round((dominant.conversions / totalVolume) * 100),
        }
      : {},
    recommendation:
      'Diversify conversion tracking. If your dominant action breaks, you lose all Smart Bidding signal. Add backup conversion actions.',
  };
};

// ── G. Ghost Conversions (cross-check) ──────────────────────
export const checkGhostConversions = (
  reportData: AdsReportData,
  adsData: AdsData | null
): AuditCheck => {
  if (!adsData) {
    return {
      id: 'ghost-conversions',
      severity: 'critical',
      passed: true,
      title: 'Ghost Conversions',
      description:
        'Upload Ads settings CSV to cross-check enabled conversions against actual volume',
      recommendation: 'Upload both files for this cross-check.',
      requiresBothFiles: true,
    };
  }

  const enabledSettings = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const ghosts = enabledSettings.filter(setting => {
    const reportMatch = reportData.conversions.find(
      r => r.name.toLowerCase().trim() === setting.name.toLowerCase().trim()
    );
    return !reportMatch || reportMatch.conversions === 0;
  });

  return {
    id: 'ghost-conversions',
    severity: 'critical',
    passed: ghosts.length === 0,
    title: 'Ghost Conversions',
    description:
      ghosts.length > 0
        ? `${ghosts.length} conversion(s) are enabled in settings but show zero volume in the performance report`
        : 'All enabled conversions have active volume',
    details: { ghostConversions: ghosts.map(c => c.name) },
    recommendation:
      'Investigate why enabled conversions have no volume. Possible causes: broken tag, wrong trigger, or recently added action.',
    requiresBothFiles: true,
  };
};

// ── H. Signal Pollution (micro > 100x macro) ────────────────
export const checkMicroConversionPollution = (
  reportData: AdsReportData
): AuditCheck => {
  const macroCategories = ['purchase', 'sale', 'transaction', 'order'];
  const microCategories = [
    'page_view',
    'page view',
    'other',
    'default',
    'sign-up',
    'signup',
    'subscribe',
  ];

  const macroVolume = reportData.conversions
    .filter(c =>
      c.category &&
      macroCategories.some(cat => c.category!.toLowerCase().includes(cat))
    )
    .reduce((sum, c) => sum + c.conversions, 0);

  const microVolume = reportData.conversions
    .filter(c =>
      c.category &&
      microCategories.some(cat => c.category!.toLowerCase().includes(cat))
    )
    .reduce((sum, c) => sum + c.conversions, 0);

  const polluted = macroVolume > 0 && microVolume > macroVolume * 100;

  return {
    id: 'micro-conversion-pollution',
    severity: 'warning',
    passed: !polluted,
    title: 'Signal Pollution',
    description: polluted
      ? `Micro-conversion volume (${microVolume}) is >100x macro-conversion volume (${macroVolume}) — may dilute Smart Bidding signals`
      : 'Micro/macro conversion ratio is acceptable',
    details: { microVolume, macroVolume },
    recommendation:
      'Set micro-conversions as "Secondary" so they do not interfere with Smart Bidding optimization for primary actions.',
  };
};

// ── I. Primary Gap (all_conversions > 2x conversions) ───────
export const checkAllVsPrimaryGap = (reportData: AdsReportData): AuditCheck => {
  const flagged = reportData.conversions.filter(c => {
    return c.conversions > 0 && c.allConversions > c.conversions * 2;
  });

  return {
    id: 'all-vs-primary-gap',
    severity: 'info',
    passed: flagged.length === 0,
    title: 'Primary Gap',
    description:
      flagged.length > 0
        ? `${flagged.length} conversion action(s) where "All conversions" is more than 2x "Conversions" — hidden secondary volume`
        : '"All conversions" and "Conversions" are aligned',
    details: {
      conversions: flagged.map(c => ({
        name: c.name,
        conversions: c.conversions,
        allConversions: c.allConversions,
        ratio: (c.allConversions / c.conversions).toFixed(1),
      })),
    },
    recommendation:
      'Large gaps mean significant volume is marked "Secondary." Review whether these actions should be Primary for bidding.',
  };
};

// ── J. Value Instability (VAL_AVG varies > 10x in same cat) ─
export const checkValueInstability = (reportData: AdsReportData): AuditCheck => {
  // Group by category
  const byCategory: Record<string, number[]> = {};
  for (const c of reportData.conversions) {
    const cat = c.category || 'uncategorized';
    if (c.valuePerConversion > 0) {
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(c.valuePerConversion);
    }
  }

  const unstableCategories: Array<{
    category: string;
    min: number;
    max: number;
    ratio: number;
  }> = [];

  for (const [cat, values] of Object.entries(byCategory)) {
    if (values.length < 2) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min > 0 && max / min > 10) {
      unstableCategories.push({
        category: cat,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        ratio: Math.round(max / min),
      });
    }
  }

  return {
    id: 'value-instability',
    severity: 'warning',
    passed: unstableCategories.length === 0,
    title: 'Value Instability',
    description:
      unstableCategories.length > 0
        ? `${unstableCategories.length} category/categories with >10x variation in average conversion value`
        : 'Conversion values are stable within categories',
    details: { unstableCategories },
    recommendation:
      'Extreme value variation within a category may indicate currency mismatches, test transactions, or broken value tracking. Investigate outlier values.',
  };
};

// ── K. Whale Check (>50% value from <10% volume) ────────────
export const checkWhaleConversion = (reportData: AdsReportData): AuditCheck => {
  const totalValue = reportData.conversions.reduce(
    (sum, c) => sum + c.conversionsValue,
    0
  );
  const totalVolume = reportData.conversions.reduce(
    (sum, c) => sum + c.conversions,
    0
  );

  if (totalValue === 0 || totalVolume === 0) {
    return {
      id: 'whale-conversion',
      severity: 'info',
      passed: true,
      title: 'Whale Check',
      description: 'No conversion value/volume to evaluate',
      recommendation: 'Ensure conversion values are being tracked.',
    };
  }

  // Sort by value descending, find if top actions with <10% volume drive >50% value
  const sorted = [...reportData.conversions].sort(
    (a, b) => b.conversionsValue - a.conversionsValue
  );

  let cumulativeValue = 0;
  let cumulativeVolume = 0;
  const whales: string[] = [];

  for (const c of sorted) {
    cumulativeValue += c.conversionsValue;
    cumulativeVolume += c.conversions;
    whales.push(c.name);
    if (cumulativeValue >= totalValue * 0.5) break;
  }

  const whaleVolumePct = (cumulativeVolume / totalVolume) * 100;
  const isWhale = whaleVolumePct < 10;

  return {
    id: 'whale-conversion',
    severity: 'info',
    passed: !isWhale,
    title: 'Whale Check',
    description: isWhale
      ? `${Math.round(whaleVolumePct)}% of volume drives >50% of value — high revenue concentration risk`
      : 'Value is reasonably distributed across conversion volume',
    details: isWhale
      ? {
          whaleActions: whales,
          whaleVolumePct: Math.round(whaleVolumePct),
          whaleValuePct: 50,
        }
      : {},
    recommendation:
      'High value concentration means a few conversions drive most revenue. Monitor these closely and ensure their tracking is rock-solid.',
  };
};

// ── Export arrays ────────────────────────────────────────────

// Pure report checks (only need report data)
export const allReportChecks: Array<(reportData: AdsReportData) => AuditCheck> = [
  checkVTCClickRatio,
  checkFunnelVolumeInversion,
  checkROASSanity,
  checkAttributionDrift,
  checkConversionConcentration,
  checkMicroConversionPollution,
  checkAllVsPrimaryGap,
  checkValueInstability,
  checkWhaleConversion,
];

// Cross-reference checks (need report data + optional ads settings)
export const allReportCrossChecks: Array<
  (reportData: AdsReportData, adsData: AdsData | null) => AuditCheck
> = [checkActiveDuplicates, checkGhostConversions];

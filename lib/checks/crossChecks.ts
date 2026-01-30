import { GTMContainer, AdsData, AuditCheck, AuditContext } from '../types';

// ── CRITICAL CROSS-CHECK #1 ─────────────────────────────────
export const checkAdsConversionHasGTMTag = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const enabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const gtmTags = gtmData.containerVersion.tag || [];
  const gtmConversionTags = gtmTags.filter(
    tag => tag.type === 'awct' || tag.type === 'gaawe'
  );

  // Stringify all GTM conversion tags for matching
  const gtmTagsStr = JSON.stringify(gtmConversionTags).toLowerCase();

  const missingTags = enabledConversions.filter(conv => {
    const nameLC = conv.name.toLowerCase();
    // Check if conversion name appears in any GTM tag (name or parameters)
    return !gtmTagsStr.includes(nameLC);
  });

  return {
    id: 'ads-conversion-missing-gtm-tag',
    severity: 'critical',
    passed: missingTags.length === 0,
    title: 'Google Ads Conversions Missing GTM Tags',
    description:
      missingTags.length > 0
        ? `${missingTags.length} enabled conversion(s) in Google Ads have no corresponding GTM tag`
        : 'All enabled Ads conversions have GTM tags',
    details: { missingConversions: missingTags.map(c => c.name) },
    recommendation:
      'Create GTM conversion tags for these Ads conversion actions, or disable unused conversions',
    requiresBothFiles: true,
  };
};

// ── CRITICAL CROSS-CHECK #2 ─────────────────────────────────
export const checkGTMTagNotInAds = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const gtmTags = gtmData.containerVersion.tag || [];
  const conversionTags = gtmTags.filter(tag => tag.type === 'awct');

  if (conversionTags.length === 0) {
    return {
      id: 'gtm-tag-not-in-ads',
      severity: 'critical',
      passed: true,
      title: 'GTM Conversion Tags Not in Ads',
      description: 'No GTM conversion tags to check',
      recommendation: 'No action needed',
      requiresBothFiles: true,
    };
  }

  const adsNamesStr = JSON.stringify(
    adsData.conversions.map(c => c.name)
  ).toLowerCase();

  const orphanedTags = conversionTags.filter(tag => {
    const tagStr = JSON.stringify(tag).toLowerCase();
    // Check if any ads conversion name appears in the tag
    return !adsData.conversions.some(conv =>
      tagStr.includes(conv.name.toLowerCase())
    );
  });

  return {
    id: 'gtm-tag-not-in-ads',
    severity: 'critical',
    passed: orphanedTags.length === 0,
    title: 'GTM Conversion Tags Not in Ads',
    description:
      orphanedTags.length > 0
        ? `${orphanedTags.length} GTM conversion tag(s) don't match any Ads conversion`
        : 'All GTM conversion tags match Ads conversions',
    details: { orphanedTags: orphanedTags.map(t => t.name) },
    recommendation:
      'Create matching conversions in Ads or remove orphaned GTM tags',
    requiresBothFiles: true,
  };
};

// ── CRITICAL CROSS-CHECK #3 (Context-Aware) ─────────────────
export const checkMismatchedValues = (
  gtmData: GTMContainer,
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const gtmTags = gtmData.containerVersion.tag || [];
  const conversionTags = gtmTags.filter(tag => tag.type === 'awct');

  if (conversionTags.length === 0 || adsData.conversions.length === 0) {
    return {
      id: 'mismatched-values',
      severity: 'critical',
      passed: true,
      title: 'Mismatched Conversion Values',
      description: 'No data to compare',
      recommendation: 'Ensure GTM and Ads conversion values match',
      requiresBothFiles: true,
    };
  }

  const mismatches: Array<{ tagName: string; gtmValue: string; adsValue: number }> = [];

  conversionTags.forEach(tag => {
    const valueParam = tag.parameter?.find(p => p.key === 'conversionValue');
    if (!valueParam) return;

    const gtmValue = valueParam.value;
    const isDynamic = gtmValue.startsWith('{{');

    // If GTM sends dynamic and user wants dynamic, that's fine
    if (isDynamic && context?.valueStrategy === 'dynamic') return;

    // If GTM sends a fixed value, check if it matches any Ads conversion value
    if (!isDynamic) {
      const gtmNumericValue = parseFloat(gtmValue) || 0;
      const adsConversions = adsData.conversions.filter(c => c.value > 0);
      const hasMatch = adsConversions.some(
        c => Math.abs(c.value - gtmNumericValue) < 0.01
      );
      if (!hasMatch && adsConversions.length > 0) {
        mismatches.push({
          tagName: tag.name,
          gtmValue,
          adsValue: adsConversions[0]?.value || 0,
        });
      }
    }
  });

  return {
    id: 'mismatched-values',
    severity: 'critical',
    passed: mismatches.length === 0,
    title: 'Mismatched Conversion Values',
    description:
      mismatches.length > 0
        ? `${mismatches.length} conversion tag(s) have values that don't match Ads settings`
        : 'GTM and Ads conversion values are consistent',
    details: { mismatches },
    recommendation: 'Make values consistent between GTM and Ads',
    requiresBothFiles: true,
  };
};

// ── WARNING CROSS-CHECK #4 ──────────────────────────────────
export const checkTagCountMismatch = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const gtmTags = gtmData.containerVersion.tag || [];
  const gtmConversionCount = gtmTags.filter(tag => tag.type === 'awct').length;
  const adsConversionCount = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  ).length;

  if (gtmConversionCount === 0 && adsConversionCount === 0) {
    return {
      id: 'tag-count-mismatch',
      severity: 'warning',
      passed: true,
      title: 'Tag Count Mismatch',
      description: 'No conversion tags or conversions to compare',
      recommendation: 'No action needed',
      requiresBothFiles: true,
    };
  }

  const diff = Math.abs(gtmConversionCount - adsConversionCount);
  const max = Math.max(gtmConversionCount, adsConversionCount);
  const mismatchRatio = max > 0 ? diff / max : 0;

  // Flag if difference is more than 50% of the larger count
  const hasMismatch = mismatchRatio > 0.5 && diff >= 2;

  return {
    id: 'tag-count-mismatch',
    severity: 'warning',
    passed: !hasMismatch,
    title: 'Tag Count Mismatch',
    description: hasMismatch
      ? `GTM has ${gtmConversionCount} conversion tags but Ads has ${adsConversionCount} enabled conversions`
      : `GTM (${gtmConversionCount} tags) and Ads (${adsConversionCount} conversions) counts are aligned`,
    details: { gtmConversionCount, adsConversionCount, diff },
    recommendation: 'Review for duplicates or missing conversions',
    requiresBothFiles: true,
  };
};

// Export all cross-checks
export const allCrossChecks = [
  checkAdsConversionHasGTMTag,
  checkGTMTagNotInAds,
  checkMismatchedValues,
  checkTagCountMismatch,
];

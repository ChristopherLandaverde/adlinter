import { GTMContainer, AdsData, AuditCheck, AuditContext } from '../types';

// ── VALUE PASSING & INTEGRATION ─────────────────────────────

// CRITICAL: Dynamic Value Passing Validation
export const checkDynamicValuePassing = (
  gtmData: GTMContainer,
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  if (context?.valueStrategy !== 'dynamic') {
    return {
      id: 'dynamic-value-passing',
      severity: 'info',
      passed: true,
      title: 'Dynamic Value Passing Check',
      description: 'Not using dynamic values',
      recommendation: 'N/A',
      requiresBothFiles: true,
    };
  }

  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const issues: Array<{ tag: string; issue: string }> = [];

  conversionTags.forEach(tag => {
    const valueParam = tag.parameter?.find(
      p => p.key === 'conversionValue' || p.key === 'value'
    );

    if (!valueParam) {
      issues.push({ tag: tag.name, issue: 'No value parameter configured' });
      return;
    }

    const valueString = JSON.stringify(valueParam);

    if (valueParam.value && !valueParam.value.includes('{{')) {
      const isNumeric = !isNaN(parseFloat(valueParam.value));
      if (isNumeric) {
        issues.push({
          tag: tag.name,
          issue: `Hardcoded value ($${valueParam.value}) instead of dynamic variable`,
        });
      }
    }

    if (valueString.includes('{{')) {
      const varMatch = valueString.match(/\{\{([^}]+)\}\}/);
      if (!varMatch) {
        issues.push({
          tag: tag.name,
          issue: 'Malformed variable reference in value parameter',
        });
      }
    }
  });

  const purchaseConversions = adsData.conversions.filter(c =>
    (c.category.toLowerCase().includes('purchase') ||
     c.category.toLowerCase().includes('sale')) &&
    c.status.toLowerCase() === 'enabled'
  );

  const tagsWithDynamicValues = conversionTags.filter(tag => {
    const valueParam = tag.parameter?.find(
      p => p.key === 'conversionValue' || p.key === 'value'
    );
    return valueParam && JSON.stringify(valueParam).includes('{{');
  }).length;

  const adsWithFixedValues = purchaseConversions.filter(
    c => c.value > 0 && c.value !== 1
  );

  if (tagsWithDynamicValues > 0 && adsWithFixedValues.length > 0) {
    issues.push({
      tag: 'Configuration Mismatch',
      issue: `GTM sends dynamic values but ${adsWithFixedValues.length} Ads conversions have fixed values`,
    });
  }

  return {
    id: 'dynamic-value-passing',
    severity: 'critical',
    passed: issues.length === 0,
    title: 'Dynamic Value Passing Validation',
    description: issues.length > 0
      ? `Found ${issues.length} value passing issues`
      : 'Dynamic values configured correctly',
    details: {
      issues,
      conversionTagCount: conversionTags.length,
      tagsWithDynamicValues,
    },
    recommendation: 'Ensure GTM passes dynamic values using dataLayer variables and Ads conversions are set to use transaction-specific value',
    requiresBothFiles: true,
  };
};

// CRITICAL: Conversion ID/Label Matching
export const checkConversionLabelMatching = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const gtmLabels = conversionTags.map(tag => {
    const conversionIdParam = tag.parameter?.find(p => p.key === 'conversionId');
    const conversionLabelParam = tag.parameter?.find(p => p.key === 'conversionLabel');

    return {
      tagName: tag.name,
      conversionId: conversionIdParam?.value || '',
      conversionLabel: conversionLabelParam?.value || '',
      sendTo: `${conversionIdParam?.value}/${conversionLabelParam?.value}`,
    };
  });

  const adsConversions = adsData.conversions
    .filter(c => c.status.toLowerCase() === 'enabled')
    .map(c => c.name);

  const matchingIssues: Array<{ gtmTag: string; issue: string }> = [];

  gtmLabels.forEach(label => {
    if (!label.conversionId || !label.conversionLabel) {
      matchingIssues.push({
        gtmTag: label.tagName,
        issue: 'Missing conversion ID or label',
      });
      return;
    }

    if (label.conversionLabel.includes('{{')) {
      matchingIssues.push({
        gtmTag: label.tagName,
        issue: 'Conversion label uses variable - verify it matches Ads',
      });
    }

    const tagNameLower = label.tagName.toLowerCase();
    const possibleMatch = adsConversions.find(adsName =>
      tagNameLower.includes(adsName.toLowerCase()) ||
      adsName.toLowerCase().includes(tagNameLower)
    );

    if (!possibleMatch) {
      matchingIssues.push({
        gtmTag: label.tagName,
        issue: 'Cannot find matching Ads conversion action',
      });
    }
  });

  return {
    id: 'conversion-label-matching',
    severity: 'critical',
    passed: matchingIssues.length === 0,
    title: 'Conversion ID/Label Matching',
    description: matchingIssues.length > 0
      ? `${matchingIssues.length} GTM conversion tags may not match Ads conversions`
      : 'All GTM conversion tags appear to match Ads conversions',
    details: {
      gtmLabels,
      adsConversions,
      issues: matchingIssues,
    },
    recommendation: 'Verify conversion IDs and labels in GTM match exactly with Google Ads conversion actions',
    requiresBothFiles: true,
  };
};

// WARNING: Currency Code Consistency (Cross)
export const checkCurrencyCodeConsistency = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const gtmCurrencies = new Set<string>();
  conversionTags.forEach(tag => {
    const currencyParam = tag.parameter?.find(
      p => p.key === 'currencyCode' || p.key === 'currency'
    );
    if (currencyParam?.value && !currencyParam.value.includes('{{')) {
      gtmCurrencies.add(currencyParam.value);
    }
  });

  const adsCurrencies = new Set(
    adsData.conversions.map(c => (c as any).currency).filter(Boolean)
  );

  if (gtmCurrencies.size === 0 && adsCurrencies.size === 0) {
    return {
      id: 'currency-consistency-cross',
      severity: 'info',
      passed: true,
      title: 'Currency Code Consistency',
      description: 'Currency information not available in exports',
      recommendation: 'Verify currency codes match in GTM tags and Google Ads UI',
      requiresBothFiles: true,
    };
  }

  const gtmCurrencyArray = Array.from(gtmCurrencies);
  const adsCurrencyArray = Array.from(adsCurrencies);

  const mismatch = gtmCurrencyArray.some(
    gtmCurr => adsCurrencyArray.length > 0 && !adsCurrencyArray.includes(gtmCurr)
  );

  return {
    id: 'currency-consistency-cross',
    severity: 'warning',
    passed: !mismatch,
    title: 'GTM-Ads Currency Code Consistency',
    description: mismatch
      ? `Currency codes may not match: GTM uses ${gtmCurrencyArray.join(', ')}, Ads uses ${adsCurrencyArray.join(', ')}`
      : 'Currency codes appear consistent',
    details: { gtmCurrencies: gtmCurrencyArray, adsCurrencies: adsCurrencyArray },
    recommendation: 'Ensure currency codes match exactly between GTM and Google Ads',
    requiresBothFiles: true,
  };
};

// WARNING: Transaction ID Deduplication
export const checkTransactionIdDeduplication = (
  gtmData: GTMContainer,
  _adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  if (context?.businessModel !== 'ecommerce') {
    return {
      id: 'transaction-id-deduplication',
      severity: 'info',
      passed: true,
      title: 'Transaction ID Deduplication',
      description: 'Not applicable for non-e-commerce',
      recommendation: 'N/A',
      requiresBothFiles: true,
    };
  }

  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const tagsWithoutOrderId: string[] = [];

  conversionTags.forEach(tag => {
    const hasOrderId = tag.parameter?.some(p =>
      p.key === 'orderId' ||
      p.key === 'order_id' ||
      p.key === 'transactionId' ||
      p.key === 'transaction_id'
    );

    if (!hasOrderId) {
      tagsWithoutOrderId.push(tag.name);
    }
  });

  return {
    id: 'transaction-id-deduplication',
    severity: 'warning',
    passed: tagsWithoutOrderId.length === 0,
    title: 'Transaction ID Deduplication',
    description: tagsWithoutOrderId.length > 0
      ? `${tagsWithoutOrderId.length} conversion tags don't send transaction IDs (risk of duplicate conversions)`
      : 'All conversion tags send transaction IDs for deduplication',
    details: { tagsWithoutOrderId },
    recommendation: 'Add order_id or transaction_id parameter to prevent duplicate conversion counting',
    requiresBothFiles: true,
  };
};

// ── ENHANCED CONVERSIONS & USER DATA ────────────────────────

// CRITICAL: Enhanced Conversions User Data Quality
export const checkEnhancedConversionsUserData = (
  gtmData: GTMContainer,
  _adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const enhancedTags: Array<{
    name: string;
    hasEmail: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
    issues: string[];
  }> = [];

  conversionTags.forEach(tag => {
    const tagString = JSON.stringify(tag);
    const hasEnhancedParam = tag.parameter?.some(
      p => p.key === 'enhanced_conversion_data' || p.key === 'user_data'
    );

    if (hasEnhancedParam || tagString.toLowerCase().includes('enhanced')) {
      const issues: string[] = [];

      const hasEmail = tagString.includes('email') || tagString.includes('em');
      const hasPhone = tagString.includes('phone') || tagString.includes('ph');
      const hasAddress = tagString.includes('address') || tagString.includes('adr');

      if (!hasEmail) issues.push('Missing email');
      if (!hasPhone && !hasAddress) {
        issues.push('Missing phone and address (need at least one)');
      }

      if (hasEmail && !tagString.includes('sha256') && !tagString.includes('hash')) {
        issues.push('Email may not be hashed (SHA-256 required)');
      }

      enhancedTags.push({ name: tag.name, hasEmail, hasPhone, hasAddress, issues });
    }
  });

  if (enhancedTags.length === 0) {
    return {
      id: 'enhanced-conversions-user-data',
      severity: 'info',
      passed: true,
      title: 'Enhanced Conversions User Data',
      description: 'Enhanced conversions not enabled',
      recommendation: 'Consider enabling enhanced conversions for better attribution',
      requiresBothFiles: true,
    };
  }

  const tagsWithIssues = enhancedTags.filter(t => t.issues.length > 0);

  return {
    id: 'enhanced-conversions-user-data',
    severity: 'critical',
    passed: tagsWithIssues.length === 0,
    title: 'Enhanced Conversions User Data Quality',
    description: tagsWithIssues.length > 0
      ? `${tagsWithIssues.length} of ${enhancedTags.length} enhanced conversion tags have data quality issues`
      : `All ${enhancedTags.length} enhanced conversion tags properly configured`,
    details: { enhancedTags, tagsWithIssues },
    recommendation: 'Ensure enhanced conversion tags collect email (hashed with SHA-256) plus phone or address',
    requiresBothFiles: true,
  };
};

// WARNING: User ID Consistency
export const checkUserIdConsistency = (
  gtmData: GTMContainer,
  _adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const tagsWithUserId = conversionTags.filter(tag =>
    tag.parameter?.some(p => p.key === 'user_id' || p.key === 'userId')
  );

  const tagsWithoutUserId = conversionTags.filter(tag =>
    !tag.parameter?.some(p => p.key === 'user_id' || p.key === 'userId')
  );

  if (tagsWithUserId.length > 0 && tagsWithoutUserId.length > 0) {
    return {
      id: 'user-id-consistency',
      severity: 'warning',
      passed: false,
      title: 'Inconsistent User ID Implementation',
      description: `${tagsWithUserId.length} tags send user IDs but ${tagsWithoutUserId.length} don't`,
      details: {
        tagsWithUserId: tagsWithUserId.map(t => t.name),
        tagsWithoutUserId: tagsWithoutUserId.map(t => t.name),
      },
      recommendation: 'Implement user IDs consistently across all conversion tags for better cross-device tracking',
      requiresBothFiles: true,
    };
  }

  if (tagsWithUserId.length === 0) {
    return {
      id: 'user-id-consistency',
      severity: 'info',
      passed: true,
      title: 'User ID Tracking',
      description: 'User IDs not implemented (optional but recommended for logged-in users)',
      recommendation: 'Consider adding user IDs for authenticated users to improve cross-device attribution',
      requiresBothFiles: true,
    };
  }

  return {
    id: 'user-id-consistency',
    severity: 'info',
    passed: true,
    title: 'User ID Tracking',
    description: `All ${tagsWithUserId.length} conversion tags send user IDs`,
    recommendation: 'Continue sending user IDs for better attribution',
    requiresBothFiles: true,
  };
};

// INFO: First-Party Data Collection Completeness
export const checkFirstPartyDataCompleteness = (
  gtmData: GTMContainer,
  _adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  if (conversionTags.length === 0) {
    return {
      id: 'first-party-data-completeness',
      severity: 'info',
      passed: true,
      title: 'First-Party Data Collection Completeness',
      description: 'No conversion tags to analyze',
      recommendation: 'N/A',
      requiresBothFiles: true,
    };
  }

  const dataPoints: Record<string, number> = {
    email: 0,
    phone: 0,
    address: 0,
    firstName: 0,
    lastName: 0,
    city: 0,
    region: 0,
    postalCode: 0,
    country: 0,
  };

  conversionTags.forEach(tag => {
    const tagString = JSON.stringify(tag).toLowerCase();

    if (tagString.includes('email') || tagString.includes('em')) dataPoints.email++;
    if (tagString.includes('phone') || tagString.includes('ph')) dataPoints.phone++;
    if (tagString.includes('address')) dataPoints.address++;
    if (tagString.includes('firstname') || tagString.includes('fn')) dataPoints.firstName++;
    if (tagString.includes('lastname') || tagString.includes('ln')) dataPoints.lastName++;
    if (tagString.includes('city') || tagString.includes('ct')) dataPoints.city++;
    if (tagString.includes('region') || tagString.includes('st')) dataPoints.region++;
    if (tagString.includes('postal') || tagString.includes('zip')) dataPoints.postalCode++;
    if (tagString.includes('country') || tagString.includes('co')) dataPoints.country++;
  });

  const totalDataPoints = Object.values(dataPoints).reduce((a, b) => a + b, 0);
  const completenessScore =
    (totalDataPoints / (Object.keys(dataPoints).length * conversionTags.length)) * 100;

  return {
    id: 'first-party-data-completeness',
    severity: 'info',
    passed: completenessScore >= 50,
    title: 'First-Party Data Collection Completeness',
    description: `Collecting ${completenessScore.toFixed(0)}% of possible first-party data points`,
    details: {
      dataPoints,
      conversionTagCount: conversionTags.length,
      completenessScore,
    },
    recommendation: completenessScore < 50
      ? 'Collect more first-party data (email, phone, address) for better conversion matching'
      : 'Good first-party data collection',
    requiresBothFiles: true,
  };
};

// ── TRACKING QUALITY & RELIABILITY ──────────────────────────

// CRITICAL: Conversion Callback Implementation
export const checkConversionCallbacks = (
  gtmData: GTMContainer,
  _adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const triggers = gtmData.containerVersion.trigger || [];

  const navigationTriggers = triggers
    .filter(t =>
      t.type === 'formSubmit' ||
      t.type === 'linkClick' ||
      t.name.toLowerCase().includes('click')
    )
    .map(t => t.triggerId);

  const tagsWithoutCallbacks: Array<{
    tag: string;
    trigger: string;
    issue: string;
  }> = [];

  conversionTags.forEach(tag => {
    const firingTriggers = tag.firingTriggerId || [];
    const firesOnNavigation = firingTriggers.some(id =>
      navigationTriggers.includes(id)
    );

    if (firesOnNavigation) {
      const tagString = JSON.stringify(tag);
      const hasCallback =
        tagString.includes('eventCallback') ||
        tagString.includes('event_callback');
      const hasSequencing =
        (tag.setupTag && tag.setupTag.length > 0) ||
        ((tag as any).blockingTag && (tag as any).blockingTag.length > 0);

      if (!hasCallback && !hasSequencing) {
        const triggerNames = firingTriggers
          .map(id => triggers.find(t => t.triggerId === id)?.name)
          .filter(Boolean);

        tagsWithoutCallbacks.push({
          tag: tag.name,
          trigger: triggerNames.join(', '),
          issue: 'No callback or sequencing - may miss conversions on redirect',
        });
      }
    }
  });

  return {
    id: 'conversion-callbacks',
    severity: 'critical',
    passed: tagsWithoutCallbacks.length === 0,
    title: 'Conversion Callback Implementation',
    description: tagsWithoutCallbacks.length > 0
      ? `${tagsWithoutCallbacks.length} conversion tags may miss conversions on page redirect`
      : 'All critical conversion tags have proper callbacks or sequencing',
    details: { tagsWithoutCallbacks },
    recommendation: 'Add event callbacks or tag sequencing to conversion tags that fire on form submits or clicks',
    requiresBothFiles: true,
  };
};

// WARNING: Conversion Funnel Coverage
export const checkConversionFunnelCoverage = (
  _gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const adsConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const funnelStages: Record<string, number> = {
    awareness: adsConversions.filter(c =>
      c.category.toLowerCase().includes('page view') ||
      c.category.toLowerCase().includes('visit') ||
      c.name.toLowerCase().includes('landing')
    ).length,
    consideration: adsConversions.filter(c =>
      c.category.toLowerCase().includes('engagement') ||
      c.category.toLowerCase().includes('video') ||
      c.name.toLowerCase().includes('cart') ||
      c.name.toLowerCase().includes('product')
    ).length,
    conversion: adsConversions.filter(c =>
      c.category.toLowerCase().includes('purchase') ||
      c.category.toLowerCase().includes('sale') ||
      c.category.toLowerCase().includes('lead') ||
      c.category.toLowerCase().includes('signup')
    ).length,
    retention: adsConversions.filter(c =>
      c.name.toLowerCase().includes('repeat') ||
      c.name.toLowerCase().includes('return') ||
      c.name.toLowerCase().includes('subscription')
    ).length,
  };

  const missingStages = Object.entries(funnelStages)
    .filter(([, count]) => count === 0)
    .map(([stage]) => stage);

  return {
    id: 'conversion-funnel-coverage',
    severity: 'warning',
    passed: missingStages.length <= 1,
    title: 'Conversion Tracking Funnel Coverage',
    description: missingStages.length > 1
      ? `Missing tracking for funnel stages: ${missingStages.join(', ')}`
      : 'Tracking conversions across funnel stages',
    details: { funnelStages, missingStages },
    recommendation: 'Consider tracking micro-conversions at each funnel stage for better optimization',
    requiresBothFiles: true,
  };
};

// INFO: Conversion Naming Alignment
export const checkConversionNamingAlignment = (
  gtmData: GTMContainer,
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionTags = gtmData.containerVersion.tag?.filter(
    tag => tag.type === 'awct'
  ) || [];

  const adsConversionNames = adsData.conversions
    .filter(c => c.status.toLowerCase() === 'enabled')
    .map(c => c.name.toLowerCase());

  const namingMismatches: Array<{
    gtmTag: string;
    possibleMatch: string | null;
    similarity: number;
  }> = [];

  conversionTags.forEach(tag => {
    const tagNameLower = tag.name.toLowerCase();

    let bestMatchName = '';
    let bestMatchSimilarity = 0;

    adsConversionNames.forEach(adsName => {
      const tagWords = tagNameLower.split(/\s+/);
      const adsWords = adsName.split(/\s+/);

      const matchingWords = tagWords.filter(word =>
        adsWords.some(adsWord => adsWord.includes(word) || word.includes(adsWord))
      ).length;

      const similarity = matchingWords / Math.max(tagWords.length, adsWords.length);

      if (similarity > bestMatchSimilarity) {
        bestMatchName = adsName;
        bestMatchSimilarity = similarity;
      }
    });

    if (adsConversionNames.length > 0 && bestMatchSimilarity < 0.5) {
      namingMismatches.push({
        gtmTag: tag.name,
        possibleMatch: bestMatchName || null,
        similarity: bestMatchSimilarity,
      });
    }
  });

  return {
    id: 'conversion-naming-alignment',
    severity: 'info',
    passed: namingMismatches.length === 0,
    title: 'GTM-Ads Conversion Naming Alignment',
    description: namingMismatches.length > 0
      ? `${namingMismatches.length} GTM tags have names that don't clearly match Ads conversions`
      : 'GTM tag names align well with Ads conversion names',
    details: { mismatches: namingMismatches },
    recommendation: 'Use consistent naming between GTM tags and Ads conversions for easier maintenance',
    requiresBothFiles: true,
  };
};

// Export all advanced cross-checks
export const allAdvancedCrossChecks = [
  // Value Passing & Integration
  checkDynamicValuePassing,
  checkConversionLabelMatching,
  checkCurrencyCodeConsistency,
  checkTransactionIdDeduplication,

  // Enhanced Conversions & User Data
  checkEnhancedConversionsUserData,
  checkUserIdConsistency,
  checkFirstPartyDataCompleteness,

  // Tracking Quality & Reliability
  checkConversionCallbacks,
  checkConversionFunnelCoverage,
  checkConversionNamingAlignment,
];

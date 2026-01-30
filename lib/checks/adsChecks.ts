import { AdsData, AuditCheck, AuditContext, Severity } from '../types';

// ── Levenshtein distance helper ─────────────────────────────
const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const areSimilar = (name1: string, name2: string): boolean => {
  const distance = levenshtein(name1.toLowerCase(), name2.toLowerCase());
  const maxLength = Math.max(name1.length, name2.length);
  return distance > 0 && distance <= maxLength * 0.3;
};

// Helper to extract days from window strings like "30 days", "1 day"
const parseDays = (window: string): number => {
  const match = window.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Helper to check if a category is purchase-related
const isPurchaseCategory = (category: string): boolean => {
  const terms = ['purchase', 'sale', 'transaction', 'order', 'buy'];
  return terms.some(t => category.toLowerCase().includes(t));
};

// ── CRITICAL CHECK #1 ───────────────────────────────────────
export const checkDuplicateConversions = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions;
  const names = conversions.map(c => c.name.toLowerCase().trim());

  const duplicates = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];

  const similarPairs: Array<[string, string]> = [];
  for (let i = 0; i < conversions.length; i++) {
    for (let j = i + 1; j < conversions.length; j++) {
      if (
        conversions[i].name.toLowerCase() !== conversions[j].name.toLowerCase() &&
        areSimilar(conversions[i].name, conversions[j].name)
      ) {
        similarPairs.push([conversions[i].name, conversions[j].name]);
      }
    }
  }

  const hasDuplicates = duplicates.length > 0 || similarPairs.length > 0;

  return {
    id: 'duplicate-conversions',
    severity: 'critical',
    passed: !hasDuplicates,
    title: 'Duplicate Conversion Actions',
    description: hasDuplicates
      ? `Found ${duplicates.length} exact duplicate(s) and ${similarPairs.length} similar conversion name(s)`
      : 'No duplicate conversions found',
    details: { exactDuplicates: duplicates, similarPairs },
    recommendation: 'Remove or consolidate duplicate conversion actions to prevent double-counting',
  };
};

// ── CRITICAL CHECK #2 (Context-Aware) ───────────────────────
export const checkZeroValuePurchases = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const purchaseConversions = adsData.conversions.filter(c =>
    isPurchaseCategory(c.category)
  );
  const zeroValuePurchases = purchaseConversions.filter(c => c.value === 0);

  let severity: Severity = 'critical';
  let description = '';

  if (context?.businessModel === 'lead-generation') {
    severity = 'warning';
    description = `${zeroValuePurchases.length} purchase conversions have $0 value (might be OK for lead gen, but consider adding values)`;
  } else if (context?.valueStrategy === 'no-values') {
    severity = 'info';
    description = 'No values tracked (as configured)';
  } else {
    description =
      zeroValuePurchases.length > 0
        ? `${zeroValuePurchases.length} purchase conversions have no value assigned`
        : 'All purchase conversions have values';
  }

  return {
    id: 'zero-value-purchases',
    severity,
    passed: zeroValuePurchases.length === 0,
    title: 'Purchase Conversions with $0 Value',
    description,
    details: { conversions: zeroValuePurchases.map(c => c.name) },
    recommendation:
      context?.businessModel === 'ecommerce' && context?.valueStrategy === 'dynamic'
        ? 'Configure dynamic values in GTM to pass actual purchase amounts'
        : 'Add conversion values to enable ROAS optimization and accurate reporting',
  };
};

// ── CRITICAL CHECK #3 (Context-Aware) ───────────────────────
export const checkWrongCountingMethod = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const purchaseConversions = adsData.conversions.filter(c =>
    isPurchaseCategory(c.category)
  );

  if (purchaseConversions.length === 0) {
    return {
      id: 'wrong-counting-method',
      severity: 'critical',
      passed: true,
      title: 'Wrong Counting Method',
      description: 'No purchase conversions to evaluate',
      recommendation: 'Set counting method based on business needs',
    };
  }

  let wrongCounting: typeof purchaseConversions;
  let severity: Severity = 'critical';

  if (context?.conversionCounting === 'every-time') {
    // User wants "Every" — flag "One" as wrong
    wrongCounting = purchaseConversions.filter(
      c => c.count.toLowerCase() === 'one'
    );
  } else if (context?.conversionCounting === 'not-sure') {
    // Uncertain — still flag "Every" for purchases but as warning
    wrongCounting = purchaseConversions.filter(
      c => c.count.toLowerCase() === 'every'
    );
    severity = 'warning';
  } else {
    // Default / "once" — flag "Every" as wrong
    wrongCounting = purchaseConversions.filter(
      c => c.count.toLowerCase() === 'every'
    );
  }

  const expectedMethod =
    context?.conversionCounting === 'every-time' ? 'Every' : 'One';

  return {
    id: 'wrong-counting-method',
    severity,
    passed: wrongCounting.length === 0,
    title: 'Wrong Counting Method',
    description:
      wrongCounting.length > 0
        ? `${wrongCounting.length} purchase conversion(s) using wrong counting method (should be "${expectedMethod}")`
        : 'All purchase conversions use correct counting method',
    details: { conversions: wrongCounting.map(c => ({ name: c.name, count: c.count })) },
    recommendation: `Change counting method to "${expectedMethod}" for purchase conversions`,
  };
};

// ── CRITICAL CHECK #4 (Context-Aware) ───────────────────────
export const checkLongAttributionWindows = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions;

  if (conversions.length === 0) {
    return {
      id: 'long-attribution-windows',
      severity: 'critical',
      passed: true,
      title: 'Overly Long Attribution Windows',
      description: 'No conversions to evaluate',
      recommendation: 'Adjust attribution windows based on your sales cycle',
    };
  }

  // Determine threshold based on context
  let clickThreshold = 90;
  if (context?.salesCycle === 'immediate' || context?.salesCycle === 'short') {
    clickThreshold = 30;
  }

  // Skip check entirely for very-long sales cycles
  if (context?.salesCycle === 'very-long') {
    return {
      id: 'long-attribution-windows',
      severity: 'critical',
      passed: true,
      title: 'Overly Long Attribution Windows',
      description: 'Long attribution windows appropriate for your sales cycle',
      recommendation: 'No changes needed for long sales cycles',
    };
  }

  const longWindows = conversions.filter(c => {
    const clickDays = parseDays(c.clickWindow);
    const viewDays = parseDays(c.viewWindow);
    return clickDays >= clickThreshold || viewDays >= 30;
  });

  return {
    id: 'long-attribution-windows',
    severity: 'critical',
    passed: longWindows.length === 0,
    title: 'Overly Long Attribution Windows',
    description:
      longWindows.length > 0
        ? `${longWindows.length} conversion(s) have attribution windows that may be too long`
        : 'All attribution windows look appropriate',
    details: {
      conversions: longWindows.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
        viewWindow: c.viewWindow,
      })),
    },
    recommendation: 'Adjust attribution windows to match your typical sales cycle',
  };
};

// ── CRITICAL CHECK #5 ───────────────────────────────────────
export const checkDisabledHighValueConversions = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const disabledPurchases = adsData.conversions.filter(
    c => isPurchaseCategory(c.category) && c.status.toLowerCase() === 'disabled'
  );

  return {
    id: 'disabled-high-value-conversions',
    severity: 'critical',
    passed: disabledPurchases.length === 0,
    title: 'Disabled High-Value Conversions',
    description:
      disabledPurchases.length > 0
        ? `${disabledPurchases.length} purchase/sale conversion(s) are disabled`
        : 'All high-value conversions are enabled',
    details: { conversions: disabledPurchases.map(c => c.name) },
    recommendation: 'Enable disabled purchase conversions or remove if no longer needed',
  };
};

// ── WARNING CHECK #6 ────────────────────────────────────────
export const checkInconsistentAttributionModels = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const models = adsData.conversions
    .map(c => c.attributionModel)
    .filter(m => m !== '');

  const uniqueModels = [...new Set(models)];

  return {
    id: 'inconsistent-attribution-models',
    severity: 'warning',
    passed: uniqueModels.length <= 1,
    title: 'Inconsistent Attribution Models',
    description:
      uniqueModels.length > 1
        ? `${uniqueModels.length} different attribution models used: ${uniqueModels.join(', ')}`
        : 'All conversions use the same attribution model',
    details: { models: uniqueModels },
    recommendation: 'Standardize attribution models for consistent reporting',
  };
};

// ── WARNING CHECK #7 (Context-Aware) ────────────────────────
export const checkShortAttributionWindows = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  if (context?.salesCycle === 'immediate') {
    return {
      id: 'short-attribution-windows',
      severity: 'warning',
      passed: true,
      title: 'Short Attribution Windows',
      description: 'Short windows appropriate for immediate sales cycle',
      recommendation: 'No changes needed',
    };
  }

  let threshold = 7;
  if (context?.salesCycle === 'medium' || context?.salesCycle === 'long') {
    threshold = 14;
  }

  const shortWindows = adsData.conversions.filter(c => {
    const days = parseDays(c.clickWindow);
    return days > 0 && days < threshold;
  });

  return {
    id: 'short-attribution-windows',
    severity: 'warning',
    passed: shortWindows.length === 0,
    title: 'Short Attribution Windows',
    description:
      shortWindows.length > 0
        ? `${shortWindows.length} conversion(s) have very short click windows (<${threshold} days)`
        : 'All attribution windows are adequate',
    details: {
      conversions: shortWindows.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
      })),
    },
    recommendation: 'Consider longer attribution windows for this sales cycle',
  };
};

// ── WARNING CHECK #8 ────────────────────────────────────────
export const checkLeadConversionsWithValues = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const leadCategories = ['lead', 'sign-up', 'signup', 'contact', 'subscribe'];

  const leadsWithValues = adsData.conversions.filter(c => {
    const isLead = leadCategories.some(cat =>
      c.category.toLowerCase().includes(cat)
    );
    return isLead && c.value > 0;
  });

  return {
    id: 'lead-conversions-with-values',
    severity: 'warning',
    passed: leadsWithValues.length === 0,
    title: 'Lead Conversions with Unexpected Values',
    description:
      leadsWithValues.length > 0
        ? `${leadsWithValues.length} lead conversion(s) have specific dollar values - verify these are accurate`
        : 'No unexpected values on lead conversions',
    details: {
      conversions: leadsWithValues.map(c => ({ name: c.name, value: c.value })),
    },
    recommendation: 'Verify lead values are intentional or set to $0',
  };
};

// ── WARNING CHECK #9 ────────────────────────────────────────
export const checkMissingPrimaryConversion = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const hasPrimaryConversion = adsData.conversions.some(
    c =>
      isPurchaseCategory(c.category) &&
      c.status.toLowerCase() === 'enabled'
  );

  return {
    id: 'missing-primary-conversion',
    severity: 'warning',
    passed: hasPrimaryConversion,
    title: 'Missing Primary Conversion',
    description: hasPrimaryConversion
      ? 'Primary purchase/sale conversion action found'
      : 'No primary purchase/sale conversion action found - Smart Bidding may optimize for wrong goal',
    recommendation: 'Mark your most important conversion as Primary for Smart Bidding',
  };
};

// ── INFO CHECK #10 ──────────────────────────────────────────
export const checkUnusualCategories = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const genericCategories = ['other', 'page view', 'default'];

  const genericConversions = adsData.conversions.filter(c =>
    genericCategories.some(cat => c.category.toLowerCase() === cat)
  );

  return {
    id: 'unusual-categories',
    severity: 'info',
    passed: genericConversions.length === 0,
    title: 'Unusual Conversion Categories',
    description:
      genericConversions.length > 0
        ? `${genericConversions.length} conversion(s) using generic categories`
        : 'All conversions use specific categories',
    details: {
      conversions: genericConversions.map(c => ({
        name: c.name,
        category: c.category,
      })),
    },
    recommendation: 'Use specific categories for better reporting',
  };
};

// ── INFO CHECK #11 ──────────────────────────────────────────
export const checkManyInactiveConversions = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const disabled = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'disabled'
  );

  return {
    id: 'many-inactive-conversions',
    severity: 'info',
    passed: disabled.length <= 10,
    title: 'Many Inactive Conversions',
    description:
      disabled.length > 10
        ? `Found ${disabled.length} disabled conversions - consider cleanup`
        : disabled.length > 0
          ? `${disabled.length} disabled conversion(s) found`
          : 'No disabled conversions',
    details: { disabledConversions: disabled.map(c => c.name) },
    recommendation: 'Archive old conversions for a cleaner account',
  };
};

// Export all checks
export const allAdsChecks = [
  checkDuplicateConversions,
  checkZeroValuePurchases,
  checkWrongCountingMethod,
  checkLongAttributionWindows,
  checkDisabledHighValueConversions,
  checkInconsistentAttributionModels,
  checkShortAttributionWindows,
  checkLeadConversionsWithValues,
  checkMissingPrimaryConversion,
  checkUnusualCategories,
  checkManyInactiveConversions,
];

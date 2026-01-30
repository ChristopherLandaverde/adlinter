import { AdsData, AuditCheck, AuditContext } from '../types';

// ── VALUE INTELLIGENCE ──────────────────────────────────────

// WARNING: Value Outlier Detection
export const checkValueOutliers = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionsWithValue = adsData.conversions.filter(c => c.value > 0);

  if (conversionsWithValue.length < 3) {
    return {
      id: 'value-outliers',
      severity: 'info',
      passed: true,
      title: 'Conversion Value Outlier Detection',
      description: 'Not enough conversion values to analyze',
      recommendation: 'N/A',
    };
  }

  const values = conversionsWithValue.map(c => c.value).sort((a, b) => a - b);

  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = conversionsWithValue.filter(
    c => c.value < lowerBound || c.value > upperBound
  );

  const veryLowValues = conversionsWithValue.filter(c => c.value < 1);

  const suspiciousHighValues = conversionsWithValue.filter(
    c => c.value >= 10000 && c.value % 1000 === 0
  );

  const allOutliers = [
    ...outliers.map(c => ({ name: c.name, value: c.value, reason: 'Statistical outlier' })),
    ...veryLowValues.map(c => ({ name: c.name, value: c.value, reason: 'Very low value' })),
    ...suspiciousHighValues.map(c => ({ name: c.name, value: c.value, reason: 'Suspiciously round value' })),
  ];

  const uniqueOutliers = Array.from(
    new Map(allOutliers.map(item => [item.name, item])).values()
  );

  return {
    id: 'value-outliers',
    severity: 'warning',
    passed: uniqueOutliers.length === 0,
    title: 'Suspicious Conversion Values',
    description: uniqueOutliers.length > 0
      ? `Found ${uniqueOutliers.length} conversions with unusual values`
      : 'All conversion values appear normal',
    details: {
      outliers: uniqueOutliers,
      valueRange: { min: values[0], max: values[values.length - 1] },
      median: values[Math.floor(values.length / 2)],
    },
    recommendation: 'Verify these conversion values are correct and not placeholder values',
  };
};

// WARNING: Currency Code Consistency
export const checkCurrencyConsistency = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const currencyCodes = adsData.conversions
    .map(c => (c as any).currency)
    .filter(Boolean);

  if (currencyCodes.length === 0) {
    return {
      id: 'currency-consistency',
      severity: 'info',
      passed: true,
      title: 'Currency Code Consistency',
      description: 'Currency codes not available in export',
      recommendation: 'Verify currency codes are set correctly in Google Ads UI',
    };
  }

  const uniqueCurrencies = new Set(currencyCodes);

  return {
    id: 'currency-consistency',
    severity: 'warning',
    passed: uniqueCurrencies.size === 1,
    title: 'Inconsistent Currency Codes',
    description: uniqueCurrencies.size > 1
      ? `Using ${uniqueCurrencies.size} different currencies: ${Array.from(uniqueCurrencies).join(', ')}`
      : `All conversions use ${Array.from(uniqueCurrencies)[0]}`,
    details: { currencies: Array.from(uniqueCurrencies) },
    recommendation: 'Standardize on a single currency for consistent reporting',
  };
};

// INFO: Value Consistency by Category
export const checkValueConsistencyByCategory = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const byCategory = new Map<string, number[]>();

  adsData.conversions.forEach(c => {
    if (c.value > 0) {
      if (!byCategory.has(c.category)) {
        byCategory.set(c.category, []);
      }
      byCategory.get(c.category)!.push(c.value);
    }
  });

  const inconsistentCategories: Array<{
    category: string;
    min: number;
    max: number;
    range: number;
  }> = [];

  byCategory.forEach((values, category) => {
    if (values.length > 1) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      if (max / min > 10) {
        inconsistentCategories.push({ category, min, max, range });
      }
    }
  });

  return {
    id: 'value-consistency-by-category',
    severity: 'info',
    passed: inconsistentCategories.length === 0,
    title: 'Value Consistency Within Categories',
    description: inconsistentCategories.length > 0
      ? `${inconsistentCategories.length} categories have wide value ranges`
      : 'Values are consistent within categories',
    details: { inconsistentCategories },
    recommendation: 'Verify why similar conversion types have very different values',
  };
};

// CRITICAL: Negative or Zero Revenue with Count
export const checkZeroValueWithCount = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const purchaseConversions = adsData.conversions.filter(c =>
    (c.category.toLowerCase().includes('purchase') ||
     c.category.toLowerCase().includes('sale') ||
     c.category.toLowerCase().includes('transaction')) &&
    c.status.toLowerCase() === 'enabled'
  );

  const zeroValueCounting = purchaseConversions.filter(
    c => c.value === 0 && c.count.toLowerCase() === 'one'
  );

  let severity: 'critical' | 'warning' | 'info' = 'critical';
  if (context?.businessModel === 'lead-generation') {
    severity = 'warning';
  } else if (context?.valueStrategy === 'no-values') {
    severity = 'info';
  }

  return {
    id: 'zero-value-with-count',
    severity,
    passed: zeroValueCounting.length === 0,
    title: 'Revenue Conversions Without Value',
    description: zeroValueCounting.length > 0
      ? `${zeroValueCounting.length} purchase conversions are counting but have no revenue value`
      : 'All purchase conversions have values configured',
    details: {
      conversions: zeroValueCounting.map(c => c.name),
      businessModel: context?.businessModel,
    },
    recommendation: context?.businessModel === 'ecommerce'
      ? 'Configure dynamic transaction values for accurate ROAS tracking'
      : 'Consider adding values to optimize for revenue, not just volume',
  };
};

// WARNING: Fixed Value on Dynamic Revenue
export const checkFixedValueOnDynamicRevenue = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  if (context?.businessModel !== 'ecommerce' || context?.valueStrategy !== 'dynamic') {
    return {
      id: 'fixed-value-dynamic-revenue',
      severity: 'info',
      passed: true,
      title: 'Fixed vs Dynamic Value Check',
      description: 'Not applicable for this business model',
      recommendation: 'N/A',
    };
  }

  const purchaseConversions = adsData.conversions.filter(c =>
    c.category.toLowerCase().includes('purchase') ||
    c.category.toLowerCase().includes('sale')
  );

  const suspiciouslyFixed = purchaseConversions.filter(c =>
    c.value > 0 &&
    (c.value % 10 === 0 || c.value === 1) &&
    c.value < 1000
  );

  return {
    id: 'fixed-value-dynamic-revenue',
    severity: 'warning',
    passed: suspiciouslyFixed.length === 0,
    title: 'Potentially Fixed Values on Dynamic Revenue',
    description: suspiciouslyFixed.length > 0
      ? `${suspiciouslyFixed.length} purchase conversions may be using fixed values instead of dynamic`
      : 'Values appear to be dynamic',
    details: {
      suspiciousConversions: suspiciouslyFixed.map(c => ({
        name: c.name,
        value: c.value,
      })),
    },
    recommendation: 'Verify these are truly dynamic values from your transaction data, not fixed amounts',
  };
};

// ── ATTRIBUTION OPTIMIZATION ────────────────────────────────

// WARNING: Suboptimal Attribution Model
export const checkSuboptimalAttributionModel = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const modelCounts = new Map<string, number>();
  conversions.forEach(c => {
    const model = c.attributionModel;
    modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
  });

  const issues: string[] = [];

  if (context?.salesCycle) {
    const lastClickCount = conversions.filter(c =>
      c.attributionModel.toLowerCase().includes('last click')
    ).length;

    if (
      (context.salesCycle === 'long' || context.salesCycle === 'very-long') &&
      lastClickCount > conversions.length * 0.5
    ) {
      issues.push(
        `${lastClickCount} conversions use Last Click attribution, ` +
        `but your ${context.salesCycle} sales cycle benefits from multi-touch attribution`
      );
    }

    if (context.salesCycle === 'immediate' || context.salesCycle === 'short') {
      const complexModels = conversions.filter(c =>
        c.attributionModel.toLowerCase().includes('position') ||
        c.attributionModel.toLowerCase().includes('time decay')
      ).length;

      if (complexModels > conversions.length * 0.3) {
        issues.push(
          `${complexModels} conversions use complex attribution models, ` +
          `but your ${context.salesCycle} sales cycle may not benefit from them`
        );
      }
    }
  }

  const dataDrivenCount = conversions.filter(c =>
    c.attributionModel.toLowerCase().includes('data-driven')
  ).length;

  if (dataDrivenCount > 0 && conversions.length < 10) {
    issues.push(
      `Using data-driven attribution with only ${conversions.length} conversions ` +
      `(requires 400+ conversions/30 days for accuracy)`
    );
  }

  return {
    id: 'suboptimal-attribution-model',
    severity: 'warning',
    passed: issues.length === 0,
    title: 'Attribution Model Optimization',
    description: issues.length > 0
      ? issues.join('; ')
      : 'Attribution models appear appropriate for your business',
    details: {
      modelDistribution: Object.fromEntries(modelCounts),
      salesCycle: context?.salesCycle,
    },
    recommendation: issues.length > 0
      ? 'Consider adjusting attribution models to match your sales cycle'
      : 'Continue monitoring attribution model performance',
  };
};

// WARNING: Attribution Window Mismatch
export const checkAttributionWindowMismatch = (
  adsData: AdsData,
  context?: AuditContext
): AuditCheck => {
  if (!context?.salesCycle) {
    return {
      id: 'attribution-window-mismatch',
      severity: 'info',
      passed: true,
      title: 'Attribution Window Analysis',
      description: 'Provide sales cycle context for detailed analysis',
      recommendation: 'N/A',
    };
  }

  const conversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const windowIssues: Array<{
    conversion: string;
    window: string;
    issue: string;
  }> = [];

  conversions.forEach(c => {
    const clickWindow = c.clickWindow;
    const days = parseInt(clickWindow) || 30;

    if (context.salesCycle === 'immediate' || context.salesCycle === 'short') {
      if (days > 14) {
        windowIssues.push({
          conversion: c.name,
          window: clickWindow,
          issue: `${clickWindow} is too long for ${context.salesCycle} sales cycle`,
        });
      }
    }

    if (context.salesCycle === 'medium') {
      if (days < 14 || days > 60) {
        windowIssues.push({
          conversion: c.name,
          window: clickWindow,
          issue: days < 14
            ? `${clickWindow} may miss some conversions`
            : `${clickWindow} may inflate conversion counts`,
        });
      }
    }

    if (context.salesCycle === 'long' || context.salesCycle === 'very-long') {
      if (days < 30) {
        windowIssues.push({
          conversion: c.name,
          window: clickWindow,
          issue: `${clickWindow} is too short for ${context.salesCycle} sales cycle`,
        });
      }
    }
  });

  return {
    id: 'attribution-window-mismatch',
    severity: 'warning',
    passed: windowIssues.length === 0,
    title: 'Attribution Window vs Sales Cycle Mismatch',
    description: windowIssues.length > 0
      ? `${windowIssues.length} conversions have windows that don't match your ${context.salesCycle} sales cycle`
      : 'Attribution windows appropriate for sales cycle',
    details: {
      issues: windowIssues,
      salesCycle: context.salesCycle,
    },
    recommendation: 'Adjust attribution windows to match typical customer journey length',
  };
};

// INFO: View-Through Window Analysis
export const checkViewThroughWindows = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const viewWindows = conversions.map(c => {
    const parsed = parseInt(c.viewWindow);
    const days = isNaN(parsed) ? 1 : parsed;
    return { name: c.name, days, category: c.category };
  });

  const longViewWindows = viewWindows.filter(v => v.days > 7);

  const displayRelevant = conversions.filter(c =>
    c.category.toLowerCase().includes('video') ||
    c.category.toLowerCase().includes('display') ||
    c.category.toLowerCase().includes('awareness')
  );

  const issues: string[] = [];

  if (longViewWindows.length > 0 && displayRelevant.length === 0) {
    issues.push(
      `${longViewWindows.length} conversions have view-through windows > 7 days, ` +
      `which may inflate conversion counts`
    );
  }

  const noViewThrough = viewWindows.filter(v => v.days === 0);
  if (noViewThrough.length > 0 && displayRelevant.length > 0) {
    issues.push(
      `${noViewThrough.length} conversions have no view-through window, ` +
      `which may miss display/video ad impact`
    );
  }

  return {
    id: 'view-through-window-analysis',
    severity: 'info',
    passed: issues.length === 0,
    title: 'View-Through Attribution Window Analysis',
    description: issues.length > 0
      ? issues.join('; ')
      : 'View-through windows configured appropriately',
    details: { longViewWindows, noViewThrough },
    recommendation: issues.length > 0
      ? 'Adjust view-through windows based on campaign types'
      : 'View-through configuration looks good',
  };
};

// WARNING: Data-Driven Attribution Eligibility
export const checkDataDrivenEligibility = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const dataDrivenConversions = adsData.conversions.filter(c =>
    c.attributionModel.toLowerCase().includes('data-driven') &&
    c.status.toLowerCase() === 'enabled'
  );

  if (dataDrivenConversions.length === 0) {
    return {
      id: 'data-driven-eligibility',
      severity: 'info',
      passed: true,
      title: 'Data-Driven Attribution Eligibility',
      description: 'Not using data-driven attribution',
      recommendation: 'Consider data-driven attribution once you reach 400+ conversions per 30 days',
    };
  }

  return {
    id: 'data-driven-eligibility',
    severity: 'warning',
    passed: false,
    title: 'Data-Driven Attribution Volume Check',
    description:
      `Using data-driven attribution on ${dataDrivenConversions.length} conversion(s). ` +
      `Requires 400+ conversions per 30 days for accurate modeling.`,
    details: {
      dataDrivenConversions: dataDrivenConversions.map(c => c.name),
    },
    recommendation: 'Verify in Google Ads that these conversions have sufficient volume (400+/month) for data-driven attribution',
  };
};

// ── SMART BIDDING CONFIGURATION ─────────────────────────────

// WARNING: Smart Bidding Volume
export const checkSmartBiddingVolume = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const enabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const primaryConversions = enabledConversions.filter(c =>
    (c as any).primary === 'true' || (c as any).primary === true
  );

  if (enabledConversions.length < 3 && primaryConversions.length === 0) {
    return {
      id: 'smart-bidding-volume',
      severity: 'warning',
      passed: false,
      title: 'Limited Conversions for Smart Bidding',
      description: `Only ${enabledConversions.length} conversion action(s) enabled. Smart Bidding typically needs 15-30 conversions per 30 days.`,
      details: {
        enabledCount: enabledConversions.length,
        primaryCount: primaryConversions.length,
      },
      recommendation: 'Verify you have sufficient conversion volume (15-30/month) before using Smart Bidding',
    };
  }

  return {
    id: 'smart-bidding-volume',
    severity: 'info',
    passed: true,
    title: 'Smart Bidding Volume Check',
    description: `${enabledConversions.length} conversion actions enabled`,
    recommendation: 'Ensure each enabled conversion has 15-30 conversions per month for effective Smart Bidding',
  };
};

// WARNING: ROAS Feasibility
export const checkROASFeasibility = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionsWithValue = adsData.conversions.filter(
    c => c.value > 0 && c.status.toLowerCase() === 'enabled'
  );

  const conversionsWithoutValue = adsData.conversions.filter(
    c => c.value === 0 && c.status.toLowerCase() === 'enabled'
  );

  if (conversionsWithoutValue.length > conversionsWithValue.length) {
    return {
      id: 'roas-feasibility',
      severity: 'warning',
      passed: false,
      title: 'Insufficient Value Data for ROAS Bidding',
      description: `Only ${conversionsWithValue.length} of ${adsData.conversions.length} conversions have values. ROAS bidding requires value data.`,
      details: {
        withValue: conversionsWithValue.length,
        withoutValue: conversionsWithoutValue.length,
      },
      recommendation: 'Add values to all conversion actions to enable ROAS optimization',
    };
  }

  const values = conversionsWithValue.map(c => c.value);
  if (values.length >= 2) {
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (maxValue / minValue > 100) {
      return {
        id: 'roas-feasibility',
        severity: 'warning',
        passed: false,
        title: 'Wide Value Range for ROAS Bidding',
        description: `Conversion values range from $${minValue} to $${maxValue} (${Math.round(maxValue / minValue)}x difference)`,
        details: { minValue, maxValue, ratio: maxValue / minValue },
        recommendation: 'Consider segmenting high-value and low-value conversions for different campaigns',
      };
    }
  }

  return {
    id: 'roas-feasibility',
    severity: 'info',
    passed: true,
    title: 'ROAS Bidding Configuration',
    description: 'Conversion values configured appropriately for ROAS bidding',
    recommendation: 'Ready for Target ROAS or Maximize Conversion Value bidding',
  };
};

// INFO: Conversion Delay Impact
export const checkConversionDelayImpact = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  const longWindows = conversions.filter(c => {
    const days = parseInt(c.clickWindow) || 30;
    return days >= 60;
  });

  if (longWindows.length === 0) {
    return {
      id: 'conversion-delay-impact',
      severity: 'info',
      passed: true,
      title: 'Conversion Delay Analysis',
      description: 'All conversions have reasonable attribution windows',
      recommendation: 'N/A',
    };
  }

  return {
    id: 'conversion-delay-impact',
    severity: 'info',
    passed: true,
    title: 'Long Attribution Windows Detected',
    description: `${longWindows.length} conversions have 60+ day attribution windows, which may slow Smart Bidding learning`,
    details: {
      longWindows: longWindows.map(c => ({
        name: c.name,
        window: c.clickWindow,
      })),
    },
    recommendation: 'Consider using conversion lag reports to understand actual delay and adjust windows if needed',
  };
};

// ── CONVERSION HEALTH & QUALITY ─────────────────────────────

// WARNING: Primary Conversion Designation
export const checkPrimaryConversionDesignation = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const primaryConversions = adsData.conversions.filter(c =>
    (c as any).primary === 'true' || (c as any).primary === true
  );

  const enabledConversions = adsData.conversions.filter(
    c => c.status.toLowerCase() === 'enabled'
  );

  if (primaryConversions.length === 0 && enabledConversions.length > 1) {
    return {
      id: 'no-primary-conversion',
      severity: 'warning',
      passed: false,
      title: 'No Primary Conversion Designated',
      description: `${enabledConversions.length} conversions enabled, but none marked as Primary for Smart Bidding`,
      details: {
        enabledConversions: enabledConversions.length,
        primaryConversions: primaryConversions.length,
      },
      recommendation: 'Designate your most important conversion as Primary to guide Smart Bidding optimization',
    };
  }

  if (primaryConversions.length > 1) {
    return {
      id: 'no-primary-conversion',
      severity: 'warning',
      passed: false,
      title: 'Multiple Primary Conversions',
      description: `${primaryConversions.length} conversions marked as Primary - should only be one`,
      details: {
        primaryConversions: primaryConversions.map(c => c.name),
      },
      recommendation: 'Designate only one conversion as Primary',
    };
  }

  return {
    id: 'no-primary-conversion',
    severity: 'info',
    passed: true,
    title: 'Primary Conversion Configured',
    description: `Primary conversion: ${primaryConversions[0]?.name || 'N/A'}`,
    recommendation: 'Continue monitoring primary conversion performance',
  };
};

// INFO: Conversion Name Quality
export const checkConversionNameQuality = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions;

  const poorNames: Array<{ name: string; reason: string }> = [];

  conversions.forEach(c => {
    const name = c.name.toLowerCase();

    if (name === 'conversion' || name === 'goal' || name === 'event') {
      poorNames.push({ name: c.name, reason: 'Too generic' });
    }

    if (name.startsWith('conv_') || name.match(/^[a-z0-9_]+$/)) {
      poorNames.push({ name: c.name, reason: 'Technical naming' });
    }

    if (c.name.length > 50) {
      poorNames.push({ name: c.name, reason: 'Name too long' });
    }

    if (name.match(/[^a-z0-9\s-]/)) {
      poorNames.push({ name: c.name, reason: 'Contains special characters' });
    }
  });

  return {
    id: 'conversion-name-quality',
    severity: 'info',
    passed: poorNames.length === 0,
    title: 'Conversion Name Quality',
    description: poorNames.length > 0
      ? `${poorNames.length} conversions have unclear or problematic names`
      : 'All conversion names are clear and descriptive',
    details: { poorNames },
    recommendation: 'Use clear, business-oriented names like "Purchase - Product Page" or "Lead - Contact Form"',
  };
};

// WARNING: Conversion Source Consistency
export const checkConversionSourceConsistency = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const sources = adsData.conversions
    .map(c => (c as any).source)
    .filter(Boolean);

  if (sources.length === 0) {
    return {
      id: 'conversion-source-consistency',
      severity: 'info',
      passed: true,
      title: 'Conversion Source Analysis',
      description: 'Source information not available in export',
      recommendation: 'N/A',
    };
  }

  const uniqueSources = new Set(sources);

  if (uniqueSources.size > 2) {
    return {
      id: 'conversion-source-consistency',
      severity: 'warning',
      passed: false,
      title: 'Mixed Conversion Sources',
      description: `Using ${uniqueSources.size} different conversion sources: ${Array.from(uniqueSources).join(', ')}`,
      details: { sources: Array.from(uniqueSources) },
      recommendation: 'Verify cross-platform tracking is configured correctly',
    };
  }

  return {
    id: 'conversion-source-consistency',
    severity: 'info',
    passed: true,
    title: 'Conversion Source Consistency',
    description: `Consistent conversion source(s): ${Array.from(uniqueSources).join(', ')}`,
    recommendation: 'N/A',
  };
};

// Export all advanced ads checks
export const allAdvancedAdsChecks = [
  // Value Intelligence
  checkValueOutliers,
  checkCurrencyConsistency,
  checkValueConsistencyByCategory,
  checkZeroValueWithCount,
  checkFixedValueOnDynamicRevenue,

  // Attribution Optimization
  checkSuboptimalAttributionModel,
  checkAttributionWindowMismatch,
  checkViewThroughWindows,
  checkDataDrivenEligibility,

  // Smart Bidding Configuration
  checkSmartBiddingVolume,
  checkROASFeasibility,
  checkConversionDelayImpact,

  // Conversion Health
  checkPrimaryConversionDesignation,
  checkConversionNameQuality,
  checkConversionSourceConsistency,
];

import {
  checkValueOutliers,
  checkCurrencyConsistency,
  checkValueConsistencyByCategory,
  checkZeroValueWithCount,
  checkFixedValueOnDynamicRevenue,
  checkSuboptimalAttributionModel,
  checkAttributionWindowMismatch,
  checkViewThroughWindows,
  checkDataDrivenEligibility,
  checkSmartBiddingVolume,
  checkROASFeasibility,
  checkConversionDelayImpact,
  checkPrimaryConversionDesignation,
  checkConversionNameQuality,
  checkConversionSourceConsistency,
} from '@/lib/checks/advancedAdsChecks';
import { AdsData, AuditContext } from '@/lib/types';

// Helper to create a minimal conversion
const makeConversion = (overrides: Partial<AdsData['conversions'][0]> & { name: string }) => ({
  category: 'Purchase',
  value: 50,
  count: 'One',
  attributionModel: 'Last click',
  clickWindow: '30 days',
  viewWindow: '1 day',
  status: 'Enabled',
  ...overrides,
});

// ──────────────────────────────────────────────────────────────
// 1. checkValueOutliers (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkValueOutliers', () => {
  it('should PASS with fewer than 3 values (info)', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 10 }),
        makeConversion({ name: 'B', value: 20 }),
      ],
    };
    const result = checkValueOutliers(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('value-outliers');
  });

  it('should PASS with normal values', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50 }),
        makeConversion({ name: 'B', value: 55 }),
        makeConversion({ name: 'C', value: 60 }),
        makeConversion({ name: 'D', value: 45 }),
      ],
    };
    const result = checkValueOutliers(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('value-outliers');
  });

  it('should FAIL with statistical outlier values', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50 }),
        makeConversion({ name: 'B', value: 55 }),
        makeConversion({ name: 'C', value: 52 }),
        makeConversion({ name: 'D', value: 48 }),
        makeConversion({ name: 'Outlier', value: 5000 }),
      ],
    };
    const result = checkValueOutliers(adsData);
    expect(result.passed).toBe(false);
    expect(result.id).toBe('value-outliers');
  });

  it('should FAIL with very low values (< 1)', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50 }),
        makeConversion({ name: 'B', value: 55 }),
        makeConversion({ name: 'C', value: 60 }),
        makeConversion({ name: 'Low', value: 0.01 }),
      ],
    };
    const result = checkValueOutliers(adsData);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with suspiciously round high values (>= 10000 and divisible by 1000)', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50 }),
        makeConversion({ name: 'B', value: 55 }),
        makeConversion({ name: 'C', value: 60 }),
        makeConversion({ name: 'Round', value: 10000 }),
      ],
    };
    const result = checkValueOutliers(adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkCurrencyConsistency (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkCurrencyConsistency', () => {
  it('should PASS as info when no currency data', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A' }),
        makeConversion({ name: 'B' }),
      ],
    };
    const result = checkCurrencyConsistency(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('currency-consistency');
  });

  it('should PASS with single currency', () => {
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion({ name: 'A' }), currency: 'USD' } as any,
        { ...makeConversion({ name: 'B' }), currency: 'USD' } as any,
      ],
    };
    const result = checkCurrencyConsistency(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL with multiple currencies', () => {
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion({ name: 'A' }), currency: 'USD' } as any,
        { ...makeConversion({ name: 'B' }), currency: 'EUR' } as any,
      ],
    };
    const result = checkCurrencyConsistency(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('currency-consistency');
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkValueConsistencyByCategory (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkValueConsistencyByCategory', () => {
  it('should PASS with consistent values in same category', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', category: 'Purchase', value: 50 }),
        makeConversion({ name: 'B', category: 'Purchase', value: 55 }),
      ],
    };
    const result = checkValueConsistencyByCategory(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('value-consistency-by-category');
  });

  it('should FAIL when same category has > 10x value range', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', category: 'Purchase', value: 5 }),
        makeConversion({ name: 'B', category: 'Purchase', value: 5000 }),
      ],
    };
    const result = checkValueConsistencyByCategory(adsData);
    expect(result.passed).toBe(false);
    expect(result.id).toBe('value-consistency-by-category');
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkZeroValueWithCount (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkZeroValueWithCount', () => {
  it('should PASS when purchase conversion has value', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 50, count: 'One', status: 'Enabled' }),
      ],
    };
    const result = checkZeroValueWithCount(adsData);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('zero-value-with-count');
  });

  it('should FAIL as critical when purchase has $0 value and count "One"', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 0, count: 'One', status: 'Enabled' }),
      ],
    };
    const result = checkZeroValueWithCount(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should be WARNING for lead-generation context', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Sale', category: 'Sale', value: 0, count: 'One', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { businessModel: 'lead-generation' };
    const result = checkZeroValueWithCount(adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should be INFO for no-values strategy', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Transaction', category: 'Transaction', value: 0, count: 'One', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { valueStrategy: 'no-values' };
    const result = checkZeroValueWithCount(adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 5. checkFixedValueOnDynamicRevenue (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkFixedValueOnDynamicRevenue', () => {
  it('should PASS as info for non-ecommerce context', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 50 }),
      ],
    };
    const context: AuditContext = { businessModel: 'lead-generation' };
    const result = checkFixedValueOnDynamicRevenue(adsData, context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('fixed-value-dynamic-revenue');
  });

  it('should FAIL for ecommerce + dynamic with round values', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 50 }),
      ],
    };
    const context: AuditContext = { businessModel: 'ecommerce', valueStrategy: 'dynamic' };
    const result = checkFixedValueOnDynamicRevenue(adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should PASS for ecommerce + dynamic with non-round values', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 47.83 }),
      ],
    };
    const context: AuditContext = { businessModel: 'ecommerce', valueStrategy: 'dynamic' };
    const result = checkFixedValueOnDynamicRevenue(adsData, context);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 6. checkSuboptimalAttributionModel (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkSuboptimalAttributionModel', () => {
  it('should PASS with no sales cycle context', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Last click', status: 'Enabled' }),
      ],
    };
    const result = checkSuboptimalAttributionModel(adsData);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('suboptimal-attribution-model');
  });

  it('should FAIL with long sales cycle and > 50% last click', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Last click', status: 'Enabled' }),
        makeConversion({ name: 'B', attributionModel: 'Last click', status: 'Enabled' }),
        makeConversion({ name: 'C', attributionModel: 'Data-driven', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { salesCycle: 'long' };
    const result = checkSuboptimalAttributionModel(adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL with short sales cycle and > 30% complex models', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Position-based', status: 'Enabled' }),
        makeConversion({ name: 'B', attributionModel: 'Time decay', status: 'Enabled' }),
        makeConversion({ name: 'C', attributionModel: 'Last click', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { salesCycle: 'short' };
    const result = checkSuboptimalAttributionModel(adsData, context);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with data-driven and < 10 total enabled conversions', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Data-driven', status: 'Enabled' }),
        makeConversion({ name: 'B', attributionModel: 'Last click', status: 'Enabled' }),
      ],
    };
    const result = checkSuboptimalAttributionModel(adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 7. checkAttributionWindowMismatch (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkAttributionWindowMismatch', () => {
  it('should PASS as info when no salesCycle context', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '30 days', status: 'Enabled' }),
      ],
    };
    const result = checkAttributionWindowMismatch(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('attribution-window-mismatch');
  });

  it('should FAIL with short sales cycle and > 14 day window', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '30 days', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { salesCycle: 'short' };
    const result = checkAttributionWindowMismatch(adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL with long sales cycle and < 30 day window', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '7 days', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { salesCycle: 'long' };
    const result = checkAttributionWindowMismatch(adsData, context);
    expect(result.passed).toBe(false);
  });

  it('should PASS with medium sales cycle and window within range', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '30 days', status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { salesCycle: 'medium' };
    const result = checkAttributionWindowMismatch(adsData, context);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 8. checkViewThroughWindows (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkViewThroughWindows', () => {
  it('should PASS with normal view windows', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', viewWindow: '1 day', status: 'Enabled' }),
      ],
    };
    const result = checkViewThroughWindows(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('view-through-window-analysis');
  });

  it('should FAIL with long view windows and no display/video conversions', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', category: 'Purchase', viewWindow: '30 days', status: 'Enabled' }),
      ],
    };
    const result = checkViewThroughWindows(adsData);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with no view-through window when display campaigns exist', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', category: 'Display Awareness', viewWindow: '0 days', status: 'Enabled' }),
      ],
    };
    const result = checkViewThroughWindows(adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 9. checkDataDrivenEligibility (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkDataDrivenEligibility', () => {
  it('should PASS as info when no data-driven conversions', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Last click', status: 'Enabled' }),
      ],
    };
    const result = checkDataDrivenEligibility(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('data-driven-eligibility');
  });

  it('should FAIL as warning when using data-driven attribution', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', attributionModel: 'Data-driven', status: 'Enabled' }),
      ],
    };
    const result = checkDataDrivenEligibility(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 10. checkSmartBiddingVolume (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkSmartBiddingVolume', () => {
  it('should FAIL with < 3 enabled conversions and no primary', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', status: 'Enabled' }),
        makeConversion({ name: 'B', status: 'Enabled' }),
      ],
    };
    const result = checkSmartBiddingVolume(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('smart-bidding-volume');
  });

  it('should PASS with >= 3 enabled conversions', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', status: 'Enabled' }),
        makeConversion({ name: 'B', status: 'Enabled' }),
        makeConversion({ name: 'C', status: 'Enabled' }),
      ],
    };
    const result = checkSmartBiddingVolume(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 11. checkROASFeasibility (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkROASFeasibility', () => {
  it('should FAIL when more conversions without value than with', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50, status: 'Enabled' }),
        makeConversion({ name: 'B', value: 0, status: 'Enabled' }),
        makeConversion({ name: 'C', value: 0, status: 'Enabled' }),
      ],
    };
    const result = checkROASFeasibility(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('roas-feasibility');
  });

  it('should FAIL with wide value range > 100x', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 1, status: 'Enabled' }),
        makeConversion({ name: 'B', value: 500, status: 'Enabled' }),
      ],
    };
    const result = checkROASFeasibility(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should PASS with normal value range', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', value: 50, status: 'Enabled' }),
        makeConversion({ name: 'B', value: 100, status: 'Enabled' }),
        makeConversion({ name: 'C', value: 75, status: 'Enabled' }),
      ],
    };
    const result = checkROASFeasibility(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 12. checkConversionDelayImpact (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkConversionDelayImpact', () => {
  it('should PASS with no long windows', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '30 days', status: 'Enabled' }),
      ],
    };
    const result = checkConversionDelayImpact(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-delay-impact');
    expect(result.description).toBe('All conversions have reasonable attribution windows');
  });

  it('should PASS with 60+ day windows but include description about long windows', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', clickWindow: '90 days', status: 'Enabled' }),
      ],
    };
    const result = checkConversionDelayImpact(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.description).toContain('60+ day attribution windows');
  });
});

// ──────────────────────────────────────────────────────────────
// 13. checkPrimaryConversionDesignation (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkPrimaryConversionDesignation', () => {
  it('should FAIL when no primary with multiple enabled conversions', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A', status: 'Enabled' }),
        makeConversion({ name: 'B', status: 'Enabled' }),
      ],
    };
    const result = checkPrimaryConversionDesignation(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('no-primary-conversion');
  });

  it('should FAIL when multiple primaries', () => {
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion({ name: 'A', status: 'Enabled' }), primary: 'true' } as any,
        { ...makeConversion({ name: 'B', status: 'Enabled' }), primary: 'true' } as any,
      ],
    };
    const result = checkPrimaryConversionDesignation(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should PASS with single primary conversion', () => {
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion({ name: 'A', status: 'Enabled' }), primary: 'true' } as any,
        makeConversion({ name: 'B', status: 'Enabled' }),
      ],
    };
    const result = checkPrimaryConversionDesignation(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 14. checkConversionNameQuality (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkConversionNameQuality', () => {
  it('should PASS with good descriptive names', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase Complete' }),
        makeConversion({ name: 'Lead Form Submit' }),
      ],
    };
    const result = checkConversionNameQuality(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-name-quality');
  });

  it('should FAIL with generic "conversion" name', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Conversion' }),
      ],
    };
    const result = checkConversionNameQuality(adsData);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with technical naming pattern', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'conv_purchase_01' }),
      ],
    };
    const result = checkConversionNameQuality(adsData);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with name longer than 50 characters', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'This Is A Very Long Conversion Name That Exceeds The Fifty Character Limit' }),
      ],
    };
    const result = checkConversionNameQuality(adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 15. checkConversionSourceConsistency (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkConversionSourceConsistency', () => {
  it('should PASS as info when no source data', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'A' }),
        makeConversion({ name: 'B' }),
      ],
    };
    const result = checkConversionSourceConsistency(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-source-consistency');
  });

  it('should FAIL with > 2 different sources', () => {
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion({ name: 'A' }), source: 'Google Tag' } as any,
        { ...makeConversion({ name: 'B' }), source: 'Google Analytics' } as any,
        { ...makeConversion({ name: 'C' }), source: 'Firebase' } as any,
      ],
    };
    const result = checkConversionSourceConsistency(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });
});

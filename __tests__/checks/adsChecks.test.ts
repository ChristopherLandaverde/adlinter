import {
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
} from '@/lib/checks/adsChecks';
import { AdsData, AuditContext } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseAdsCSV } from '@/lib/parsers/adsParser';

const loadCSV = (name: string) =>
  parseAdsCSV(readFileSync(join(__dirname, `../fixtures/${name}`), 'utf-8'));

// ──────────────────────────────────────────────────────────────
// 1. checkDuplicateConversions (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkDuplicateConversions', () => {
  it('should PASS with no duplicates', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkDuplicateConversions(adsData);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('duplicate-conversions');
    expect(result.severity).toBe('critical');
  });

  it('should FAIL with exact duplicate names', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkDuplicateConversions(adsData);
    expect(result.passed).toBe(false);
  });

  it('should detect similar names via Levenshtein', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase Complete', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Purchase Complet', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkDuplicateConversions(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkDuplicateConversions(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkZeroValuePurchases (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkZeroValuePurchases', () => {
  it('should be CRITICAL for ecommerce with $0 purchases', () => {
    const adsData = loadCSV('ads-zero-values.csv');
    const context: AuditContext = { businessModel: 'ecommerce', valueStrategy: 'dynamic' };
    const result = checkZeroValuePurchases(adsData, context);

    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect((result.details as { conversions: string[] }).conversions.length).toBeGreaterThan(0);
  });

  it('should be WARNING for lead gen with $0 purchases', () => {
    const adsData = loadCSV('ads-zero-values.csv');
    const context: AuditContext = { businessModel: 'lead-generation' };
    const result = checkZeroValuePurchases(adsData, context);
    expect(result.severity).toBe('warning');
  });

  it('should be INFO when user tracks no values', () => {
    const adsData = loadCSV('ads-zero-values.csv');
    const context: AuditContext = { valueStrategy: 'no-values' };
    const result = checkZeroValuePurchases(adsData, context);
    expect(result.severity).toBe('info');
  });

  it('should PASS when purchases have values', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkZeroValuePurchases(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkWrongCountingMethod (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkWrongCountingMethod', () => {
  // Google Ads Help (answer/3438531): "Every" is the choice for tracking
  // sales; "One" for when the number of sales doesn't matter (leads).
  type Flagged = { name: string; count: string; expected: string };
  const flagged = (r: ReturnType<typeof checkWrongCountingMethod>) =>
    ((r.details as { conversions?: Flagged[] } | undefined)?.conversions ?? []);

  it('should PASS purchases counted "Every" with no context (Google\'s recommendation)', () => {
    // ads-wrong-counting.csv: Purchase and Sale, both counted "Every".
    const result = checkWrongCountingMethod(loadCSV('ads-wrong-counting.csv'));
    expect(result.passed).toBe(true);
  });

  it('should flag purchases counted "One" with no context, recommending "Every", as WARNING', () => {
    // ads-clean.csv: Purchase counted "One".
    const result = checkWrongCountingMethod(loadCSV('ads-clean.csv'));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(flagged(result)).toEqual([{ name: 'Purchase', count: 'One', expected: 'Every' }]);
    expect(result.recommendation).toMatch(/"Every"/);
    expect(result.recommendation).not.toMatch(/"One"/);
  });

  it('should be CRITICAL when the user says they count every conversion', () => {
    const context: AuditContext = { conversionCounting: 'every-time' };
    const result = checkWrongCountingMethod(loadCSV('ads-clean.csv'), context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(flagged(result).map(c => c.expected)).toEqual(['Every']);
  });

  it('should be WARNING when the user is not sure', () => {
    const context: AuditContext = { conversionCounting: 'not-sure' };
    const result = checkWrongCountingMethod(loadCSV('ads-clean.csv'), context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should never tell users to switch purchases to "One", even when they count once per click', () => {
    const context: AuditContext = { conversionCounting: 'once' };
    const every = checkWrongCountingMethod(loadCSV('ads-wrong-counting.csv'), context);
    expect(every.passed).toBe(true);
    expect(flagged(every)).toEqual([]);

    // Purchase counted "One" by stated choice: accepted, with Google's
    // recommendation noted rather than overridden.
    const one = checkWrongCountingMethod(loadCSV('ads-clean.csv'), context);
    expect(one.passed).toBe(true);
    expect(one.description).toMatch(/Every/);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkWrongCountingMethod(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkLongAttributionWindows (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkLongAttributionWindows', () => {
  it('should flag 90-day windows by default', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '90 days', viewWindow: '30 days', status: 'Enabled' },
      ],
    };
    const result = checkLongAttributionWindows(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should NOT flag 90-day windows for very long sales cycles', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '90 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const context: AuditContext = { salesCycle: 'very-long' };
    const result = checkLongAttributionWindows(adsData, context);
    expect(result.passed).toBe(true);
  });

  it('should flag 30+ day windows for immediate sales', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const context: AuditContext = { salesCycle: 'immediate' };
    const result = checkLongAttributionWindows(adsData, context);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkLongAttributionWindows(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 5. checkDisabledHighValueConversions (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkDisabledHighValueConversions', () => {
  it('should PASS when purchase conversions are enabled', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkDisabledHighValueConversions(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when purchase conversions are disabled', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Disabled' },
      ],
    };
    const result = checkDisabledHighValueConversions(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkDisabledHighValueConversions(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 6. checkInconsistentAttributionModels (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkInconsistentAttributionModels', () => {
  it('should PASS when all use same model', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkInconsistentAttributionModels(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when multiple models used', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Lead', category: 'Lead', value: 0, count: 'One', attributionModel: 'Data-driven', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Signup', category: 'Signup', value: 0, count: 'One', attributionModel: 'First click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkInconsistentAttributionModels(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkInconsistentAttributionModels(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 7. checkShortAttributionWindows (WARNING, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkShortAttributionWindows', () => {
  it('should flag very short click windows', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '1 day', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkShortAttributionWindows(adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });

  it('should NOT flag short windows for immediate sales cycles', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '1 day', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const context: AuditContext = { salesCycle: 'immediate' };
    const result = checkShortAttributionWindows(adsData, context);
    expect(result.passed).toBe(true);
  });

  it('should flag windows < 14 days for long sales cycles', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '7 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const context: AuditContext = { salesCycle: 'long' };
    const result = checkShortAttributionWindows(adsData, context);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkShortAttributionWindows(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 8. checkLeadConversionsWithValues (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkLeadConversionsWithValues', () => {
  it('should PASS when leads have $0 value', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkLeadConversionsWithValues(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when lead conversions have specific values', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Lead Form', category: 'Lead', value: 150, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkLeadConversionsWithValues(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkLeadConversionsWithValues(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 9. checkMissingPrimaryConversion (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkMissingPrimaryConversion', () => {
  it('should PASS when purchase/sale conversion exists and is enabled', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkMissingPrimaryConversion(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when no purchase/sale conversions exist', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Page View', category: 'Page view', value: 0, count: 'Every', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkMissingPrimaryConversion(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkMissingPrimaryConversion(adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 10. checkUnusualCategories (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkUnusualCategories', () => {
  it('should PASS with standard categories', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkUnusualCategories(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('should FAIL when generic categories used', () => {
    const adsData: AdsData = {
      conversions: [
        { name: 'Something', category: 'Other', value: 0, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Views', category: 'Page view', value: 0, count: 'Every', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkUnusualCategories(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkUnusualCategories(adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 11. checkManyInactiveConversions (INFO)
// ──────────────────────────────────────────────────────────────
describe('checkManyInactiveConversions', () => {
  it('should PASS with few disabled conversions', () => {
    const adsData = loadCSV('ads-clean.csv');
    const result = checkManyInactiveConversions(adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('should FAIL with more than 10 disabled conversions', () => {
    const conversions = Array.from({ length: 12 }, (_, i) => ({
      name: `Old Conv ${i}`,
      category: 'Other',
      value: 0,
      count: 'One',
      attributionModel: 'Last click',
      clickWindow: '30 days',
      viewWindow: '1 day',
      status: 'Disabled',
    }));
    const adsData: AdsData = { conversions };
    const result = checkManyInactiveConversions(adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty conversions', () => {
    const adsData: AdsData = { conversions: [] };
    const result = checkManyInactiveConversions(adsData);
    expect(result.passed).toBe(true);
  });
});

import {
  checkAdsConversionHasGTMTag,
  checkGTMTagNotInAds,
  checkMismatchedValues,
  checkTagCountMismatch,
} from '@/lib/checks/crossChecks';
import { GTMContainer, AdsData, AuditContext } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// 1. checkAdsConversionHasGTMTag (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkAdsConversionHasGTMTag', () => {
  it('should PASS when all Ads conversions have GTM tags', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Conversion',
            type: 'awct',
            parameter: [{ key: 'conversionLabel', value: 'purchase_label', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkAdsConversionHasGTMTag(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when Ads conversion has no matching GTM tag', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Unrelated Tag', type: 'html', firingTriggerId: ['1'] },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkAdsConversionHasGTMTag(gtmData, adsData);
    expect(result.passed).toBe(false);
  });

  it('should skip disabled conversions', () => {
    const gtmData: GTMContainer = {
      containerVersion: { tag: [] },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Old Conv', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Disabled' },
      ],
    };
    const result = checkAdsConversionHasGTMTag(gtmData, adsData);
    expect(result.passed).toBe(true);
  });

  it('should handle empty data', () => {
    const gtmData: GTMContainer = { containerVersion: { tag: [] } };
    const adsData: AdsData = { conversions: [] };
    const result = checkAdsConversionHasGTMTag(gtmData, adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkGTMTagNotInAds (CRITICAL)
// ──────────────────────────────────────────────────────────────
describe('checkGTMTagNotInAds', () => {
  it('should PASS when all GTM conversion tags match Ads conversions', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [{ key: 'conversionLabel', value: 'purchase', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkGTMTagNotInAds(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when GTM has conversion tag not in Ads', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Orphaned Tag',
            type: 'awct',
            parameter: [{ key: 'conversionLabel', value: 'orphaned_xyz', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkGTMTagNotInAds(gtmData, adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty data', () => {
    const gtmData: GTMContainer = { containerVersion: { tag: [] } };
    const adsData: AdsData = { conversions: [] };
    const result = checkGTMTagNotInAds(gtmData, adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkMismatchedValues (CRITICAL, Context-Aware)
// ──────────────────────────────────────────────────────────────
describe('checkMismatchedValues', () => {
  it('should PASS when GTM sends dynamic and Ads expects dynamic', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '{{Purchase Value}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 0, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const context: AuditContext = { valueStrategy: 'dynamic' };
    const result = checkMismatchedValues(gtmData, adsData, context);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when GTM sends fixed but Ads has different fixed value', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '100', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Purchase', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkMismatchedValues(gtmData, adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should handle empty data', () => {
    const gtmData: GTMContainer = { containerVersion: { tag: [] } };
    const adsData: AdsData = { conversions: [] };
    const result = checkMismatchedValues(gtmData, adsData);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkTagCountMismatch (WARNING)
// ──────────────────────────────────────────────────────────────
describe('checkTagCountMismatch', () => {
  it('should PASS when counts roughly match', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Conv 1', type: 'awct', firingTriggerId: ['1'] },
          { name: 'Conv 2', type: 'awct', firingTriggerId: ['1'] },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Conv 1', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        { name: 'Conv 2', category: 'Lead', value: 0, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkTagCountMismatch(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when GTM has many more tags than Ads conversions', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Conv 1', type: 'awct', firingTriggerId: ['1'] },
          { name: 'Conv 2', type: 'awct', firingTriggerId: ['1'] },
          { name: 'Conv 3', type: 'awct', firingTriggerId: ['1'] },
          { name: 'Conv 4', type: 'awct', firingTriggerId: ['1'] },
          { name: 'Conv 5', type: 'awct', firingTriggerId: ['1'] },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { name: 'Conv 1', category: 'Purchase', value: 50, count: 'One', attributionModel: 'Last click', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
      ],
    };
    const result = checkTagCountMismatch(gtmData, adsData);
    expect(result.passed).toBe(false);
  });

  it('should handle empty data', () => {
    const gtmData: GTMContainer = { containerVersion: { tag: [] } };
    const adsData: AdsData = { conversions: [] };
    const result = checkTagCountMismatch(gtmData, adsData);
    expect(result.passed).toBe(true);
  });
});

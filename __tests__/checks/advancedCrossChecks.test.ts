import {
  checkDynamicValuePassing,
  checkConversionLabelMatching,
  checkCurrencyCodeConsistency,
  checkTransactionIdDeduplication,
  checkEnhancedConversionsUserData,
  checkUserIdConsistency,
  checkFirstPartyDataCompleteness,
  checkConversionCallbacks,
  checkConversionFunnelCoverage,
  checkConversionNamingAlignment,
} from '@/lib/checks/advancedCrossChecks';
import { GTMContainer, AdsData, AuditContext } from '@/lib/types';

// Helper to create a minimal AdsConversion
const makeConversion = (overrides: Partial<{
  name: string; category: string; value: number; count: string;
  attributionModel: string; clickWindow: string; viewWindow: string; status: string;
}> = {}) => ({
  name: overrides.name ?? 'Purchase',
  category: overrides.category ?? 'Purchase',
  value: overrides.value ?? 0,
  count: overrides.count ?? 'One',
  attributionModel: overrides.attributionModel ?? 'Last click',
  clickWindow: overrides.clickWindow ?? '30 days',
  viewWindow: overrides.viewWindow ?? '1 day',
  status: overrides.status ?? 'Enabled',
});

const emptyAds: AdsData = { conversions: [] };
const emptyGtm: GTMContainer = { containerVersion: { tag: [] } };

// ──────────────────────────────────────────────────────────────
// 1. checkDynamicValuePassing
// ──────────────────────────────────────────────────────────────
describe('checkDynamicValuePassing', () => {
  it('should return info severity when context is not dynamic', () => {
    const result = checkDynamicValuePassing(emptyGtm, emptyAds, { valueStrategy: 'fixed' });
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('dynamic-value-passing');
  });

  it('should FAIL when dynamic context but GTM has hardcoded values', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [{ key: 'conversionValue', value: '99.99', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', category: 'Purchase' })],
    };
    const context: AuditContext = { valueStrategy: 'dynamic' };
    const result = checkDynamicValuePassing(gtmData, adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('dynamic-value-passing');
  });

  it('should PASS when dynamic context and GTM uses variable references', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [{ key: 'conversionValue', value: '{{Purchase Value}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', category: 'Purchase', value: 0 })],
    };
    const context: AuditContext = { valueStrategy: 'dynamic' };
    const result = checkDynamicValuePassing(gtmData, adsData, context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when GTM sends dynamic values but Ads has fixed values', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [{ key: 'conversionValue', value: '{{DL - Revenue}}', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase', category: 'Purchase', value: 50, status: 'Enabled' }),
      ],
    };
    const context: AuditContext = { valueStrategy: 'dynamic' };
    const result = checkDynamicValuePassing(gtmData, adsData, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });
});

// ──────────────────────────────────────────────────────────────
// 2. checkConversionLabelMatching
// ──────────────────────────────────────────────────────────────
describe('checkConversionLabelMatching', () => {
  it('should PASS when tags have matching labels and Ads conversion names', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123456', type: 'template' },
              { key: 'conversionLabel', value: 'abcdef', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', status: 'Enabled' })],
    };
    const result = checkConversionLabelMatching(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('conversion-label-matching');
  });

  it('should FAIL when tag is missing conversionId or conversionLabel', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase',
            type: 'awct',
            parameter: [{ key: 'someOther', value: 'val', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', status: 'Enabled' })],
    };
    const result = checkConversionLabelMatching(gtmData, adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when tag name has no matching Ads conversion', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Completely Different Name',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123456', type: 'template' },
              { key: 'conversionLabel', value: 'abcdef', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', status: 'Enabled' })],
    };
    const result = checkConversionLabelMatching(gtmData, adsData);
    expect(result.passed).toBe(false);
  });

  it('should FAIL when conversion label uses a variable', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123456', type: 'template' },
              { key: 'conversionLabel', value: '{{Conversion Label}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase', status: 'Enabled' })],
    };
    const result = checkConversionLabelMatching(gtmData, adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. checkCurrencyCodeConsistency
// ──────────────────────────────────────────────────────────────
describe('checkCurrencyCodeConsistency', () => {
  it('should return info when no currency data is present', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          { name: 'Tag', type: 'awct', parameter: [], firingTriggerId: ['1'] },
        ],
      },
    };
    const result = checkCurrencyCodeConsistency(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('currency-consistency-cross');
  });

  it('should PASS when GTM and Ads currencies match', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase',
            type: 'awct',
            parameter: [{ key: 'currencyCode', value: 'USD', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion(), currency: 'USD' } as any,
      ],
    };
    const result = checkCurrencyCodeConsistency(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when GTM and Ads currencies do not match', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase',
            type: 'awct',
            parameter: [{ key: 'currencyCode', value: 'EUR', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [
        { ...makeConversion(), currency: 'USD' } as any,
      ],
    };
    const result = checkCurrencyCodeConsistency(gtmData, adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('currency-consistency-cross');
  });
});

// ──────────────────────────────────────────────────────────────
// 4. checkTransactionIdDeduplication
// ──────────────────────────────────────────────────────────────
describe('checkTransactionIdDeduplication', () => {
  it('should return info for non-ecommerce business model', () => {
    const context: AuditContext = { businessModel: 'lead-generation' };
    const result = checkTransactionIdDeduplication(emptyGtm, emptyAds, context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('transaction-id-deduplication');
  });

  it('should PASS when ecommerce tags have orderId parameter', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '{{Value}}', type: 'template' },
              { key: 'orderId', value: '{{Order ID}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const context: AuditContext = { businessModel: 'ecommerce' };
    const result = checkTransactionIdDeduplication(gtmData, emptyAds, context);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('transaction-id-deduplication');
  });

  it('should FAIL when ecommerce tags lack orderId', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionValue', value: '{{Value}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const context: AuditContext = { businessModel: 'ecommerce' };
    const result = checkTransactionIdDeduplication(gtmData, emptyAds, context);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 5. checkEnhancedConversionsUserData
// ──────────────────────────────────────────────────────────────
describe('checkEnhancedConversionsUserData', () => {
  it('should return info when no enhanced conversion tags exist', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Basic Tag',
            type: 'awct',
            parameter: [{ key: 'conversionId', value: 'AW-123', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkEnhancedConversionsUserData(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('enhanced-conversions-user-data');
  });

  it('should PASS when enhanced tag has email, phone, and hash', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Enhanced Purchase',
            type: 'awct',
            parameter: [
              { key: 'enhanced_conversion_data', value: 'email:sha256hash phone:123', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkEnhancedConversionsUserData(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('enhanced-conversions-user-data');
  });

  it('should FAIL when enhanced tag is missing email', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Enhanced Purchase',
            type: 'awct',
            parameter: [
              { key: 'enhanced_conversion_data', value: 'phone:123 address:456 sha256', type: 'map' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkEnhancedConversionsUserData(gtmData, emptyAds);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when enhanced tag has email but no hashing', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Enhanced Purchase',
            type: 'awct',
            parameter: [
              { key: 'enhanced_conversion_data', value: 'email:test@test.com phone:123', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkEnhancedConversionsUserData(gtmData, emptyAds);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });
});

// ──────────────────────────────────────────────────────────────
// 6. checkUserIdConsistency
// ──────────────────────────────────────────────────────────────
describe('checkUserIdConsistency', () => {
  it('should return info when no tags have user_id', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'awct',
            parameter: [{ key: 'conversionId', value: 'AW-123', type: 'template' }],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkUserIdConsistency(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('user-id-consistency');
  });

  it('should PASS when all conversion tags have user_id', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag A',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123', type: 'template' },
              { key: 'user_id', value: '{{User ID}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
          {
            name: 'Tag B',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-456', type: 'template' },
              { key: 'user_id', value: '{{User ID}}', type: 'template' },
            ],
            firingTriggerId: ['2'],
          },
        ],
      },
    };
    const result = checkUserIdConsistency(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('should FAIL when some tags have user_id but others do not', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Tag With UserID',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123', type: 'template' },
              { key: 'user_id', value: '{{User ID}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
          {
            name: 'Tag Without UserID',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-456', type: 'template' },
            ],
            firingTriggerId: ['2'],
          },
        ],
      },
    };
    const result = checkUserIdConsistency(gtmData, emptyAds);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('user-id-consistency');
  });
});

// ──────────────────────────────────────────────────────────────
// 7. checkFirstPartyDataCompleteness
// ──────────────────────────────────────────────────────────────
describe('checkFirstPartyDataCompleteness', () => {
  it('should return info when there are no conversion tags', () => {
    const result = checkFirstPartyDataCompleteness(emptyGtm, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('first-party-data-completeness');
  });

  it('should PASS when tags collect many first-party data points', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Rich Data Tag',
            type: 'awct',
            parameter: [
              { key: 'email', value: '{{email}}', type: 'template' },
              { key: 'phone', value: '{{phone}}', type: 'template' },
              { key: 'address', value: '{{address}}', type: 'template' },
              { key: 'firstname', value: '{{fn}}', type: 'template' },
              { key: 'lastname', value: '{{ln}}', type: 'template' },
              { key: 'city', value: '{{city}}', type: 'template' },
              { key: 'region', value: '{{region}}', type: 'template' },
              { key: 'postal', value: '{{zip}}', type: 'template' },
              { key: 'country', value: '{{country}}', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkFirstPartyDataCompleteness(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('first-party-data-completeness');
  });

  it('should FAIL when tags collect few first-party data points', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Sparse Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123', type: 'template' },
              { key: 'conversionLabel', value: 'abc', type: 'template' },
            ],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const result = checkFirstPartyDataCompleteness(gtmData, emptyAds);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// 8. checkConversionCallbacks
// ──────────────────────────────────────────────────────────────
describe('checkConversionCallbacks', () => {
  it('should PASS when conversion tags are not on navigation triggers', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Tag',
            type: 'awct',
            parameter: [],
            firingTriggerId: ['1'],
          },
        ],
        trigger: [
          { name: 'Page View', type: 'pageview', triggerId: '1' },
        ],
      },
    };
    const result = checkConversionCallbacks(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('conversion-callbacks');
  });

  it('should FAIL when tag fires on formSubmit trigger without callback', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Lead Tag',
            type: 'awct',
            parameter: [{ key: 'conversionId', value: 'AW-123', type: 'template' }],
            firingTriggerId: ['10'],
          },
        ],
        trigger: [
          { name: 'Form Submit', type: 'formSubmit', triggerId: '10' },
        ],
      },
    };
    const result = checkConversionCallbacks(gtmData, emptyAds);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.id).toBe('conversion-callbacks');
  });

  it('should PASS when tag on navigation trigger has eventCallback', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Lead Tag',
            type: 'awct',
            parameter: [
              { key: 'conversionId', value: 'AW-123', type: 'template' },
              { key: 'eventCallback', value: '{{callback}}', type: 'template' },
            ],
            firingTriggerId: ['10'],
          },
        ],
        trigger: [
          { name: 'Form Submit', type: 'formSubmit', triggerId: '10' },
        ],
      },
    };
    const result = checkConversionCallbacks(gtmData, emptyAds);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });
});

// ──────────────────────────────────────────────────────────────
// 9. checkConversionFunnelCoverage
// ──────────────────────────────────────────────────────────────
describe('checkConversionFunnelCoverage', () => {
  it('should PASS when conversions cover multiple funnel stages', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Landing Page Visit', category: 'Page View' }),
        makeConversion({ name: 'Product View', category: 'Engagement' }),
        makeConversion({ name: 'Purchase Complete', category: 'Purchase' }),
        makeConversion({ name: 'Repeat Purchase', category: 'Purchase' }),
      ],
    };
    // Only missing retention (repeat is in the name but category is Purchase;
    // actually 'repeat' in name triggers retention). So covers all 4 stages.
    const result = checkConversionFunnelCoverage(emptyGtm, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.id).toBe('conversion-funnel-coverage');
  });

  it('should FAIL when more than 1 funnel stage is missing', () => {
    const adsData: AdsData = {
      conversions: [
        makeConversion({ name: 'Purchase Complete', category: 'Purchase' }),
      ],
    };
    const result = checkConversionFunnelCoverage(emptyGtm, adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// 10. checkConversionNamingAlignment
// ──────────────────────────────────────────────────────────────
describe('checkConversionNamingAlignment', () => {
  it('should PASS when GTM tag names match Ads conversion names', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'Purchase Conversion',
            type: 'awct',
            parameter: [],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase Conversion', status: 'Enabled' })],
    };
    const result = checkConversionNamingAlignment(gtmData, adsData);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-naming-alignment');
  });

  it('should FAIL when GTM tag names do not match Ads conversion names', () => {
    const gtmData: GTMContainer = {
      containerVersion: {
        tag: [
          {
            name: 'XYZ Foo Bar',
            type: 'awct',
            parameter: [],
            firingTriggerId: ['1'],
          },
        ],
      },
    };
    const adsData: AdsData = {
      conversions: [makeConversion({ name: 'Purchase Complete', status: 'Enabled' })],
    };
    const result = checkConversionNamingAlignment(gtmData, adsData);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('info');
    expect(result.id).toBe('conversion-naming-alignment');
  });
});

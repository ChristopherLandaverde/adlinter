import {
  checkNoActiveConversions,
  checkMissingKeyConversions,
  checkDuplicateConversions,
  checkSimilarConversionNames,
  checkZeroVolumeConversions,
  checkOtherCategoryOveruse,
  checkPurchaseMissingValue,
  checkConversionWindowTooShort,
  checkUnattachedConversions,
  checkDisabledKeyConversions,
} from '@/lib/checks/linkedinChecks';
import { LinkedInInsightData } from '@/lib/types';

const createLinkedInData = (events: Partial<LinkedInInsightData['events'][0]>[]): LinkedInInsightData => ({
  events: events.map(e => ({
    name: e.name || 'Test Conversion',
    type: e.type || 'Lead',
    status: e.status || 'active',
    conversionWindow: e.conversionWindow,
    attributionModel: e.attributionModel,
    count: e.count ?? 100,
    value: e.value ?? 0,
    currency: e.currency,
    campaignAttachments: e.campaignAttachments,
  })),
});

describe('LinkedIn Insight checks', () => {
  describe('checkNoActiveConversions', () => {
    it('should PASS when active conversions have volume', () => {
      const result = checkNoActiveConversions(createLinkedInData([{ name: 'Lead', count: 10 }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should FAIL when active conversions have no volume', () => {
      const result = checkNoActiveConversions(createLinkedInData([{ name: 'Lead', count: 0 }]));
      expect(result.passed).toBe(false);
    });

    it('should FAIL when all conversions are disabled', () => {
      const result = checkNoActiveConversions(createLinkedInData([{ status: 'disabled', count: 100 }]));
      expect(result.passed).toBe(false);
    });
  });

  describe('checkMissingKeyConversions', () => {
    it('should PASS when key conversions exist', () => {
      const result = checkMissingKeyConversions(createLinkedInData([{ type: 'Download' }]));
      expect(result.passed).toBe(true);
    });

    it('should FAIL when no key conversions exist', () => {
      const result = checkMissingKeyConversions(createLinkedInData([{ type: 'KeyPageView' }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should use warning severity for agency or other business models', () => {
      const result = checkMissingKeyConversions(createLinkedInData([{ type: 'KeyPageView' }]), { businessModel: 'agency' });
      expect(result.severity).toBe('warning');
    });
  });

  describe('checkDuplicateConversions', () => {
    it('should PASS with no duplicates', () => {
      const result = checkDuplicateConversions(createLinkedInData([{ name: 'Lead' }, { name: 'Purchase', type: 'Purchase' }]));
      expect(result.passed).toBe(true);
    });

    it('should FAIL with duplicate conversion names case-insensitively', () => {
      const result = checkDuplicateConversions(createLinkedInData([{ name: 'Demo Request' }, { name: 'demo request' }]));
      expect(result.passed).toBe(false);
      expect(result.details?.duplicates).toHaveLength(1);
    });
  });

  describe('checkSimilarConversionNames', () => {
    it('should PASS with distinct names', () => {
      const result = checkSimilarConversionNames(createLinkedInData([{ name: 'Lead' }, { name: 'Purchase', type: 'Purchase' }]));
      expect(result.passed).toBe(true);
    });

    it('should FAIL with similar names', () => {
      const result = checkSimilarConversionNames(createLinkedInData([{ name: 'Demo Request' }, { name: 'Demo Requests' }]));
      expect(result.passed).toBe(false);
      expect(result.details?.similarPairs).toHaveLength(1);
    });
  });

  describe('checkZeroVolumeConversions', () => {
    it('should PASS when all active conversions have volume', () => {
      const result = checkZeroVolumeConversions(createLinkedInData([{ count: 100 }, { count: 50 }]));
      expect(result.passed).toBe(true);
    });

    it('should FAIL when active conversions have zero volume', () => {
      const result = checkZeroVolumeConversions(createLinkedInData([{ name: 'Webinar Signup', count: 0 }]));
      expect(result.passed).toBe(false);
      expect(result.details?.zeroVolumeConversions).toContain('Webinar Signup');
    });

    it('should ignore disabled conversions with zero volume', () => {
      const result = checkZeroVolumeConversions(createLinkedInData([{ count: 0, status: 'disabled' }]));
      expect(result.passed).toBe(true);
    });
  });

  describe('checkOtherCategoryOveruse', () => {
    it('should PASS when no conversions use Other', () => {
      const result = checkOtherCategoryOveruse(createLinkedInData([{ type: 'Lead' }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('should be info when one or two conversions use Other', () => {
      const result = checkOtherCategoryOveruse(createLinkedInData([{ type: 'Other' }, { type: 'Other' }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should warn when more than two conversions use Other', () => {
      const result = checkOtherCategoryOveruse(createLinkedInData([{ type: 'Other' }, { type: 'Other' }, { type: 'Other' }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });
  });

  describe('checkPurchaseMissingValue', () => {
    it('should PASS when Purchase has value', () => {
      const result = checkPurchaseMissingValue(createLinkedInData([{ type: 'Purchase', value: 5000, count: 10 }]));
      expect(result.passed).toBe(true);
    });

    it('should FAIL when Purchase has no value', () => {
      const result = checkPurchaseMissingValue(createLinkedInData([{ type: 'Purchase', value: 0, count: 10 }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should PASS when no Purchase conversion exists', () => {
      const result = checkPurchaseMissingValue(createLinkedInData([{ type: 'Lead' }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('should be INFO severity when valueStrategy is no-values', () => {
      const result = checkPurchaseMissingValue(createLinkedInData([{ type: 'Purchase', value: 0, count: 10 }]), { valueStrategy: 'no-values' });
      expect(result.severity).toBe('info');
    });
  });

  describe('checkConversionWindowTooShort', () => {
    it('should PASS when windows are at least 7 days', () => {
      const result = checkConversionWindowTooShort(createLinkedInData([{ conversionWindow: '30 days post-click' }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('should FAIL when any window is shorter than 7 days', () => {
      const result = checkConversionWindowTooShort(createLinkedInData([{ name: 'Demo', conversionWindow: '3 days post-click' }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.details?.shortWindows).toHaveLength(1);
    });

    it('should skip for immediate sales cycles', () => {
      const result = checkConversionWindowTooShort(createLinkedInData([{ conversionWindow: '3 days post-click' }]), { salesCycle: 'immediate' });
      expect(result.passed).toBe(true);
      expect(result.description).toContain('skipped');
    });
  });

  describe('checkUnattachedConversions', () => {
    it('should PASS when active conversions are attached', () => {
      const result = checkUnattachedConversions(createLinkedInData([{ campaignAttachments: 2 }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('should FAIL when active conversions have zero campaign attachments', () => {
      const result = checkUnattachedConversions(createLinkedInData([{ name: 'Lead', campaignAttachments: 0 }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.details?.unattachedConversions).toContain('Lead');
    });
  });

  describe('checkDisabledKeyConversions', () => {
    it('should PASS when no key conversions are disabled', () => {
      const result = checkDisabledKeyConversions(createLinkedInData([{ type: 'Lead', status: 'active' }]));
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('should FAIL when Lead Purchase or SignUp conversions are disabled', () => {
      const result = checkDisabledKeyConversions(createLinkedInData([{ name: 'Old Lead', type: 'Lead', status: 'disabled' }]));
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.details?.disabledConversions).toContain('Old Lead');
    });
  });
});

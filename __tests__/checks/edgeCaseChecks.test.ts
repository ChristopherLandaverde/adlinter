import { AdsData, AdsReportData } from '@/lib/types';
import {
  checkPurchaseDisabledOthersEnabled,
  checkHighValueWrongCounting,
  checkMicroDominatingVolume,
  checkExtremeWindowMismatch,
  checkAllRoundValues,
  checkSingleCategoryDominance,
  checkVeryLongWindow,
} from '@/lib/checks/edgeCaseChecks';

describe('Edge Case Detection Checks', () => {
  describe('checkPurchaseDisabledOthersEnabled', () => {
    it('should flag purchase disabled while others enabled', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Disabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'page_view', category: 'Page view', value: 0, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkPurchaseDisabledOthersEnabled(adsData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass when purchase is enabled', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkPurchaseDisabledOthersEnabled(adsData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkHighValueWrongCounting', () => {
    it('should flag high-value purchase with wrong counting', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 500, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkHighValueWrongCounting(adsData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass with correct counting for purchases', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 500, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkHighValueWrongCounting(adsData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkMicroDominatingVolume', () => {
    it('should flag micro-conversion dominating total volume', () => {
      const adsData: AdsData = { conversions: [] };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 10, allConversions: 10, viewThroughConversions: 1, conversionsValue: 1000, allConversionsValue: 1000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 10, category: 'Purchase' },
          { name: 'page_view', conversions: 10000, allConversions: 10000, viewThroughConversions: 1000, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 10000, category: 'Page view' },
        ],
      };

      const result = checkMicroDominatingVolume(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass with balanced conversion volumes', () => {
      const adsData: AdsData = { conversions: [] };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100, category: 'Purchase' },
          { name: 'lead', conversions: 200, allConversions: 200, viewThroughConversions: 20, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 200, category: 'Lead' },
        ],
      };

      const result = checkMicroDominatingVolume(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkExtremeWindowMismatch', () => {
    it('should flag extreme click window for purchase', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '90 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkExtremeWindowMismatch(adsData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with reasonable windows', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkExtremeWindowMismatch(adsData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkAllRoundValues', () => {
    it('should flag all round number values', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'a', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'b', category: 'Purchase', value: 50, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'c', category: 'Lead', value: 25, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAllRoundValues(adsData, null);
      expect(result.passed).toBe(false);
    });

    it('should pass with varied values', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'a', category: 'Purchase', value: 127.53, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'b', category: 'Purchase', value: 89.99, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkAllRoundValues(adsData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkSingleCategoryDominance', () => {
    it('should flag single category dominance', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'lead_1', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_2', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_3', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_4', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_5', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkSingleCategoryDominance(adsData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with diverse categories', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'add_to_cart', category: 'Add to cart', value: 0, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkSingleCategoryDominance(adsData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkVeryLongWindow', () => {
    it('should flag windows >90 days', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'enterprise_sale', category: 'Sale', value: 10000, count: 'Every', attributionModel: 'DDA', clickWindow: '120 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkVeryLongWindow(adsData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with standard windows', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const result = checkVeryLongWindow(adsData, null);
      expect(result.passed).toBe(true);
    });
  });
});

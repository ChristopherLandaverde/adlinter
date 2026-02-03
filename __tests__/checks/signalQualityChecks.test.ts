import { AdsData, AdsReportData } from '@/lib/types';
import {
  checkMicroPollution,
  checkPrimaryDilution,
  checkSecondaryLeakage,
  checkZeroValuePrimary,
  checkCrossAccountImport,
  checkMicroAsPrimary,
} from '@/lib/checks/signalQualityChecks';

describe('Signal Quality Audit Checks', () => {
  describe('checkMicroPollution', () => {
    it('should flag micro-conversion pollution (>100x macro)', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 10, allConversions: 10, viewThroughConversions: 1, conversionsValue: 1000, allConversionsValue: 1000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 10, category: 'Purchase' },
          { name: 'page_view', conversions: 50000, allConversions: 50000, viewThroughConversions: 5000, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 50000, category: 'Page view' },
        ],
      };

      const result = checkMicroPollution(reportData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass with acceptable micro/macro ratio', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100, category: 'Purchase' },
          { name: 'page_view', conversions: 500, allConversions: 500, viewThroughConversions: 50, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 500, category: 'Page view' },
        ],
      };

      const result = checkMicroPollution(reportData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkPrimaryDilution', () => {
    it('should flag too many primary-eligible conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_1', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'purchase_2', category: 'Sale', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_1', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead_2', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkPrimaryDilution(reportData, adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with focused primary conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkPrimaryDilution(reportData, adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkSecondaryLeakage', () => {
    it('should flag allConversions >2x conversions', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'leaky', conversions: 100, allConversions: 300, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 15000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkSecondaryLeakage(reportData, null);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with aligned primary and all conversions', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'aligned', conversions: 100, allConversions: 120, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 6000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkSecondaryLeakage(reportData, null);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkZeroValuePrimary', () => {
    it('should flag zero-value purchase conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 0, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkZeroValuePrimary(reportData, adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass with valued purchase conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkZeroValuePrimary(reportData, adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkCrossAccountImport', () => {
    it('should detect imported conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'ga4_purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'imported_lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkCrossAccountImport(reportData, adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with no imported conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkCrossAccountImport(reportData, adsData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkMicroAsPrimary', () => {
    it('should flag enabled micro-conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'scroll_depth', category: 'Scroll', value: 0, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'page_view', category: 'Page view', value: 0, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkMicroAsPrimary(reportData, adsData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass with only macro conversions enabled', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = { conversions: [] };

      const result = checkMicroAsPrimary(reportData, adsData);
      expect(result.passed).toBe(true);
    });
  });
});

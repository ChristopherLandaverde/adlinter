import { AdsData, AdsReportData } from '@/lib/types';
import {
  checkZeroVolumeActiveConversions,
  checkOrphanedReportMetrics,
  checkValueConfigMismatch,
  checkDisabledWithVolume,
  checkSettingsReportCountMismatch,
  checkPossibleRenames,
} from '@/lib/checks/settingsReportCrossChecks';

describe('Settings-Report Cross Checks', () => {
  describe('checkZeroVolumeActiveConversions', () => {
    it('should flag enabled conversions with zero report volume', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'ghost_action', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'ghost_action', conversions: 0, allConversions: 0, viewThroughConversions: 0, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 0 },
        ],
      };

      const result = checkZeroVolumeActiveConversions(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass when all enabled conversions have volume', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkZeroVolumeActiveConversions(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkOrphanedReportMetrics', () => {
    it('should flag report conversions without settings match', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'mystery_conversion', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkOrphanedReportMetrics(adsData, reportData);
      expect(result.passed).toBe(false);
    });

    it('should pass when all report conversions have settings match', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'lead', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'lead', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 2500, allConversionsValue: 2500, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 2.5, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkOrphanedReportMetrics(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkValueConfigMismatch', () => {
    it('should flag >50% variance between configured and actual value', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 25000, allConversionsValue: 25000, valuePerConversion: 250, valuePerAllConversions: 250, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkValueConfigMismatch(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass when values are aligned', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10500, allConversionsValue: 10500, valuePerConversion: 105, valuePerAllConversions: 105, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkValueConfigMismatch(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkDisabledWithVolume', () => {
    it('should flag disabled conversions with active volume', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'old_purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Disabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'old_purchase', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkDisabledWithVolume(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass when disabled conversions have no volume', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'old_purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Disabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'old_purchase', conversions: 0, allConversions: 0, viewThroughConversions: 0, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 0 },
        ],
      };

      const result = checkDisabledWithVolume(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkSettingsReportCountMismatch', () => {
    it('should flag large count discrepancy', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'a', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'b', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'c', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'd', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'e', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'f', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'g', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
          { name: 'h', category: 'Lead', value: 50, count: 'One', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'a', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'b', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 2500, allConversionsValue: 2500, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 2.5, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkSettingsReportCountMismatch(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });
  });

  describe('checkPossibleRenames', () => {
    it('should detect possible renamed conversions', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase_complete', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase_completed', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkPossibleRenames(adsData, reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with exact name matches', () => {
      const adsData: AdsData = {
        conversions: [
          { name: 'purchase', category: 'Purchase', value: 100, count: 'Every', attributionModel: 'DDA', clickWindow: '30 days', viewWindow: '1 day', status: 'Enabled' },
        ],
      };

      const reportData: AdsReportData = {
        conversions: [
          { name: 'purchase', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkPossibleRenames(adsData, reportData);
      expect(result.passed).toBe(true);
    });
  });
});

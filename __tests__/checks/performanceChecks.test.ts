import { AdsReportData } from '@/lib/types';
import {
  checkROASOutliers,
  checkValueVariance,
  checkParetoConcentration,
  checkVTCOnlyConversions,
  checkPerfectRoundROAS,
  checkNegativeValues,
  checkIdenticalVolumes,
  checkValueWithoutVolume,
} from '@/lib/checks/performanceChecks';

describe('Performance Audit Checks', () => {
  describe('checkROASOutliers', () => {
    it('should flag extreme ROAS values', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'normal', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'extreme_high', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 100000, allConversionsValue: 100000, valuePerConversion: 2000, valuePerAllConversions: 2000, conversionValuePerCost: 150, currentModelAttributedConversions: 50 },
          { name: 'extreme_low', conversions: 50, allConversions: 50, viewThroughConversions: 5, conversionsValue: 5, allConversionsValue: 5, valuePerConversion: 0.1, valuePerAllConversions: 0.1, conversionValuePerCost: 0.005, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkROASOutliers(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with reasonable ROAS values', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'a', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'b', conversions: 80, allConversions: 80, viewThroughConversions: 8, conversionsValue: 4000, allConversionsValue: 4000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 4, currentModelAttributedConversions: 80 },
          { name: 'c', conversions: 60, allConversions: 60, viewThroughConversions: 6, conversionsValue: 3000, allConversionsValue: 3000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 3, currentModelAttributedConversions: 60 },
        ],
      };

      const result = checkROASOutliers(reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkParetoConcentration', () => {
    it('should flag extreme value concentration', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'whale', conversions: 5, allConversions: 5, viewThroughConversions: 0, conversionsValue: 50000, allConversionsValue: 50000, valuePerConversion: 10000, valuePerAllConversions: 10000, conversionValuePerCost: 10, currentModelAttributedConversions: 5 },
          { name: 'normal1', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 1000, allConversionsValue: 1000, valuePerConversion: 10, valuePerAllConversions: 10, conversionValuePerCost: 1, currentModelAttributedConversions: 100 },
          { name: 'normal2', conversions: 200, allConversions: 200, viewThroughConversions: 20, conversionsValue: 2000, allConversionsValue: 2000, valuePerConversion: 10, valuePerAllConversions: 10, conversionValuePerCost: 1, currentModelAttributedConversions: 200 },
        ],
      };

      const result = checkParetoConcentration(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });
  });

  describe('checkVTCOnlyConversions', () => {
    it('should flag conversions with only view-through volume', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'vtc_only', conversions: 50, allConversions: 50, viewThroughConversions: 50, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 50 },
        ],
      };

      const result = checkVTCOnlyConversions(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with healthy click-through contribution', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'healthy', conversions: 100, allConversions: 100, viewThroughConversions: 20, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkVTCOnlyConversions(reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkPerfectRoundROAS', () => {
    it('should flag suspiciously round ROAS values', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'round_roas', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 10000, allConversionsValue: 10000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 10, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkPerfectRoundROAS(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should pass with normal ROAS values', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'normal', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5234, allConversionsValue: 5234, valuePerConversion: 52.34, valuePerAllConversions: 52.34, conversionValuePerCost: 4.78, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkPerfectRoundROAS(reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkNegativeValues', () => {
    it('should flag negative conversion values', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'negative', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: -500, allConversionsValue: -500, valuePerConversion: -5, valuePerAllConversions: -5, conversionValuePerCost: -0.5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkNegativeValues(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should flag zero value with significant volume', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'zero_value', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 0, allConversionsValue: 0, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkNegativeValues(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });
  });

  describe('checkIdenticalVolumes', () => {
    it('should flag conversions with identical volumes', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'a', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'b', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 3000, allConversionsValue: 3000, valuePerConversion: 30, valuePerAllConversions: 30, conversionValuePerCost: 3, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkIdenticalVolumes(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('should pass with unique volumes', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'a', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
          { name: 'b', conversions: 75, allConversions: 75, viewThroughConversions: 8, conversionsValue: 3000, allConversionsValue: 3000, valuePerConversion: 40, valuePerAllConversions: 40, conversionValuePerCost: 4, currentModelAttributedConversions: 75 },
        ],
      };

      const result = checkIdenticalVolumes(reportData);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkValueWithoutVolume', () => {
    it('should flag value reported without conversions', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'broken', conversions: 0, allConversions: 0, viewThroughConversions: 0, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 0, valuePerAllConversions: 0, conversionValuePerCost: 0, currentModelAttributedConversions: 0 },
        ],
      };

      const result = checkValueWithoutVolume(reportData);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should pass when values have corresponding conversions', () => {
      const reportData: AdsReportData = {
        conversions: [
          { name: 'normal', conversions: 100, allConversions: 100, viewThroughConversions: 10, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 50, valuePerAllConversions: 50, conversionValuePerCost: 5, currentModelAttributedConversions: 100 },
        ],
      };

      const result = checkValueWithoutVolume(reportData);
      expect(result.passed).toBe(true);
    });
  });
});

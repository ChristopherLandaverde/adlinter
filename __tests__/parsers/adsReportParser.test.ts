import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';

describe('adsReportParser', () => {
  // ── JSON parsing ─────────────────────────────────────────────
  describe('JSON parsing', () => {
    it('should parse valid JSON array', () => {
      const json = JSON.stringify([
        {
          'Conversion action': 'Purchase',
          Conversions: '100',
          'All conv.': '120',
          'View-through conv.': '20',
          'Conv. value': '5000',
          'All conv. value': '6000',
          'Value / conv.': '50',
          'Value / all conv.': '50',
          'Conv. value / cost': '5.0',
          'Current model conv.': '95',
          Category: 'Purchase',
        },
      ]);
      const result = parseAdsReportCSV(json);
      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].name).toBe('Purchase');
      expect(result.conversions[0].conversions).toBe(100);
      expect(result.conversions[0].conversionValuePerCost).toBe(5.0);
      expect(result.conversions[0].category).toBe('Purchase');
    });

    it('should parse a single JSON object (non-array)', () => {
      const json = JSON.stringify({
        'Conversion action': 'Lead',
        Conversions: '50',
        'All conv.': '60',
        'View-through conv.': '5',
        'Conv. value': '2500',
        'All conv. value': '3000',
        'Value / conv.': '50',
        'Value / all conv.': '50',
        'Conv. value / cost': '2.5',
        'Current model conv.': '48',
        Category: 'Lead',
      });
      const result = parseAdsReportCSV(json);
      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].name).toBe('Lead');
    });

    it('should throw on empty JSON array', () => {
      expect(() => parseAdsReportCSV('[]')).toThrow('empty');
    });
  });

  // ── CSV parsing ──────────────────────────────────────────────
  describe('CSV parsing', () => {
    it('should parse CSV with standard column names', () => {
      const csv = [
        'Conversion action,Conversions,All conv.,View-through conv.,Conv. value,All conv. value,Value / conv.,Value / all conv.,Conv. value / cost,Current model conv.,Category',
        'Purchase,100,120,20,5000,6000,50,50,5.0,95,Purchase',
      ].join('\n');
      const result = parseAdsReportCSV(csv);
      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].name).toBe('Purchase');
      expect(result.conversions[0].conversions).toBe(100);
    });

    it('should handle API-style column aliases', () => {
      const csv = [
        'segments.conversion_action_name,metrics.conversions,metrics.all_conversions,metrics.view_through_conversions,metrics.conversions_value,metrics.all_conversions_value,metrics.value_per_conversion,metrics.value_per_all_conversions,metrics.conversions_value_per_cost,metrics.current_model_attributed_conversions,segments.conversion_action_category',
        'Purchase,100,120,20,5000,6000,50,50,5.0,95,Purchase',
      ].join('\n');
      const result = parseAdsReportCSV(csv);
      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].name).toBe('Purchase');
      expect(result.conversions[0].conversions).toBe(100);
    });

    it('should strip currency symbols and commas from numeric values', () => {
      const csv = [
        'Conversion action,Conversions,All conv.,View-through conv.,Conv. value,All conv. value,Value / conv.,Value / all conv.,Conv. value / cost,Current model conv.,Category',
        'Purchase,"1,234","1,500",200,"$50,000.00","$60,000.00","$40.54","$40.00",5.0,1200,Purchase',
      ].join('\n');
      const result = parseAdsReportCSV(csv);
      expect(result.conversions[0].conversions).toBe(1234);
      expect(result.conversions[0].conversionsValue).toBe(50000);
    });

    it('should skip summary rows at top of file', () => {
      const csv = [
        'Google Ads Performance Report',
        'Conversion action,Conversions,All conv.,View-through conv.,Conv. value,All conv. value,Value / conv.,Value / all conv.,Conv. value / cost,Current model conv.,Category',
        'Purchase,100,120,20,5000,6000,50,50,5.0,95,Purchase',
      ].join('\n');
      const result = parseAdsReportCSV(csv);
      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].name).toBe('Purchase');
    });
  });

  // ── Error handling ───────────────────────────────────────────
  describe('error handling', () => {
    it('should throw on empty CSV', () => {
      expect(() => parseAdsReportCSV('')).toThrow();
    });

    it('should throw on CSV missing name column', () => {
      const csv = [
        'Conversions,All conv.',
        '100,120',
      ].join('\n');
      expect(() => parseAdsReportCSV(csv)).toThrow('Missing conversion name column');
    });

    it('should default missing numeric fields to 0', () => {
      const csv = [
        'Conversion action,Conversions',
        'Purchase,100',
      ].join('\n');
      const result = parseAdsReportCSV(csv);
      expect(result.conversions[0].viewThroughConversions).toBe(0);
      expect(result.conversions[0].conversionValuePerCost).toBe(0);
    });
  });
});

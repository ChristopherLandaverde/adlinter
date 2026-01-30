import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Ads Parser', () => {
  describe('parseAdsCSV', () => {
    it('should parse valid Ads CSV', () => {
      const csv = readFileSync(
        join(__dirname, '../fixtures/ads-clean.csv'),
        'utf-8'
      );

      const result = parseAdsCSV(csv);

      expect(result.conversions).toBeInstanceOf(Array);
      expect(result.conversions.length).toBeGreaterThan(0);
      expect(result.conversions[0]).toHaveProperty('name');
      expect(result.conversions[0]).toHaveProperty('category');
    });

    it('should throw error for invalid CSV', () => {
      const invalidCsv = 'not,a,valid\ncsv,format';

      // Missing required columns
      expect(() => parseAdsCSV(invalidCsv))
        .toThrow('Missing required columns');
    });

    it('should parse numeric values correctly', () => {
      const csv = readFileSync(
        join(__dirname, '../fixtures/ads-clean.csv'),
        'utf-8'
      );

      const result = parseAdsCSV(csv);

      expect(typeof result.conversions[0].value).toBe('number');
    });

    it('should handle empty values gracefully', () => {
      const csvWithEmpty = `Conversion name,Category,Value,Count,Attribution model,Click-through conversion window,View-through conversion window,Status
Test,,0,One,,,Enabled`;

      const result = parseAdsCSV(csvWithEmpty);

      expect(result.conversions[0].category).toBe('');
      expect(result.conversions[0].clickWindow).toBe('');
    });
  });
});

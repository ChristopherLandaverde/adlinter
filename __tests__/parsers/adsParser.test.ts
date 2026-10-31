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

  // #60: the currency column was never read, so both currency-consistency
  // checks always reported "not available" on a real export.
  describe('currency column', () => {
    const HEADER =
      'Conversion name,Category,Value,Count,Attribution model,Click-through conversion window,View-through conversion window,Status';

    it.each([
      'Currency code',
      'Currency',
      'Default currency',
      'Default currency code',
      'Conversion currency',
      'Value currency',
      ' CURRENCY CODE ',
    ])('reads the currency from a "%s" column', (header) => {
      const csv = `${HEADER},${header}\nPurchase,Purchase,50,One,Last click,30 days,1 day,Enabled,USD`;
      expect(parseAdsCSV(csv).conversions[0].currency).toBe('USD');
    });

    it('trims and upper-cases the ISO 4217 code', () => {
      const csv = `${HEADER},Currency code\nPurchase,Purchase,50,One,Last click,30 days,1 day,Enabled, eur `;
      expect(parseAdsCSV(csv).conversions[0].currency).toBe('EUR');
    });

    it('leaves currency undefined when the cell is blank', () => {
      const csv = `${HEADER},Currency code\nPurchase,Purchase,50,One,Last click,30 days,1 day,Enabled,`;
      expect(parseAdsCSV(csv).conversions[0].currency).toBeUndefined();
    });

    it('leaves currency undefined when the export has no currency column', () => {
      const csv = `${HEADER}\nPurchase,Purchase,50,One,Last click,30 days,1 day,Enabled`;
      expect(parseAdsCSV(csv).conversions[0].currency).toBeUndefined();
    });
  });

  describe('primary status column (#69)', () => {
    const BASE = 'Conversion name,Category,Value,Count,Attribution model,Click-through conversion window,View-through conversion window,Status';

    it('reads "Action optimization" Primary/Secondary', () => {
      const csv = `${BASE},Action optimization\nPurchase,Purchase,50,One,Last click,30 days,1 day,Enabled,Primary\nAdd to cart,Add to cart,0,Every,Last click,30 days,1 day,Enabled,Secondary`;
      const [a, b] = parseAdsCSV(csv).conversions;
      expect(a.primary).toBe(true);
      expect(b.primary).toBe(false);
    });

    it('reads "Primary action" Yes/No/true/false, with a case-insensitive header', () => {
      const csv = `${BASE},PRIMARY ACTION\nA,Purchase,50,One,Last click,30 days,1 day,Enabled,Yes\nB,Purchase,50,One,Last click,30 days,1 day,Enabled,no\nC,Purchase,50,One,Last click,30 days,1 day,Enabled,TRUE\nD,Purchase,50,One,Last click,30 days,1 day,Enabled,false`;
      expect(parseAdsCSV(csv).conversions.map(c => c.primary)).toEqual([true, false, true, false]);
    });

    it('leaves primary unset when the column is missing, blank or unrecognised', () => {
      const none = parseAdsCSV(`${BASE}\nA,Purchase,50,One,Last click,30 days,1 day,Enabled`).conversions[0];
      expect(none.primary).toBeUndefined();
      expect('primary' in none).toBe(false);

      const blank = parseAdsCSV(`${BASE},Action optimization\nA,Purchase,50,One,Last click,30 days,1 day,Enabled,\nB,Purchase,50,One,Last click,30 days,1 day,Enabled,--`).conversions;
      expect(blank.map(c => c.primary)).toEqual([undefined, undefined]);
    });
  });
});

import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('GTM Parser', () => {
  describe('parseGTMJSON', () => {
    it('should parse valid GTM container', () => {
      const json = readFileSync(
        join(__dirname, '../fixtures/gtm-container-clean.json'),
        'utf-8'
      );

      const result = parseGTMJSON(json);

      expect(result.containerVersion).toBeDefined();
      expect(result.containerVersion.tag).toBeInstanceOf(Array);
      expect(result.containerVersion.trigger).toBeInstanceOf(Array);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parseGTMJSON(invalidJson)).toThrow('Invalid JSON format');
    });

    it('should throw error for missing containerVersion', () => {
      const jsonWithoutContainer = '{"someOtherField": "value"}';

      expect(() => parseGTMJSON(jsonWithoutContainer))
        .toThrow('Invalid GTM container');
    });

    it('should handle empty tag array', () => {
      const json = '{"containerVersion": {"tag": []}}';

      const result = parseGTMJSON(json);

      expect(result.containerVersion.tag).toEqual([]);
    });

    it('should default missing arrays to empty', () => {
      const json = '{"containerVersion": {}}';

      const result = parseGTMJSON(json);

      expect(result.containerVersion.tag).toEqual([]);
      expect(result.containerVersion.trigger).toEqual([]);
      expect(result.containerVersion.variable).toEqual([]);
    });
  });
});

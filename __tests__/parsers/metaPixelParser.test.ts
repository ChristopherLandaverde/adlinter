import { parseMetaPixelCSV } from '@/lib/parsers/metaPixelParser';

describe('metaPixelParser', () => {
  // ── JSON parsing ─────────────────────────────────────────────
  describe('JSON parsing', () => {
    it('should parse valid JSON array', () => {
      const json = JSON.stringify([
        {
          'Event name': 'Purchase',
          'Event type': 'Standard',
          Status: 'Active',
          'Event count': '100',
          Value: '5000',
          Currency: 'USD',
        },
        {
          'Event name': 'PageView',
          'Event type': 'Standard',
          Status: 'Active',
          'Event count': '10000',
          Value: '0',
        },
      ]);
      const result = parseMetaPixelCSV(json);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('Purchase');
      expect(result.events[0].eventType).toBe('standard');
      expect(result.events[0].eventCount).toBe(100);
      expect(result.events[0].value).toBe(5000);
    });

    it('should parse a single JSON object (non-array)', () => {
      const json = JSON.stringify({
        'Event name': 'Lead',
        'Event type': 'Standard',
        Status: 'Active',
        'Event count': '50',
        Value: '2500',
      });
      const result = parseMetaPixelCSV(json);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Lead');
    });

    it('should throw on empty JSON array', () => {
      expect(() => parseMetaPixelCSV('[]')).toThrow('empty');
    });

    it('should detect standard events automatically', () => {
      const json = JSON.stringify([
        { 'Event name': 'Purchase', 'Event count': '10' },
        { 'Event name': 'MyCustomEvent', 'Event count': '5' },
      ]);
      const result = parseMetaPixelCSV(json);
      expect(result.events[0].eventType).toBe('standard');
      expect(result.events[1].eventType).toBe('custom');
    });
  });

  // ── CSV parsing ──────────────────────────────────────────────
  describe('CSV parsing', () => {
    it('should parse CSV with standard column names', () => {
      const csv = [
        'Event name,Event type,Status,Event count,Value,Currency',
        'Purchase,Standard,Active,100,5000,USD',
        'PageView,Standard,Active,10000,0,USD',
      ].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('Purchase');
      expect(result.events[0].eventCount).toBe(100);
    });

    it('should handle different column aliases', () => {
      const csv = [
        'Event,Type,Status,Events,Conversion value',
        'AddToCart,Standard,Active,500,2500',
      ].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('AddToCart');
      expect(result.events[0].eventCount).toBe(500);
    });

    it('should strip currency symbols and handle EU number formats', () => {
      const csv = [
        'Event name,Status,Event count,Value',
        'Purchase,Active,"1,234","€5.000,50"',
      ].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.events[0].eventCount).toBe(1234);
      expect(result.events[0].value).toBe(5000.5);
    });

    it('should skip summary rows at top of file', () => {
      const csv = [
        'Meta Events Manager Export',
        'Event name,Event type,Status,Event count,Value',
        'Purchase,Standard,Active,100,5000',
      ].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Purchase');
    });
  });

  // ── Error handling ───────────────────────────────────────────
  describe('error handling', () => {
    it('should throw on empty CSV', () => {
      expect(() => parseMetaPixelCSV('')).toThrow();
    });

    it('should throw on CSV missing event name column', () => {
      const csv = ['Status,Event count', 'Active,100'].join('\n');
      expect(() => parseMetaPixelCSV(csv)).toThrow('Missing event name column');
    });

    it('should default missing numeric fields to 0', () => {
      const csv = ['Event name,Status', 'Purchase,Active'].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.events[0].eventCount).toBe(0);
      expect(result.events[0].value).toBe(0);
    });
  });

  // ── Pixel ID extraction ──────────────────────────────────────
  describe('pixel ID extraction', () => {
    it('should extract pixel ID from CSV if present', () => {
      const csv = [
        'Event name,Pixel ID,Status,Event count',
        'Purchase,123456789,Active,100',
      ].join('\n');
      const result = parseMetaPixelCSV(csv);
      expect(result.pixelId).toBe('123456789');
    });

    it('should extract pixel ID from JSON if present', () => {
      const json = JSON.stringify([
        { 'Event name': 'Purchase', 'Pixel ID': '987654321', 'Event count': '50' },
      ]);
      const result = parseMetaPixelCSV(json);
      expect(result.pixelId).toBe('987654321');
    });
  });
});

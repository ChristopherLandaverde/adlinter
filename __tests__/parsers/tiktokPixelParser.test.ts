import { parseTikTokPixelCSV } from '@/lib/parsers/tiktokPixelParser';

describe('tiktokPixelParser', () => {
  // ── JSON parsing ─────────────────────────────────────────────
  describe('JSON parsing', () => {
    it('should parse valid JSON array', () => {
      const json = JSON.stringify([
        {
          'Event name': 'CompletePayment',
          'Event type': 'Standard',
          Status: 'Active',
          'Event count': '100',
          Value: '5000',
          Currency: 'USD',
        },
        {
          'Event name': 'ViewContent',
          'Event type': 'Standard',
          Status: 'Active',
          'Event count': '10000',
          Value: '0',
        },
      ]);
      const result = parseTikTokPixelCSV(json);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('CompletePayment');
      expect(result.events[0].eventType).toBe('standard');
      expect(result.events[0].eventCount).toBe(100);
      expect(result.events[0].value).toBe(5000);
    });

    it('should parse a single JSON object (non-array)', () => {
      const json = JSON.stringify({
        'Event name': 'SubmitForm',
        'Event type': 'Standard',
        Status: 'Active',
        'Event count': '50',
        Value: '2500',
      });
      const result = parseTikTokPixelCSV(json);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('SubmitForm');
    });

    it('should throw on empty JSON array', () => {
      expect(() => parseTikTokPixelCSV('[]')).toThrow('empty');
    });

    it('should detect standard events automatically', () => {
      const json = JSON.stringify([
        { 'Event name': 'CompletePayment', 'Event count': '10' },
        { 'Event name': 'MyCustomEvent', 'Event count': '5' },
      ]);
      const result = parseTikTokPixelCSV(json);
      expect(result.events[0].eventType).toBe('standard');
      expect(result.events[1].eventType).toBe('custom');
    });
  });

  // ── CSV parsing ──────────────────────────────────────────────
  describe('CSV parsing', () => {
    it('should parse CSV with standard column names', () => {
      const csv = [
        'Event name,Event type,Status,Event count,Value,Currency',
        'CompletePayment,Standard,Active,100,5000,USD',
        'ViewContent,Standard,Active,10000,0,USD',
      ].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('CompletePayment');
      expect(result.events[0].eventCount).toBe(100);
    });

    it('should handle different column aliases', () => {
      const csv = [
        'Event,Type,Status,Events,Conversion value',
        'AddToCart,Standard,Active,500,2500',
      ].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('AddToCart');
      expect(result.events[0].eventCount).toBe(500);
    });

    it('should strip currency symbols and handle EU number formats', () => {
      const csv = [
        'Event name,Status,Event count,Value',
        'CompletePayment,Active,"1,234","€5.000,50"',
      ].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.events[0].eventCount).toBe(1234);
      expect(result.events[0].value).toBe(5000.5);
    });

    it('should skip summary rows at top of file', () => {
      const csv = [
        'TikTok Events Manager Export',
        'Event name,Event type,Status,Event count,Value',
        'CompletePayment,Standard,Active,100,5000',
      ].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('CompletePayment');
    });
  });

  // ── Error handling ───────────────────────────────────────────
  describe('error handling', () => {
    it('should throw on empty CSV', () => {
      expect(() => parseTikTokPixelCSV('')).toThrow();
    });

    it('should throw on CSV missing event name column', () => {
      const csv = ['Status,Event count', 'Active,100'].join('\n');
      expect(() => parseTikTokPixelCSV(csv)).toThrow('Missing event name column');
    });

    it('should default missing numeric fields to 0', () => {
      const csv = ['Event name,Status', 'CompletePayment,Active'].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.events[0].eventCount).toBe(0);
      expect(result.events[0].value).toBe(0);
    });
  });

  // ── Pixel code extraction ────────────────────────────────────
  describe('pixel code extraction', () => {
    it('should extract pixel code from CSV if present', () => {
      const csv = [
        'Event name,Pixel Code,Status,Event count',
        'CompletePayment,123456789,Active,100',
      ].join('\n');
      const result = parseTikTokPixelCSV(csv);
      expect(result.pixelCode).toBe('123456789');
    });

    it('should extract pixel code from JSON if present', () => {
      const json = JSON.stringify([
        { 'Event name': 'CompletePayment', 'TikTok Pixel ID': '987654321', 'Event count': '50' },
      ]);
      const result = parseTikTokPixelCSV(json);
      expect(result.pixelCode).toBe('987654321');
    });
  });
});

import { parseSnapchatCSV } from '@/lib/parsers/snapchatParser';

describe('snapchatParser', () => {
  it('parses JSON exports with Snap-specific fields', () => {
    const result = parseSnapchatCSV(JSON.stringify([
      {
        'Event name': 'PURCHASE',
        'Event type': 'Standard',
        Status: 'Active',
        'Event count': '18',
        Value: '2400',
        Currency: 'USD',
        'Pixel ID': '123e4567-e89b-12d3-a456-426614174000',
        'Conversion API Event Count': '16',
        'Deduplication ID': 'order-1001',
      },
    ]));

    expect(result.pixelId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.events[0].name).toBe('PURCHASE');
    expect(result.events[0].eventType).toBe('standard');
    expect(result.events[0].conversionApiEventCount).toBe(16);
    expect(result.events[0].deduplicationId).toBe('order-1001');
  });

  it('parses CSV exports and normalizes standard event detection', () => {
    const csv = [
      'Event name,Status,Event count,Value,Currency',
      'Start Checkout,Active,10,0,USD',
    ].join('\n');

    const result = parseSnapchatCSV(csv);
    expect(result.events[0].name).toBe('Start Checkout');
    expect(result.events[0].eventType).toBe('standard');
  });

  it('throws a useful error for malformed JSON', () => {
    expect(() => parseSnapchatCSV('{bad json')).toThrow('Invalid JSON');
  });
});

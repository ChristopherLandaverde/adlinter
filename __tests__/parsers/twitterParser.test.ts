import { parseTwitterCSV } from '@/lib/parsers/twitterParser';

describe('twitterParser', () => {
  it('parses JSON exports with event and conversion IDs', () => {
    const result = parseTwitterCSV(JSON.stringify([
      {
        'Event name': 'Purchase',
        'Event ID': 'tw-abc123-def456',
        'conversion_id': 'order-1001',
        'Event type': 'Conversion',
        Status: 'Active',
        'Event count': '42',
        Value: '$900.00',
        Currency: 'USD',
        'Attribution Window': '7 days',
        'Campaign Window': '30 days',
      },
    ]));

    expect(result.events[0].name).toBe('Purchase');
    expect(result.events[0].eventId).toBe('tw-abc123-def456');
    expect(result.events[0].conversionId).toBe('order-1001');
    expect(result.events[0].eventType).toBe('conversion');
    expect(result.events[0].value).toBe(900);
  });

  it('parses CSV exports with aliases', () => {
    const csv = [
      'Event,Event ID,Conversion ID,Type,Events',
      'Lead,tw-lead-001,lead-001,Conversion,12',
    ].join('\n');

    const result = parseTwitterCSV(csv);
    expect(result.events[0].name).toBe('Lead');
    expect(result.events[0].conversionId).toBe('lead-001');
    expect(result.events[0].eventCount).toBe(12);
  });

  it('throws a useful error for malformed JSON', () => {
    expect(() => parseTwitterCSV('{bad json')).toThrow('Invalid JSON');
  });
});

import { parsePinterestCSV } from '@/lib/parsers/pinterestParser';

describe('pinterestParser', () => {
  it('parses JSON exports with Pinterest-specific fields', () => {
    const result = parsePinterestCSV(JSON.stringify([
      {
        'Event name': 'Checkout',
        'Event type': 'Standard',
        Status: 'Active',
        'Event count': '84',
        Value: '12000',
        Currency: 'USD',
        'Tag ID': '2612345678901',
        'Partner Name': 'Shopify',
        'Enhanced Match': 'yes',
        'API Event Count': '80',
      },
    ]));

    expect(result.tagId).toBe('2612345678901');
    expect(result.partnerName).toBe('Shopify');
    expect(result.events[0].name).toBe('Checkout');
    expect(result.events[0].eventType).toBe('standard');
    expect(result.events[0].apiEventCount).toBe(80);
    expect(result.events[0].enhancedMatchConfigured).toBe(true);
  });

  it('parses CSV exports and EU number formats', () => {
    const csv = [
      'Event name,Status,Event count,Value,Currency',
      'Checkout,Active,"1,234","€5.000,50",EUR',
    ].join('\n');

    const result = parsePinterestCSV(csv);
    expect(result.events[0].eventCount).toBe(1234);
    expect(result.events[0].value).toBe(5000.5);
  });

  it('throws a useful error for malformed JSON', () => {
    expect(() => parsePinterestCSV('{bad json')).toThrow('Invalid JSON');
  });
});

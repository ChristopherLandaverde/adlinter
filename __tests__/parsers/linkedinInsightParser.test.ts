import { parseLinkedInInsightCSV } from '@/lib/parsers/linkedinInsightParser';

describe('linkedinInsightParser', () => {
  describe('JSON parsing', () => {
    it('should parse valid JSON array', () => {
      const json = JSON.stringify([
        {
          'Conversion name': 'Lead Form Submit',
          'Conversion Category': 'Lead',
          Status: 'active',
          Conversions: '100',
          Value: '5000',
          Currency: 'USD',
          Campaigns: '3',
          'Account ID': '12345678',
          'Account Name': 'Sample Account',
        },
        {
          'Conversion name': 'Pricing Page',
          'Conversion Category': 'Key Page View',
          Status: 'active',
          Conversions: '250',
          Value: '0',
        },
      ]);
      const result = parseLinkedInInsightCSV(json);
      expect(result.events).toHaveLength(2);
      expect(result.accountId).toBe('12345678');
      expect(result.accountName).toBe('Sample Account');
      expect(result.events[0].name).toBe('Lead Form Submit');
      expect(result.events[0].type).toBe('Lead');
      expect(result.events[0].count).toBe(100);
      expect(result.events[0].value).toBe(5000);
      expect(result.events[0].campaignAttachments).toBe(3);
      expect(result.events[1].type).toBe('KeyPageView');
    });

    it('should parse a single JSON object', () => {
      const json = JSON.stringify({
        name: 'Product Signup',
        type: 'Sign Up',
        status: 'enabled',
        count: '50',
      });
      const result = parseLinkedInInsightCSV(json);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('SignUp');
    });

    it('should throw on empty JSON array', () => {
      expect(() => parseLinkedInInsightCSV('[]')).toThrow('empty');
    });
  });

  describe('CSV parsing', () => {
    it('should parse CSV with standard column names', () => {
      const csv = [
        'Conversion name,Conversion Category,Status,Conversions,Value,Currency,Campaigns',
        'Purchase,Purchase,active,100,5000,USD,4',
        'Download,Download,active,10000,0,USD,2',
      ].join('\n');
      const result = parseLinkedInInsightCSV(csv);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].name).toBe('Purchase');
      expect(result.events[0].type).toBe('Purchase');
      expect(result.events[0].count).toBe(100);
    });

    it('should handle different column aliases', () => {
      const csv = [
        'Name,Type,State,Total Conversions,Conversion value,Attached Campaigns',
        'Demo Request,Lead,Active,500,2500,7',
      ].join('\n');
      const result = parseLinkedInInsightCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Demo Request');
      expect(result.events[0].count).toBe(500);
      expect(result.events[0].campaignAttachments).toBe(7);
    });

    it('should strip currency symbols and handle EU number formats', () => {
      const csv = [
        'Conversion name,Status,Conversions,Value',
        'Purchase,Active,"1,234","€5.000,50"',
      ].join('\n');
      const result = parseLinkedInInsightCSV(csv);
      expect(result.events[0].count).toBe(1234);
      expect(result.events[0].value).toBe(5000.5);
    });

    it('should skip summary rows at top of file', () => {
      const csv = [
        'LinkedIn Campaign Manager Export',
        'Conversion name,Conversion Category,Status,Conversions,Value',
        'Lead Form Submit,Lead,Active,100,0',
      ].join('\n');
      const result = parseLinkedInInsightCSV(csv);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Lead Form Submit');
    });
  });

  describe('error handling', () => {
    it('should throw on empty CSV', () => {
      expect(() => parseLinkedInInsightCSV('')).toThrow();
    });

    it('should throw on CSV missing conversion name column', () => {
      const csv = ['Status,Conversions', 'Active,100'].join('\n');
      expect(() => parseLinkedInInsightCSV(csv)).toThrow('Missing conversion name column');
    });

    it('should default missing numeric fields to 0', () => {
      const csv = ['Conversion name,Status', 'Purchase,Active'].join('\n');
      const result = parseLinkedInInsightCSV(csv);
      expect(result.events[0].count).toBe(0);
      expect(result.events[0].value).toBe(0);
    });
  });
});

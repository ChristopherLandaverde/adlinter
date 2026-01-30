import Papa from 'papaparse';
import { AdsData, AdsConversion } from '../types';

const REQUIRED_COLUMNS = ['Conversion name', 'Category', 'Value', 'Status'];

export const parseAdsCSV = (fileContent: string): AdsData => {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('CSV file is empty. Please upload a valid Google Ads conversion export.');
  }

  const headers = parsed.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}. ` +
      `Please export from Google Ads: Tools → Conversions → Download`
    );
  }

  const conversions: AdsConversion[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;
    return {
      name: String(r['Conversion name'] ?? ''),
      category: String(r['Category'] ?? ''),
      value: parseFloat(r['Value']) || 0,
      count: String(r['Count'] ?? ''),
      attributionModel: String(r['Attribution model'] ?? ''),
      clickWindow: String(r['Click-through conversion window'] ?? ''),
      viewWindow: String(r['View-through conversion window'] ?? ''),
      status: String(r['Status'] ?? ''),
    };
  });

  return { conversions };
};

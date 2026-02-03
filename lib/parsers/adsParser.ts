import Papa from 'papaparse';
import { AdsData, AdsConversion } from '../types';

// Required columns (lowercase for matching)
const REQUIRED_COLUMNS = ['conversion name', 'category', 'value', 'status'];
const REQUIRED_COLUMNS_DISPLAY = ['Conversion name', 'Category', 'Value', 'Status'];

// Parse numeric values handling both US (1,000.00) and EU (1.000,00) formats
const parseNumericValue = (val: string | undefined): number => {
  if (!val || val === '') return 0;

  let cleaned = val.replace(/[$€£¥\s%]/g, '');
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');

  if (hasComma && hasPeriod) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');
    if (lastComma > lastPeriod) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasPeriod) {
    if (/,\d{2}$/.test(cleaned) && !/,\d{3}/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const parseAdsCSV = (fileContent: string): AdsData => {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('CSV file is empty. Please upload a valid Google Ads conversion export.');
  }

  const headers = parsed.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    // Show user-friendly column names in error
    const missingDisplay = missingColumns.map(col =>
      REQUIRED_COLUMNS_DISPLAY[REQUIRED_COLUMNS.indexOf(col)] || col
    );
    throw new Error(
      `Missing required columns: ${missingDisplay.join(', ')}. ` +
      `Please export from Google Ads: Tools → Conversions → Download`
    );
  }

  const conversions: AdsConversion[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;
    return {
      name: String(r['conversion name'] ?? ''),
      category: String(r['category'] ?? ''),
      value: parseNumericValue(r['value']),
      count: String(r['count'] ?? ''),
      attributionModel: String(r['attribution model'] ?? ''),
      clickWindow: String(r['click-through conversion window'] ?? ''),
      viewWindow: String(r['view-through conversion window'] ?? ''),
      status: String(r['status'] ?? ''),
    };
  });

  return { conversions };
};

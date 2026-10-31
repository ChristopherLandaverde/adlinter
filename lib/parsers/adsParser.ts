import Papa from 'papaparse';
import { AdsData, AdsConversion } from '../types';

// Required columns (lowercase for matching)
const REQUIRED_COLUMNS = ['conversion name', 'category', 'value', 'status'];
const REQUIRED_COLUMNS_DISPLAY = ['Conversion name', 'Category', 'Value', 'Status'];

// Accepted headers for the conversion action's currency (lowercase, trimmed).
// Google Ads report downloads call the account currency "Currency code"; the
// Google Ads API calls the action's fallback currency
// value_settings.default_currency_code. Google Ads Help does not document the
// exact header of a conversion-action download, so the common variants are
// accepted.
const CURRENCY_COLUMNS = [
  'currency code',
  'currency',
  'default currency code',
  'default currency',
  'conversion currency',
  'value currency',
];

const parseCurrency = (row: Record<string, string>): string | undefined => {
  for (const col of CURRENCY_COLUMNS) {
    const code = row[col]?.trim().toUpperCase();
    if (code) return code;
  }
  return undefined;
};

// Accepted headers for whether an action is Primary or Secondary for bidding
// (lowercase, trimmed). The Google Ads conversions table shows this as "Action
// optimization" (Primary / Secondary); some downloads call it "Primary action".
const PRIMARY_COLUMNS = ['action optimization', 'action optimisation', 'primary action', 'primary'];
const PRIMARY_VALUES: Record<string, boolean> = {
  primary: true,
  secondary: false,
  'primary action': true,
  'secondary action': false,
  'secondary (observe only)': false,
  yes: true,
  no: false,
  true: true,
  false: false,
};

// true / false when the row says, undefined when it doesn't (no column, a
// blank cell, or a value that is not one of the above).
const parsePrimary = (row: Record<string, string>): boolean | undefined => {
  for (const col of PRIMARY_COLUMNS) {
    const v = row[col]?.trim().toLowerCase();
    if (v && v in PRIMARY_VALUES) return PRIMARY_VALUES[v];
  }
  return undefined;
};

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
    const primary = parsePrimary(r);
    return {
      name: String(r['conversion name'] ?? ''),
      category: String(r['category'] ?? ''),
      value: parseNumericValue(r['value']),
      count: String(r['count'] ?? ''),
      attributionModel: String(r['attribution model'] ?? ''),
      clickWindow: String(r['click-through conversion window'] ?? ''),
      viewWindow: String(r['view-through conversion window'] ?? ''),
      status: String(r['status'] ?? ''),
      currency: parseCurrency(r),
      ...(primary === undefined ? {} : { primary }),
    };
  });

  return { conversions };
};

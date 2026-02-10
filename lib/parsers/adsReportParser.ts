import Papa from 'papaparse';
import { AdsReportData, AdsReportConversion } from '../types';

// Column alias mapping: canonical key -> list of accepted header names (lowercase for matching)
const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    'conversion action',
    'conversion name',
    'conversion_action_name',
    'segments.conversion_action_name',
    'name',
  ],
  conversions: [
    'conversions',
    'conv.',
    'metrics.conversions',
  ],
  allConversions: [
    'all conv.',
    'all conversions',
    'metrics.all_conversions',
    'all_conversions',
  ],
  viewThroughConversions: [
    'view-through conv.',
    'view-through conversions',
    'metrics.view_through_conversions',
    'view_through_conversions',
  ],
  conversionsValue: [
    'conv. value',
    'conversion value',
    'conversions value',
    'metrics.conversions_value',
    'conversions_value',
  ],
  allConversionsValue: [
    'all conv. value',
    'all conversions value',
    'metrics.all_conversions_value',
    'all_conversions_value',
  ],
  valuePerConversion: [
    'value / conv.',
    'value per conversion',
    'metrics.value_per_conversion',
    'value_per_conversion',
  ],
  valuePerAllConversions: [
    'value / all conv.',
    'value per all conversions',
    'metrics.value_per_all_conversions',
    'value_per_all_conversions',
  ],
  conversionValuePerCost: [
    'conv. value / cost',
    'roas',
    'metrics.conversions_value_per_cost',
    'conversions_value_per_cost',
  ],
  currentModelAttributedConversions: [
    'current model conv.',
    'current model attributed conversions',
    'metrics.current_model_attributed_conversions',
    'current_model_attributed_conversions',
  ],
  category: [
    'category',
    'conversion category',
    'conversion_action_category',
    'segments.conversion_action_category',
  ],
};

const cleanNumeric = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  // Strip currency symbols, percent signs, whitespace
  let cleaned = val.replace(/[$€£¥\s%]/g, '');

  // Handle European number format (1.000,00) vs US format (1,000.00)
  // European: period as thousands separator, comma as decimal
  // US: comma as thousands separator, period as decimal
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');

  if (hasComma && hasPeriod) {
    // Both present: determine format by which comes last
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');

    if (lastComma > lastPeriod) {
      // European format: 1.000,00 -> 1000.00
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000.00 -> 1000.00
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasPeriod) {
    // Only comma: could be EU decimal (0,5) or US thousands (1,000)
    // If comma is followed by exactly 2 digits at end, treat as decimal
    if (/,\d{2}$/.test(cleaned) && !/,\d{3}/.test(cleaned)) {
      // European decimal: 0,50 or 1234,56
      cleaned = cleaned.replace(',', '.');
    } else {
      // US thousands separator: 1,000 or 1,000,000
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // If only period or neither, parseFloat handles it correctly

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const resolveColumn = (
  row: Record<string, string>,
  canonicalKey: string
): string | undefined => {
  const aliases = COLUMN_ALIASES[canonicalKey] || [];
  // Row keys are already lowercased by transformHeader
  for (const alias of aliases) {
    if (alias in row) return row[alias];
  }
  return undefined;
};

const isJSON = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed.startsWith('[') || trimmed.startsWith('{');
};

export const parseAdsReportCSV = (fileContent: string): AdsReportData => {
  if (isJSON(fileContent)) {
    return parseJSON(fileContent);
  }
  return parseCSV(fileContent);
};

const parseJSON = (content: string): AdsReportData => {
  const parsed = JSON.parse(content);
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];

  if (rows.length === 0) {
    throw new Error('JSON file is empty. Please upload a valid performance report.');
  }

  const conversions: AdsReportConversion[] = rows.map(row => {
    // Lowercase all keys to match the alias lookup (same as CSV transformHeader)
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = String(value ?? '');
    }
    return buildConversion(normalized);
  });

  return { conversions };
};

const parseCSV = (content: string): AdsReportData => {
  // Skip summary rows at top (Google Ads reports sometimes have them)
  const lines = content.split('\n');
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    // Skip lines that look like summary/title rows (no commas or very few fields)
    const fields = lines[i].split(',');
    if (fields.length < 2 && lines[i].trim() !== '') {
      startIdx = i + 1;
    } else {
      break;
    }
  }
  const csvContent = lines.slice(startIdx).join('\n');

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error(
      'CSV file is empty. Please upload a valid Google Ads performance report.'
    );
  }

  // Verify we have at least a name column (headers are lowercased)
  const headers = parsed.meta.fields || [];
  const nameAliases = COLUMN_ALIASES.name;
  const hasName = nameAliases.some(alias => headers.includes(alias));
  if (!hasName) {
    throw new Error(
      `Missing conversion name column. Expected one of: "Conversion action", "Conversion name". ` +
      `Please export from Google Ads: Tools & Settings > Conversions > Download report.`
    );
  }

  const conversions: AdsReportConversion[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;
    return buildConversion(r);
  });

  return { conversions };
};

const buildConversion = (r: Record<string, string>): AdsReportConversion => {
  return {
    name: String(resolveColumn(r, 'name') ?? ''),
    conversions: cleanNumeric(resolveColumn(r, 'conversions')),
    allConversions: cleanNumeric(resolveColumn(r, 'allConversions')),
    viewThroughConversions: cleanNumeric(resolveColumn(r, 'viewThroughConversions')),
    conversionsValue: cleanNumeric(resolveColumn(r, 'conversionsValue')),
    allConversionsValue: cleanNumeric(resolveColumn(r, 'allConversionsValue')),
    valuePerConversion: cleanNumeric(resolveColumn(r, 'valuePerConversion')),
    valuePerAllConversions: cleanNumeric(resolveColumn(r, 'valuePerAllConversions')),
    conversionValuePerCost: cleanNumeric(resolveColumn(r, 'conversionValuePerCost')),
    currentModelAttributedConversions: cleanNumeric(
      resolveColumn(r, 'currentModelAttributedConversions')
    ),
    category: resolveColumn(r, 'category'),
  };
};

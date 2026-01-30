import Papa from 'papaparse';
import { AdsReportData, AdsReportConversion } from '../types';

// Column alias mapping: canonical key -> list of accepted header names
const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    'Conversion action',
    'Conversion name',
    'conversion_action_name',
    'segments.conversion_action_name',
    'name',
  ],
  conversions: [
    'Conversions',
    'Conv.',
    'metrics.conversions',
    'conversions',
  ],
  allConversions: [
    'All conv.',
    'All conversions',
    'metrics.all_conversions',
    'all_conversions',
  ],
  viewThroughConversions: [
    'View-through conv.',
    'View-through conversions',
    'metrics.view_through_conversions',
    'view_through_conversions',
  ],
  conversionsValue: [
    'Conv. value',
    'Conversion value',
    'Conversions value',
    'metrics.conversions_value',
    'conversions_value',
  ],
  allConversionsValue: [
    'All conv. value',
    'All conversions value',
    'metrics.all_conversions_value',
    'all_conversions_value',
  ],
  valuePerConversion: [
    'Value / conv.',
    'Value per conversion',
    'metrics.value_per_conversion',
    'value_per_conversion',
  ],
  valuePerAllConversions: [
    'Value / all conv.',
    'Value per all conversions',
    'metrics.value_per_all_conversions',
    'value_per_all_conversions',
  ],
  conversionValuePerCost: [
    'Conv. value / cost',
    'ROAS',
    'metrics.conversions_value_per_cost',
    'conversions_value_per_cost',
  ],
  currentModelAttributedConversions: [
    'Current model conv.',
    'Current model attributed conversions',
    'metrics.current_model_attributed_conversions',
    'current_model_attributed_conversions',
  ],
  category: [
    'Category',
    'Conversion category',
    'conversion_action_category',
    'segments.conversion_action_category',
    'category',
  ],
};

const cleanNumeric = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  // Strip currency symbols, commas, percent signs, whitespace
  const cleaned = val.replace(/[$€£¥,\s%]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const resolveColumn = (
  row: Record<string, string>,
  canonicalKey: string
): string | undefined => {
  const aliases = COLUMN_ALIASES[canonicalKey] || [];
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
    const r = row as Record<string, string>;
    return buildConversion(r);
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
    transformHeader: (header: string) => header.trim(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error(
      'CSV file is empty. Please upload a valid Google Ads performance report.'
    );
  }

  // Verify we have at least a name column
  const headers = parsed.meta.fields || [];
  const nameAliases = COLUMN_ALIASES.name;
  const hasName = nameAliases.some(alias => headers.includes(alias));
  if (!hasName) {
    throw new Error(
      `Missing conversion name column. Expected one of: ${nameAliases.join(', ')}. ` +
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

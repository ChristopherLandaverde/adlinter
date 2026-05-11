import Papa from 'papaparse';
import { MetaPixelData, MetaPixelEvent } from '../types';

// Column alias mapping: canonical key -> list of accepted header names (lowercase)
const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    'event name',
    'event',
    'name',
    'conversion event',
    'conversion name',
  ],
  eventType: [
    'event type',
    'type',
    'event_type',
    'eventtype',
    'standard/custom',
  ],
  status: [
    'status',
    'state',
    'active',
    'enabled',
  ],
  eventCount: [
    'event count',
    'events',
    'count',
    'total events',
    'conversions',
    'event_count',
    'eventcount',
  ],
  value: [
    'value',
    'conversion value',
    'total value',
    'revenue',
    'event value',
  ],
  currency: [
    'currency',
    'currency code',
  ],
  attributionWindow: [
    'attribution window',
    'attribution',
    'click window',
    'view window',
    'attributionwindow',
  ],
  optimizationGoal: [
    'optimization goal',
    'optimization',
    'goal',
    'optimizationgoal',
  ],
  pixelId: [
    'pixel id',
    'pixel_id',
    'pixelid',
    'dataset id',
    'dataset_id',
    'datasetid',
  ],
  pixelName: [
    'pixel name',
    'pixel_name',
    'pixelname',
    'dataset name',
    'dataset_name',
    'datasetname',
  ],
};

const cleanNumeric = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  // Strip currency symbols, percent signs, whitespace
  let cleaned = val.replace(/[$€£¥\s%]/g, '');

  // Handle European number format (1.000,00) vs US format (1,000.00)
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');

  if (hasComma && hasPeriod) {
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
    if (/,\d{2}$/.test(cleaned) && !/,\d{3}/.test(cleaned)) {
      // European decimal: 0,50 or 1234,56
      cleaned = cleaned.replace(',', '.');
    } else {
      // US thousands separator: 1,000 or 1,000,000
      cleaned = cleaned.replace(/,/g, '');
    }
  }

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

const determineEventType = (
  typeValue: string | undefined,
  eventName: string
): 'standard' | 'custom' => {
  if (typeValue) {
    const lower = typeValue.toLowerCase();
    if (lower.includes('standard')) return 'standard';
    if (lower.includes('custom')) return 'custom';
  }

  // Standard Meta Pixel events
  const standardEvents = [
    'PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist',
    'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead',
    'CompleteRegistration', 'Contact', 'CustomizeProduct', 'Donate',
    'FindLocation', 'Schedule', 'StartTrial', 'SubmitApplication', 'Subscribe'
  ];

  const isStandard = standardEvents.some(
    se => eventName.toLowerCase() === se.toLowerCase()
  );

  return isStandard ? 'standard' : 'custom';
};

export const parseMetaPixelCSV = (fileContent: string): MetaPixelData => {
  if (isJSON(fileContent)) {
    return parseJSON(fileContent);
  }
  return parseCSV(fileContent);
};

const parseJSON = (content: string): MetaPixelData => {
  const parsed = JSON.parse(content);
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];

  if (rows.length === 0) {
    throw new Error('JSON file is empty. Please upload a valid Meta Pixel events export.');
  }

  let pixelId: string | undefined;
  let pixelName: string | undefined;

  const events: MetaPixelEvent[] = rows.map(row => {
    // Lowercase all keys to match the alias lookup
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = String(value ?? '');
    }

    // Extract pixel info from first row if available
    if (!pixelId) pixelId = resolveColumn(normalized, 'pixelId');
    if (!pixelName) pixelName = resolveColumn(normalized, 'pixelName');

    return buildEvent(normalized);
  });

  return { pixelId, pixelName, events };
};

const parseCSV = (content: string): MetaPixelData => {
  // Skip summary rows at top (Meta exports sometimes have them)
  const lines = content.split('\n');
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
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
      'CSV file is empty. Please upload a valid Meta Pixel events export.'
    );
  }

  // Verify we have at least an event name column
  const headers = parsed.meta.fields || [];
  const nameAliases = COLUMN_ALIASES.name;
  const hasName = nameAliases.some(alias => headers.includes(alias));
  if (!hasName) {
    throw new Error(
      `Missing event name column. Expected one of: "Event name", "Event", "Name". ` +
      `Please export from Meta Events Manager.`
    );
  }

  let pixelId: string | undefined;
  let pixelName: string | undefined;

  const events: MetaPixelEvent[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;

    // Extract pixel info from first row if available
    if (!pixelId) pixelId = resolveColumn(r, 'pixelId');
    if (!pixelName) pixelName = resolveColumn(r, 'pixelName');

    return buildEvent(r);
  });

  return { pixelId, pixelName, events };
};

const buildEvent = (r: Record<string, string>): MetaPixelEvent => {
  const name = String(resolveColumn(r, 'name') ?? '');
  const typeValue = resolveColumn(r, 'eventType');

  return {
    name,
    eventType: determineEventType(typeValue, name),
    status: String(resolveColumn(r, 'status') ?? 'active'),
    eventCount: cleanNumeric(resolveColumn(r, 'eventCount')),
    value: cleanNumeric(resolveColumn(r, 'value')),
    currency: resolveColumn(r, 'currency'),
    attributionWindow: resolveColumn(r, 'attributionWindow'),
    optimizationGoal: resolveColumn(r, 'optimizationGoal'),
  };
};

import Papa from 'papaparse';
import { LinkedInInsightData, LinkedInInsightEvent } from '../types';

type LinkedInConversionCategory = LinkedInInsightEvent['type'];

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['conversion name', 'name', 'event name', 'conversionname'],
  type: ['conversion category', 'category', 'type', 'conversiontype', 'conversioncategory'],
  status: ['status', 'state', 'active', 'enabled'],
  conversionWindow: ['conversion window', 'click conversion window', 'attribution window', 'conversionwindow'],
  attributionModel: ['attribution model', 'model', 'attributionmodel'],
  count: ['conversions', 'count', 'event count', 'total conversions'],
  value: ['value', 'revenue', 'conversion value', 'total value'],
  currency: ['currency', 'currency code'],
  campaignAttachments: ['campaigns', 'campaign count', 'attached campaigns', 'campaignattachments'],
  accountId: ['account id', 'accountid', 'ad account id'],
  accountName: ['account name', 'accountname', 'ad account name'],
};

const CATEGORY_ALIASES: Record<string, LinkedInConversionCategory> = {
  addtocart: 'AddToCart',
  add_to_cart: 'AddToCart',
  addtocartconversion: 'AddToCart',
  'add to cart': 'AddToCart',
  download: 'Download',
  install: 'Install',
  keypageview: 'KeyPageView',
  key_page_view: 'KeyPageView',
  'key page view': 'KeyPageView',
  pageview: 'KeyPageView',
  lead: 'Lead',
  purchase: 'Purchase',
  signup: 'SignUp',
  sign_up: 'SignUp',
  'sign up': 'SignUp',
  registration: 'SignUp',
  other: 'Other',
};

const cleanNumeric = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

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

const normalizeCategory = (value: string | undefined): LinkedInConversionCategory => {
  const raw = String(value ?? 'Other').trim();
  const compact = raw.toLowerCase().replace(/[\s-]/g, '');
  const underscore = raw.toLowerCase().replace(/[\s-]/g, '_');
  const lower = raw.toLowerCase();

  return CATEGORY_ALIASES[compact] ||
    CATEGORY_ALIASES[underscore] ||
    CATEGORY_ALIASES[lower] ||
    'Other';
};

export const parseLinkedInInsightCSV = (fileContent: string): LinkedInInsightData => {
  if (isJSON(fileContent)) {
    return parseJSON(fileContent);
  }
  return parseCSV(fileContent);
};

const parseJSON = (content: string): LinkedInInsightData => {
  const parsed = JSON.parse(content);
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];

  if (rows.length === 0) {
    throw new Error('JSON file is empty. Please upload a valid LinkedIn Campaign Manager conversions export.');
  }

  let accountId: string | undefined;
  let accountName: string | undefined;

  const events: LinkedInInsightEvent[] = rows.map(row => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = String(value ?? '');
    }

    if (!accountId) accountId = resolveColumn(normalized, 'accountId');
    if (!accountName) accountName = resolveColumn(normalized, 'accountName');

    return buildEvent(normalized);
  });

  return { accountId, accountName, events };
};

const parseCSV = (content: string): LinkedInInsightData => {
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
      'CSV file is empty. Please upload a valid LinkedIn Campaign Manager conversions export.'
    );
  }

  const headers = parsed.meta.fields || [];
  const nameAliases = COLUMN_ALIASES.name;
  const hasName = nameAliases.some(alias => headers.includes(alias));
  if (!hasName) {
    throw new Error(
      `Missing conversion name column. Expected one of: "Conversion name", "Name", "Event name". ` +
      `Please export from LinkedIn Campaign Manager.`
    );
  }

  let accountId: string | undefined;
  let accountName: string | undefined;

  const events: LinkedInInsightEvent[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;

    if (!accountId) accountId = resolveColumn(r, 'accountId');
    if (!accountName) accountName = resolveColumn(r, 'accountName');

    return buildEvent(r);
  });

  return { accountId, accountName, events };
};

const buildEvent = (r: Record<string, string>): LinkedInInsightEvent => ({
  name: String(resolveColumn(r, 'name') ?? ''),
  type: normalizeCategory(resolveColumn(r, 'type')),
  status: String(resolveColumn(r, 'status') ?? 'active'),
  conversionWindow: resolveColumn(r, 'conversionWindow'),
  attributionModel: resolveColumn(r, 'attributionModel'),
  count: cleanNumeric(resolveColumn(r, 'count')),
  value: cleanNumeric(resolveColumn(r, 'value')),
  currency: resolveColumn(r, 'currency'),
  campaignAttachments: resolveColumn(r, 'campaignAttachments') === undefined
    ? undefined
    : cleanNumeric(resolveColumn(r, 'campaignAttachments')),
});

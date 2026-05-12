import Papa from 'papaparse';
import { PinterestTagData, PinterestTagEvent } from '../types';

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['event name', 'event', 'name', 'conversion event', 'conversion name'],
  eventType: ['event type', 'type', 'event_type', 'eventtype', 'standard/custom'],
  status: ['status', 'state', 'active', 'enabled'],
  eventCount: ['event count', 'events', 'count', 'total events', 'conversions', 'event_count', 'eventcount'],
  value: ['value', 'conversion value', 'total value', 'revenue', 'event value'],
  currency: ['currency', 'currency code'],
  tagId: ['tag id', 'tag_id', 'tagid', 'pinterest tag id', 'pixel id'],
  tagName: ['tag name', 'tag_name', 'tagname', 'pinterest tag name'],
  partnerName: ['partner name', 'partner_name', 'partnername', 'integration partner', 'partner'],
  attributionWindow: ['attribution window', 'attribution', 'click window', 'view window', 'attributionwindow'],
  apiEventCount: ['api event count', 'capi events', 'conversion api events', 'conversions api events', 'server events'],
  enhancedMatchConfigured: ['enhanced match', 'enhanced match configured', 'enhanced matching', 'em configured'],
};

const STANDARD_EVENTS = ['PageVisit', 'ViewCategory', 'Search', 'AddToCart', 'Checkout', 'Lead', 'Signup', 'WatchVideo', 'Custom'];

const cleanNumeric = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  let cleaned = val.replace(/[$€£¥\s%]/g, '');
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  if (hasComma && hasPeriod) {
    cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    cleaned = /,\d{2}$/.test(cleaned) && !/,\d{3}/.test(cleaned)
      ? cleaned.replace(',', '.')
      : cleaned.replace(/,/g, '');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const cleanBoolean = (val: string | undefined): boolean | undefined => {
  if (!val) return undefined;
  const normalized = val.trim().toLowerCase();
  if (['true', 'yes', 'enabled', 'active', 'configured', '1'].includes(normalized)) return true;
  if (['false', 'no', 'disabled', 'inactive', 'missing', '0'].includes(normalized)) return false;
  return undefined;
};

const resolveColumn = (row: Record<string, string>, canonicalKey: string): string | undefined => {
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

const determineEventType = (typeValue: string | undefined, eventName: string): 'standard' | 'custom' => {
  if (typeValue) {
    const lower = typeValue.toLowerCase();
    if (lower.includes('standard')) return 'standard';
    if (lower.includes('custom')) return 'custom';
  }

  const isStandard = STANDARD_EVENTS.some(se => eventName.toLowerCase() === se.toLowerCase());
  return isStandard ? 'standard' : 'custom';
};

export const parsePinterestCSV = (fileContent: string): PinterestTagData => {
  try {
    if (isJSON(fileContent)) {
      return parseJSON(fileContent);
    }
    return parseCSV(fileContent);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Unable to parse Pinterest Tag export.');
  }
};

const parseJSON = (content: string): PinterestTagData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON. Please upload a valid Pinterest Tag events export.');
  }

  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed as Record<string, unknown>];
  if (rows.length === 0) {
    throw new Error('JSON file is empty. Please upload a valid Pinterest Tag events export.');
  }

  let tagId: string | undefined;
  let tagName: string | undefined;
  let partnerName: string | undefined;

  const events = rows.map(row => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = String(value ?? '');
    }

    if (!tagId) tagId = resolveColumn(normalized, 'tagId');
    if (!tagName) tagName = resolveColumn(normalized, 'tagName');
    if (!partnerName) partnerName = resolveColumn(normalized, 'partnerName');

    return buildEvent(normalized);
  });

  return { tagId, tagName, partnerName, events };
};

const parseCSV = (content: string): PinterestTagData => {
  const lines = content.split('\n');
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const fields = lines[i].split(',');
    if (fields.length < 2 && lines[i].trim() !== '') startIdx = i + 1;
    else break;
  }

  const parsed = Papa.parse(lines.slice(startIdx).join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('CSV file is empty. Please upload a valid Pinterest Tag events export.');
  }

  const headers = parsed.meta.fields || [];
  if (!COLUMN_ALIASES.name.some(alias => headers.includes(alias))) {
    throw new Error('Missing event name column. Expected one of: "Event name", "Event", "Name". Please export from Pinterest Events Manager.');
  }

  let tagId: string | undefined;
  let tagName: string | undefined;
  let partnerName: string | undefined;

  const events: PinterestTagEvent[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;
    if (!tagId) tagId = resolveColumn(r, 'tagId');
    if (!tagName) tagName = resolveColumn(r, 'tagName');
    if (!partnerName) partnerName = resolveColumn(r, 'partnerName');
    return buildEvent(r);
  });

  return { tagId, tagName, partnerName, events };
};

const buildEvent = (r: Record<string, string>): PinterestTagEvent => {
  const name = String(resolveColumn(r, 'name') ?? '');
  const typeValue = resolveColumn(r, 'eventType');

  return {
    name,
    eventType: determineEventType(typeValue, name),
    status: String(resolveColumn(r, 'status') ?? 'active'),
    eventCount: cleanNumeric(resolveColumn(r, 'eventCount')),
    value: cleanNumeric(resolveColumn(r, 'value')),
    currency: resolveColumn(r, 'currency'),
    tagId: resolveColumn(r, 'tagId'),
    tagName: resolveColumn(r, 'tagName'),
    partnerName: resolveColumn(r, 'partnerName'),
    attributionWindow: resolveColumn(r, 'attributionWindow'),
    apiEventCount: cleanNumeric(resolveColumn(r, 'apiEventCount')),
    enhancedMatchConfigured: cleanBoolean(resolveColumn(r, 'enhancedMatchConfigured')),
  };
};

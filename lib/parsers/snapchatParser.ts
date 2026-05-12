import Papa from 'papaparse';
import { SnapchatPixelData, SnapchatPixelEvent } from '../types';

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['event name', 'event', 'name', 'conversion event', 'conversion name'],
  eventType: ['event type', 'type', 'event_type', 'eventtype', 'standard/custom'],
  status: ['status', 'state', 'active', 'enabled'],
  eventCount: ['event count', 'events', 'count', 'total events', 'conversions', 'event_count', 'eventcount'],
  value: ['value', 'conversion value', 'total value', 'revenue', 'event value'],
  currency: ['currency', 'currency code'],
  pixelId: ['pixel id', 'pixel_id', 'pixelid', 'snap pixel id', 'snapchat pixel id'],
  pixelName: ['pixel name', 'pixel_name', 'pixelname'],
  attributionWindow: ['attribution window', 'attribution', 'conversion window', 'click window', 'attributionwindow'],
  conversionApiEventCount: ['conversion api event count', 'capi events', 'snap capi events', 'server events'],
  deduplicationId: ['deduplication id', 'dedupe id', 'event id', 'client dedup id'],
};

const STANDARD_EVENTS = ['PAGE_VIEW', 'PURCHASE', 'SAVE', 'START_CHECKOUT', 'ADD_CART', 'VIEW_CONTENT', 'SIGN_UP', 'SUBSCRIBE'];

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

const normalizeEventName = (name: string): string => name.toUpperCase().replace(/[\s-]/g, '_');

const determineEventType = (typeValue: string | undefined, eventName: string): 'standard' | 'custom' => {
  if (typeValue) {
    const lower = typeValue.toLowerCase();
    if (lower.includes('standard')) return 'standard';
    if (lower.includes('custom')) return 'custom';
  }

  return STANDARD_EVENTS.includes(normalizeEventName(eventName)) ? 'standard' : 'custom';
};

export const parseSnapchatCSV = (fileContent: string): SnapchatPixelData => {
  try {
    if (isJSON(fileContent)) {
      return parseJSON(fileContent);
    }
    return parseCSV(fileContent);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Unable to parse Snapchat Pixel export.');
  }
};

const parseJSON = (content: string): SnapchatPixelData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON. Please upload a valid Snapchat Pixel events export.');
  }

  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed as Record<string, unknown>];
  if (rows.length === 0) {
    throw new Error('JSON file is empty. Please upload a valid Snapchat Pixel events export.');
  }

  let pixelId: string | undefined;
  let pixelName: string | undefined;

  const events = rows.map(row => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = String(value ?? '');
    }

    if (!pixelId) pixelId = resolveColumn(normalized, 'pixelId');
    if (!pixelName) pixelName = resolveColumn(normalized, 'pixelName');
    return buildEvent(normalized);
  });

  return { pixelId, pixelName, events };
};

const parseCSV = (content: string): SnapchatPixelData => {
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
    throw new Error('CSV file is empty. Please upload a valid Snapchat Pixel events export.');
  }

  const headers = parsed.meta.fields || [];
  if (!COLUMN_ALIASES.name.some(alias => headers.includes(alias))) {
    throw new Error('Missing event name column. Expected one of: "Event name", "Event", "Name". Please export from Snapchat Events Manager.');
  }

  let pixelId: string | undefined;
  let pixelName: string | undefined;

  const events: SnapchatPixelEvent[] = parsed.data.map((row: unknown) => {
    const r = row as Record<string, string>;
    if (!pixelId) pixelId = resolveColumn(r, 'pixelId');
    if (!pixelName) pixelName = resolveColumn(r, 'pixelName');
    return buildEvent(r);
  });

  return { pixelId, pixelName, events };
};

const buildEvent = (r: Record<string, string>): SnapchatPixelEvent => {
  const name = String(resolveColumn(r, 'name') ?? '');
  const typeValue = resolveColumn(r, 'eventType');

  return {
    name,
    eventType: determineEventType(typeValue, name),
    status: String(resolveColumn(r, 'status') ?? 'active'),
    eventCount: cleanNumeric(resolveColumn(r, 'eventCount')),
    value: cleanNumeric(resolveColumn(r, 'value')),
    currency: resolveColumn(r, 'currency'),
    pixelId: resolveColumn(r, 'pixelId'),
    attributionWindow: resolveColumn(r, 'attributionWindow'),
    conversionApiEventCount: cleanNumeric(resolveColumn(r, 'conversionApiEventCount')),
    deduplicationId: resolveColumn(r, 'deduplicationId'),
  };
};

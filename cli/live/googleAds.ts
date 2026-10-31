// Live Google Ads read: conversion actions through GoogleAdsService search
// (GAQL on conversion_action). Each API row is mapped onto the columns of the
// Google Ads conversions download, written as CSV, and parsed by the web
// app's own CSV parser, so the engine sees exactly what file mode gives it.

import Papa from 'papaparse';
import { parseAdsCSV } from '../../lib/parsers/adsParser';
import type { AdsData } from '../../lib/types';
import { CredentialError, UsageError } from '../errors';
import type { Env } from './auth';
import { googleRequest, type FetchLike } from './http';

/** Override with ADLINT_GOOGLE_ADS_API_VERSION, e.g. "v23". */
export const DEFAULT_ADS_API_VERSION = 'v26';

export const CONVERSION_ACTION_QUERY = [
  'SELECT',
  '  conversion_action.name,',
  '  conversion_action.category,',
  '  conversion_action.status,',
  '  conversion_action.counting_type,',
  '  conversion_action.attribution_model_settings.attribution_model,',
  '  conversion_action.click_through_lookback_window_days,',
  '  conversion_action.view_through_lookback_window_days,',
  '  conversion_action.value_settings.default_value,',
  '  conversion_action.value_settings.default_currency_code,',
  '  conversion_action.primary_for_goal',
  'FROM conversion_action',
].join('\n');

export function parseCustomerId(id: string, flag = '--ads-customer'): string {
  const digits = id.trim().replace(/-/g, '');
  if (!/^\d{10}$/.test(digits)) {
    throw new UsageError(`${flag} must be a 10-digit Google Ads customer ID (dashes allowed), got "${id}"`);
  }
  return digits;
}

// ── Enum → the labels the Google Ads UI and its downloads use ───────────────
// https://developers.google.com/google-ads/api/reference/rpc/latest/ConversionActionCategoryEnum.ConversionActionCategory
const CATEGORY_LABELS: Record<string, string> = {
  DEFAULT: 'Other',
  PAGE_VIEW: 'Page view',
  PURCHASE: 'Purchase',
  SIGNUP: 'Sign-up',
  DOWNLOAD: 'Download',
  ADD_TO_CART: 'Add to cart',
  BEGIN_CHECKOUT: 'Begin checkout',
  SUBSCRIBE_PAID: 'Subscribe',
  PHONE_CALL_LEAD: 'Phone call lead',
  IMPORTED_LEAD: 'Imported lead',
  SUBMIT_LEAD_FORM: 'Submit lead form',
  BOOK_APPOINTMENT: 'Book appointment',
  REQUEST_QUOTE: 'Request quote',
  GET_DIRECTIONS: 'Get directions',
  OUTBOUND_CLICK: 'Outbound click',
  CONTACT: 'Contact',
  ENGAGEMENT: 'Engagement',
  STORE_VISIT: 'Store visit',
  STORE_SALE: 'Store sale',
  QUALIFIED_LEAD: 'Qualified lead',
  CONVERTED_LEAD: 'Converted lead',
};

// ConversionActionCountingTypeEnum
const COUNTING_LABELS: Record<string, string> = {
  ONE_PER_CLICK: 'One',
  MANY_PER_CLICK: 'Every',
};

// AttributionModelEnum. Google retired the rule-based models (first click,
// linear, time decay, position-based) for new selections, but accounts can
// still return them, so they keep their UI labels.
const ATTRIBUTION_LABELS: Record<string, string> = {
  EXTERNAL: 'External',
  GOOGLE_ADS_LAST_CLICK: 'Last click',
  GOOGLE_SEARCH_ATTRIBUTION_FIRST_CLICK: 'First click',
  GOOGLE_SEARCH_ATTRIBUTION_LINEAR: 'Linear',
  GOOGLE_SEARCH_ATTRIBUTION_TIME_DECAY: 'Time decay',
  GOOGLE_SEARCH_ATTRIBUTION_POSITION_BASED: 'Position-based',
  GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN: 'Data-driven',
};

// ConversionActionStatusEnum
const STATUS_LABELS: Record<string, string> = {
  ENABLED: 'Enabled',
  REMOVED: 'Removed',
  HIDDEN: 'Hidden',
};

const titleCase = (v: string) =>
  v.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// UNSPECIFIED and UNKNOWN carry no information, so they become a blank cell,
// as a missing value in the download would.
const label = (map: Record<string, string>, v: unknown): string =>
  typeof v === 'string' && v && v !== 'UNSPECIFIED' && v !== 'UNKNOWN' ? map[v] ?? titleCase(v) : '';

// int64 fields arrive as strings in the REST JSON encoding.
const days = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return `${n} ${n === 1 ? 'day' : 'days'}`;
};

export interface ConversionActionRow {
  conversionAction?: {
    name?: string;
    category?: string;
    status?: string;
    countingType?: string;
    attributionModelSettings?: { attributionModel?: string };
    clickThroughLookbackWindowDays?: string | number;
    viewThroughLookbackWindowDays?: string | number;
    valueSettings?: { defaultValue?: number; defaultCurrencyCode?: string };
    primaryForGoal?: boolean;
  };
}

export const CSV_COLUMNS = [
  'Conversion name',
  'Category',
  'Value',
  'Count',
  'Attribution model',
  'Click-through conversion window',
  'View-through conversion window',
  'Status',
  'Currency code',
  'Action optimization',
] as const;

/**
 * One API row → one row of the conversions download, keyed by its column header.
 * Value is value_settings.default_value. For an action that takes dynamic
 * values from the tag (always_use_default_value false), that is only the
 * fallback value, so value checks read the fallback (see README, Known limits).
 */
export function toCsvRow(row: ConversionActionRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const ca = row.conversionAction ?? {};
  const value = ca.valueSettings?.defaultValue;
  return {
    'Conversion name': ca.name ?? '',
    Category: label(CATEGORY_LABELS, ca.category),
    Value: typeof value === 'number' ? String(value) : '',
    Count: label(COUNTING_LABELS, ca.countingType),
    'Attribution model': label(ATTRIBUTION_LABELS, ca.attributionModelSettings?.attributionModel),
    'Click-through conversion window': days(ca.clickThroughLookbackWindowDays),
    'View-through conversion window': days(ca.viewThroughLookbackWindowDays),
    Status: label(STATUS_LABELS, ca.status),
    'Currency code': ca.valueSettings?.defaultCurrencyCode ?? '',
    // primary_for_goal → the conversions table's "Action optimization".
    // Absent → blank, so the check treats status as unknown, not Secondary.
    'Action optimization':
      ca.primaryForGoal === true ? 'Primary' : ca.primaryForGoal === false ? 'Secondary' : '',
  };
}

export function rowsToAdsData(rows: ConversionActionRow[]): AdsData {
  if (rows.length === 0) return { conversions: [] };
  const csv = Papa.unparse({
    fields: [...CSV_COLUMNS],
    data: rows.map(r => CSV_COLUMNS.map(c => toCsvRow(r)[c])),
  });
  return parseAdsCSV(csv);
}

export interface AdsRequestConfig {
  developerToken: string;
  loginCustomerId?: string;
  apiVersion: string;
}

export function adsConfigFromEnv(env: Env): AdsRequestConfig {
  const developerToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!developerToken) {
    throw new CredentialError(
      'GOOGLE_ADS_DEVELOPER_TOKEN is not set. The Google Ads API needs a developer token (Google Ads → Admin → API Center).'
    );
  }
  const login = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  const apiVersion = env.ADLINT_GOOGLE_ADS_API_VERSION?.trim() || DEFAULT_ADS_API_VERSION;
  if (!/^v\d+$/.test(apiVersion)) {
    throw new UsageError(`ADLINT_GOOGLE_ADS_API_VERSION must look like "v23", got "${apiVersion}"`);
  }
  return {
    developerToken,
    loginCustomerId: login ? parseCustomerId(login, 'GOOGLE_ADS_LOGIN_CUSTOMER_ID') : undefined,
    apiVersion,
  };
}

export function searchUrl(apiVersion: string, customerId: string): string {
  return `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`;
}

/** Reads every conversion action in the account, following nextPageToken. */
export async function fetchConversionActions(
  customerId: string,
  token: string,
  config: AdsRequestConfig,
  fetchImpl: FetchLike
): Promise<ConversionActionRow[]> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'developer-token': config.developerToken,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (config.loginCustomerId) headers['login-customer-id'] = config.loginCustomerId;

  const rows: ConversionActionRow[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const body: Record<string, string> = { query: CONVERSION_ACTION_QUERY };
    if (pageToken) body.pageToken = pageToken;
    const res = (await googleRequest(
      fetchImpl,
      searchUrl(config.apiVersion, customerId),
      { method: 'POST', headers, body: JSON.stringify(body) },
      'Google Ads API'
    )) as { results?: ConversionActionRow[]; nextPageToken?: string };
    rows.push(...(res.results ?? []));
    pageToken = res.nextPageToken || undefined;
    if (!pageToken) break;
  }
  return rows;
}

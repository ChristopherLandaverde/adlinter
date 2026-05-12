import { AuditCheck, AuditContext, Severity, TwitterPixelData, TwitterPixelEvent } from '../types';
import { areSimilar } from '../utils/stringDistance';

const CONVERSION_NAMES = ['Purchase', 'Lead', 'SignUp', 'Subscribe', 'Download', 'Checkout'];
const ENGAGEMENT_NAMES = ['Tweet engagements', 'Tweet Engagements', 'Retweets', 'Likes', 'Replies'];
const EVENT_ID_PATTERN = /^tw-[a-z0-9]+-[a-z0-9]+$/i;
const isActive = (event: TwitterPixelEvent): boolean => !['disabled', 'inactive', 'paused'].includes(event.status.toLowerCase());
const clean = (value?: string): string => (value ?? '').trim().toLowerCase();

const parseWindowDays = (window?: string): number | null => {
  if (!window) return null;
  const match = window.match(/(\d+(?:\.\d+)?)\s*day/i);
  return match ? Number(match[1]) : null;
};

export const checkEventIdFormat = (twitterData: TwitterPixelData): AuditCheck => {
  const invalid = twitterData.events.filter(e => !e.eventId || !EVENT_ID_PATTERN.test(e.eventId));

  return {
    id: 'twitter-event-id-format',
    severity: invalid.length > 0 ? 'critical' : 'info',
    passed: invalid.length === 0,
    title: 'Invalid Event ID Format',
    description: invalid.length > 0 ? `${invalid.length} event(s) do not use the tw-XXXX-XXXX event ID format` : 'All event IDs use the expected Twitter/X format',
    details: { invalidEvents: invalid.map(e => ({ name: e.name, eventId: e.eventId ?? '' })) },
    recommendation: 'Use Twitter/X event IDs in the expected tw-XXXX-XXXX format so website tag events map to the intended conversion events.',
  };
};

export const checkConversionIdRequired = (twitterData: TwitterPixelData): AuditCheck => {
  const missing = twitterData.events.filter(e => isActive(e) && e.eventType === 'conversion' && !e.conversionId);

  return {
    id: 'twitter-conversion-id-required',
    severity: 'critical',
    passed: missing.length === 0,
    title: 'Missing conversion_id',
    description: missing.length > 0 ? `${missing.length} active conversion event(s) are missing conversion_id` : 'Active conversion events include conversion_id',
    details: { missingConversionId: missing.map(e => e.name) },
    recommendation: 'Pass conversion_id on every Twitter/X conversion event that should deduplicate browser, server, or repeated hits.',
  };
};

export const checkDeduplication = (twitterData: TwitterPixelData): AuditCheck => {
  const conversionIds = twitterData.events.filter(e => isActive(e) && e.eventType === 'conversion').map(e => e.conversionId).filter(Boolean);
  const missing = twitterData.events.filter(e => isActive(e) && e.eventType === 'conversion' && !e.conversionId);
  const duplicates = conversionIds.filter((id, index) => conversionIds.indexOf(id) !== index);

  return {
    id: 'twitter-deduplication-conversion-id',
    severity: missing.length > 0 || duplicates.length > 0 ? 'warning' : 'info',
    passed: missing.length === 0 && duplicates.length === 0,
    title: 'Deduplication via conversion_id',
    description: missing.length > 0 || duplicates.length > 0
      ? 'conversion_id coverage is incomplete or reused across exported events'
      : 'conversion_id values are present and unique across conversion events',
    details: { missingConversionId: missing.map(e => e.name), duplicateConversionIds: Array.from(new Set(duplicates)) },
    recommendation: 'Use a stable, unique conversion_id per business event and reuse it only when deduplicating the same event across browser and server sources.',
  };
};

export const checkConversionWindowMismatch = (twitterData: TwitterPixelData, context?: AuditContext): AuditCheck => {
  const mismatched = twitterData.events
    .map(e => ({ name: e.name, attributionWindow: e.attributionWindow, campaignWindow: e.campaignWindow, days: parseWindowDays(e.attributionWindow), campaignDays: parseWindowDays(e.campaignWindow) }))
    .filter(e => e.days !== null && e.campaignDays !== null && e.days !== e.campaignDays);

  const tooShortForContext = context?.salesCycle && !['immediate', 'short'].includes(context.salesCycle)
    ? twitterData.events.filter(e => {
      const days = parseWindowDays(e.attributionWindow);
      return days !== null && days < 7;
    })
    : [];

  return {
    id: 'twitter-conversion-window-mismatch',
    severity: mismatched.length > 0 || tooShortForContext.length > 0 ? 'warning' : 'info',
    passed: mismatched.length === 0 && tooShortForContext.length === 0,
    title: 'Conversion Window Mismatches',
    description: mismatched.length > 0
      ? `${mismatched.length} event(s) use conversion windows that differ from campaign settings`
      : tooShortForContext.length > 0 ? `${tooShortForContext.length} event(s) use short windows for the selected sales cycle` : 'Conversion windows are aligned where provided',
    details: { mismatchedWindows: mismatched, shortWindows: tooShortForContext.map(e => e.name) },
    recommendation: 'Align Twitter/X conversion windows with campaign settings and the real sales cycle so reporting does not cut off valid delayed conversions.',
  };
};

export const checkEngagementVsConversionEvents = (twitterData: TwitterPixelData): AuditCheck => {
  const active = twitterData.events.filter(isActive);
  const engagementOnly = active.length > 0 && active.every(e => e.eventType === 'engagement' || ENGAGEMENT_NAMES.some(name => clean(name) === clean(e.name)));

  return {
    id: 'twitter-engagements-vs-conversions',
    severity: engagementOnly ? 'critical' : 'info',
    passed: !engagementOnly,
    title: 'Tweet Engagements Used Instead of Conversions',
    description: engagementOnly ? 'Only Tweet engagement style events are active; no website conversion outcome is present' : 'Twitter/X conversion events are present alongside any engagement events',
    details: { activeEvents: active.map(e => e.name) },
    recommendation: 'Keep Tweet engagement metrics separate from conversion events and configure Purchase, Lead, SignUp, or another website outcome for conversion optimization.',
  };
};

export const checkMissingConversionEvents = (twitterData: TwitterPixelData, context?: AuditContext): AuditCheck => {
  const activeEvents = twitterData.events.filter(isActive);
  const found = activeEvents.filter(e => e.eventType === 'conversion' || CONVERSION_NAMES.some(name => clean(name) === clean(e.name))).map(e => e.name);
  let severity: Severity = 'critical';
  if (context?.businessModel === 'agency' || context?.businessModel === 'other') severity = 'warning';

  return {
    id: 'twitter-missing-conversion-events',
    severity,
    passed: found.length > 0,
    title: 'Missing Conversion Events',
    description: found.length > 0 ? `Found ${found.length} conversion event(s): ${found.join(', ')}` : 'No active Twitter/X website conversion events found',
    details: found.length > 0 ? { conversionEvents: found } : {},
    recommendation: 'Configure at least one Twitter/X conversion event that maps to the business outcome, such as Purchase, Lead, SignUp, or Subscribe.',
  };
};

export const checkDuplicateEvents = (twitterData: TwitterPixelData): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of twitterData.events) nameCounts[clean(event.name)] = (nameCounts[clean(event.name)] || 0) + 1;
  const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));

  return {
    id: 'twitter-duplicate-events',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Event Names',
    description: duplicates.length > 0 ? `Found ${duplicates.length} duplicate event name(s)` : 'No duplicate event names found',
    details: { duplicates },
    recommendation: 'Consolidate duplicate Twitter/X event names so reports and optimization do not split or double-count one action.',
  };
};

export const checkSimilarEventNames = (twitterData: TwitterPixelData): AuditCheck => {
  const similarPairs: Array<{ event1: string; event2: string }> = [];
  for (let i = 0; i < twitterData.events.length; i++) {
    for (let j = i + 1; j < twitterData.events.length; j++) {
      const event1 = twitterData.events[i].name;
      const event2 = twitterData.events[j].name;
      if (clean(event1) !== clean(event2) && areSimilar(event1, event2)) similarPairs.push({ event1, event2 });
    }
  }

  return {
    id: 'twitter-similar-event-names',
    severity: 'info',
    passed: similarPairs.length === 0,
    title: 'Similar Event Names',
    description: similarPairs.length > 0 ? `Found ${similarPairs.length} similarly named event pair(s)` : 'No similarly named events found',
    details: { similarPairs },
    recommendation: 'Review similar Twitter/X event names and consolidate them if they represent the same conversion action.',
  };
};

export const checkZeroVolumeEvents = (twitterData: TwitterPixelData): AuditCheck => {
  const zeroVolume = twitterData.events.filter(e => isActive(e) && e.eventCount === 0);

  return {
    id: 'twitter-zero-volume-events',
    severity: 'warning',
    passed: zeroVolume.length === 0,
    title: 'Zero Volume Active Events',
    description: zeroVolume.length > 0 ? `${zeroVolume.length} active event(s) have zero recorded volume` : 'All active events have recorded volume',
    details: { zeroVolumeEvents: zeroVolume.map(e => e.name) },
    recommendation: 'Investigate active Twitter/X events with zero volume for broken tags, restrictive rules, blocked requests, or inactive campaigns.',
  };
};

export const checkPurchaseValue = (twitterData: TwitterPixelData, context?: AuditContext): AuditCheck => {
  const purchaseEvents = twitterData.events.filter(e => clean(e.name) === 'purchase' || clean(e.name) === 'checkout');
  if (purchaseEvents.length === 0) {
    return {
      id: 'twitter-purchase-missing-value',
      severity: 'info',
      passed: true,
      title: 'Purchase Event Value Tracking',
      description: 'No Purchase or Checkout events configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const missingValue = purchaseEvents.filter(e => e.eventCount > 0 && e.value === 0);
  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') severity = 'info';

  return {
    id: 'twitter-purchase-missing-value',
    severity,
    passed: missingValue.length === 0,
    title: 'Purchase Event Value Tracking',
    description: missingValue.length > 0 ? 'Purchase or Checkout event(s) are firing without value data' : 'Purchase or Checkout events include value data',
    details: { purchaseEvents: purchaseEvents.map(e => ({ name: e.name, eventCount: e.eventCount, value: e.value, hasValue: e.value > 0 })) },
    recommendation: 'Pass value and currency with Twitter/X purchase-style conversion events when revenue reporting or ROAS analysis matters.',
  };
};

export const allTwitterChecks: Array<(twitterData: TwitterPixelData, context?: AuditContext) => AuditCheck> = [
  checkEventIdFormat,
  checkConversionIdRequired,
  checkDeduplication,
  checkConversionWindowMismatch,
  checkEngagementVsConversionEvents,
  checkMissingConversionEvents,
  checkDuplicateEvents,
  checkSimilarEventNames,
  checkZeroVolumeEvents,
  checkPurchaseValue,
];

import { AuditCheck, AuditContext, Severity, SnapchatPixelData } from '../types';
import { areSimilar } from '../utils/stringDistance';

const STANDARD_EVENTS = ['PAGE_VIEW', 'PURCHASE', 'SAVE', 'START_CHECKOUT', 'ADD_CART', 'VIEW_CONTENT', 'SIGN_UP', 'SUBSCRIBE'];
const ECOMMERCE_EVENTS = ['PAGE_VIEW', 'VIEW_CONTENT', 'ADD_CART', 'START_CHECKOUT', 'PURCHASE'];
const CONVERSION_EVENTS = ['PURCHASE', 'SIGN_UP', 'SUBSCRIBE', 'START_CHECKOUT'];
const PIXEL_ID_PATTERN = /^[a-f0-9-]{32,36}$/i;

const clean = (value?: string): string => (value ?? '').trim().toLowerCase();
const normalizeName = (value: string): string => value.toUpperCase().replace(/[\s-]/g, '_');
const isActive = (status: string): boolean => !['disabled', 'inactive', 'paused'].includes(status.toLowerCase());

export const checkPixelIdFormat = (snapchatData: SnapchatPixelData): AuditCheck => {
  const ids = new Set([snapchatData.pixelId, ...snapchatData.events.map(e => e.pixelId)].filter((id): id is string => !!id));
  const invalidIds = Array.from(ids).filter(id => !PIXEL_ID_PATTERN.test(id));
  const hasValidId = Array.from(ids).some(id => PIXEL_ID_PATTERN.test(id));

  return {
    id: 'snapchat-pixel-id-format',
    severity: hasValidId && invalidIds.length === 0 ? 'info' : 'critical',
    passed: hasValidId && invalidIds.length === 0,
    title: 'Snap Pixel ID Format',
    description: hasValidId && invalidIds.length === 0 ? 'Snap Pixel ID format looks valid' : 'Snap Pixel ID is missing or does not match the expected UUID-style format',
    details: { invalidPixelIds: invalidIds },
    recommendation: 'Use the exact Snap Pixel ID from Snapchat Events Manager and verify it is copied consistently into every tag or integration.',
  };
};

export const checkPageViewEvent = (snapchatData: SnapchatPixelData): AuditCheck => {
  const hasPageView = snapchatData.events.some(e => normalizeName(e.name) === 'PAGE_VIEW' && isActive(e.status));

  return {
    id: 'snapchat-missing-page-view',
    severity: 'critical',
    passed: hasPageView,
    title: 'Missing PAGE_VIEW Event',
    description: hasPageView ? 'PAGE_VIEW event is configured and active' : 'No active PAGE_VIEW event found',
    recommendation: 'Add a PAGE_VIEW event that fires on tracked pages so Snapchat audiences and funnel diagnostics have a base signal.',
  };
};

export const checkMissingConversionEvents = (snapchatData: SnapchatPixelData, context?: AuditContext): AuditCheck => {
  const activeNames = snapchatData.events.filter(e => isActive(e.status)).map(e => normalizeName(e.name));
  const found = CONVERSION_EVENTS.filter(name => activeNames.includes(name));
  let severity: Severity = 'critical';
  if (context?.businessModel === 'agency' || context?.businessModel === 'other') severity = 'warning';

  return {
    id: 'snapchat-missing-conversion-events',
    severity,
    passed: found.length > 0,
    title: 'Missing Conversion Events',
    description: found.length > 0 ? `Found ${found.length} conversion event(s): ${found.join(', ')}` : 'No active PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT event found',
    details: found.length > 0 ? { conversionEvents: found } : {},
    recommendation: 'Configure at least one Snap standard conversion event that maps to the business outcome, such as PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT.',
  };
};

export const checkStandardEventNames = (snapchatData: SnapchatPixelData): AuditCheck => {
  const nonStandard = snapchatData.events.filter(e => e.eventType === 'standard' && !STANDARD_EVENTS.includes(normalizeName(e.name)));

  return {
    id: 'snapchat-standard-event-names',
    severity: nonStandard.length > 0 ? 'warning' : 'info',
    passed: nonStandard.length === 0,
    title: 'Snap Standard Event Names',
    description: nonStandard.length > 0 ? `${nonStandard.length} standard event(s) do not match Snap standard names` : 'Standard events match Snap naming',
    details: { nonStandardEvents: nonStandard.map(e => e.name) },
    recommendation: 'Use Snap standard event names exactly, including PAGE_VIEW, PURCHASE, SAVE, START_CHECKOUT, ADD_CART, VIEW_CONTENT, SIGN_UP, and SUBSCRIBE.',
  };
};

export const checkDuplicateEvents = (snapchatData: SnapchatPixelData): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of snapchatData.events) nameCounts[normalizeName(event.name)] = (nameCounts[normalizeName(event.name)] || 0) + 1;
  const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));

  return {
    id: 'snapchat-duplicate-events',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Event Names',
    description: duplicates.length > 0 ? `Found ${duplicates.length} duplicate event name(s)` : 'No duplicate event names found',
    details: { duplicates },
    recommendation: 'Consolidate duplicate Snap events so one business action maps to one event and one optimization signal.',
  };
};

export const checkSimilarEventNames = (snapchatData: SnapchatPixelData): AuditCheck => {
  const similarPairs: Array<{ event1: string; event2: string }> = [];
  for (let i = 0; i < snapchatData.events.length; i++) {
    for (let j = i + 1; j < snapchatData.events.length; j++) {
      const event1 = snapchatData.events[i].name;
      const event2 = snapchatData.events[j].name;
      if (clean(event1) !== clean(event2) && areSimilar(event1, event2)) similarPairs.push({ event1, event2 });
    }
  }

  return {
    id: 'snapchat-similar-event-names',
    severity: 'info',
    passed: similarPairs.length === 0,
    title: 'Similar Event Names',
    description: similarPairs.length > 0 ? `Found ${similarPairs.length} similarly named event pair(s)` : 'No similarly named events found',
    details: { similarPairs },
    recommendation: 'Review similar Snapchat event names and consolidate them when they represent the same action.',
  };
};

export const checkZeroVolumeEvents = (snapchatData: SnapchatPixelData): AuditCheck => {
  const zeroVolume = snapchatData.events.filter(e => isActive(e.status) && e.eventCount === 0);

  return {
    id: 'snapchat-zero-volume-events',
    severity: 'warning',
    passed: zeroVolume.length === 0,
    title: 'Zero Volume Active Events',
    description: zeroVolume.length > 0 ? `${zeroVolume.length} active event(s) have zero recorded volume` : 'All active events have recorded volume',
    details: { zeroVolumeEvents: zeroVolume.map(e => e.name) },
    recommendation: 'Investigate active Snap events with zero volume for broken triggers, blocked requests, or overly narrow event rules.',
  };
};

export const checkPurchaseValue = (snapchatData: SnapchatPixelData, context?: AuditContext): AuditCheck => {
  const purchaseEvents = snapchatData.events.filter(e => normalizeName(e.name) === 'PURCHASE');
  if (purchaseEvents.length === 0) {
    return {
      id: 'snapchat-purchase-missing-value',
      severity: 'info',
      passed: true,
      title: 'Purchase Event Value Tracking',
      description: 'No PURCHASE events configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const missingValue = purchaseEvents.filter(e => e.eventCount > 0 && e.value === 0);
  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') severity = 'info';

  return {
    id: 'snapchat-purchase-missing-value',
    severity,
    passed: missingValue.length === 0,
    title: 'Purchase Event Value Tracking',
    description: missingValue.length > 0 ? 'PURCHASE event(s) are firing without value data' : 'PURCHASE events include value data',
    details: { purchaseEvents: purchaseEvents.map(e => ({ name: e.name, eventCount: e.eventCount, value: e.value, hasValue: e.value > 0 })) },
    recommendation: 'Pass value and currency with Snap PURCHASE events when revenue reporting or value-based optimization matters.',
  };
};

export const checkEcommerceFunnel = (snapchatData: SnapchatPixelData, context?: AuditContext): AuditCheck => {
  if (context?.businessModel && context.businessModel !== 'ecommerce') {
    return {
      id: 'snapchat-ecommerce-funnel',
      severity: 'info',
      passed: true,
      title: 'E-commerce Funnel Events',
      description: 'Not an e-commerce business model (check skipped)',
      recommendation: 'N/A',
    };
  }

  const activeNames = snapchatData.events.filter(e => isActive(e.status)).map(e => normalizeName(e.name));
  const missingEvents = ECOMMERCE_EVENTS.filter(name => !activeNames.includes(name));

  return {
    id: 'snapchat-ecommerce-funnel',
    severity: missingEvents.length > 2 ? 'warning' : 'info',
    passed: missingEvents.length === 0,
    title: 'E-commerce Funnel Events',
    description: missingEvents.length > 0 ? `Missing ${missingEvents.length} Snap e-commerce funnel event(s)` : 'All standard Snap e-commerce funnel events are configured',
    details: { expectedEvents: ECOMMERCE_EVENTS, missingEvents },
    recommendation: 'Configure the Snap funnel from PAGE_VIEW to VIEW_CONTENT, ADD_CART, START_CHECKOUT, and PURCHASE for cleaner audiences and diagnostics.',
  };
};

export const checkDeduplicationApiCurrency = (snapchatData: SnapchatPixelData): AuditCheck => {
  const missingDedup = snapchatData.events.filter(e => isActive(e.status) && e.eventCount > 0 && !e.deduplicationId);
  const browserOnly = snapchatData.events.filter(e => isActive(e.status) && e.eventCount > 0 && (!e.conversionApiEventCount || e.conversionApiEventCount === 0));
  const currencies = new Set(snapchatData.events.map(e => e.currency).filter(Boolean));
  const mixedCurrency = currencies.size > 1;
  const issues = [
    ...(missingDedup.length > 0 ? [`${missingDedup.length} event(s) missing deduplication ID`] : []),
    ...(browserOnly.length > 0 ? [`${browserOnly.length} event(s) missing Snap Conversions API volume`] : []),
    ...(mixedCurrency ? ['Multiple currencies present'] : []),
  ];

  return {
    id: 'snapchat-capi-dedup-currency',
    severity: issues.length > 0 ? 'warning' : 'info',
    passed: issues.length === 0,
    title: 'Snap CAPI, Deduplication, and Currency Alignment',
    description: issues.length > 0 ? issues.join('; ') : 'Deduplication, Snap Conversions API, and currency fields look aligned',
    details: { issues, missingDedupEvents: missingDedup.map(e => e.name), browserOnlyEvents: browserOnly.map(e => e.name), currencies: Array.from(currencies) },
    recommendation: 'Align Snap Pixel and Conversions API payloads with a shared deduplication ID and one currency standard for value events.',
  };
};

export const allSnapchatChecks: Array<(snapchatData: SnapchatPixelData, context?: AuditContext) => AuditCheck> = [
  checkPixelIdFormat,
  checkPageViewEvent,
  checkMissingConversionEvents,
  checkStandardEventNames,
  checkDuplicateEvents,
  checkSimilarEventNames,
  checkZeroVolumeEvents,
  checkPurchaseValue,
  checkEcommerceFunnel,
  checkDeduplicationApiCurrency,
];

import { AuditCheck, AuditContext, PinterestTagData, Severity } from '../types';
import { areSimilar } from '../utils/stringDistance';

const STANDARD_EVENTS = ['PageVisit', 'ViewCategory', 'Search', 'AddToCart', 'Checkout', 'Lead', 'Signup', 'WatchVideo', 'Custom'];
const ECOMMERCE_EVENTS = ['PageVisit', 'ViewCategory', 'AddToCart', 'Checkout'];
const CONVERSION_EVENTS = ['Checkout', 'Lead', 'Signup'];

const isActive = (status: string): boolean => !['disabled', 'inactive', 'paused'].includes(status.toLowerCase());
const clean = (value?: string): string => (value ?? '').trim().toLowerCase();

export const checkPageVisitEvent = (pinterestData: PinterestTagData): AuditCheck => {
  const hasPageVisit = pinterestData.events.some(e => clean(e.name) === 'pagevisit' && isActive(e.status));

  return {
    id: 'pinterest-missing-pagevisit',
    severity: 'critical',
    passed: hasPageVisit,
    title: 'Missing PageVisit Event',
    description: hasPageVisit ? 'PageVisit event is configured and active' : 'No active PageVisit event found for the Pinterest Tag',
    recommendation: 'Add a Pinterest PageVisit event that fires on all tracked pages so audiences and funnel diagnostics have a base signal.',
  };
};

export const checkConversionEvents = (pinterestData: PinterestTagData, context?: AuditContext): AuditCheck => {
  const activeEvents = pinterestData.events.filter(e => isActive(e.status));
  const foundConversions = activeEvents.filter(e => CONVERSION_EVENTS.some(name => clean(name) === clean(e.name))).map(e => e.name);
  let severity: Severity = 'critical';
  if (context?.businessModel === 'agency' || context?.businessModel === 'other') severity = 'warning';

  return {
    id: 'pinterest-missing-conversion-events',
    severity,
    passed: foundConversions.length > 0,
    title: 'Missing Conversion Events',
    description: foundConversions.length > 0
      ? `Found ${foundConversions.length} conversion event(s): ${foundConversions.join(', ')}`
      : 'No active Checkout, Lead, or Signup event found',
    details: foundConversions.length > 0 ? { conversionEvents: foundConversions } : {},
    recommendation: 'Configure Checkout for ecommerce or Lead/Signup for lead generation so Pinterest campaigns can optimize toward business outcomes.',
  };
};

export const checkDuplicateEvents = (pinterestData: PinterestTagData): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of pinterestData.events) nameCounts[clean(event.name)] = (nameCounts[clean(event.name)] || 0) + 1;
  const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));

  return {
    id: 'pinterest-duplicate-events',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Event Names',
    description: duplicates.length > 0 ? `Found ${duplicates.length} duplicate event name(s)` : 'No duplicate event names found',
    details: { duplicates },
    recommendation: 'Consolidate duplicate Pinterest events so one business action maps to one event name and one optimization signal.',
  };
};

export const checkSimilarEventNames = (pinterestData: PinterestTagData): AuditCheck => {
  const similarPairs: Array<{ event1: string; event2: string }> = [];
  for (let i = 0; i < pinterestData.events.length; i++) {
    for (let j = i + 1; j < pinterestData.events.length; j++) {
      const event1 = pinterestData.events[i].name;
      const event2 = pinterestData.events[j].name;
      if (clean(event1) !== clean(event2) && areSimilar(event1, event2)) similarPairs.push({ event1, event2 });
    }
  }

  return {
    id: 'pinterest-similar-event-names',
    severity: 'info',
    passed: similarPairs.length === 0,
    title: 'Similar Event Names',
    description: similarPairs.length > 0 ? `Found ${similarPairs.length} similarly named event pair(s)` : 'No similarly named events found',
    details: { similarPairs },
    recommendation: 'Review similar Pinterest event names and consolidate them when they represent the same action.',
  };
};

export const checkZeroVolumeEvents = (pinterestData: PinterestTagData): AuditCheck => {
  const zeroVolume = pinterestData.events.filter(e => isActive(e.status) && e.eventCount === 0);

  return {
    id: 'pinterest-zero-volume-events',
    severity: 'warning',
    passed: zeroVolume.length === 0,
    title: 'Zero Volume Active Events',
    description: zeroVolume.length > 0 ? `${zeroVolume.length} active event(s) have zero recorded volume` : 'All active events have recorded volume',
    details: { zeroVolumeEvents: zeroVolume.map(e => e.name) },
    recommendation: 'Investigate active Pinterest events with zero volume for broken triggers, blocked tags, or incorrect event names.',
  };
};

export const checkStandardEventNames = (pinterestData: PinterestTagData): AuditCheck => {
  const customLikeStandard = pinterestData.events.filter(e => {
    if (e.eventType !== 'custom') return false;
    const normalized = e.name.toLowerCase().replace(/[_\-\s]/g, '');
    return STANDARD_EVENTS.some(name => normalized.includes(name.toLowerCase()) || name.toLowerCase().includes(normalized));
  });

  return {
    id: 'pinterest-standard-event-names',
    severity: 'info',
    passed: customLikeStandard.length === 0,
    title: 'Custom Events May Have Standard Alternatives',
    description: customLikeStandard.length > 0
      ? `${customLikeStandard.length} custom event(s) may have Pinterest standard event equivalents`
      : 'Custom events appear appropriately named',
    details: { customEvents: customLikeStandard.map(e => e.name) },
    recommendation: 'Use Pinterest standard event names such as Checkout, AddToCart, Lead, and Signup when they fit the user action.',
  };
};

export const checkCheckoutValue = (pinterestData: PinterestTagData, context?: AuditContext): AuditCheck => {
  const checkoutEvents = pinterestData.events.filter(e => clean(e.name) === 'checkout');
  if (checkoutEvents.length === 0) {
    return {
      id: 'pinterest-checkout-missing-value',
      severity: 'info',
      passed: true,
      title: 'Checkout Event Value Tracking',
      description: 'No Checkout events configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const missingValue = checkoutEvents.filter(e => e.eventCount > 0 && e.value === 0);
  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') severity = 'info';

  return {
    id: 'pinterest-checkout-missing-value',
    severity,
    passed: missingValue.length === 0,
    title: 'Checkout Event Value Tracking',
    description: missingValue.length > 0 ? 'Checkout event(s) are firing without value data' : 'Checkout events include value data',
    details: { checkoutEvents: checkoutEvents.map(e => ({ name: e.name, eventCount: e.eventCount, value: e.value, hasValue: e.value > 0 })) },
    recommendation: 'Pass value and currency with Pinterest Checkout events when revenue or ROAS analysis matters.',
  };
};

export const checkEcommerceFunnel = (pinterestData: PinterestTagData, context?: AuditContext): AuditCheck => {
  if (context?.businessModel && context.businessModel !== 'ecommerce') {
    return {
      id: 'pinterest-ecommerce-funnel',
      severity: 'info',
      passed: true,
      title: 'E-commerce Funnel Events',
      description: 'Not an e-commerce business model (check skipped)',
      recommendation: 'N/A',
    };
  }

  const activeNames = pinterestData.events.filter(e => isActive(e.status)).map(e => clean(e.name));
  const missingEvents = ECOMMERCE_EVENTS.filter(name => !activeNames.includes(clean(name)));

  return {
    id: 'pinterest-ecommerce-funnel',
    severity: missingEvents.length > 2 ? 'warning' : 'info',
    passed: missingEvents.length === 0,
    title: 'E-commerce Funnel Events',
    description: missingEvents.length > 0 ? `Missing ${missingEvents.length} Pinterest e-commerce funnel event(s)` : 'All standard Pinterest e-commerce funnel events are configured',
    details: { expectedEvents: ECOMMERCE_EVENTS, missingEvents },
    recommendation: 'Configure the Pinterest funnel from PageVisit to ViewCategory, AddToCart, and Checkout for audience building and funnel diagnostics.',
  };
};

export const checkConversionApiParity = (pinterestData: PinterestTagData): AuditCheck => {
  const mismatched = pinterestData.events.filter(e => isActive(e.status) && e.eventCount > 0 && (!e.apiEventCount || e.apiEventCount === 0));

  return {
    id: 'pinterest-conversion-api-parity',
    severity: mismatched.length > 0 ? 'warning' : 'info',
    passed: mismatched.length === 0,
    title: 'Pinterest Conversion API Parity',
    description: mismatched.length > 0
      ? `${mismatched.length} browser event(s) have no matching Conversion API volume`
      : 'Browser events have matching Conversion API volume where provided',
    details: { browserOnlyEvents: mismatched.map(e => e.name) },
    recommendation: 'Align Pinterest Tag events with Conversion API events for resilient measurement and deduplication across browser and server sources.',
  };
};

export const checkPartnerTagEnhancedCurrency = (pinterestData: PinterestTagData): AuditCheck => {
  const currencies = new Set(pinterestData.events.map(e => e.currency).filter(Boolean));
  const mixedCurrency = currencies.has('USD') && currencies.has('EUR');
  const partnerName = pinterestData.partnerName ?? pinterestData.events.find(e => e.partnerName)?.partnerName;
  const tagName = pinterestData.tagName ?? pinterestData.events.find(e => e.tagName)?.tagName;
  const ambiguousPartner = !!partnerName && !!tagName && clean(partnerName) === clean(tagName);
  const missingEnhanced = pinterestData.events.some(e => e.enhancedMatchConfigured === false);
  const issues = [
    ...(ambiguousPartner ? ['Partner name matches tag name'] : []),
    ...(missingEnhanced ? ['Enhanced match not configured'] : []),
    ...(mixedCurrency ? ['USD and EUR both present'] : []),
  ];

  return {
    id: 'pinterest-tag-configuration-quality',
    severity: issues.length > 0 ? 'warning' : 'info',
    passed: issues.length === 0,
    title: 'Pinterest Tag Configuration Quality',
    description: issues.length > 0 ? issues.join('; ') : 'Tag naming, enhanced match, and currency configuration look consistent',
    details: { issues, currencies: Array.from(currencies), partnerName, tagName },
    recommendation: 'Use distinct partner and tag names, enable enhanced match where appropriate, and keep Pinterest value events on one currency standard such as USD or EUR.',
  };
};

export const allPinterestChecks: Array<(pinterestData: PinterestTagData, context?: AuditContext) => AuditCheck> = [
  checkPageVisitEvent,
  checkConversionEvents,
  checkDuplicateEvents,
  checkSimilarEventNames,
  checkZeroVolumeEvents,
  checkStandardEventNames,
  checkCheckoutValue,
  checkEcommerceFunnel,
  checkConversionApiParity,
  checkPartnerTagEnhancedCurrency,
];

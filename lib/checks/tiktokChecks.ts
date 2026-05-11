import { TikTokPixelData, AuditCheck, AuditContext, Severity } from '../types';
import { areSimilar } from '../utils/stringDistance';

const ECOMMERCE_EVENTS = ['ViewContent', 'AddToCart', 'InitiateCheckout', 'CompletePayment'];
const STANDARD_EVENTS = [
  'ViewContent',
  'ClickButton',
  'Search',
  'AddToWishlist',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'PlaceAnOrder',
  'CompletePayment',
  'CompleteRegistration',
  'Contact',
  'Download',
  'SubmitForm',
  'Subscribe',
];

// ── A. Base Pixel Active Events ───────────────────────────────
export const checkBaseEventsActive = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const activeEvents = tiktokData.events.filter(
    e => e.status.toLowerCase() !== 'disabled' && e.eventCount > 0
  );
  const hasActiveEvents = activeEvents.length > 0;

  return {
    id: 'tiktok-base-events-active',
    severity: 'critical',
    passed: hasActiveEvents,
    title: 'Base Pixel Active Events',
    description: hasActiveEvents
      ? `Found ${activeEvents.length} active event(s) with recorded volume`
      : 'No active TikTok Pixel events with recorded volume found',
    details: { activeEvents: activeEvents.map(e => e.name) },
    recommendation: 'Verify the TikTok base pixel is installed and that events are firing before relying on TikTok optimization or audiences.',
  };
};

// ── B. Missing Conversion Events ──────────────────────────────
export const checkConversionEvents = (
  tiktokData: TikTokPixelData,
  context?: AuditContext
): AuditCheck => {
  const conversionEvents = ['CompletePayment', 'PlaceAnOrder', 'CompleteRegistration', 'Subscribe', 'SubmitForm'];
  const activeEvents = tiktokData.events.filter(e => e.status.toLowerCase() !== 'disabled');
  const hasConversion = activeEvents.some(e =>
    conversionEvents.some(ce => e.name.toLowerCase() === ce.toLowerCase())
  );

  let severity: Severity = 'critical';
  if (context?.businessModel === 'agency' || context?.businessModel === 'other') {
    severity = 'warning';
  }

  const foundConversions = activeEvents
    .filter(e => conversionEvents.some(ce => e.name.toLowerCase() === ce.toLowerCase()))
    .map(e => e.name);

  return {
    id: 'tiktok-missing-conversion-events',
    severity,
    passed: hasConversion,
    title: 'Missing Conversion Events',
    description: hasConversion
      ? `Found ${foundConversions.length} conversion event(s): ${foundConversions.join(', ')}`
      : 'No standard conversion events (CompletePayment, PlaceAnOrder, CompleteRegistration) found',
    details: hasConversion ? { conversionEvents: foundConversions } : {},
    recommendation: 'Configure at least one TikTok conversion event (CompletePayment for ecommerce, SubmitForm or CompleteRegistration for lead-gen) to enable conversion optimization campaigns.',
  };
};

// ── C. Duplicate Events ───────────────────────────────────────
export const checkDuplicateEvents = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of tiktokData.events) {
    const key = event.name.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  const duplicates = Object.entries(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));

  return {
    id: 'tiktok-duplicate-events',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Event Names',
    description: duplicates.length > 0
      ? `Found ${duplicates.length} duplicate event name(s) — may cause double-counting`
      : 'No duplicate event names found',
    details: { duplicates },
    recommendation: 'Consolidate duplicate events to prevent inflated conversion counts and confused optimization signals.',
  };
};

// ── D. Similar Event Names (Fuzzy Match) ──────────────────────
export const checkSimilarEventNames = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const events = tiktokData.events;
  const similarPairs: Array<{ event1: string; event2: string }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const name1 = events[i].name;
      const name2 = events[j].name;
      if (name1.toLowerCase() !== name2.toLowerCase() && areSimilar(name1, name2)) {
        similarPairs.push({ event1: name1, event2: name2 });
      }
    }
  }

  return {
    id: 'tiktok-similar-event-names',
    severity: 'info',
    passed: similarPairs.length === 0,
    title: 'Similar Event Names',
    description: similarPairs.length > 0
      ? `Found ${similarPairs.length} pair(s) of similarly named events — potential typos or duplicates`
      : 'No similarly named events found',
    details: { similarPairs },
    recommendation: 'Review similar event names and consolidate if they represent the same action.',
  };
};

// ── E. Zero Volume Active Events ──────────────────────────────
export const checkZeroVolumeEvents = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const activeEvents = tiktokData.events.filter(
    e => e.status.toLowerCase() !== 'disabled'
  );
  const zeroVolume = activeEvents.filter(e => e.eventCount === 0);

  return {
    id: 'tiktok-zero-volume-events',
    severity: 'warning',
    passed: zeroVolume.length === 0,
    title: 'Zero Volume Events',
    description: zeroVolume.length > 0
      ? `${zeroVolume.length} active event(s) have zero recorded conversions`
      : 'All active events have recorded volume',
    details: { zeroVolumeEvents: zeroVolume.map(e => e.name) },
    recommendation: 'Investigate events with zero volume — they may have broken triggers, incorrect event names, or may not be firing at all.',
  };
};

// ── F. Custom Event Without Standard Alternative ──────────────
export const checkCustomEventUsage = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const customEvents = tiktokData.events.filter(e => e.eventType === 'custom');

  const potentialStandardEvents = customEvents.filter(customEvent => {
    const customLower = customEvent.name.toLowerCase().replace(/[_\-\s]/g, '');
    return STANDARD_EVENTS.some(se => {
      const standardLower = se.toLowerCase();
      return customLower.includes(standardLower) || standardLower.includes(customLower);
    });
  });

  return {
    id: 'tiktok-custom-event-standard-alternative',
    severity: 'info',
    passed: potentialStandardEvents.length === 0,
    title: 'Custom Events May Have Standard Alternatives',
    description: potentialStandardEvents.length > 0
      ? `${potentialStandardEvents.length} custom event(s) may have standard TikTok event equivalents`
      : 'Custom events appear appropriately named',
    details: {
      customEvents: potentialStandardEvents.map(e => ({
        name: e.name,
        suggestion: 'Consider using a standard TikTok event for better optimization',
      })),
    },
    recommendation: 'Use standard TikTok events when possible — they provide better optimization signals and audience building capabilities.',
  };
};

// ── G. Missing Value on CompletePayment Events ────────────────
export const checkCompletePaymentValue = (
  tiktokData: TikTokPixelData,
  context?: AuditContext
): AuditCheck => {
  const completePaymentEvents = tiktokData.events.filter(
    e => e.name.toLowerCase() === 'completepayment'
  );

  if (completePaymentEvents.length === 0) {
    return {
      id: 'tiktok-completepayment-missing-value',
      severity: 'info',
      passed: true,
      title: 'CompletePayment Event Value Tracking',
      description: 'No CompletePayment events configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const completePaymentsWithoutValue = completePaymentEvents.filter(
    e => e.value === 0 && e.eventCount > 0
  );

  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') {
    severity = 'info';
  }

  return {
    id: 'tiktok-completepayment-missing-value',
    severity,
    passed: completePaymentsWithoutValue.length === 0,
    title: 'CompletePayment Event Value Tracking',
    description: completePaymentsWithoutValue.length > 0
      ? 'CompletePayment event(s) are firing without value data — cannot optimize for ROAS'
      : 'CompletePayment events include value data',
    details: {
      completePaymentEvents: completePaymentEvents.map(e => ({
        name: e.name,
        eventCount: e.eventCount,
        value: e.value,
        hasValue: e.value > 0,
      })),
    },
    recommendation: 'Pass dynamic value and currency parameters with CompletePayment events to enable value-based optimization and ROAS campaigns.',
  };
};

// ── H. Missing E-commerce Funnel Events ───────────────────────
export const checkEcommerceFunnel = (
  tiktokData: TikTokPixelData,
  context?: AuditContext
): AuditCheck => {
  if (context?.businessModel && context.businessModel !== 'ecommerce') {
    return {
      id: 'tiktok-ecommerce-funnel',
      severity: 'info',
      passed: true,
      title: 'E-commerce Funnel Events',
      description: 'Not an e-commerce business model (check skipped)',
      recommendation: 'N/A',
    };
  }

  const activeEventNames = tiktokData.events
    .filter(e => e.status.toLowerCase() !== 'disabled')
    .map(e => e.name.toLowerCase());

  const missingFunnelEvents = ECOMMERCE_EVENTS.filter(
    fe => !activeEventNames.includes(fe.toLowerCase())
  );

  return {
    id: 'tiktok-ecommerce-funnel',
    severity: missingFunnelEvents.length > 2 ? 'warning' : 'info',
    passed: missingFunnelEvents.length === 0,
    title: 'E-commerce Funnel Events',
    description: missingFunnelEvents.length > 0
      ? `Missing ${missingFunnelEvents.length} standard e-commerce funnel event(s)`
      : 'All standard e-commerce funnel events are configured',
    details: {
      expectedEvents: ECOMMERCE_EVENTS,
      missingEvents: missingFunnelEvents,
      configuredEvents: ECOMMERCE_EVENTS.filter(fe => activeEventNames.includes(fe.toLowerCase())),
    },
    recommendation: 'Configure the full e-commerce funnel (ViewContent → AddToCart → InitiateCheckout → CompletePayment) for optimal conversion tracking and audience building.',
  };
};

// ── I. Event Volume Concentration ─────────────────────────────
export const checkEventConcentration = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const activeEvents = tiktokData.events.filter(e => e.status.toLowerCase() !== 'disabled');
  const totalVolume = activeEvents.reduce((sum, e) => sum + e.eventCount, 0);

  if (totalVolume === 0) {
    return {
      id: 'tiktok-event-concentration',
      severity: 'info',
      passed: true,
      title: 'Event Volume Concentration',
      description: 'No event volume to analyze',
      recommendation: 'Ensure events are firing correctly.',
    };
  }

  const dominant = activeEvents.find(e => e.eventCount / totalVolume > 0.95);

  return {
    id: 'tiktok-event-concentration',
    severity: 'info',
    passed: !dominant || dominant.name.toLowerCase() === 'viewcontent',
    title: 'Event Volume Concentration',
    description: dominant && dominant.name.toLowerCase() !== 'viewcontent'
      ? `"${dominant.name}" accounts for ${Math.round((dominant.eventCount / totalVolume) * 100)}% of all events`
      : 'Event volume is reasonably distributed',
    details: dominant
      ? { dominantEvent: dominant.name, percentage: Math.round((dominant.eventCount / totalVolume) * 100) }
      : {},
    recommendation: 'High concentration in non-ViewContent events may indicate missing tracking elsewhere in the funnel.',
  };
};

// ── J. Disabled Conversion Events ─────────────────────────────
export const checkDisabledConversions = (
  tiktokData: TikTokPixelData,
  _context?: AuditContext
): AuditCheck => {
  const conversionEvents = ['CompletePayment', 'PlaceAnOrder', 'CompleteRegistration', 'Subscribe', 'AddToCart', 'InitiateCheckout'];
  const disabledConversions = tiktokData.events.filter(
    e => e.status.toLowerCase() === 'disabled' &&
      conversionEvents.some(ce => e.name.toLowerCase() === ce.toLowerCase())
  );

  return {
    id: 'tiktok-disabled-conversions',
    severity: disabledConversions.length > 0 ? 'warning' : 'info',
    passed: disabledConversions.length === 0,
    title: 'Disabled Conversion Events',
    description: disabledConversions.length > 0
      ? `${disabledConversions.length} conversion event(s) are disabled`
      : 'No conversion events are disabled',
    details: { disabledEvents: disabledConversions.map(e => e.name) },
    recommendation: 'Review disabled conversion events — they may be intentionally paused or accidentally turned off.',
  };
};

// ── Export all checks ─────────────────────────────────────────

export const allTikTokChecks: Array<(tiktokData: TikTokPixelData, context?: AuditContext) => AuditCheck> = [
  checkBaseEventsActive,
  checkConversionEvents,
  checkDuplicateEvents,
  checkSimilarEventNames,
  checkZeroVolumeEvents,
  checkCustomEventUsage,
  checkCompletePaymentValue,
  checkEcommerceFunnel,
  checkEventConcentration,
  checkDisabledConversions,
];

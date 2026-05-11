import { MetaPixelData, AuditCheck, AuditContext, Severity } from '../types';
import { areSimilar } from '../utils/stringDistance';

// Standard Meta Pixel events that should be present for different business types
const ECOMMERCE_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'];
const LEAD_GEN_EVENTS = ['PageView', 'Lead', 'CompleteRegistration', 'Contact'];
const STANDARD_EVENTS = [
  'PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist',
  'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead',
  'CompleteRegistration', 'Contact', 'CustomizeProduct', 'Donate',
  'FindLocation', 'Schedule', 'StartTrial', 'SubmitApplication', 'Subscribe'
];
const CUSTOM_STANDARD_ALTERNATIVES: Record<string, string[]> = {
  Purchase: ['buy', 'buynow', 'checkout', 'order'],
};

// ── A. Missing PageView Event ─────────────────────────────────
export const checkPageViewEvent = (
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const hasPageView = metaData.events.some(
    e => e.name.toLowerCase() === 'pageview' && e.status.toLowerCase() !== 'disabled'
  );

  return {
    id: 'meta-missing-pageview',
    severity: 'critical',
    passed: hasPageView,
    title: 'Missing PageView Event',
    description: hasPageView
      ? 'PageView event is configured and active'
      : 'No PageView event found — this is the foundation of all Meta Pixel tracking',
    recommendation: 'Add a PageView event that fires on all pages. This is required for remarketing audiences and conversion optimization.',
  };
};

// ── B. Missing Conversion Events ──────────────────────────────
export const checkConversionEvents = (
  metaData: MetaPixelData,
  context?: AuditContext
): AuditCheck => {
  const conversionEvents = ['Purchase', 'Lead', 'CompleteRegistration', 'Subscribe', 'SubmitApplication'];
  const activeEvents = metaData.events.filter(e => e.status.toLowerCase() !== 'disabled');
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
    id: 'meta-missing-conversion-events',
    severity,
    passed: hasConversion,
    title: 'Missing Conversion Events',
    description: hasConversion
      ? `Found ${foundConversions.length} conversion event(s): ${foundConversions.join(', ')}`
      : 'No standard conversion events (Purchase, Lead, CompleteRegistration) found',
    details: hasConversion ? { conversionEvents: foundConversions } : {},
    recommendation: 'Configure at least one conversion event (Purchase for ecommerce, Lead for lead-gen) to enable conversion optimization campaigns.',
  };
};

// ── C. Duplicate Events ───────────────────────────────────────
export const checkDuplicateEvents = (
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of metaData.events) {
    const key = event.name.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  const duplicates = Object.entries(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));

  return {
    id: 'meta-duplicate-events',
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
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const events = metaData.events;
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
    id: 'meta-similar-event-names',
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
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const activeEvents = metaData.events.filter(
    e => e.status.toLowerCase() !== 'disabled'
  );
  const zeroVolume = activeEvents.filter(e => e.eventCount === 0);

  return {
    id: 'meta-zero-volume-events',
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
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const customEvents = metaData.events.filter(e => e.eventType === 'custom');

  // Check if custom events could be standard events
  const potentialStandardEvents = customEvents.filter(customEvent => {
    const customLower = customEvent.name.toLowerCase().replace(/[_\-\s]/g, '');
    return STANDARD_EVENTS.some(se => {
      const standardLower = se.toLowerCase();
      const alternatives = CUSTOM_STANDARD_ALTERNATIVES[se] || [];
      return (
        customLower.includes(standardLower) ||
        standardLower.includes(customLower) ||
        alternatives.some(alt => customLower.includes(alt))
      );
    });
  });

  return {
    id: 'meta-custom-event-standard-alternative',
    severity: 'info',
    passed: potentialStandardEvents.length === 0,
    title: 'Custom Events May Have Standard Alternatives',
    description: potentialStandardEvents.length > 0
      ? `${potentialStandardEvents.length} custom event(s) may have standard Meta event equivalents`
      : 'Custom events appear appropriately named',
    details: {
      customEvents: potentialStandardEvents.map(e => ({
        name: e.name,
        suggestion: 'Consider using a standard Meta event for better optimization',
      })),
    },
    recommendation: 'Use standard Meta events when possible — they provide better optimization signals and audience building capabilities.',
  };
};

// ── G. Missing Value on Purchase Events ───────────────────────
export const checkPurchaseValue = (
  metaData: MetaPixelData,
  context?: AuditContext
): AuditCheck => {
  const purchaseEvents = metaData.events.filter(
    e => e.name.toLowerCase() === 'purchase'
  );

  if (purchaseEvents.length === 0) {
    return {
      id: 'meta-purchase-missing-value',
      severity: 'info',
      passed: true,
      title: 'Purchase Event Value Tracking',
      description: 'No Purchase events configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const purchasesWithoutValue = purchaseEvents.filter(
    e => e.value === 0 && e.eventCount > 0
  );

  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') {
    severity = 'info';
  }

  return {
    id: 'meta-purchase-missing-value',
    severity,
    passed: purchasesWithoutValue.length === 0,
    title: 'Purchase Event Value Tracking',
    description: purchasesWithoutValue.length > 0
      ? 'Purchase event(s) are firing without value data — cannot optimize for ROAS'
      : 'Purchase events include value data',
    details: {
      purchaseEvents: purchaseEvents.map(e => ({
        name: e.name,
        eventCount: e.eventCount,
        value: e.value,
        hasValue: e.value > 0,
      })),
    },
    recommendation: 'Pass dynamic value and currency parameters with Purchase events to enable value-based optimization and ROAS campaigns.',
  };
};

// ── H. Missing E-commerce Funnel Events ───────────────────────
export const checkEcommerceFunnel = (
  metaData: MetaPixelData,
  context?: AuditContext
): AuditCheck => {
  if (context?.businessModel && context.businessModel !== 'ecommerce') {
    return {
      id: 'meta-ecommerce-funnel',
      severity: 'info',
      passed: true,
      title: 'E-commerce Funnel Events',
      description: 'Not an e-commerce business model (check skipped)',
      recommendation: 'N/A',
    };
  }

  const activeEventNames = metaData.events
    .filter(e => e.status.toLowerCase() !== 'disabled')
    .map(e => e.name.toLowerCase());

  const missingFunnelEvents = ECOMMERCE_EVENTS.filter(
    fe => !activeEventNames.includes(fe.toLowerCase())
  );

  return {
    id: 'meta-ecommerce-funnel',
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
    recommendation: 'Configure the full e-commerce funnel (PageView → ViewContent → AddToCart → InitiateCheckout → Purchase) for optimal conversion tracking and audience building.',
  };
};

// ── I. Event Volume Concentration ─────────────────────────────
export const checkEventConcentration = (
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const activeEvents = metaData.events.filter(e => e.status.toLowerCase() !== 'disabled');
  const totalVolume = activeEvents.reduce((sum, e) => sum + e.eventCount, 0);

  if (totalVolume === 0) {
    return {
      id: 'meta-event-concentration',
      severity: 'info',
      passed: true,
      title: 'Event Volume Concentration',
      description: 'No event volume to analyze',
      recommendation: 'Ensure events are firing correctly.',
    };
  }

  const dominant = activeEvents.find(e => e.eventCount / totalVolume > 0.95);

  return {
    id: 'meta-event-concentration',
    severity: 'info',
    passed: !dominant || dominant.name.toLowerCase() === 'pageview',
    title: 'Event Volume Concentration',
    description: dominant && dominant.name.toLowerCase() !== 'pageview'
      ? `"${dominant.name}" accounts for ${Math.round((dominant.eventCount / totalVolume) * 100)}% of all events`
      : 'Event volume is reasonably distributed',
    details: dominant
      ? { dominantEvent: dominant.name, percentage: Math.round((dominant.eventCount / totalVolume) * 100) }
      : {},
    recommendation: 'High concentration in non-PageView events may indicate missing tracking elsewhere in the funnel.',
  };
};

// ── J. Disabled Conversion Events ─────────────────────────────
export const checkDisabledConversions = (
  metaData: MetaPixelData,
  _context?: AuditContext
): AuditCheck => {
  const conversionEvents = ['Purchase', 'Lead', 'CompleteRegistration', 'Subscribe', 'AddToCart', 'InitiateCheckout'];
  const disabledConversions = metaData.events.filter(
    e => e.status.toLowerCase() === 'disabled' &&
      conversionEvents.some(ce => e.name.toLowerCase() === ce.toLowerCase())
  );

  return {
    id: 'meta-disabled-conversions',
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

export const allMetaChecks: Array<(metaData: MetaPixelData, context?: AuditContext) => AuditCheck> = [
  checkPageViewEvent,
  checkConversionEvents,
  checkDuplicateEvents,
  checkSimilarEventNames,
  checkZeroVolumeEvents,
  checkCustomEventUsage,
  checkPurchaseValue,
  checkEcommerceFunnel,
  checkEventConcentration,
  checkDisabledConversions,
];

import {
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
} from '@/lib/checks/tiktokChecks';
import { TikTokPixelData } from '@/lib/types';

// ── Helper to create test data ────────────────────────────────
const createTikTokData = (events: Partial<TikTokPixelData['events'][0]>[]): TikTokPixelData => ({
  events: events.map(e => ({
    name: e.name || 'TestEvent',
    eventType: e.eventType || 'standard',
    status: e.status || 'active',
    eventCount: e.eventCount ?? 100,
    value: e.value ?? 0,
    currency: e.currency,
    attributionWindow: e.attributionWindow,
  })),
});

// ──────────────────────────────────────────────────────────────
// A. checkBaseEventsActive
// ──────────────────────────────────────────────────────────────
describe('checkBaseEventsActive', () => {
  it('should PASS when active events have volume', () => {
    const data = createTikTokData([{ name: 'ViewContent', status: 'active', eventCount: 100 }]);
    const result = checkBaseEventsActive(data);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when active events have no volume', () => {
    const data = createTikTokData([{ name: 'ViewContent', status: 'active', eventCount: 0 }]);
    const result = checkBaseEventsActive(data);
    expect(result.passed).toBe(false);
  });

  it('should FAIL when all events are disabled', () => {
    const data = createTikTokData([{ name: 'ViewContent', status: 'disabled', eventCount: 100 }]);
    const result = checkBaseEventsActive(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// B. checkConversionEvents
// ──────────────────────────────────────────────────────────────
describe('checkConversionEvents', () => {
  it('should PASS when conversion events exist', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'CompletePayment', status: 'active' },
    ]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when no conversion events exist', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'AddToCart' },
    ]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(false);
  });

  it('should recognize SubmitForm as conversion event', () => {
    const data = createTikTokData([{ name: 'SubmitForm' }]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should use warning severity for agency or other business models', () => {
    const data = createTikTokData([{ name: 'ViewContent' }]);
    const result = checkConversionEvents(data, { businessModel: 'agency' });
    expect(result.severity).toBe('warning');
  });
});

// ──────────────────────────────────────────────────────────────
// C. checkDuplicateEvents
// ──────────────────────────────────────────────────────────────
describe('checkDuplicateEvents', () => {
  it('should PASS with no duplicates', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'CompletePayment' },
    ]);
    const result = checkDuplicateEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with duplicate event names', () => {
    const data = createTikTokData([
      { name: 'CompletePayment' },
      { name: 'CompletePayment' },
    ]);
    const result = checkDuplicateEvents(data);
    expect(result.passed).toBe(false);
    expect(result.details?.duplicates).toHaveLength(1);
  });

  it('should be case-insensitive for duplicates', () => {
    const data = createTikTokData([
      { name: 'CompletePayment' },
      { name: 'completepayment' },
    ]);
    const result = checkDuplicateEvents(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// D. checkSimilarEventNames
// ──────────────────────────────────────────────────────────────
describe('checkSimilarEventNames', () => {
  it('should PASS with distinct names', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'CompletePayment' },
    ]);
    const result = checkSimilarEventNames(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with similar names (typos)', () => {
    const data = createTikTokData([
      { name: 'CompletePayment' },
      { name: 'CompletePaymnt' },
    ]);
    const result = checkSimilarEventNames(data);
    expect(result.passed).toBe(false);
    expect(result.details?.similarPairs).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────
// E. checkZeroVolumeEvents
// ──────────────────────────────────────────────────────────────
describe('checkZeroVolumeEvents', () => {
  it('should PASS when all active events have volume', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', eventCount: 100 },
      { name: 'SubmitForm', eventCount: 50 },
    ]);
    const result = checkZeroVolumeEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when active events have zero volume', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', eventCount: 0, status: 'active' },
    ]);
    const result = checkZeroVolumeEvents(data);
    expect(result.passed).toBe(false);
    expect(result.details?.zeroVolumeEvents).toContain('CompletePayment');
  });

  it('should ignore disabled events with zero volume', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', eventCount: 0, status: 'disabled' },
    ]);
    const result = checkZeroVolumeEvents(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// F. checkCustomEventUsage
// ──────────────────────────────────────────────────────────────
describe('checkCustomEventUsage', () => {
  it('should PASS when custom events are appropriately named', () => {
    const data = createTikTokData([
      { name: 'WidgetClicked', eventType: 'custom' },
    ]);
    const result = checkCustomEventUsage(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when custom event could be standard', () => {
    const data = createTikTokData([
      { name: 'complete_payment', eventType: 'custom' },
    ]);
    const result = checkCustomEventUsage(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// G. checkCompletePaymentValue
// ──────────────────────────────────────────────────────────────
describe('checkCompletePaymentValue', () => {
  it('should PASS when CompletePayment has value', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', value: 5000, eventCount: 100 },
    ]);
    const result = checkCompletePaymentValue(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when CompletePayment has no value', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', value: 0, eventCount: 100 },
    ]);
    const result = checkCompletePaymentValue(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should PASS (skip) when no CompletePayment event exists', () => {
    const data = createTikTokData([{ name: 'SubmitForm' }]);
    const result = checkCompletePaymentValue(data);
    expect(result.passed).toBe(true);
  });

  it('should be INFO severity when valueStrategy is no-values', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', value: 0, eventCount: 100 },
    ]);
    const result = checkCompletePaymentValue(data, { valueStrategy: 'no-values' });
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// H. checkEcommerceFunnel
// ──────────────────────────────────────────────────────────────
describe('checkEcommerceFunnel', () => {
  it('should PASS with complete funnel', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'AddToCart' },
      { name: 'InitiateCheckout' },
      { name: 'CompletePayment' },
    ]);
    const result = checkEcommerceFunnel(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with missing funnel events', () => {
    const data = createTikTokData([
      { name: 'ViewContent' },
      { name: 'CompletePayment' },
    ]);
    const result = checkEcommerceFunnel(data);
    expect(result.passed).toBe(false);
    expect(result.details?.missingEvents).toContain('AddToCart');
    expect(result.details?.missingEvents).toContain('InitiateCheckout');
  });

  it('should be warning when more than two funnel events are missing', () => {
    const data = createTikTokData([{ name: 'CompletePayment' }]);
    const result = checkEcommerceFunnel(data);
    expect(result.severity).toBe('warning');
  });

  it('should skip check for non-ecommerce business model', () => {
    const data = createTikTokData([{ name: 'ViewContent' }]);
    const result = checkEcommerceFunnel(data, { businessModel: 'lead-generation' });
    expect(result.passed).toBe(true);
    expect(result.description).toContain('skipped');
  });
});

// ──────────────────────────────────────────────────────────────
// I. checkEventConcentration
// ──────────────────────────────────────────────────────────────
describe('checkEventConcentration', () => {
  it('should PASS with distributed volume', () => {
    const data = createTikTokData([
      { name: 'ViewContent', eventCount: 1000 },
      { name: 'CompletePayment', eventCount: 500 },
      { name: 'AddToCart', eventCount: 800 },
    ]);
    const result = checkEventConcentration(data);
    expect(result.passed).toBe(true);
  });

  it('should PASS when ViewContent dominates (expected behavior)', () => {
    const data = createTikTokData([
      { name: 'ViewContent', eventCount: 10000 },
      { name: 'CompletePayment', eventCount: 100 },
    ]);
    const result = checkEventConcentration(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when non-ViewContent dominates', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', eventCount: 10000 },
      { name: 'ViewContent', eventCount: 100 },
    ]);
    const result = checkEventConcentration(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// J. checkDisabledConversions
// ──────────────────────────────────────────────────────────────
describe('checkDisabledConversions', () => {
  it('should PASS when no conversions are disabled', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', status: 'active' },
      { name: 'Subscribe', status: 'active' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when conversion events are disabled', () => {
    const data = createTikTokData([
      { name: 'CompletePayment', status: 'disabled' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(false);
    expect(result.details?.disabledEvents).toContain('CompletePayment');
  });

  it('should ignore disabled non-conversion events', () => {
    const data = createTikTokData([
      { name: 'ViewContent', status: 'disabled' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(true);
  });
});

import {
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
} from '@/lib/checks/metaChecks';
import { MetaPixelData } from '@/lib/types';

// ── Helper to create test data ────────────────────────────────
const createMetaData = (events: Partial<MetaPixelData['events'][0]>[]): MetaPixelData => ({
  events: events.map(e => ({
    name: e.name || 'TestEvent',
    eventType: e.eventType || 'standard',
    status: e.status || 'active',
    eventCount: e.eventCount ?? 100,
    value: e.value ?? 0,
    currency: e.currency,
    attributionWindow: e.attributionWindow,
    optimizationGoal: e.optimizationGoal,
    parameters: e.parameters,
  })),
});

// ──────────────────────────────────────────────────────────────
// A. checkPageViewEvent
// ──────────────────────────────────────────────────────────────
describe('checkPageViewEvent', () => {
  it('should PASS when PageView event exists', () => {
    const data = createMetaData([{ name: 'PageView', status: 'active' }]);
    const result = checkPageViewEvent(data);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('should FAIL when no PageView event exists', () => {
    const data = createMetaData([{ name: 'Purchase' }]);
    const result = checkPageViewEvent(data);
    expect(result.passed).toBe(false);
  });

  it('should FAIL when PageView is disabled', () => {
    const data = createMetaData([{ name: 'PageView', status: 'disabled' }]);
    const result = checkPageViewEvent(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// B. checkConversionEvents
// ──────────────────────────────────────────────────────────────
describe('checkConversionEvents', () => {
  it('should PASS when conversion events exist', () => {
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'Purchase', status: 'active' },
    ]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when no conversion events exist', () => {
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'ViewContent' },
    ]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(false);
  });

  it('should recognize Lead as conversion event', () => {
    const data = createMetaData([{ name: 'Lead' }]);
    const result = checkConversionEvents(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// C. checkDuplicateEvents
// ──────────────────────────────────────────────────────────────
describe('checkDuplicateEvents', () => {
  it('should PASS with no duplicates', () => {
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'Purchase' },
    ]);
    const result = checkDuplicateEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with duplicate event names', () => {
    const data = createMetaData([
      { name: 'Purchase' },
      { name: 'Purchase' },
    ]);
    const result = checkDuplicateEvents(data);
    expect(result.passed).toBe(false);
    expect(result.details?.duplicates).toHaveLength(1);
  });

  it('should be case-insensitive for duplicates', () => {
    const data = createMetaData([
      { name: 'Purchase' },
      { name: 'purchase' },
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
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'Purchase' },
    ]);
    const result = checkSimilarEventNames(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with similar names (typos)', () => {
    const data = createMetaData([
      { name: 'Purchase' },
      { name: 'Purchse' },
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
    const data = createMetaData([
      { name: 'Purchase', eventCount: 100 },
      { name: 'Lead', eventCount: 50 },
    ]);
    const result = checkZeroVolumeEvents(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when active events have zero volume', () => {
    const data = createMetaData([
      { name: 'Purchase', eventCount: 0, status: 'active' },
    ]);
    const result = checkZeroVolumeEvents(data);
    expect(result.passed).toBe(false);
    expect(result.details?.zeroVolumeEvents).toContain('Purchase');
  });

  it('should ignore disabled events with zero volume', () => {
    const data = createMetaData([
      { name: 'Purchase', eventCount: 0, status: 'disabled' },
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
    const data = createMetaData([
      { name: 'WidgetClicked', eventType: 'custom' },
    ]);
    const result = checkCustomEventUsage(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when custom event could be standard', () => {
    const data = createMetaData([
      { name: 'purchase_complete', eventType: 'custom' },
    ]);
    const result = checkCustomEventUsage(data);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// G. checkPurchaseValue
// ──────────────────────────────────────────────────────────────
describe('checkPurchaseValue', () => {
  it('should PASS when Purchase has value', () => {
    const data = createMetaData([
      { name: 'Purchase', value: 5000, eventCount: 100 },
    ]);
    const result = checkPurchaseValue(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when Purchase has no value', () => {
    const data = createMetaData([
      { name: 'Purchase', value: 0, eventCount: 100 },
    ]);
    const result = checkPurchaseValue(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
  });

  it('should PASS (skip) when no Purchase event exists', () => {
    const data = createMetaData([{ name: 'Lead' }]);
    const result = checkPurchaseValue(data);
    expect(result.passed).toBe(true);
  });

  it('should be INFO severity when valueStrategy is no-values', () => {
    const data = createMetaData([
      { name: 'Purchase', value: 0, eventCount: 100 },
    ]);
    const result = checkPurchaseValue(data, { valueStrategy: 'no-values' });
    expect(result.severity).toBe('info');
  });
});

// ──────────────────────────────────────────────────────────────
// H. checkEcommerceFunnel
// ──────────────────────────────────────────────────────────────
describe('checkEcommerceFunnel', () => {
  it('should PASS with complete funnel', () => {
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'ViewContent' },
      { name: 'AddToCart' },
      { name: 'InitiateCheckout' },
      { name: 'Purchase' },
    ]);
    const result = checkEcommerceFunnel(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL with missing funnel events', () => {
    const data = createMetaData([
      { name: 'PageView' },
      { name: 'Purchase' },
    ]);
    const result = checkEcommerceFunnel(data);
    expect(result.passed).toBe(false);
    expect(result.details?.missingEvents).toContain('ViewContent');
    expect(result.details?.missingEvents).toContain('AddToCart');
  });

  it('should skip check for non-ecommerce business model', () => {
    const data = createMetaData([{ name: 'PageView' }]);
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
    const data = createMetaData([
      { name: 'PageView', eventCount: 1000 },
      { name: 'Purchase', eventCount: 500 },
      { name: 'AddToCart', eventCount: 800 },
    ]);
    const result = checkEventConcentration(data);
    expect(result.passed).toBe(true);
  });

  it('should PASS when PageView dominates (expected behavior)', () => {
    const data = createMetaData([
      { name: 'PageView', eventCount: 10000 },
      { name: 'Purchase', eventCount: 100 },
    ]);
    const result = checkEventConcentration(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when non-PageView dominates', () => {
    const data = createMetaData([
      { name: 'Purchase', eventCount: 10000 },
      { name: 'PageView', eventCount: 100 },
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
    const data = createMetaData([
      { name: 'Purchase', status: 'active' },
      { name: 'Lead', status: 'active' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when conversion events are disabled', () => {
    const data = createMetaData([
      { name: 'Purchase', status: 'disabled' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(false);
    expect(result.details?.disabledEvents).toContain('Purchase');
  });

  it('should ignore disabled non-conversion events', () => {
    const data = createMetaData([
      { name: 'PageView', status: 'disabled' },
    ]);
    const result = checkDisabledConversions(data);
    expect(result.passed).toBe(true);
  });
});

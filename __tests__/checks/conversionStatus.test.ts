/**
 * #61: Google Ads never exports a conversion action status of "Disabled".
 * The API enum is ENABLED / REMOVED / HIDDEN, and the UI Status column shows
 * tracking statuses (Active, Needs attention, Misconfigured, Awaiting
 * conversions, Removed; older UI: Recording conversions, No recent
 * conversions, Unverified, Inactive, Tag inactive).
 */
import { isConversionActionOff, isConversionActionOn } from '@/lib/checks/conversionStatus';
import { checkDisabledHighValueConversions, checkManyInactiveConversions, checkMissingPrimaryConversion } from '@/lib/checks/adsChecks';
import { checkPurchaseDisabledOthersEnabled } from '@/lib/checks/edgeCaseChecks';
import { checkDisabledWithVolume } from '@/lib/checks/settingsReportCrossChecks';
import { checkAdsConversionHasGTMTag } from '@/lib/checks/crossChecks';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { AdsConversion, AdsData, AdsReportData } from '@/lib/types';
import { getExplainer } from '@/lib/checks/explainers';

const conv = (name: string, category: string, status: string): AdsConversion => ({
  name, category, status, value: 50, count: 'Every', attributionModel: 'Data-driven', clickWindow: '30 days', viewWindow: '1 day',
});

// Statuses for an action that is switched off: API REMOVED/HIDDEN, UI Removed,
// and the legacy "Disabled" used by AdLint's own fixtures.
const OFF = ['Removed', 'REMOVED', 'Hidden', 'HIDDEN', 'Disabled', 'disabled', ' Removed '];
// Statuses of an action that is still switched on, including tracking-health
// statuses whose tag is not currently recording.
const ON = [
  'Enabled', 'ENABLED', 'Active', 'Recording conversions', 'No recent conversions',
  'Unverified', 'Inactive', 'Tag inactive', 'Needs attention', 'Misconfigured', 'Awaiting conversions',
];

describe('conversion action status matching', () => {
  it.each(OFF)('"%s" is switched off', (status) => {
    expect(isConversionActionOff(status)).toBe(true);
    expect(isConversionActionOn(status)).toBe(false);
  });

  it.each(ON)('"%s" is switched on, not disabled', (status) => {
    expect(isConversionActionOff(status)).toBe(false);
    expect(isConversionActionOn(status)).toBe(true);
  });

  it('a blank status is neither on nor off', () => {
    expect(isConversionActionOff('')).toBe(false);
    expect(isConversionActionOn('')).toBe(false);
  });
});

describe('disabled-high-value-conversions on real status strings', () => {
  it.each(['Removed', 'REMOVED', 'HIDDEN', 'Disabled'])('flags a purchase action with status "%s"', (status) => {
    const result = checkDisabledHighValueConversions({ conversions: [conv('Purchase', 'Purchase', status)] });
    expect(result.passed).toBe(false);
    expect(result.details?.conversions).toEqual(['Purchase']);
  });

  it.each(['Inactive', 'Misconfigured', 'No recent conversions', 'Unverified'])(
    'does not call a purchase action with tracking status "%s" disabled',
    (status) => {
      const result = checkDisabledHighValueConversions({ conversions: [conv('Purchase', 'Purchase', status)] });
      expect(result.passed).toBe(true);
    },
  );

  it('fires on a parsed export that says Removed', () => {
    const csv = [
      'Conversion name,Category,Value,Count,Attribution model,Click-through conversion window,View-through conversion window,Status',
      'Purchase (legacy),Purchase,50,Every,Data-driven,30 days,1 day,Removed',
      'Purchase,Purchase,50,Every,Data-driven,30 days,1 day,Active',
    ].join('\n');
    const result = checkDisabledHighValueConversions(parseAdsCSV(csv));
    expect(result.passed).toBe(false);
    expect(result.details?.conversions).toEqual(['Purchase (legacy)']);
    expect(result.description).toMatch(/removed or disabled/i);
  });
});

describe('sibling checks use the same matcher', () => {
  // Removed actions are already archived by Google Ads (answer/10918269), so
  // they are not the clutter this info check asks the user to archive.
  it('many-inactive-conversions does not count archived (Removed) actions as clutter', () => {
    const result = checkManyInactiveConversions({ conversions: [conv('Old', 'Lead', 'Removed')] });
    expect(result.details?.disabledConversions).toEqual([]);
  });

  it('edge-purchase-disabled-others-enabled fires on Removed purchase and Active others', () => {
    const data: AdsData = {
      conversions: [conv('Purchase', 'Purchase', 'Removed'), conv('Add to cart', 'Add to cart', 'Active')],
    };
    expect(checkPurchaseDisabledOthersEnabled(data, null).passed).toBe(false);
  });

  it('cross-disabled-with-volume fires on a Removed action with report volume', () => {
    const report: AdsReportData = {
      conversions: [
        { name: 'Old purchase', conversions: 50, allConversions: 50, viewThroughConversions: 0, conversionsValue: 5000, allConversionsValue: 5000, valuePerConversion: 100, valuePerAllConversions: 100, conversionValuePerCost: 5, currentModelAttributedConversions: 50 },
      ],
    };
    const result = checkDisabledWithVolume({ conversions: [conv('Old purchase', 'Purchase', 'Removed')] }, report);
    expect(result.passed).toBe(false);
  });

  it('missing-primary-conversion accepts an Active purchase action', () => {
    expect(checkMissingPrimaryConversion({ conversions: [conv('Purchase', 'Purchase', 'Active')] }).passed).toBe(true);
  });

  it('missing-primary-conversion still fails when the only purchase action is Removed', () => {
    expect(checkMissingPrimaryConversion({ conversions: [conv('Purchase', 'Purchase', 'Removed')] }).passed).toBe(false);
  });

  it('ads-conversion-missing-gtm-tag treats a Recording conversions action as enabled', () => {
    const result = checkAdsConversionHasGTMTag(
      { containerVersion: { tag: [] } },
      { conversions: [conv('Purchase', 'Purchase', 'Recording conversions')] },
    );
    expect(result.passed).toBe(false);
  });
});

describe('explainers name the statuses Google Ads exports', () => {
  it.each(['disabled-high-value-conversions', 'edge-purchase-disabled-others-enabled', 'cross-disabled-with-volume'])(
    '%s mentions Removed and no longer says the status is only "Disabled"',
    (id) => {
      const e = getExplainer(id)!;
      const text = [e.summary, e.directAnswer, e.example, e.citationTemplate].join('\n');
      expect(text).toMatch(/Removed/);
      expect(text).not.toMatch(/Status: Disabled/);
      expect(text).not.toMatch(/(set to|marked|status is) Disabled\b/);
    },
  );
});

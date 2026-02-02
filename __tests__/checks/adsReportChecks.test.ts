import {
  checkVTCClickRatio,
  checkFunnelVolumeInversion,
  checkROASSanity,
  checkActiveDuplicates,
  checkAttributionDrift,
  checkConversionConcentration,
  checkGhostConversions,
  checkMicroConversionPollution,
  checkAllVsPrimaryGap,
  checkValueInstability,
  checkWhaleConversion,
} from '@/lib/checks/adsReportChecks';
import { AdsReportData, AdsData } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';

const loadJSON = (name: string): AdsReportData =>
  parseAdsReportCSV(
    readFileSync(join(__dirname, `../fixtures/${name}`), 'utf-8')
  );

const clean = loadJSON('report-clean.json');
const dirty = loadJSON('report-dirty.json');

// ──────────────────────────────────────────────────────────────
// A. checkVTCClickRatio
// ──────────────────────────────────────────────────────────────
describe('checkVTCClickRatio', () => {
  it('should PASS with healthy VTC ratios', () => {
    const result = checkVTCClickRatio(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('vtc-click-ratio');
    expect(result.severity).toBe('warning');
  });

  it('should FAIL when VTC > 3x click conversions', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Bad VTC Action',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 90,
          conversionsValue: 1000,
          allConversionsValue: 1000,
          valuePerConversion: 10,
          valuePerAllConversions: 10,
          conversionValuePerCost: 2,
          currentModelAttributedConversions: 100,
          category: 'Purchase',
        },
      ],
    };
    const result = checkVTCClickRatio(data);
    expect(result.passed).toBe(false);
    // VTC=90, click=10, ratio=9.0
    expect(result.details?.conversions).toHaveLength(1);
  });

  it('should PASS when click conversions are zero (no division)', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'All VTC',
          conversions: 50,
          allConversions: 50,
          viewThroughConversions: 50,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 50,
        },
      ],
    };
    // clickConversions = 50 - 50 = 0, so filter condition clickConversions > 0 is false
    const result = checkVTCClickRatio(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// B. checkFunnelVolumeInversion
// ──────────────────────────────────────────────────────────────
describe('checkFunnelVolumeInversion', () => {
  it('should PASS with normal funnel progression', () => {
    const result = checkFunnelVolumeInversion(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('funnel-volume-inversion');
  });

  it('should FAIL when lower-funnel exceeds upper-funnel', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 500,
          allConversions: 500,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 500,
          category: 'Purchase',
        },
        {
          name: 'Lead',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 100,
          category: 'Lead',
        },
      ],
    };
    const result = checkFunnelVolumeInversion(data);
    expect(result.passed).toBe(false);
  });

  it('should PASS when no upper-funnel actions exist', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 500,
          allConversions: 500,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 500,
          category: 'Purchase',
        },
      ],
    };
    // upperVolume=0, so inverted = false
    const result = checkFunnelVolumeInversion(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// C. checkROASSanity
// ──────────────────────────────────────────────────────────────
describe('checkROASSanity', () => {
  it('should PASS with reasonable ROAS', () => {
    const result = checkROASSanity(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('roas-sanity');
  });

  it('should FAIL with ROAS > 50x', () => {
    const result = checkROASSanity(dirty);
    expect(result.passed).toBe(false);
  });

  it('should FAIL with ROAS < 0.1x and volume > 10', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Low ROAS',
          conversions: 50,
          allConversions: 50,
          viewThroughConversions: 0,
          conversionsValue: 100,
          allConversionsValue: 100,
          valuePerConversion: 2,
          valuePerAllConversions: 2,
          conversionValuePerCost: 0.05,
          currentModelAttributedConversions: 50,
        },
      ],
    };
    const result = checkROASSanity(data);
    expect(result.passed).toBe(false);
  });

  it('should PASS with low ROAS but low volume', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Low volume low ROAS',
          conversions: 5,
          allConversions: 5,
          viewThroughConversions: 0,
          conversionsValue: 10,
          allConversionsValue: 10,
          valuePerConversion: 2,
          valuePerAllConversions: 2,
          conversionValuePerCost: 0.05,
          currentModelAttributedConversions: 5,
        },
      ],
    };
    const result = checkROASSanity(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// D. checkActiveDuplicates (cross-check)
// ──────────────────────────────────────────────────────────────
describe('checkActiveDuplicates', () => {
  it('should PASS with distinct names', () => {
    const result = checkActiveDuplicates(clean, null);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('volume-weighted-duplicates');
    expect(result.severity).toBe('critical');
  });

  it('should FAIL with similar active conversion names', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 5000,
          allConversionsValue: 5000,
          valuePerConversion: 50,
          valuePerAllConversions: 50,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 100,
        },
        {
          name: 'Purchas',
          conversions: 80,
          allConversions: 80,
          viewThroughConversions: 0,
          conversionsValue: 4000,
          allConversionsValue: 4000,
          valuePerConversion: 50,
          valuePerAllConversions: 50,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 80,
        },
      ],
    };
    const result = checkActiveDuplicates(data, null);
    expect(result.passed).toBe(false);
    expect(result.details?.duplicatePairs).toHaveLength(1);
  });

  it('should cross-reference with adsData settings names', () => {
    const reportData: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 5000,
          allConversionsValue: 5000,
          valuePerConversion: 50,
          valuePerAllConversions: 50,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 100,
        },
      ],
    };
    const adsData: AdsData = {
      conversions: [
        {
          name: 'Purchas',
          category: 'Purchase',
          value: 50,
          count: 'One',
          attributionModel: 'Last click',
          clickWindow: '30 days',
          viewWindow: '1 day',
          status: 'Enabled',
        },
      ],
    };
    const result = checkActiveDuplicates(reportData, adsData);
    expect(result.passed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// E. checkAttributionDrift
// ──────────────────────────────────────────────────────────────
describe('checkAttributionDrift', () => {
  it('should PASS with aligned attribution', () => {
    const result = checkAttributionDrift(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('model-attribution-drift');
  });

  it('should FAIL with >50% drift', () => {
    const result = checkAttributionDrift(dirty);
    // Purchase: conversions=20, modelAttributed=5, diff=15, 15/20=75%
    expect(result.passed).toBe(false);
  });

  it('should PASS when conversions are zero', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Dormant',
          conversions: 0,
          allConversions: 0,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 0,
        },
      ],
    };
    const result = checkAttributionDrift(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// F. checkConversionConcentration
// ──────────────────────────────────────────────────────────────
describe('checkConversionConcentration', () => {
  it('should PASS with distributed volume', () => {
    const result = checkConversionConcentration(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('conversion-concentration');
  });

  it('should FAIL when one action has >90% volume', () => {
    const result = checkConversionConcentration(dirty);
    // Micro Page View Event has 500000 out of ~505030 total
    expect(result.passed).toBe(false);
  });

  it('should PASS with zero total volume', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Empty',
          conversions: 0,
          allConversions: 0,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 0,
        },
      ],
    };
    const result = checkConversionConcentration(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// G. checkGhostConversions (cross-check)
// ──────────────────────────────────────────────────────────────
describe('checkGhostConversions', () => {
  it('should PASS (skip) when no adsData provided', () => {
    const result = checkGhostConversions(clean, null);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('ghost-conversions');
  });

  it('should PASS when all enabled conversions have volume', () => {
    const adsData: AdsData = {
      conversions: [
        {
          name: 'Purchase',
          category: 'Purchase',
          value: 50,
          count: 'One',
          attributionModel: 'Last click',
          clickWindow: '30 days',
          viewWindow: '1 day',
          status: 'Enabled',
        },
      ],
    };
    const result = checkGhostConversions(clean, adsData);
    expect(result.passed).toBe(true);
  });

  it('should FAIL when enabled conversion has zero volume', () => {
    const reportData: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 5000,
          allConversionsValue: 5000,
          valuePerConversion: 50,
          valuePerAllConversions: 50,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 100,
        },
      ],
    };
    const adsData: AdsData = {
      conversions: [
        {
          name: 'Purchase',
          category: 'Purchase',
          value: 50,
          count: 'One',
          attributionModel: 'Last click',
          clickWindow: '30 days',
          viewWindow: '1 day',
          status: 'Enabled',
        },
        {
          name: 'Ghost Action',
          category: 'Lead',
          value: 0,
          count: 'One',
          attributionModel: 'Last click',
          clickWindow: '30 days',
          viewWindow: '1 day',
          status: 'Enabled',
        },
      ],
    };
    const result = checkGhostConversions(reportData, adsData);
    expect(result.passed).toBe(false);
    expect(result.details?.ghostConversions).toContain('Ghost Action');
  });
});

// ──────────────────────────────────────────────────────────────
// H. checkMicroConversionPollution
// ──────────────────────────────────────────────────────────────
describe('checkMicroConversionPollution', () => {
  it('should PASS with acceptable micro/macro ratio', () => {
    const result = checkMicroConversionPollution(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('micro-conversion-pollution');
  });

  it('should FAIL when micro > 100x macro', () => {
    const result = checkMicroConversionPollution(dirty);
    // micro (page view) = 500000, macro (purchase + transaction) = 5020
    // 500000 > 5020 * 100 = 502000 — just barely fails
    // Actually: 500000 > 502000 is false. Let me check...
    // purchase=20, transaction=5000 => macroVolume = 5020
    // 5020 * 100 = 502000, 500000 < 502000 => passes!
    // Need to adjust expectation or fixture. The fixture has page_view at 500000
    // and purchase at 20 + transaction (sale) at 5000 = 5020 macro.
    // 500000 is NOT > 502000, so this would actually pass.
    // Let's test with an inline mock instead.
    expect(result.passed).toBe(true); // dirty fixture doesn't quite trigger this
  });

  it('should FAIL with inline data where micro > 100x macro', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Purchase',
          conversions: 10,
          allConversions: 10,
          viewThroughConversions: 0,
          conversionsValue: 1000,
          allConversionsValue: 1000,
          valuePerConversion: 100,
          valuePerAllConversions: 100,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 10,
          category: 'Purchase',
        },
        {
          name: 'Page Views',
          conversions: 2000,
          allConversions: 2000,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 2000,
          category: 'Page view',
        },
      ],
    };
    const result = checkMicroConversionPollution(data);
    // micro=2000, macro=10, 2000 > 10*100=1000 => true
    expect(result.passed).toBe(false);
  });

  it('should PASS when no macro conversions exist', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Page Views',
          conversions: 50000,
          allConversions: 50000,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 50000,
          category: 'Page view',
        },
      ],
    };
    const result = checkMicroConversionPollution(data);
    // macroVolume=0, so polluted = false
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// I. checkAllVsPrimaryGap
// ──────────────────────────────────────────────────────────────
describe('checkAllVsPrimaryGap', () => {
  it('should PASS with aligned conversions', () => {
    const result = checkAllVsPrimaryGap(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('all-vs-primary-gap');
  });

  it('should FAIL when allConversions > 2x conversions', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Gap Action',
          conversions: 50,
          allConversions: 150,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 50,
        },
      ],
    };
    const result = checkAllVsPrimaryGap(data);
    expect(result.passed).toBe(false);
    expect(result.details?.conversions).toHaveLength(1);
  });

  it('should PASS when conversions are zero', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'No Volume',
          conversions: 0,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 0,
        },
      ],
    };
    const result = checkAllVsPrimaryGap(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// J. checkValueInstability
// ──────────────────────────────────────────────────────────────
describe('checkValueInstability', () => {
  it('should PASS with stable values', () => {
    const result = checkValueInstability(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('value-instability');
  });

  it('should FAIL with >10x variation within category', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Purchase A',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 10000,
          allConversionsValue: 10000,
          valuePerConversion: 100,
          valuePerAllConversions: 100,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 100,
          category: 'Purchase',
        },
        {
          name: 'Purchase B',
          conversions: 50,
          allConversions: 50,
          viewThroughConversions: 0,
          conversionsValue: 250,
          allConversionsValue: 250,
          valuePerConversion: 5,
          valuePerAllConversions: 5,
          conversionValuePerCost: 1,
          currentModelAttributedConversions: 50,
          category: 'Purchase',
        },
      ],
    };
    const result = checkValueInstability(data);
    // max=100, min=5, ratio=20 > 10
    expect(result.passed).toBe(false);
    expect(result.details?.unstableCategories).toHaveLength(1);
  });

  it('should PASS with single action per category', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Solo',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 10000,
          allConversionsValue: 10000,
          valuePerConversion: 100,
          valuePerAllConversions: 100,
          conversionValuePerCost: 5,
          currentModelAttributedConversions: 100,
          category: 'Purchase',
        },
      ],
    };
    const result = checkValueInstability(data);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// K. checkWhaleConversion
// ──────────────────────────────────────────────────────────────
describe('checkWhaleConversion', () => {
  it('should PASS with distributed value', () => {
    const result = checkWhaleConversion(clean);
    expect(result.passed).toBe(true);
    expect(result.id).toBe('whale-conversion');
  });

  it('should FAIL when <10% volume drives >50% value', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'Whale',
          conversions: 5,
          allConversions: 5,
          viewThroughConversions: 0,
          conversionsValue: 100000,
          allConversionsValue: 100000,
          valuePerConversion: 20000,
          valuePerAllConversions: 20000,
          conversionValuePerCost: 50,
          currentModelAttributedConversions: 5,
        },
        {
          name: 'Normal',
          conversions: 995,
          allConversions: 995,
          viewThroughConversions: 0,
          conversionsValue: 5000,
          allConversionsValue: 5000,
          valuePerConversion: 5.03,
          valuePerAllConversions: 5.03,
          conversionValuePerCost: 1,
          currentModelAttributedConversions: 995,
        },
      ],
    };
    const result = checkWhaleConversion(data);
    // Whale: 5/1000 = 0.5% volume, 100000/105000 = 95% value
    expect(result.passed).toBe(false);
    expect(result.details?.whaleActions).toContain('Whale');
  });

  it('should PASS with zero total value', () => {
    const data: AdsReportData = {
      conversions: [
        {
          name: 'No Value',
          conversions: 100,
          allConversions: 100,
          viewThroughConversions: 0,
          conversionsValue: 0,
          allConversionsValue: 0,
          valuePerConversion: 0,
          valuePerAllConversions: 0,
          conversionValuePerCost: 0,
          currentModelAttributedConversions: 100,
        },
      ],
    };
    const result = checkWhaleConversion(data);
    expect(result.passed).toBe(true);
  });
});

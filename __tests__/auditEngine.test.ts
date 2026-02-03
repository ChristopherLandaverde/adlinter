import { runAudit } from '@/lib/auditEngine';
import { GTMContainer, AdsData, AuditContext } from '@/lib/types';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { readFileSync } from 'fs';
import { join } from 'path';

const loadGTM = (name: string) =>
  parseGTMJSON(readFileSync(join(__dirname, `fixtures/${name}`), 'utf-8'));

const loadCSV = (name: string) =>
  parseAdsCSV(readFileSync(join(__dirname, `fixtures/${name}`), 'utf-8'));

describe('Audit Engine', () => {
  describe('runAudit return structure', () => {
    it('should return AuditResults with all required keys', () => {
      const results = runAudit(null, null);

      expect(results).toHaveProperty('gtm');
      expect(results).toHaveProperty('ads');
      expect(results).toHaveProperty('cross');
      expect(results).toHaveProperty('summary');
      expect(results.summary).toHaveProperty('critical');
      expect(results.summary).toHaveProperty('warning');
      expect(results.summary).toHaveProperty('info');
      expect(results.summary).toHaveProperty('passed');
    });

    it('should return empty arrays when no data provided', () => {
      const results = runAudit(null, null);

      expect(results.gtm).toEqual([]);
      expect(results.ads).toEqual([]);
      expect(results.cross).toEqual([]);
      expect(results.summary.critical).toBe(0);
      expect(results.summary.warning).toBe(0);
      expect(results.summary.info).toBe(0);
      expect(results.summary.passed).toBe(0);
    });
  });

  describe('GTM-only audit', () => {
    it('should run only GTM checks when only GTM data provided', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const results = runAudit(gtmData, null);

      expect(results.gtm.length).toBeGreaterThan(0);
      expect(results.ads).toEqual([]);
      expect(results.cross).toEqual([]);
    });

    it('should run all 30 GTM checks (basic + advanced)', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const results = runAudit(gtmData, null);

      expect(results.gtm.length).toBe(30);
    });

    it('should produce valid AuditCheck objects for every GTM result', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const results = runAudit(gtmData, null);

      results.gtm.forEach(check => {
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('severity');
        expect(check).toHaveProperty('passed');
        expect(check).toHaveProperty('title');
        expect(check).toHaveProperty('description');
        expect(check).toHaveProperty('recommendation');
        expect(['critical', 'warning', 'info']).toContain(check.severity);
        expect(typeof check.passed).toBe('boolean');
      });
    });
  });

  describe('Ads-only audit', () => {
    it('should run only Ads checks when only Ads data provided', () => {
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(null, adsData);

      expect(results.gtm).toEqual([]);
      expect(results.ads.length).toBeGreaterThan(0);
      expect(results.cross).toEqual([]);
    });

    it('should run all Ads checks (basic + advanced + structure + edge cases)', () => {
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(null, adsData);

      // 11 basic + 15 advanced + 8 structure + 8 edge cases = 42
      expect(results.ads.length).toBe(42);
    });
  });

  describe('Combined audit (both files)', () => {
    it('should run GTM, Ads, and cross-checks', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(gtmData, adsData);

      expect(results.gtm.length).toBe(30);
      // 11 basic + 15 advanced + 8 structure + 8 edge cases = 42
      expect(results.ads.length).toBe(42);
      // 4 basic cross + 10 advanced cross = 14
      expect(results.cross.length).toBe(14);
    });

    it('should run all checks total (GTM + Ads + Cross)', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(gtmData, adsData);

      const total = results.gtm.length + results.ads.length + results.cross.length;
      // 30 + 42 + 14 = 86
      expect(total).toBe(86);
    });
  });

  describe('Summary calculation', () => {
    it('should count passed checks correctly', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const results = runAudit(gtmData, null);

      const passedCount = results.gtm.filter(c => c.passed).length;
      const failedCount = results.gtm.filter(c => !c.passed).length;

      expect(results.summary.passed).toBe(passedCount);

      const failedSummary =
        results.summary.critical + results.summary.warning + results.summary.info;
      expect(failedSummary).toBe(failedCount);
    });

    it('should tally severity levels correctly for a problematic container', () => {
      const gtmData = loadGTM('gtm-container-missing-linker.json');
      const results = runAudit(gtmData, null);

      // Missing linker should be at least 1 critical failure
      expect(results.summary.critical).toBeGreaterThanOrEqual(1);

      // Total should equal number of checks
      const total =
        results.summary.critical +
        results.summary.warning +
        results.summary.info +
        results.summary.passed;
      expect(total).toBe(results.gtm.length);
    });

    it('should aggregate all categories in a combined audit', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(gtmData, adsData);

      const allChecks = [...results.gtm, ...results.ads, ...results.cross];
      const total =
        results.summary.critical +
        results.summary.warning +
        results.summary.info +
        results.summary.passed;
      expect(total).toBe(allChecks.length);
    });
  });

  describe('Context-aware audit', () => {
    it('should pass context through to GTM checks', () => {
      const gtmData: GTMContainer = {
        containerVersion: {
          tag: [{ name: 'Ads Tag', type: 'awct', firingTriggerId: ['1'] }],
        },
      };
      const contextNo: AuditContext = { needsConsent: 'no' };
      const contextYes: AuditContext = { needsConsent: 'yes' };

      const resultsNo = runAudit(gtmData, null, contextNo);
      const resultsYes = runAudit(gtmData, null, contextYes);

      const consentCheckNo = resultsNo.gtm.find(c => c.id === 'consent-violations');
      const consentCheckYes = resultsYes.gtm.find(c => c.id === 'consent-violations');

      expect(consentCheckNo?.severity).toBe('info');
      expect(consentCheckNo?.passed).toBe(true);
      expect(consentCheckYes?.severity).toBe('critical');
      expect(consentCheckYes?.passed).toBe(false);
    });

    it('should pass context through to Ads checks', () => {
      const adsData = loadCSV('ads-zero-values.csv');

      const ecomResults = runAudit(null, adsData, { businessModel: 'ecommerce' });
      const leadResults = runAudit(null, adsData, { businessModel: 'lead-generation' });

      const ecomCheck = ecomResults.ads.find(c => c.id === 'zero-value-purchases');
      const leadCheck = leadResults.ads.find(c => c.id === 'zero-value-purchases');

      expect(ecomCheck?.severity).toBe('critical');
      expect(leadCheck?.severity).toBe('warning');
    });
  });

  describe('Edge cases', () => {
    it('should handle container with empty arrays', () => {
      const gtmData: GTMContainer = {
        containerVersion: { tag: [], trigger: [], variable: [] },
      };
      const results = runAudit(gtmData, null);

      expect(results.gtm.length).toBe(30);
      results.gtm.forEach(check => {
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('passed');
      });
    });

    it('should handle Ads data with empty conversions', () => {
      const adsData: AdsData = { conversions: [] };
      const results = runAudit(null, adsData);

      // 11 basic + 15 advanced + 8 structure + 8 edge cases = 42
      expect(results.ads.length).toBe(42);
      results.ads.forEach(check => {
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('passed');
      });
    });

    it('should not run cross-checks when only one file provided', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const adsData = loadCSV('ads-clean.csv');

      const gtmOnly = runAudit(gtmData, null);
      const adsOnly = runAudit(null, adsData);

      expect(gtmOnly.cross).toEqual([]);
      expect(adsOnly.cross).toEqual([]);
    });

    it('should produce unique check IDs across all categories', () => {
      const gtmData = loadGTM('gtm-container-clean.json');
      const adsData = loadCSV('ads-clean.csv');
      const results = runAudit(gtmData, adsData);

      const allChecks = [...results.gtm, ...results.ads, ...results.cross];
      const ids = allChecks.map(c => c.id);
      // IDs may repeat across gtm/ads (e.g. "duplicate-conversions")
      // but within each category they should be unique
      const gtmIds = results.gtm.map(c => c.id);
      const adsIds = results.ads.map(c => c.id);
      const crossIds = results.cross.map(c => c.id);

      expect(new Set(gtmIds).size).toBe(gtmIds.length);
      expect(new Set(adsIds).size).toBe(adsIds.length);
      expect(new Set(crossIds).size).toBe(crossIds.length);
    });
  });
});

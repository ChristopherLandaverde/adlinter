import { runAudit } from '@/lib/auditEngine';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Integration Tests', () => {
  it('should run complete audit with both files', () => {
    // Load fixtures
    const gtmJson = readFileSync(
      join(__dirname, 'fixtures/gtm-container-clean.json'),
      'utf-8'
    );
    const adsCSV = readFileSync(
      join(__dirname, 'fixtures/ads-clean.csv'),
      'utf-8'
    );

    // Parse data
    const gtmData = parseGTMJSON(gtmJson);
    const adsData = parseAdsCSV(adsCSV);

    // Run audit
    const results = runAudit(gtmData, adsData);

    // Verify structure
    expect(results).toHaveProperty('gtm');
    expect(results).toHaveProperty('ads');
    expect(results).toHaveProperty('cross');
    expect(results).toHaveProperty('summary');

    // Verify summary
    expect(results.summary).toHaveProperty('critical');
    expect(results.summary).toHaveProperty('warning');
    expect(results.summary).toHaveProperty('info');
    expect(results.summary).toHaveProperty('passed');

    // Verify all checks ran
    expect(results.gtm.length).toBeGreaterThan(0);
    expect(results.ads.length).toBeGreaterThan(0);
    expect(results.cross.length).toBeGreaterThan(0);
  });

  it('should run GTM-only audit', () => {
    const gtmJson = readFileSync(
      join(__dirname, 'fixtures/gtm-container-clean.json'),
      'utf-8'
    );
    const gtmData = parseGTMJSON(gtmJson);

    const results = runAudit(gtmData, null);

    expect(results.gtm.length).toBeGreaterThan(0);
    expect(results.ads.length).toBe(0);
    expect(results.cross.length).toBe(0);
  });

  it('should run Ads-only audit', () => {
    const adsCSV = readFileSync(
      join(__dirname, 'fixtures/ads-clean.csv'),
      'utf-8'
    );
    const adsData = parseAdsCSV(adsCSV);

    const results = runAudit(null, adsData);

    expect(results.gtm.length).toBe(0);
    expect(results.ads.length).toBeGreaterThan(0);
    expect(results.cross.length).toBe(0);
  });

  it('should run report-only audit', () => {
    const reportJson = readFileSync(
      join(__dirname, 'fixtures/report-clean.json'),
      'utf-8'
    );
    const reportData = parseAdsReportCSV(reportJson);

    const results = runAudit(null, null, undefined, reportData);

    expect(results.gtm.length).toBe(0);
    expect(results.ads.length).toBe(0);
    expect(results.report.length).toBeGreaterThan(0);
    // 9 pure report checks + 2 report cross checks + 8 performance checks + 7 signal quality checks = 26
    expect(results.report.length).toBe(26);
  });

  it('should run full audit with all three file types', () => {
    const gtmJson = readFileSync(
      join(__dirname, 'fixtures/gtm-container-clean.json'),
      'utf-8'
    );
    const adsCSV = readFileSync(
      join(__dirname, 'fixtures/ads-clean.csv'),
      'utf-8'
    );
    const reportJson = readFileSync(
      join(__dirname, 'fixtures/report-clean.json'),
      'utf-8'
    );

    const gtmData = parseGTMJSON(gtmJson);
    const adsData = parseAdsCSV(adsCSV);
    const reportData = parseAdsReportCSV(reportJson);

    const results = runAudit(gtmData, adsData, undefined, reportData);

    expect(results.gtm.length).toBeGreaterThan(0);
    expect(results.ads.length).toBeGreaterThan(0);
    expect(results.cross.length).toBeGreaterThan(0);
    expect(results.report.length).toBeGreaterThan(0);

    // Summary should count all checks
    const totalChecks =
      results.gtm.length +
      results.ads.length +
      results.cross.length +
      results.report.length;
    const summaryTotal =
      results.summary.critical +
      results.summary.warning +
      results.summary.info +
      results.summary.passed;
    expect(summaryTotal).toBe(totalChecks);
  });
});

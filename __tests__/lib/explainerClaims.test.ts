/**
 * Guards explainer claims that were found to be wrong (follow-ups 1 and 2 of
 * PR #55). Explainers are cited in client reports, so a claim that contradicts
 * Google's documentation, or describes data a check never reads, is a defect.
 */
import { explainers, getExplainer } from '@/lib/checks/explainers';

const allText = (id: string): string => {
  const e = getExplainer(id);
  if (!e) throw new Error(`no explainer for ${id}`);
  return [e.summary, e.directAnswer, e.why, e.howToFix, e.example, e.citationTemplate].join('\n');
};

describe('explainer claims', () => {
  it('no explainer cites the retired Google Ads currency article (answer/2998565 returns 404)', () => {
    const offenders = explainers
      .filter(e => JSON.stringify(e).includes('google-ads/answer/2998565'))
      .map(e => e.id);
    expect(offenders).toEqual([]);
  });

  describe('currency-consistency', () => {
    // Google Ads Help, "Set up additional settings" (answer/13064032): values
    // reported in another currency are converted into the account currency at
    // the average daily foreign exchange rate.
    it('does not claim Google Ads sums mixed currencies without conversion', () => {
      const text = allText('currency-consistency');
      expect(text).not.toMatch(/doesn.t normalise/i);
      expect(text).not.toMatch(/without exchange-rate normali[sz]ation/i);
      expect(text).not.toMatch(/as 200/);
    });

    it('states the documented conversion at the average daily exchange rate and cites it', () => {
      const e = getExplainer('currency-consistency')!;
      expect(allText('currency-consistency')).toMatch(/average daily (foreign )?exchange rate/i);
      expect((e.references ?? []).map(r => r.url)).toContain(
        'https://support.google.com/google-ads/answer/13064032',
      );
    });

    // Mixed codes are supported, so the finding is info (matches the check).
    it('is info, and says a wrong code cannot be detected from the export', () => {
      expect(getExplainer('currency-consistency')!.severity).toBe('info');
      const text = allText('currency-consistency');
      expect(text).toMatch(/cannot (be detected|tell|see)[^.]*export|export[^.]*cannot/i);
      expect(text).toMatch(/test (order|conversion)/i);
    });
  });

  describe('currency-consistency-cross', () => {
    // A valid tag currency is converted into the account currency at the
    // average daily exchange rate (answer/13064032); the action's currency is
    // only the fallback for a missing or invalid code.
    it('is info and does not call a GTM/Ads currency difference an error', () => {
      const e = getExplainer('currency-consistency-cross')!;
      expect(e.severity).toBe('info');
      const text = allText('currency-consistency-cross');
      expect(text).not.toMatch(/conversion error/i);
      expect(text).not.toMatch(/10 to 30 percent/i);
      expect(text).not.toMatch(/match exactly/i);
      expect(text).toMatch(/average daily (foreign )?exchange rate/i);
      expect(text).toMatch(/cannot (be detected|tell|see)[^.]*export|export[^.]*cannot/i);
    });
  });

  describe('disabled-high-value-conversions', () => {
    // The check reads only category and status (lib/checks/adsChecks.ts).
    it('does not describe volume or value data the check never reads', () => {
      const text = allText('disabled-high-value-conversions');
      expect(text).not.toMatch(/recent volume/i);
      expect(text).not.toMatch(/historical (conversion )?value/i);
      expect(text).not.toMatch(/\$480,000/);
    });
  });
});

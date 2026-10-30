/**
 * Guards follow-up 4 of PR #55: `wrong-counting-method` and
 * `struct-counting-category-mismatch` both advise on the same field (a
 * conversion action's counting method). They must never give opposite
 * advice, and both must follow Google's guidance (answer/3438531): "Every"
 * for sales, "One" for leads.
 *
 * Every combination of category x counting x audit context is run through
 * both checks, one action at a time and as a whole account.
 */
import { checkWrongCountingMethod } from '@/lib/checks/adsChecks';
import { checkCountingCategoryMismatch } from '@/lib/checks/structureChecks';
import { AdsConversion, AdsData, AuditCheck, AuditContext } from '@/lib/types';

// Google Ads conversion categories, plus variants seen in exports.
const CATEGORIES = [
  'Purchase', 'Sale', 'Add to cart', 'Begin checkout', 'Subscribe', 'Subscription purchase',
  'Contact', 'Submit lead form', 'Book appointment', 'Sign-up', 'Request quote',
  'Get directions', 'Outbound click', 'Page view', 'Phone call lead', 'Qualified lead',
  'Converted lead', 'Lead', 'Order', 'Transaction', 'Order form', 'Other', 'Default',
];
const COUNTS = ['One', 'Every'];
const CONTEXTS: (AuditContext | undefined)[] = [
  undefined,
  {},
  { conversionCounting: 'once' },
  { conversionCounting: 'every-time' },
  { conversionCounting: 'not-sure' },
];

const action = (category: string, count: string, i = 0): AdsConversion => ({
  name: `${category} ${count} ${i}`,
  category,
  value: 10,
  count,
  attributionModel: 'Data-driven',
  clickWindow: '30 days',
  viewWindow: '1 day',
  status: 'Enabled',
});

type Advice = Map<string, string>; // action name -> recommended counting

const adviceFrom = (result: AuditCheck, key: 'conversions' | 'violations'): Advice => {
  const advice: Advice = new Map();
  if (result.passed) return advice;
  const rows = ((result.details ?? {}) as Record<string, unknown>)[key] as
    | Array<{ name: string; expected: string }>
    | undefined;
  for (const row of rows ?? []) advice.set(row.name, row.expected);
  return advice;
};

const run = (adsData: AdsData, context?: AuditContext) => ({
  wrong: adviceFrom(checkWrongCountingMethod(adsData, context), 'conversions'),
  struct: adviceFrom(checkCountingCategoryMismatch(adsData, context), 'violations'),
});

const label = (ctx?: AuditContext) => JSON.stringify(ctx ?? 'none');

describe('counting-method checks agree with each other and with Google', () => {
  for (const ctx of CONTEXTS) {
    for (const category of CATEGORIES) {
      for (const count of COUNTS) {
        it(`${category} counted ${count}, context ${label(ctx)}`, () => {
          const a = action(category, count);
          const { wrong, struct } = run({ conversions: [a] }, ctx);

          // Never opposite advice on the same action.
          if (wrong.has(a.name) && struct.has(a.name)) {
            expect(wrong.get(a.name)).toBe(struct.get(a.name));
          }
          // Flagging an action must ask for a change, not the current value.
          for (const advice of [wrong, struct]) {
            if (advice.has(a.name)) expect(advice.get(a.name)).not.toBe(count);
          }
          // wrong-counting-method only ever recommends Google's "Every" for sales.
          if (wrong.has(a.name)) expect(wrong.get(a.name)).toBe('Every');
        });
      }
    }
  }

  it.each(CONTEXTS.map(c => [label(c), c]))(
    'never recommends both "One" and "Every" for sale-type actions across one account (context %s)',
    (_label, ctx) => {
      const conversions = CATEGORIES.flatMap((cat, i) => COUNTS.map(count => action(cat, count, i)));
      const { wrong, struct } = run({ conversions }, ctx);
      const saleCategories = new Set(['Purchase', 'Sale', 'Subscription purchase', 'Order', 'Transaction', 'Order form']);
      const saleAdvice = new Set<string>();
      for (const advice of [wrong, struct]) {
        for (const [name, expected] of advice) {
          const cat = conversions.find(c => c.name === name)!.category;
          if (saleCategories.has(cat)) saleAdvice.add(expected);
        }
      }
      expect([...saleAdvice]).not.toContain('One');
    },
  );
});

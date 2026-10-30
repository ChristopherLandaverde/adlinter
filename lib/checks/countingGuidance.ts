// Google's counting guidance for conversion actions, shared by
// `wrong-counting-method` and `struct-counting-category-mismatch` so the two
// checks cannot drift into opposite advice.
//
// Google Ads Help, "Choose a counting setting for your conversions"
// (support.google.com/google-ads/answer/3438531): "Every" counts every
// conversion after an ad interaction and is the choice for tracking sales;
// "One" counts one conversion per ad click and suits leads, where the number
// of conversions per click doesn't matter.

export type CountingMethod = 'Every' | 'One';

const SALE_TERMS = ['purchase', 'sale', 'transaction', 'order', 'buy'];
const LEAD_TERMS = ['lead', 'sign-up', 'signup', 'contact', 'subscribe', 'form'];

export const isSaleCategory = (category: string): boolean =>
  SALE_TERMS.some(t => category.toLowerCase().includes(t));

export const isLeadCategory = (category: string): boolean =>
  LEAD_TERMS.some(t => category.toLowerCase().includes(t));

// The counting method Google recommends for a category, or null when the
// category gives no clear signal. A category that reads as both a sale and a
// lead ("Subscription purchase", "Order form") is treated as a sale: it
// records revenue, and repeat sales should be counted.
export const recommendedCounting = (category: string): CountingMethod | null => {
  if (isSaleCategory(category)) return 'Every';
  if (isLeadCategory(category)) return 'One';
  return null;
};

export const normaliseCounting = (count: string): CountingMethod | null => {
  const c = count.trim().toLowerCase();
  if (c === 'every') return 'Every';
  if (c === 'one') return 'One';
  return null;
};

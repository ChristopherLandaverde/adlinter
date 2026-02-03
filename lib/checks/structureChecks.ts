import { AdsData, AuditCheck, AuditContext, Severity } from '../types';
import { areSimilar } from '../utils/stringDistance';

// Helper to extract days from window strings like "30 days", "1 day"
const parseDays = (window: string): number => {
  const match = window.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Helper to check if a category is purchase-related
const isPurchaseCategory = (category: string): boolean => {
  const terms = ['purchase', 'sale', 'transaction', 'order', 'buy'];
  return terms.some(t => category.toLowerCase().includes(t));
};

// Helper to check if a category is lead-related
const isLeadCategory = (category: string): boolean => {
  const terms = ['lead', 'sign-up', 'signup', 'contact', 'subscribe', 'form'];
  return terms.some(t => category.toLowerCase().includes(t));
};

// Deprecated attribution models (Google phasing these out)
const DEPRECATED_MODELS = [
  'First click',
  'Linear',
  'Time decay',
  'Position-based',
];

// ── STRUCTURE CHECK #1: Naming Convention Compliance ─────────
export const checkNamingConvention = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const names = adsData.conversions.map(c => c.name);

  const patterns: Record<string, RegExp> = {
    snake_case: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    'kebab-case': /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
    'Title Case': /^[A-Z][a-z]*([ ][A-Z][a-z]*)*$/,
  };

  // Detect which pattern each name follows
  const patternCounts: Record<string, number> = {};
  const unmatched: string[] = [];

  for (const name of names) {
    let matched = false;
    for (const [patternName, regex] of Object.entries(patterns)) {
      if (regex.test(name)) {
        patternCounts[patternName] = (patternCounts[patternName] || 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      unmatched.push(name);
    }
  }

  // Find dominant pattern
  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);
  const dominantPattern = sortedPatterns[0]?.[0] || 'none';
  const dominantCount = sortedPatterns[0]?.[1] || 0;
  const consistency = names.length > 0 ? dominantCount / names.length : 1;

  const passed = consistency >= 0.8;

  return {
    id: 'struct-naming-convention',
    severity: 'info',
    passed,
    title: 'Naming Convention Consistency',
    description: passed
      ? `${Math.round(consistency * 100)}% of conversions follow ${dominantPattern} convention`
      : `Only ${Math.round(consistency * 100)}% of conversions follow a consistent naming pattern`,
    details: {
      dominantPattern,
      consistency: Math.round(consistency * 100),
      patternBreakdown: patternCounts,
      unmatchedNames: unmatched,
    },
    recommendation: 'Standardize conversion naming to improve organization and reduce confusion',
  };
};

// ── STRUCTURE CHECK #2: Semantic Duplicates ──────────────────
export const checkSemanticDuplicates = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversions = adsData.conversions;

  // Semantic groupings - names that likely mean the same thing
  const semanticGroups: Record<string, string[]> = {
    purchase: ['purchase', 'buy', 'order', 'transaction', 'sale', 'checkout_complete', 'bought'],
    lead: ['lead', 'form_submit', 'contact', 'inquiry', 'request', 'signup', 'sign_up', 'sign-up'],
    add_to_cart: ['add_to_cart', 'addtocart', 'add-to-cart', 'cart_add', 'basket_add'],
    begin_checkout: ['begin_checkout', 'checkout_start', 'start_checkout', 'initiate_checkout'],
    page_view: ['page_view', 'pageview', 'page-view', 'view_page'],
  };

  const semanticDuplicates: Array<{ group: string; conversions: string[] }> = [];

  for (const [groupName, variants] of Object.entries(semanticGroups)) {
    const matching = conversions.filter(c =>
      variants.some(v => c.name.toLowerCase().includes(v))
    );

    if (matching.length > 1) {
      semanticDuplicates.push({
        group: groupName,
        conversions: matching.map(c => c.name),
      });
    }
  }

  return {
    id: 'struct-semantic-duplicates',
    severity: 'warning',
    passed: semanticDuplicates.length === 0,
    title: 'Semantic Duplicate Conversions',
    description: semanticDuplicates.length > 0
      ? `${semanticDuplicates.length} group(s) of semantically similar conversions found`
      : 'No semantic duplicates detected',
    details: { semanticDuplicates },
    recommendation: 'Consolidate conversions that track the same user action under different names',
  };
};

// ── STRUCTURE CHECK #3: Attribution Model Chaos ──────────────
export const checkAttributionModelChaos = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const models = adsData.conversions
    .map(c => c.attributionModel)
    .filter(m => m && m !== '');

  const uniqueModels = Array.from(new Set(models));
  const hasMixedModels = uniqueModels.length > 2;

  const deprecatedInUse = adsData.conversions.filter(c =>
    DEPRECATED_MODELS.includes(c.attributionModel)
  );

  const issues: string[] = [];
  if (hasMixedModels) {
    issues.push(`${uniqueModels.length} different attribution models in use`);
  }
  if (deprecatedInUse.length > 0) {
    issues.push(`${deprecatedInUse.length} conversion(s) using deprecated models`);
  }

  const passed = !hasMixedModels && deprecatedInUse.length === 0;

  return {
    id: 'struct-attribution-chaos',
    severity: 'warning',
    passed,
    title: 'Attribution Model Configuration',
    description: passed
      ? 'Attribution models are consistent and up-to-date'
      : issues.join('; '),
    details: {
      modelsInUse: uniqueModels,
      deprecatedConversions: deprecatedInUse.map(c => ({
        name: c.name,
        model: c.attributionModel,
      })),
    },
    recommendation: 'Migrate to Data-Driven Attribution (DDA) for all conversions where eligible',
  };
};

// ── STRUCTURE CHECK #4: Window Asymmetry ─────────────────────
export const checkWindowAsymmetry = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  // View window should never exceed click window
  const asymmetric = adsData.conversions.filter(c => {
    const clickDays = parseDays(c.clickWindow);
    const viewDays = parseDays(c.viewWindow);
    return viewDays > 0 && clickDays > 0 && viewDays > clickDays;
  });

  return {
    id: 'struct-window-asymmetry',
    severity: 'warning',
    passed: asymmetric.length === 0,
    title: 'Attribution Window Asymmetry',
    description: asymmetric.length > 0
      ? `${asymmetric.length} conversion(s) have view windows longer than click windows`
      : 'All attribution windows are properly configured',
    details: {
      asymmetricConversions: asymmetric.map(c => ({
        name: c.name,
        clickWindow: c.clickWindow,
        viewWindow: c.viewWindow,
      })),
    },
    recommendation: 'View-through windows should be shorter than or equal to click-through windows',
  };
};

// ── STRUCTURE CHECK #5: Category vs Name Mismatch ────────────
export const checkCategoryNameMismatch = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const mismatches = adsData.conversions.filter(c => {
    const nameLower = c.name.toLowerCase();
    const catLower = c.category.toLowerCase();

    // Name suggests purchase but category doesn't
    const nameSuggestsPurchase = /purchase|order|buy|transaction|sale/i.test(nameLower);
    const categoryIsPurchase = isPurchaseCategory(catLower);

    // Name suggests lead but category doesn't
    const nameSuggestsLead = /lead|form|contact|signup|subscribe/i.test(nameLower);
    const categoryIsLead = isLeadCategory(catLower);

    return (nameSuggestsPurchase && !categoryIsPurchase) ||
           (nameSuggestsLead && !categoryIsLead) ||
           (categoryIsPurchase && !nameSuggestsPurchase && nameSuggestsLead);
  });

  return {
    id: 'struct-category-name-mismatch',
    severity: 'info',
    passed: mismatches.length === 0,
    title: 'Category Does Not Match Conversion Name',
    description: mismatches.length > 0
      ? `${mismatches.length} conversion(s) have categories that don't match their names`
      : 'All conversion categories align with their names',
    details: {
      mismatches: mismatches.map(c => ({
        name: c.name,
        category: c.category,
      })),
    },
    recommendation: 'Update categories to accurately reflect the conversion type for proper reporting',
  };
};

// ── STRUCTURE CHECK #6: Counting Method vs Category ──────────
export const checkCountingCategoryMismatch = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const violations = adsData.conversions.filter(c => {
    const isPurchase = isPurchaseCategory(c.category);
    const isLead = isLeadCategory(c.category);
    const countLower = c.count.toLowerCase();

    // Purchases should typically count "Every" (each transaction)
    // Leads should typically count "One" (one lead per user)
    if (isPurchase && countLower === 'one') return true;
    if (isLead && countLower === 'every') return true;
    return false;
  });

  return {
    id: 'struct-counting-category-mismatch',
    severity: 'critical',
    passed: violations.length === 0,
    title: 'Counting Method vs Category Mismatch',
    description: violations.length > 0
      ? `${violations.length} conversion(s) have counting methods that conflict with their category`
      : 'All counting methods align with conversion categories',
    details: {
      violations: violations.map(c => ({
        name: c.name,
        category: c.category,
        count: c.count,
        expected: isPurchaseCategory(c.category) ? 'Every' : 'One',
      })),
    },
    recommendation: 'Set purchases to "Every" (count each transaction) and leads to "One" (count unique users)',
  };
};

// ── STRUCTURE CHECK #7: All Last Click Attribution ───────────
export const checkAllLastClick = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionsWithModels = adsData.conversions.filter(
    c => c.attributionModel && c.attributionModel !== ''
  );

  if (conversionsWithModels.length === 0) {
    return {
      id: 'struct-all-last-click',
      severity: 'info',
      passed: true,
      title: 'Last-Click Attribution Opportunity',
      description: 'No attribution models to evaluate',
      recommendation: 'Configure attribution models for your conversions',
    };
  }

  const allLastClick = conversionsWithModels.every(
    c => c.attributionModel === 'Last click'
  );

  return {
    id: 'struct-all-last-click',
    severity: 'info',
    passed: !allLastClick,
    title: 'Last-Click Attribution Opportunity',
    description: allLastClick
      ? 'All conversions use Last-Click attribution — missing Data-Driven Attribution opportunity'
      : 'Attribution models are diversified',
    details: {
      lastClickCount: conversionsWithModels.filter(c => c.attributionModel === 'Last click').length,
      totalCount: conversionsWithModels.length,
    },
    recommendation: 'Enable Data-Driven Attribution (DDA) for more accurate conversion credit distribution',
  };
};

// ── STRUCTURE CHECK #8: Duplicate Static Values ──────────────
export const checkDuplicateStaticValues = (
  adsData: AdsData,
  _context?: AuditContext
): AuditCheck => {
  const conversionsWithValues = adsData.conversions.filter(c => c.value > 0);

  const valueGroups: Record<number, string[]> = {};
  for (const c of conversionsWithValues) {
    if (!valueGroups[c.value]) {
      valueGroups[c.value] = [];
    }
    valueGroups[c.value].push(c.name);
  }

  const duplicateValues = Object.entries(valueGroups)
    .filter(([, names]) => names.length > 1)
    .map(([value, names]) => ({
      value: parseFloat(value),
      conversions: names,
    }));

  return {
    id: 'struct-duplicate-static-values',
    severity: 'info',
    passed: duplicateValues.length === 0,
    title: 'Multiple Conversions with Same Static Value',
    description: duplicateValues.length > 0
      ? `${duplicateValues.length} value(s) shared across multiple conversions — suggests copy-paste or lack of dynamic values`
      : 'No duplicate static values detected',
    details: { duplicateValues },
    recommendation: 'Consider using dynamic values or verify that shared values are intentional',
  };
};

// Export all structure checks
export const allStructureChecks = [
  checkNamingConvention,
  checkSemanticDuplicates,
  checkAttributionModelChaos,
  checkWindowAsymmetry,
  checkCategoryNameMismatch,
  checkCountingCategoryMismatch,
  checkAllLastClick,
  checkDuplicateStaticValues,
];

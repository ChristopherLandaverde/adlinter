import { AuditCheck, AuditContext, LinkedInInsightData, LinkedInInsightEvent, Severity } from '../types';
import { areSimilar } from '../utils/stringDistance';

const KEY_CONVERSIONS: LinkedInInsightEvent['type'][] = ['Lead', 'SignUp', 'Purchase', 'Download'];
const DISABLED_STATUSES = ['disabled', 'inactive', 'paused'];

const isActive = (event: LinkedInInsightEvent): boolean => {
  const status = event.status.toLowerCase();
  return status === 'active' || status === 'enabled' || status === 'true';
};

const isDisabled = (event: LinkedInInsightEvent): boolean =>
  DISABLED_STATUSES.includes(event.status.toLowerCase());

const parseWindowDays = (window?: string): number | null => {
  if (!window) return null;
  const match = window.match(/(\d+(?:\.\d+)?)\s*day/i);
  return match ? Number(match[1]) : null;
};

// ── A. No Active Conversions ──────────────────────────────────
export const checkNoActiveConversions = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const activeConversions = linkedinData.events.filter(e => isActive(e) && e.count > 0);
  const hasActiveConversions = activeConversions.length > 0;

  return {
    id: 'linkedin-no-active-conversions',
    severity: 'critical',
    passed: hasActiveConversions,
    title: 'No Active LinkedIn Conversions',
    description: hasActiveConversions
      ? `Found ${activeConversions.length} active conversion action(s) with recorded volume`
      : 'No active LinkedIn conversion actions with recorded volume found',
    details: { activeConversions: activeConversions.map(e => e.name) },
    recommendation: 'Verify the LinkedIn Insight Tag is installed and that conversion actions are firing before relying on LinkedIn optimization or audiences.',
  };
};

// ── B. Missing Key Conversions ────────────────────────────────
export const checkMissingKeyConversions = (
  linkedinData: LinkedInInsightData,
  context?: AuditContext
): AuditCheck => {
  const activeEvents = linkedinData.events.filter(isActive);
  const foundConversions = activeEvents
    .filter(e => KEY_CONVERSIONS.includes(e.type))
    .map(e => e.name);
  const hasKeyConversion = foundConversions.length > 0;

  let severity: Severity = 'critical';
  if (context?.businessModel === 'agency' || context?.businessModel === 'other') {
    severity = 'warning';
  }

  return {
    id: 'linkedin-missing-key-conversions',
    severity,
    passed: hasKeyConversion,
    title: 'Missing Key Conversion Actions',
    description: hasKeyConversion
      ? `Found ${foundConversions.length} key conversion action(s): ${foundConversions.join(', ')}`
      : 'No active Lead, SignUp, Purchase, or Download conversion actions found',
    details: hasKeyConversion ? { conversionActions: foundConversions } : {},
    recommendation: 'Configure at least one LinkedIn conversion action that represents the business outcome: Lead or SignUp for demand gen, Purchase for revenue, or Download for gated assets.',
  };
};

// ── C. Duplicate Conversions ──────────────────────────────────
export const checkDuplicateConversions = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const nameCounts: Record<string, number> = {};
  for (const event of linkedinData.events) {
    const key = event.name.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  const duplicates = Object.entries(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));

  return {
    id: 'linkedin-duplicate-conversions',
    severity: 'warning',
    passed: duplicates.length === 0,
    title: 'Duplicate Conversion Names',
    description: duplicates.length > 0
      ? `Found ${duplicates.length} duplicate conversion name(s) — may cause reporting confusion`
      : 'No duplicate conversion names found',
    details: { duplicates },
    recommendation: 'Consolidate duplicate conversion actions so one business event maps to one LinkedIn conversion action.',
  };
};

// ── D. Similar Conversion Names ───────────────────────────────
export const checkSimilarConversionNames = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const events = linkedinData.events;
  const similarPairs: Array<{ event1: string; event2: string }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const name1 = events[i].name;
      const name2 = events[j].name;
      if (name1.toLowerCase() !== name2.toLowerCase() && areSimilar(name1, name2)) {
        similarPairs.push({ event1: name1, event2: name2 });
      }
    }
  }

  return {
    id: 'linkedin-similar-conversion-names',
    severity: 'info',
    passed: similarPairs.length === 0,
    title: 'Similar Conversion Names',
    description: similarPairs.length > 0
      ? `Found ${similarPairs.length} pair(s) of similarly named conversions — potential typos or duplicates`
      : 'No similarly named conversions found',
    details: { similarPairs },
    recommendation: 'Review similar conversion names and consolidate them if they represent the same LinkedIn conversion action.',
  };
};

// ── E. Zero Volume Active Conversions ─────────────────────────
export const checkZeroVolumeConversions = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const zeroVolume = linkedinData.events.filter(e => isActive(e) && e.count === 0);

  return {
    id: 'linkedin-zero-volume-conversions',
    severity: 'warning',
    passed: zeroVolume.length === 0,
    title: 'Zero Volume Active Conversions',
    description: zeroVolume.length > 0
      ? `${zeroVolume.length} active conversion action(s) have zero recorded conversions`
      : 'All active conversion actions have recorded volume',
    details: { zeroVolumeConversions: zeroVolume.map(e => e.name) },
    recommendation: 'Investigate active LinkedIn conversion actions with zero volume — they may have broken triggers, overly narrow rules, or no campaign traffic.',
  };
};

// ── F. Other Category Overuse ─────────────────────────────────
export const checkOtherCategoryOveruse = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const otherConversions = linkedinData.events.filter(e => e.type === 'Other');
  const tooMany = otherConversions.length > 2;

  return {
    id: 'linkedin-other-category-overuse',
    severity: tooMany ? 'warning' : 'info',
    passed: otherConversions.length === 0,
    title: 'Other Category Overuse',
    description: otherConversions.length > 0
      ? `${otherConversions.length} conversion action(s) are categorized as Other`
      : 'No conversion actions are categorized as Other',
    details: { otherConversions: otherConversions.map(e => e.name) },
    recommendation: 'Use LinkedIn standard categories where possible. Many Other actions should be Lead, SignUp, Download, KeyPageView, or Purchase so optimization and reporting stay interpretable.',
  };
};

// ── G. Purchase Missing Value ─────────────────────────────────
export const checkPurchaseMissingValue = (
  linkedinData: LinkedInInsightData,
  context?: AuditContext
): AuditCheck => {
  const purchaseConversions = linkedinData.events.filter(e => e.type === 'Purchase');

  if (purchaseConversions.length === 0) {
    return {
      id: 'linkedin-purchase-missing-value',
      severity: 'info',
      passed: true,
      title: 'Purchase Conversion Value Tracking',
      description: 'No Purchase conversion actions configured (check not applicable)',
      recommendation: 'N/A',
    };
  }

  const purchasesWithoutValue = purchaseConversions.filter(e => e.value === 0 && e.count > 0);
  let severity: Severity = 'critical';
  if (context?.valueStrategy === 'no-values') {
    severity = 'info';
  }

  return {
    id: 'linkedin-purchase-missing-value',
    severity,
    passed: purchasesWithoutValue.length === 0,
    title: 'Purchase Conversion Value Tracking',
    description: purchasesWithoutValue.length > 0
      ? 'Purchase conversion action(s) are firing without value data — cannot analyze revenue quality'
      : 'Purchase conversion actions include value data',
    details: {
      purchaseConversions: purchaseConversions.map(e => ({
        name: e.name,
        count: e.count,
        value: e.value,
        hasValue: e.value > 0,
      })),
    },
    recommendation: 'Pass value and currency on LinkedIn Purchase conversion actions when revenue reporting or value-based analysis matters.',
  };
};

// ── H. Conversion Window Too Short ────────────────────────────
export const checkConversionWindowTooShort = (
  linkedinData: LinkedInInsightData,
  context?: AuditContext
): AuditCheck => {
  if (context?.salesCycle === 'immediate') {
    return {
      id: 'linkedin-conversion-window-too-short',
      severity: 'info',
      passed: true,
      title: 'Conversion Window Length',
      description: 'Immediate sales cycle selected (short-window check skipped)',
      recommendation: 'N/A',
    };
  }

  const shortWindows = linkedinData.events
    .map(e => ({ name: e.name, conversionWindow: e.conversionWindow, days: parseWindowDays(e.conversionWindow) }))
    .filter(e => e.days !== null && e.days < 7);

  return {
    id: 'linkedin-conversion-window-too-short',
    severity: shortWindows.length > 0 ? 'warning' : 'info',
    passed: shortWindows.length === 0,
    title: 'Conversion Window Too Short',
    description: shortWindows.length > 0
      ? `${shortWindows.length} conversion action(s) use windows shorter than 7 days`
      : 'Conversion windows are not shorter than 7 days',
    details: { shortWindows },
    recommendation: 'Use wider LinkedIn conversion windows for B2B and considered purchases. Short windows can drop legitimate leads that convert after research, approvals, or follow-up.',
  };
};

// ── I. Unattached Conversions ─────────────────────────────────
export const checkUnattachedConversions = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const unattached = linkedinData.events.filter(
    e => isActive(e) && e.campaignAttachments === 0
  );

  return {
    id: 'linkedin-unattached-conversions',
    severity: unattached.length > 0 ? 'warning' : 'info',
    passed: unattached.length === 0,
    title: 'Unattached Conversion Actions',
    description: unattached.length > 0
      ? `${unattached.length} active conversion action(s) are not attached to any campaign`
      : 'No active conversion actions are explicitly unattached',
    details: { unattachedConversions: unattached.map(e => e.name) },
    recommendation: 'Attach active LinkedIn conversion actions to the campaigns that should optimize or report against them. An unattached conversion is effectively dormant for campaign measurement.',
  };
};

// ── J. Disabled Key Conversions ───────────────────────────────
export const checkDisabledKeyConversions = (
  linkedinData: LinkedInInsightData,
  _context?: AuditContext
): AuditCheck => {
  const disabledConversions = linkedinData.events.filter(
    e => isDisabled(e) && ['Lead', 'Purchase', 'SignUp'].includes(e.type)
  );

  return {
    id: 'linkedin-disabled-key-conversions',
    severity: disabledConversions.length > 0 ? 'warning' : 'info',
    passed: disabledConversions.length === 0,
    title: 'Disabled Key Conversion Actions',
    description: disabledConversions.length > 0
      ? `${disabledConversions.length} key conversion action(s) are disabled`
      : 'No key conversion actions are disabled',
    details: { disabledConversions: disabledConversions.map(e => e.name) },
    recommendation: 'Review disabled Lead, Purchase, and SignUp actions. They may be intentionally retired, but they often represent the exact outcomes LinkedIn campaigns need.',
  };
};

export const allLinkedInChecks: Array<(linkedinData: LinkedInInsightData, context?: AuditContext) => AuditCheck> = [
  checkNoActiveConversions,
  checkMissingKeyConversions,
  checkDuplicateConversions,
  checkSimilarConversionNames,
  checkZeroVolumeConversions,
  checkOtherCategoryOveruse,
  checkPurchaseMissingValue,
  checkConversionWindowTooShort,
  checkUnattachedConversions,
  checkDisabledKeyConversions,
];

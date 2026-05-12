// Category-page metadata for each source. Used by /sources/[key]/page.tsx
// to render landing pages that target category-level search queries
// ("GTM audit checklist," "Google Ads conversion tracking issues").
//
// Each entry: short hero copy, one paragraph of positioning text, and
// a primary search-target phrase that informs the page title and h1.
//
// Keep prose voice-clean per the project's editorial rules.

import type { ExplainerSource } from './explainers';

export interface SourceContent {
  key: ExplainerSource;
  label: string;            // Human label, used in nav and titles
  headline: string;         // h1 line, query-targeted
  searchTargets: string[];  // sample search phrases this page should rank for
  tagline: string;          // one-sentence position
  intro: string;            // ~200 words positioning prose
  toolSlug?: string;        // matching tool slug for the "run a free audit" CTA
}

export const sourceContent: Record<ExplainerSource, SourceContent> = {
  gtm: {
    key: 'gtm',
    label: 'Google Tag Manager',
    headline: 'Google Tag Manager container audit',
    searchTargets: ['GTM audit', 'GTM container review', 'GTM checklist', 'Google Tag Manager audit', 'GTM tracking audit'],
    tagline: 'Twenty-nine checks every GTM container should pass before it is handed off to a client.',
    intro:
      'A GTM container is one of the highest-leverage surfaces in any ad-tech setup. It sits between the site and every measurement endpoint (Google Ads, GA4, Meta CAPI, TikTok Events, whatever else). When it works, attribution works. When it drifts, every downstream report drifts with it.\n\nAdLint runs 29 checks against any GTM container export. The checks cover four things: tags that should fire and do not (missing Conversion Linker, missing Consent Settings), tags that should not fire and do (debug-named tags in production, duplicate conversion tags), data-layer hygiene (variables bound to the wrong paths, missing currency, mixed Data Layer Version), and operational governance (naming conventions, unused triggers, stale tags, container size approaching the workspace limit).\n\nEach finding links to a defensible explanation, a fix, and a copy-pasteable citation for client deliverables. No upload, no account. Everything runs in your browser.',
    toolSlug: 'gtm-auditor',
  },
  ads: {
    key: 'ads',
    label: 'Google Ads',
    headline: 'Google Ads conversion tracking audit',
    searchTargets: ['Google Ads audit', 'Google Ads conversion tracking review', 'tROAS audit', 'Smart Bidding audit', 'Google Ads attribution review'],
    tagline: 'Thirty-four checks for Google Ads conversion settings, value methodology, and attribution.',
    intro:
      'Google Ads conversion settings are where Smart Bidding decisions get made. The settings layer (Primary vs Secondary actions, counting method, value methodology, attribution model, conversion windows) determines what signal the bidding algorithm sees. Mistakes here propagate into every campaign report and every dollar of spend until they are found.\n\nAdLint audits Google Ads exports for 34 patterns. The critical checks: actions without a Primary tag, purchase actions with zero conversion value, mixed currencies in the same conversion set, attribution chaos (multiple models without rationale). The warning-tier checks: counting method misaligned to category, fixed values on variable-revenue events, click-through windows too short for the actual sales cycle. The diagnostic checks: ROAS feasibility against historical achieved, value outliers distorting the bidding signal, action-naming inconsistency.\n\nEvery finding is sourced back to a Google Ads support article so the citation is defensible inside a client deliverable.',
    toolSlug: 'google-ads-linter',
  },
  report: {
    key: 'report',
    label: 'Performance Reports',
    headline: 'Google Ads Performance Report audit',
    searchTargets: ['Google Ads performance report audit', 'Ads conversion volume audit', 'ROAS outlier detection'],
    tagline: 'Thirty statistical checks on Google Ads Performance reports to surface bidding-signal corruption.',
    intro:
      'Google Ads conversion settings tell you what is configured. Performance reports tell you what actually fired. The gap between the two is where most measurement problems live.\n\nAdLint runs 30 statistical and structural checks against a Google Ads Performance report export. The checks catch zero-volume actions that look enabled, value-without-volume patterns that signal pipeline breakage, perfect-ROAS values that almost always mean a static-value misconfiguration, ROAS outliers that distort tROAS bidding, Pareto concentration (one action carrying most of the volume), and view-through-conversion patterns that swamp click-through signal.\n\nAlso covered: cross-account import contamination, micro-conversion pollution flooding Smart Bidding with noise, primary-conversion dilution (too many Primary actions of incompatible weight), and the classic "ghost conversions" pattern where a Google Ads action is enabled but the report shows zero fires for the period.',
    toolSlug: 'performance-report-analyzer',
  },
  cross: {
    key: 'cross',
    label: 'Cross-Source Consistency',
    headline: 'Cross-source ad-tracking consistency audit',
    searchTargets: ['cross-source tracking audit', 'GTM vs Google Ads consistency', 'attribution consistency review'],
    tagline: 'Fifteen checks that compare your GTM container, Google Ads conversion settings, and Performance report against each other.',
    intro:
      'A measurement setup is only as defensible as the consistency between its layers. A conversion action enabled in Google Ads but missing a matching GTM tag is a dead action. A GTM tag firing without a matching Google Ads conversion action is wasted JavaScript. A Performance report showing volume on an action that does not exist in current settings is orphaned data from a deleted configuration that nobody cleaned up.\n\nAdLint\'s cross-source checks compare all three layers (GTM, Google Ads settings, Performance report) and flag mismatches. The critical findings: orphaned tags, ghost actions, conversion-label mismatches, transaction-ID deduplication failures, Enhanced Conversions configured without user-data flowing. The warning-tier findings: tag-count mismatches that signal forgotten implementations, value-config mismatches between layers, cross-currency inconsistencies, possible-rename detection.\n\nThese are the checks that catch the failures other audits miss because no single source-of-truth shows them.',
    toolSlug: 'full-audit',
  },
  meta: {
    key: 'meta',
    label: 'Meta Pixel',
    headline: 'Meta Pixel audit (Facebook + Instagram)',
    searchTargets: ['Meta Pixel audit', 'Facebook Pixel review', 'Meta Conversions API audit', 'Meta CAPI deduplication audit'],
    tagline: 'Ten checks for Meta Pixel and Conversions API exports from Meta Events Manager.',
    intro:
      'Meta\'s tracking surface is fragmented across the browser pixel, the Conversions API, and Aggregated Event Measurement. Each piece can fail independently. The pixel can be installed without PageView. CAPI can run alongside the pixel without proper event_id deduplication. Standard events can be replaced with custom events that Meta does not recognise.\n\nAdLint audits exports from Meta Events Manager. The 10 checks cover: missing PageView, missing core conversion events (Purchase, Lead, CompleteRegistration, etc.), duplicate event names, similar-but-different event names that signal accidental drift, zero-volume events, custom events that have a standard equivalent, Purchase events missing value or currency, e-commerce funnel coverage gaps, event volume concentration, and disabled conversion events.\n\nThe citation language on each check is written to drop straight into an agency deliverable.',
    toolSlug: 'meta-auditor',
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok Pixel',
    headline: 'TikTok Pixel audit',
    searchTargets: ['TikTok Pixel audit', 'TikTok Events API audit', 'TikTok conversion tracking review'],
    tagline: 'Ten checks for TikTok Pixel and Events API exports.',
    intro:
      'TikTok\'s tracking model uses standard events (ViewContent, AddToCart, CompletePayment, etc.) plus optional custom events, with Events API as the server-side counterpart. Smart Performance Campaigns lean heavily on event quality; a pixel that fires the wrong events or fires with empty parameters trains the algorithm against noise.\n\nAdLint checks 10 patterns against TikTok Pixel exports: base events active (PageView and ViewContent firing on the right pages), missing conversion events for the funnel, custom events that should be standard events, duplicate event names, similar-event-name drift, zero-volume events, CompletePayment with missing value, e-commerce funnel coverage, event volume concentration, and disabled conversion events.\n\nEach finding lands with a citation paragraph and a fix written for a client report.',
    toolSlug: 'tiktok-auditor',
  },
  linkedin: {
    key: 'linkedin',
    label: 'LinkedIn Insight Tag',
    headline: 'LinkedIn Insight Tag audit',
    searchTargets: ['LinkedIn Insight Tag audit', 'LinkedIn conversion tracking review', 'B2B ad-tracking audit'],
    tagline: 'Ten checks for LinkedIn Insight Tag and conversion-tracking event exports.',
    intro:
      'LinkedIn measurement is the hardest of the major platforms to get right because the conversion windows skew long (B2B sales cycles), the conversion categories matter more than usual (Google Ads gives Smart Bidding the categories; LinkedIn ties them to specific bidding optimisations), and the Insight Tag\'s default behaviour is more permissive than the others.\n\nAdLint audits LinkedIn conversion-tracking event exports for: no active conversions, missing key conversions (Lead, Purchase, Sign-Up), duplicate conversion definitions, similar-name drift, zero-volume conversions, overuse of the "Other" category, Purchase actions missing value, conversion windows too short for the sales cycle, conversions defined but unattached to any campaign, and disabled key conversions.\n\nThe sales-cycle audit context lets the windows checks calibrate per-account.',
    toolSlug: 'linkedin-auditor',
  },
  pinterest: {
    key: 'pinterest',
    label: 'Pinterest Tag',
    headline: 'Pinterest Tag audit',
    searchTargets: ['Pinterest Tag audit', 'Pinterest Conversions API review', 'Pinterest Enhanced Match audit'],
    tagline: 'Ten checks for Pinterest Tag and Conversions API event exports.',
    intro:
      'Pinterest\'s tracking model mirrors Meta\'s in structure: a browser tag (the Pinterest Tag) plus a server-side counterpart (Conversions API), with Enhanced Match for hashed-user-data deduplication. Standard events should be used in preference to custom events, and event_id should be present and consistent between pixel and CAPI.\n\nAdLint checks 10 patterns: missing PageVisit, missing conversion events, duplicate events, similar-name drift, zero-volume events, custom events with standard alternatives, Checkout missing value, e-commerce funnel coverage, CAPI parity (whether browser and server send matching events with deduplication IDs), and tag-configuration quality (Enhanced Match enabled, currency configured, partner_name set).',
    toolSlug: 'pinterest-auditor',
  },
  twitter: {
    key: 'twitter',
    label: 'Twitter / X Pixel',
    headline: 'Twitter / X Pixel audit',
    searchTargets: ['X Pixel audit', 'Twitter Pixel review', 'X Ads conversion tracking audit'],
    tagline: 'Ten checks for X Pixel (formerly Twitter Pixel) and conversion-tracking exports.',
    intro:
      'X (formerly Twitter) uses a per-event tag model: each conversion event has its own `tw-XXXXX-XXXXX` event tag ID, and the event_name is just a display label. This produces a class of failures unique to X: distinct tag IDs sharing the same event name, conversion_id required on one tag but optional on a similar one, view-through windows behaving differently per tag.\n\nAdLint checks 10 patterns against X conversion-tracking exports: event_id format (the `tw-` prefix and structure), conversion_id required-field configuration, deduplication via conversion_id, conversion windows mismatched to sales cycle, engagement-only tags counted as conversions, missing core conversion events, Purchase missing value, similar event names, zero-volume events, duplicate events.',
    toolSlug: 'twitter-auditor',
  },
  snapchat: {
    key: 'snapchat',
    label: 'Snap Pixel',
    headline: 'Snapchat Pixel audit',
    searchTargets: ['Snap Pixel audit', 'Snapchat Conversions API review', 'Snapchat ad-tracking audit'],
    tagline: 'Ten checks for Snap Pixel and Snapchat Conversions API exports.',
    intro:
      'Snapchat\'s tracking uses the Snap Pixel for browser events and the Snap Conversions API (CAPI) for server-side. Pixel ID format is UUID-like and easy to get wrong. Standard events (PAGE_VIEW, VIEW_CONTENT, ADD_CART, PURCHASE, SIGN_UP, etc.) should be used in preference to custom names. event_id deduplication is essential when running pixel and CAPI together.\n\nAdLint runs 10 checks on Snap Pixel exports: Pixel ID format validation, PAGE_VIEW configured, core conversion events present, standard event names (not custom drift), duplicate events, similar-name drift, zero-volume events, PURCHASE missing value, e-commerce funnel coverage, and CAPI deduplication / currency alignment between pixel and server.',
    toolSlug: 'snapchat-auditor',
  },
};

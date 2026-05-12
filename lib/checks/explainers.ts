export type ExplainerSource = 'gtm' | 'ads' | 'report' | 'cross' | 'meta' | 'tiktok' | 'linkedin' | 'pinterest' | 'twitter' | 'snapchat';

export interface CheckReference {
  label: string;
  url: string;
}

export interface GTMTagListMockSpec {
  kind: 'gtm-tag-list';
  caption?: string;
  containerLabel?: string;
  rows: Array<{
    name: string;
    type: string;
    firing: string;
    highlight?: 'critical' | 'warning' | 'info' | 'pass';
    note?: string;
  }>;
}

export interface GTMTriggerListMockSpec {
  kind: 'gtm-trigger-list';
  caption?: string;
  containerLabel?: string;
  rows: Array<{
    name: string;
    type: string;
    fires: string;
    highlight?: 'critical' | 'warning' | 'info' | 'pass';
    note?: string;
  }>;
}

export type CheckMockupSpec = GTMTagListMockSpec | GTMTriggerListMockSpec;

export interface CheckExplainer {
  id: string;
  name: string;
  source: ExplainerSource;
  severity: 'critical' | 'warning' | 'info';
  summary: string;
  why: string;
  howToFix: string;
  example?: string;
  relatedChecks?: string[];
  // v1.25 editorial fields. Optional so existing entries stay valid;
  // a stub explainer is generated for IDs missing the full treatment.
  directAnswer?: string;
  citationTemplate?: string;
  references?: CheckReference[];
  lastUpdated?: string;
  status?: 'full' | 'stub';
  whyMockup?: CheckMockupSpec;
  fixMockup?: CheckMockupSpec;
}

export const explainerSources: { key: ExplainerSource; label: string }[] = [
  { key: 'gtm', label: 'Google Tag Manager' },
  { key: 'ads', label: 'Google Ads' },
  { key: 'report', label: 'Performance Reports' },
  { key: 'cross', label: 'Cross-Source' },
  { key: 'meta', label: 'Meta Pixel' },
  { key: 'tiktok', label: 'TikTok Pixel' },
  { key: 'linkedin', label: 'LinkedIn Insight Tag' },
  { key: 'pinterest', label: 'Pinterest Tag' },
  { key: 'twitter', label: 'Twitter/X Pixel' },
  { key: 'snapchat', label: 'Snapchat Pixel' },
];

export const explainers: CheckExplainer[] = [
  {
    id: 'missing-conversion-linker',
    name: 'Missing Google Ads Conversion Linker',
    source: 'gtm',
    severity: 'critical',
    summary: 'The GTM container does not have a Google Ads Conversion Linker firing on the site.',
    directAnswer:
      'The Conversion Linker is a GTM tag that captures Google Ads click identifiers (GCLID and friends) and writes them to a first-party cookie so later conversion tags can attribute the sale back to the ad click. If it is missing, every Google Ads conversion the site reports is at risk of being credited to the wrong source — or not credited at all.',
    why: 'When a user clicks a Google Ads ad, Google appends a GCLID parameter to the landing-page URL. Conversion tags fired hours or days later need that GCLID to tie the conversion back to the ad. The Conversion Linker is the tag that reads the GCLID from the URL once and stores it in a first-party _gcl_aw cookie. Without it, downstream Google Ads conversion tags fall back to last-touch attribution inside Google\'s ecosystem — meaning conversions get assigned to the wrong campaign, ROAS reports lie, and Smart Bidding optimizes against noise. The damage is silent: tags still fire, dashboards still populate, but the signal feeding bidding is corrupted. Underreported conversions usually push budget toward campaigns that are easy to attribute (branded search, remarketing) and away from upper-funnel campaigns that actually drove the click.',
    howToFix:
      '1. In Google Tag Manager, click "New Tag" and choose the "Google Ads Conversion Linker" tag type. 2. Set the trigger to "All Pages." 3. If your funnel spans multiple domains (e.g. checkout on a separate Shopify or payment domain), open the Linker Settings and enable auto-link domains across every domain in the funnel. 4. Enter Preview mode, load any page on the site, and confirm the tag fires on every navigation. 5. Publish the workspace. After deploy, run an AdLint audit again — the finding should clear within one container version.',
    example:
      'Tag type: Google Ads Conversion Linker\nTrigger: All Pages\nCross-domain domains: example.com, checkout.example-payments.com',
    citationTemplate:
      'AdLint detected that the Google Ads Conversion Linker tag is not present in this GTM container. Per Google\'s documentation on the Conversion Linker, conversion tags require the GCLID to be captured into a first-party cookie within the user\'s session for accurate cross-page and cross-domain attribution. Without this tag, downstream Google Ads conversion measurements are at material risk of misattribution and Smart Bidding decisions are made against incomplete signal. Recommended remediation: add the Conversion Linker tag with an "All Pages" trigger and verify cross-domain configuration before re-publishing. Source: support.google.com/tagmanager/answer/7549390.',
    references: [
      {
        label: 'Google Tag Manager — Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
      {
        label: 'Google Ads — About cross-domain measurement',
        url: 'https://support.google.com/google-ads/answer/7521212',
      },
      {
        label: 'Google Ads — GCLID and conversion attribution',
        url: 'https://support.google.com/google-ads/answer/9744275',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    whyMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'A container with Google Ads conversion tags but no Conversion Linker. The conversion tags fire, but downstream attribution relies on a GCLID that was never captured into a first-party cookie — so reported conversions are at risk of misattribution.',
      rows: [
        {
          name: 'GA4 Configuration',
          type: 'GA4 Configuration',
          firing: 'All Pages',
          highlight: 'pass',
        },
        {
          name: 'Google Ads — Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'critical',
          note: 'Fires without an upstream Conversion Linker — GCLID is not captured.',
        },
        {
          name: 'Google Ads — Lead Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'form_submit',
          highlight: 'critical',
          note: 'Same problem — attribution is at risk.',
        },
        {
          name: 'Google Ads — Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'warning',
          note: 'Also benefits from the Conversion Linker for first-party identifiers.',
        },
      ],
    },
    fixMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Fixed: a Conversion Linker tag fires on All Pages, ahead of the conversion tags in the trigger sequence. GCLID is now captured into the _gcl_aw cookie and available to every downstream Google Ads tag.',
      rows: [
        {
          name: 'Google Ads — Conversion Linker',
          type: 'Conversion Linker',
          firing: 'All Pages',
          highlight: 'pass',
          note: 'New tag — captures GCLID into the first-party _gcl_aw cookie.',
        },
        {
          name: 'GA4 Configuration',
          type: 'GA4 Configuration',
          firing: 'All Pages',
          highlight: 'pass',
        },
        {
          name: 'Google Ads — Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'pass',
        },
        {
          name: 'Google Ads — Lead Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'form_submit',
          highlight: 'pass',
        },
      ],
    },
    relatedChecks: ['conversion-linker-sequencing', 'conversion-label-matching'],
  },
  {
    id: 'consent-violations',
    name: 'Google Ads Tags May Fire Without Consent',
    source: 'gtm',
    severity: 'warning',
    summary: 'Google Ads tags may be able to fire before the required consent state is granted.',
    directAnswer:
      'One or more Google Ads tags in the container have no consent settings configured, which means they can fire before the user has granted ad_storage or ad_user_data consent. In regions covered by GDPR, the UK GDPR, or similar regimes, that creates compliance exposure and produces measurement data that should have been blocked or sent in modelled (consent-denied) form.',
    why: 'Google Consent Mode v2 introduced two ad-related consent signals — ad_storage and ad_user_data — that Google Ads tags are expected to respect. When tags have no consent settings, they fire regardless of the user\'s choice, which has three consequences. First, the account ships data from users who declined consent, exposing the advertiser to regulatory risk. Second, Google Ads can no longer rely on its modelling pipeline (which assumes consent-denied hits are tagged as such) to fill the gap, so measurement quality degrades silently. Third, the same tag behaves differently across geographies, browser states, and banner timings, which makes debugging unstable and audit findings non-reproducible. The fix is not the consent banner alone — it is whether the GTM tags read the consent state and honour it.',
    howToFix:
      '1. In GTM, open Admin → Container Settings → Consent and enable "Enable consent overview." This surfaces a per-tag consent column in the Tags list. 2. For each Google Ads Conversion Tracking and Google Ads Remarketing tag, open the tag, expand Consent Settings, and set "Require additional consent for tag to fire" to require `ad_storage` (and `ad_user_data` if the tag uses Enhanced Conversions). 3. Confirm the consent banner sets default consent to denied before any tag loads and updates consent only after the user makes a choice. 4. In Preview mode, walk three paths — denied, granted, and post-banner update — and confirm Ads tags only fire on the granted path. Publish after all three paths behave correctly.',
    example: 'Required consent checks: ad_storage, ad_user_data, ad_personalization\nDefault state before banner choice: denied',
    citationTemplate:
      'AdLint detected one or more Google Ads tags in this GTM container with no Consent Settings configured. Per Google\'s Consent Mode v2 specification, Google Ads conversion and remarketing tags must honour the ad_storage and ad_user_data consent signals before firing. Without explicit Consent Settings on each tag, the container will send ad measurement data regardless of user choice, creating both regulatory exposure (GDPR, UK GDPR, ePrivacy) and degraded measurement modelling. Recommended remediation: configure required additional consent on every Google Ads tag and verify denied/granted/updated paths in Preview before publishing. Source: developers.google.com/tag-platform/security/guides/consent.',
    references: [
      {
        label: 'Google — Consent settings in Google Tag Manager',
        url: 'https://support.google.com/tagmanager/answer/10718549',
      },
      {
        label: 'Google — Consent mode for Google Ads',
        url: 'https://support.google.com/google-ads/answer/14310715',
      },
      {
        label: 'Google Developers — Consent Mode v2 reference',
        url: 'https://developers.google.com/tag-platform/security/guides/consent',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    whyMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Google Ads tags configured with no Consent Settings. Every tag fires on All Pages regardless of the user\'s consent state.',
      rows: [
        {
          name: 'Google Ads — Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'critical',
          note: 'Consent Settings: No additional consent required',
        },
        {
          name: 'Google Ads — Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'critical',
          note: 'Consent Settings: No additional consent required',
        },
        {
          name: 'Google Ads — Sign-Up Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'signup_complete',
          highlight: 'critical',
          note: 'Consent Settings: No additional consent required',
        },
      ],
    },
    fixMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Fixed: every Google Ads tag now requires `ad_storage` consent. Tags only fire after the consent banner records a granted state.',
      rows: [
        {
          name: 'Google Ads — Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'pass',
          note: 'Requires: ad_storage, ad_user_data',
        },
        {
          name: 'Google Ads — Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'pass',
          note: 'Requires: ad_storage',
        },
        {
          name: 'Google Ads — Sign-Up Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'signup_complete',
          highlight: 'pass',
          note: 'Requires: ad_storage, ad_user_data',
        },
      ],
    },
    relatedChecks: ['missing-conversion-linker', 'conversion-label-matching'],
  },
  {
    id: 'duplicate-conversions',
    name: 'Duplicate Conversion Tracking',
    source: 'cross',
    severity: 'critical',
    summary: 'Duplicate conversion tags or conversion actions can double-count the same business event.',
    why: 'This ID is emitted by both GTM duplicate tag checks and Google Ads duplicate conversion action checks. Either failure can inflate conversion volume, conversion value, and Smart Bidding signals. The advertiser sees better-looking CPA or ROAS than reality, while bidding algorithms learn from repeated copies of the same event.',
    howToFix: 'In GTM, compare Google Ads conversion tags by conversion ID, conversion label, and trigger; remove duplicates or narrow triggers so one business event fires one tag. In Google Ads, consolidate duplicate conversion actions, keep the canonical action Primary, and mark test or backup actions Secondary or remove them. Re-run the audit after one full conversion cycle to confirm counts return to expected levels.',
    example: 'Duplicate pattern: two Ads conversion tags with the same AW-123456789 / abcDEF_label firing on purchase_success',
    relatedChecks: ['volume-weighted-duplicates', 'conversion-label-matching', 'tag-count-mismatch'],
  },
  {
    id: 'ecommerce-datalayer-structure',
    name: 'E-commerce Data Layer Structure',
    source: 'gtm',
    severity: 'critical',
    summary: 'The dataLayer does not expose purchase and item data in a reliable e-commerce shape.',
    directAnswer:
      'Conversion and analytics tags need a predictable dataLayer object on purchase events — at minimum `transaction_id`, `value`, `currency`, and an `items` array. When that shape is missing or inconsistent, downstream Google Ads, GA4, and pixel tags fall back to zero values or empty item data, which silently corrupts ROAS reporting and value-based bidding.',
    why: 'Google Analytics 4, Google Ads conversion tracking, Meta CAPI, TikTok Events, and most server-side pipelines all read from the same dataLayer object — they each subscribe to specific keys inside an `ecommerce` block. The GA4 recommended events specification defines the canonical structure: an event name like `purchase`, plus a nested `ecommerce` object containing `transaction_id`, `value`, `currency`, and an `items` array of `{ item_id, item_name, price, quantity }` rows. When implementations deviate — values at the top level instead of inside `ecommerce`, missing `currency`, missing `items` array, or different shapes per page template — tags silently degrade. They fire (so the conversion is counted) but the value is zero or undefined (so Smart Bidding learns from noise, ROAS dashboards lie, and remarketing audiences fail to scope by product). This is one of the highest-impact tracking failures because it is invisible until someone asks "why does our reported ROAS not match the e-commerce backend?"',
    howToFix:
      '1. Open the site\'s server-rendered HTML or front-end framework and locate the script tag (or component) that pushes the purchase event. 2. Replace any custom shape with the GA4 recommended structure: `dataLayer.push({ event: "purchase", ecommerce: { transaction_id, value, currency, items: [...] } })`. 3. Make sure the push happens before any GTM tag could read from the dataLayer for that event — typically immediately on order-confirmation page render, before the GA4 Configuration tag fires. 4. In GTM Preview, complete a real test purchase and confirm every variable used by conversion tags resolves to a non-empty value at the `purchase` event step. 5. Repeat for refund and partial-cancellation paths if the site supports them. The check clears after one container publish and one verified test purchase.',
    example:
      "dataLayer.push({\n  event: 'purchase',\n  ecommerce: {\n    transaction_id: 'T-12345',\n    value: 129.99,\n    currency: 'USD',\n    items: [\n      { item_id: 'SKU-1', item_name: 'Walking Shoes', price: 129.99, quantity: 1 }\n    ]\n  }\n});",
    citationTemplate:
      'AdLint detected that this GTM container expects a purchase dataLayer event but the recommended e-commerce shape is incomplete or inconsistent. Per Google\'s GA4 recommended events specification, conversion tags require a `purchase` event with a nested `ecommerce` object containing `transaction_id`, `value`, `currency`, and an `items` array. Without this structure, downstream Google Ads conversion value, GA4 e-commerce reports, and remarketing audiences are at material risk of silent data loss. Recommended remediation: standardise the purchase event payload before any GTM tag fires and verify in Preview. Source: developers.google.com/analytics/devguides/collection/ga4/ecommerce.',
    references: [
      {
        label: 'Google Analytics 4 — Measure ecommerce',
        url: 'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce',
      },
      {
        label: 'GA4 — Recommended events for e-commerce',
        url: 'https://support.google.com/analytics/answer/9612232',
      },
      {
        label: 'Google Tag Manager — Data Layer reference',
        url: 'https://developers.google.com/tag-platform/tag-manager/datalayer',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-datalayer-variables', 'zero-value-purchases', 'value-mismatch'],
  },
  {
    id: 'missing-datalayer-variables',
    name: 'Missing Data Layer Variables',
    source: 'gtm',
    severity: 'warning',
    summary: 'GTM tags reference dataLayer values that are missing or not configured as variables.',
    directAnswer:
      'Conversion tags in this container reference fields that are not exposed as GTM Data Layer Variables — typically `ecommerce.value`, `ecommerce.currency`, or `ecommerce.transaction_id`. The tags still fire on the right trigger, but the fields they read resolve to empty, which means the conversion is reported with no value. The dashboard shows a count; the bidding signal is noise.',
    why: 'A GTM tag does not read the dataLayer directly — it reads variables that are bound to dataLayer paths through the User-Defined Variables panel. If a conversion tag references `{{DLV - ecommerce.value}}` but no such Data Layer Variable exists (or the binding is misspelled), GTM evaluates the placeholder to an empty string and ships the conversion with no value field. Google Ads counts this as a valid conversion at zero revenue. Smart Bidding then optimises against the count signal alone, treating a $1,000 order identically to a $10 order. The damage compounds because the failure is silent: nothing in the tag firing or the Preview-mode summary surfaces "this variable resolved to empty." The user finds out months later when reported ROAS diverges from the e-commerce backend by an unexplainable factor.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables. 2. For every field used by a conversion or analytics tag — `ecommerce.value`, `ecommerce.currency`, `ecommerce.transaction_id`, and any user-data field — create a Data Layer Variable with the matching Data Layer Variable Name (case-sensitive, dot-separated path). 3. Set Data Layer Version to Version 2 for any nested ecommerce path. 4. Open each conversion tag and reference the variables via `{{DLV - …}}` syntax instead of literal values. 5. In Preview mode, complete a test conversion and inspect each variable in the Variables tab at the exact event step the tag fires on — every variable should resolve to a non-empty value before publish.',
    example: 'Variable: DLV - ecommerce.value\nData Layer Variable Name: ecommerce.value\nData Layer Version: Version 2\nUsed by: Google Ads purchase conversion value',
    citationTemplate:
      'AdLint detected GTM tags in this container that reference dataLayer fields without corresponding Data Layer Variables. Per Google\'s Tag Manager Data Layer Variable documentation, tags must read dataLayer values through explicitly-configured Data Layer Variables; unresolved references evaluate to empty strings at runtime. The practical effect is that conversion tags fire with no value, currency, or transaction ID, corrupting value-based bidding and revenue reporting. Recommended remediation: create Data Layer Variables for every dataLayer path used by conversion tags and verify resolution in GTM Preview. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager — Variable types (Data Layer Variable)',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
      {
        label: 'Google Tag Manager — Data Layer reference',
        url: 'https://developers.google.com/tag-platform/tag-manager/datalayer',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ecommerce-datalayer-structure', 'dynamic-value-passing'],
  },
  {
    id: 'zero-value-purchases',
    name: 'Purchase Conversions with Zero Value',
    source: 'ads',
    severity: 'critical',
    summary: 'Purchase or sale conversion actions are configured with no revenue value.',
    why: 'Zero-value purchases make revenue reporting and ROAS bidding unusable. Google Ads can still count conversions, but it cannot distinguish a $10 order from a $1,000 order. That pushes optimization toward volume instead of profit and can make high-revenue campaigns look no better than low-revenue ones.',
    howToFix: 'For e-commerce, set the Google Ads conversion action to use different values for each conversion and pass the transaction value from GTM or your site tag. For lead generation, assign realistic lead values if you use value-based bidding, or keep these actions out of ROAS workflows. Verify that recent conversions show non-zero conversion value in Google Ads reports.',
    example: 'Google Ads conversion value setting: Use different values for each conversion\nGTM value parameter: {{DLV - ecommerce.value}}',
    relatedChecks: ['roas-feasibility', 'roas-sanity', 'value-mismatch'],
  },
  {
    id: 'missing-primary-conversion',
    name: 'Missing Primary Conversion',
    source: 'ads',
    severity: 'warning',
    summary: 'Google Ads has no enabled purchase or sale conversion action suitable as the primary bidding goal.',
    why: 'Smart Bidding optimizes toward Primary conversions. If the actual business outcome is missing, disabled, or treated as Secondary, campaigns may optimize toward weaker actions such as page views, signups, or add-to-cart events. The account can look active while bidding is pointed at the wrong goal.',
    howToFix: 'In Google Ads, choose the main business outcome and mark it Primary in the conversion goal settings. Keep diagnostic, micro, and imported backup actions as Secondary unless they should directly influence bidding. Confirm campaign goals include the selected primary action and exclude unrelated account-default goals.',
    example: 'Primary: Purchase\nSecondary: Add to cart, Begin checkout, Newsletter signup',
    relatedChecks: ['micro-conversion-pollution', 'smart-bidding-volume'],
  },
  {
    id: 'smart-bidding-volume',
    name: 'Smart Bidding Readiness',
    source: 'ads',
    severity: 'warning',
    summary: 'The account may not have enough enabled primary conversion volume for stable Smart Bidding.',
    why: 'Smart Bidding needs enough recent, consistent conversion signal to learn. Very low volume or no primary conversions forces the model to optimize from sparse data, delayed feedback, or secondary goals. That can create volatile CPA, slow learning periods, and budget movement based on noise.',
    howToFix: 'Check the last 30 days of conversion volume for each primary action used by campaigns. Use Maximize Conversions or tCPA only when the primary action has enough regular volume, and avoid splitting the same event across many duplicate actions. If volume is low, consolidate goals or start with a broader but still meaningful conversion until the macro event has enough data.',
    example: 'Healthy target: 15-30+ primary conversions per month per bidding portfolio before aggressive tCPA or tROAS constraints',
    relatedChecks: ['missing-primary-conversion', 'micro-conversion-pollution'],
  },
  {
    id: 'short-attribution-windows',
    name: 'Attribution Window Too Short',
    source: 'ads',
    severity: 'warning',
    summary: 'Conversion click windows are shorter than the likely sales cycle.',
    why: 'A window that is too short drops legitimate conversions that happen days or weeks after the click. This underreports campaigns with longer consideration cycles and makes upper-funnel or remarketing traffic look weaker than it is. Bidding then learns from incomplete feedback and can over-favor immediate converters.',
    howToFix: 'Compare the click-through conversion window to the actual time from ad click to purchase or lead. In Google Ads conversion settings, extend the window for conversions with medium or long sales cycles, commonly to 14, 30, or 60 days depending on the business. Keep short windows only when purchases are genuinely immediate.',
    example: 'Problem: B2B demo request uses a 3-day click window while the median click-to-lead delay is 12 days',
    relatedChecks: ['model-attribution-drift', 'long-attribution-windows'],
  },
  {
    id: 'vtc-click-ratio',
    name: 'Greedy Impression Index',
    source: 'report',
    severity: 'warning',
    summary: 'View-through conversions are more than 3x click-driven conversions for one or more actions.',
    why: 'A high view-through to click ratio can make display, video, or remarketing campaigns appear to drive more incremental performance than they really do. View-through conversions are impression-based, so long windows can claim credit for users who would have converted anyway. The advertiser may overfund prospecting or remarketing that is mostly harvesting post-impression credit.',
    howToFix: 'Review the view-through conversion window for flagged actions in Google Ads. Shorten the VTC window, separate VTC-heavy actions from bidding decisions, and compare performance using click conversions or experiments. For high-stakes budget decisions, evaluate incrementality instead of treating VTC and click conversions as equivalent.',
    example: 'Conversions: 40 total\nView-through conversions: 32\nClick conversions: 8\nVTC/click ratio: 4.0x',
    relatedChecks: ['model-attribution-drift', 'roas-sanity'],
  },
  {
    id: 'roas-sanity',
    name: 'ROAS Sanity',
    source: 'report',
    severity: 'warning',
    summary: 'Reported ROAS is suspiciously high or low for conversion actions with meaningful volume.',
    why: 'Extreme ROAS values usually mean the value pipeline is broken, not that performance is extraordinary. Common causes include currency mismatches, cents passed as dollars, fixed values on dynamic revenue, or missing value pass-through. If ignored, budget and bidding decisions are made from fake profitability.',
    howToFix: 'Audit the flagged conversion actions from report row back to Google Ads settings and the GTM value parameter. Confirm value units, currency, and whether the value is dynamic or fixed. Compare a sample order total in your backend with the value recorded in Google Ads for the same time window.',
    example: 'Suspicious: 26 purchases, conversion value / cost = 87.4x\nLikely issue: value is passed in cents or duplicated',
    relatedChecks: ['zero-value-purchases', 'value-mismatch', 'roas-feasibility'],
  },
  {
    id: 'ghost-conversions',
    name: 'Ghost Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'Enabled Google Ads conversion actions have no matching volume in the performance report.',
    why: 'A conversion can be enabled and still be effectively dead. Broken tags, wrong triggers, renamed actions, or label mismatches leave Google Ads bidding toward actions that produce no signal. This is especially dangerous when the action is Primary because campaigns may enter learning with missing feedback.',
    howToFix: 'For each ghost action, check whether the Google Ads conversion label exists in GTM or the site tag and whether the trigger still fires. Use Tag Assistant, GTM Preview, and a real test conversion to verify the hit reaches Google Ads. Disable stale actions or mark them Secondary if they are intentionally retained for history.',
    example: 'Settings: Purchase - Primary - Enabled\nReport: Purchase has 0 conversions across the selected period',
    relatedChecks: ['conversion-label-matching', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'micro-conversion-pollution',
    name: 'Signal Pollution',
    source: 'report',
    severity: 'warning',
    summary: 'Micro-conversion volume is more than 100x macro-conversion volume.',
    why: 'When page views, signups, or other lightweight events dominate the conversion set, Smart Bidding can learn to chase easy actions instead of revenue or qualified leads. The account may show rising conversion volume while pipeline or sales do not improve. Analysts also lose a clear read on whether campaigns are moving real business outcomes.',
    howToFix: 'Mark micro-conversions as Secondary unless they are intentionally used for bidding. Keep the primary goal set focused on purchases, qualified leads, or another downstream action. If you need micro events for learning, isolate them in separate experiments or campaigns instead of mixing them with macro goals.',
    example: 'Macro purchases: 42\nMicro signups/page events: 7,800\nMicro/macro ratio: 185x',
    relatedChecks: ['missing-primary-conversion', 'smart-bidding-volume'],
  },
  {
    id: 'model-attribution-drift',
    name: 'Attribution Drift',
    source: 'report',
    severity: 'info',
    summary: 'Model-attributed conversions differ sharply from standard conversion counts.',
    why: 'Large drift means the selected attribution model is redistributing credit enough to change optimization and reporting conclusions. That can be valid, but it needs to be intentional and understood by the team. Otherwise finance, media buyers, and analytics will argue from different numbers for the same conversion action.',
    howToFix: 'Compare the conversion action attribution model, reporting columns, and business sales cycle. If drift is expected, document which column is used for budget decisions and why. If it is not expected, standardize attribution models across similar actions and inspect whether view-through or cross-device conversions are driving the gap.',
    example: 'Standard conversions: 120\nCurrent model attributed conversions: 43\nDrift: 64%',
    relatedChecks: ['vtc-click-ratio', 'short-attribution-windows'],
  },
  {
    id: 'volume-weighted-duplicates',
    name: 'Active Duplicate Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'Similar conversion names both have active volume, which suggests live double-counting.',
    why: 'Settings duplicates are risky, but active duplicates prove the problem is affecting reports now. Similar actions with volume can represent the same event firing under two names, a renamed conversion that still receives traffic, or an import plus tag pair counting together. This inflates totals and trains bidding on duplicated outcomes.',
    howToFix: 'Compare the flagged pairs by name, source, category, and recent timestamps. Keep one canonical conversion action, merge reporting expectations around it, and mark the duplicate Secondary or remove its tag/import. After changing it, watch both conversion count and conversion value for the next reporting period.',
    example: 'Purchase - Website: 312 conversions\nPurchase Website: 298 conversions\nLikely same event counted twice',
    relatedChecks: ['duplicate-conversions', 'conversion-label-matching'],
  },
  {
    id: 'ads-conversion-missing-gtm-tag',
    name: 'Ads Conversion Missing GTM Tag',
    source: 'cross',
    severity: 'critical',
    summary: 'An enabled Google Ads conversion action has no corresponding conversion tag in GTM.',
    why: 'Google Ads can list an action as enabled even when the site never sends it. If the matching GTM tag is absent, renamed, or never deployed, conversion volume will be zero or incomplete. Primary actions in this state give Smart Bidding no usable feedback.',
    howToFix: 'Match every enabled Google Ads conversion action to a GTM Google Ads conversion tag or a deliberate non-GTM source such as an offline import. For GTM-managed actions, verify conversion ID, label, trigger, and publication status. Disable or mark Secondary any actions that are no longer supposed to receive traffic.',
    example: 'Google Ads: Lead Submit enabled\nGTM: no AW conversion tag or tag name containing Lead Submit',
    relatedChecks: ['ghost-conversions', 'conversion-label-matching'],
  },
  {
    id: 'mismatched-values',
    name: 'Value Mismatch',
    source: 'cross',
    severity: 'critical',
    summary: 'GTM conversion values do not match the values configured or expected in Google Ads.',
    why: 'Value mismatches make revenue reports unreliable even when conversion counts look correct. A fixed GTM value can override dynamic purchase revenue, or Google Ads settings can imply a different value strategy than the tag actually sends. This corrupts ROAS, value-based bidding, and finance reconciliation.',
    howToFix: 'Trace the value from the site dataLayer into the GTM tag and then into Google Ads. If the business uses dynamic revenue, the GTM value parameter should reference a transaction value variable and Google Ads should accept transaction-specific values. If fixed values are intentional, document the model and make sure every platform uses the same assumptions.',
    example: 'GTM value parameter: 1\nGoogle Ads purchase value: 129.99\nExpected: {{DLV - ecommerce.value}}',
    relatedChecks: ['zero-value-purchases', 'roas-sanity'],
  },
  {
    id: 'conversion-label-matching',
    name: 'Conversion ID and Label Matching',
    source: 'cross',
    severity: 'critical',
    summary: 'GTM conversion IDs or labels may not match the intended Google Ads conversion actions.',
    why: 'The conversion ID and label determine which Google Ads action receives the hit. If either value is wrong, the tag can fire successfully while credit lands in the wrong action or nowhere useful. This creates ghost conversions, orphaned actions, and bidding signals attached to the wrong goal.',
    howToFix: 'Open the Google Ads conversion action and copy the AW conversion ID and conversion label directly into the GTM tag. Avoid variable labels unless you have a controlled lookup table and tests for every output. Preview a test conversion and confirm the fired request contains the expected send_to value.',
    example: 'Expected send_to: AW-123456789/AbCdEfGhIjk\nGTM tag sends: AW-123456789/{{Conversion Label}}',
    relatedChecks: ['ghost-conversions', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'meta-missing-pageview',
    name: 'Missing Meta PageView Event',
    source: 'meta',
    severity: 'critical',
    summary: 'The Meta Pixel export does not show an active PageView event.',
    why: 'PageView is the base signal for Meta website audiences, diagnostics, and much of the event funnel context. Without it, remarketing audiences are incomplete and downstream events are harder to validate against site traffic. Campaign optimization can also suffer because Meta sees isolated conversions without the normal browsing path.',
    howToFix: 'Install the Meta base pixel on every page, either directly, through GTM, or through your platform integration. Confirm fbq("track", "PageView") fires once per page load and is not blocked by consent rules after consent is granted. Use Meta Events Manager Test Events to verify active traffic.',
    example: "fbq('init', '1234567890');\nfbq('track', 'PageView');",
    relatedChecks: ['meta-missing-conversion-events', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-missing-conversion-events',
    name: 'Missing Meta Conversion Events',
    source: 'meta',
    severity: 'critical',
    summary: 'No active standard Meta conversion event such as Purchase or Lead is present.',
    why: 'Meta campaigns need standard conversion events to optimize for business outcomes. If only PageView or custom diagnostic events exist, campaigns may optimize for traffic instead of purchases or leads. Advertisers lose audience quality, conversion reporting, and stable event matching for downstream actions.',
    howToFix: 'Configure the appropriate standard event for the business model: Purchase for e-commerce, Lead or CompleteRegistration for lead generation, and Subscribe or SubmitApplication where relevant. Fire the event on the final confirmation step, not on button click unless the action is guaranteed. Validate the event in Events Manager and confirm it has recent volume.',
    example: "fbq('track', 'Purchase', { value: 129.99, currency: 'USD' });",
    relatedChecks: ['meta-purchase-missing-value', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-purchase-missing-value',
    name: 'Meta Purchase Missing Value',
    source: 'meta',
    severity: 'critical',
    summary: 'Meta Purchase events are firing without usable value data.',
    why: 'Purchase count alone is not enough for value optimization or reliable ROAS reporting. Without value and currency, Meta cannot distinguish order sizes or optimize toward higher-value customers. The result is volume-biased optimization and a weak comparison against Google Ads or backend revenue.',
    howToFix: 'Pass dynamic value and currency parameters with every Meta Purchase event. Pull the value from the order confirmation data, not from a hardcoded tag setting. Check Events Manager diagnostics for missing parameters and compare a few recent orders to reported purchase values.',
    example: "fbq('track', 'Purchase', { value: order.total, currency: 'USD', content_ids: order.skus });",
    relatedChecks: ['meta-missing-conversion-events', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-ecommerce-funnel',
    name: 'Meta E-commerce Funnel Events',
    source: 'meta',
    severity: 'warning',
    summary: 'Expected Meta e-commerce funnel events are missing or inactive.',
    why: 'ViewContent, AddToCart, InitiateCheckout, and Purchase give Meta a complete picture of shopping intent. Missing mid-funnel events reduce audience building, funnel diagnostics, and optimization context. Teams then cannot tell whether a campaign fails at product view, cart, checkout, or purchase.',
    howToFix: 'Implement the standard Meta funnel events on their matching site actions and keep event names exactly aligned with Meta standards. Include content IDs and value where available, especially on AddToCart and Purchase. Test the funnel in Events Manager from product page through order confirmation.',
    example: 'Expected events: PageView -> ViewContent -> AddToCart -> InitiateCheckout -> Purchase',
    relatedChecks: ['meta-missing-pageview', 'meta-purchase-missing-value'],
  },
  {
    id: 'tiktok-base-events-active',
    name: 'TikTok Base Events Active',
    source: 'tiktok',
    severity: 'critical',
    summary: 'The TikTok Pixel export has no active events with recorded volume.',
    why: 'No active event volume usually means the base pixel is missing, blocked, disabled, or not receiving traffic. TikTok cannot build audiences, optimize campaigns, or diagnose conversion delivery without a working event stream. Any performance data from this setup is incomplete at best.',
    howToFix: 'Verify the TikTok Pixel base code or GTM template is installed on every page that should be tracked. Check consent behavior, trigger rules, and browser blockers, then use TikTok Events Manager diagnostics or Pixel Helper to confirm live events. Do not launch conversion-optimized campaigns until events are active.',
    example: 'Expected: Page browsing generates ViewContent or ClickButton volume in Events Manager within the test window',
    relatedChecks: ['tiktok-ecommerce-funnel', 'tiktok-completepayment-missing-value'],
  },
  {
    id: 'tiktok-completepayment-missing-value',
    name: 'TikTok CompletePayment Missing Value',
    source: 'tiktok',
    severity: 'critical',
    summary: 'TikTok CompletePayment events are firing without value data.',
    why: "CompletePayment is TikTok's key e-commerce revenue event. If it fires without value and currency, TikTok can count orders but cannot optimize toward order value or report ROAS accurately. This makes high-value and low-value purchases look equivalent to the bidding system.",
    howToFix: 'Pass dynamic value and currency properties with every CompletePayment event. Source the value from the confirmed order total and make sure discounts, taxes, and shipping are handled consistently with your reporting standard. Validate the payload in TikTok Events Manager after a test purchase.',
    example: "ttq.track('CompletePayment', { value: 129.99, currency: 'USD', contents: [{ content_id: 'SKU-1', quantity: 1 }] });",
    relatedChecks: ['tiktok-base-events-active', 'tiktok-ecommerce-funnel'],
  },
  {
    id: 'tiktok-ecommerce-funnel',
    name: 'TikTok E-commerce Funnel Events',
    source: 'tiktok',
    severity: 'warning',
    summary: 'TikTok standard e-commerce funnel events are missing or incomplete.',
    why: 'TikTok needs ViewContent, AddToCart, InitiateCheckout, and CompletePayment to understand where users drop out. Missing funnel events weaken retargeting pools and make optimization depend on a single end event. That is especially fragile for lower-volume stores or campaigns still learning.',
    howToFix: 'Install TikTok standard events at each real funnel step and keep the event names exactly as TikTok expects. Include product IDs, quantities, value, and currency where available. Test product view, cart, checkout, and purchase in Events Manager before trusting campaign optimization.',
    example: 'Expected events: ViewContent -> AddToCart -> InitiateCheckout -> CompletePayment',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-completepayment-missing-value'],
  },
  {
    id: 'linkedin-other-category-overuse',
    name: 'LinkedIn Other Category Overuse',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Too many LinkedIn conversion actions are categorized as Other.',
    why: 'Other is valid in LinkedIn, but it is often used as a catch-all when the action is really Lead, SignUp, Download, KeyPageView, or Purchase. That makes conversion reporting harder to read and weakens the account structure for optimization reviews. Engineers lose the ability to tell which actions represent real funnel stages from the export alone.',
    howToFix: 'Open each Other conversion action in LinkedIn Campaign Manager and map it to the closest standard category. Use Lead for form submits or qualified inquiries, SignUp for account creation, Download for gated assets, KeyPageView for intentionally valuable pages, and Purchase for revenue events. Keep Other only for actions that truly do not fit the standard set.',
    example: 'Problem: Demo Request categorized as Other\nBetter: Demo Request categorized as Lead',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-disabled-key-conversions'],
  },
  {
    id: 'linkedin-unattached-conversions',
    name: 'LinkedIn Unattached Conversions',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Active LinkedIn conversion actions are not attached to any campaign.',
    why: 'A LinkedIn conversion can be active and still be dormant for campaign measurement if no campaigns use it. The tag may fire, the export may show the action, but campaign reporting and optimization will not benefit from it. This is a LinkedIn-specific failure mode because campaign attachment is part of making a conversion action operational.',
    howToFix: 'For each active unattached conversion, decide whether it should be used for reporting or retired. Attach the active business outcomes to the relevant campaigns in Campaign Manager, especially Lead, SignUp, Purchase, and high-intent KeyPageView actions. Disable stale conversions that are kept only as historical artifacts.',
    example: 'Active conversion: Book Demo\nCampaign attachments: 0\nFix: attach Book Demo to the demand-gen campaigns that should optimize for it',
    relatedChecks: ['linkedin-no-active-conversions', 'linkedin-zero-volume-conversions'],
  },
  {
    id: 'linkedin-conversion-window-too-short',
    name: 'LinkedIn Conversion Window Too Short',
    source: 'linkedin',
    severity: 'warning',
    summary: 'LinkedIn conversion windows are shorter than 7 days.',
    why: 'LinkedIn traffic is often B2B or considered purchase traffic. A 3-day or 5-day window can cut off legitimate leads that convert after research, stakeholder review, or a follow-up visit. The tag can be technically correct while campaign reporting undercounts the channels that started the deal.',
    howToFix: 'Compare each conversion action window to the real delay between click and conversion. For B2B lead generation or SaaS, use a wider window such as 30 days post-click unless the business truly converts immediately. Keep short windows only for immediate actions where delayed attribution would be misleading.',
    example: 'Problem: Demo Request uses a 3-day post-click window\nBetter: 30 days post-click for a medium B2B sales cycle',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-unattached-conversions'],
  },
  {
    id: 'conversion-linker-sequencing',
    name: 'Conversion Linker Sequencing',
    source: 'gtm',
    severity: 'critical',
    summary: 'Google Ads conversion tags are not explicitly sequenced to wait for the Conversion Linker tag.',
    directAnswer:
      'The Conversion Linker is in the container, but it is not configured as a setup tag for the Google Ads conversion tags. On a normal page load the linker fires first and the conversion tag picks up the GCLID — but on slower loads, redirect-heavy checkout flows, or consent transitions the order can flip. When that happens, the conversion is sent before the GCLID has been captured, and attribution silently fails for a subset of users.',
    why: 'Adding the Conversion Linker tag is necessary but not sufficient. GTM has no implicit ordering guarantee between two tags that share the same trigger — they fire in whatever order the runtime decides, which can vary based on resource loading, consent state, and page lifecycle events. The Conversion Linker writes the GCLID to the first-party `_gcl_aw` cookie; the conversion tag reads from that cookie. If the conversion tag wins the race, the cookie is empty and the conversion is reported without click context. The failure is intermittent and easy to miss: in Preview mode on a fast dev machine the ordering looks fine, but real users on slower devices, behind privacy proxies, or who navigate through a consent banner mid-load lose attribution silently. The fix is to explicitly declare the Conversion Linker as a setup tag using GTM\'s Tag Sequencing feature, which guarantees ordering on every fire.',
    howToFix:
      '1. In GTM, open Workspace → Tags → the first Google Ads Conversion Tracking tag (e.g. "Google Ads — Purchase"). 2. Expand Advanced Settings → Tag Sequencing. 3. Tick "Fire a tag before [this tag] fires" and select the Google Ads Conversion Linker as the setup tag. 4. Leave "Don\'t fire [this tag] if [setup tag] fails or is paused" unchecked unless your team has a specific reason to suppress conversions when the linker is unavailable. 5. Repeat for every Google Ads Conversion Tracking tag in the container. 6. In Preview mode, complete a test conversion and verify in the Tags Fired panel that the Conversion Linker tag fires immediately before each conversion tag on the same event. Publish only after the sequencing is visible in Preview, not just inferred from the configuration screen.',
    example: 'Setup tag: Google Ads Conversion Linker\nConversion tag: Google Ads - Purchase\nTag sequencing: Fire setup tag before Google Ads - Purchase fires',
    citationTemplate:
      'AdLint detected Google Ads conversion tags in this container that share a trigger with the Conversion Linker but do not declare it as a setup tag. Per Google\'s Tag Sequencing documentation, GTM does not guarantee execution order between tags sharing a trigger; explicit sequencing is required when one tag depends on the side effects of another. Without tag sequencing, conversions can be reported before the GCLID is captured, producing intermittent attribution loss that is invisible in dashboards. Recommended remediation: configure each Google Ads conversion tag\'s Tag Sequencing to require the Conversion Linker as a setup tag. Source: support.google.com/tagmanager/answer/6238868.',
    references: [
      {
        label: 'Google Tag Manager — Tag sequencing',
        url: 'https://support.google.com/tagmanager/answer/6238868',
      },
      {
        label: 'Google Tag Manager — Conversion Linker',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-conversion-linker', 'conversion-label-matching', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'attribution-window-mismatch',
    name: 'Attribution Window vs Sales Cycle Mismatch',
    source: 'ads',
    severity: 'warning',
    summary: 'Enabled conversion actions use click-through windows that do not match the selected sales cycle context.',
    why: 'Google Ads uses the conversion window to decide how long after an ad interaction a conversion can still be attributed to that interaction. A short window on a long-consideration purchase drops legitimate conversions before they can be reported, which makes upper-funnel and remarketing campaigns look weaker than they are. A long window on an immediate purchase can pull in delayed activity that is less likely to be caused by the click. Either mismatch changes the conversion data used by automated bidding and makes period-over-period reporting harder to defend.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions, then select each flagged conversion action. Edit the click-through conversion window to match the real buying cycle: short direct-response actions often fit 7 to 14 days, medium cycles often need 30 days, and long B2B or considered purchases may need 60 to 90 days. Keep related conversion actions on comparable windows so campaign and goal reporting do not mix incompatible assumptions. After the change, annotate the date and review conversion lag before judging performance.',
    example: 'Problem: Demo Request uses a 7-day click window with a long sales cycle\nBetter: Demo Request click-through conversion window = 60 days',
    relatedChecks: ['short-attribution-windows', 'model-attribution-drift', 'smart-bidding-volume'],
  },
  {
    id: 'cross-domain-tracking',
    name: 'Cross-Domain Tracking Misconfigured',
    source: 'gtm',
    severity: 'warning',
    summary: 'The container references multiple domains, but the Conversion Linker is not configured with auto-link domains.',
    directAnswer:
      'This container has a Conversion Linker tag, but its auto-link domains list does not cover every domain in the conversion funnel. When a user clicks from the marketing site to a separately-hosted checkout, booking engine, or payment processor, Google Ads cannot connect the conversion back to the ad click — the GCLID lives in a cookie scoped to one domain and never reaches the other.',
    why: 'Many real funnels span domains: a Shopify store with a `shop.brand.com` checkout, a SaaS marketing site with a `app.brand.com` signup flow, a hotel website with a `book.brand-reservations.com` engine, a charity with a `donate.thirdparty.org` form. The GCLID is stored in the `_gcl_aw` first-party cookie on the original domain. Without auto-link configuration, that cookie does not follow the user to the second domain — the browser\'s same-origin policy prevents it. The Conversion Linker tag accepts a list of domains it should auto-decorate outbound links with the linker parameter (`_gl=...`); the receiving domain reads that parameter and re-establishes the `_gcl_aw` cookie there. If the funnel crosses a domain not in the list, the GCLID is lost, the conversion is attributed to a different source or direct, and Smart Bidding learns from a degraded signal. The check fires when AdLint sees container hostnames that suggest a multi-domain funnel but the linker domain list is empty or too narrow.',
    howToFix:
      '1. List every domain that can appear in the conversion funnel, including payment processors, booking engines, partner platforms, and any subdomain that hosts forms or checkout. 2. In GTM, open Workspace → Tags → the Conversion Linker tag → Linker Settings. 3. Enable "Automatically link domains" and paste the comma-separated list of all funnel domains. 4. Confirm the Conversion Linker still fires on All Pages so outbound links from any page get auto-decorated. 5. In Preview mode, start on the source domain, click a link to the destination domain, and inspect the URL — it should contain a `_gl=` parameter. 6. Open Application → Cookies in DevTools on the destination domain and verify `_gcl_aw` is set. Publish only after the round-trip works on the real navigation path, not a direct page load.',
    example: 'Auto-link domains: example.com, checkout.example-payments.com, booking.example.net\nTrigger: All Pages',
    citationTemplate:
      'AdLint detected that this GTM container\'s Conversion Linker is not configured with the auto-link domain list required for the multi-domain funnel observed in the configuration. Per Google\'s cross-domain measurement documentation, the GCLID must be propagated across domains via the linker parameter to maintain attribution. Without this configuration, conversions on hosted checkout, booking, or payment domains will not be attributed to the originating ad click, degrading Google Ads ROAS reporting and Smart Bidding signal. Recommended remediation: add every funnel domain to the Conversion Linker auto-link list and verify the round-trip in Preview mode. Source: support.google.com/google-ads/answer/7521212.',
    references: [
      {
        label: 'Google Ads — About cross-domain measurement',
        url: 'https://support.google.com/google-ads/answer/7521212',
      },
      {
        label: 'Google Tag Manager — Conversion Linker',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-conversion-linker', 'conversion-linker-sequencing', 'conversion-label-matching'],
  },
  {
    id: 'currency-consistency',
    name: 'Inconsistent Currency Codes',
    source: 'ads',
    severity: 'critical',
    summary: 'Google Ads conversion actions are reporting values in more than one currency code.',
    why: 'Google conversion tags and imports support currency values, but value-based reporting assumes the account team knows what unit each value represents. Mixing USD, CAD, EUR, or blank currencies inside the same conversion set can make ROAS and conversion value totals impossible to reconcile against the store or CRM. It can also make automated bidding compare revenue signals that are not economically equivalent. This is a critical measurement issue because the conversion count may look fine while the value column is no longer a dependable business metric.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions and inspect the value settings for each flagged action. For GTM-managed website conversions, open GTM -> Workspace -> Tags -> the Google Ads Conversion Tracking tag and set Currency Code to the same ISO code used by the site revenue system, usually through a Data Layer Variable such as ecommerce.currency. For imports, standardize the Conversion Currency column before upload. Re-test one purchase or import row per currency path and confirm Google Ads reports the expected currency code.',
    example: 'Expected currency code: USD\nGTM Currency Code field: {{DLV - ecommerce.currency}}\ndataLayer value: ecommerce.currency = "USD"',
    relatedChecks: ['zero-value-purchases', 'mismatched-values', 'roas-sanity'],
  },
  {
    id: 'debug-tags-in-production',
    name: 'Preview/Debug Tags in Production',
    source: 'gtm',
    severity: 'warning',
    summary: 'Tags with debug, test, preview, staging, or dev names are firing on All Pages in the production container.',
    directAnswer:
      'One or more tags with debug-style names (containing "debug," "test," "preview," "staging," or "dev") are firing on the production All Pages trigger. These tags were almost certainly created during implementation and forgotten. They can ship duplicate conversions, leak implementation details to third-party endpoints, or interfere with real diagnostics.',
    why: 'Debug-named tags are a recognised anti-pattern in GTM operations because they signal a workflow problem: a tag was created to verify something during implementation, the implementation shipped, but the debug tag was never paused or removed. The risk depends on what the tag actually does. A "Debug — GA4 event" tag firing on every production page can duplicate every legitimate GA4 event, doubling reported conversions. A "Test — Custom HTML" tag can leak a development webhook URL or analytics ID to every visitor. A "Staging — Pixel" tag firing in production can pollute remarketing audiences with users who were never meant to be in them. Beyond the direct data risk, debug tags clutter Tag Assistant and Preview mode, making real implementations harder to audit. The check is conservative — it flags by name pattern, not by behaviour — because the name itself is the operational signal that something is unfinished.',
    howToFix:
      '1. In GTM, open Workspace → Tags and use the search box to filter on each of these terms: `debug`, `test`, `preview`, `staging`, `dev`. 2. For each flagged tag, decide one of three actions. (a) If the tag is no longer needed, pause it (clock icon) or delete it. (b) If it is needed for ongoing diagnostics, restrict its trigger so it can never match production users — add a Page Hostname condition like `equals staging.example.com` or a `Debug Mode` condition that only fires in Preview. (c) If it should remain active in production but was misnamed, rename it to remove the debug terminology so future audits do not flag it. 3. Re-run AdLint after publishing to confirm the check has cleared.',
    example: 'Problem: Debug - GA4 event fires on All Pages\nBetter: Debug - GA4 event fires only when Page Hostname equals staging.example.com',
    citationTemplate:
      'AdLint detected GTM tags with debug, test, preview, staging, or dev in their names that are configured to fire on the production All Pages trigger. While the audit cannot determine the runtime behaviour of each tag, the name pattern indicates unfinished implementation work. Per GTM workspace governance best practice, debug tooling should be scoped to non-production environments via hostname conditions, the GTM Environments feature, or a dedicated testing workspace. Recommended remediation: pause, delete, or scope each flagged tag, and re-publish the container. Source: support.google.com/tagmanager/answer/6311518.',
    references: [
      {
        label: 'Google Tag Manager — Use environments',
        url: 'https://support.google.com/tagmanager/answer/6311518',
      },
      {
        label: 'Google Tag Manager — Preview and debug',
        url: 'https://support.google.com/tagmanager/answer/6107056',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['consent-violations', 'duplicate-conversions', 'missing-conversion-linker'],
  },
  {
    id: 'duplicate-datalayer-paths',
    name: 'Duplicate Data Layer Variable Paths',
    source: 'gtm',
    severity: 'warning',
    summary: 'Multiple GTM Data Layer Variables read from the same dataLayer path.',
    directAnswer:
      'This container has multiple GTM Data Layer Variables bound to the same dataLayer path — for example, both `DLV - value` and `DLV - purchase revenue` reading `ecommerce.value`. This is a maintenance hazard: when someone updates one variable\'s version or default value, the other copy continues to feed downstream tags, producing inconsistent behaviour across tags that should be reading the same business value.',
    why: 'GTM lets you create as many Data Layer Variables as you want, and nothing prevents two of them from pointing at the same dataLayer key. In practice this is how containers accrete legacy: one variable created during a 2021 GA4 migration, another created in 2023 when a new dev was unsure whether the first existed, a third created for a new pixel that "needed its own copy." Each variable can have its own Data Layer Version setting, default value, format value, and conversion settings. When they drift — and they always drift — two conversion tags that nominally read the same revenue value resolve it differently. One reports $129.99, another reports the default $0, and the audit becomes a forensic exercise. The check is informational about size but operationally important: every duplicate is a place future engineers will introduce inconsistency.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables and sort by Data Layer Variable Name. 2. For each duplicated path, pick the variable with the cleanest name and the correct Version setting as canonical (prefer naming like `DLV - ecommerce.value`). 3. Update every tag and trigger that references a duplicate to point at the canonical variable instead. GTM\'s "Find references" link on each variable shows where it is used. 4. In Preview mode on a real conversion event, confirm the canonical variable resolves to the expected value. 5. Archive (do not delete) the duplicates — archiving preserves audit history if something needs to be rolled back. 6. Publish and re-run AdLint.',
    example: 'Problem:\nDLV - value -> ecommerce.value\nDLV - purchase revenue -> ecommerce.value\n\nBetter:\nDLV - ecommerce.value -> ecommerce.value',
    citationTemplate:
      'AdLint detected multiple GTM Data Layer Variables bound to the same dataLayer path within this container. Per Google\'s Data Layer Variable documentation, each dataLayer path should be exposed through a single canonical variable to ensure consistent resolution across tags. Duplicated paths create silent drift when Version, default value, or format settings diverge between copies — producing tags that report different values for the same underlying business event. Recommended remediation: consolidate duplicated paths to a single canonical Data Layer Variable, update tag references, and archive the duplicates. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager — Variable types (Data Layer Variable)',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
      {
        label: 'Google Tag Manager — Data Layer reference',
        url: 'https://developers.google.com/tag-platform/tag-manager/datalayer',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-datalayer-variables', 'ecommerce-datalayer-structure', 'datalayer-version-conflicts'],
  },
  {
    id: 'data-driven-eligibility',
    name: 'Data-Driven Attribution Volume Check',
    source: 'ads',
    severity: 'info',
    summary: 'One or more enabled conversion actions use data-driven attribution and need volume review in Google Ads.',
    why: 'Google Ads data-driven attribution assigns credit based on observed paths rather than a fixed rule, and Google positions it as a model that uses account performance data when enough signal is available. If a low-volume action is set to data-driven attribution, the model may be noisy or unavailable for the decision the team is trying to make. The practical risk is interpretation: bidding and reporting can be discussed as if the model is precise when the underlying conversion action has too little recent activity. This check is informational because eligibility and modeling status must be confirmed in the Google Ads UI.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Attribution, then review conversion actions on the Switch to DDA or attribution model screens. For each flagged action, confirm Google Ads marks it eligible and that recent conversion volume is sufficient for the business decision being made. If volume is weak, consolidate duplicate actions, keep the macro action Primary, or use a simpler attribution model until the action has steadier data. Document the selected model so reporting, bidding, and client-facing decks use the same attribution assumption.',
    example: 'Review target: Purchase\nAttribution model: Data-driven\nRecent volume: confirm eligibility and stability in Google Ads Attribution before relying on the model',
    relatedChecks: ['model-attribution-drift', 'attribution-window-mismatch', 'smart-bidding-volume'],
  },
  {
    id: 'conversion-naming-alignment',
    name: 'GTM-Ads Conversion Naming Alignment',
    source: 'ads',
    severity: 'info',
    summary: 'Google Ads conversion tag names in GTM do not clearly match enabled conversion action names in Google Ads.',
    why: 'Google Ads matching is controlled by conversion ID and label, not by the friendly name, so a naming mismatch does not automatically break tracking. It does make the setup harder to audit because the person reviewing GTM cannot confidently tell which Google Ads action receives each tag hit. That increases the chance of editing the wrong tag, leaving renamed actions active, or missing duplicates during a cleanup. Clear naming is especially important when agencies hand off accounts or when multiple conversion actions share the same category.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions and copy the exact active conversion action names that should be tracked from GTM. In Google Tag Manager, open Workspace -> Tags and rename each Google Ads Conversion Tracking tag so the business action, source, and Ads action name are recognizable. Do not change conversion IDs or labels during the naming cleanup unless you are intentionally remapping the tag. Preview one conversion and compare the GTM tag name, send_to value, and Google Ads action name before publishing.',
    example: 'Google Ads action: Purchase - Website\nGTM tag name: Google Ads - Purchase - Website\nsend_to: AW-123456789/AbCdEfGhIjk',
    relatedChecks: ['conversion-label-matching', 'ads-conversion-missing-gtm-tag', 'volume-weighted-duplicates'],
  },
  {
    id: 'datalayer-version-conflicts',
    name: 'Mixed Data Layer Versions',
    source: 'gtm',
    severity: 'warning',
    summary: 'The GTM container mixes version 1 and version 2 Data Layer Variables.',
    directAnswer:
      'This container has Data Layer Variables configured on both Version 1 and Version 2. The two versions resolve nested dataLayer paths differently — Version 2 can read into nested objects like `ecommerce.value`, while Version 1 cannot. Mixed-version containers produce two variables that read the same path but return different values, which corrupts downstream conversion tracking in ways that are very hard to debug.',
    why: 'When GTM\'s Data Layer Variable feature shipped, it only supported flat paths — that was Version 1. Version 2 was introduced to support modern e-commerce dataLayer shapes with nested objects and arrays. Most modern containers should use Version 2 everywhere. The problem is that GTM does not auto-migrate variables when you set up a new container — old variables stay on Version 1 indefinitely, and new variables default to Version 2. So a single container can end up with `DLV - oldRevenue` on V1 (which cannot read `ecommerce.value` and silently resolves to undefined) and `DLV - newRevenue` on V2 (which reads the same path correctly). A conversion tag wired to the older variable reports zero; one wired to the newer reports the real value. The root cause is invisible because the variables look identical in the UI unless you open them.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables. 2. Click each Data Layer Variable in turn and check the "Data Layer Version" field. 3. Standardise on Version 2 unless a specific variable has a documented reason to stay on V1 (rare; usually a legacy tag that depends on V1 behaviour). 4. After changing a variable from V1 to V2, complete a test event in Preview and confirm the variable still resolves to a non-empty value. Some legacy variables read top-level keys (e.g. `revenue`) rather than nested keys (`ecommerce.value`); upgrading to V2 should not break these, but verify. 5. Publish only when every Data Layer Variable in the container is on a consistent, documented version.',
    example: 'Variable: DLV - ecommerce.value\nData Layer Variable Name: ecommerce.value\nData Layer Version: Version 2',
    citationTemplate:
      'AdLint detected GTM Data Layer Variables on mixed versions (Version 1 and Version 2) within this container. Per Google\'s GTM variable documentation, Data Layer Version 2 is required to read nested dataLayer paths such as `ecommerce.value`; Version 1 cannot resolve them. Mixed-version containers produce variables that read the same path but return different values, corrupting conversion measurement in ways that are not visible in the GTM Tags screen. Recommended remediation: standardise every Data Layer Variable on Version 2 unless explicitly required otherwise, and verify resolution in Preview before publishing. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager — Variable types (Data Layer Variable)',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-datalayer-paths', 'missing-datalayer-variables', 'ecommerce-datalayer-structure'],
  },
  {
    id: 'enhanced-conversions-missing-data',
    name: 'Enhanced Conversions Missing User Data',
    source: 'gtm',
    severity: 'critical',
    summary: 'Enhanced Conversions is enabled but user-provided data fields are missing or not being sent.',
    directAnswer:
      'Google Ads Enhanced Conversions improves attribution by sending hashed first-party user data (email, phone, name, address) alongside conversion events. This container has Enhanced Conversions enabled but the user-data fields are empty or unmapped. The feature is essentially off — Google Ads receives the conversion but none of the signal that makes Enhanced Conversions worth enabling in the first place.',
    why: 'Enhanced Conversions is one of the highest-leverage privacy-resilient measurement features Google Ads offers. When a user completes a conversion, GTM hashes their email (or phone, name, address) using SHA-256 and sends it to Google Ads alongside the conversion event. Google can then match that hashed identifier against signed-in Google users who clicked an ad — recovering attribution that would otherwise be lost to cookie restrictions, intelligent tracking prevention, or cross-device journeys. The feature only works if the user data is actually populated at conversion time. The check fires when a Google Ads Conversion Tracking tag has Enhanced Conversions enabled but the user-data parameter is unmapped, mapped to a variable that resolves empty, or set to a field that does not exist on the conversion page. The result: the tag fires with empty user_data, the match rate is zero, and Enhanced Conversions reports show no uplift — leading teams to wrongly conclude the feature does not work.',
    howToFix:
      '1. Identify which page has the conversion event (typically order-confirmation or signup-success). Confirm the user\'s email or phone is rendered in the HTML or available in the dataLayer at that moment. 2. In GTM, create a Data Layer Variable for the user identifier (e.g. `DLV - customer.email`). Do not hash it in GTM — Google does the hashing automatically when sent through the user-data parameter. 3. Open the Google Ads Conversion Tracking tag, enable Enhanced Conversions, and choose the "Code" or "Automatic" detection mode. For Code mode, map `email`, `phone_number`, `address.first_name`, `address.last_name`, `address.postal_code`, and `address.country` to the corresponding Data Layer Variables. 4. In Preview mode, complete a real test conversion and inspect the outgoing tag request — look for a `pii=` or `em=` parameter with a hashed value. 5. After 7–14 days in production, check Google Ads → Tools → Conversions → Diagnostics for the Enhanced Conversions match rate. Aim for >70%.',
    example:
      'Tag: Google Ads — Purchase Conversion\nEnhanced Conversions: Enabled, mode = Code\nemail: {{DLV - customer.email}}\nphone_number: {{DLV - customer.phone}}\naddress.first_name: {{DLV - customer.firstName}}\naddress.last_name: {{DLV - customer.lastName}}\naddress.postal_code: {{DLV - customer.postalCode}}\naddress.country: {{DLV - customer.country}}',
    citationTemplate:
      'AdLint detected that this container has Enhanced Conversions enabled on one or more Google Ads Conversion Tracking tags, but the user-data fields are unmapped or resolve to empty values. Per Google\'s Enhanced Conversions for web documentation, the feature requires populated first-party user data (email, phone, or address) at conversion time to recover attribution lost to cookie restrictions. Without populated user data, the conversion is reported but no match signal is sent, producing zero match rate and no measurable lift. Recommended remediation: map first-party customer fields from the conversion-page dataLayer into the tag\'s Enhanced Conversions configuration and verify the match rate in Google Ads Diagnostics after deployment. Source: support.google.com/google-ads/answer/9888656.',
    references: [
      {
        label: 'Google Ads — About Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/9888656',
      },
      {
        label: 'Google Ads — Set up Enhanced Conversions for web with Google Tag Manager',
        url: 'https://support.google.com/google-ads/answer/13262500',
      },
      {
        label: 'Google Tag Manager — Enhanced Conversions user-provided data variable',
        url: 'https://support.google.com/tagmanager/answer/13438771',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-datalayer-variables', 'ecommerce-datalayer-structure', 'missing-conversion-linker'],
  },
  {
    id: 'naming-conventions',
    name: 'GTM Naming Convention Violations',
    source: 'gtm',
    severity: 'info',
    summary: 'Tags, triggers, and variables in this container do not follow a consistent, auditable naming convention.',
    directAnswer:
      'GTM does not enforce naming conventions, so containers accumulate inconsistent names over time — "GA4 Event," "ga4-purchase," "Purchase (GA4)," "PurchaseEvent_v2" all coexisting. The technical impact is zero. The operational impact is significant: every new audit, handoff, or change requires re-reading every tag to understand what it does, and findings become harder to defend to clients because they cannot tell which tag handles which business event.',
    why: 'Naming conventions are governance, not configuration — and governance is what separates a container that can be audited in 30 minutes from one that takes a day. The most widely-adopted convention in the GTM community uses prefix-based naming: tags as `<Platform> - <Event>` (e.g. `GA4 - Purchase`, `Google Ads - Lead`), triggers as `<Type> - <Description>` (e.g. `Custom Event - purchase`, `Click - CTA Button`), and variables as `<Type> - <Source>` (e.g. `DLV - ecommerce.value`, `CJS - User Agent`). The benefit is searchability: filtering by `GA4 -` shows every GA4 tag instantly, and the same prefix tells reviewers what platform owns the data. AdLint flags this check when more than 40% of tags, triggers, or variables deviate from a detectable convention — not because the names are "wrong," but because inconsistency is a leading indicator of governance issues that show up later as duplicate tags, conflicting triggers, and audit findings that take longer to remediate than they should.',
    howToFix:
      '1. Pick a convention. The default in the GTM community: `<Platform> - <Event>` for tags, `<Type> - <Description>` for triggers, `<Type> - <Source>` for variables. Write it down in a one-page document. 2. Rename existing tags in batches by platform. Start with the most-modified tags (typically GA4 and Google Ads). Renaming is non-destructive in GTM — version history preserves the old name. 3. After renaming, update related triggers and variables to follow the same convention. 4. For larger containers, consider creating a Naming Convention workspace solely for renames so the audit trail is clean. 5. Publish, then re-run AdLint to confirm the finding clears. 6. Document the convention in your team\'s GTM governance doc so new tags follow it by default.',
    example:
      'Inconsistent:\n  GA4 Event\n  ga4-purchase\n  Purchase (GA4)\n\nConsistent:\n  GA4 - Page View\n  GA4 - Purchase\n  GA4 - Add to Cart',
    citationTemplate:
      'AdLint detected that more than 40% of tags, triggers, or variables in this GTM container do not follow a detectable naming convention. While GTM does not enforce names, inconsistent naming is the highest-correlated indicator of governance debt that produces downstream duplicate tags, conflicting triggers, and prolonged audit cycles. Industry-standard GTM governance recommends prefix-based naming (e.g. `<Platform> - <Event>` for tags). Recommended remediation: adopt and document a naming convention, rename existing assets in batches, and treat naming as a publish-gating governance check. Source: support.google.com/tagmanager/answer/6103693.',
    references: [
      {
        label: 'Google Tag Manager — Help and best practices',
        url: 'https://support.google.com/tagmanager/answer/6103693',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-descriptions', 'stale-tags', 'duplicate-datalayer-paths'],
  },
  {
    id: 'container-size-score',
    name: 'GTM Container Size and Tag Count',
    source: 'gtm',
    severity: 'warning',
    summary: 'The container is approaching the documented GTM workspace size limit or has accumulated more tags than is operationally healthy.',
    directAnswer:
      'GTM has documented workspace size limits and operational thresholds that this container is approaching or exceeding. A container near the size limit cannot be published once it crosses the threshold, and a container with hundreds of tags becomes slow to audit and increases page-load weight for every site visitor.',
    why: 'Google publishes two operational ceilings for GTM containers. The first is a hard workspace size limit (currently around 200 KB of compressed container JSON for web containers) — once a container exceeds this, GTM refuses to publish the workspace and the team has to delete or archive assets before any new change can ship. The second is a soft tag-count threshold (200+ tags) where every page load executes the full GTM container script and runtime, so each additional tag adds milliseconds to Time-to-Interactive on every page. Sites that score in the 90s on Lighthouse can drop into the 70s purely from container weight. AdLint scores the container against both thresholds and flags accumulation early enough to act. The practical risk is two-fold: an emergency where a critical change cannot be deployed because the workspace is full, and a slow, invisible CWV regression that compounds with every new pixel or third-party tag.',
    howToFix:
      '1. In GTM, open Admin → Container Settings to see current container size relative to the limit. 2. In Workspace → Tags, sort by Last Edited and identify tags that have not changed in 12+ months and have no recent Tag Assistant evidence. These are candidates for archive. 3. Use the AdLint `stale-tags` and `unused-triggers` findings to identify safe-to-archive assets — both ship hints about what is no longer load-bearing. 4. Archive (do not delete) the candidates in a dedicated cleanup workspace, then publish. Container size drops immediately. 5. For ongoing health, add a quarterly governance review where any tag untouched for 12 months is reviewed for archival. 6. If the tag count is high but everything is active, consider migrating high-traffic pixels (Meta, TikTok, LinkedIn) to server-side GTM to reduce client-side weight without losing functionality.',
    example: 'Container size: 168 KB of 200 KB (84% of limit)\nTag count: 187\nStale tags (last edited > 12 months ago): 41\nRecommended action: archive stale-tags candidates in a dedicated cleanup workspace.',
    citationTemplate:
      'AdLint detected that this GTM container is approaching the documented workspace size limit and/or has accumulated a tag count above operational best practice. Per Google\'s Tag Manager limits documentation, web containers have a published workspace size limit and exceeding it blocks all new publishes. High tag counts also contribute to client-side page-load weight that compounds across every visitor. Recommended remediation: audit the container for stale and unused assets, archive candidates in a dedicated cleanup workspace, and consider migrating high-traffic pixels to server-side GTM. Source: support.google.com/tagmanager/answer/2649961.',
    references: [
      {
        label: 'Google Tag Manager — Container size and other limits',
        url: 'https://support.google.com/tagmanager/answer/2649961',
      },
      {
        label: 'Google Tag Manager — Server-side tagging overview',
        url: 'https://developers.google.com/tag-platform/tag-manager/server-side',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['stale-tags', 'unused-triggers', 'unused-variables'],
  },
  {
    id: 'conversion-funnel-coverage',
    name: 'Conversion Tracking Funnel Coverage',
    source: 'cross',
    severity: 'warning',
    summary: 'Enabled Google Ads conversions do not cover enough major funnel stages across awareness, consideration, conversion, and retention.',
    why: 'Google Ads conversion measurement is meant to track valuable actions such as purchases, sign-ups, and other customer activity after ad interactions. When only one end-stage action is tracked, teams lose visibility into whether media is generating qualified visits, product interest, checkout progress, leads, purchases, or repeat value. That can make optimization brittle for lower-volume accounts because Smart Bidding and analysts see only sparse macro outcomes. The goal is not to count every click as a conversion, but to maintain a defensible funnel map with Primary macro actions and Secondary diagnostic actions.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions and list the enabled actions by funnel stage. Add or repair missing diagnostic actions for important stages, then set only the true business outcome as Primary and keep supporting micro-conversions Secondary unless they are intentionally used for bidding. In GTM, open Workspace -> Tags and verify each website-based action has a matching trigger on the real page or event, not only a button click that can fail validation. Re-run the full audit with both GTM and Google Ads exports to confirm no more than one major stage is missing.',
    example: 'Primary: Purchase or Qualified Lead\nSecondary: Landing Page Visit, Product View, Add to Cart, Begin Checkout, Repeat Purchase',
    relatedChecks: ['micro-conversion-pollution', 'missing-primary-conversion', 'conversion-naming-alignment'],
  },
  {
    id: 'pinterest-conversion-api-parity',
    name: 'Pinterest Conversion API Parity',
    source: 'pinterest',
    severity: 'warning',
    summary: 'Pinterest browser events have no matching server-side Conversion API volume.',
    why: 'Pinterest positions the Conversion API as a way to send conversion events from the server alongside the browser tag. If browser events exist but the server stream is missing, measurement depends on client-side requests that can be blocked by browsers, consent timing, or network conditions. The result is weaker event durability and less defensible attribution when the browser and server sources should be backing each other up.',
    howToFix: 'Map each important Pinterest Tag event to the equivalent Conversion API event and send the same business action from the server where possible. Include event time, event name, value, currency, and matching identifiers needed for deduplication and enhanced match. Confirm Events Manager shows browser and server volume for the same major events before relying on campaign reporting.',
    example: 'Browser event: Checkout\nServer event: Checkout\nShared fields: event_id, value, currency, order_id, customer match fields',
    relatedChecks: ['pinterest-tag-configuration-quality', 'pinterest-checkout-missing-value'],
  },
  {
    id: 'pinterest-tag-configuration-quality',
    name: 'Pinterest Tag Configuration Quality',
    source: 'pinterest',
    severity: 'warning',
    summary: 'Pinterest tag naming, enhanced match, or currency setup is inconsistent.',
    why: 'Pinterest setup quality problems often do not stop events from firing, but they make the event stream harder to defend. Reusing a partner name as a tag name obscures ownership, missing enhanced match weakens matching quality, and mixing EUR and USD values makes revenue reporting hard to reconcile. These are measurement governance issues: the data exists, but the account team cannot trust what it means without cleanup.',
    howToFix: 'Use clear, distinct names for the Pinterest Tag and any partner or integration layer. Enable enhanced match where it is appropriate for the consent and data policy in scope. Standardize value events on one expected currency, then re-test Checkout and Lead events in Pinterest Events Manager.',
    example: 'Problem: partnerName = Main Tag, tagName = Main Tag, currencies = USD and EUR\nBetter: partnerName = Shopify, tagName = US Store Pinterest Tag, currency = USD',
    relatedChecks: ['pinterest-conversion-api-parity', 'pinterest-checkout-missing-value'],
  },
  {
    id: 'twitter-event-id-format',
    name: 'Twitter/X Event ID Format',
    source: 'twitter',
    severity: 'critical',
    summary: 'Twitter/X website events do not use the expected tw-XXXX-XXXX event ID format.',
    why: 'The event ID is the routing key that tells the Twitter/X website tag which configured event should receive the hit. If the ID is malformed, the tag can fire in the browser while the conversion never lands in the intended event. That creates a hard-to-spot failure where network activity exists but optimization and reporting are pointed at missing or incorrect conversion signals.',
    howToFix: 'Copy the event ID directly from Twitter/X Ads Events Manager into the website tag or GTM template. Avoid hand-typing IDs or transforming them through variables unless there is a tested lookup table. Fire a test conversion and confirm the request contains the same tw-prefixed ID shown in the platform UI.',
    example: 'Expected: tw-abc123-def456\nProblem: abc123-def456 or TW abc123 def456',
    relatedChecks: ['twitter-conversion-id-required', 'twitter-deduplication-conversion-id'],
  },
  {
    id: 'twitter-deduplication-conversion-id',
    name: 'Twitter/X conversion_id Deduplication',
    source: 'twitter',
    severity: 'warning',
    summary: 'Twitter/X conversion events are missing or reusing conversion_id values.',
    why: 'Twitter/X uses conversion identifiers to recognize the same business event when it arrives from more than one path, such as browser and server. Without a stable conversion_id, repeated hits can inflate conversion counts, while missing IDs make server-side alignment harder to audit. Reused IDs across different orders or leads create the opposite risk by collapsing distinct events.',
    howToFix: 'Generate a unique conversion_id from the order ID, lead ID, or another stable transaction identifier. Pass the same ID only when browser and server payloads represent the same event. Review recent events for missing IDs and for repeated IDs that span different users or conversion actions.',
    example: 'Purchase order 10492\nBrowser conversion_id: 10492\nServer conversion_id: 10492',
    relatedChecks: ['twitter-conversion-id-required', 'twitter-event-id-format'],
  },
  {
    id: 'snapchat-pixel-id-format',
    name: 'Snap Pixel ID Format',
    source: 'snapchat',
    severity: 'critical',
    summary: 'The Snap Pixel ID is missing or does not match the expected UUID-style format.',
    why: 'Snap Pixel events need to be associated with the correct pixel before they can populate audiences, diagnostics, and conversion reporting. A copied-short, malformed, or stale ID can send events into the wrong asset or prevent them from being recognized. The event code may still execute, so the practical risk is silent measurement loss rather than an obvious page error.',
    howToFix: 'Copy the Pixel ID from Snapchat Events Manager and compare it against every GTM tag, direct site tag, and commerce integration. Keep one canonical ID per property unless there is an intentional multi-pixel setup. Test PAGE_VIEW and PURCHASE after the change and confirm they appear under the expected Snap Pixel.',
    example: 'Expected shape: 123e4567-e89b-12d3-a456-426614174000',
    relatedChecks: ['snapchat-missing-page-view', 'snapchat-capi-dedup-currency'],
  },
  {
    id: 'snapchat-capi-dedup-currency',
    name: 'Snap CAPI, Deduplication, and Currency Alignment',
    source: 'snapchat',
    severity: 'warning',
    summary: 'Snap Pixel and Conversions API events are not aligned on deduplication or currency.',
    why: 'Snap recommends aligning browser pixel and Conversions API implementations so the same user action can be matched without double-counting. Missing deduplication IDs make browser plus server setups vulnerable to inflated counts, while missing CAPI volume leaves the account dependent on browser-only measurement. Mixed currencies add another reporting risk because conversion value totals no longer describe one economic unit.',
    howToFix: 'Send the same deduplication ID on matching Snap Pixel and Conversions API events, normally derived from the order ID, lead ID, or event ID. Confirm server-side volume appears for key events such as PURCHASE and SIGN_UP. Standardize currency on the value events and validate a real transaction against the value and currency shown in Events Manager.',
    example: 'PURCHASE event_id: order-10492\nPixel currency: USD\nCAPI currency: USD',
    relatedChecks: ['snapchat-pixel-id-format', 'snapchat-purchase-missing-value'],
  },
];

export function getExplainer(id: string): CheckExplainer | undefined {
  return explainers.find((explainer) => explainer.id === id);
}

export function getExplainersBySource(source: ExplainerSource): CheckExplainer[] {
  return explainers.filter((explainer) => explainer.source === source);
}

// Registry-backed helpers. The registry knows every check ID the audit
// engine can emit; the explainers list only covers the ones with full
// editorial treatment. Stub explainers close the coverage gap so every
// finding has a Learn-more destination.

import { checkRegistry, checkRegistryById, type CheckRegistryEntry } from './registry.generated';

function stubFromRegistry(entry: CheckRegistryEntry): CheckExplainer {
  return {
    id: entry.id,
    name: entry.title,
    source: entry.source,
    severity: entry.severity,
    summary: `AdLint flags this check as ${entry.severity} when it fires against your ${explainerSources.find((s) => s.key === entry.source)?.label ?? entry.source} data.`,
    why: 'A detailed editorial explainer for this check has not been published yet. The check is fully implemented in the AdLint audit engine — only the long-form documentation page is pending.',
    howToFix: 'See the platform documentation referenced below, or open an issue if you would like this explainer prioritised. The finding itself is correct; only the long-form explanation is in progress.',
    status: 'stub',
  };
}

export function getExplainerOrStub(id: string): CheckExplainer | undefined {
  const full = getExplainer(id);
  if (full) return { ...full, status: full.status ?? 'full' };
  const entry = checkRegistryById[id];
  if (entry) return stubFromRegistry(entry);
  return undefined;
}

export function getAllExplainersOrStubs(): CheckExplainer[] {
  return checkRegistry.map((entry) => {
    const full = getExplainer(entry.id);
    return full ? { ...full, status: full.status ?? 'full' } : stubFromRegistry(entry);
  });
}

export function hasFullExplainer(id: string): boolean {
  return Boolean(getExplainer(id));
}

export function explainerCoverage(): { documented: number; total: number } {
  return { documented: explainers.length, total: checkRegistry.length };
}

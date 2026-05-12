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
      'Your GTM container is missing the Conversion Linker. That means Google Ads conversions on this site are firing without the GCLID handshake. Any time the conversion happens on a different pageview than the ad click (which is most conversions), the click context is lost. Google still counts the conversion. It just has no idea which ad caused it.',
    why: 'The chain looks like this. Someone clicks a Google Ads ad. Google appends `?gclid=abc123...` to the landing URL. They land on your homepage. The Conversion Linker reads `gclid` out of the URL and writes it to a first-party cookie called `_gcl_aw`. They browse around, add to cart, eventually buy. The Google Ads conversion tag fires on the order-confirmation page. It reads `_gcl_aw`, finds the GCLID, and sends the conversion with that ID attached. Google matches it back to the original click.\n\nNo Conversion Linker, step three never happens. The cookie is never written. The conversion tag still fires on the confirmation page, but the GCLID is gone, so Google reports the conversion with no click context. Your dashboards still populate. Smart Bidding still operates. The signal feeding everything is just wrong.\n\nWhere this bites: any flow where the conversion is not on the landing page. So almost every flow. The bigger the gap between click and purchase, the more conversions get misattributed. B2B accounts with a 30-day sales cycle lose almost all attribution. E-commerce sites with multi-page checkouts lose a chunk on every order. The dashboard never tells you, because the conversion tag itself is healthy. The damage shows up months later when reported ROAS does not match what the bank account does.',
    howToFix:
      '1. In GTM, hit New Tag, pick "Google Ads Conversion Linker."\n2. Trigger: All Pages.\n3. Multi-domain funnel (payment processor on a different domain, Shopify checkout, anything cross-host)? Open Linker Settings, turn on auto-link domains, paste every domain that appears in a real conversion path. Yes, the payment processor counts.\n4. Hit Preview. Load any page. Confirm the linker shows up in the Tags Fired panel.\n5. Publish. The finding clears on the next AdLint run.',
    example:
      'Tag type: Google Ads Conversion Linker\nTrigger: All Pages\nAuto-link domains: example.com, checkout.example-payments.com',
    citationTemplate:
      'This GTM container is missing the Google Ads Conversion Linker tag. Google\'s Tag Manager documentation states that the Conversion Linker is required for Google Ads conversion tags to retain ad click identifiers across pageviews. Without it, Google Ads conversions on this site report without the GCLID that ties them back to the originating ad click, which degrades Smart Bidding signal and produces ROAS reports that diverge from actual revenue performance. Fix: add the Conversion Linker tag on the All Pages trigger and confirm it fires before any downstream conversion tag. Source: support.google.com/tagmanager/answer/7549390.',
    references: [
      {
        label: 'Google Tag Manager. Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
      {
        label: 'Google Ads. About cross-domain measurement',
        url: 'https://support.google.com/google-ads/answer/7521212',
      },
      {
        label: 'Google Ads. GCLID and conversion attribution',
        url: 'https://support.google.com/google-ads/answer/9744275',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    whyMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Conversion tags are firing. The Conversion Linker is not. The GCLID never makes it into _gcl_aw, so every conversion tag below ships without click context.',
      rows: [
        {
          name: 'GA4 Configuration',
          type: 'GA4 Configuration',
          firing: 'All Pages',
          highlight: 'pass',
        },
        {
          name: 'Google Ads. Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'critical',
          note: 'Fires without _gcl_aw set. GCLID lost.',
        },
        {
          name: 'Google Ads. Lead Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'form_submit',
          highlight: 'critical',
          note: 'Same. Lead reported without source attribution.',
        },
        {
          name: 'Google Ads. Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'warning',
          note: 'Audience builds, but on degraded identifiers.',
        },
      ],
    },
    fixMockup: {
      kind: 'gtm-tag-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Conversion Linker added on All Pages. It writes _gcl_aw on the landing page. Every downstream conversion tag now has the GCLID to send.',
      rows: [
        {
          name: 'Google Ads. Conversion Linker',
          type: 'Conversion Linker',
          firing: 'All Pages',
          highlight: 'pass',
          note: 'New tag. Writes _gcl_aw before any conversion fires.',
        },
        {
          name: 'GA4 Configuration',
          type: 'GA4 Configuration',
          firing: 'All Pages',
          highlight: 'pass',
        },
        {
          name: 'Google Ads. Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'pass',
        },
        {
          name: 'Google Ads. Lead Conversion',
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
      'Some of your Google Ads tags have no Consent Settings configured. They fire on every page load regardless of whether the user has granted `ad_storage` consent. In any region that enforces GDPR, UK GDPR, or similar, that is a compliance problem first and a measurement problem second. Data you ship from consent-denied users should never have left the browser.',
    why: 'Google Consent Mode v2 added two ad-related consent signals: `ad_storage` (whether you can use cookies for ad measurement) and `ad_user_data` (whether you can send the user\'s identifiers to Google). Every Google Ads tag is supposed to read these signals before firing. If the tag has no Consent Settings in GTM, it ignores them entirely.\n\nThree things happen when that is the case. First, you ship data from users who explicitly declined consent. That is the regulatory exposure. Second, Google\'s modelling pipeline (the one that fills attribution for consent-denied users) cannot help, because it assumes consent-denied hits were tagged as such. That is the measurement degradation. Third, the same tag behaves differently across geographies, banner timings, and browser states, so debugging turns into a moving target. That is the operational pain.\n\nThe fix is not the consent banner. The banner records the user\'s choice; the GTM tag has to read it. If the tag is not wired to check, the banner can be perfect and the leak continues.',
    howToFix:
      '1. In GTM, open Admin → Container Settings → Consent and turn on "Enable consent overview." That adds a Consent column to the Tags list so you can see at a glance which tags have which requirements. 2. Open every Google Ads Conversion Tracking and Google Ads Remarketing tag. Expand Consent Settings. Tick "Require additional consent for tag to fire" and pick `ad_storage`. If the tag uses Enhanced Conversions, add `ad_user_data` too. 3. Confirm your consent banner sets default consent to denied before any tag loads, and updates consent only after the user picks. If you use a CMP (OneTrust, Cookiebot, etc.), that lives in the CMP config, not GTM. 4. In Preview mode, walk three flows: denied, granted, and "user changed their mind." Confirm Ads tags fire on the granted path and only the granted path. 5. Publish.',
    example: 'Required consent checks: ad_storage, ad_user_data, ad_personalization\nDefault state before banner choice: denied',
    citationTemplate:
      'This GTM container has Google Ads tags configured to fire without Consent Settings. Per Google\'s Consent Mode v2 documentation, Google Ads conversion and remarketing tags are required to honour the `ad_storage` and `ad_user_data` consent signals; tags without explicit Consent Settings fire regardless of user choice. The exposure runs in both directions: regulatory (GDPR, UK GDPR, ePrivacy) and measurement (Google\'s modelling pipeline cannot compensate for hits that were never tagged as consent-denied). Fix: configure required-additional-consent on every Google Ads tag and verify denied / granted / changed-consent paths in GTM Preview before publishing. Source: developers.google.com/tag-platform/security/guides/consent.',
    references: [
      {
        label: 'Google. Consent settings in Google Tag Manager',
        url: 'https://support.google.com/tagmanager/answer/10718549',
      },
      {
        label: 'Google. Consent mode for Google Ads',
        url: 'https://support.google.com/google-ads/answer/14310715',
      },
      {
        label: 'Google Developers. Consent Mode v2 reference',
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
          name: 'Google Ads. Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'critical',
          note: 'Consent Settings: No additional consent required',
        },
        {
          name: 'Google Ads. Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'critical',
          note: 'Consent Settings: No additional consent required',
        },
        {
          name: 'Google Ads. Sign-Up Conversion',
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
          name: 'Google Ads. Purchase Conversion',
          type: 'Google Ads Conversion Tracking',
          firing: 'purchase_success',
          highlight: 'pass',
          note: 'Requires: ad_storage, ad_user_data',
        },
        {
          name: 'Google Ads. Remarketing',
          type: 'Google Ads Remarketing',
          firing: 'All Pages',
          highlight: 'pass',
          note: 'Requires: ad_storage',
        },
        {
          name: 'Google Ads. Sign-Up Conversion',
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
    directAnswer:
      'Two tags fire the same Google Ads conversion on the same trigger, or two Google Ads conversion actions track the same business event. Either way, every real conversion now counts twice. Your reported CPA halves overnight without anything actually getting cheaper, and Smart Bidding starts spending against numbers that are not real.',
    why: 'This is the failure mode that looks good while it is happening. Doubled conversion volume. Doubled conversion value. Smart Bidding sees more "wins" per dollar and pushes spend up. Dashboards stay green. Nobody notices until someone reconciles against the e-commerce backend or the CRM and discovers reported conversions are exactly 2× the orders the company actually shipped.\n\nThe duplicate lives in one of two places. In GTM, it is two conversion tags sharing the same Conversion ID + label, both wired to the same trigger (e.g. `purchase_success`). Open both and they look almost identical; the only difference is the tag name. In Google Ads, it is two separate Conversion Actions with different names but pointing at the same business outcome. Both are marked Primary, both feed bidding, both get counted.\n\nThe damage compounds while the duplicate stays in place. Smart Bidding learns from the inflated signal. Budget shifts toward whichever campaign happens to drive the most "wins" (which is now twice what it used to be). When you eventually fix the duplicate, reported volume halves and the team panics about a performance regression that is actually a measurement correction.',
    howToFix:
      '1. Open the finding details. AdLint lists each duplicate pair and which layer it lives in (GTM, Google Ads, or both). 2. GTM duplicates: open Workspace → Tags, find each pair that shares Conversion ID + label + trigger, pick a canonical one (usually the one with the better name and more recent edits), and pause or delete the duplicate. 3. Google Ads duplicates: open Tools & Settings → Measurement → Conversions, find the duplicate actions, mark the canonical action Primary, demote the others to Secondary or archive them. 4. Annotate the change date in Google Ads. Historical data still contains the duplicates, so any period-over-period report that crosses the fix date will show a volume drop that is not a performance regression. 5. Wait one full conversion window (usually 30 days) before judging restored performance against the new baseline.',
    example: 'Duplicate pattern: two Ads conversion tags with the same AW-123456789 / abcDEF_label firing on purchase_success',
    citationTemplate:
      'This account has duplicate conversion tracking: either GTM tags or Google Ads conversion actions counting the same business event more than once. Per Google\'s conversion-tracking documentation, each business event should map to exactly one enabled, Primary conversion action. Duplication doubles reported conversion volume and value, biases Smart Bidding, and produces dashboards that diverge materially from backend reality. Fix: identify each duplicate pair, consolidate to a single canonical action per business event, and annotate the change date for downstream period-over-period reporting. Source: support.google.com/google-ads/answer/6386790.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. Troubleshoot duplicate conversions',
        url: 'https://support.google.com/google-ads/answer/6386790',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['volume-weighted-duplicates', 'conversion-label-matching', 'tag-count-mismatch'],
  },
  {
    id: 'ecommerce-datalayer-structure',
    name: 'E-commerce Data Layer Structure',
    source: 'gtm',
    severity: 'critical',
    summary: 'The dataLayer does not expose purchase and item data in a reliable e-commerce shape.',
    directAnswer:
      'Your purchase event is not pushing a dataLayer object that conversion tags can actually read. Either `value`, `currency`, `transaction_id`, or the `items` array is missing, or the whole thing is shaped wrong. Tags still fire on the confirmation page, but the value they ship is zero or undefined. So Google Ads counts the conversion. It just thinks every order is worth $0.',
    why: 'GA4, Google Ads conversion tracking, Meta CAPI, TikTok Events, and most server-side pipelines all read from the same dataLayer object. Each tag subscribes to specific keys inside an `ecommerce` block. The GA4 specification is the canonical shape: an event named `purchase`, a nested `ecommerce` object, and inside it `transaction_id`, `value`, `currency`, and an `items` array of `{ item_id, item_name, price, quantity }` rows.\n\nReal implementations deviate in three common ways. The developer flattens `value` to the top level instead of nesting it inside `ecommerce`. The developer forgets `currency` entirely (so Google Ads has no idea whether the $129 was USD or JPY). Or the dataLayer pushes a different shape on different pages: the product-detail-page push uses `ecommerce.items[].id`, the order-confirmation push uses `ecommerce.items[].item_id`. Each tag picks one or the other and they silently disagree.\n\nThe damage is that everything keeps working at the surface. Tags fire. Conversions count. Dashboards populate. The numbers are just wrong. Smart Bidding optimises against a value signal that is mostly zeros and the occasional non-zero spike. ROAS reports diverge from the e-commerce backend by an amount that nobody can explain. The team eventually files a ticket asking why the company\'s reported ROAS does not match what the bank shows.',
    howToFix:
      '1. Find the code that pushes the `purchase` event. It is typically in the order-confirmation page template or a checkout-success hook. 2. Replace whatever shape it currently pushes with the GA4 canonical structure. The example below is verbatim what you want. 3. Make sure the push happens before any GTM tag reads from the dataLayer for that event. On most stacks that means rendering the script inline at the top of the confirmation page body, before the GTM snippet. 4. In GTM Preview, run a real test purchase. Step through the Variables tab at the `purchase` event. Every variable a conversion tag uses (`{{DLV - ecommerce.value}}`, `{{DLV - ecommerce.currency}}`, etc.) should resolve to a non-empty value. 5. Repeat for the refund and partial-cancellation paths if the site supports them. Same shape, different event names (`refund`, `cancellation`).',
    example:
      "dataLayer.push({\n  event: 'purchase',\n  ecommerce: {\n    transaction_id: 'T-12345',\n    value: 129.99,\n    currency: 'USD',\n    items: [\n      { item_id: 'SKU-1', item_name: 'Walking Shoes', price: 129.99, quantity: 1 }\n    ]\n  }\n});",
    citationTemplate:
      'This GTM container expects a `purchase` dataLayer event but the pushed payload does not match the GA4 recommended e-commerce shape. Per Google\'s GA4 documentation, conversion tags require a nested `ecommerce` object containing `transaction_id`, `value`, `currency`, and an `items` array. Deviations cause downstream Google Ads conversion-value, GA4 e-commerce, and remarketing-audience scoping to silently degrade. The conversion is still counted; the value is not. Fix: standardise the `purchase` push to the GA4 canonical shape before any GTM tag fires, and verify variable resolution in GTM Preview. Source: developers.google.com/analytics/devguides/collection/ga4/ecommerce.',
    references: [
      {
        label: 'Google Analytics 4. Measure ecommerce',
        url: 'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce',
      },
      {
        label: 'GA4. Recommended events for e-commerce',
        url: 'https://support.google.com/analytics/answer/9612232',
      },
      {
        label: 'Google Tag Manager. Data Layer reference',
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
      'Conversion tags in this container reference fields that are not exposed as GTM Data Layer Variables. Typically `ecommerce.value`, `ecommerce.currency`, or `ecommerce.transaction_id`. The tags still fire on the right trigger, but the fields they read resolve to empty, which means the conversion is reported with no value. The dashboard shows a count; the bidding signal is noise.',
    why: 'A GTM tag does not read the dataLayer directly. it reads variables that are bound to dataLayer paths through the User-Defined Variables panel. If a conversion tag references `{{DLV - ecommerce.value}}` but no such Data Layer Variable exists (or the binding is misspelled), GTM evaluates the placeholder to an empty string and ships the conversion with no value field. Google Ads counts this as a valid conversion at zero revenue. Smart Bidding then optimises against the count signal alone, treating a $1,000 order identically to a $10 order. The damage adds up because the failure is silent: nothing in the tag firing or the Preview-mode summary surfaces "this variable resolved to empty." The user finds out months later when reported ROAS diverges from the e-commerce backend by an unexplainable factor.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables. 2. For every field used by a conversion or analytics tag. `ecommerce.value`, `ecommerce.currency`, `ecommerce.transaction_id`, and any user-data field. Create a Data Layer Variable with the matching Data Layer Variable Name (case-sensitive, dot-separated path). 3. Set Data Layer Version to Version 2 for any nested ecommerce path. 4. Open each conversion tag and reference the variables via `{{DLV - …}}` syntax instead of literal values. 5. In Preview mode, complete a test conversion and inspect each variable in the Variables tab at the exact event step the tag fires on. Every variable should resolve to a non-empty value before publish.',
    example: 'Variable: DLV - ecommerce.value\nData Layer Variable Name: ecommerce.value\nData Layer Version: Version 2\nUsed by: Google Ads purchase conversion value',
    citationTemplate:
      'GTM tags in this container that reference dataLayer fields without corresponding Data Layer Variables. Google\'s Tag Manager Data Layer Variable documentation, tags must read dataLayer values through explicitly-configured Data Layer Variables; unresolved references evaluate to empty strings at runtime. The effect is that conversion tags fire with no value, currency, or transaction ID, breaking value-based bidding and revenue reporting. Fix: create Data Layer Variables for every dataLayer path used by conversion tags and verify resolution in GTM Preview. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types (Data Layer Variable)',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
      {
        label: 'Google Tag Manager. Data Layer reference',
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
    directAnswer:
      'Your Google Ads purchase action is set to "Don\'t use a value" (or fixed at zero). To Smart Bidding, every order looks identical. A $10 sale and a $1,000 sale weigh the same. If you are running Target ROAS or Maximize Conversion Value, the algorithm has no revenue signal to optimise against, and it falls back to chasing the cheapest conversions it can find.',
    why: 'Value-based bidding is the entire point of running Target ROAS or Maximize Conversion Value. It lets Google trade conversions for revenue: skip the $10 customer, win the $1,000 customer, even if the $10 customer was easier to acquire. The strategy stops working the moment conversion value goes to zero.\n\nWhen Google Ads has no value, three things happen. The algorithm cannot prioritise high-revenue traffic, because it cannot see which traffic is high-revenue. It defaults to count optimisation, spending to maximise the number of conversions regardless of what each one is worth. And budget shifts toward whatever campaign cranks out cheap conversions, usually branded search or remarketing, at the expense of upper-funnel campaigns that are actually driving the high-value buyers.\n\nThe Google Ads side of the fix is one setting. The hard part is upstream. The value has to flow from the site to the dataLayer, from the dataLayer to the GTM tag, from the GTM tag to Google Ads. If any link in that chain is broken, fixing the Google Ads setting only exposes the next broken link. Audits commonly find this in roughly a third of e-commerce accounts, which makes it the single most common preventable cause of underperforming Target ROAS campaigns.',
    howToFix:
      '1. In Google Ads, open Tools & Settings → Measurement → Conversions and select each flagged action. 2. Under Value, switch from "Don\'t use a value" or "Use the same value" to "Use different values for each conversion." 3. Open the GTM tag that fires this conversion. It needs to pass a value parameter, typically `{{DLV - ecommerce.value}}` from a Data Layer Variable. If the value parameter is empty or hardcoded, fix `missing-datalayer-variables` and `ecommerce-datalayer-structure` first. 4. Set a default value in Google Ads as a fallback for the rare case where the dataLayer value cannot be resolved (typically the rolling average order value). 5. Wait 7 days, then check Google Ads → Conversions for non-zero values on the flagged actions. If you still see zeros, the upstream pipeline is broken, not Google Ads.',
    example: 'Google Ads conversion value setting: Use different values for each conversion\nGTM value parameter: {{DLV - ecommerce.value}}',
    citationTemplate:
      'This account has Google Ads purchase or sale conversion actions configured with no revenue value. Per Google\'s value-based-bidding documentation, automated strategies such as Target ROAS and Maximize Conversion Value require non-zero per-conversion values to optimise toward revenue rather than volume. Zero-value purchases collapse these strategies into count-based optimisation, biasing spend toward low-revenue traffic. Fix: switch the action to "Use different values for each conversion," confirm the value parameter flows from GTM, and verify non-zero reported values within one reporting cycle. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['roas-feasibility', 'roas-sanity', 'value-mismatch'],
  },
  {
    id: 'missing-primary-conversion',
    name: 'Missing Primary Conversion',
    source: 'ads',
    severity: 'warning',
    summary: 'Google Ads has no enabled purchase or sale conversion action suitable as the primary bidding goal.',
    directAnswer:
      'No enabled Google Ads conversion action in this account is suitable to serve as a Primary bidding goal. Either nothing is marked Primary, or the actions marked Primary are micro-conversions (signups, page views, add-to-carts) rather than the macro business outcome. Smart Bidding optimises toward Primary actions, so campaigns are currently optimising toward the wrong target.',
    why: 'Google Ads splits conversion actions into Primary (counted in the "Conversions" column, drives Smart Bidding) and Secondary (recorded for analysis, not bidding). When the macro action. Usually Purchase for e-commerce, Lead for B2B. is absent, disabled, or set to Secondary, Smart Bidding finds no signal to optimise against and falls back to whichever Primary action exists, even if that action is a weak indicator of business value. The most common failure mode: a team enables "Add to Cart" as Primary "to give the algorithm more signal" and the campaigns proceed to drive cart-additions that never check out. The account looks active in reports but is not generating revenue proportional to spend.',
    howToFix:
      '1. In Google Ads, open Tools & Settings → Measurement → Conversion goals. 2. Identify the single business outcome that defines campaign success. Purchase for e-commerce, Lead/Form Submission for B2B, App Install + In-App Purchase for app campaigns. 3. Ensure that action is enabled and marked Primary in the Conversion goal settings. 4. Demote micro-actions (page view, scroll, add-to-cart, video-watch) to Secondary. They still report for analysis but do not influence Smart Bidding. 5. Open each active campaign\'s goal settings and confirm it inherits the account-default Primary goal. Campaigns occasionally have their own goal overrides that bypass account-level changes.',
    example: 'Primary: Purchase\nSecondary: Add to cart, Begin checkout, Newsletter signup',
    citationTemplate:
      'This Google Ads account has no enabled Primary conversion action suitable for value- or volume-based Smart Bidding. Google\'s conversion goal documentation, Smart Bidding optimises exclusively toward Primary conversions; the absence of a macro Primary action causes campaigns to optimise toward weaker proxies or to fall back to count-only strategies. Fix: identify the single macro business outcome, mark it Primary, and demote micro-conversions to Secondary. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. Primary vs Secondary conversion actions',
        url: 'https://support.google.com/google-ads/answer/9143218',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['micro-conversion-pollution', 'smart-bidding-volume', 'no-primary-conversion'],
  },
  {
    id: 'smart-bidding-volume',
    name: 'Smart Bidding Readiness',
    source: 'ads',
    severity: 'warning',
    summary: 'The account may not have enough enabled primary conversion volume for stable Smart Bidding.',
    directAnswer:
      'This account\'s Primary conversion volume is below the threshold Google recommends for stable Smart Bidding (~15-30 conversions per bidding portfolio per month). With sparse signal, automated bidding strategies like Target CPA and Target ROAS optimise from noise, produce volatile CPA, and enter extended learning periods after every change.',
    why: 'Google\'s Smart Bidding algorithms learn from conversion patterns. With high volume (50+ per portfolio per month) the model converges quickly and bidding is stable. With low volume (under 15-30 per month) the model has too few data points to distinguish signal from noise, so every conversion is treated as evidence for a pattern that may not generalise. Symptoms: CPA swings wildly week-to-week, the "Learning" status sticks for 7-14 days after any change, and apparent campaign performance is dominated by which conversions happened to fire rather than what the campaign actually did. The recommended response is rarely "more aggressive bidding". it is consolidation of conversion goals or a temporary switch to Maximize Clicks or a simpler bidding strategy until volume grows.',
    howToFix:
      '1. In Google Ads, open Tools & Settings → Measurement → Conversions and check the All conversions (last 30 days) for each Primary action. 2. If any Primary action has < 15 conversions per month per bidding portfolio: (a) consolidate duplicate actions (one canonical Primary per business event), (b) widen the conversion definition (e.g. Count both "submitted lead" and "qualified lead" as one Primary if both are valuable), or (c) switch the campaign to Maximize Clicks or a non-Smart-Bidding strategy until volume builds. 3. If volume is healthy: this check is informational; no action needed. 4. Re-run after 30 days to see if the consolidation moved the account above the threshold.',
    example: 'Healthy target: 15-30+ primary conversions per month per bidding portfolio before aggressive tCPA or tROAS constraints',
    citationTemplate:
      'This Google Ads account\'s Primary conversion volume is below the Google-recommended threshold for stable Smart Bidding (~15-30 conversions per bidding portfolio per month). Google\'s Smart Bidding learning documentation, sparse conversion data produces unstable CPA and prolonged learning periods. Fix: consolidate Primary actions, widen the conversion definition where appropriate, or use a simpler bidding strategy until volume builds. Source: support.google.com/google-ads/answer/7065882.',
    references: [
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About the learning period for Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/12047999',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'micro-conversion-pollution'],
  },
  {
    id: 'short-attribution-windows',
    name: 'Attribution Window Too Short',
    source: 'ads',
    severity: 'warning',
    summary: 'Conversion click windows are shorter than the likely sales cycle.',
    directAnswer:
      'One or more Google Ads conversion actions use a click-through window shorter than the typical click-to-conversion delay for this business. Conversions that happen after the window closes are not attributed to the ad click, which underreports campaign performance. Especially for upper-funnel and remarketing traffic where delay is normal.',
    why: 'Google Ads attribution windows define how long after an ad interaction a conversion can be credited to that interaction. The default click-through window varies by conversion type (90 days for most goals, shorter for some). When a team has manually shortened the window. Usually during a previous "let\'s only count immediate conversions" initiative. That any conversion taking longer than that window simply doesn\'t exist in Google Ads reports. The campaign appears to perform worse than it does, Smart Bidding learns from incomplete feedback, and budget shifts away from campaigns whose real value shows up after the window expires. This is most damaging for B2B (long sales cycles), considered purchases (cars, mortgages, furniture), and any flow where the conversion involves a non-immediate decision.',
    howToFix:
      '1. Determine the real click-to-conversion delay for each conversion action. Google Ads → Reports → Predefined → Time → Time lag shows the distribution. 2. Pick a window that captures the 90th percentile of historical conversion lag. Typical values: 7-14 days for immediate direct-response purchases, 30 days for medium-cycle considered goods, 60-90 days for B2B leads and SaaS trials. 3. In Tools & Settings → Measurement → Conversions, edit each flagged action and update Click-through conversion window. 4. Annotate the change date. Historical conversion counts will retroactively increase as previously-uncounted conversions enter the new window. 5. Wait one full cycle (60-90 days) before judging restored campaign performance against the new baseline.',
    example: 'Problem: B2B demo request uses a 3-day click window while the median click-to-lead delay is 12 days',
    citationTemplate:
      'Google Ads conversion actions with click-through attribution windows shorter than the typical click-to-conversion delay for this business. Google\'s attribution window documentation, conversions occurring after the window closes are not attributed to the ad click. Producing systematic underreporting for any traffic source where conversion delay is normal. Fix: review historical conversion lag distribution in the Time Lag report and extend the click-through window to capture the 90th percentile of real conversion delay. Source: support.google.com/google-ads/answer/7065882.',
    references: [
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
      {
        label: 'Google Ads. About attribution reports',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['model-attribution-drift', 'long-attribution-windows', 'attribution-window-mismatch'],
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
    why: 'Value mismatches make revenue reports unreliable even when conversion counts look correct. A fixed GTM value can override dynamic purchase revenue, or Google Ads settings can imply a different value strategy than the tag actually sends. This breaks ROAS, value-based bidding, and finance reconciliation.',
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
      'You have a Conversion Linker in the container. Good. But it is not declared as a setup tag for your Google Ads conversion tags. On a fast page load the linker happens to fire first and everything works. On a slow load, a redirect-heavy checkout, or a consent banner mid-page, the order flips. The conversion tag fires before the GCLID has been written to `_gcl_aw`, and that conversion ships without click context. The dashboards still look fine.',
    why: 'Adding the Conversion Linker tag is necessary. It is not sufficient. GTM does not guarantee any ordering between two tags that share the same trigger. Whichever one finishes its setup first, fires first. That depends on resource loading, consent state, redirects, third-party script injection, and a dozen other things you cannot predict from inside Preview mode.\n\nHere is the failure mode. The Conversion Linker reads `gclid` from the URL and writes it to a first-party cookie called `_gcl_aw`. The Google Ads conversion tag, when it fires, reads `_gcl_aw` and sends whatever it finds along with the conversion request. If the conversion tag wins the race, `_gcl_aw` is empty, and the conversion is reported without a GCLID. Google still counts it. It just has no idea which campaign drove it.\n\nThe maddening part is that the failure is intermittent. In Preview mode on a fast dev machine the linker always wins. In production, on a slow connection, behind a privacy proxy, or when the user clicks through a consent banner that triggered a tag reload, the conversion tag occasionally wins. Some users get attribution. Some do not. The dashboard averages out to "mostly working" until somebody runs an audit like this one.\n\nGTM has a feature designed exactly for this. Tag Sequencing. You declare that Tag B requires Tag A to fire first. GTM honors the declaration on every fire, regardless of timing. The fix is to mark the Conversion Linker as a setup tag for every Google Ads conversion tag.',
    howToFix:
      '1. In GTM, open Workspace → Tags. Pick the first Google Ads Conversion Tracking tag. 2. Expand Advanced Settings → Tag Sequencing. 3. Tick "Fire a tag before [this tag] fires." Select your Google Ads Conversion Linker as the setup tag. 4. Leave "Don\'t fire [this tag] if [setup tag] fails or is paused" unchecked. If the linker is paused for some reason you usually still want the conversion tag to fire (you just lose the GCLID for that conversion). 5. Repeat for every Google Ads Conversion Tracking tag in the container. Yes, all of them. The sequencing has to be declared per-tag. 6. In Preview mode, complete a test conversion. Check the Tags Fired panel. The Conversion Linker should appear immediately before each conversion tag, on the same event. Only publish after you have seen the sequencing in Preview. Inferring it from the configuration screen is not enough.',
    example: 'Setup tag: Google Ads Conversion Linker\nConversion tag: Google Ads - Purchase\nTag sequencing: Fire setup tag before Google Ads - Purchase fires',
    citationTemplate:
      'This GTM container has Google Ads conversion tags that share a trigger with the Conversion Linker but do not declare it as a setup tag. Per Google\'s Tag Sequencing documentation, GTM does not guarantee execution order between tags sharing a trigger; explicit Tag Sequencing is required when one tag depends on the side effects of another. Without it, the conversion tag can fire before the GCLID has been written to `_gcl_aw`, producing intermittent attribution loss that does not show up in dashboards. Fix: configure each Google Ads conversion tag\'s Tag Sequencing to require the Conversion Linker as a setup tag, and verify in Preview. Source: support.google.com/tagmanager/answer/6238868.',
    references: [
      {
        label: 'Google Tag Manager. Tag sequencing',
        url: 'https://support.google.com/tagmanager/answer/6238868',
      },
      {
        label: 'Google Tag Manager. Conversion Linker',
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
    directAnswer:
      'One or more Google Ads conversion actions use click-through windows misaligned with the sales-cycle context configured in the audit (short window on a long-consideration purchase, or vice versa). Either direction degrades data quality: a window too short drops valid conversions; a window too long pulls in delayed activity that is unlikely to be ad-attributable.',
    why: 'A conversion window is a tradeoff between completeness and causal cleanliness. Short windows are tighter on causality (the click probably caused this conversion) but lose late conversions. Long windows recover late conversions but increasingly include conversions that would have happened anyway. The right window depends on the actual click-to-conversion delay for the business. Not on a default, and not on what feels intuitive. AdLint compares each conversion action\'s window against the sales-cycle context the user set during audit configuration (short / medium / long) and flags mismatches. The damage is bidirectional: short windows on B2B campaigns make remarketing look bad; long windows on impulse-purchase categories inflate apparent campaign effectiveness with conversions that would have happened anyway.',
    howToFix:
      '1. AdLint\'s details show each flagged action and the mismatch direction. 2. For short-on-long mismatches: extend the click-through window using the time-lag distribution in Google Ads Reports as the guide (target the 90th percentile). 3. For long-on-short mismatches: shorten the window so it captures the realistic causal window. For an impulse purchase that almost always converts within 24 hours, a 90-day window is mostly noise. 4. Update click-through windows in Tools & Settings → Measurement → Conversions. 5. Annotate the change date and wait one full cycle before judging performance against the new baseline.',
    example: 'Problem: Demo Request uses a 7-day click window with a long sales cycle\nBetter: Demo Request click-through conversion window = 60 days',
    citationTemplate:
      'Google Ads conversion actions with click-through windows misaligned to the sales cycle. Google\'s attribution window documentation, the window should reflect the real click-to-conversion delay distribution; mismatches systematically distort campaign performance reporting and Smart Bidding signal. Fix: align click-through windows to the 90th percentile of historical conversion lag and re-baseline campaigns after one full cycle. Source: support.google.com/google-ads/answer/3123169.',
    references: [
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['short-attribution-windows', 'long-attribution-windows', 'model-attribution-drift', 'smart-bidding-volume'],
  },
  {
    id: 'cross-domain-tracking',
    name: 'Cross-Domain Tracking Misconfigured',
    source: 'gtm',
    severity: 'warning',
    summary: 'The container references multiple domains, but the Conversion Linker is not configured with auto-link domains.',
    directAnswer:
      'This container has a Conversion Linker tag, but its auto-link domains list does not cover every domain in the conversion funnel. When a user clicks from the marketing site to a separately-hosted checkout, booking engine, or payment processor, Google Ads cannot connect the conversion back to the ad click. The GCLID lives in a cookie scoped to one domain and never reaches the other.',
    why: 'Many real funnels span domains: a Shopify store with a `shop.brand.com` checkout, a SaaS marketing site with a `app.brand.com` signup flow, a hotel website with a `book.brand-reservations.com` engine, a charity with a `donate.thirdparty.org` form. The GCLID is stored in the `_gcl_aw` first-party cookie on the original domain. Without auto-link configuration, that cookie does not follow the user to the second domain. The browser\'s same-origin policy prevents it. The Conversion Linker tag accepts a list of domains it should auto-decorate outbound links with the linker parameter (`_gl=...`); the receiving domain reads that parameter and re-establishes the `_gcl_aw` cookie there. If the funnel crosses a domain not in the list, the GCLID is lost, the conversion is attributed to a different source or direct, and Smart Bidding learns from a degraded signal. The check fires when AdLint sees container hostnames that suggest a multi-domain funnel but the linker domain list is empty or too narrow.',
    howToFix:
      '1. List every domain that can appear in the conversion funnel, including payment processors, booking engines, partner platforms, and any subdomain that hosts forms or checkout. 2. In GTM, open Workspace → Tags → the Conversion Linker tag → Linker Settings. 3. Enable "Automatically link domains" and paste the comma-separated list of all funnel domains. 4. Confirm the Conversion Linker still fires on All Pages so outbound links from any page get auto-decorated. 5. In Preview mode, start on the source domain, click a link to the destination domain, and inspect the URL. it should contain a `_gl=` parameter. 6. Open Application → Cookies in DevTools on the destination domain and verify `_gcl_aw` is set. Publish only after the round-trip works on the real navigation path, not a direct page load.',
    example: 'Auto-link domains: example.com, checkout.example-payments.com, booking.example.net\nTrigger: All Pages',
    citationTemplate:
      'This GTM container\'s Conversion Linker is not configured with the auto-link domain list required for the multi-domain funnel observed in the configuration. Google\'s cross-domain measurement documentation, the GCLID must be propagated across domains via the linker parameter to maintain attribution. Without this configuration, conversions on hosted checkout, booking, or payment domains will not be attributed to the originating ad click, degrading Google Ads ROAS reporting and Smart Bidding signal. Fix: add every funnel domain to the Conversion Linker auto-link list and verify the round-trip in Preview mode. Source: support.google.com/google-ads/answer/7521212.',
    references: [
      {
        label: 'Google Ads. About cross-domain measurement',
        url: 'https://support.google.com/google-ads/answer/7521212',
      },
      {
        label: 'Google Tag Manager. Conversion Linker',
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
    directAnswer:
      'Your conversion actions are reporting values in more than one currency. USD, EUR, sometimes blank. Google Ads does not normalise across currencies for bidding. Smart Bidding is summing €100 and $100 as 200, and your aggregate ROAS column is meaningless until you fix this.',
    why: 'Google Ads supports per-conversion currency codes. The system assumes the team configures them consistently. When that assumption breaks, two things go wrong, both bad.\n\nValue-based bidding compares conversion values directly, without exchange-rate normalisation. A Target ROAS strategy that sees €100 and $100 treats them as economically equivalent. They are not. Depending on the day, the dollar value of €100 is anywhere from $105 to $115. The optimisation signal is corrupted by exactly the exchange-rate noise the team thought Google was handling. And aggregate reports become impossible to reconcile. The "conversion value" total in Google Ads is a sum of different currencies, so it does not match any one number in the e-commerce backend.\n\nThree patterns produce this. Multi-region e-commerce sites that push the local currency without normalising before reporting. GTM containers where the currency code is hardcoded to one value (usually USD) but the actual transaction value is in EUR or GBP, so the value matches the customer\'s purchase but the currency lies. And Google Ads conversion imports where the Currency column was left blank or filled differently in different upload sessions.\n\nUntil this is fixed, every Target ROAS decision, every value-based reporting metric, and every cross-region comparison is suspect.',
    howToFix:
      '1. Decide the account-level reporting currency. Usually this is the company\'s functional currency, not the customer\'s. 2. For GTM-managed conversions, open the Google Ads Conversion Tracking tag. Set Currency Code to a Data Layer Variable that resolves to the right ISO code, typically `{{DLV - ecommerce.currency}}`. Do not hardcode it. 3. For multi-region sites, pick one of two approaches and document it. Either (a) pass the local currency consistently and let Google Ads convert at the daily exchange rate, or (b) normalise to the reporting currency on the site before pushing to dataLayer. Both are valid. Mixing them is not. 4. For Google Ads conversion imports, standardise the Currency column on every upload. An empty Currency column means Google falls back to the account default, which can be different from what the import data was actually in. 5. Run a test conversion. Verify in Google Ads → Conversions that the Currency column shows the expected ISO code.',
    example: 'Expected currency code: USD\nGTM Currency Code field: {{DLV - ecommerce.currency}}\ndataLayer value: ecommerce.currency = "USD"',
    citationTemplate:
      'This account has Google Ads conversion actions reporting values in more than one currency code. Per Google\'s conversion-value documentation, value-based bidding and aggregate reporting assume consistent currency within each conversion action; mixed currencies are summed without exchange-rate normalisation, corrupting Target ROAS optimisation and producing aggregate totals that do not reconcile against backend revenue. Fix: standardise on the account reporting currency or pass per-conversion currency consistently from the site, and verify in Google Ads reports. Source: support.google.com/google-ads/answer/2998565.',
    references: [
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. Currency conversion in conversion tracking',
        url: 'https://support.google.com/google-ads/answer/2998565',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'value-mismatch', 'roas-sanity'],
  },
  {
    id: 'debug-tags-in-production',
    name: 'Preview/Debug Tags in Production',
    source: 'gtm',
    severity: 'warning',
    summary: 'Tags with debug, test, preview, staging, or dev names are firing on All Pages in the production container.',
    directAnswer:
      'One or more tags with debug-style names (containing "debug," "test," "preview," "staging," or "dev") are firing on the production All Pages trigger. These tags were almost certainly created during implementation and forgotten. They can ship duplicate conversions, leak implementation details to third-party endpoints, or interfere with real diagnostics.',
    why: 'Debug-named tags are a recognised anti-pattern in GTM operations because they signal a workflow problem: a tag was created to verify something during implementation, the implementation shipped, but the debug tag was never paused or removed. The risk depends on what the tag actually does. A "Debug. GA4 event" tag firing on every production page can duplicate every legitimate GA4 event, doubling reported conversions. A "Test. Custom HTML" tag can leak a development webhook URL or analytics ID to every visitor. A "Staging. Pixel" tag firing in production can pollute remarketing audiences with users who were never meant to be in them. Beyond the direct data risk, debug tags clutter Tag Assistant and Preview mode, making real implementations harder to audit. The check is strict. it flags by name pattern, not by behaviour. Because the name itself is the operational signal that something is unfinished.',
    howToFix:
      '1. In GTM, open Workspace → Tags and use the search box to filter on each of these terms: `debug`, `test`, `preview`, `staging`, `dev`. 2. For each flagged tag, decide one of three actions. (a) If the tag is no longer needed, pause it (clock icon) or delete it. (b) If it is needed for ongoing diagnostics, restrict its trigger so it can never match production users. Add a Page Hostname condition like `equals staging.example.com` or a `Debug Mode` condition that only fires in Preview. (c) If it should remain active in production but was misnamed, rename it to remove the debug terminology so future audits do not flag it. 3. Re-run AdLint after publishing to confirm the check has cleared.',
    example: 'Problem: Debug - GA4 event fires on All Pages\nBetter: Debug - GA4 event fires only when Page Hostname equals staging.example.com',
    citationTemplate:
      'GTM tags with debug, test, preview, staging, or dev in their names that are configured to fire on the production All Pages trigger. While the audit cannot determine the runtime behaviour of each tag, the name pattern indicates unfinished implementation work. Per GTM workspace governance best practice, debug tooling should be scoped to non-production environments via hostname conditions, the GTM Environments feature, or a dedicated testing workspace. Fix: pause, delete, or scope each flagged tag, and re-publish the container. Source: support.google.com/tagmanager/answer/6311518.',
    references: [
      {
        label: 'Google Tag Manager. Use environments',
        url: 'https://support.google.com/tagmanager/answer/6311518',
      },
      {
        label: 'Google Tag Manager. Preview and debug',
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
      'This container has multiple GTM Data Layer Variables bound to the same dataLayer path. For example, both `DLV - value` and `DLV - purchase revenue` reading `ecommerce.value`. This is a maintenance hazard: when someone updates one variable\'s version or default value, the other copy continues to feed downstream tags, producing inconsistent behaviour across tags that should be reading the same business value.',
    why: 'GTM lets you create as many Data Layer Variables as you want, and nothing prevents two of them from pointing at the same dataLayer key. In practice this is how containers accrete legacy: one variable created during a 2021 GA4 migration, another created in 2023 when a new dev was unsure whether the first existed, a third created for a new pixel that "needed its own copy." Each variable can have its own Data Layer Version setting, default value, format value, and conversion settings. When they drift. And they always drift. Two conversion tags that nominally read the same revenue value resolve it differently. One reports $129.99, another reports the default $0, and the audit becomes a forensic exercise. The check is informational about size but operationally important: every duplicate is a place future engineers will introduce inconsistency.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables and sort by Data Layer Variable Name. 2. For each duplicated path, pick the variable with the cleanest name and the correct Version setting as canonical (prefer naming like `DLV - ecommerce.value`). 3. Update every tag and trigger that references a duplicate to point at the canonical variable instead. GTM\'s "Find references" link on each variable shows where it is used. 4. In Preview mode on a real conversion event, confirm the canonical variable resolves to the expected value. 5. Archive (do not delete) the duplicates. Archiving preserves audit history if something needs to be rolled back. 6. Publish and re-run AdLint.',
    example: 'Problem:\nDLV - value -> ecommerce.value\nDLV - purchase revenue -> ecommerce.value\n\nBetter:\nDLV - ecommerce.value -> ecommerce.value',
    citationTemplate:
      'Multiple GTM Data Layer Variables bound to the same dataLayer path within this container. Google\'s Data Layer Variable documentation, each dataLayer path should be exposed through a single canonical variable to ensure consistent resolution across tags. Duplicated paths create silent drift when Version, default value, or format settings diverge between copies. Producing tags that report different values for the same underlying business event. Fix: consolidate duplicated paths to a single canonical Data Layer Variable, update tag references, and archive the duplicates. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types (Data Layer Variable)',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
      {
        label: 'Google Tag Manager. Data Layer reference',
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
    directAnswer:
      'One or more conversion actions in this account use Data-Driven Attribution (DDA), which assigns credit using machine-learned path analysis. DDA requires enough recent conversion volume to produce stable credit assignment; below that threshold, the model is noisy or falls back to last-click, making attribution-based decisions unreliable.',
    why: 'Data-Driven Attribution is Google\'s ML-based alternative to fixed rules like last-click or linear. It learns from observed conversion paths in the account and assigns fractional credit to each touchpoint. The model is powerful when given enough data. Google has historically required several hundred conversions and several thousand ad interactions within 30 days for DDA to fully activate, though the exact thresholds have evolved. Below threshold, DDA either falls back to a simpler model behind the scenes or produces unstable credit assignments that swing between reporting periods. The risk is interpretation: teams discuss DDA-attributed credit as if it is precise ("Campaign X gets 35% credit") when the underlying model may be running on too little signal to support that precision. This check is info-level because eligibility status is only visible in the Google Ads UI itself; AdLint can flag the configuration but not verify the model state.',
    howToFix:
      '1. In Google Ads, open Tools & Settings → Measurement → Attribution. 2. For each flagged conversion action, check the model status and recent volume. DDA-eligible actions show a green status; ineligible or low-volume actions show a warning. 3. If a flagged action is showing insufficient volume: (a) consolidate duplicate conversion actions (one canonical Primary per business event), or (b) temporarily switch to a simpler attribution model (Position-based, Linear, or Last-click) while volume builds. 4. Document the attribution model chosen for each action. Reporting, bidding, and client-facing decks should all use the same attribution assumption to avoid confusion.',
    example: 'Review target: Purchase\nAttribution model: Data-driven\nRecent volume: confirm eligibility and stability in Google Ads Attribution before relying on the model',
    citationTemplate:
      'Google Ads conversion actions configured with Data-Driven Attribution. Google\'s attribution model documentation, DDA requires sustained conversion volume to produce stable credit assignment; low-volume actions may fall back to simpler models behind the scenes, making attribution-based reporting unreliable. Fix: verify eligibility status in Google Ads Attribution, consolidate duplicate actions if volume is insufficient, and document the chosen model in team reporting materials. Source: support.google.com/google-ads/answer/6394265.',
    references: [
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
      {
        label: 'Google Ads. About Data-driven attribution',
        url: 'https://support.google.com/google-ads/answer/6394265#dda',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['model-attribution-drift', 'attribution-window-mismatch', 'smart-bidding-volume', 'inconsistent-attribution-models'],
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
      'This container has Data Layer Variables configured on both Version 1 and Version 2. The two versions resolve nested dataLayer paths differently. Version 2 can read into nested objects like `ecommerce.value`, while Version 1 cannot. Mixed-version containers produce two variables that read the same path but return different values, which breaks downstream conversion tracking in ways that are very hard to debug.',
    why: 'When GTM\'s Data Layer Variable feature shipped, it only supported flat paths. That was Version 1. Version 2 was introduced to support modern e-commerce dataLayer shapes with nested objects and arrays. Most modern containers should use Version 2 everywhere. The problem is that GTM does not auto-migrate variables when you set up a new container. Old variables stay on Version 1 indefinitely, and new variables default to Version 2. So a single container can end up with `DLV - oldRevenue` on V1 (which cannot read `ecommerce.value` and resolves to undefined) and `DLV - newRevenue` on V2 (which reads the same path correctly). A conversion tag wired to the older variable reports zero; one wired to the newer reports the real value. The root cause is invisible because the variables look identical in the UI unless you open them.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables. 2. Click each Data Layer Variable in turn and check the "Data Layer Version" field. 3. Standardise on Version 2 unless a specific variable has a documented reason to stay on V1 (rare; usually a legacy tag that depends on V1 behaviour). 4. After changing a variable from V1 to V2, complete a test event in Preview and confirm the variable still resolves to a non-empty value. Some legacy variables read top-level keys (e.g. `revenue`) rather than nested keys (`ecommerce.value`); upgrading to V2 should not break these, but verify. 5. Publish only when every Data Layer Variable in the container is on a consistent, documented version.',
    example: 'Variable: DLV - ecommerce.value\nData Layer Variable Name: ecommerce.value\nData Layer Version: Version 2',
    citationTemplate:
      'GTM Data Layer Variables on mixed versions (Version 1 and Version 2) within this container. Google\'s GTM variable documentation, Data Layer Version 2 is required to read nested dataLayer paths such as `ecommerce.value`; Version 1 cannot resolve them. Mixed-version containers produce variables that read the same path but return different values, breaking conversion measurement in ways that are not visible in the GTM Tags screen. Fix: standardise every Data Layer Variable on Version 2 unless explicitly required otherwise, and verify resolution in Preview before publishing. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types (Data Layer Variable)',
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
      'Enhanced Conversions is turned on for one of your conversion tags. The user-data fields are empty. So the feature is on in name only. Google Ads receives the conversion but none of the hashed identifier that makes Enhanced Conversions worth turning on in the first place. Match rate sits at zero. The team probably thinks the feature does not work.',
    why: 'Enhanced Conversions is the highest-leverage measurement feature Google Ads has shipped since GDPR started shrinking attribution. The mechanic: when a user completes a conversion, GTM grabs their email (or phone, name, address) from the conversion page, hashes it with SHA-256, and sends it to Google Ads alongside the conversion. Google looks at signed-in Google users who clicked an ad. If the hashed identifier matches a signed-in user, attribution is restored, even when the third-party cookie was blocked.\n\nIt works. When configured. The whole mechanism is contingent on populated user data being present at conversion time.\n\nThe failure mode this check catches is straightforward: the tag has Enhanced Conversions turned on, but the user-data parameter is either unmapped, mapped to a Data Layer Variable that resolves to empty, or pointed at a dataLayer field the conversion page never pushes. The tag fires. Google records the conversion. The hashed identifier is missing. Google has nothing to match against. The Diagnostics panel in Google Ads shows a 0% match rate.\n\nWhen teams see 0% they almost always blame the feature, not the implementation. That is the wrong inference. The feature works. Yours is not feeding it data.',
    howToFix:
      '1. Pick a conversion page. Order-confirmation, signup-success, lead-thank-you. Open the rendered HTML or inspect the dataLayer at that moment. The user\'s email or phone should be present in the dataLayer or in a known DOM element. If neither, talk to the engineer who owns the page first; you cannot fix this from GTM alone. 2. In GTM, create a Data Layer Variable per field (e.g. `DLV - customer.email`). Do not hash anything in GTM. Google does the hashing automatically inside the Enhanced Conversions parameter. Hashing twice gives Google an unmatchable token. 3. Open the Google Ads Conversion Tracking tag, turn on Enhanced Conversions, pick "Code" mode (more reliable than "Automatic" for non-trivial conversion pages), and map `email`, `phone_number`, `address.first_name`, `address.last_name`, `address.postal_code`, `address.country` to the corresponding DLVs. 4. In Preview mode, complete a real test conversion. Use DevTools → Network to inspect the outgoing request to googleads.g.doubleclick.net or googleadservices.com. Look for a `pii=` or `em=` parameter with a hashed value (long base64 string). If the parameter is missing or empty, the mapping is broken. 5. Wait 7-14 days, then check Google Ads → Tools → Conversions → Diagnostics. Match rate above 70% means the feature is doing real work. Below 30% means the DLVs are mostly resolving empty in production even if Preview looked fine.',
    example:
      'Tag: Google Ads - Purchase Conversion\nEnhanced Conversions: Enabled, mode = Code\nemail: {{DLV - customer.email}}\nphone_number: {{DLV - customer.phone}}\naddress.first_name: {{DLV - customer.firstName}}\naddress.last_name: {{DLV - customer.lastName}}\naddress.postal_code: {{DLV - customer.postalCode}}\naddress.country: {{DLV - customer.country}}',
    citationTemplate:
      'This GTM container has Enhanced Conversions enabled on one or more Google Ads Conversion Tracking tags, but the user-data fields are unmapped or resolve to empty values. Per Google\'s Enhanced Conversions for Web documentation, the feature requires populated first-party user data (email, phone, or address) at conversion time to recover attribution lost to cookie restrictions and cross-device gaps. Without populated user data, the conversion is reported but no match signal is sent: the match rate is zero and Enhanced Conversions provides no measurable lift. Fix: map first-party customer fields from the conversion-page dataLayer into the tag\'s Enhanced Conversions configuration, then verify the Diagnostics match rate in Google Ads after 7-14 days. Source: support.google.com/google-ads/answer/9888656.',
    references: [
      {
        label: 'Google Ads. About Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/9888656',
      },
      {
        label: 'Google Ads. Set up Enhanced Conversions for web with Google Tag Manager',
        url: 'https://support.google.com/google-ads/answer/13262500',
      },
      {
        label: 'Google Tag Manager. Enhanced Conversions user-provided data variable',
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
      'GTM does not enforce naming conventions, so containers accumulate inconsistent names over time. "GA4 Event," "ga4-purchase," "Purchase (GA4)," "PurchaseEvent_v2" all coexisting. The technical impact is zero. The operational impact is significant: every new audit, handoff, or change requires re-reading every tag to understand what it does, and findings become harder to defend to clients because they cannot tell which tag handles which business event.',
    why: 'Naming conventions are governance, not configuration. And governance is what separates a container that can be audited in 30 minutes from one that takes a day. The most widely-adopted convention in the GTM community uses prefix-based naming: tags as `<Platform> - <Event>` (e.g. `GA4 - Purchase`, `Google Ads - Lead`), triggers as `<Type> - <Description>` (e.g. `Custom Event - purchase`, `Click - CTA Button`), and variables as `<Type> - <Source>` (e.g. `DLV - ecommerce.value`, `CJS - User Agent`). The benefit is searchability: filtering by `GA4 -` shows every GA4 tag instantly, and the same prefix tells reviewers what platform owns the data. AdLint flags this check when more than 40% of tags, triggers, or variables deviate from a detectable convention. Not because the names are "wrong," but because inconsistency is a leading indicator of governance issues that show up later as duplicate tags, conflicting triggers, and audit findings that take longer to remediate than they should.',
    howToFix:
      '1. Pick a convention. The default in the GTM community: `<Platform> - <Event>` for tags, `<Type> - <Description>` for triggers, `<Type> - <Source>` for variables. Write it down in a one-page document. 2. Rename existing tags in batches by platform. Start with the most-modified tags (typically GA4 and Google Ads). Renaming is non-destructive in GTM. Version history preserves the old name. 3. After renaming, update related triggers and variables to follow the same convention. 4. For larger containers, consider creating a Naming Convention workspace solely for renames so the audit trail is clean. 5. Publish, then re-run AdLint to confirm the finding clears. 6. Document the convention in your team\'s GTM governance doc so new tags follow it by default.',
    example:
      'Inconsistent:\n  GA4 Event\n  ga4-purchase\n  Purchase (GA4)\n\nConsistent:\n  GA4 - Page View\n  GA4 - Purchase\n  GA4 - Add to Cart',
    citationTemplate:
      'That more than 40% of tags, triggers, or variables in this GTM container do not follow a detectable naming convention. While GTM does not enforce names, inconsistent naming is the highest-correlated indicator of governance debt that produces downstream duplicate tags, conflicting triggers, and prolonged audit cycles. Industry-standard GTM governance recommends prefix-based naming (e.g. `<Platform> - <Event>` for tags). Fix: adopt and document a naming convention, rename existing assets in batches, and treat naming as a publish-gating governance check. Source: support.google.com/tagmanager/answer/6103693.',
    references: [
      {
        label: 'Google Tag Manager. Help and best practices',
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
    why: 'Google publishes two operational ceilings for GTM containers. The first is a hard workspace size limit (currently around 200 KB of compressed container JSON for web containers). Once a container exceeds this, GTM refuses to publish the workspace and the team has to delete or archive assets before any new change can ship. The second is a soft tag-count threshold (200+ tags) where every page load executes the full GTM container script and runtime, so each additional tag adds milliseconds to Time-to-Interactive on every page. Sites that score in the 90s on Lighthouse can drop into the 70s purely from container weight. AdLint scores the container against both thresholds and flags accumulation early enough to act. The practical risk is two-fold: an emergency where a critical change cannot be deployed because the workspace is full, and a slow, invisible CWV regression that compounds with every new pixel or third-party tag.',
    howToFix:
      '1. In GTM, open Admin → Container Settings to see current container size relative to the limit. 2. In Workspace → Tags, sort by Last Edited and identify tags that have not changed in 12+ months and have no recent Tag Assistant evidence. These are candidates for archive. 3. Use the AdLint `stale-tags` and `unused-triggers` findings to identify safe-to-archive assets. Both ship hints about what is no longer load-bearing. 4. Archive (do not delete) the candidates in a dedicated cleanup workspace, then publish. Container size drops immediately. 5. For ongoing health, add a quarterly governance review where any tag untouched for 12 months is reviewed for archival. 6. If the tag count is high but everything is active, consider migrating high-traffic pixels (Meta, TikTok, LinkedIn) to server-side GTM to reduce client-side weight without losing functionality.',
    example: 'Container size: 168 KB of 200 KB (84% of limit)\nTag count: 187\nStale tags (last edited > 12 months ago): 41\nRecommended action: archive stale-tags candidates in a dedicated cleanup workspace.',
    citationTemplate:
      'This GTM container is approaching the documented workspace size limit and/or has accumulated a tag count above operational best practice. Google\'s Tag Manager limits documentation, web containers have a published workspace size limit and exceeding it blocks all new publishes. High tag counts also contribute to client-side page-load weight that compounds across every visitor. Fix: audit the container for stale and unused assets, archive candidates in a dedicated cleanup workspace, and consider migrating high-traffic pixels to server-side GTM. Source: support.google.com/tagmanager/answer/2649961.',
    references: [
      {
        label: 'Google Tag Manager. Container size and other limits',
        url: 'https://support.google.com/tagmanager/answer/2649961',
      },
      {
        label: 'Google Tag Manager. Server-side tagging overview',
        url: 'https://developers.google.com/tag-platform/tag-manager/server-side',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['stale-tags', 'unused-triggers', 'unused-variables'],
  },
  {
    id: 'conversion-error-handling',
    name: 'Conversion Tags Missing Error Handling',
    source: 'gtm',
    severity: 'critical',
    summary: 'Conversion tags fire on click or form-submit triggers without callback or sequencing safeguards.',
    directAnswer:
      'You have Google Ads conversion tags wired to click or form-submit triggers, with no "Wait for Tags" setting and no event callback. When a user clicks Submit, the browser starts navigating to the next page immediately. The conversion request often does not finish before navigation kills it. That conversion is gone, and you will never know it happened.',
    why: 'Conversion tags on click and form-submit triggers are in a race with the browser. The user clicks the button. The form posts. The browser starts navigating. Meanwhile, the conversion tag is opening a connection to googleads.g.doubleclick.net and trying to send the conversion. Whoever finishes first wins.\n\nOn a fast desktop with a fast connection, the conversion request takes maybe 50ms. The browser does not start navigating for around 200ms after the form submit (network round-trips, redirects, etc.). The conversion almost always makes it. So everything looks fine in QA, on the dev machine, in Preview mode.\n\nOn a phone over a flaky 4G connection, the conversion request can take 1500ms. The browser starts navigating at 300ms because the form post completed faster than usual. The conversion request is mid-flight when the navigation kills it. The conversion never arrives at Google Ads.\n\nThe result is a slow, invisible data loss that scales inversely with device speed. Fast devices report most of their conversions. Slow devices lose a chunk of them. Reported conversion data ends up biased toward fast-device demographics. Smart Bidding learns from biased data and shifts budget toward audiences whose conversions tend to make it through, which is not the same as audiences who actually convert.\n\nGoogle gives you three ways to fix this. Tag Sequencing with a setup tag that waits. An `eventCallback` parameter that delays the navigation until the tag completes. Or the trigger\'s built-in "Wait for Tags" option, which is the simplest and works for most cases.',
    howToFix:
      '1. In GTM, open Triggers. Find every Click or Form Submit trigger that fires conversion tags. 2. Open each trigger. Tick "Wait for Tags." Set Max Wait Time to 2000ms. That gives the conversion request up to 2 seconds before the navigation forces through. 3. If a trigger fires Custom HTML conversion tags, add an `eventCallback` parameter that handles the navigation explicitly. This is more reliable than Wait-for-Tags for non-standard tags. 4. Use Tag Sequencing if the conversion tag has setup tags (Conversion Linker, Consent Mode init) that must fire first. 5. Verify in Preview mode with Network throttling set to Slow 3G (DevTools → Network). Submit the form. Confirm the conversion request shows a 200 response before the navigation completes. 6. Publish only after every flagged trigger has the configuration visible in Preview.',
    example: 'Trigger: Form Submit - Lead Capture\nWait for Tags: enabled, max wait = 2000ms\nCheck Validation: enabled',
    citationTemplate:
      'This GTM container has Google Ads conversion tags firing on navigation-triggering events (Click or Form Submit) without configured error handling. Per Google\'s Tag Manager trigger documentation, the "Wait for Tags" option or an event callback must be configured to prevent browser navigation from killing in-flight conversion requests. Without these safeguards, conversion data is lost on slow connections and slow devices in proportion to the latency of the conversion request, biasing reported data toward fast-device demographics. Fix: enable "Wait for Tags" with a 2000ms max wait on every flagged trigger and verify completion in Preview under throttled network conditions. Source: support.google.com/tagmanager/answer/7679219.',
    references: [
      {
        label: 'Google Tag Manager. Form submission trigger',
        url: 'https://support.google.com/tagmanager/answer/7679219',
      },
      {
        label: 'Google Tag Manager. Click triggers',
        url: 'https://support.google.com/tagmanager/answer/6106961',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-linker-sequencing', 'missing-conversion-linker'],
  },
  {
    id: 'remarketing-tag-issues',
    name: 'Remarketing Tag Issues',
    source: 'gtm',
    severity: 'warning',
    summary: 'Google Ads remarketing or Floodlight counter tags are missing required parameters.',
    directAnswer:
      'One or more remarketing tags in this container (Google Ads remarketing or Floodlight counter) are missing a required parameter. Typically the conversion ID or tag ID. The tag fires, but the request lacks the identifier Google needs to attach the visitor to the correct audience list.',
    why: 'Remarketing tags work by attaching the current visitor to an audience list identified by the conversion ID (Google Ads) or tag ID (Google Marketing Platform / Floodlight). When the ID is missing or unmapped, the tag fires but Google does not know which audience to update. The request is effectively a no-op. The damage is invisible from the GTM side because the tag shows green in Tag Assistant; the audience list fails to grow. Marketing teams discover this when remarketing campaigns underperform or list sizes mysteriously plateau, and the chain of debugging usually does not start at GTM.',
    howToFix:
      '1. In GTM, open Workspace → Tags and filter for tag type "Google Ads Remarketing" or "Floodlight." 2. For each flagged tag, open it and check the Conversion ID (Google Ads) or Tag ID (Floodlight) field. 3. If the field is empty, populate it with the correct ID from Google Ads → Audience Manager → Audience Sources, or from your DV360/Campaign Manager account. 4. If the field references a variable, confirm the variable resolves in Preview mode. 5. After publish, check Google Ads → Audience Manager → Audience Lists to confirm the list size starts incrementing within 24 hours.',
    example: 'Tag type: Google Ads Remarketing\nConversion ID: AW-123456789\nSegment configuration: All visitors',
    citationTemplate:
      'Google Ads remarketing or Floodlight tags in this container with missing required parameters (Conversion ID or Tag ID). Google\'s remarketing tag documentation, these identifiers are mandatory for the tag to associate the visitor with the correct audience list. Without them, the tag fires but performs no useful work; audience lists fail to populate. Fix: populate the missing ID parameter on every flagged remarketing tag and verify audience list growth in Google Ads after publishing. Source: support.google.com/google-ads/answer/2476688.',
    references: [
      {
        label: 'Google Ads. Set up Google Ads remarketing tag',
        url: 'https://support.google.com/google-ads/answer/2476688',
      },
      {
        label: 'Campaign Manager 360. Floodlight overview',
        url: 'https://support.google.com/campaignmanager/answer/2823388',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-conversion-linker', 'consent-violations'],
  },
  {
    id: 'datalayer-dependencies',
    name: 'DataLayer Variable Dependencies',
    source: 'gtm',
    severity: 'warning',
    summary: 'Tags reference Data Layer Variables that are not defined in the container.',
    directAnswer:
      'Tag parameters in this container reference variables using `{{Variable Name}}` syntax, but the named variables do not exist in the container\'s User-Defined Variables. At runtime, GTM resolves these placeholders to empty strings, so the tags fire with missing data. Currency, transaction ID, user identifiers, or whatever the unresolved variable was supposed to carry.',
    why: 'GTM\'s variable resolution is permissive: a tag can reference `{{DLV - ecommerce.value}}` even if no such variable exists. At runtime, GTM logs nothing and substitutes an empty string. The tag fires, looks healthy in Tag Assistant, but the field it was supposed to carry is empty. This is one of the highest-frequency causes of "the tracking is in place but reports are wrong" tickets. Common root causes: a variable was deleted but tag references were not updated; a tag was copy-pasted from another container with different variable names; a typo in the variable name (case-sensitive); or a variable that exists in a parent workspace but not in the current one.',
    howToFix:
      '1. Open the affected tag in GTM and list every `{{...}}` placeholder in the configuration. 2. For each placeholder, search Workspace → Variables → User-Defined Variables for an exact case-sensitive match. 3. Create any missing variables. Usually Data Layer Variables. With the correct Data Layer Variable Name and Version. 4. If a referenced variable is truly no longer needed, edit the tag to remove the placeholder. 5. In Preview mode, fire the tag and verify every parameter shows a resolved value (not an empty string). Publish after verification.',
    example: 'Tag references: {{DLV - customer.email}}\nWorkspace variable: missing (typo: {{DLV - customer.Email}})\nFix: create DLV - customer.email with Data Layer Variable Name = customer.email',
    citationTemplate:
      'Tag parameters in this container referencing Data Layer Variables that do not exist as User-Defined Variables. Google\'s GTM variable resolution behaviour, unresolved variable references evaluate to empty strings at runtime. The tag fires but the field is empty. This is a high-frequency cause of silent measurement degradation. Fix: audit each flagged tag, create the missing variables with correct Data Layer Variable Names and Versions, and verify resolution in Preview mode. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-datalayer-variables', 'duplicate-datalayer-paths', 'unused-variables'],
  },
  {
    id: 'trigger-conflicts',
    name: 'Trigger Conflicts',
    source: 'gtm',
    severity: 'warning',
    summary: 'Tags fire on multiple triggers with conflicting types, risking duplicate or misattributed fires.',
    directAnswer:
      'One or more tags in this container fire on multiple triggers of different types. For example, both a Page View trigger and a Custom Event trigger. The tag will fire on every match across all triggers, which can produce duplicate conversions or fires in contexts the tag was not designed for.',
    why: 'GTM evaluates each firing trigger independently. A tag attached to both a Page View and a Custom Event trigger fires every time either trigger matches. This is sometimes intentional (a GA4 Configuration tag firing on All Pages plus on a session-start custom event), but is more often a misconfiguration: someone added a trigger to "make sure" the tag fires and accidentally created a duplicate-fire path. The damage depends on the tag type. a configuration tag firing twice is harmless; a Google Ads conversion tag firing twice doubles the reported conversion. The check is strict. it flags any tag with mixed trigger types because the configuration intent cannot be inferred. But every flagged tag deserves a manual review.',
    howToFix:
      '1. In GTM, open each flagged tag and review the Firing Triggers list. 2. Ask: was this tag intentionally configured to fire on multiple trigger types, or did the second trigger get added accidentally? 3. If only one trigger is correct, remove the others. 4. If multiple triggers are intentional (e.g. For a tag that must fire on initial page load and on subsequent route changes in a SPA), document the intent in the tag\'s Notes field and add a description that future audits can recognize. 5. Use Preview mode to walk the most common user journeys (page load, form submit, navigation) and confirm the tag fires only the expected number of times per journey.',
    example: 'Tag: Google Ads. Purchase\nFiring triggers:\n  - Custom Event - purchase\n  - Page View - /thank-you (legacy, not removed)\nFix: remove the Page View trigger; the custom event is the canonical signal.',
    citationTemplate:
      'GTM tags configured with firing triggers of conflicting types. Google\'s Tag Manager trigger documentation, every trigger that matches the page event causes the tag to fire, which can produce duplicate or contextually-incorrect fires when triggers of different types are combined unintentionally. Fix: audit each flagged tag, remove unintended triggers, and document multi-trigger configurations that are intentional. Source: support.google.com/tagmanager/answer/6106961.',
    references: [
      {
        label: 'Google Tag Manager. About triggers',
        url: 'https://support.google.com/tagmanager/answer/6106961',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['overlapping-triggers', 'duplicate-conversions'],
  },
  {
    id: 'datalayer-naming-inconsistency',
    name: 'Inconsistent Data Layer Variable Naming',
    source: 'gtm',
    severity: 'warning',
    summary: 'Less than 80% of Data Layer Variables follow a single naming convention.',
    directAnswer:
      'Data Layer Variables in this container use mixed naming patterns. Some use `dot.notation`, others `camelCase`, others `snake_case`. The dominant pattern accounts for less than 80% of variables, which means the dataLayer is being read inconsistently across the container.',
    why: 'A consistent naming pattern for Data Layer Variables is a leading indicator of dataLayer governance discipline. When variables mix `ecommerce.value`, `ecommerceValue`, and `ecommerce_value`, three things break down. First, developers cannot predict the right path when adding a new tag and end up creating a new variable instead of reusing an existing one (see `duplicate-datalayer-paths`). Second, the dataLayer spec implied by GTM stops matching the dataLayer pushed by the site, because the site team and the GTM team have different mental models. Third, every audit takes longer because the auditor has to mentally normalize names before they can see what is actually configured. The threshold of 80% is chosen because some legacy variables will always exist; the goal is a clearly-dominant convention, not perfect uniformity.',
    howToFix:
      '1. Decide the canonical convention. The default in modern GTM implementations is dot-notation matching the GA4 ecommerce spec: `ecommerce.value`, `ecommerce.currency`, `ecommerce.items.0.item_id`. 2. In GTM, open Workspace → Variables → User-Defined Variables and identify variables that do not match. 3. For each non-matching variable, create a new variable with the canonical name and update tag references. 4. Archive the non-matching variables once nothing references them. 5. Document the convention in your team\'s GTM governance doc so new variables follow it by default.',
    example: 'Inconsistent:\n  ecommerce.value (dot-notation)\n  purchaseValue (camelCase)\n  transaction_total (snake_case)\n\nConsistent:\n  ecommerce.value\n  ecommerce.currency\n  ecommerce.transaction_id',
    citationTemplate:
      'Data Layer Variable naming inconsistency in this GTM container. Less than 80% of variables follow a single naming convention. Industry-standard GTM governance, the dominant convention is dot-notation matching the GA4 e-commerce specification. Naming inconsistency correlates with duplicate variable creation, audit friction, and dataLayer spec drift between the site and the container. Fix: adopt the GA4 dot-notation convention, rename non-matching variables, and document the convention in team governance materials. Source: developers.google.com/analytics/devguides/collection/ga4/ecommerce.',
    references: [
      {
        label: 'Google Analytics 4. E-commerce events naming reference',
        url: 'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['naming-conventions', 'duplicate-datalayer-paths'],
  },
  {
    id: 'unused-datalayer-variables',
    name: 'Unused Data Layer Variables',
    source: 'gtm',
    severity: 'info',
    summary: 'Data Layer Variables are defined in the container but never referenced by any tag or trigger.',
    directAnswer:
      'This container defines Data Layer Variables that no tag or trigger references. They exist in Workspace → Variables but are never read at runtime. The variables themselves cost nothing, but they are usually a signal that something was abandoned half-implemented, and they make audits harder by adding noise to the variable list.',
    why: 'Unused Data Layer Variables typically have three origin stories. (1) A migration left them behind. The old tag was removed but the variable that fed it was not. (2) An implementation was started but never finished. Variables were created in anticipation of tags that were never built. (3) A copy-paste from a sample container or another GTM workspace included variables that this site does not actually push to the dataLayer. None of these are runtime problems, but each one is a small audit-friction tax. The check is info-level because the impact is operational, not behavioural. But ignoring it long enough produces a container where finding the relevant variable means scrolling past 40 abandoned ones.',
    howToFix:
      '1. In GTM, open Workspace → Variables → User-Defined Variables and identify each Data Layer Variable in the audit\'s unused list. 2. For each one, use "Find references". Confirm GTM truly has no references. 3. Decide per variable: archive if no longer needed, or note in the variable description if it is being kept for a known-future use. 4. Archive (do not delete). Archiving preserves audit history and is reversible. 5. Re-run AdLint after the next publish to confirm the count clears.',
    example: 'DLV - oldRevenue → ecommerce.revenue\nReferences: 0 tags, 0 triggers\nAction: archive after confirming no upcoming work depends on it.',
    citationTemplate:
      'Data Layer Variables defined in this container that are not referenced by any tag or trigger. While unused variables do not affect runtime behaviour, they are an operational indicator of incomplete migrations or abandoned implementations and add friction to every audit cycle. Fix: confirm each variable is truly unused, then archive (not delete) to preserve audit history. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['unused-variables', 'unused-triggers', 'stale-tags'],
  },
  {
    id: 'circular-tag-dependencies',
    name: 'Circular Tag Dependencies',
    source: 'gtm',
    severity: 'warning',
    summary: 'Tag sequencing chains contain a cycle. Tag A depends on Tag B which depends on Tag A.',
    directAnswer:
      'GTM\'s Tag Sequencing feature lets one tag declare another as a setup tag that must fire first. a cycle in those declarations: Tag A is configured to fire after Tag B, but Tag B is configured to fire after Tag A. GTM resolves cycles by ignoring one side of the dependency, so the actual ordering is non-deterministic and likely wrong.',
    why: 'GTM has no compile-time validation for tag sequencing cycles. You can create Tag A with setup tag B, then edit Tag B to declare setup tag A, and the GTM UI accepts it silently. At runtime, GTM has to break the cycle somewhere. it does, but the choice is opaque, and the behaviour can change between container versions or even between page loads if other timing factors shift. This is almost always the result of two engineers editing tags in parallel without seeing each other\'s sequencing configuration. The damage is intermittent. The tags fire in unpredictable order, and any timing dependency between them (Conversion Linker → Conversion Tag) is unreliable. The fix is straightforward: identify the cycle and break it by deciding which tag is genuinely the prerequisite.',
    howToFix:
      '1. AdLint\'s finding details list every cycle (Tag A → Tag B → Tag A). 2. For each cycle, open both tags in GTM and identify the Tag Sequencing configuration. 3. Decide which dependency is the real one. Usually there is a clear answer (a Conversion Linker is the prerequisite for a Conversion Tag, not the other way around). 4. Remove the incorrect Tag Sequencing relationship from the wrong side. 5. In Preview mode, fire the tags and confirm they execute in the intended order. Publish.',
    example: 'Cycle:\n  Tag: Google Ads - Purchase Conversion (Setup tag: Google Ads - Conversion Linker)\n  Tag: Google Ads - Conversion Linker (Setup tag: Google Ads - Purchase Conversion)\n\nFix: remove the second setup-tag relationship. The linker does not depend on the conversion tag.',
    citationTemplate:
      'A circular Tag Sequencing dependency in this GTM container. Google\'s Tag Sequencing documentation, sequencing relationships must form a directed acyclic graph for runtime ordering to be deterministic. Circular dependencies cause non-deterministic firing order, which compromises any time-sensitive behaviour built on the sequencing (such as Conversion Linker → conversion tag ordering). Fix: identify each cycle, decide which sequencing edge is genuinely required, and remove the redundant relationship. Source: support.google.com/tagmanager/answer/6238868.',
    references: [
      {
        label: 'Google Tag Manager. Tag sequencing',
        url: 'https://support.google.com/tagmanager/answer/6238868',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-linker-sequencing', 'excessive-sequencing-depth', 'orphaned-tag-sequences'],
  },
  {
    id: 'excessive-sequencing-depth',
    name: 'Excessive Tag Sequencing Depth',
    source: 'gtm',
    severity: 'warning',
    summary: 'A tag sequencing chain exceeds three levels of depth.',
    directAnswer:
      'A tag in this container has a sequencing chain more than three setup tags deep. Tag A depends on B which depends on C which depends on D. At each link, GTM must wait for the upstream tag to complete before firing the next one, which serializes work that often does not need to be serial and can add hundreds of milliseconds to time-to-fire.',
    why: 'Tag Sequencing serializes execution: GTM does not fire a tag until every declared setup tag has completed. Two or three levels is normal (Consent Mode → Conversion Linker → Conversion Tag), but five-deep chains are usually accidental. Someone added a setup-tag relationship that did not need to be a setup-tag relationship. The cost is page-load performance: every additional level adds the network or compute time of one more tag to the critical path. For conversion tags on confirmation pages where the page often closes immediately after fire, this directly correlates with conversion loss on slow connections. The threshold of 3 is informational guidance; the real test is whether each link in the chain is genuinely a prerequisite or just incidentally configured that way.',
    howToFix:
      '1. AdLint\'s details list the deepest tag chains. Walk each chain from leaf to root. 2. For each setup-tag relationship, ask: does the downstream tag actually require the side effect of the upstream tag? 3. Where the answer is no, remove the setup-tag declaration. The tags can fire in parallel. 4. Where the answer is yes (Conversion Linker before Conversion Tag, GA4 Config before GA4 Event), keep the dependency. 5. Republish and verify time-to-fire improves in Preview mode.',
    example: 'Chain depth: 5\n  Tag E (depth 5) ← setup: Tag D\n  Tag D (depth 4) ← setup: Tag C\n  Tag C (depth 3) ← setup: Tag B\n  Tag B (depth 2) ← setup: Tag A\n  Tag A (depth 1)\n\nFix: review whether each level is a real prerequisite. Usually one or two are incidental.',
    citationTemplate:
      'GTM tag sequencing chains exceeding three levels of depth. Google\'s Tag Sequencing documentation, each setup-tag relationship serializes execution and adds the upstream tag\'s firing time to the downstream tag\'s critical path. Deep chains often contain incidental dependencies and degrade page-load performance, particularly on conversion-confirmation pages where rapid tag fire is essential to avoid loss. Fix: audit each chain link for true prerequisite status and remove incidental setup-tag relationships. Source: support.google.com/tagmanager/answer/6238868.',
    references: [
      {
        label: 'Google Tag Manager. Tag sequencing',
        url: 'https://support.google.com/tagmanager/answer/6238868',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['circular-tag-dependencies', 'orphaned-tag-sequences', 'performance-heavy-triggers'],
  },
  {
    id: 'orphaned-tag-sequences',
    name: 'Orphaned Tag Sequence References',
    source: 'gtm',
    severity: 'info',
    summary: 'Tags reference setup or cleanup tags by name, but the referenced tags no longer exist in the container.',
    directAnswer:
      'One or more tags in this container have Tag Sequencing relationships pointing to setup tags or blocking tags that have been deleted. The reference is left behind in the configuration but resolves to nothing at runtime, which means the intended sequencing simply does not happen.',
    why: 'When you delete a tag in GTM, references to it from other tags\' Tag Sequencing configuration are not auto-cleaned. The downstream tag keeps a stale reference to a tag name that no longer exists. At runtime, GTM evaluates the reference, finds no match, and proceeds. so the dependent tag fires without its expected prerequisite. This is dangerous: a conversion tag may have been carefully configured to fire after the Conversion Linker, but if someone deletes the linker and creates a replacement with a different name without updating the references, the conversion tag now fires unsequenced. The check finds these dangling references so the team can clean them up before they become a real problem.',
    howToFix:
      '1. AdLint\'s details list each orphaned reference (the tag, the missing target, and whether it is a setup-tag or blocking-tag reference). 2. For each, open the referencing tag and decide: is the intended prerequisite tag still in the container under a different name, or has it been removed entirely? 3. If a replacement exists, update the reference to point to the current tag. 4. If the prerequisite is genuinely gone and no longer needed, remove the orphaned reference entirely from the tag\'s Tag Sequencing configuration. 5. Publish.',
    example: 'Tag: Google Ads - Purchase Conversion\n  Setup tag reference: "Google Ads - Conversion Linker (old)"\n  Status: target tag does not exist (was renamed to "Conversion Linker")\nFix: update the setup-tag reference to "Conversion Linker"',
    citationTemplate:
      'GTM tags with Tag Sequencing references to setup or blocking tags that no longer exist in the container. Google\'s Tag Sequencing documentation, orphaned references resolve to nothing at runtime and break the intended ordering between dependent tags. This is particularly risky for conversion tags configured to wait for Conversion Linker tags that have since been renamed or replaced. Fix: update orphaned references to point at current tags or remove them entirely from the Tag Sequencing configuration. Source: support.google.com/tagmanager/answer/6238868.',
    references: [
      {
        label: 'Google Tag Manager. Tag sequencing',
        url: 'https://support.google.com/tagmanager/answer/6238868',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['circular-tag-dependencies', 'excessive-sequencing-depth', 'stale-tags'],
  },
  {
    id: 'overlapping-triggers',
    name: 'Overlapping Trigger Conditions',
    source: 'gtm',
    severity: 'warning',
    summary: 'Two or more triggers of the same type have identical filter conditions.',
    directAnswer:
      'This container has multiple triggers configured with the same type and identical filter conditions. For example, two Custom Event triggers both filtering on `event equals purchase`. The duplicates do not cause direct measurement problems by themselves, but they multiply tag fires when a tag is wired to both of them.',
    why: 'Identical-condition triggers usually appear when two engineers solved the same problem independently and neither cleaned up the other\'s work. The triggers are functionally identical at runtime. When one matches, the other does too. The damage depends on which tags reference them. A tag wired to only one is unaffected. A tag wired to both fires twice for every match, which is the most common cause of doubled GA4 events and Google Ads conversion duplication in audits like this one. The check is strict: it flags identical-filter pairs because a human review can usually decide quickly which is canonical, but it does not auto-detect "near-identical" overlaps where one trigger has an additional restriction. Those need a manual review of the trigger logic.',
    howToFix:
      '1. AdLint\'s details list each pair of overlapping triggers and the matching tag type. 2. For each pair, pick the canonical trigger. Usually the one with the clearer name or the more recent creation date. 3. Update every tag that references the duplicate trigger to reference the canonical one instead. 4. Archive (do not delete) the duplicate trigger. 5. In Preview mode, fire the underlying event and confirm only one trigger matches and only the expected number of tags fire. Publish.',
    example: 'Overlap:\n  Trigger A: Custom Event, filter: event equals "purchase"\n  Trigger B: Custom Event, filter: event equals "purchase"\nTags wired to both: Google Ads - Purchase, GA4 - Purchase\nFix: rewire Tag → Trigger A, archive Trigger B.',
    citationTemplate:
      'Pairs of GTM triggers configured with the same type and identical filter conditions. Google\'s Tag Manager trigger documentation, identical-condition triggers cause any tag wired to both to fire multiple times on each match, producing duplicated measurement events. Fix: identify the canonical trigger for each duplicate pair, rewire dependent tags to reference only the canonical trigger, and archive the duplicates. Source: support.google.com/tagmanager/answer/6106961.',
    references: [
      {
        label: 'Google Tag Manager. About triggers',
        url: 'https://support.google.com/tagmanager/answer/6106961',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    whyMockup: {
      kind: 'gtm-trigger-list',
      containerLabel: 'GTM-AB12CDE · Workspace: Default',
      caption:
        'Two Custom Event triggers with identical filter conditions. Any tag wired to both fires twice on every match.',
      rows: [
        { name: 'CE - Purchase (legacy)', type: 'Custom Event', fires: 'event equals "purchase"', highlight: 'warning', note: 'Identical conditions to "CE - purchase event"' },
        { name: 'CE - purchase event', type: 'Custom Event', fires: 'event equals "purchase"', highlight: 'warning', note: 'Identical conditions to "CE - Purchase (legacy)"' },
        { name: 'Page View - Thank You', type: 'Page View', fires: 'Page Path contains "/thank-you"' },
      ],
    },
    relatedChecks: ['trigger-conflicts', 'duplicate-conversions', 'unused-triggers'],
  },
  {
    id: 'invalid-css-selectors',
    name: 'Invalid CSS Selectors in Triggers',
    source: 'gtm',
    severity: 'warning',
    summary: 'Element-based triggers contain CSS selectors with invalid syntax.',
    directAnswer:
      'One or more Click or Element Visibility triggers use CSS selectors with syntax errors. Unclosed brackets, malformed pseudo-classes, or unescaped special characters. Invalid selectors do not match anything at runtime, so the trigger never fires and any tag dependent on it is dead.',
    why: 'GTM\'s Click and Element Visibility triggers accept a CSS selector as their match target (`Click Element matches CSS selector`). The browser evaluates the selector against the DOM at trigger time. If the selector is malformed. `button[data-id="cta]` with an unclosed quote, `.cta:hov` with a typo in the pseudo-class. The browser throws an error and the trigger fails to match. The tag wired to that trigger never fires, and the audit dashboard shows it as "passed" because no errors were logged. The most common pattern is a copy-paste from a developer Slack message where the selector was abbreviated or wrapped, breaking the syntax. AdLint validates the selector syntax statically; the check is high-signal because invalid selectors are nearly always bugs, not intentional configurations.',
    howToFix:
      '1. AdLint\'s details list each affected trigger and its invalid selector. 2. Open each trigger in GTM and inspect the selector field. 3. Validate the selector. Paste it into your browser\'s DevTools console: `document.querySelector("your-selector-here")`. If it throws, the syntax is broken. 4. Common fixes: balance quotes and brackets, escape colons and other special characters in attribute values (`[data-test="user\\:profile"]`), and check pseudo-class spelling (`:hover` not `:hov`). 5. After fixing, complete a test interaction in Preview mode and confirm the trigger now matches. Publish.',
    example: 'Invalid: button[data-cta="signup\nFixed: button[data-cta="signup"]\n\nInvalid: .nav-link:hov\nFixed: .nav-link:hover',
    citationTemplate:
      'Invalid CSS selectors in one or more GTM Click or Element Visibility triggers. The W3C Selectors specification, browsers reject malformed selectors at evaluation time, causing the trigger to never match. Tags wired to these triggers fail to fire without surfacing any error, producing dead measurement paths invisible in standard reporting. Fix: validate each flagged selector against the live DOM using `document.querySelector` and fix syntax errors. Source: developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors.',
    references: [
      {
        label: 'MDN. CSS selectors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors',
      },
      {
        label: 'Google Tag Manager. Click triggers',
        url: 'https://support.google.com/tagmanager/answer/6106961',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['trigger-conflicts', 'overlapping-triggers', 'performance-heavy-triggers'],
  },
  {
    id: 'unused-triggers',
    name: 'Unused Triggers',
    source: 'gtm',
    severity: 'info',
    summary: 'Triggers are defined in the container but not referenced by any tag.',
    directAnswer:
      'This container has triggers in Workspace → Triggers that no tag uses for firing or blocking. The triggers do not affect runtime behaviour, but they clutter the Triggers screen and usually indicate something was left unfinished.',
    why: 'Unused triggers accumulate the same way as unused variables: a migration left them behind, an implementation was planned but never finished, or a copy-paste from another container brought triggers along that nothing uses. The runtime cost is zero, but the operational cost is real. Every audit, handoff, and change requires scanning past triggers that do nothing, and the longer they live there the more likely a future engineer is to assume one of them is load-bearing and avoid touching it. The check is info-level because no measurement is affected, but governance-tier teams treat unused-trigger cleanup as part of every quarterly review.',
    howToFix:
      '1. AdLint\'s details list each unused trigger by name. 2. For each, use GTM\'s "Find references" link to confirm no tags reference it for firing or blocking. 3. Decide: archive if not needed, or update the trigger\'s description to record the intended future use if you are keeping it around. 4. Archive (do not delete). Archiving preserves audit history and can be reversed. 5. Re-run AdLint after the next publish to confirm the count clears.',
    example: 'Trigger: Click - Old Hero CTA\nReferences: 0 tags (firing or blocking)\nAction: archive after confirming no upcoming campaign depends on it.',
    citationTemplate:
      'GTM triggers defined in this container that no tag references for firing or blocking. While unused triggers do not affect measurement, they accumulate audit friction and increase the chance of future engineers misinterpreting their status. Fix: confirm each trigger is genuinely unused and archive to preserve audit history. Source: support.google.com/tagmanager/answer/6106961.',
    references: [
      {
        label: 'Google Tag Manager. About triggers',
        url: 'https://support.google.com/tagmanager/answer/6106961',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['unused-variables', 'unused-datalayer-variables', 'stale-tags'],
  },
  {
    id: 'performance-heavy-triggers',
    name: 'Performance-Heavy Triggers',
    source: 'gtm',
    severity: 'warning',
    summary: 'Triggers are configured in ways that can degrade page-load performance. Short timer intervals or aggressive history-change polling.',
    directAnswer:
      'One or more triggers in this container fire so frequently that they add measurable CPU and main-thread work to every page. The most common offenders are Timer triggers with intervals under 5 seconds and History Change triggers that fire on every browser-state push, regardless of whether the change is meaningful.',
    why: 'GTM triggers run JavaScript on the main thread. A Timer trigger with a 1000ms interval evaluates its conditions and potentially fires tags 60 times per minute, every minute the page is open. on a content-heavy page that is already busy, this can push Cumulative Layout Shift and Interaction-to-Next-Paint into yellow or red ranges. History Change triggers in single-page applications fire on every `pushState` and `replaceState` call, which modern SPA frameworks call constantly during normal user interaction. The accumulation is invisible until the marketing team complains that Core Web Vitals scores are tanking and nobody can pinpoint why. The check fires conservatively on configurations Google has documented as performance risks; every match should be reviewed against the actual use case to decide whether the frequency is justified.',
    howToFix:
      '1. AdLint\'s details list each performance-heavy trigger and the specific reason it was flagged. 2. For Timer triggers: ask whether the use case really requires sub-5-second polling. Most measurement use cases fire fine on 30-second or 60-second intervals; if you genuinely need real-time, consider a different architecture (server-side GTM or a custom event). 3. For History Change triggers: add filter conditions so the trigger only matches genuinely meaningful URL changes (e.g. `Page Path matches RegEx ^/(checkout|signup|confirmation)`), not every minor pushState. 4. Republish and re-run a Lighthouse or PageSpeed test on a representative page to confirm CWV scores improve.',
    example: 'Timer trigger: "Engagement ping"\n  Interval: 1000ms (fires every 1 second)\nFix: raise interval to 30000ms (30s), or remove the trigger if the measurement is not load-bearing.',
    citationTemplate:
      'GTM triggers configured in ways documented as performance risks. Timer triggers with sub-5-second intervals or History Change triggers without filter restrictions. Google\'s Tag Manager performance best practices, these patterns add main-thread work that compounds across every page view and can measurably degrade Core Web Vitals scores. Fix: raise Timer intervals to a frequency the use case actually requires, and add filter conditions to History Change triggers so they fire only on meaningful URL changes. Source: support.google.com/tagmanager/answer/7679319.',
    references: [
      {
        label: 'Google Tag Manager. Trigger types',
        url: 'https://support.google.com/tagmanager/answer/7679319',
      },
      {
        label: 'web.dev. Core Web Vitals',
        url: 'https://web.dev/articles/vitals',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['excessive-custom-html', 'overlapping-triggers', 'container-size-score'],
  },
  {
    id: 'excessive-custom-html',
    name: 'Excessive Custom HTML Tags',
    source: 'gtm',
    severity: 'warning',
    summary: 'More than 30% of tags in the container are Custom HTML, which is a governance and performance risk.',
    directAnswer:
      'A high share of tags in this container are Custom HTML. Arbitrary JavaScript injected at runtime instead of native, audited GTM tag templates. Custom HTML tags are powerful but expensive: each one is unaudited code with full DOM access, runs on the main thread, and is harder for the next engineer to understand than a native template would be.',
    why: 'Google ships native tag templates for most common third-party platforms (Google Ads, Meta, TikTok, LinkedIn, Pinterest, etc.). These templates are reviewed, sandboxed, and present a configuration UI that a non-developer can audit. Custom HTML tags bypass all of that. They execute arbitrary JavaScript with access to the entire page, run unsandboxed, and require code review to assess what they actually do. A small share of Custom HTML in a container is normal (genuinely custom behaviour, one-off integrations); a large share is a smell. The 30% threshold is conservative. Most well-governed containers run well below 10%. High Custom HTML share correlates strongly with three downstream issues: privacy/security audit findings, page-performance regressions, and engineer-handoff friction when the people who wrote the Custom HTML have left the team.',
    howToFix:
      '1. AdLint\'s details give the Custom HTML count and percentage. 2. In GTM, filter the Tags screen by tag type Custom HTML. 3. For each Custom HTML tag, ask: does a native tag template exist for the same purpose? Browse the GTM Community Template Gallery and the platform-specific tag types in the GTM tag chooser. 4. Migrate Custom HTML to native templates where one exists. Native templates often have features the Custom HTML predecessor lacked (Consent Mode integration, server-side support). 5. For Custom HTML tags that have no native equivalent, document the intent in the tag\'s description and ensure the code has been reviewed in version control. 6. Re-run AdLint after migration; the share will drop.',
    example: 'Custom HTML count: 24 of 67 total tags (36%)\nNative equivalents available for: Meta Pixel (6), LinkedIn Insight Tag (3), Hotjar (2)\nMigration order: Meta first (highest count), then LinkedIn, then Hotjar.',
    citationTemplate:
      'That more than 30% of tags in this GTM container are Custom HTML. Arbitrary unsandboxed JavaScript. Google\'s GTM tag template documentation, native tag templates are the recommended pattern because they offer sandboxing, Consent Mode integration, and an audit-friendly configuration surface. High Custom HTML share correlates with elevated privacy, security, and performance risk. Fix: migrate Custom HTML tags to native templates where equivalents exist via the GTM Community Template Gallery, and document remaining Custom HTML tags with reviewer notes. Source: developers.google.com/tag-platform/tag-manager/templates.',
    references: [
      {
        label: 'Google Tag Manager. Custom Templates',
        url: 'https://developers.google.com/tag-platform/tag-manager/templates',
      },
      {
        label: 'Google Tag Manager. Community Template Gallery',
        url: 'https://tagmanager.google.com/gallery/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['debug-tags-in-production', 'performance-heavy-triggers', 'container-size-score'],
  },
  {
    id: 'missing-descriptions',
    name: 'Documentation Completeness',
    source: 'gtm',
    severity: 'info',
    summary: 'Less than 50% of tags, triggers, and variables have descriptions filled in.',
    directAnswer:
      'GTM lets you add a Notes/Description field to every tag, trigger, and variable. AdLint scores this container below 50% on documentation completeness. The majority of assets have no description, which makes every audit, handoff, and change harder than it needs to be.',
    why: 'Descriptions are GTM\'s version of code comments: they answer "why does this exist" at the moment a reviewer is looking at the asset. A container with no descriptions is a black box. Every tag, trigger, and variable name has to encode its entire purpose, which they almost never do (`Google Ads - Purchase` tells you what it is, not why it was created with this specific configuration). Without descriptions, the only way to understand an asset is to read its full configuration, cross-reference its references, and reconstruct intent. With descriptions, the next engineer reads "Tag created 2024-03 for the BFCM landing page launch; can be paused after 2024-12-31" and immediately knows what to do. The 50% threshold is generous; mature governance targets >80% with descriptions for every load-bearing asset.',
    howToFix:
      '1. Pick a starting target. The next time you touch any tag, trigger, or variable, add a one-line description before saving. This stops the bleeding. 2. For the existing backlog, prioritize the most-frequently-touched assets (anything modified in the last 90 days). 3. Description format suggestion: `[Purpose] for [campaign/page/initiative]. [Sunset note if applicable].` E.g. "Conversion tracking for the BFCM 2024 lead-gen flow. Sunset after 2025-02-28." 4. Document the description convention in your team\'s GTM governance doc. 5. Re-run AdLint after a quarterly cleanup pass to see the score rise.',
    example: 'Tag: Google Ads - Purchase Conversion\nDescription (empty)\n\nBetter:\nDescription: Standard purchase conversion for AW-123 account, fires on dataLayer purchase event. Migrated from legacy ATC tag 2024-08. Owner: marketing-ops@.',
    citationTemplate:
      'That less than 50% of tags, triggers, and variables in this GTM container have descriptions. Google\'s GTM workspace governance recommendations, the Notes/Description field is the recommended location for documenting asset intent, owner, and sunset criteria. Containers below this threshold accumulate audit friction proportional to size; well-governed containers target >80% description coverage. Fix: adopt a description convention and apply it to the most-frequently-modified assets first. Source: support.google.com/tagmanager/answer/6103693.',
    references: [
      {
        label: 'Google Tag Manager. Help and best practices',
        url: 'https://support.google.com/tagmanager/answer/6103693',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['naming-conventions', 'stale-tags', 'unused-variables'],
  },
  {
    id: 'stale-tags',
    name: 'Potentially Stale Tags',
    source: 'gtm',
    severity: 'info',
    summary: 'Tags have names suggesting they are outdated, temporary, or legacy ("old," "legacy," "backup," "deprecated," "temp," "test").',
    directAnswer:
      'One or more tags in this container have names containing words like "old," "legacy," "backup," "deprecated," "temp," or "test." The names are operational signals from previous engineers that these tags are unfinished business. Kept around because someone was not sure they could be safely removed.',
    why: 'Stale-named tags are a recognized governance anti-pattern. The name was chosen specifically to mark the tag for later cleanup, but "later" has not arrived. The risk is twofold. First, the tag may still be firing on production triggers, doing real work nobody is auditing. a "legacy" tag firing on All Pages can be sending data to an old analytics property nobody monitors anymore, including PII or commercial data that should not be flowing. Second, the tag adds container weight and audit friction even if it does nothing. The check is strict. it flags by name pattern only, since real behavior requires manual review. But every flagged tag deserves a decision: archive it or rename it.',
    howToFix:
      '1. AdLint\'s details list each flagged tag by name. 2. For each tag, decide one of three actions. (a) If the tag is genuinely no longer needed, archive it (preserves history, reversible). (b) If the tag is still load-bearing, rename it to remove the stale terminology and add a description explaining its current role. (c) If you cannot tell, pause the tag (it stops firing but stays in the container) and watch for downstream alerts for one full reporting cycle. if no alerts fire, archive it. 3. Document a "name lifecycle" convention so future tags get a sunset date in their description instead of "temp" in their name.',
    example: 'Stale-named tags:\n  - "GA - OLD Pageview Tag" (still firing on All Pages)\n  - "FB Pixel - Legacy" (paused)\n  - "Hotjar Backup" (firing)\n\nDecisions:\n  - Archive the OLD GA tag (GA4 has replaced it)\n  - Archive the Legacy FB Pixel (already paused, not needed)\n  - Rename Hotjar Backup to "Hotjar - Production" if still load-bearing.',
    citationTemplate:
      'GTM tags with names suggesting outdated, temporary, or legacy status. Containing words like "old," "legacy," "backup," "deprecated," "temp," or "test." Per GTM workspace governance best practice, stale naming is an operational signal that the tag was marked for cleanup but never resolved. Each flagged tag deserves a decision: archive (if no longer needed), rename (if still load-bearing), or pause for one reporting cycle (if uncertain). Source: support.google.com/tagmanager/answer/6103693.',
    references: [
      {
        label: 'Google Tag Manager. Help and best practices',
        url: 'https://support.google.com/tagmanager/answer/6103693',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['debug-tags-in-production', 'missing-descriptions', 'naming-conventions'],
  },
  {
    id: 'unused-variables',
    name: 'Unused Variables',
    source: 'gtm',
    severity: 'info',
    summary: 'User-defined variables are present in the container but never referenced by any tag or trigger.',
    directAnswer:
      'This container has user-defined variables. Data Layer Variables, Custom JavaScript, Lookup Tables, and so on. That no tag or trigger uses. The variables exist in Workspace → Variables but never get evaluated at runtime.',
    why: 'Unused variables share the same origin story as unused triggers and unused Data Layer Variables: leftover from migrations, half-finished implementations, or imported from other containers. The runtime cost is effectively zero. GTM only evaluates a variable when something references it. But the operational cost is the same as everywhere else in this audit. Every unused variable adds to the time a reviewer spends scrolling, and any one of them could be shadowing a variable somebody assumes is canonical. The check is info-level for this reason: not measurement-critical, but a leading indicator of governance health.',
    howToFix:
      '1. AdLint\'s details list each unused variable by name. 2. For each, use GTM\'s "Find references" link to confirm no tags or triggers reference it. 3. Decide: archive if not needed, or update the variable\'s description with a note explaining why it is being kept around. 4. Archive (do not delete). Archiving is reversible and preserves audit history. 5. Re-run AdLint after the next publish.',
    example: 'Variable: CJS - oldUserIdResolver\nReferences: 0 tags, 0 triggers\nAction: archive (the new auth flow replaced this).',
    citationTemplate:
      'User-defined variables in this GTM container that no tag or trigger references. While unused variables do not affect runtime measurement, they accumulate audit friction and increase the risk of silent shadowing. Where a forgotten variable masks a canonical one with a similar name. Fix: confirm each variable is genuinely unused via "Find references," then archive to preserve audit history. Source: support.google.com/tagmanager/answer/6164391.',
    references: [
      {
        label: 'Google Tag Manager. Variable types',
        url: 'https://support.google.com/tagmanager/answer/6164391',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['unused-triggers', 'unused-datalayer-variables', 'stale-tags'],
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
  {
    id: 'wrong-counting-method',
    name: 'Wrong Conversion Counting Method',
    source: 'ads',
    severity: 'warning',
    summary: 'A conversion action uses a counting method that does not match its business intent.',
    directAnswer:
      'One or more Google Ads conversion actions use a counting method that does not match the underlying business event. Lead-style actions (form submits, signups) should typically use "One". Count one conversion per click no matter how many times the user submits. Sale-style actions (purchases, transactions) should use "Every". Count every transaction. AdLint flags this when the configured counting method is the opposite of what the category implies.',
    why: 'Google Ads offers two counting methods: "Every conversion" counts every event (the right choice for sales, where a customer who buys twice should be counted twice), and "One conversion" counts at most one per click (the right choice for leads, where a user submitting the form three times is still one lead). Misconfigured counting inflates or deflates conversion volume in ways that look like real performance change. A lead form set to "Every" doubles or triples lead counts when users retry submissions; a sale set to "One" undercounts repeat purchases from the same click path. Smart Bidding then optimises against the wrong volume signal.',
    howToFix:
      '1. AdLint flags each action and the recommended counting method. 2. In Google Ads, open Tools & Settings → Measurement → Conversions and edit each flagged action. 3. Under Counting, set "One" for lead-style actions and "Every" for sale-style actions. 4. Annotate the change date. Historical volume will retroactively adjust under the new counting method in some reports. 5. Re-baseline campaign performance after one full conversion cycle.',
    example: 'Lead - Demo Request\nRecommended counting: One\nCurrent: Every (counts every form submit even if same user submits 3 times)',
    citationTemplate:
      'Google Ads conversion actions with counting methods misaligned to the business event type. Google\'s conversion counting documentation, "One conversion" is recommended for lead-style actions and "Every conversion" for sale-style actions. Misconfigured counting produces systematically inflated or deflated volume that breaks campaign performance reporting and Smart Bidding signal. Fix: align counting method to the conversion category and re-baseline after one full cycle. Source: support.google.com/google-ads/answer/3438531.',
    references: [
      { label: 'Google Ads. Choose a counting setting for your conversions', url: 'https://support.google.com/google-ads/answer/3438531' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-conversions', 'struct-counting-category-mismatch'],
  },
  {
    id: 'long-attribution-windows',
    name: 'Attribution Window Too Long',
    source: 'ads',
    severity: 'info',
    summary: 'Conversion click windows are longer than the realistic causal window for the business.',
    directAnswer:
      'One or more conversion actions use click-through windows longer than the realistic causal window for this business. Long windows recover late conversions but increasingly attribute conversions to clicks that may have had no influence. a user who clicked an ad 87 days ago and bought today probably would have bought anyway. The result: inflated reported campaign value and weaker correlation between ad spend and revenue.',
    why: 'Attribution windows are a tradeoff between recovering delayed conversions and maintaining causal cleanliness. A 90-day window is appropriate for B2B SaaS sales cycles where the click really might still be influencing the eventual decision. For an impulse purchase where the median conversion lag is two hours, a 90-day window means most of the credit is going to clicks that have no causal relationship to the conversion. They happen to fall in the window. This inflates campaign performance reports and biases attribution toward channels that show up earlier in the path, regardless of whether they actually drove the outcome. The check is info-level because "too long" is harder to defend than "too short". But worth reviewing when the time-lag distribution shows most conversions happen within hours or days.',
    howToFix:
      '1. In Google Ads → Reports → Predefined → Time → Time lag, check the conversion-lag distribution. 2. If 95% of conversions happen within N days, consider tightening the click-through window to roughly 2× that figure to capture realistic outliers while excluding likely-coincidental late attributions. 3. Update the click-through window in Tools & Settings → Measurement → Conversions. 4. Annotate the change date and re-baseline campaign reports.',
    example: 'Problem: Impulse-purchase e-commerce uses 90-day click window. 95% of conversions occur within 3 days.\nBetter: 7-day click-through window captures realistic outliers without over-attributing.',
    citationTemplate:
      'Google Ads conversion actions with click-through windows materially longer than the realistic causal window for the business. Google\'s attribution window documentation, the appropriate window depends on the actual time-lag distribution; windows that exceed it inflate reported campaign value through coincidental late attributions. Fix: review time-lag distribution and tighten click-through windows to roughly 2× the 95th percentile of historical conversion delay. Source: support.google.com/google-ads/answer/3123169.',
    references: [
      { label: 'Google Ads. About conversion windows', url: 'https://support.google.com/google-ads/answer/3123169' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['short-attribution-windows', 'attribution-window-mismatch'],
  },
  {
    id: 'disabled-high-value-conversions',
    name: 'Disabled High-Value Conversion Actions',
    source: 'ads',
    severity: 'warning',
    summary: 'High-value conversion actions are disabled even though they have recent volume.',
    directAnswer:
      'One or more Google Ads conversion actions are currently disabled despite having significant historical conversion value. The disabled actions are not feeding Smart Bidding, and the underlying business outcome is invisible to optimisation. Either re-enable them or move the value capture to a different active action.',
    why: 'Conversion actions get disabled for legitimate reasons. a deprecated event, a discontinued lead form, a tracking method being phased out. But disabled actions sometimes get left in that state long after they should have been replaced, particularly when the replacement was set up under a new conversion ID but the old one captured the historically-significant volume. The damage: bidding strategies no longer see signal from a real revenue stream, and campaign reports that filter by conversion goal exclude meaningful activity. The check flags actions that were disabled but show enough historical value to suggest they are still load-bearing.',
    howToFix:
      '1. AdLint\'s details list each disabled action and its historical conversion value. 2. For each one: is the action genuinely retired (and is a replacement live)? Re-enable if not. 3. If a replacement exists: confirm it is configured Primary, configured with values, and present in the active campaign goal lists. 4. If the action is truly deprecated: add a note to the Description field explaining when and why, and consider archiving the historical data. 5. Re-run AdLint after the cleanup to confirm the finding clears.',
    example: 'Disabled action: Purchase (legacy)\nHistorical conversion value (last 90 days while enabled): $480,000\nStatus: disabled 60 days ago, no replacement configured.\nRecommended action: re-enable or verify replacement.',
    citationTemplate:
      'Google Ads conversion actions in disabled state despite materially significant historical conversion value. Google\'s conversion action documentation, disabled actions do not contribute to Smart Bidding or current reporting; high-value disabled actions usually indicate an incomplete migration to a replacement. Fix: confirm a replacement action is active and capturing equivalent value, or re-enable the disabled action and document its current purpose. Source: support.google.com/google-ads/answer/1722054.',
    references: [
      { label: 'Google Ads. Edit your conversion actions', url: 'https://support.google.com/google-ads/answer/1722054' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'many-inactive-conversions'],
  },
  {
    id: 'inconsistent-attribution-models',
    name: 'Inconsistent Attribution Models',
    source: 'ads',
    severity: 'warning',
    summary: 'Conversion actions across the account use mixed attribution models in ways that confuse reporting.',
    directAnswer:
      'Different conversion actions in this account use different attribution models. Some Data-Driven, some Last-Click, some Position-Based. When these actions roll up into the same campaign or goal report, the displayed conversion value mixes attribution logic in ways that make period-over-period comparison and bidding decisions unreliable.',
    why: 'Google Ads lets each conversion action pick its attribution model independently. This flexibility is useful (DDA for high-volume actions, simpler models for low-volume ones) but produces silent reporting inconsistency: a "total conversion value" that is the sum of values calculated under different attribution logics is not a meaningful number. Campaigns reporting against mixed-attribution goals show metrics that move not because performance changed, but because the relative volume of differently-attributed actions shifted. Bidding strategies optimise against the mixed signal and produce inconsistent CPA across similar campaigns.',
    howToFix:
      '1. List every enabled Primary conversion action and its current attribution model (Tools & Settings → Measurement → Conversions → Attribution column). 2. Decide the account-level attribution philosophy: either standardise on Data-Driven (preferred when every Primary has sufficient volume), Position-Based (a reasonable middle ground), or Last-Click (simplest, most rule-based). 3. Update each Primary action to use the chosen model. 4. Document the chosen model in the team\'s measurement playbook so future conversion actions inherit it by default. 5. Annotate the change date for period-over-period reporting clarity.',
    example: 'Problem:\n  Purchase: Data-Driven\n  Lead: Last-Click\n  Demo Request: Position-Based\nFix: standardise on Data-Driven (or document why each is different).',
    citationTemplate:
      'Google Ads Primary conversion actions configured with mixed attribution models. Google\'s attribution documentation, mixed models produce report-level totals that combine attribution logics in ways that cannot be meaningfully compared period-over-period or used by Smart Bidding without distortion. Fix: standardise Primary actions on a single attribution model (preferably Data-Driven where volume supports it) and document the choice in team materials. Source: support.google.com/google-ads/answer/6394265.',
    references: [
      { label: 'Google Ads. About attribution models', url: 'https://support.google.com/google-ads/answer/6394265' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['data-driven-eligibility', 'suboptimal-attribution-model', 'struct-attribution-chaos'],
  },
  {
    id: 'lead-conversions-with-values',
    name: 'Lead Conversions Assigned Revenue Values',
    source: 'ads',
    severity: 'warning',
    summary: 'Lead-style conversion actions (form submits, signups) have monetary values configured.',
    directAnswer:
      'One or more lead-style conversion actions (form submits, demo requests, signups) are configured with monetary values. Unless the team has consciously assigned a "lead value" for value-based bidding, this is almost always accidental: a sale-conversion template was copy-pasted and the value field was forgotten. The result is Smart Bidding treating leads as direct revenue and over-prioritising lead campaigns against actual sales.',
    why: 'Value-based bidding (tROAS, Maximize Conversion Value) sums conversion values across all Primary actions when optimising. If a lead action carries a $100 value alongside a $129 purchase, the algorithm sees both as comparable revenue events. The lead is almost always less valuable than the purchase. The actual closing rate is usually 5-20%. so treating them as equal pushes budget toward lead campaigns at the expense of sales campaigns. The intended pattern for lead-value-based bidding is to assign a calculated value (lead × closing rate × average sale) so the lead value approximates the revenue contribution, not the eventual sale revenue. AdLint flags lead-style categories with unexpected values; the team should either remove the value or document the calculation behind it.',
    howToFix:
      '1. AdLint\'s details list each lead-style action with values and the value range. 2. Decide for each: is this an intentional "lead value" set to a calculated approximation (lead × closing rate × ARPU)? If yes, document the calculation. 3. If accidental: in Tools & Settings → Measurement → Conversions, edit the action and change Value to "Don\'t use a value" or set a default that reflects expected lead revenue (typically $5-$50 per lead, not full-purchase amounts). 4. Re-test conversion imports and bidding behaviour after the change.',
    example: 'Problem: Lead - Demo Request configured with value = $129 (copied from purchase template)\nFix: change to "Don\'t use a value," OR calculate lead value (e.g. 10% close rate × $129 = $12.90 lead value).',
    citationTemplate:
      'Google Ads lead-style conversion actions configured with monetary values inconsistent with typical lead-value methodology. Google\'s value-based bidding documentation, lead values should approximate the revenue contribution of a lead (closing rate × average sale), not the full sale amount. Misconfigured lead values cause Smart Bidding to over-prioritise lead campaigns against actual sales campaigns. Fix: remove values from lead actions or document a clearly-calculated lead-value methodology. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      { label: 'Google Ads. Set up conversion values', url: 'https://support.google.com/google-ads/answer/13064107' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'fixed-value-dynamic-revenue', 'value-consistency-by-category'],
  },
  {
    id: 'unusual-categories',
    name: 'Unusual or Other-Category Conversion Actions',
    source: 'ads',
    severity: 'info',
    summary: 'A high share of conversion actions use the "Other" category rather than a specific, documented type.',
    directAnswer:
      'A meaningful share of this account\'s conversion actions are categorised as "Other" rather than a specific Google Ads category (Purchase, Lead, Submit Lead Form, Sign-up, etc.). The "Other" category disables several Google Ads features. Including the per-category bidding optimisations, automatic value-based recommendations, and category-aware reporting filters.',
    why: 'Google Ads uses the Category field to apply category-specific bidding intelligence and reporting features. "Lead" actions get lead-form ad integration; "Purchase" actions get e-commerce reporting layouts and ROAS bidding optimisations. "Other" exists as a fallback when no specific category applies, but it gets none of the category-specific features. When teams use "Other" reflexively because they are not sure which specific category fits, the account loses meaningful optimisation surface. The check is info-level because the right category sometimes genuinely is "Other". But a high share of Other usually indicates conversion-action setup happened quickly without considering category implications.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, review each "Other" action. 2. For each, ask: does a more specific category fit? Most "Other" actions are really Purchases, Leads, Sign-ups, Page views, or Engagement actions. 3. Update the Category field to the more specific value. 4. Re-check campaign goal settings. Some category changes alter how the action rolls into Conversion goals.',
    example: 'Problem: 8 of 12 Primary conversion actions are categorised "Other"\nBetter: re-categorise to Purchase (5), Lead (2), Page view (1), leaving 4 truly-other.',
    citationTemplate:
      'A high share of Google Ads conversion actions categorised as "Other" rather than specific categories. Google\'s conversion category documentation, the "Other" category disables category-specific bidding optimisations, value recommendations, and reporting features. Fix: review each "Other" action and re-categorise to the most specific applicable category. Source: support.google.com/google-ads/answer/2425971.',
    references: [
      { label: 'Google Ads. Set up your conversion action', url: 'https://support.google.com/google-ads/answer/6095821' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['struct-category-name-mismatch', 'conversion-name-quality'],
  },
  {
    id: 'many-inactive-conversions',
    name: 'Many Inactive Conversion Actions',
    source: 'ads',
    severity: 'info',
    summary: 'The account has accumulated a large number of inactive or zero-volume conversion actions.',
    directAnswer:
      'This account has accumulated many conversion actions that show no recent volume. They exist in Tools & Settings → Measurement → Conversions but have not fired in 30+ days. Inactive actions clutter campaign goal selection, slow down audits, and create the risk that a future engineer wires a new campaign to a long-dead action by mistake.',
    why: 'Conversion actions accumulate in mature accounts the same way unused variables accumulate in mature GTM containers. From migrations, A/B tests, replaced tracking methods, and abandoned campaigns. The runtime cost is zero, but the operational cost compounds: every new campaign\'s goal-selection dialog includes the dead actions, every audit takes longer to reason about, and the chance that someone selects a defunct action increases with each one left in place. The check is info-level, but well-governed accounts run quarterly cleanups to keep the list manageable.',
    howToFix:
      '1. AdLint\'s details list inactive actions with their last-fired date. 2. For each: confirm no upcoming campaign depends on it. 3. Archive (do not delete). Archiving preserves historical reporting context and is reversible. 4. Make quarterly review of inactive actions part of the team\'s measurement governance cycle. 5. Re-run AdLint after the cleanup to confirm the count drops.',
    example: 'Inactive conversion actions (no fires in 30+ days): 18 of 47 total\nRecommended action: archive 18 after confirming no campaign dependencies.',
    citationTemplate:
      'Many inactive Google Ads conversion actions in this account. Google\'s conversion management documentation, inactive actions add operational friction to campaign goal selection and audit cycles without contributing to current measurement. Fix: archive (not delete) inactive actions after confirming no campaign dependencies, and adopt a quarterly review cadence. Source: support.google.com/google-ads/answer/1722054.',
    references: [
      { label: 'Google Ads. Edit your conversion actions', url: 'https://support.google.com/google-ads/answer/1722054' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['disabled-high-value-conversions', 'stale-tags'],
  },
  {
    id: 'no-primary-conversion',
    name: 'No Primary Conversion Action',
    source: 'ads',
    severity: 'critical',
    summary: 'The account has no enabled Primary conversion action. Smart Bidding has nothing to optimise toward.',
    directAnswer:
      'Your Google Ads account has no enabled Primary conversion action. Not one. Every action is either disabled or marked Secondary, so Smart Bidding has zero signal to optimise against. Maximize Conversions, Target CPA, Target ROAS — they are all bidding blind right now. Fix this before you change anything else.',
    why: 'Smart Bidding optimises against Primary conversion actions. Only Primary. Secondary actions are recorded for reporting but they do not feed the bidding algorithm. With no Primary at all, the algorithm has no target. Spend still goes out (because budget and bid caps still work), clicks still come in, the account still looks active. Conversion-aware optimisation is just not happening.\n\nThis usually happens for one of two reasons. The team ran a measurement migration: created new conversion actions, demoted the old ones to Secondary while testing, and never came back to promote the new actions to Primary. Or someone accidentally demoted the macro action to Secondary while cleaning up duplicates and the change never surfaced because the campaigns kept running on autopilot.\n\nThe failure is invisible from any standard Google Ads report. Conversion volume reports show conversions (Secondary actions still count). Campaign performance reports show CPA and ROAS (computed from those same Secondary actions). Nothing flags "no Primary action." You have to look in Tools & Settings → Measurement → Conversion goals and notice the empty Primary column.\n\nUntil this is fixed, every automated bidding decision is arbitrary. Fix it first, then come back to the rest of this audit.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, find the canonical macro business outcome for this account. Purchase for e-commerce. Lead or Submit Lead Form for B2B. Sign-up for SaaS. 2. Mark that action Primary. If it is disabled, enable it first. 3. Open Tools & Settings → Measurement → Conversion goals. Confirm the new Primary action appears under the appropriate default goal. 4. Open each active campaign\'s goal settings. Confirm it inherits the account-default Primary goal (some campaigns override; check them individually). 5. Allow 7-14 days for Smart Bidding to re-enter normal learning before judging performance against the new baseline.',
    example: 'All conversion actions: Secondary\nPrimary actions: 0\nFix: mark the canonical macro action (Purchase or Lead) as Primary.',
    citationTemplate:
      'This Google Ads account has no enabled Primary conversion action. Per Google\'s Smart Bidding documentation, value- and volume-based bidding strategies optimise exclusively against Primary actions; without one, automated bidding cannot learn from conversion signal and every bidding decision is arbitrary. Fix: identify the canonical macro business outcome (Purchase, Lead, or equivalent), mark it Primary, and confirm inheritance into active campaign goals. Address this finding before any other measurement work — the rest depends on having signal to optimise against. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      { label: 'Google Ads. About conversion goals', url: 'https://support.google.com/google-ads/answer/12727548' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'smart-bidding-volume', 'struct-attribution-chaos'],
  },
  {
    id: 'conversion-name-quality',
    name: 'Conversion Name Quality',
    source: 'ads',
    severity: 'info',
    summary: 'Conversion action names are non-descriptive or do not encode their source and category.',
    directAnswer:
      'Several conversion action names in this account are non-descriptive. Generic strings like "Conversion 1," "Lead," or "Website Lead Action 2025-03." These names make audits harder because a reviewer cannot tell from the name alone what business event the action represents or which source it pulls from.',
    why: 'Conversion action names are the primary signal a reviewer uses to understand the measurement layer of an account. Names like "Conversion 1" force the reviewer to open each action and inspect the source, category, and configuration before they can reason about anything else. Well-named actions encode the business event, the source, and where relevant the category. "Purchase. Website" or "Lead. HubSpot Import" tells the auditor everything they need in five words. The check is info-level governance, but consistently-named accounts audit 3-4× faster than inconsistently-named ones.',
    howToFix:
      '1. Adopt a naming convention. Recommended pattern: `<Event>. <Source>` (e.g. "Purchase. Website," "Lead. Salesforce Import," "Sign-up. App"). 2. Rename existing actions. Renaming is non-destructive. it does not affect historical reporting or campaign wiring. 3. Document the convention so new actions follow it by default. 4. Treat naming as a publish-gating governance check at the team level.',
    example: 'Inconsistent: Conversion 1, Lead, Website Lead Action 2025-03\nBetter: Purchase. Website, Lead. Salesforce, Sign-up. App',
    citationTemplate:
      'Google Ads conversion actions with non-descriptive names that do not encode the business event, source, or category. Industry-standard measurement governance, conversion action names are the primary auditor signal for understanding the measurement layer; non-descriptive names slow every audit and increase the risk of campaigns being wired to the wrong action. Fix: adopt a `<Event>. <Source>` naming convention and rename existing actions. Source: support.google.com/google-ads/answer/6095821.',
    references: [
      { label: 'Google Ads. Set up your conversion action', url: 'https://support.google.com/google-ads/answer/6095821' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['struct-naming-convention', 'unusual-categories'],
  },
  {
    id: 'conversion-source-consistency',
    name: 'Conversion Source Consistency',
    source: 'ads',
    severity: 'info',
    summary: 'Conversion actions for the same business event are configured with inconsistent sources (website vs import vs phone).',
    directAnswer:
      'Multiple conversion actions in this account track what appears to be the same business event but report different sources. Some Website (tag-fired), some Import (offline upload), some Phone Calls. Without explicit deduplication, the same conversion can be counted across sources and inflate measurement.',
    why: 'A purchase tracked via the website conversion tag AND uploaded via offline conversion import is the same conversion counted twice. Google Ads does not automatically deduplicate across sources. That is the team\'s responsibility. The most common pattern is a website-tag-based conversion that is also enriched via offline import for value updates (legitimate, but the import should update, not duplicate). When two source-distinct actions exist for the same event, every Smart Bidding cycle and every report doubles the affected event. The check identifies same-event-different-source patterns; the team must decide whether the duplication is intentional value enrichment or accidental double-counting.',
    howToFix:
      '1. AdLint\'s details list same-event candidates and their sources. 2. For each pair, decide: is the import enriching the website tag with offline updates (legitimate, configure import to update existing conversions not create new ones), or is it a separate accidental action? 3. Where accidental: archive the redundant action and consolidate on the canonical one. 4. Where intentional enrichment: ensure the import is configured with "Update conversions" mode rather than "Create new conversions". Google Ads → Tools & Settings → Conversions → Imports.',
    example: 'Same-event candidates:\n  Purchase. Website (tag-based)\n  Purchase. Offline Import (CRM upload)\nDecision: ensure the import updates the existing Website conversion rather than creating a new one.',
    citationTemplate:
      'Google Ads conversion actions for the same business event configured with inconsistent sources (Website, Import, Phone Calls). Google\'s offline conversion import documentation, multiple sources for the same event must be explicitly configured to update existing conversions rather than create new ones, or they will count the same event multiple times. Fix: identify same-event-different-source pairs and either consolidate or configure the import in Update mode. Source: support.google.com/google-ads/answer/2998031.',
    references: [
      { label: 'Google Ads. Import offline conversions', url: 'https://support.google.com/google-ads/answer/2998031' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-conversions', 'struct-semantic-duplicates'],
  },
  {
    id: 'conversion-delay-impact',
    name: 'Conversion Reporting Delay',
    source: 'ads',
    severity: 'info',
    summary: 'A meaningful share of conversions are imported with significant delay after the click, affecting Smart Bidding learning speed.',
    directAnswer:
      'A significant share of conversions in this account are reported with substantial delay after the click. Typically because they come from offline imports or attribution windows that allow late conversions. Smart Bidding\'s learning speed is gated on how fresh the feedback signal is; high reporting lag means the algorithm is making decisions based on a stale picture.',
    why: 'Smart Bidding learns from observed click → conversion outcomes. When conversions are reported within minutes of the click (typical for direct-response e-commerce), the algorithm adjusts quickly and converges on stable performance within days. When conversions take weeks to report (typical for B2B with offline conversion imports from CRM), the algorithm cannot react to recent campaign changes for weeks at a time. Adjustments made today are scored against conversions whose corresponding clicks happened a month ago. The check is info-level because the lag is often unavoidable for the business type, but flagging it helps the team set realistic expectations about how fast bidding can respond to changes.',
    howToFix:
      '1. Review the time-lag distribution in Google Ads → Reports → Time → Time lag. 2. If most conversions are imported via CRM with high lag: consider feeding qualified-lead signals earlier in the funnel (e.g. Lead-quality-score updates the day after the lead is captured, rather than waiting for the deal to close 30 days later). 3. Use conversion modelling features where available. Google\'s modelled conversions fill in gaps for users who declined consent or where attribution paths are missing. 4. Set realistic learning-period expectations: a high-lag account may take 30-60 days to stabilise after every bidding change, vs 7-14 for low-lag accounts.',
    example: 'Median click → conversion lag: 28 days\nImpact: Smart Bidding learning period extends to ~45 days post-change. Plan changes accordingly.',
    citationTemplate:
      'Substantial conversion-reporting delay in this Google Ads account. Google\'s Smart Bidding learning documentation, conversion feedback latency directly extends the learning period after bidding changes; high-lag accounts have longer learning cycles and slower response to campaign adjustments. Fix: report earlier funnel signals where possible, leverage modelled conversions, and set realistic learning-period expectations in team planning. Source: support.google.com/google-ads/answer/12047999.',
    references: [
      { label: 'Google Ads. About the learning period for Smart Bidding', url: 'https://support.google.com/google-ads/answer/12047999' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['smart-bidding-volume', 'data-driven-eligibility'],
  },
  {
    id: 'fixed-value-dynamic-revenue',
    name: 'Fixed Value on Variable-Revenue Conversion',
    source: 'ads',
    severity: 'warning',
    summary: 'A purchase or sale conversion action uses a fixed value when the underlying revenue varies meaningfully.',
    directAnswer:
      'A Google Ads purchase or sale conversion action is configured with a fixed value (e.g. $50 per conversion) even though the underlying transaction value varies meaningfully across customers. Smart Bidding cannot distinguish high-value from low-value customers and optimises for volume of conversions rather than revenue.',
    why: 'Fixed-value conversion configuration is appropriate for events where every conversion is genuinely worth the same amount. Subscription signups for a single-price product, fixed-fee bookings. For variable-revenue businesses (e-commerce with a wide AOV range, B2B with deal-size variance), a fixed value collapses every conversion to the same weight and discards the most important optimisation signal Google Ads can use. Symptoms: tROAS appears to work but does not actually drive revenue; campaigns optimise toward volume of cheap conversions; high-revenue traffic is not prioritised. The fix is dynamic-value conversion configuration where the actual transaction value flows from GTM or the import.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, edit the flagged action. 2. Under Value, change from "Use the same value for each conversion" to "Use different values for each conversion." 3. Verify the conversion tag in GTM passes a Data Layer Variable with the actual transaction value (`{{DLV - ecommerce.value}}`). 4. Set a default value as a fallback for the rare case where the value cannot be resolved. 5. Verify after 7 days that Google Ads → Conversions reports show variable conversion values.',
    example: 'Problem: Purchase conversion uses fixed value of $50\nReality: actual order values range from $15 to $1,200 (AOV $89)\nFix: configure dynamic value sourced from {{DLV - ecommerce.value}}',
    citationTemplate:
      'Google Ads purchase or sale conversion actions configured with fixed values despite variable underlying transaction values. Google\'s value-based bidding documentation, dynamic per-conversion values are required for Smart Bidding to optimise toward revenue rather than volume. Fix: switch to "Use different values for each conversion" and verify the value parameter flows from GTM. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      { label: 'Google Ads. Set up conversion values', url: 'https://support.google.com/google-ads/answer/13064107' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'lead-conversions-with-values', 'value-outliers'],
  },
  {
    id: 'suboptimal-attribution-model',
    name: 'Suboptimal Attribution Model',
    source: 'ads',
    severity: 'info',
    summary: 'High-volume conversion actions still use Last-Click attribution when Data-Driven would be eligible and more accurate.',
    directAnswer:
      'One or more high-volume conversion actions in this account use Last-Click attribution despite having enough conversion volume to qualify for Data-Driven Attribution (DDA). Last-Click systematically over-credits the closing-touch and under-credits assist touches, which biases bidding toward bottom-of-funnel campaigns and away from upper-funnel traffic that actually drove demand.',
    why: 'Last-Click was the default attribution model for most of Google Ads\' history, but it has a known limitation: it assigns 100% of conversion credit to the last touchpoint, treating every assist touch as worthless. This systematically under-credits brand awareness, prospecting, and display campaigns even when they materially drove the eventual conversion. Data-Driven Attribution uses observed account-level path data to assign fractional credit and is generally more accurate for accounts with sufficient volume. The check fires when AdLint sees a Last-Click action that has enough recent volume to be DDA-eligible. The team is leaving optimisation accuracy on the table.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, identify each Last-Click action with sufficient volume. 2. Edit the action and change Attribution Model to Data-Driven. Google Ads will indicate eligibility status. if marked eligible, the change takes effect at the next attribution refresh. 3. Annotate the date. Smart Bidding will re-baseline around the new attribution signal over 7-14 days. 4. Compare campaign reports before and after to understand which campaigns gain credit under DDA (typically upper-funnel) and which lose (typically brand and remarketing).',
    example: 'Action: Purchase\nCurrent model: Last-Click\nVolume (30d): 412 conversions (DDA-eligible)\nRecommended: Data-Driven Attribution',
    citationTemplate:
      'Google Ads conversion actions with sufficient volume to qualify for Data-Driven Attribution but still configured for Last-Click. Google\'s attribution documentation, DDA produces more accurate credit assignment for accounts with sufficient volume and is recommended for Primary high-volume actions. Last-Click systematically under-credits assist touchpoints. Fix: switch eligible actions to Data-Driven Attribution and re-baseline campaign reports over the following 14 days. Source: support.google.com/google-ads/answer/6394265.',
    references: [
      { label: 'Google Ads. About attribution models', url: 'https://support.google.com/google-ads/answer/6394265' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['data-driven-eligibility', 'inconsistent-attribution-models', 'struct-all-last-click'],
  },
  {
    id: 'view-through-window-analysis',
    name: 'View-Through Conversion Window Analysis',
    source: 'ads',
    severity: 'info',
    summary: 'View-through conversion (VTC) windows are configured in ways that may inflate or deflate display and YouTube measurement.',
    directAnswer:
      'View-through conversion windows determine how long after an ad impression. Not a click. a conversion can still be attributed to that impression. AdLint flags configurations where the VTC window is either too long (likely over-attributing) or too short (likely missing genuine display- and YouTube-driven conversions).',
    why: 'View-through attribution is inherently weaker evidence than click-through attribution. The user saw the ad but did not engage with it, so the causal chain is more speculative. Google Ads defaults VTC windows to 1 day for most actions, which is conservative. Some accounts extend this to 7 or 30 days to capture more display-driven activity, but the longer the window, the more likely the attributed conversion would have happened anyway. The right setting depends on the role display and YouTube play in the funnel: brand campaigns benefit from a longer view-through window because their measurable impact is delayed; direct-response display benefits from a shorter window because the causality should be near-immediate.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, review the View-through window for each action. 2. If the account is heavy on display or YouTube and uses the default 1-day window: consider extending to 7 days for awareness-stage actions, but never to 30+ unless you have a documented reason. 3. If the account is search-heavy with display as a small share: the default 1-day window is appropriate. 4. Annotate the change date. View-through-attributed conversion volume will adjust under the new window.',
    example: 'Action: Purchase\nView-through window: 30 days (likely over-attributing)\nRecommended: 7 days if display campaigns are awareness-focused, 1 day otherwise.',
    citationTemplate:
      'Google Ads conversion actions with view-through conversion windows that may misalign with the role display and YouTube play in the funnel. Google\'s view-through conversion documentation, VTC windows should reflect the realistic causal window for impression-driven conversions; over-long windows inflate display-attributed conversions through coincidental late attributions. Fix: align VTC windows to the campaign mix and document the choice in team materials. Source: support.google.com/google-ads/answer/2998563.',
    references: [
      { label: 'Google Ads. About view-through conversions', url: 'https://support.google.com/google-ads/answer/2998563' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['struct-window-asymmetry', 'attribution-window-mismatch'],
  },
  {
    id: 'roas-feasibility',
    name: 'ROAS Target Feasibility',
    source: 'ads',
    severity: 'warning',
    summary: 'Configured Target ROAS values are unrealistic given historical account performance.',
    directAnswer:
      'One or more campaigns use Target ROAS values that diverge materially from the account\'s historical ROAS performance. Targets set well above achieved ROAS will cause Smart Bidding to suppress spend; targets set well below will leave revenue on the table by over-spending on marginal traffic.',
    why: 'Target ROAS tells Smart Bidding "I want X dollars of conversion value per dollar of spend." The algorithm achieves this by being more selective about which auctions to enter. When the target is set above the historical achieved ROAS, Smart Bidding cannot meet it without dramatically reducing spend. The campaign chokes itself trying to find auctions it can win at the required efficiency. When the target is set well below, the algorithm leaves performance on the table by bidding into auctions that produce mediocre returns. The right tROAS is generally set near the historical achieved ROAS, then incrementally tightened (5-10% at a time) over multiple weeks. AdLint flags targets > 50% above or below the trailing-90-day actual.',
    howToFix:
      '1. Calculate trailing-90-day actual ROAS by campaign or campaign group. 2. Compare to the current Target ROAS setting. 3. If target > 1.5× actual: reduce the target to within 10-15% of actual; this allows Smart Bidding to maintain spend volume while improving efficiency. 4. If target < 0.5× actual: raise the target gradually (10% per week) to capture available efficiency without forcing a learning-period reset. 5. Track week-over-week ROAS and conversion volume after each change.',
    example: 'Campaign: Brand Search\nHistorical ROAS (90d): 580%\nCurrent Target ROAS: 1200% (2× actual. Campaign will throttle spend)\nRecommended target: 650% with weekly 10% tightening.',
    citationTemplate:
      'Google Ads campaigns using Target ROAS values materially divergent from historical achieved ROAS. Google\'s Target ROAS documentation, targets that diverge significantly from historical performance produce either spend suppression (target too high) or inefficient bidding (target too low). Fix: set targets near historical actuals and tighten incrementally. Source: support.google.com/google-ads/answer/6268637.',
    references: [
      { label: 'Google Ads. About Target ROAS bidding', url: 'https://support.google.com/google-ads/answer/6268637' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['smart-bidding-volume', 'zero-value-purchases', 'value-outliers'],
  },
  {
    id: 'value-outliers',
    name: 'Conversion Value Outliers',
    source: 'ads',
    severity: 'warning',
    summary: 'Some conversion actions have extreme value outliers that distort Smart Bidding signal.',
    directAnswer:
      'One or more conversion actions in this account have extreme value outliers. Individual conversions reporting values 10×, 100×, or more above the median. Outliers can corrupt Smart Bidding when the algorithm treats a single $50,000 conversion as evidence for a pattern that will not repeat. The fix is to investigate the outliers, fix the data pipeline if they are bugs, or cap conversion values if they are real-but-misleading.',
    why: 'Smart Bidding learns from observed conversion values. A normal $129 e-commerce purchase teaches the algorithm what the average customer is worth; a single $250,000 enterprise contract that fired the same conversion action tells the algorithm an entirely different story. The algorithm cannot distinguish "this is a real but rare outcome" from "this is a data pipeline bug," so it weighs the outlier into its learned distribution. The result: bidding pushes spend toward audiences and contexts that resemble the outlier, even when the outlier is not reproducible. The check identifies extreme value distributions; the team must decide whether to investigate, cap, or filter.',
    howToFix:
      '1. AdLint\'s details list each conversion action and the magnitude of the outliers. 2. For each, investigate the source: are the outliers genuine large transactions, or data pipeline bugs (currency mismatch, decimal-point error, sum of multiple transactions)? 3. If bugs: fix the pipeline so future values are correct. 4. If genuine but rare: consider a max-value cap on the conversion action (Google Ads supports this via offline import scripts) or move enterprise-scale transactions to a separate conversion action that does not feed automated bidding. 5. Re-run Smart Bidding with cleaner signal.',
    example: 'Action: Purchase\nMedian value: $129\nMax value (30d): $48,720 (likely enterprise contract, not typical e-commerce)\nRecommended action: investigate; cap or segregate enterprise-scale conversions.',
    citationTemplate:
      'Google Ads conversion actions with extreme value outliers (individual conversions reporting values orders of magnitude above the median). Google\'s value-based bidding documentation, Smart Bidding weighs outliers into its learned distribution, which can push bidding toward irreproducible scenarios. Fix: investigate the source, fix data-pipeline bugs, and consider capping or segregating extreme-value conversions. Source: support.google.com/google-ads/answer/7335652.',
    references: [
      { label: 'Google Ads. About value-based bidding', url: 'https://support.google.com/google-ads/answer/7335652' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['fixed-value-dynamic-revenue', 'value-consistency-by-category', 'roas-feasibility'],
  },
  {
    id: 'value-consistency-by-category',
    name: 'Value Consistency Within Category',
    source: 'ads',
    severity: 'info',
    summary: 'Conversion actions within the same category report values that vary in ways the category does not explain.',
    directAnswer:
      'Within a single Google Ads conversion category (e.g. "Lead" or "Sign-up"), individual actions report values that vary materially. This may be intentional (different lead types have different qualified-revenue contributions) or a sign of inconsistent value methodology across actions.',
    why: 'A consistent value methodology across actions within a category is what makes category-level reporting interpretable. When "Lead. Demo" reports $200 and "Lead. Whitepaper" reports $10, the category-aggregate "Lead value" is dominated by whichever lead type fires most often. Usually the cheaper one. And obscures the contribution of higher-value leads. The check is info-level because mixed values are sometimes intentional (genuinely different lead types), but they should be documented if so. When the variation is unintentional (one team set the value, another did not, a third copied from a sale template), the category-level reports become misleading.',
    howToFix:
      '1. AdLint\'s details list each category with high value variance and the contributing actions. 2. For each, document the intended value methodology: is each lead type genuinely worth a different amount (then keep the variance and document the per-action calculation), or should they all be normalised to a category-level standard? 3. Where normalisation is appropriate, update each action\'s value to the agreed methodology. 4. Document the per-category value methodology in team measurement materials.',
    example: 'Category: Lead\nActions:\n  Lead. Demo: $200\n  Lead. Whitepaper: $10\n  Lead. Newsletter: $1\nDecision: keep variance (documented). Each lead type has materially different close rate.',
    citationTemplate:
      'High value variance within Google Ads conversion categories. Google\'s value-based bidding documentation, within-category value variance should reflect an intentional and documented methodology, not accidental inconsistency. Variance without documented intent makes category-aggregate reports misleading. Fix: document per-category value methodology or normalise actions within categories. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      { label: 'Google Ads. Set up conversion values', url: 'https://support.google.com/google-ads/answer/13064107' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['value-outliers', 'lead-conversions-with-values', 'fixed-value-dynamic-revenue'],
  },
  {
    id: 'zero-value-with-count',
    name: 'Zero-Value Conversions with Volume',
    source: 'ads',
    severity: 'warning',
    summary: 'A conversion action is firing regularly but every conversion reports a value of zero.',
    directAnswer:
      'A conversion action in this account is firing regularly (count > 0) but every conversion reports a value of zero. The action is configured to accept dynamic values, but the upstream pipeline (GTM or import) is sending zero. Likely because a Data Layer Variable is unresolved or the import column is missing.',
    why: 'This is a specific, common failure pattern that is distinct from `zero-value-purchases` (where the action is configured for no value). Here the action is configured for dynamic value and the pipeline is broken. The conversions count, dashboards populate, but Smart Bidding receives no value signal. The action looks healthy in the conversions list (recent volume, recent fires) but is equivalent to "Don\'t use a value." The fix is at the upstream layer. Either the GTM tag\'s value parameter is unresolved, the dataLayer push is missing the value field, or the offline import column is empty.',
    howToFix:
      '1. In Google Ads, confirm the action is configured for dynamic value ("Use different values for each conversion"). 2. For website tags: check the GTM Google Ads Conversion Tag\'s value parameter. Verify the Data Layer Variable resolves to a non-zero value in Preview mode. Cross-reference with the `missing-datalayer-variables` check. 3. For offline imports: verify the import file\'s Conversion Value column is populated and not empty/zero on the rows being imported. 4. Re-test a real conversion and verify the next-day Google Ads report shows non-zero values for the action.',
    example: 'Action: Purchase\nConversion count (30d): 412\nReported value (30d): $0.00\nLikely cause: GTM value parameter unresolved or import column missing.',
    citationTemplate:
      'A Google Ads conversion action firing with volume but reporting zero values across all conversions. Google\'s conversion value documentation, this pattern indicates an upstream pipeline failure. Typically an unresolved GTM Data Layer Variable or an empty import column. Rather than a Google Ads configuration issue. Fix: verify the GTM value parameter in Preview mode or the import file column, then re-test a conversion. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      { label: 'Google Ads. Set up conversion values', url: 'https://support.google.com/google-ads/answer/13064107' },
      { label: 'Google Ads. Troubleshoot conversion tracking', url: 'https://support.google.com/google-ads/answer/6307083' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'missing-datalayer-variables', 'fixed-value-dynamic-revenue'],
  },
  {
    id: 'struct-naming-convention',
    name: 'Conversion Action Naming Convention',
    source: 'ads',
    severity: 'info',
    summary: 'Conversion action names do not follow a consistent convention across the account.',
    directAnswer:
      'Conversion actions in this account use inconsistent naming patterns. The runtime cost is zero, but inconsistent names slow every audit and increase the risk that a campaign gets wired to the wrong action because two similarly-named actions are hard to distinguish at a glance.',
    why: 'Naming conventions for conversion actions follow the same logic as the `naming-conventions` check for GTM tags: the name is the primary auditor signal, and consistency speeds every governance cycle. The recommended pattern in measurement teams is `<Event>. <Source>` (e.g. "Purchase. Website," "Lead. Salesforce Import"). When the same account mixes "Purchase," "purchase-web," "Website Purchase," and "purchase_web_v2," every audit costs more time than it should, and similarly-named actions get confused with each other in campaign goal setup.',
    howToFix:
      '1. Adopt and document the `<Event>. <Source>` convention. 2. Rename existing actions in batches. Renaming is non-destructive and preserves all historical data. 3. Treat naming as a publish-gating governance check at the team level. 4. New conversion actions should follow the convention by default.',
    example: 'Inconsistent: Purchase, purchase-web, Website Purchase, purchase_v2\nConsistent: Purchase. Website, Purchase. Offline, Purchase. App',
    citationTemplate:
      'Google Ads conversion actions with inconsistent naming patterns. Measurement-governance best practice, conversion action names should follow a consistent `<Event>. <Source>` pattern to speed audits and reduce campaign-goal-misassignment risk. Fix: adopt the convention, rename existing actions, and treat naming as a governance gating check. Source: support.google.com/google-ads/answer/6095821.',
    references: [
      { label: 'Google Ads. Set up your conversion action', url: 'https://support.google.com/google-ads/answer/6095821' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-name-quality', 'struct-semantic-duplicates'],
  },
  {
    id: 'struct-semantic-duplicates',
    name: 'Semantic Duplicate Conversion Actions',
    source: 'ads',
    severity: 'warning',
    summary: 'Conversion actions exist with different names but identical or near-identical semantic intent.',
    directAnswer:
      'Two or more conversion actions in this account have different names but appear to track the same business event ("Purchase," "purchase-web," "Website Purchase"). Unless explicitly de-duplicated, these inflate measurement and confuse campaign-goal selection.',
    why: 'Semantic duplicates are the harder cousin of strict duplicates. Two actions with literally the same configuration are easy to spot; two actions with near-identical configuration but different names slip past most reviews. They arise from team rotations (each new owner creates "their" version), tracking migrations (the old action stays alongside the new one), or template propagation (a sample action gets copied without being renamed properly). The damage: campaign goal setup includes ambiguous duplicates, conversion counts double when both are selected, and Smart Bidding learns from a signal split across redundant actions. AdLint identifies these by comparing categories, sources, and value methodology across same-event candidates.',
    howToFix:
      '1. AdLint\'s details list semantic-duplicate candidates. 2. For each set, pick the canonical action (usually the most recently maintained one). 3. In each active campaign\'s goal settings, switch from the duplicates to the canonical action. 4. Archive (do not delete) the duplicates so historical data is preserved. 5. Document the canonical action in team materials so future setup uses it by default.',
    example: 'Semantic duplicates:\n  Purchase\n  Purchase - Website\n  Website Purchase\n  purchase-web-2024\n\nFix: standardise on "Purchase. Website" (per naming convention), rewire campaigns, archive duplicates.',
    citationTemplate:
      'Google Ads conversion actions with different names but identical or near-identical semantic intent. Google\'s conversion-tracking documentation, multiple actions for the same business event must be explicitly deduplicated or they will double-count conversions when included in the same campaign goals. Fix: standardise on a canonical action per business event, rewire campaigns, and archive duplicates. Source: support.google.com/google-ads/answer/6386790.',
    references: [
      { label: 'Google Ads. Troubleshoot duplicate conversions', url: 'https://support.google.com/google-ads/answer/6386790' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-conversions', 'struct-naming-convention', 'conversion-source-consistency'],
  },
  {
    id: 'struct-category-name-mismatch',
    name: 'Conversion Category vs Name Mismatch',
    source: 'ads',
    severity: 'info',
    summary: 'A conversion action\'s category does not match what its name implies.',
    directAnswer:
      'One or more conversion actions have categories that contradict their names. an action named "Purchase. Website" categorised as "Lead," or "Lead. Salesforce" categorised as "Other." Either the category is wrong, the name is wrong, or the action genuinely represents something the team has not been clear about.',
    why: 'Category and name should agree. Disagreement usually indicates a setup mistake. Someone changed one but not the other, or copied a template without updating both fields. The damage is subtle: campaign goal selection, category-aware reporting, and external integrations all key off the Category field, so a misclassified action shows up in the wrong places and produces confusing reports. Auditors and new team members trust the name first and the category second, which means misalignment leads to slow-cooked mistakes that surface as quarterly-report discrepancies.',
    howToFix:
      '1. AdLint\'s details list each mismatch and the recommended category based on the name. 2. For each, decide: is the name correct (then change the category to match) or is the category correct (then rename to match)? 3. Update in Tools & Settings → Measurement → Conversions. 4. Verify campaign goal settings still include the action correctly after the change.',
    example: 'Action name: Lead. Salesforce Import\nCurrent category: Other\nRecommended category: Submit lead form (matches the name)',
    citationTemplate:
      'Google Ads conversion actions where the Category field disagrees with the action name. Google\'s conversion category documentation, category determines which Google Ads features (lead-form integration, e-commerce reporting, category-aware bidding) apply to the action. Mismatches between name and category produce confusing reports and disable applicable features. Fix: align category and name explicitly. Source: support.google.com/google-ads/answer/6095821.',
    references: [
      { label: 'Google Ads. Set up your conversion action', url: 'https://support.google.com/google-ads/answer/6095821' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['unusual-categories', 'conversion-name-quality'],
  },
  {
    id: 'struct-counting-category-mismatch',
    name: 'Counting Method vs Category Mismatch',
    source: 'ads',
    severity: 'warning',
    summary: 'Counting method (One vs Every) does not match the configured conversion category.',
    directAnswer:
      'A conversion action has a counting method that does not match its category. a Lead action set to "Every" (inflates lead counts when users retry submissions), or a Purchase action set to "One" (undercounts repeat purchases in the same click session). Whichever way it is misaligned, the action systematically misrepresents volume.',
    why: 'This is a more specific version of the `wrong-counting-method` finding, anchored to the explicit Category field. Google Ads recommends "One" for Lead, Sign-up, Submit lead form, and similar lead-style categories, and "Every" for Purchase, Sale, and transaction-style categories. When the configured counting contradicts the category, the action systematically miscounts. Either by inflating lead volume through retries or by underreporting repeat purchases.',
    howToFix:
      '1. AdLint\'s details list each mismatched action. 2. For lead-style categories (Lead, Sign-up, Submit lead form, Phone Call): change counting to "One." 3. For sale-style categories (Purchase, Sale, Begin Checkout used as a conversion): change counting to "Every." 4. Annotate the change date. Historical volume will retroactively adjust under the new counting method.',
    example: 'Action: Lead. Demo Request\nCategory: Submit lead form\nCurrent counting: Every\nRecommended counting: One (matches the lead category)',
    citationTemplate:
      'Google Ads conversion actions where the counting method does not match the recommended counting for the action\'s category. Google\'s counting documentation, lead-style categories should use "One" and sale-style categories should use "Every." Misaligned counting systematically miscounts conversion volume. Fix: align counting to category and re-baseline campaign performance after one cycle. Source: support.google.com/google-ads/answer/3438531.',
    references: [
      { label: 'Google Ads. Choose a counting setting', url: 'https://support.google.com/google-ads/answer/3438531' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['wrong-counting-method', 'duplicate-conversions'],
  },
  {
    id: 'struct-duplicate-static-values',
    name: 'Duplicate Static Values Across Actions',
    source: 'ads',
    severity: 'info',
    summary: 'Multiple conversion actions use the same fixed value, which can indicate copy-paste setup without per-action review.',
    directAnswer:
      'Multiple conversion actions in this account use identical fixed values (e.g. Three different lead actions all set to $50). The pattern usually indicates each action was created by copying a template and the value field was not customised per the actual business meaning. Even if the values happen to be the right amount, the lack of per-action calibration is a governance smell.',
    why: 'Different business events have different revenue contributions. A demo request lead is not worth the same as a newsletter signup; a Premium-tier purchase is not worth the same as a Basic-tier purchase. When multiple actions share the same fixed value, it usually means nobody calibrated the values for each action\'s specific economic role. The check is info-level because the values may happen to be correct, but the pattern is a leading indicator that the value methodology was not thought through. Review and document the per-action value or recalibrate.',
    howToFix:
      '1. AdLint\'s details list groups of actions sharing identical fixed values. 2. For each group, decide: is the shared value correct for each action, or was it copy-pasted? 3. Where copy-paste: calculate the per-action value (lead × close rate × ARPU, or tier-specific revenue) and update. 4. Document the value methodology per action in the Description field.',
    example: 'Identical $50 value:\n  Lead. Demo Request: $50\n  Lead. Whitepaper: $50\n  Lead. Newsletter: $50\nReview: are these really worth the same, or was it copy-paste?',
    citationTemplate:
      'Groups of Google Ads conversion actions using identical fixed values. Per measurement governance best practice, per-action values should reflect the specific economic contribution of each business event; identical values across semantically-different actions usually indicate uncalibrated copy-paste setup. Fix: review and calibrate per-action values, and document the methodology in the action description. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      { label: 'Google Ads. Set up conversion values', url: 'https://support.google.com/google-ads/answer/13064107' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['lead-conversions-with-values', 'fixed-value-dynamic-revenue', 'value-consistency-by-category'],
  },
  {
    id: 'struct-window-asymmetry',
    name: 'Click vs View-Through Window Asymmetry',
    source: 'ads',
    severity: 'info',
    summary: 'Click-through and view-through windows are set in ways that produce inconsistent attribution logic.',
    directAnswer:
      'A conversion action\'s click-through and view-through windows are set in a relative configuration that does not follow the typical pattern. View-through windows are normally shorter than click-through windows because view-through evidence is weaker, but some actions in this account configure them inverted or near-identical, which produces inconsistent attribution treatment.',
    why: 'A view-through is a less reliable causal signal than a click. The user saw the ad but did not engage. So Google\'s recommended practice is to use shorter view-through windows than click-through windows (e.g. 1-day view-through, 30-day click-through). When an account inverts this. Say, 30-day view-through with 7-day click-through. The view-through signal can dominate the click-through signal in attribution reports, which inverts the relative weighting of impression-vs-click evidence in ways that are usually unintentional.',
    howToFix:
      '1. AdLint\'s details list each action with asymmetric windows and the recommended adjustment. 2. Open each action in Tools & Settings → Measurement → Conversions and review the window pair. 3. Standardise: VTC window ≤ click-through window, typically by a factor of 4-30×. 4. Document the chosen pair in team measurement materials.',
    example: 'Action: Purchase\nClick-through window: 7 days\nView-through window: 30 days (inverted relationship. VTC dominates click attribution)\nFix: VTC = 1 or 7 days; click-through = 30+ days.',
    citationTemplate:
      'Google Ads conversion actions with click-through and view-through window pairs configured in inverted or near-identical relationships. Google\'s attribution documentation, view-through windows should typically be shorter than click-through windows because view-through evidence is causally weaker. Inverted pairs produce attribution reports where view-through signal dominates click-through signal in unintended ways. Fix: standardise so VTC ≤ click-through window by a factor of 4-30×. Source: support.google.com/google-ads/answer/2998563.',
    references: [
      { label: 'Google Ads. About view-through conversions', url: 'https://support.google.com/google-ads/answer/2998563' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['view-through-window-analysis', 'attribution-window-mismatch'],
  },
  {
    id: 'struct-all-last-click',
    name: 'All Conversions Use Last-Click Attribution',
    source: 'ads',
    severity: 'warning',
    summary: 'Every enabled conversion action in this account uses Last-Click attribution despite many being DDA-eligible.',
    directAnswer:
      'Every enabled conversion action in this account uses Last-Click attribution. Several high-volume actions would qualify for Data-Driven Attribution (DDA), which is generally more accurate. The account is leaving attribution accuracy on the table.',
    why: 'Last-Click is the simplest attribution model. 100% of credit to the last touchpoint. It has the advantage of being deterministic and easy to explain to stakeholders, but the disadvantage of systematically under-crediting assist touches. When every action uses Last-Click, the account\'s entire attribution lens defaults to "credit only the closing touch," which biases campaign-level reports toward bottom-of-funnel campaigns and away from prospecting/awareness. DDA is generally more accurate for high-volume accounts, and at this point in Google Ads\' evolution (post-2023) it is the recommended default for accounts with sufficient signal. The check is more severe than `suboptimal-attribution-model` because every action is Last-Click. Not just some. Indicating an account-wide methodology choice that may not have been revisited recently.',
    howToFix:
      '1. Identify which Primary actions are DDA-eligible (volume threshold; check Tools & Settings → Measurement → Attribution). 2. Update eligible Primary actions to Data-Driven Attribution. 3. Document the attribution methodology change in team materials and stakeholder reports. Campaign-level credit allocations will shift. 4. Re-baseline campaigns over 14-30 days under the new attribution.',
    example: 'All 12 enabled conversion actions: Last-Click\nDDA-eligible (volume): 5\nRecommended: switch eligible Primary actions to Data-Driven.',
    citationTemplate:
      'That every enabled Google Ads conversion action in this account uses Last-Click attribution. Google\'s attribution documentation, Data-Driven Attribution is the recommended default for accounts with sufficient conversion volume and produces more accurate credit assignment than Last-Click. Fix: switch eligible Primary actions to Data-Driven Attribution and re-baseline campaign reports. Source: support.google.com/google-ads/answer/6394265.',
    references: [
      { label: 'Google Ads. About attribution models', url: 'https://support.google.com/google-ads/answer/6394265' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['suboptimal-attribution-model', 'data-driven-eligibility', 'inconsistent-attribution-models'],
  },
  {
    id: 'struct-attribution-chaos',
    name: 'Account-Wide Attribution Chaos',
    source: 'ads',
    severity: 'warning',
    summary: 'The account uses many different attribution models across actions in ways that make portfolio-level reporting incoherent.',
    directAnswer:
      'This account uses many different attribution models across its conversion actions. Last-Click, Position-Based, Data-Driven, Linear, Time-Decay. Without a discernible governance pattern. Account-level reports that mix these are not interpretable; campaign decisions made against the mixed signal are unreliable.',
    why: 'A single account using multiple attribution models can be intentional (Data-Driven for the high-volume macro action, simpler models for low-volume diagnostics). But when more than three models appear with no apparent rationale, the account has accumulated attribution debt. Every team member added a model that made sense to them, none cleaned up. The downstream effects are real: campaign reports rolling up multiple actions blend their attribution logic, period-over-period comparisons are unreliable, and Smart Bidding learns from a signal whose model assumptions are inconsistent.',
    howToFix:
      '1. Audit each enabled Primary action and its current attribution model. 2. Decide an account-level attribution philosophy: Data-Driven for all eligible actions, with a documented fallback (Position-Based or Linear) for actions that do not yet qualify. 3. Update every action to either the chosen primary model or the documented fallback. 4. Archive or document any actions that need a non-standard model with a written justification in the Description field. 5. Add attribution-model auditing to the team\'s quarterly governance cycle.',
    example: 'Current account models:\n  Purchase: Data-Driven\n  Lead: Last-Click\n  Demo Request: Position-Based\n  Sign-up: Linear\n  Phone Call: Time-Decay\nFix: standardise on Data-Driven, fall back to Position-Based for low-volume actions, document any exceptions.',
    citationTemplate:
      'Google Ads accounts using multiple attribution models across conversion actions without a discernible governance pattern. Google\'s attribution documentation, mixed-model accounts produce incoherent portfolio-level reports and unreliable Smart Bidding signal. Fix: standardise on a single primary attribution model with a documented fallback, update each action, and add attribution to quarterly governance review. Source: support.google.com/google-ads/answer/6394265.',
    references: [
      { label: 'Google Ads. About attribution models', url: 'https://support.google.com/google-ads/answer/6394265' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['inconsistent-attribution-models', 'suboptimal-attribution-model', 'struct-all-last-click'],
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
    why: 'A detailed editorial explainer for this check has not been published yet. The check is fully implemented in the AdLint audit engine. Only the long-form documentation page is pending.',
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

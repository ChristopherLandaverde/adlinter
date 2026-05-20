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
    summary: 'No Google Ads Conversion Linker is firing on this site.',
    directAnswer:
      'Your container is missing the Conversion Linker. Every Google Ads conversion on the site is firing without the GCLID. Whenever the click lands on one page and the purchase happens two pageviews later (basically always), the click context is gone. Google still counts the conversion. It just can\'t tell you which ad caused it.',
    why: 'The chain looks like this. Someone clicks an ad. Google appends `?gclid=abc123...` to your landing URL. The Conversion Linker reads that `gclid` and writes it into a first-party cookie called `_gcl_aw`. The user browses, adds to cart, buys. Your Google Ads conversion tag fires on the order-confirmation page, pulls the GCLID back out of `_gcl_aw`, and sends the conversion with that ID attached. Google matches it back to the original click.\n\nWithout the Conversion Linker, the cookie never gets written. The conversion tag still fires fine on the confirmation page, but the GCLID is gone, so the conversion lands at Google with nothing attached. Your dashboards keep populating off junk signal. Smart Bidding keeps optimizing off the same junk. Nothing tells you it\'s broken until reported ROAS stops matching the bank account.\n\nThe longer the gap between click and purchase, the worse the bleed. A B2B funnel with a 30-day sales cycle loses almost all attribution. A multi-page checkout loses a chunk on every order. The conversion tag itself is healthy the whole time, so the dashboard looks normal. The damage shows up in reconciliation, months after you could have caught it.',
    howToFix:
      '1. In GTM, hit New Tag, pick "Google Ads Conversion Linker."\n2. Trigger: All Pages.\n3. Multi-domain funnel (payment processor on a different domain, Shopify checkout, anything cross-host)? Open Linker Settings, turn on auto-link domains, paste every domain that appears in a real conversion path. Yes, the payment processor counts.\n4. Hit Preview. Load any page. Confirm the linker shows up in the Tags Fired panel.\n5. Publish. The finding clears on the next AdLint run.',
    example:
      'Tag type: Google Ads Conversion Linker\nTrigger: All Pages\nAuto-link domains: example.com, checkout.example-payments.com',
    citationTemplate:
      'This GTM container is missing the Google Ads Conversion Linker tag. Per Google\'s Tag Manager documentation, the Conversion Linker is required for Google Ads conversion tags to preserve ad click identifiers across pageviews. Without it, conversions on this site report without the GCLID that ties them back to the originating ad click. The effect is Smart Bidding optimizing on incomplete signal, and ROAS reports that diverge from actual revenue. Fix: add the Conversion Linker tag on the All Pages trigger and verify it fires before any downstream conversion tag. Source: support.google.com/tagmanager/answer/7549390.',
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
    summary: 'Google Ads tags may fire before the required consent state is granted.',
    directAnswer:
      'Some of your Google Ads tags have no Consent Settings configured. They fire on every page load regardless of whether the user granted `ad_storage`. In GDPR or UK GDPR jurisdictions, that\'s a compliance problem first and a measurement problem second. Data from consent-denied users should never have left the browser.',
    why: 'Google Consent Mode v2 added two ad-related consent signals: `ad_storage` (whether you can use cookies for ad measurement) and `ad_user_data` (whether you can send the user\'s identifiers to Google). Every Google Ads tag should read these signals before firing. If the tag has no Consent Settings in GTM, it ignores them entirely.\n\nWhen a tag ignores those signals, you ship data from users who explicitly said no. That\'s the regulatory exposure. The compounding problem is that Google\'s modelling pipeline (the one that backfills attribution for consent-denied users) assumes the consent-denied hits were tagged as such. Hits that fired without consent metadata can\'t be backfilled, so you also lose the measurement Google offers as the consolation prize for being compliant. And because the same tag behaves differently across geographies and banner timings, debugging is a moving target.\n\nThe fix is not the consent banner. The banner records the user\'s choice; the GTM tag has to read it. If the tag isn\'t wired to check, the banner can be perfect and the leak continues.',
    howToFix:
      '1. In GTM, open Admin → Container Settings → Consent and turn on "Enable consent overview." That adds a Consent column to the Tags list so you can see at a glance which tags have which requirements. 2. Open every Google Ads Conversion Tracking and Google Ads Remarketing tag. Expand Consent Settings. Tick "Require additional consent for tag to fire" and pick `ad_storage`. If the tag uses Enhanced Conversions, add `ad_user_data` too. 3. Confirm your consent banner sets default consent to denied before any tag loads, and updates consent only after the user picks. If you use a CMP (OneTrust, Cookiebot, etc.), that lives in the CMP config, not GTM. 4. In Preview mode, walk three flows: denied, granted, and "user changed their mind." Confirm Ads tags fire on the granted path and only the granted path. 5. Publish.',
    example: 'Required consent checks: ad_storage, ad_user_data, ad_personalization\nDefault state before banner choice: denied',
    citationTemplate:
      'This GTM container has Google Ads tags configured to fire without Consent Settings. Per Google\'s Consent Mode v2 documentation, Google Ads conversion and remarketing tags are required to honour the `ad_storage` and `ad_user_data` consent signals. Tags without explicit Consent Settings fire on every page load regardless of user choice. The exposure is both regulatory (GDPR, UK GDPR, ePrivacy) and measurement-side: Google\'s modelling pipeline cannot compensate for hits that were never tagged as denied. Fix: configure required-additional-consent on every Google Ads tag and verify denied, granted, and changed-consent paths in GTM Preview before publishing. Source: developers.google.com/tag-platform/security/guides/consent.',
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
      'Two tags fire the same Google Ads conversion on the same trigger, or two Google Ads conversion actions track the same business event. Either way, every real conversion counts twice. Your reported CPA halves overnight without anything actually getting cheaper, and Smart Bidding starts spending against numbers that aren\'t real.',
    why: 'This is the failure mode that looks good while it\'s happening. Doubled conversion volume. Doubled conversion value. Smart Bidding sees more "wins" per dollar and pushes spend up. Dashboards stay green. Nobody notices until someone reconciles against the e-commerce backend or the CRM and discovers reported conversions are exactly 2× the orders the company actually shipped.\n\nThere are two places the duplicate can live. In GTM, it\'s two conversion tags sharing the same Conversion ID and label, both wired to the same trigger (e.g. `purchase_success`). Open both side by side and they\'re nearly identical — the only difference is the tag name. In Google Ads, it\'s two separate Conversion Actions with different display names pointing at the same business outcome, both marked Primary, both feeding Smart Bidding.\n\nThe damage compounds while the duplicate stays in place. Smart Bidding learns from the inflated signal. Budget shifts toward whichever campaign happens to drive the most "wins" (which is now twice what it used to be). When you eventually fix the duplicate, reported volume halves and the team panics about a performance regression that\'s actually a measurement correction.',
    howToFix:
      '1. Open the finding details. AdLint lists each duplicate pair and which layer it lives in (GTM, Google Ads, or both). 2. GTM duplicates: open Workspace → Tags, find each pair that shares Conversion ID + label + trigger, pick a canonical one (usually the one with the better name and more recent edits), and pause or delete the duplicate. 3. Google Ads duplicates: open Tools & Settings → Measurement → Conversions, find the duplicate actions, mark the canonical action Primary, demote the others to Secondary or archive them. 4. Annotate the change date in Google Ads. Historical data still contains the duplicates, so any period-over-period report that crosses the fix date will show a volume drop that is not a performance regression. 5. Wait one full conversion window (usually 30 days) before judging restored performance against the new baseline.',
    example: 'Duplicate pattern: two Ads conversion tags with the same AW-123456789 / abcDEF_label firing on purchase_success',
    citationTemplate:
      'This account has duplicate conversion tracking: either GTM tags or Google Ads conversion actions counting the same business event more than once. Per Google\'s conversion-tracking documentation, each business event should map to exactly one enabled, Primary conversion action. Duplication doubles reported conversion volume and value, which biases Smart Bidding and produces dashboards that diverge from backend reality. Fix: identify each duplicate pair, consolidate to a single canonical action per business event, and annotate the change date for downstream period-over-period reporting. Source: support.google.com/google-ads/answer/6386790.',
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
      'Your purchase event isn\'t pushing a dataLayer object that conversion tags can actually read. Either `value`, `currency`, `transaction_id`, or the `items` array is missing, or the whole thing is shaped wrong. Tags still fire on the confirmation page, but the value they ship is zero or undefined. Google Ads counts the conversion. It just thinks every order is worth $0.',
    why: 'GA4, Google Ads conversion tracking, Meta CAPI, TikTok Events, and most server-side pipelines all read from the same dataLayer object. Each tag subscribes to specific keys inside an `ecommerce` block. The GA4 spec is the canonical shape: an event named `purchase`, a nested `ecommerce` object, and inside it `transaction_id`, `value`, `currency`, and an `items` array of `{ item_id, item_name, price, quantity }` rows.\n\nReal implementations break this shape in predictable ways. Sometimes the developer flattens `value` to the top level instead of nesting it inside `ecommerce`. Sometimes `currency` is missing entirely, so Google Ads has no idea whether the $129 was USD or JPY. Sometimes the dataLayer pushes a different shape on different pages — the product-detail-page push uses `ecommerce.items[].id` while the order-confirmation push uses `ecommerce.items[].item_id`, and each tag picks a different one and they silently disagree.\n\nEverything keeps working at the surface. Tags fire. Conversions count. Dashboards populate with mostly-zero values and the occasional non-zero spike. Smart Bidding optimises against that noise. ROAS reports diverge from the e-commerce backend by an amount nobody can explain. The team eventually files a ticket asking why reported ROAS doesn\'t match what the bank shows.',
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
      'Your Google Ads purchase action is set to "Don\'t use a value" (or fixed at zero). To Smart Bidding, every order looks identical. A $10 sale and a $1,000 sale weigh the same. If you\'re running Target ROAS or Maximize Conversion Value, the algorithm has no revenue signal to optimise against, and it falls back to chasing the cheapest conversions it can find.',
    why: 'Value-based bidding is the entire point of running Target ROAS or Maximize Conversion Value. It lets Google trade conversions for revenue: skip the $10 customer, win the $1,000 customer, even if the $10 customer was easier to acquire. The strategy stops working the moment conversion value goes to zero.\n\nWithout a value, Smart Bidding can\'t prioritise high-revenue traffic because it can\'t see which traffic is high-revenue. It defaults to count optimisation, spending to maximise the number of conversions regardless of what each one is worth. Budget shifts toward whatever campaign cranks out cheap conversions — usually branded search or remarketing — at the expense of upper-funnel campaigns that are actually driving the high-value buyers.\n\nThe Google Ads side of the fix is one setting. The hard part is upstream. Value has to flow from the site to the dataLayer, from the dataLayer to the GTM tag, from the GTM tag to Google Ads. If any link in that chain is broken, fixing the Google Ads setting only exposes the next broken link. Audits commonly find this in roughly a third of e-commerce accounts, which is the single most common preventable cause of underperforming Target ROAS campaigns.',
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
    id: 'all-vs-primary-gap',
    name: 'Primary Gap',
    source: 'report',
    severity: 'info',
    summary: 'One or more conversion actions show "All conversions" more than 2x the "Conversions" column.',
    directAnswer:
      'Your Google Ads account has conversion actions where "All conversions" runs more than twice the size of "Conversions." That gap is the volume marked Secondary. It counts in reports. It does not feed Smart Bidding. So a big chunk of what looks like account-wide performance is invisible to the bidder making your spend decisions.',
    why: 'The "Conversions" column is the one Smart Bidding optimizes against. Only actions flagged as Primary land in it. "All conversions" is the catch-all, including every Secondary action plus imports, cross-account, and cross-device variants. When the gap goes above 2x, you have a meaningful amount of conversion volume that the bidder is ignoring on purpose.\n\nSometimes that is correct. Newsletter signups, scroll events, and PDF downloads belong in Secondary. They are diagnostic, not commercial. But the same gap appears when somebody demoted a real revenue action during a cleanup pass, or when a new action was added and never promoted, or when an import is feeding Secondary while the tag-based version was disabled. From the outside the numbers look fine. Reporting shows healthy growth in "All conversions." Internally, the bidder is steering off a smaller, possibly stale signal.\n\nThe other symptom: Smart Bidding learning loops keep restarting because the Primary action does not have enough volume to escape learning, while the Secondary action has plenty. The fix is one toggle. The cost of leaving it alone is months of underperforming campaigns.',
    howToFix:
      '1. Open Google Ads, Goals, Conversions, Summary. Sort by the gap between "All conv." and "Conversions." 2. For each flagged action, decide: should this feed bidding (Primary) or is it diagnostic (Secondary)? 3. Promote real revenue or qualified-lead actions to Primary at the appropriate goal level. 4. Leave page views, scrolls, and minor engagement as Secondary. 5. Recheck the report after 7-14 days and confirm the gap closed on the actions you promoted.',
    example: 'Lead Form: Conversions = 42, All conversions = 128, ratio 3.0x\nMost of the volume is sitting in Secondary and not feeding the bidder.',
    citationTemplate:
      'This Google Ads account has one or more conversion actions where the "All conversions" column exceeds the "Conversions" column by more than 2x. Per Google Ads conversion goals documentation, only Primary actions feed the "Conversions" column that Smart Bidding optimizes against. Volume marked Secondary is reported but excluded from bidding decisions. A gap this large usually means a real revenue action was left as Secondary after a goals reorganization, a newly added action was never promoted, or an offline import is duplicating a tag-based action that has since been demoted. The visible effect is healthy "All conversions" growth alongside underperforming campaigns and Smart Bidding learning loops that fail to settle. Fix: review the flagged actions, promote genuine revenue or qualified-lead actions to Primary at the correct goal level, and leave diagnostic events as Secondary. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-concentration', 'micro-conversion-pollution', 'model-attribution-drift'],
  },
  {
    id: 'conversion-concentration',
    name: 'Concentration Risk',
    source: 'report',
    severity: 'warning',
    summary: 'A single conversion action accounts for more than 90% of total conversion volume.',
    directAnswer:
      'Your Google Ads account has one conversion action carrying over 90% of total volume. If that action breaks, Smart Bidding loses almost all of its training signal in a single failure. There is no fallback, no second source feeding the bidder while you investigate.',
    why: 'Smart Bidding is a learner. It needs a steady stream of conversion events to keep its model calibrated to current site behavior. When 90%+ of that stream comes from one action, you have a single point of failure on the most expensive part of the account: the bidder itself. A broken tag, a renamed event, a consent change, a checkout redesign, a CMS migration, any of those things can zero out the dominant action overnight. The bidder does not stop. It just operates with stale or missing feedback and quietly drifts off-target.\n\nThe second risk is observational. With one action dominating, your reports cannot tell whether the business is healthy or whether one tag is healthy. You lose the ability to spot funnel issues because everything aggregates into the same number. A drop in newsletter signups, a drop in add-to-carts, a drop in account creations: invisible. You only see purchases, and you see them late.\n\nDiversification here is not about creating fake actions. It is about making sure the supporting events on the path to revenue (lead submit, add to cart, begin checkout, account create) are tracked, named, and at least visible as Secondary so a single failure does not blank the account.',
    howToFix:
      '1. Identify the dominant action in the report and confirm its volume share. 2. Audit the rest of the funnel: are add-to-cart, begin-checkout, account-create, or lead-submit events tracked at all? 3. Implement the missing upstream actions as Secondary conversions so they appear in "All conversions" without disrupting bidding. 4. Add at least one backup Primary if the business model supports it (a qualified lead in addition to purchase, for example). 5. Set up an alert on the dominant action so a sudden drop pages someone within 24 hours, not 30 days.',
    example: 'Purchase: 1,840 conversions (94%)\nAll other actions combined: 117 conversions (6%)\nLose Purchase tracking and Smart Bidding has 6% of its signal left.',
    citationTemplate:
      'This Google Ads account has a single conversion action representing more than 90% of total conversion volume. Per Google Ads conversion tracking and Smart Bidding documentation, the bidder relies on a stable conversion signal to keep its model calibrated. When that signal is concentrated in one action, any failure of that action (broken tag, renamed event, consent change, checkout redesign) zeros out the training data overnight while bidding continues to operate on stale feedback. The reporting side of the account also loses the ability to distinguish a business problem from a tagging problem, because every funnel issue collapses into the same dominant number. Fix: audit upstream funnel events, implement missing add-to-cart, begin-checkout, or lead-submit actions as Secondary so they appear in "All conversions," and add at least one backup Primary action where the business model supports it. Source: support.google.com/google-ads/answer/7065882.',
    references: [
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['all-vs-primary-gap', 'ghost-conversions', 'whale-conversion'],
  },
  {
    id: 'funnel-volume-inversion',
    name: 'Leak Detector',
    source: 'report',
    severity: 'info',
    summary: 'Lower-funnel conversions (purchases, transactions) exceed upper-funnel volume (add-to-cart, signups).',
    directAnswer:
      'Your Google Ads conversion report shows more purchases than add-to-carts. That is physically impossible on a working site. The report is telling you that an upper-funnel event is missing, mis-tagged, or no longer firing. Smart Bidding is reading a funnel that does not exist.',
    why: 'On any real ecommerce or lead-gen path, upper-funnel volume has to be larger than lower-funnel volume. Add-to-cart precedes purchase. View-content precedes add-to-cart. Begin-checkout sits between cart and purchase. If purchases out-number add-to-carts, one of three things is happening: the upper-funnel tag was never deployed, the upper-funnel tag was deployed once and broke during a later site change, or the upper-funnel action exists in Google Ads settings but its trigger never fires (renamed page, redesigned cart drawer, SPA route that does not emit the event).\n\nWhy this matters beyond the obvious: Smart Bidding can use upper-funnel events as supporting signals for portfolio strategies, and lookalike-style audiences benefit from a fuller event stream. With upper-funnel events missing, the optimizer is working with the narrow bottom of the funnel only. That is a smaller training set, longer learning periods, and noisier bid decisions in low-volume segments.\n\nThe inversion is also a tripwire. If you only audit purchase tracking, you will never notice the cart event has been broken for six months. This check catches it from the shape of the report rather than from inspecting tags directly.',
    howToFix:
      '1. Identify which upper-funnel category is missing or under-counted (add-to-cart, begin-checkout, view-content, signup, etc). 2. Open GTM and confirm the corresponding tag exists, is published, and has a current trigger. 3. Walk the actual funnel in a browser with GTM Preview or Tag Assistant and confirm the event fires at the expected step. 4. For SPAs, verify the trigger is bound to a route change or virtual pageview event, not a DOM ready that only runs once. 5. After the fix, wait 48 hours and confirm upper-funnel volume now exceeds lower-funnel volume in the report.',
    example: 'Purchases: 412\nAdd-to-cart: 0\nBegin-checkout: 0\nThe cart and checkout tags stopped firing after the recent theme update.',
    citationTemplate:
      'This Google Ads account is reporting more lower-funnel conversions (purchases, transactions) than upper-funnel conversions (add-to-cart, begin-checkout, signup, view-content). Per Google Ads conversion tracking documentation, conversion volume should follow the physical order of the funnel on the site, with each upstream step producing at least as many events as the downstream step it feeds. An inversion of this shape indicates an upper-funnel tag that was never deployed, a tag that broke during a later site change (theme update, checkout redesign, SPA route change), or a trigger bound to a DOM ready that no longer matches the current markup. The optimizer loses access to supporting signals that would otherwise tighten bid decisions on lower-volume segments. Fix: identify the under-counted upper-funnel category, confirm the matching tag is published with a current trigger, walk the funnel in GTM Preview, and verify that upstream volume exceeds downstream volume within 48 hours. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'micro-conversion-pollution', 'all-vs-primary-gap'],
  },
  {
    id: 'value-instability',
    name: 'Value Instability',
    source: 'report',
    severity: 'warning',
    summary: 'Average conversion value varies more than 10x within the same conversion category.',
    directAnswer:
      'Your Google Ads account has conversion actions in the same category where average values swing by more than 10x. Either the categories are mixing genuinely different products, or one of the actions is sending the wrong number. Target ROAS and value-based bidding are running on values you cannot trust.',
    why: 'Average conversion value should cluster within a category. All "purchase" actions on the same site should sit within a reasonable range of each other, because the underlying basket sizes do. When one purchase action averages $12 and another in the same category averages $640, three things might be true: a tag is passing cents instead of dollars (the classic 100x error), a tag is passing a placeholder value like 1 or 0 while another tag passes real revenue, or currency is being sent without a `currency_code` and Google Ads is treating EUR as USD silently.\n\nThe consequence is downstream and quiet. Target ROAS bidding optimizes against the value each action reports. If half your purchase actions are off by 100x in either direction, tROAS is chasing a fictional revenue surface and the campaign will either starve (under-reported value) or overspend (over-reported value). Reporting suffers the same way: the revenue column in Google Ads diverges from the commerce backend, and finance reconciliation breaks once a month forever.\n\nTest transactions left in production are another common cause. Someone runs a $0.01 test purchase, or a $9,999 staging order, and never excludes the test action from production reporting.',
    howToFix:
      '1. List the conversion actions in the flagged category with their average values. 2. For each outlier, trace the value parameter from the site dataLayer through GTM and into the Google Ads tag. Confirm units (dollars vs cents), confirm currency, confirm whether the value is dynamic or hardcoded. 3. Reconcile three recent real orders against the value Google Ads received for the same transactions. 4. Fix tag-level value bugs at the source rather than overriding in Google Ads. 5. Exclude or rename test-environment actions so they cannot pollute production reporting.',
    example: 'Category: purchase\nAction A average value: $8.40\nAction B average value: $612.00\nRatio: 73x. One of these is wrong.',
    citationTemplate:
      'This Google Ads account has conversion actions within a single category where average conversion value varies by more than 10x. Per Google Ads conversion value documentation, value-based bidding strategies such as Target ROAS optimize directly against the value each conversion action reports. Variance this large inside one category typically indicates a tag passing cents while another passes dollars (the 100x error), a hardcoded placeholder value (1 or 0) running alongside a dynamic revenue value, missing currency parameters causing silent currency mismatches, or a test-environment action leaking into production reporting. The downstream effect is a Target ROAS strategy optimizing against a revenue surface that does not exist, with the campaign either starving on under-reported value or overspending on over-reported value. Fix: trace the value parameter from dataLayer through GTM into the Google Ads tag, confirm units and currency, reconcile three recent orders against the commerce backend, and exclude test-environment actions from production goals. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      {
        label: 'Google Ads. Conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['roas-sanity', 'mismatched-values', 'whale-conversion'],
  },
  {
    id: 'whale-conversion',
    name: 'Whale Check',
    source: 'report',
    severity: 'info',
    summary: 'Fewer than 10% of conversions are driving more than 50% of total conversion value.',
    directAnswer:
      'Your Google Ads account has a small share of conversions (under 10% of volume) producing more than half of total conversion value. That is a real revenue pattern in many businesses, but it makes the value signal fragile. Lose tracking on the high-value transactions and Target ROAS instantly loses the majority of its training signal.',
    why: 'Some businesses are naturally whale-shaped. B2B accounts sell a few large contracts a quarter. Furniture retailers ship a small number of high-ticket orders alongside many accessory orders. Luxury or wholesale catalogs have order distributions that look like power laws. The pattern itself is not a defect.\n\nIt becomes a problem because Target ROAS and value-based bidding average their feedback across all the orders Google Ads sees. When a tiny slice of orders carries most of the value, the bidder is functionally optimizing against that slice. If those whale orders stop being tracked properly (a B2B sales-assisted close that does not import, a high-ticket order processed in a separate checkout, an enterprise deal that converts via a different lead form), the value signal collapses while the volume signal stays unchanged. The dashboard looks the same. The bid strategy quietly starts losing money.\n\nThe second risk is that whales often live in a different tracking path than the long tail. Enterprise leads route through a separate CRM. Wholesale orders use a different payment processor. Each of those paths is its own potential failure mode that the regular conversion audit does not exercise.',
    howToFix:
      '1. Confirm whether the whale distribution reflects the real business model or whether one outlier transaction is skewing the data (a test order at $50,000, for example). 2. Document the tracking path each whale segment uses (CRM import, separate processor, enterprise checkout) and confirm each path is independently monitored. 3. Add alerting on the high-value segment specifically. A 24-hour drop in whale volume should page someone. 4. Consider a conversion value rule or value bucket that smooths extreme outliers if Target ROAS is producing volatile bids. 5. Reconcile whale revenue against the commerce or CRM backend monthly.',
    example: '8% of conversions drive 62% of value.\nLose tracking on the top segment and 62% of the value signal disappears overnight.',
    citationTemplate:
      'This Google Ads account shows fewer than 10% of conversions driving more than 50% of total conversion value. Per Google Ads conversion value and Target ROAS documentation, value-based bidding averages its optimization signal across all observed conversions, which means a long-tail distribution of this shape leaves the bidder functionally optimizing against a small set of high-value transactions. If those transactions live in a separate tracking path (CRM import, enterprise checkout, separate payment processor) and that path fails, the value signal collapses while volume looks unchanged, and Target ROAS continues bidding from stale feedback. The pattern often reflects a real B2B, luxury, or wholesale revenue model rather than a defect, but it raises the operational cost of any tracking outage on the whale segment. Fix: confirm the distribution is real (not an outlier test order), document and monitor each whale tracking path independently, add alerting on high-value segment volume, and reconcile whale revenue against the backend monthly. Source: support.google.com/google-ads/answer/6268637.',
    references: [
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
      {
        label: 'Google Ads. Conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-concentration', 'value-instability', 'roas-sanity'],
  },
  {
    id: 'vtc-click-ratio',
    name: 'Greedy Impression Index',
    source: 'report',
    severity: 'warning',
    summary: 'View-through conversions are more than 3x click-driven conversions for one or more actions.',
    directAnswer:
      'One or more Google Ads conversion actions show view-through conversions exceeding click-driven conversions by more than 3x. A high VTC-to-click ratio means impression-based credit is doing most of the reporting work, which inflates the apparent performance of display, video, and remarketing campaigns and skews bidding decisions away from incremental media.',
    why: 'A high view-through to click ratio can make display, video, or remarketing campaigns appear to drive more incremental performance than they really do. View-through conversions are impression-based, so long windows can claim credit for users who would have converted anyway. The advertiser may overfund prospecting or remarketing that is mostly harvesting post-impression credit.',
    howToFix: 'Review the view-through conversion window for flagged actions in Google Ads. Shorten the VTC window, separate VTC-heavy actions from bidding decisions, and compare performance using click conversions or experiments. For high-stakes budget decisions, evaluate incrementality instead of treating VTC and click conversions as equivalent.',
    example: 'Conversions: 40 total\nView-through conversions: 32\nClick conversions: 8\nVTC/click ratio: 4.0x',
    citationTemplate:
      'This account shows a view-through to click conversion ratio exceeding 3:1 on one or more enabled Google Ads conversion actions. Per Google Ads attribution documentation, view-through conversions credit users who saw but did not click a display or video ad, and large VTC-to-click ratios typically indicate that impression-based credit is harvesting users who would have converted anyway rather than measuring incremental media. The optimisation risk is overspending on display and remarketing whose apparent performance evaporates under incrementality testing. Fix: shorten the view-through window on flagged conversion actions, separate VTC-heavy actions from bidding-eligible goals (mark them Secondary), and use experiments or geo-holdouts to measure incrementality before treating VTC and click conversions as equivalent. Source: support.google.com/google-ads/answer/2375431.',
    references: [
      {
        label: 'Google Ads. About view-through conversions',
        url: 'https://support.google.com/google-ads/answer/2375431',
      },
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6259715',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['model-attribution-drift', 'roas-sanity'],
  },
  {
    id: 'roas-sanity',
    name: 'ROAS Sanity',
    source: 'report',
    severity: 'warning',
    summary: 'Reported ROAS is suspiciously high or low for conversion actions with meaningful volume.',
    directAnswer:
      'Your Google Ads performance report contains conversion actions with implausible ROAS values: either extremely high (50x+) or near-zero with meaningful conversion volume. Extreme ROAS is almost always a broken value pipeline rather than genuine performance: cents passed as dollars, fixed values on dynamic revenue, currency mismatches, or missing value pass-through.',
    why: 'Extreme ROAS values usually mean the value pipeline is broken, not that performance is extraordinary. Common causes include currency mismatches, cents passed as dollars, fixed values on dynamic revenue, or missing value pass-through. If ignored, budget and bidding decisions are made from fake profitability.',
    howToFix: 'Audit the flagged conversion actions from report row back to Google Ads settings and the GTM value parameter. Confirm value units, currency, and whether the value is dynamic or fixed. Compare a sample order total in your backend with the value recorded in Google Ads for the same time window.',
    example: 'Suspicious: 26 purchases, conversion value / cost = 87.4x\nLikely issue: value is passed in cents or duplicated',
    citationTemplate:
      'One or more Google Ads conversion actions in this report show ROAS values inconsistent with reasonable business performance (either extreme highs or near-zero with significant conversion volume). Per Google Ads value-based bidding documentation, conversion value must be passed in the account currency as a numeric, transaction-specific value for ROAS reporting and tROAS bidding to be meaningful. Implausible ROAS almost always indicates a broken value pipeline: cents passed as dollars, a fixed value overriding dynamic revenue, a currency mismatch between site and account, or no value parameter at all. The optimisation risk is budget decisions made from fake profitability. Fix: trace each flagged action from report row back to Google Ads settings and the GTM value parameter, confirm units and currency, and reconcile one sample order between the backend and the conversion row before trusting tROAS or value-based bidding. Source: support.google.com/google-ads/answer/7501826.',
    references: [
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7501826',
      },
      {
        label: 'Google Ads. Set up conversion value',
        url: 'https://support.google.com/google-ads/answer/9888879',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'value-mismatch', 'roas-feasibility'],
  },
  {
    id: 'ghost-conversions',
    name: 'Ghost Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'Enabled Google Ads conversion actions have no matching volume in the performance report.',
    directAnswer:
      'One or more enabled Google Ads conversion actions on this account show zero conversions in the performance report. An "enabled" action that records nothing means the tracking pipeline is silently broken: a missing GTM tag, a wrong conversion label, a renamed action, or a trigger that no longer fires. If the action is set Primary, Smart Bidding is optimising against feedback it never receives.',
    why: 'A conversion can be enabled and still be effectively dead. Broken tags, wrong triggers, renamed actions, or label mismatches leave Google Ads bidding toward actions that produce no signal. This is especially dangerous when the action is Primary because campaigns may enter learning with missing feedback.',
    howToFix: 'For each ghost action, check whether the Google Ads conversion label exists in GTM or the site tag and whether the trigger still fires. Use Tag Assistant, GTM Preview, and a real test conversion to verify the hit reaches Google Ads. Disable stale actions or mark them Secondary if they are intentionally retained for history.',
    example: 'Settings: Purchase - Primary - Enabled\nReport: Purchase has 0 conversions across the selected period',
    citationTemplate:
      'This account contains enabled Google Ads conversion actions that record zero conversion volume across the reporting period. Per Google Ads conversion tracking documentation, an enabled conversion action is expected to receive hits via a website tag, GA4 import, or offline conversion upload, and a sustained zero count indicates the tracking pipeline is broken: a missing GTM tag, a mismatched conversion label, a renamed action whose tag was never updated, or a trigger that no longer fires. The risk is highest when the ghost action is set Primary, because Smart Bidding optimises against feedback it never receives. Fix: trace each flagged action to its expected source, verify conversion ID and label in GTM or the site tag, confirm with Tag Assistant that a real test conversion reaches Google Ads, and either repair the tag or move the action to Removed or Secondary. Source: support.google.com/google-ads/answer/6095821.',
    references: [
      {
        label: 'Google Ads. Verify conversion tracking is working',
        url: 'https://support.google.com/google-ads/answer/6095821',
      },
      {
        label: 'Google Tag Manager. Google Ads Conversion Tracking tag',
        url: 'https://support.google.com/tagmanager/answer/6105160',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['conversion-label-matching', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'micro-conversion-pollution',
    name: 'Signal Pollution',
    source: 'report',
    severity: 'warning',
    summary: 'Micro-conversion volume is more than 100x macro-conversion volume.',
    directAnswer:
      'Lightweight events (page views, scrolls, micro-signups) are recording more than 100x the volume of your real business outcomes (purchases, qualified leads). When micro-conversions dominate the goal set, Smart Bidding learns to chase easy actions instead of revenue, and reporting drifts from pipeline reality even as conversion totals climb.',
    why: 'When page views, signups, or other lightweight events dominate the conversion set, Smart Bidding can learn to chase easy actions instead of revenue or qualified leads. The account may show rising conversion volume while pipeline or sales do not improve. Analysts also lose a clear read on whether campaigns are moving real business outcomes.',
    howToFix: 'Mark micro-conversions as Secondary unless they are intentionally used for bidding. Keep the primary goal set focused on purchases, qualified leads, or another downstream action. If you need micro events for learning, isolate them in separate experiments or campaigns instead of mixing them with macro goals.',
    example: 'Macro purchases: 42\nMicro signups/page events: 7,800\nMicro/macro ratio: 185x',
    citationTemplate:
      'This account has a micro to macro conversion volume ratio exceeding 100:1, meaning lightweight events such as page views, scrolls, or non-qualified signups are reporting at least 100x the volume of true business outcomes. Per Google Ads conversion goals documentation, Primary conversion actions are the actions Smart Bidding optimises toward, and concentrating Primary status on macro outcomes prevents the bidder from learning to chase easy events at the expense of revenue or qualified leads. The optimisation risk is rising conversion totals with flat or declining pipeline. Fix: mark micro-conversions as Secondary unless they are intentionally used for bidding, keep Primary goals focused on purchases or qualified leads, and isolate any micro-event learning in separate experiments or campaigns rather than mixing with macro goals. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. Primary and secondary actions',
        url: 'https://support.google.com/google-ads/answer/10812308',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'smart-bidding-volume'],
  },
  {
    id: 'model-attribution-drift',
    name: 'Attribution Drift',
    source: 'report',
    severity: 'info',
    summary: 'Model-attributed conversions differ sharply from standard conversion counts.',
    directAnswer:
      'The conversions column and the model-attributed conversions column on this account differ by more than a tolerable margin. Large drift means the selected attribution model is redistributing credit across touchpoints enough to change optimisation and reporting conclusions. Drift can be valid, but it has to be intentional and documented so finance, media, and analytics are not arguing from different numbers.',
    why: 'Large drift means the selected attribution model is redistributing credit enough to change optimization and reporting conclusions. That can be valid, but it needs to be intentional and understood by the team. Otherwise finance, media buyers, and analytics will argue from different numbers for the same conversion action.',
    howToFix: 'Compare the conversion action attribution model, reporting columns, and business sales cycle. If drift is expected, document which column is used for budget decisions and why. If it is not expected, standardize attribution models across similar actions and inspect whether view-through or cross-device conversions are driving the gap.',
    example: 'Standard conversions: 120\nCurrent model attributed conversions: 43\nDrift: 64%',
    citationTemplate:
      'This account shows a significant gap between standard conversion counts and model-attributed conversion counts on one or more conversion actions. Per Google Ads attribution documentation, model-attributed conversions redistribute credit across the user path based on the selected model (data-driven, position-based, time-decay, linear, last-click, or first-click), and large drift between this column and the standard conversions column indicates the model is materially reshaping reported performance. The risk is reporting inconsistency: finance, media, and analytics teams arguing from different numbers for the same action. Fix: review each flagged conversion action attribution model against the business sales cycle, document which column drives budget decisions and why, standardise attribution models across similar actions, and inspect whether view-through or cross-device conversions are the source of the drift. Source: support.google.com/google-ads/answer/6259715.',
    references: [
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6259715',
      },
      {
        label: 'Google Ads. About data-driven attribution',
        url: 'https://support.google.com/google-ads/answer/9133479',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['vtc-click-ratio', 'short-attribution-windows'],
  },
  {
    id: 'volume-weighted-duplicates',
    name: 'Active Duplicate Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'Similar conversion names both have active volume, which suggests live double-counting.',
    directAnswer:
      'Two or more similarly named Google Ads conversion actions are both recording live volume. Settings-level duplicates are risky in theory; active duplicates prove the problem is affecting reports right now. The usual cause is one event firing under two action names, a renamed action whose tag still runs, or a GA4 import that mirrors a site-tag action. Totals are inflated and Smart Bidding is training on duplicated outcomes.',
    why: 'Settings duplicates are risky, but active duplicates prove the problem is affecting reports now. Similar actions with volume can represent the same event firing under two names, a renamed conversion that still receives traffic, or an import plus tag pair counting together. This inflates totals and trains bidding on duplicated outcomes.',
    howToFix: 'Compare the flagged pairs by name, source, category, and recent timestamps. Keep one canonical conversion action, merge reporting expectations around it, and mark the duplicate Secondary or remove its tag/import. After changing it, watch both conversion count and conversion value for the next reporting period.',
    example: 'Purchase - Website: 312 conversions\nPurchase Website: 298 conversions\nLikely same event counted twice',
    citationTemplate:
      'This Google Ads account contains pairs of conversion actions with very similar names that both record active volume across the reporting period. Per Google Ads conversion tracking documentation, each conversion action is intended to represent a distinct user outcome, and active volume on near-duplicate actions strongly indicates the same event being counted through two paths (for example, a website tag plus a GA4 import for the same purchase, or two GTM tags listening to the same dataLayer event). The downstream effects are inflated conversion totals, Smart Bidding optimising against duplicated volume, and ROAS that diverges from backend revenue. Fix: compare the flagged pairs by source, category, and timestamps, keep one canonical conversion action per outcome, mark the duplicate Removed or Secondary, and verify in Tag Assistant that only one conversion request fires per real user outcome before publishing. Source: support.google.com/google-ads/answer/3438531.',
    references: [
      {
        label: 'Google Ads. Troubleshoot conversion counts',
        url: 'https://support.google.com/google-ads/answer/3438531',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-conversions', 'conversion-label-matching'],
  },
  {
    id: 'perf-identical-volumes',
    name: 'Identical Conversion Volumes',
    source: 'report',
    severity: 'warning',
    summary: 'Two or more conversion actions report exactly the same conversion count over the period.',
    directAnswer:
      'Two or more of your Google Ads conversion actions report the exact same conversion count. Identical counts on independent actions are statistically unlikely. The usual cause is two tags wired to the same event, or one event being imported twice (once from the site tag, once from GA4 or an offline upload).',
    why: 'Each Google Ads conversion action should represent a distinct user outcome. When two enabled actions land on the same integer (say, 247 and 247) across hundreds of sessions, the actions are almost certainly being fed by the same underlying trigger. Common patterns: a Purchase tag that was forked into Purchase and Purchase_New during a migration but never decommissioned, a GA4 imported conversion that mirrors a site-tag conversion, or two GTM tags listening to the same dataLayer push.\n\nThe downstream damage is subtle. Conversion totals on the account double. Smart Bidding sees twice the volume it should and bids more aggressively. Reported ROAS halves because spend is real but value is duplicated only on the count side, not the value side. Finance reconciliation breaks. The conversion column in Ads Manager and the order count in the commerce backend stop matching.',
    howToFix:
      '1. Open Tools and Settings, Measurement, Conversions in Google Ads. 2. Filter to the actions with matching counts and inspect Source for each (Website, Google Analytics 4, Import, Firebase). 3. If two share the same source, open the GTM container or site tag and find every tag that sends conv id and label for either action. 4. Keep one canonical action per business outcome, mark the duplicate as Secondary or set it to Removed (not just disabled). 5. Walk one real conversion end to end in Tag Assistant to confirm only one network call hits per outcome.',
    example: 'Purchase - Website: 247 conversions\nPurchase (GA4 import): 247 conversions\nSame event, two paths.',
    citationTemplate:
      'Two or more enabled Google Ads conversion actions on this account report identical conversion counts over the reporting period. Per Google Ads conversion tracking documentation, each conversion action is intended to represent a distinct user outcome, and identical counts across independent actions strongly indicate the same underlying event being counted through two paths (for example, a website tag and a Google Analytics 4 import wired to the same purchase, or two GTM tags listening to the same dataLayer event). The result is inflated total conversions, Smart Bidding optimizing against duplicated volume, and reported ROAS that diverges from backend revenue because spend is real while count is double. Fix: identify the duplicated source in the Conversions list, keep one canonical action per outcome, set the duplicate to Removed or Secondary, and verify in Tag Assistant that only one conversion request fires per real user outcome. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['volume-weighted-duplicates', 'duplicate-conversions', 'conversion-label-matching'],
  },
  {
    id: 'perf-negative-values',
    name: 'Problematic Conversion Values',
    source: 'report',
    severity: 'critical',
    summary: 'Conversion actions report negative values, or report zero value alongside meaningful volume.',
    directAnswer:
      'Your Google Ads performance report contains conversion actions with negative total values, or actions with significant volume but zero value. Either pattern breaks value-based bidding. Negative values mean refunds or chargebacks are being passed without isolating them. Zero value with volume means the value parameter is not being sent.',
    why: 'Google Ads expects each conversion value to be a non-negative number representing the worth of the outcome. Negative numbers typically appear when refund logic is wired into the same tag as the purchase, or when an offline import sends adjustments as raw negatives instead of using the Conversion Adjustments API. The bidding system wasn\'t designed to see negative revenue arrive as a conversion. Smart Bidding pulls average value down, sometimes below zero, and the Target ROAS bidder reacts by either pausing spend or thrashing.\n\nZero value on a high-volume action is the other failure mode. The tag fires, the count increments, but the value parameter is missing, set to a literal zero, or sourced from a DOM element that no longer exists. Value-based bidding can\'t run on actions that report zero, and ROAS columns read zero across the board for that action even when orders carry real revenue.',
    howToFix:
      '1. For negative values: stop sending refunds through the standard conversion tag. Use the Conversion Adjustments API or upload restatement files in Google Ads. 2. For zero value with volume: trace the value parameter from the data layer through GTM into the Google Ads conversion tag. Source from the order object or platform variable, never from a hardcoded number or a page selector. 3. Verify with Tag Assistant that the value parameter on a test purchase matches the actual order total. 4. Once fixed, give value-based bidding a 2 to 4 week relearning window before judging the result.',
    example: 'Action: Purchase. Conversions: 412. Conversion value: -1,238.50. Cause: refund tag firing as negative conversion.',
    citationTemplate:
      'This Google Ads account contains conversion actions with negative total values or with significant volume reporting zero value. Per Google Ads value-based bidding documentation, each conversion is expected to carry a non-negative value representing the outcome worth, and refunds or restatements should be submitted through the Conversion Adjustments API rather than as negative conversions on the standard tag. Negative values destabilize Target ROAS bidding by pulling average value below zero. Zero values on high-volume actions disable value-based bidding for that action entirely and produce ROAS reports of zero regardless of true revenue. Fix: route refund logic through Conversion Adjustments uploads, repair the value parameter in the conversion tag (sourcing from the order object, not a DOM element), and verify in Tag Assistant that the value sent matches the backend order total. Source: support.google.com/google-ads/answer/7335652.',
    references: [
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['perf-value-without-volume', 'zero-value-purchases', 'roas-sanity'],
  },
  {
    id: 'perf-pareto-concentration',
    name: 'Value Concentration (Pareto)',
    source: 'report',
    severity: 'info',
    summary: 'A very small slice of conversion volume drives 80% of total conversion value.',
    directAnswer:
      'Under 10% of your conversions drive 80% of your total conversion value. That is heavier concentration than a normal Pareto curve. If any of those high-value conversion actions has a tracking gap or a value-source issue, your reported account ROAS will swing hard.',
    why: 'Concentration itself is not a bug. Some businesses sell high-ticket items alongside a long tail of smaller orders, and the math will naturally skew. The reason it is worth surfacing is fragility. When a handful of conversion actions account for nearly all reported value, the account is exposed to single-point-of-failure risk. A broken Purchase tag on the enterprise plan checkout, a stale value parameter on the wholesale path, or a currency mismatch on the highest-AOV product line can knock out most of the apparent ROAS even though most of the conversion count is unaffected.\n\nIt also affects Smart Bidding stability. Target ROAS bidding learns faster on actions with steady volume. When 80% of value comes from a small set of conversions, the bidder is essentially learning from those few rows. Small upstream errors in how those conversions are valued get amplified.',
    howToFix:
      '1. Identify the conversion actions inside the top 80% of value. They are listed in the check details. 2. For each one, walk the value source end to end: data layer variable, GTM tag value parameter, Google Ads conversion action settings, and a sample real order in the commerce backend. 3. Confirm currency code is correct on every high-value action. Currency assumptions of USD on EUR or GBP orders are common. 4. Annotate these as critical paths in your monitoring. Any future tag-deploy QA should run a transaction through each of these flows. 5. Consider whether the long tail should be promoted to Primary or kept Secondary; it is currently driving optimization volume more than value.',
    example: 'Top 4 conversion actions drive 80% of value. Bottom 47 actions drive the remaining 20%.',
    citationTemplate:
      'On this Google Ads account, fewer than 10% of conversion actions drive 80% of total conversion value, which is heavier concentration than a typical Pareto distribution. Per Google Ads value-based bidding documentation, Smart Bidding strategies such as Target ROAS depend on stable, accurate value reporting across the conversion actions that feed them. When value is highly concentrated, the account becomes fragile: a tracking gap, value-parameter error, or currency mismatch on any one high-AOV action can swing reported ROAS substantially even while conversion counts remain stable. Fix: identify the conversion actions inside the top 80% of value, validate each value source end to end from data layer to commerce backend, confirm currency configuration on high-value actions, and treat these flows as critical paths in tag-deploy QA. Source: support.google.com/google-ads/answer/7335652.',
    references: [
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. Currency conversion',
        url: 'https://support.google.com/google-ads/answer/2998565',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['roas-sanity', 'perf-value-variance', 'perf-roas-outliers'],
  },
  {
    id: 'perf-perfect-roas',
    name: 'Suspiciously Perfect ROAS',
    source: 'report',
    severity: 'info',
    summary: 'One or more conversion actions report ROAS that lands exactly on a round number such as 1.0, 5.0, or 10.0.',
    directAnswer:
      'One or more of your conversion actions reports a ROAS that lands on an exact round number (1.0, 2.0, 5.0, 10.0). Real revenue divided by real spend almost never produces a clean integer. This pattern is the signature of a static value being applied to every conversion instead of the actual transaction value.',
    why: 'When a Google Ads conversion action is configured with a fixed value (say, $50 per lead), and the spend distribution lands such that the conversion count multiplied by 50 produces an exact ratio against cost, you get a suspiciously clean ROAS. This often appears on lead-gen accounts where the value is a placeholder, on accounts where ecommerce value was hardcoded during initial setup, or on B2B accounts assigning a flat deal value to every form fill.\n\nFixed-value conversions are not always wrong. A lead-gen account that genuinely values every lead at the same dollar amount can run that way. The problem is that Target ROAS bidding will learn the value is constant and stop differentiating between high-quality and low-quality leads. Every form fill gets the same weight, so the bidder optimizes for volume, not quality. The account ends up with more leads from cheaper sources and worse close rates.',
    howToFix:
      '1. Confirm whether the flagged conversion actions are intentionally fixed-value. Open Tools and Settings, Conversions, and check the Value setting on each. 2. If the business has dynamic value (true revenue, deal size, LTV proxy), wire it: source the value from the data layer or offline import. 3. If fixed value is genuinely correct, document it so future audits do not re-flag it, and consider whether Maximize Conversions is a better bid strategy than Target ROAS for these actions. 4. For lead-gen, evaluate Enhanced Conversions for Leads with offline conversion uploads so closed-won revenue replaces the static placeholder.',
    example: 'Action: Demo Request. Conversions: 86. ROAS: exactly 5.00. Cause: value hardcoded at $5 per lead.',
    citationTemplate:
      'One or more Google Ads conversion actions on this account reports ROAS at an exact round number such as 1.0, 5.0, or 10.0. Per Google Ads conversion tracking documentation, ROAS is calculated as conversion value divided by cost, and on accounts with genuine transaction-level revenue this ratio is essentially never an exact integer. The pattern indicates a fixed or placeholder value applied to every conversion rather than a dynamic value sourced from the actual transaction or deal. While intentional fixed values are valid for some lead-gen models, they prevent Target ROAS bidding from distinguishing high-quality from low-quality outcomes and tend to push the bidder toward cheaper, lower-converting traffic. Fix: confirm whether each flagged action is meant to be fixed-value, wire dynamic values from the data layer or via offline conversion uploads where applicable, and consider Enhanced Conversions for Leads to replace placeholder values with closed-won revenue. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['roas-sanity', 'perf-roas-outliers', 'mismatched-values'],
  },
  {
    id: 'perf-roas-outliers',
    name: 'ROAS Statistical Outliers',
    source: 'report',
    severity: 'warning',
    summary: 'One or more conversion actions report ROAS far outside the normal range for the account.',
    directAnswer:
      'One or more conversion actions report ROAS that sits well outside the interquartile range for the rest of your account, or lands above 100x or below 0.01x. Extreme ROAS values almost always trace back to a value pipeline issue rather than genuinely exceptional performance.',
    why: 'AdLint calculates the interquartile range across conversion actions with at least 10 conversions and a positive ROAS, then flags anything outside 1.5 times the IQR. It also flags any ROAS above 100 or below 0.01, which are arithmetically possible but practically diagnostic of broken data.\n\nThe common causes: cents passed where dollars were expected (or vice versa), inflating ROAS by 100x. Currency mismatch where EUR or GBP revenue is treated as USD. A test conversion with a $99,999 value that was never deleted. A conversion action where the value parameter is reading a string like "12.99 USD" instead of the number 12.99 and getting parsed inconsistently. On the low end, a tag firing on every pageview and counting page views as conversions while the value parameter rounds to near zero.\n\nLeft alone, outlier ROAS feeds Target ROAS bidding bad data. The bidder either chases the inflated action with too much budget or starves the deflated action of impressions. Either way the account drifts off where actual revenue lives.',
    howToFix:
      '1. Open each flagged action and pull recent conversion-level data from the Conversions report. 2. Look for value units that do not match the rest of the account (cents vs dollars, wrong currency, parsed-as-string). 3. Compare a sample of conversions to the actual orders in the commerce backend for the same time range. 4. Repair the value source at the tag or import level, then delete any one-off test conversions polluting the history. 5. Once values are correct, give Smart Bidding 2 to 4 weeks to relearn before judging campaign performance against the corrected baseline.',
    example: 'Action: Purchase EU. ROAS: 187.4x. Cause: EUR cart values treated as USD, no currency conversion applied.',
    citationTemplate:
      'One or more Google Ads conversion actions on this account report ROAS values statistically outside the rest of the account, or above 100x and below 0.01x. Per Google Ads value-based bidding documentation, ROAS is calculated from the conversion value parameter, and extreme outliers in this ratio are diagnostic of value-pipeline errors rather than genuine performance signal. Typical root causes include currency mismatches, cents-vs-dollars unit errors, residual test conversions with arbitrary high values, and value parameters parsed from strings instead of numeric fields. Left in place, outlier ROAS misleads Target ROAS bidding into overspending on inflated actions or starving deflated actions, and produces account-level reports that diverge sharply from backend revenue. Fix: inspect the value source on each flagged action, repair unit and currency mismatches, remove residual test conversions, and allow Smart Bidding 2 to 4 weeks to relearn against corrected values. Source: support.google.com/google-ads/answer/7335652.',
    references: [
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Ads. Currency conversion',
        url: 'https://support.google.com/google-ads/answer/2998565',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['roas-sanity', 'perf-perfect-roas', 'perf-value-variance', 'mismatched-values'],
  },
  {
    id: 'perf-value-variance',
    name: 'Value per Conversion Variance',
    source: 'report',
    severity: 'warning',
    summary: 'Within a single conversion category, value per conversion swings wildly (CV above 150%).',
    directAnswer:
      'Within a single conversion category on your account, value per conversion has a coefficient of variation above 150%. That means the dollar amount per conversion is jumping around more than the average value itself. Either the category bundles unrelated conversion types, or the value source is unstable.',
    why: 'Coefficient of variation is the standard deviation divided by the mean. A CV above 150% on a single category means the spread of values is larger than the average value. Practically, that looks like a Purchase category where some conversions come in at $12, others at $4,200, and the mix is not explained by product mix variability.\n\nThe usual root causes: a single Purchase action receives both retail orders ($30-150) and B2B wholesale orders ($1,000-10,000) without splitting them into separate conversion actions. Or the value parameter is reading from two different data layer locations depending on the page type, and the values come through with different magnitudes. Or refund logic is firing through the same path with negative-adjacent zero-dollar values.\n\nFor Smart Bidding, this is a learning problem. Target ROAS bidding assumes the value distribution per action is roughly predictable. When the variance is this wide, the bidder either hedges (bids low across the board, missing the high-value orders) or overcorrects after a single high-value conversion (bids up, then ROAS collapses on the next 50 small orders).',
    howToFix:
      '1. Pull the conversion details for the flagged category in Google Ads Reports. Sort by value descending. 2. Look at the top and bottom of the list. If they represent legitimately different business outcomes (retail vs wholesale, free trial vs paid, etc), split them into separate conversion actions. 3. If they should be one category, investigate the value source for inconsistent readings (different DOM elements, different data layer keys, currency mixing). 4. Once split or repaired, expect Smart Bidding to relearn over the next 2 to 4 weeks.',
    example: 'Category: Purchase. CV: 234%. Min value: $8.99. Max value: $11,400. Cause: retail and wholesale mixed into one action.',
    citationTemplate:
      'Within a single conversion category on this Google Ads account, value per conversion has a coefficient of variation above 150%, meaning the spread of values exceeds the mean value itself. Per Google Ads value-based bidding documentation, Target ROAS and other value-based strategies depend on roughly predictable value distributions per conversion action. When variance is this wide, the most common causes are unrelated business outcomes bundled into one conversion action (such as retail and wholesale purchases sharing a single Purchase action), value parameters sourced from inconsistent data layer locations, or value units differing across page types. The result is unstable bidding behavior: the optimizer either hedges low across the board or overcorrects on individual high-value events. Fix: split unrelated business outcomes into separate conversion actions, audit the value parameter source for consistency, and allow Smart Bidding a 2 to 4 week relearning window after correction. Source: support.google.com/google-ads/answer/7335652.',
    references: [
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['perf-roas-outliers', 'roas-sanity', 'perf-pareto-concentration'],
  },
  {
    id: 'perf-value-without-volume',
    name: 'Conversion Value Without Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'A conversion action reports positive conversion value while showing zero conversion count.',
    directAnswer:
      'A conversion action on your account reports positive conversion value but zero conversions. Value cannot exist without a conversion count. This is a data integrity issue at the platform or import layer, not a configuration choice.',
    why: 'Google Ads computes value by summing the value parameter across counted conversions. If conversions equals zero, value must also equal zero. Seeing a positive value with a zero count indicates one of three things: a stale offline conversion upload that included a value column but failed the matching step, a Conversion Adjustments upload that arrived after the original conversion was removed, or a reporting bug tied to a recent settings change (such as a category move that cleared the count but kept the value).\n\nWhile the underlying state is rare, the consequences are immediate. Reported ROAS for that action becomes mathematically undefined and may render as infinity, zero, or a placeholder in Ads Manager depending on the surface. Smart Bidding logic that consumes value-per-conversion for Target ROAS calibration can behave unpredictably. Finance reconciliation will fail because there is revenue with no transaction to tie it to.',
    howToFix:
      '1. Open Tools and Settings, Conversions, and find the flagged action. Check the Source column. 2. If the source is Import (offline conversions, GA4, Salesforce, etc), pull the last upload file and verify each row has both a conversion identifier (GCLID or order ID) and a non-zero value tied to a real, recent click. 3. Re-upload the corrected file. 4. If the source is Website, contact Google Ads support with a screenshot showing positive value and zero conversions; this typically requires backend intervention. 5. Until resolved, exclude this action from any reporting denominator and from Smart Bidding optimization sets.',
    example: 'Action: Salesforce Closed Won. Conversions: 0. Conversion value: $48,200. Cause: offline upload matched values but failed GCLID join.',
    citationTemplate:
      'A Google Ads conversion action on this account reports positive conversion value with zero conversions. Per Google Ads conversion tracking documentation, conversion value is the sum of the value parameter across counted conversions, so positive value with a zero count is not a configuration state but a data integrity failure. The pattern typically traces to an offline conversion upload where rows carried values but failed the GCLID or order-ID match, to a Conversion Adjustments upload that arrived after the original conversion was removed, or to a reporting artifact following a recent settings change. Reported ROAS for the affected action becomes mathematically undefined and Smart Bidding strategies that consume value-per-conversion can behave unpredictably. Fix: audit the most recent offline upload file for unmatched rows, re-upload corrected entries with valid identifiers, and exclude the affected action from optimization sets and reporting denominators until the underlying state is resolved. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
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
    relatedChecks: ['perf-negative-values', 'ghost-conversions', 'roas-sanity'],
  },
  {
    id: 'perf-vtc-only',
    name: 'View-Through Only Conversions',
    source: 'report',
    severity: 'warning',
    summary: 'A conversion action reports significant view-through volume with zero click-through volume.',
    directAnswer:
      'A conversion action on your account reports more than 10 view-through conversions and zero click-through conversions. Real customer journeys produce a mix of both. View-through-only volume is the signature of either an impression-fraud pattern, a placement that is not actually driving clicks, or a setup error where click-based conversion paths are not being recorded.',
    why: 'View-through conversions credit an ad impression when the user converts later without clicking. They are real, but they should sit alongside click-through conversions in a healthy account. When an action has 80 view-through conversions and zero click-through conversions, something has decoupled clicks from outcomes.\n\nThe usual causes: a Display or YouTube campaign serving heavily on low-quality placements where bots produce impressions but no clicks. A site that uses a custom click identifier other than GCLID, so the click-side handshake is broken (no Conversion Linker, GCLID stripped by a redirect, etc). Or the action is genuinely impression-driven (a long-cycle B2B awareness campaign), which is rare and should be intentional.\n\nThe risk: view-through-only volume looks like performance in Ads Manager. Smart Bidding will lean toward placements that produce view-through credit. If the underlying impressions are not influencing real behavior, spend keeps flowing to surfaces that are not driving incremental revenue.',
    howToFix:
      '1. Open the flagged conversion action and pull the Placement report for campaigns feeding it. Look for placements with high impressions and near-zero click-through rate. 2. Exclude the worst offenders or move them to a separate campaign for isolated evaluation. 3. Confirm the GTM Conversion Linker is firing on all pages and that no redirect is stripping the GCLID before landing. 4. Shorten the view-through conversion window in Google Ads to match the realistic post-impression decision time for the business (often 1 to 7 days, not the default 30). 5. Run an incrementality test (Conversion Lift or geo holdout) to measure whether the view-through volume is causal.',
    example: 'Action: Lead Form. View-through: 84. Click-through: 0. Source: GDN remarketing campaign.',
    citationTemplate:
      'A Google Ads conversion action on this account reports significant view-through conversion volume with zero click-through conversions. Per Google Ads view-through conversion documentation, view-through credit fires when a user converts after an ad impression without clicking, and a healthy account typically shows a mix of click-through and view-through volume on the same action. An all-view-through pattern indicates one of three states: Display or video placements producing impressions on low-quality inventory without driving clicks, a broken click-side handshake where the Conversion Linker is missing or GCLID is being stripped by a redirect, or an intentional impression-only campaign that should be reviewed for incrementality. Without correction, Smart Bidding will favor surfaces that produce post-impression credit regardless of whether those impressions are causally influencing behavior. Fix: pull the Placement report, exclude low-quality inventory, verify Conversion Linker coverage and GCLID preservation, shorten view-through windows to realistic decision times, and run a Conversion Lift or geo holdout to validate incrementality. Source: support.google.com/google-ads/answer/2998563.',
    references: [
      {
        label: 'Google Ads. About view-through conversions',
        url: 'https://support.google.com/google-ads/answer/2998563',
      },
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['vtc-click-ratio', 'model-attribution-drift'],
  },
  {
    id: 'signal-cross-account-import',
    name: 'Cross-Account Imported Conversions',
    source: 'report',
    severity: 'info',
    summary: 'One or more conversion actions appear to be imported from another account or external system.',
    directAnswer:
      'One or more conversion actions on your account have names matching common cross-account or external-import patterns (imported_, [MCC], ga4_, firebase_, sf_, hubspot_). Imported conversions are valid, but they need a deduplication plan. If the same outcome is being counted by both an imported action and a native tag, Smart Bidding sees inflated volume.',
    why: 'Imports come from a few places: GA4 conversions linked into Google Ads, Salesforce or HubSpot offline conversion uploads, Firebase events from mobile apps, or MCC-level shared conversions inherited from a parent account. Each is a legitimate setup. The risk is overlap.\n\nA common pattern: the site has a native Google Ads conversion tag for Purchase, and the same Purchase event is also synced from GA4 as an imported conversion. Both arrive in Google Ads with similar names. If both are set to Primary, every order is counted twice and Target ROAS bidding sees doubled volume against the same spend. Reported ROAS halves and the bidder behaves erratically.\n\nThe second risk is naming hygiene. Imported conversions often carry prefixes (imported_, ga4_, sf_) that survived from the source system. When the conversion list grows past 20 or 30 entries, distinguishing the canonical action from the import becomes difficult and stale imports linger past their useful life.',
    howToFix:
      '1. List every flagged imported action and identify the source system (GA4, Salesforce, Firebase, MCC). 2. For each, find the corresponding native action on the same outcome. If both exist and both are Primary, pick one canonical source and set the other to Secondary or Removed. 3. Document which source is authoritative for each business outcome (typically: native tag for website Purchase, offline upload for closed-won deals, GA4 import only when no native option exists). 4. Rename surviving imports to remove source-system prefixes where they obscure intent. 5. Re-run the audit after the next reporting cycle to confirm volume is no longer duplicated.',
    example: 'Active actions: Purchase (Website, Primary), ga4_purchase (Import, Primary). Same outcome counted twice.',
    citationTemplate:
      'One or more conversion actions on this Google Ads account appear to be imported from another system based on naming conventions such as imported_, ga4_, sf_, hubspot_, firebase_, or [MCC]. Per Google Ads conversion tracking documentation, imported conversions are a supported source but require deduplication when a native tag covers the same outcome. The most common failure mode is a website Purchase tag and a GA4-imported Purchase both set to Primary, resulting in doubled conversion counts feeding Target ROAS bidding against the same spend and producing halved reported ROAS. Imports also tend to accumulate stale entries with source-system prefixes that obscure the canonical action. Fix: identify the source system for each imported action, pick one authoritative source per business outcome, demote duplicates to Secondary or Removed, and document the authoritative source so future audits can be reasoned about clearly. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['volume-weighted-duplicates', 'perf-identical-volumes', 'duplicate-conversions'],
  },
  {
    id: 'signal-micro-as-primary',
    name: 'Micro-Conversion Enabled as Primary',
    source: 'report',
    severity: 'critical',
    summary: 'A micro-conversion (page view, scroll, video start, search) is configured as a primary bidding action.',
    directAnswer:
      'A micro-conversion such as page view, scroll, video start, search, or view item is currently enabled as a Primary action on your Google Ads account. Primary actions are what Smart Bidding optimizes toward. Putting a micro action there tells the bidder to chase the easiest possible event, which is almost never the event the business actually cares about.',
    why: 'Google Ads splits conversion actions into Primary and Secondary. Primary actions feed Smart Bidding, populate the Conversions column, and drive optimization. Secondary actions are observable in reports but do not steer bidding. The split exists so micro-conversions (early-funnel events worth tracking but not worth optimizing toward) stay out of the bidding signal.\n\nWhen a page view or scroll event is set to Primary, Smart Bidding sees enormous volume per dollar of spend and concludes the campaign is performing well. Cost per "conversion" plummets, the Maximize Conversions and Target CPA strategies aggressively scale, and the account fills with traffic that bounces. Reported conversion counts climb. Actual revenue does not. Months later the client asks why spend doubled but pipeline stayed flat.\n\nThis pattern is most common after a GA4 import sweep, where every linked GA4 event got imported as a conversion action and the team forgot to demote the upstream events to Secondary.',
    howToFix:
      '1. Open Tools and Settings, Conversions in Google Ads. Sort by Conversion action and find the flagged micro action. 2. Open the action and switch its Conversion goal action setting from Primary to Secondary. The action remains visible in reports but stops feeding bidding. 3. Confirm at least one macro action (Purchase, Lead, SubmitApplication, etc) is set to Primary so the bidder has a real optimization target. 4. If the account had been bidding on the micro action for a while, expect Smart Bidding to relearn over 2 to 4 weeks. Reported conversion counts will drop sharply during this window; that is correct behavior. 5. Audit any active Target CPA or Maximize Conversions campaigns to ensure their target reflects the macro action, not the previous micro signal.',
    example: 'Active Primary actions: Page View, Scroll 50%, Video Start. Active Secondary actions: Purchase. Bidder optimizes for page views.',
    citationTemplate:
      'A micro-conversion such as page view, scroll, video start, search, or view item is currently configured as a Primary action on this Google Ads account. Per Google Ads conversion goals documentation, Primary actions feed Smart Bidding and populate the Conversions column, while Secondary actions remain observable in reports without steering bidding. When a micro-conversion is promoted to Primary, Smart Bidding treats the easiest funnel event as the optimization target, drives down apparent cost-per-conversion, and scales spend toward traffic that does not produce downstream revenue. The pattern frequently follows a GA4 conversion sync where upstream events were imported as Primary without manual demotion. Fix: demote each micro-conversion to Secondary, ensure at least one macro action (Purchase, Lead, SubmitApplication) is set to Primary, audit any Target CPA or Maximize Conversions campaigns to align with the macro action, and allow Smart Bidding 2 to 4 weeks to relearn against the corrected signal. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['signal-micro-pollution', 'signal-primary-dilution', 'micro-conversion-pollution'],
  },
  {
    id: 'signal-micro-pollution',
    name: 'Micro-Conversion Signal Pollution',
    source: 'report',
    severity: 'critical',
    summary: 'Micro-conversion volume exceeds macro-conversion volume by more than 100x.',
    directAnswer:
      'On your account, micro-conversion volume (page views, scrolls, searches, video starts) outweighs macro-conversion volume (purchases, leads, signups) by more than 100 to 1. Even if the macro action is correctly set to Primary, the sheer volume of micro events in the conversion set can pollute Smart Bidding learning, especially when value-based strategies are pulling from value-per-conversion averages.',
    why: 'Google Ads conversion goals were redesigned in 2022 to let Primary and Secondary actions coexist without Secondary actions affecting bidding. In practice, when the volume ratio is extreme (say, 800,000 page views to 200 purchases), the Conversions reporting column gets noisy, account-level Conversion Value per Cost calculations can include weighted Secondary contributions, and operators looking at top-level metrics get misled about what is driving performance.\n\nThe practical risk is downstream. Lookalike or Customer Match audiences built off the broader event set inherit micro-event signal. Performance Max asset group reporting weights events differently across goals. Cross-account MCC dashboards that aggregate "Conversions" without filtering for Primary-only end up reporting numbers that look great but bear no relationship to business outcomes.\n\nThe right shape is roughly: macro events outnumber or sit within an order of magnitude of micro events in the conversion set. When micro outpaces macro by 100x or more, the account configuration is signaling that the team has not pruned upstream tracking.',
    howToFix:
      '1. Open Tools and Settings, Conversions. Filter to micro categories (page view, scroll, search, video start, view item). 2. For each, ask: does this need to exist as a conversion action at all? GA4 already records these. If they are not used for any Google Ads remarketing audience or any specific optimization use case, set Status to Removed. 3. For micro actions that must remain (for remarketing audience building, for instance), confirm they are Secondary. 4. Re-check the macro to micro ratio after the next reporting period. Healthy accounts typically sit at 10:1 micro-to-macro or less in the active conversion set. 5. Audit any cross-account dashboards to filter on Primary-only conversions where business reporting is the goal.',
    example: 'Micro volume: 812,400. Macro volume: 240. Ratio: 3,385x. Smart Bidding signal severely polluted.',
    citationTemplate:
      'On this Google Ads account, micro-conversion volume (page views, scrolls, searches, video starts) exceeds macro-conversion volume (purchases, leads, signups) by more than 100 to 1. Per Google Ads conversion goals documentation, Primary and Secondary designations control which actions steer Smart Bidding, but extreme volume imbalance in the active conversion set still degrades account-level reporting (Conversion Value per Cost calculations, Performance Max asset group attribution, cross-account MCC dashboards that aggregate Conversions without Primary-only filters). Healthy accounts typically sit within an order of magnitude on the micro-to-macro ratio. Fix: prune micro-conversion actions that are not actively used for remarketing audience building or specific optimization tests, confirm remaining micro actions are set to Secondary, and apply Primary-only filters in any business-facing dashboard. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['signal-micro-as-primary', 'micro-conversion-pollution', 'signal-primary-dilution'],
  },
  {
    id: 'signal-primary-dilution',
    name: 'Primary Conversion Dilution',
    source: 'report',
    severity: 'warning',
    summary: 'More than three macro-eligible conversion actions are enabled as Primary.',
    directAnswer:
      'Your account has more than three Primary conversion actions in the macro category (purchase, sale, transaction, lead, signup). Smart Bidding can optimize across multiple Primary actions, but when the list grows beyond three or four, the optimization signal blurs and Target ROAS calibration becomes harder.',
    why: 'Google Ads supports multiple Primary actions per conversion goal, and account-default goals can include several Primary actions across categories. The platform optimizes against the sum of value across all Primary actions in a campaign goal. That is sound when the actions represent distinct, comparably weighted outcomes. It breaks down when the Primary list expands to include every plausible business outcome under one campaign.\n\nA common scenario: an account starts with Purchase as Primary, then adds Lead Form Submit as Primary for a different campaign, then adds Demo Request, then adds Phone Call, then adds Email Signup. By month six there are six or seven Primary actions all feeding the same Smart Bidding strategies. The bidder has no clean way to weight them. The conversion value per cost calculation rolls them all together. Campaigns that should optimize toward purchases pull volume from cheaper Lead Form Submits because they look better on a count basis.\n\nThe fix is not to delete actions, it is to scope them. Each campaign should target the Primary actions that match its business goal. Cross-campaign Primary sprawl is the dilution.',
    howToFix:
      '1. Open Tools and Settings, Goals. Review which actions are Primary in the account default goal. 2. For each campaign, set a campaign-level conversion goal that targets only the Primary actions relevant to that campaign (Purchase campaigns target Purchase, Lead campaigns target Lead Form Submit, etc). This overrides the account default. 3. If multiple macro actions genuinely need to coexist at the account level, ensure value-based bidding is in use so the optimizer weights them by revenue rather than count. 4. Demote macro actions that are not actively used for optimization to Secondary. 5. Re-audit after the next quarter to confirm Primary count stays below four per campaign goal.',
    example: 'Account Primary actions: Purchase, Lead Form, Demo Request, Phone Call, Email Signup, Newsletter Subscribe. All feed every campaign.',
    citationTemplate:
      'This Google Ads account has more than three macro-eligible conversion actions configured as Primary. Per Google Ads conversion goals documentation, Smart Bidding optimizes against the sum of value across all Primary actions in a campaign goal, which functions cleanly when actions represent distinct, comparably weighted outcomes. As the Primary list expands beyond three or four macro actions feeding the same campaigns, the optimizer cannot weight them coherently, Target ROAS calibration becomes unreliable, and campaigns intended to drive purchases tend to pull volume from cheaper Lead or Signup actions on a count basis. The remediation is scoping rather than deletion: use campaign-level conversion goals to target only the actions relevant to each campaign, enable value-based bidding when multiple macro outcomes must coexist, and demote unused macro actions to Secondary. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['signal-micro-as-primary', 'signal-secondary-leakage', 'missing-primary-conversion'],
  },
  {
    id: 'signal-secondary-leakage',
    name: 'Secondary Conversion Leakage',
    source: 'report',
    severity: 'warning',
    summary: 'All conversions count is more than 2x the Conversions count for one or more actions.',
    directAnswer:
      'For one or more conversion actions on your account, the All conversions column is more than double the Conversions column. The Conversions column reflects Primary actions feeding bidding. The All conversions column adds Secondary actions on top. A 2x or higher gap means Secondary actions are carrying volume comparable to or larger than your Primary actions, which usually indicates either misclassified actions or duplicate tracking paths.',
    why: 'Google Ads splits reporting into two columns. Conversions includes only actions set to Primary in the relevant goal. All conversions includes everything, Primary and Secondary. A healthy account will see All conversions slightly higher than Conversions (because Secondary actions like add-to-cart or page-view contribute real volume), but typically within 1.2 to 1.5x of the Primary count.\n\nWhen the ratio is 2x or higher, two things commonly explain it. First, an action that should be Primary was demoted to Secondary by mistake (or never promoted), so the same Purchase event is showing up only in All conversions. Bidding can not see it. Second, there are duplicate tags or imports such that a Purchase is counted once as Primary and once as Secondary under a different name, inflating All conversions without affecting bidding.\n\nThe practical impact: reported Conversion Value per Cost (the ROAS proxy) calculates from Conversions, but operators reading All conversions for "actual outcomes" will see a much larger number. Disagreements between media buyer dashboards and finance dashboards usually trace back here.',
    howToFix:
      '1. Open the Conversions report and add the All conversions and Conversions columns side by side for each action. 2. For the flagged actions, check the Conversion goal action setting (Primary vs Secondary). If a macro outcome is set to Secondary, promote it to Primary. 3. If both Primary and Secondary actions cover the same outcome, identify the duplicate and remove or rename it. 4. After correction, expect the All conversions to Conversions ratio to fall to under 1.5x for most actions. 5. Document the rationale for any action intentionally kept at a high ratio (for instance, an action that legitimately receives both website-tag and offline-upload volume where one is Primary and the other is Secondary by design).',
    example: 'Action: Purchase. Conversions: 124. All conversions: 386. Ratio: 3.1x. Cause: GA4 Purchase Secondary firing in parallel with website Purchase Primary.',
    citationTemplate:
      'On this Google Ads account, the All conversions column is more than 2x the Conversions column for one or more conversion actions. Per Google Ads conversion goals documentation, the Conversions column reflects Primary actions feeding Smart Bidding while All conversions adds Secondary actions, and the healthy gap is typically within 1.2 to 1.5x. A 2x or higher ratio indicates either a macro outcome misclassified as Secondary (so bidding does not see it) or duplicate tracking paths where the same outcome counts once as Primary and once as Secondary under a different name or source. The result is reporting divergence between media-buyer dashboards reading Conversions and finance dashboards reading All conversions. Fix: audit the Primary versus Secondary setting on each flagged action, promote misclassified macro outcomes, remove or rename duplicate paths, and target a ratio below 1.5x for most actions after correction. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['signal-primary-dilution', 'volume-weighted-duplicates', 'perf-identical-volumes'],
  },
  {
    id: 'signal-window-overkill',
    name: 'Attribution Window Overkill',
    source: 'report',
    severity: 'info',
    summary: 'A purchase-category conversion action uses a click-through window longer than 30 days.',
    directAnswer:
      'A purchase-category conversion action on your account uses a click-through attribution window longer than 30 days. For most direct-response purchase flows, that window is wider than the actual buying behavior. The action will end up crediting clicks that occurred weeks before the purchase, even when those clicks had no causal role.',
    why: 'Google Ads lets you set the click-through window per conversion action, with options up to 90 days. For B2B and considered-purchase categories, long windows often match the real sales cycle. For ecommerce purchase flows where the median click-to-purchase delay is hours or a few days, a 60- or 90-day window introduces noise rather than accuracy.\n\nThe practical effect: a user clicks a brand search ad in week one, never returns through paid, and buys organically in week eight. With a 90-day window, that purchase still gets credited to the week-one click and shows up in the campaign\'s conversion column. The campaign looks more efficient than it is. Smart Bidding scales spend on it. Newer, harder-to-attribute campaigns lose budget by comparison.\n\nThe right window is the one that captures roughly the 90th percentile of real click-to-purchase delay. Pull the Time Lag report under Reports, Predefined, Time, and read the actual distribution before setting the window.',
    howToFix:
      '1. In Google Ads, open Reports, Predefined, Time, Time lag. Filter to the flagged purchase action. 2. Identify the time bucket containing the 90th percentile of conversions. For typical ecommerce, that lands at 7 to 14 days. 3. Open Tools and Settings, Conversions, the affected action, and update Click-through conversion window to the smallest window that captures that 90th percentile. 4. Annotate the change date in the account history so reported conversion counts that drop after the change are not misread as a campaign issue. 5. Allow 4 to 8 weeks of stabilization before judging campaign performance against the new window.',
    example: 'Action: Purchase. Click window: 90 days. Real 90th percentile click-to-purchase delay: 6 days. Window is 15x too wide.',
    citationTemplate:
      'A purchase-category conversion action on this Google Ads account uses a click-through attribution window longer than 30 days. Per Google Ads conversion window documentation, the click-through window controls how long after an ad interaction a conversion can be credited to that click. For direct-response purchase flows where the actual click-to-purchase delay is hours or a few days, a 60- or 90-day window credits clicks that had no causal role in the purchase, inflates campaign-reported efficiency, and biases Smart Bidding toward older campaigns at the expense of newer ones. The right window is the smallest one that captures roughly the 90th percentile of real click-to-conversion delay, which can be read directly from the Time Lag report under Reports, Predefined, Time. Fix: review Time Lag for the affected action, shorten the click-through window to match the 90th percentile, annotate the change date, and allow 4 to 8 weeks of stabilization before judging campaign performance against the new baseline. Source: support.google.com/google-ads/answer/3123169.',
    references: [
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
      {
        label: 'Google Ads. About Smart Bidding',
        url: 'https://support.google.com/google-ads/answer/7065882',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['model-attribution-drift', 'vtc-click-ratio'],
  },
  {
    id: 'signal-zero-value-primary',
    name: 'Zero-Value Primary Conversions',
    source: 'report',
    severity: 'critical',
    summary: 'A Primary purchase-category conversion action reports zero conversion value despite recording conversions.',
    directAnswer:
      'A Primary conversion action in the purchase/sale/transaction category on your account is recording conversions but reporting zero value. Value-based bidding (Target ROAS, Maximize Conversion Value) cannot run on an action with no value. The action will look productive on count, but every revenue-weighted optimization on the account is operating blind for this outcome.',
    why: 'Google Ads Target ROAS and Maximize Conversion Value strategies require each Primary conversion action they optimize against to send a value parameter. When a purchase-category Primary action has conversions but zero value, one of three things is happening. The conversion tag is firing but the value parameter is unset, hardcoded to zero, or sourced from a variable that returns empty. The conversion action settings have Use the same value for each conversion enabled with a value of zero. Or an offline upload populates the count but not the value column.\n\nThe consequence is that Smart Bidding cannot bid on revenue for that action. If it is the only Primary action, value-based strategies fall back to count optimization (treating every order identically regardless of size). If it is one of several Primary actions, it pulls the value-weighted average down sharply because Google divides total value by total conversions across all Primary actions in the goal.\n\nThis is one of the most common findings on accounts that switched from Maximize Conversions to Target ROAS without auditing the value pipeline first.',
    howToFix:
      '1. Open Tools and Settings, Conversions, and find the flagged Primary purchase action. 2. Check the Value setting. If Don\'t use a value or Use the same value with zero is selected, switch to Use different values for each conversion (dynamic). 3. In GTM, open the Google Ads conversion tag for that action and confirm the Conversion Value field references a data layer variable returning the actual order total (for example, {{DLV - ecommerce.purchase.value}}). 4. Test a real or staging purchase. Verify in Tag Assistant that the conversion request carries a non-zero value matching the backend order total. 5. Allow Smart Bidding 2 to 4 weeks to relearn against real values, and confirm the action\'s value-per-conversion stabilizes above zero in the next reporting period.',
    example: 'Action: Purchase, Primary, Enabled. Conversions: 312. Conversion value: $0. Cause: GTM value parameter unset on conversion tag.',
    citationTemplate:
      'A Primary purchase-category conversion action on this Google Ads account is recording conversions while reporting zero conversion value. Per Google Ads value-based bidding documentation, Target ROAS and Maximize Conversion Value strategies require each Primary action they optimize against to send a non-zero value parameter, and a zero-value Primary action either disables value-based optimization for that outcome or drags the value-weighted average down across the goal. The typical root causes are an unset or hardcoded value parameter in the GTM conversion tag, a conversion action setting configured for Don\'t use a value or Use the same value with zero, or an offline upload that populates count but not value. The pattern frequently appears on accounts that migrated to Target ROAS without first auditing the value pipeline. Fix: switch the conversion action to Use different values for each conversion, wire the GTM Conversion Value field to a data layer variable returning the order total, validate in Tag Assistant against a real backend order, and allow Smart Bidding 2 to 4 weeks to relearn. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Ads. About Target ROAS',
        url: 'https://support.google.com/google-ads/answer/6268637',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['perf-negative-values', 'zero-value-purchases', 'roas-sanity', 'mismatched-values'],
  },
  {
    id: 'ads-conversion-missing-gtm-tag',
    name: 'Ads Conversion Missing GTM Tag',
    source: 'cross',
    severity: 'critical',
    summary: 'An enabled Google Ads conversion action has no corresponding conversion tag in GTM.',
    directAnswer:
      'An enabled Google Ads conversion action exists with no matching Google Ads Conversion Tracking tag in the GTM container. Google Ads will keep listing the action as live, but the site never fires it. Volume will be zero or incomplete, and if the orphaned action is set Primary, Smart Bidding is learning from feedback that doesn\'t exist.',
    why: 'Google Ads can list an action as enabled even when the site never sends it. If the matching GTM tag is absent, renamed, or never deployed, conversion volume will be zero or incomplete. Primary actions in this state give Smart Bidding no usable feedback.',
    howToFix: 'Match every enabled Google Ads conversion action to a GTM Google Ads conversion tag or a deliberate non-GTM source such as an offline import. For GTM-managed actions, verify conversion ID, label, trigger, and publication status. Disable or mark Secondary any actions that are no longer supposed to receive traffic.',
    example: 'Google Ads: Lead Submit enabled\nGTM: no AW conversion tag or tag name containing Lead Submit',
    citationTemplate:
      'This account has one or more enabled Google Ads conversion actions with no corresponding Google Ads Conversion Tracking tag in the connected GTM container. Per Google Tag Manager Google Ads Conversion Tracking documentation, each enabled conversion action requires a tag with the matching AW conversion ID and label, plus a working trigger, in order to receive volume from the website. An orphaned enabled action will continue to appear live in Google Ads while silently recording zero conversions; if it is Primary, Smart Bidding optimises against absent feedback. Fix: pair every enabled action to either a published GTM conversion tag (verified conversion ID, label, trigger, and publication status) or a deliberate non-GTM source such as an offline import, and mark unmatched actions Removed or Secondary. Source: support.google.com/tagmanager/answer/6105160.',
    references: [
      {
        label: 'Google Tag Manager. Google Ads Conversion Tracking tag',
        url: 'https://support.google.com/tagmanager/answer/6105160',
      },
      {
        label: 'Google Ads. Verify conversion tracking is working',
        url: 'https://support.google.com/google-ads/answer/6095821',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'conversion-label-matching'],
  },
  {
    id: 'mismatched-values',
    name: 'Value Mismatch',
    source: 'cross',
    severity: 'critical',
    summary: 'GTM conversion values don\'t match the values configured or expected in Google Ads.',
    directAnswer:
      'The conversion value sent by your GTM tag doesn\'t match the value Google Ads is configured to accept (or expects from the business model). A fixed value of 1 on a purchase tag, a dataLayer variable that resolves empty, or a currency mismatch between site and account all produce wrong values in the report while the conversion count still looks correct. ROAS, tROAS, and any value-based bidding strategy break the moment values are wrong.',
    why: 'Value mismatches make revenue reports unreliable even when conversion counts look correct. A fixed GTM value can override dynamic purchase revenue, or Google Ads settings can imply a different value strategy than the tag actually sends. This breaks ROAS, value-based bidding, and finance reconciliation.',
    howToFix: 'Trace the value from the site dataLayer into the GTM tag and then into Google Ads. If the business uses dynamic revenue, the GTM value parameter should reference a transaction value variable and Google Ads should accept transaction-specific values. If fixed values are intentional, document the model and make sure every platform uses the same assumptions.',
    example: 'GTM value parameter: 1\nGoogle Ads purchase value: 129.99\nExpected: {{DLV - ecommerce.value}}',
    citationTemplate:
      'This account contains a value mismatch between the conversion value sent by GTM and the value Google Ads is configured to receive on one or more enabled conversion actions. Per Google Ads value-based bidding documentation, the value parameter on the Google Ads Conversion Tracking tag must reference a transaction-specific value variable (typically a Data Layer Variable reading the e-commerce purchase value) and be denominated in the account currency for ROAS reporting and tROAS bidding to function. A fixed value of 1, a dataLayer variable that resolves empty, or a currency mismatch produces ROAS figures that diverge from backend revenue while conversion counts appear correct. Fix: trace the value from site dataLayer to GTM tag to Google Ads action, confirm dynamic values use a transaction value variable, verify the account currency matches, and reconcile one sample order between backend and Google Ads before trusting value-based bidding. Source: support.google.com/google-ads/answer/9888879.',
    references: [
      {
        label: 'Google Ads. Set up conversion value',
        url: 'https://support.google.com/google-ads/answer/9888879',
      },
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7501826',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'roas-sanity'],
  },
  {
    id: 'conversion-label-matching',
    name: 'Conversion ID and Label Matching',
    source: 'cross',
    severity: 'critical',
    summary: 'GTM conversion IDs or labels may not match the intended Google Ads conversion actions.',
    directAnswer:
      'One or more Google Ads conversion tags in your GTM container may be sending a conversion ID or label that does not match the intended Google Ads conversion action. The conversion ID and label are the only signals Google uses to route a hit to an action: if either is wrong, the tag fires successfully and the conversion lands in the wrong action or vanishes entirely.',
    why: 'The conversion ID and label determine which Google Ads action receives the hit. If either value is wrong, the tag can fire successfully while credit lands in the wrong action or nowhere useful. This creates ghost conversions, orphaned actions, and bidding signals attached to the wrong goal.',
    howToFix: 'Open the Google Ads conversion action and copy the AW conversion ID and conversion label directly into the GTM tag. Avoid variable labels unless you have a controlled lookup table and tests for every output. Preview a test conversion and confirm the fired request contains the expected send_to value.',
    example: 'Expected send_to: AW-123456789/AbCdEfGhIjk\nGTM tag sends: AW-123456789/{{Conversion Label}}',
    citationTemplate:
      'This GTM container contains Google Ads Conversion Tracking tags whose conversion ID or label may not align with the intended Google Ads conversion action. Per Google Tag Manager documentation, the conversion ID (AW-NNNNNNNNN) and conversion label uniquely route a tag hit to a specific conversion action; an incorrect ID, an incorrect label, or a dynamic variable label that resolves unexpectedly will fire the tag successfully while crediting the wrong action or no action at all. The downstream symptoms are ghost conversions on the intended action, mystery volume on an unrelated action, and Smart Bidding optimising on the wrong goal. Fix: copy the conversion ID and label directly from the Google Ads Conversion action into each GTM tag, avoid variable labels unless backed by a tested lookup table, and verify in Tag Assistant Preview that the fired request contains the expected send_to value. Source: support.google.com/tagmanager/answer/6105160.',
    references: [
      {
        label: 'Google Tag Manager. Google Ads Conversion Tracking tag',
        url: 'https://support.google.com/tagmanager/answer/6105160',
      },
      {
        label: 'Google Ads. Find your conversion ID and label',
        url: 'https://support.google.com/google-ads/answer/3097054',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'meta-missing-pageview',
    name: 'Missing Meta PageView Event',
    source: 'meta',
    severity: 'critical',
    summary: 'The Meta Pixel export does not show an active PageView event.',
    directAnswer:
      'Your Meta Pixel isn\'t firing PageView. PageView is the floor of the pixel. Without it, Meta has no record that any user ever visited the site, which means website custom audiences are empty and every conversion event below it lands without browsing context.',
    why: 'PageView is what `fbq("init", ...)` followed by `fbq("track", "PageView")` produces. Meta hangs a lot off that single event. The "All website visitors" audience and every "Visited specific pages" audience read from PageView — no PageView, no remarketing pool. Event match quality gets scored partly on whether a conversion arrived with prior PageView hits from the same browser; a Purchase that lands cold looks like a server-side leak or a bot, and the match score drops. And the Events Manager diagnostics panel grades pixel health against expected traffic, which goes sideways when PageView is missing entirely.\n\nThe usual causes: the base pixel snippet got installed but `fbq("track", "PageView")` was commented out, the pixel is gated behind a consent state that never resolves to granted, or the tag was added through GTM with a trigger narrower than All Pages.',
    howToFix:
      '1. Install the Meta base pixel on every page, either inline, via GTM, or through your platform integration (Shopify, WordPress, etc). 2. Confirm `fbq("track", "PageView")` runs once per page load. Pixel Helper should show one PageView per navigation, not zero and not three. 3. If the pixel is consent-gated, verify it actually fires once consent is granted. Walk the denied path, the granted path, and a returning-visitor path. 4. Open Meta Events Manager, go to Test Events, paste a URL from the site, and confirm PageView lands within a few seconds. 5. Republish and re-run AdLint.',
    example: "fbq('init', '1234567890');\nfbq('track', 'PageView');",
    citationTemplate:
      'This Meta Pixel is not firing a PageView event. Per Meta\'s pixel documentation, PageView is the base event emitted by `fbq("track", "PageView")` after `fbq("init", ...)` and is required for website custom audiences, event match quality scoring, and Events Manager diagnostics. Without it, the "All website visitors" audience cannot populate, conversion events arrive without prior browsing context (which lowers their match score), and the pixel grading panel in Events Manager will not produce meaningful health data. The pixel may be installed but commented out, blocked by a consent state that never resolves, or attached to a GTM trigger narrower than All Pages. Fix: install or unblock the base pixel, confirm one PageView per pageview in Meta Pixel Helper, and verify in Events Manager Test Events before publishing. Source: developers.facebook.com/docs/meta-pixel.',
    references: [
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-missing-conversion-events', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-missing-conversion-events',
    name: 'Missing Meta Conversion Events',
    source: 'meta',
    severity: 'critical',
    summary: 'No active standard Meta conversion event such as Purchase or Lead is present.',
    directAnswer:
      'Your Meta Pixel fires PageView and maybe a few custom events, but no standard conversion event (Purchase, Lead, CompleteRegistration, Subscribe). Meta has nothing to optimize toward. Any campaign on this account that asks for "Conversions" will quietly fall back to optimizing for traffic, link clicks, or whatever proxy it can find.',
    why: 'Meta\'s ad delivery system is built around standard events. The optimizer learns "this kind of user, on this kind of placement, at this time of day, eventually fires Purchase." If Purchase never appears in the event stream, the optimizer has no target and the campaign drifts toward whatever signal it can latch onto — almost always link clicks, the cheapest action and the least correlated with revenue.\n\nReporting falls apart at the same time. The Ads Manager "Results" column reads from standard events first, custom events second. With no standard events configured, every campaign reports against whatever objective it was created with, and you can\'t compare them to each other. Lead campaigns, sales campaigns, app campaigns all show different "Results" units and the numbers stop meaning the same thing.\n\nAudiences suffer too. Lookalike sources built from Purchase produce dramatically better seed quality than lookalikes built from PageView. No Purchase event, no purchase lookalike, no warm path for prospecting at scale.\n\nThe usual cause is a pixel that was installed for diagnostics during a site rebuild, never wired to the order confirmation page, and never revisited.',
    howToFix:
      '1. Identify the right standard event for the business: Purchase for ecommerce, Lead or CompleteRegistration for lead gen, Subscribe or SubmitApplication where relevant. The full list is in Meta\'s standard events reference. 2. Fire the event on the actual confirmation step, not the button click. Button clicks include abandoned attempts and inflate volume. 3. Pass the standard parameters Meta expects for that event (value and currency on Purchase, content_name on Lead, etc). 4. Verify in Events Manager Test Events that the event lands with the expected parameters. 5. Wait 24-48 hours and confirm the event shows recent volume in the Overview tab before optimizing campaigns toward it.',
    example: "fbq('track', 'Purchase', { value: 129.99, currency: 'USD' });",
    citationTemplate:
      'This Meta Pixel has no active standard conversion event. Per Meta\'s standard events documentation, events such as Purchase, Lead, CompleteRegistration, and Subscribe are the units Meta uses to optimize ad delivery and to populate Ads Manager Results columns. With only PageView or custom events configured, Conversions-objective campaigns lose their optimization target and tend to drift toward link-click proxies, lookalike audiences built from Purchase cannot be created, and cross-campaign reporting becomes incomparable. The most common root cause is a pixel installed for diagnostics and never wired into the order confirmation or lead confirmation step. Fix: implement the appropriate standard event for the business model, fire it on the confirmation step (not the button click), validate the payload in Events Manager Test Events, and confirm 24-48 hours of stable volume before optimizing campaigns toward it. Source: developers.facebook.com/docs/meta-pixel/reference.',
    references: [
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-purchase-missing-value', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-purchase-missing-value',
    name: 'Meta Purchase Missing Value',
    source: 'meta',
    severity: 'critical',
    summary: 'Meta Purchase events are firing without usable value data.',
    directAnswer:
      'Your Meta Purchase events fire, but they arrive without `value` and `currency`. Meta counts the order. It cannot tell a $12 sticker sale from a $1,200 furniture sale. Every bid decision and every ROAS number on this account is built on order count, not order revenue.',
    why: 'Value-based optimization (Meta\'s "Value" purchase optimization goal) needs each Purchase event to carry the actual order total. When `value` is missing, Meta can\'t run value optimization at all. The campaign falls back to optimizing for purchase count, which treats a $5 add-on identically to a $500 cart. Spend chases volume, not revenue. The ROAS column in Ads Manager either reads zero or shows a number Meta calculated from a default value it inferred. Neither is real.\n\nMissing `currency` is the same shape of problem. Meta assumes USD when no currency is sent. Sites that operate in EUR, GBP, or anywhere multi-currency get their reported revenue mis-converted without warning, and the numbers in Ads Manager won\'t line up with the numbers in Shopify or the order management system.\n\nThis usually happens because the Purchase tag was set up with a static value (often `value: 0` or `value: 1`) during QA and never rewired to the real order total. It also happens when the developer pulled the value from a CSS selector on the confirmation page that broke after a redesign.',
    howToFix:
      '1. Pass `value` and `currency` on every Purchase event. Source `value` from the confirmed order total in the order object or the platform\'s data layer. Do not hardcode it. Do not read it from a price string on the page. 2. Use the correct ISO 4217 currency code (USD, EUR, GBP, etc). 3. Include `content_ids` and `content_type: "product"` so Meta can attribute revenue back to specific catalog items for Advantage+ Shopping and dynamic ads. 4. In Events Manager, open the Purchase event and check the Parameters tab. `value` and `currency` should appear with high coverage (Meta will warn if either is below ~90%). 5. Spot-check three recent real orders: the value sent should match the order total in your commerce backend within rounding.',
    example: "fbq('track', 'Purchase', { value: order.total, currency: 'USD', content_ids: order.skus });",
    citationTemplate:
      'This Meta Pixel is firing Purchase events without `value` and `currency` parameters. Per Meta\'s standard events reference, Purchase requires both parameters for value-based bid optimization and for accurate revenue reporting in Ads Manager. Without `value`, the optimizer cannot run the Value purchase optimization goal and falls back to optimizing for raw order count, treating low-margin and high-margin orders as equivalent. Without `currency`, Meta defaults to USD and mis-converts revenue from any other currency without flagging it, which causes Ads Manager revenue to diverge from the commerce backend. The typical root cause is a tag wired with a placeholder value during QA, or a value source (such as a DOM selector on the confirmation page) that broke during a later redesign. Fix: pass `value` from the confirmed order total and the correct ISO 4217 `currency`, verify parameter coverage in Events Manager, and reconcile three recent orders against the commerce backend. Source: developers.facebook.com/docs/meta-pixel/reference.',
    references: [
      {
        label: 'Meta. Standard events reference (Purchase parameters)',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
      {
        label: 'Meta. Conversions API. Deduplicate pixel and server events',
        url: 'https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-missing-conversion-events', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-ecommerce-funnel',
    name: 'Meta E-commerce Funnel Events',
    source: 'meta',
    severity: 'warning',
    summary: 'Expected Meta e-commerce funnel events are missing or inactive.',
    directAnswer:
      'Your Meta Pixel is missing one or more mid-funnel ecommerce events (ViewContent, AddToCart, InitiateCheckout). Purchase may still be firing, but Meta cannot see the journey that led there. You lose abandoned-cart audiences, dynamic product ads, and most of the diagnostic value Events Manager would otherwise provide.',
    why: 'Meta\'s ecommerce stack expects a four-event funnel: ViewContent on a product page, AddToCart on cart add, InitiateCheckout when the user enters the checkout flow, Purchase on order completion. Each event powers something specific.\n\nViewContent feeds product-level retargeting and is the seed for Advantage+ Catalog Ads. Without it, dynamic product ads have no inventory of "what did this user look at" and fall back to a generic catalog rotation. AddToCart is what builds your abandoned-cart audience. No AddToCart event, no abandoned-cart audience, no cart-recovery campaign. InitiateCheckout is the late-funnel intent signal Meta uses to find users who are close to buying but did not finish. Skipping it means losing the warmest remarketing pool you have.\n\nThe usual failure pattern is partial coverage. Purchase fires because someone made sure the confirmation page was tagged. The earlier events were never wired because the dev team did not know they existed, or the Shopify / WooCommerce plugin only covers a subset. The pixel looks healthy at the bottom of the funnel and is empty above it.',
    howToFix:
      '1. Map each event to a site action. ViewContent on `/products/:slug` pageviews. AddToCart on the add-to-cart button (after the cart actually accepts the item). InitiateCheckout on the first step of the checkout flow. Purchase on the order confirmation page. 2. Use exact Meta standard event names. `AddToCart`, not `add_to_cart`. Custom-cased event names will not match Meta\'s catalog. 3. Pass `content_ids`, `content_type: "product"`, `value`, and `currency` on every event from ViewContent down. These are what tie pixel events to your product catalog. 4. Walk the full funnel once in a real browser. Pixel Helper should show each event fire exactly once at its expected step. 5. In Events Manager, check the Overview tab and confirm all four events show recent volume in a sensible ratio (ViewContent will be the highest, Purchase the lowest).',
    example: 'Expected events: PageView -> ViewContent -> AddToCart -> InitiateCheckout -> Purchase',
    citationTemplate:
      'This Meta Pixel is missing one or more standard ecommerce funnel events (ViewContent, AddToCart, InitiateCheckout). Per Meta\'s standard events reference, these events feed product-level retargeting (ViewContent into Advantage+ Catalog Ads), abandoned-cart audiences (AddToCart), and late-funnel intent audiences (InitiateCheckout). With partial funnel coverage, dynamic product ads cannot personalize against viewed products, cart-recovery campaigns cannot be built, and Events Manager cannot grade funnel drop-off. The typical root cause is that the order confirmation page was tagged in isolation while earlier funnel steps were never wired, or a platform plugin covers only Purchase. Fix: implement ViewContent, AddToCart, and InitiateCheckout on their matching site actions using exact Meta standard event names, pass `content_ids`, `content_type`, `value`, and `currency` on each, and verify the full sequence in Pixel Helper and Events Manager. Source: developers.facebook.com/docs/meta-pixel/reference.',
    references: [
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-missing-pageview', 'meta-purchase-missing-value'],
  },
  {
    id: 'meta-custom-event-standard-alternative',
    name: 'Meta Custom Events With Standard Alternatives',
    source: 'meta',
    severity: 'info',
    summary: 'Custom Meta events appear to duplicate standard events that would optimize better.',
    directAnswer:
      'Your Meta Pixel is using custom event names for actions that map cleanly to Meta standard events. A custom event called `add_cart` or `complete_signup` works for tracking, but Meta\'s optimizer treats it as an unknown signal. Switching to the standard `AddToCart` or `CompleteRegistration` unlocks better delivery and audience tooling.',
    why: 'Standard events (PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Lead, CompleteRegistration, Subscribe, AddToWishlist) are not just naming conventions. Meta\'s ad delivery system has years of cross-account training data tied to each standard event. When a campaign optimizes for AddToCart, Meta knows what behaviour, placements, and audiences correlate with that action across every advertiser using the pixel. A custom event named `cart_add` carries none of that prior. The optimizer has to learn from your account alone, which lengthens the learning phase and often never reaches stable performance on smaller budgets.\n\nThe second cost is audience building. Lookalike sources built from standard Purchase or Lead events get processed through Meta\'s value-tier modeling. Custom events do not. You also lose access to Advantage+ Catalog Ads (which require ViewContent and AddToCart with proper content IDs) and to a handful of Events Manager diagnostics that only grade against standard event names.\n\nThe usual root cause is a developer who tagged the site from scratch using internal naming conventions, or a GTM template that exposed a free-form event name field and was filled with whatever felt natural.',
    howToFix:
      '1. Pull the list of flagged custom events from AdLint. 2. For each one, map to the closest standard event from Meta\'s reference: AddToCart, ViewContent, InitiateCheckout, AddPaymentInfo, Purchase, Lead, CompleteRegistration, Subscribe. Match on intent, not on string similarity. 3. Update the `fbq("trackCustom", "...")` calls to `fbq("track", "<StandardName>", { ... })`. Standard event names are case-sensitive. 4. Keep the legacy custom event firing in parallel for two to four weeks so any campaigns or audiences built against it do not break. 5. Migrate campaigns and audiences to the standard event, then retire the custom event once the standard event shows stable volume in Events Manager.',
    example: "// Before\nfbq('trackCustom', 'add_cart', { value: 49.99 });\n// After\nfbq('track', 'AddToCart', { value: 49.99, currency: 'USD', content_ids: ['sku-123'] });",
    citationTemplate:
      'This Meta Pixel is using custom event names for user actions that map directly to Meta standard events (such as AddToCart, ViewContent, Lead, CompleteRegistration, or Purchase). Per Meta\'s standard events reference, standard events are pre-trained signals that the delivery system uses for optimization, lookalike seeding, Advantage+ Catalog Ads eligibility, and Events Manager diagnostics. Custom events bypass all of this and force the optimizer to learn from a single account\'s history, which extends learning phases and limits scale. The typical root cause is internal naming conventions applied during initial pixel setup, or a free-form event name field in a GTM template. Fix: map each flagged custom event to its standard equivalent, switch the `fbq("track", ...)` call to the standard name with the correct parameters (`value`, `currency`, `content_ids`), run both in parallel for two to four weeks, then migrate campaigns and audiences onto the standard event. Source: developers.facebook.com/docs/meta-pixel/reference.',
    references: [
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-missing-conversion-events', 'meta-ecommerce-funnel'],
  },
  {
    id: 'meta-disabled-conversions',
    name: 'Disabled Meta Conversion Events',
    source: 'meta',
    severity: 'warning',
    summary: 'One or more standard Meta conversion events are marked Disabled in Events Manager.',
    directAnswer:
      'Your Meta Pixel has a standard conversion event (Purchase, Lead, CompleteRegistration, Subscribe, AddToCart, or InitiateCheckout) flagged as Disabled in Events Manager. Disabled events do not feed campaign optimization, do not populate audiences, and do not appear in the Results column. If a campaign was built against one of these before it was disabled, it is now optimizing against silence.',
    why: 'In Events Manager, each pixel event has a status: active, inactive, or disabled. Disabled is an explicit toggle, usually flipped by an admin in the Aggregated Event Measurement configuration or in the event settings panel itself. Once disabled, the event still arrives at Meta\'s servers, but Meta drops it on receipt. Nothing downstream sees it.\n\nThe damage depends on which event was disabled. A disabled Purchase event means no Value optimization, no ROAS reporting, no Purchase lookalike refresh. A disabled Lead event means lead-gen campaigns silently lose their target. A disabled AddToCart breaks abandoned-cart audiences across every Advantage+ Catalog Ads campaign on the account.\n\nThe two common causes are AEM cleanup gone wrong and accidental toggles during account audits. Aggregated Event Measurement limits each domain to eight prioritized events, and when teams need to add a new one they sometimes disable an existing one without realizing a live campaign depends on it. The other case is a freelancer or new agency user clicking through Events Manager settings and toggling a status without context.',
    howToFix:
      '1. Open Meta Events Manager and go to the Data Sources panel for the pixel. 2. Filter events by status and identify each one marked Disabled. Cross-reference against the list AdLint flagged. 3. For each disabled event, check the AEM configuration. If the slot is needed for something else, ranking matters more than disabling. If not, re-enable the event. 4. Inspect every active campaign on the account. Any campaign optimizing for the disabled event has been running blind and needs either re-pointing or pausing. 5. After re-enabling, wait 24 to 48 hours for volume to recover before resuming optimized delivery.',
    example: 'Events Manager > Data Sources > Events > Status column should read Active for all in-use standard events.',
    citationTemplate:
      'This Meta Pixel has one or more standard conversion events (Purchase, Lead, CompleteRegistration, Subscribe, AddToCart, InitiateCheckout) flagged as Disabled in Events Manager. Per Meta\'s pixel documentation, disabled events are dropped on receipt and contribute nothing to campaign optimization, audience refresh, or Results reporting. Any campaign that was built against a now-disabled event is optimizing against zero signal and will drift toward the cheapest fallback action. The typical root cause is Aggregated Event Measurement reprioritization where an active event was disabled to free a slot for a new one, or an accidental status toggle during an account audit. Fix: identify each disabled event in the Events Manager status column, reconcile against Aggregated Event Measurement priorities, re-enable any event that still has live dependencies, and pause or re-point campaigns that were optimizing against the disabled events. Source: developers.facebook.com/docs/meta-pixel.',
    references: [
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-missing-conversion-events', 'meta-zero-volume-events'],
  },
  {
    id: 'meta-duplicate-events',
    name: 'Duplicate Meta Event Names',
    source: 'meta',
    severity: 'warning',
    summary: 'The same event name is configured more than once in the pixel.',
    directAnswer:
      'Your Meta Pixel has two or more entries with the same event name. Meta does not collapse them automatically. Each configured event runs its own counter, fires its own optimization signal, and can inflate conversion totals or split learning data depending on how the duplicates were created.',
    why: 'There are two flavours of this problem and they cause different damage.\n\nThe first is unintentional double-firing on the client. The same `fbq("track", "Purchase", ...)` call runs twice on the order confirmation page because the tag is in both the page template and a GTM container, or because a single-page-app router re-runs the pixel on a state change. Meta receives two Purchase events for one order. The Results column doubles. ROAS calculations look stronger than they are. Campaigns optimize toward a phantom conversion rate.\n\nThe second is Conversions API duplication without `event_id`. The browser pixel fires Purchase. The server fires Purchase. Both arrive at Meta. Without a matching `event_id` and timestamp pair, Meta has no way to deduplicate them and counts each one. The same order gets attributed twice across the funnel.\n\nThe third (less common) is two distinct event configurations in Events Manager that share a name because someone duplicated the row during AEM editing. Meta treats them as separate routing slots and the volume splits unpredictably.',
    howToFix:
      '1. Pull the duplicate names AdLint flagged. For each one, walk a real flow in Meta Pixel Helper and count how many times the event fires per user action. Exactly one fire per action is the target. 2. If the duplication is client-side, identify the source: a hardcoded template tag plus a GTM tag, a router re-init, or a third-party app that ships its own pixel. Remove one of them. 3. If the duplication is client plus Conversions API, implement deduplication. Send the same `event_id` and `event_time` from both browser and server. Meta\'s deduplication doc covers the exact payload shape. 4. If two configurations share a name in Events Manager, delete one of the rows in the AEM panel and let the remaining one carry the volume. 5. After the fix, watch the event in Events Manager for 24 to 48 hours. Volume should drop to roughly half if you removed a true duplicate.',
    example: "// Conversions API deduplication\nfbq('track', 'Purchase', { value: 99 }, { eventID: 'order_12345' });\n// Server payload also includes event_id: 'order_12345' and matching event_time",
    citationTemplate:
      'This Meta Pixel has duplicate event configurations sharing the same name. Per Meta\'s deduplication documentation, Meta only collapses identical events when both browser pixel and Conversions API payloads carry a matching `event_id` and `event_time`; otherwise each event is counted independently. The downstream damage depends on the source: client-side double-firing (page template plus GTM, or SPA router re-init) inflates Results and ROAS columns; Conversions API duplication without `event_id` double-counts the same order across the funnel; and two Events Manager rows with the same name split volume unpredictably across optimization slots. Fix: walk the funnel in Meta Pixel Helper and confirm exactly one fire per user action, remove redundant client-side sources, implement `event_id`-based deduplication for any browser plus server pairs, and consolidate duplicate rows in the Events Manager configuration. Source: developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events.',
    references: [
      {
        label: 'Meta. Deduplicate pixel and server events',
        url: 'https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events',
      },
      {
        label: 'Meta. Conversions API',
        url: 'https://developers.facebook.com/docs/marketing-api/conversions-api/',
      },
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-similar-event-names', 'meta-event-concentration'],
  },
  {
    id: 'meta-event-concentration',
    name: 'Meta Event Volume Concentration',
    source: 'meta',
    severity: 'info',
    summary: 'A single non-PageView event accounts for an outsized share of total pixel volume.',
    directAnswer:
      'Your Meta Pixel has one event (other than PageView) carrying more than 95 percent of all reported volume. That pattern usually means the rest of the funnel is missing, mis-named, or mis-fired. A healthy pixel shows volume tapering from PageView through ViewContent, AddToCart, InitiateCheckout, and Purchase, not a single spike with nothing else around it.',
    why: 'Meta\'s optimizer reads the relative shape of your event volume as a health signal. When ViewContent, AddToCart, and InitiateCheckout are absent or near zero, but a single mid-funnel event is responsible for almost everything, two things tend to be true.\n\nFirst, the dominant event is probably mis-mapped. A common case: AddToCart is wired to every product page view instead of the actual cart-add click, so it counts as both browsing and intent. The volume looks great. The signal is garbage. Campaigns optimized against it learn to chase product page traffic, not real cart adds.\n\nSecond, the surrounding events probably exist on the site but are not reaching Meta. A consent gate, a CSP rule, or a broken trigger lets PageView through but blocks the rest. The pixel grading panel in Events Manager will not flag this directly because each individual event passes its own health check; only the ratio gives it away.\n\nA single dominant event also distorts lookalike seed quality. Meta uses the event\'s audience as the source. If that audience is bloated with non-intent traffic, the lookalike inherits the noise.',
    howToFix:
      '1. Identify which event is dominating. AdLint reports the name and percentage. 2. Pull the actual trigger configuration for that event in GTM, the tag manager, or the source code. Walk a real session and confirm the event only fires on its intended action. If it fires on every page or on every click, fix the trigger. 3. Check the events that should sit around it in the funnel. ViewContent should be roughly 1x to 3x the AddToCart volume. AddToCart should be roughly 3x to 10x the Purchase volume. If those events are missing entirely, see meta-ecommerce-funnel. If they exist but are starved, investigate consent gating and CSP. 4. In Events Manager, open the Overview tab and look at the event ratio over the last 28 days. The shape should taper, not spike. 5. Once the ratios look right, re-evaluate any campaigns built against the dominant event. They may have been optimizing on inflated signal and need a learning reset.',
    example: 'Healthy shape (28 days): PageView 50k -> ViewContent 12k -> AddToCart 1.5k -> InitiateCheckout 600 -> Purchase 220.',
    citationTemplate:
      'This Meta Pixel shows one non-PageView event carrying more than 95 percent of total event volume. Per Meta\'s pixel documentation, a healthy ecommerce pixel produces a funnel-shaped volume distribution from PageView through Purchase; a single spike usually indicates either a mis-mapped trigger (the event firing on a broader action than intended) or that surrounding funnel events are blocked by consent gating, CSP rules, or missing tags. Either pattern degrades optimization signal quality and bloats lookalike seed audiences with non-intent traffic. Fix: verify the dominant event\'s trigger fires only on its intended user action, restore the surrounding funnel events (ViewContent, AddToCart, InitiateCheckout) where missing, confirm consent paths permit the full pixel, and reassess campaigns that may have been optimizing against the inflated signal. Source: developers.facebook.com/docs/meta-pixel.',
    references: [
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-ecommerce-funnel', 'meta-zero-volume-events'],
  },
  {
    id: 'meta-similar-event-names',
    name: 'Similar Meta Event Names',
    source: 'meta',
    severity: 'info',
    summary: 'Two or more Meta events have nearly identical names and may be the same action tagged twice.',
    directAnswer:
      'Your Meta Pixel has events with names so close that they are probably the same action tagged twice. Patterns like `Purchase` and `purchase`, or `AddToCart` and `add_to_cart`, are not collapsed by Meta. They run as separate events, split volume, and confuse anyone reading Events Manager.',
    why: 'Meta event names are case-sensitive and exact-match. `Purchase` and `purchase` are two different events. So are `AddToCart` and `add_to_cart`. So are `lead` and `Lead`. Meta does not normalize them, does not warn, and does not merge their volume in reporting.\n\nThe split causes three problems. First, the standard event optimization path only recognizes the exact-cased standard name (`Purchase`, `AddToCart`, `Lead`). The variant gets treated as a custom event and loses access to value optimization, Advantage+ tooling, and standard lookalike seeding. Second, half the conversions land in the standard slot, the other half in the custom slot, and campaign Results columns show the wrong total. Third, when an analyst later reads Events Manager and sees two events with similar names, they cannot tell which one is real, which one is dead, or whether dedupe is happening.\n\nThe usual cause is two tagging surfaces: a hardcoded pixel call uses one casing, a GTM tag uses another, and a third-party plugin ships its own. Each one fires what it thinks is right.',
    howToFix:
      '1. Pull the similar-name pairs AdLint flagged. For each pair, identify which is the canonical Meta standard event name (PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Lead, CompleteRegistration, Subscribe, AddToWishlist). 2. Locate every source firing either variant: page template, GTM, server-side via Conversions API, third-party plugin. 3. Standardize on the exact Meta casing across all sources. Update GTM tags, server payloads, and any hardcoded `fbq("track", ...)` calls. 4. Leave the legacy variant firing for two to four weeks so campaigns and audiences pointed at it do not break, then retire it once the canonical event shows stable volume. 5. In Events Manager, confirm the duplicate name disappears from the events list after the retirement window.',
    example: "// Wrong: two events that Meta sees as different\nfbq('track', 'purchase', { value: 99 });\nfbq('track', 'Purchase', { value: 99 });\n// Right: one canonical standard event\nfbq('track', 'Purchase', { value: 99, currency: 'USD' });",
    citationTemplate:
      'This Meta Pixel has two or more events with near-identical names (such as `Purchase` and `purchase`, or `AddToCart` and `add_to_cart`). Per Meta\'s standard events reference, event names are case-sensitive and exact-match, which means only the canonical casing receives standard-event treatment (value optimization, Advantage+ eligibility, standard lookalike seeding); variants are routed as custom events and split conversion volume across two slots. The downstream impact is that Results columns under-report against the canonical event, optimization signal is fragmented, and Events Manager becomes ambiguous to read. The typical root cause is multiple tagging surfaces (page template, GTM, third-party plugin, Conversions API) using different casing conventions. Fix: identify the canonical Meta standard event name for each pair, standardize every firing source on the exact casing, run both variants in parallel for two to four weeks, then retire the variant. Source: developers.facebook.com/docs/meta-pixel/reference.',
    references: [
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-duplicate-events', 'meta-custom-event-standard-alternative'],
  },
  {
    id: 'meta-zero-volume-events',
    name: 'Meta Zero Volume Active Events',
    source: 'meta',
    severity: 'warning',
    summary: 'One or more events are marked Active but have recorded zero conversions.',
    directAnswer:
      'Your Meta Pixel has events with status Active but zero recorded volume across the audit window. Active means Meta is listening; zero volume means nothing is arriving. The event exists in Events Manager only on paper, and any campaign optimizing toward it has no signal to learn from.',
    why: 'An active event with no volume is one of three things. First, the trigger is broken: the tag is configured against a CSS selector, a route, or a data layer key that no longer exists after a site change. The pixel call never executes. Second, the event is gated behind a consent state that never resolves to granted, so the request is built but never sent. Third, the event name on the pixel side does not match what Meta expects (subtle casing or spacing differences), so it routes somewhere else and the active row stays empty.\n\nThe consequence depends on which event is empty. An empty Purchase event is the most damaging case because every revenue-optimized campaign on the account is silently broken. An empty AddToCart kills abandoned-cart audiences and Advantage+ Catalog Ads retargeting. An empty Lead event makes lead-gen optimization impossible.\n\nThe quiet part is that the pixel still passes a surface health check. Events Manager shows the event as configured. Pixel Helper does not complain about its absence. Only the Overview tab\'s 28-day volume column gives it away, and only if someone looks.',
    howToFix:
      '1. For each zero-volume event AdLint flagged, walk the user action that should trigger it in a real browser with Meta Pixel Helper open. If Pixel Helper does not show the event, the trigger is broken. 2. Inspect the tag configuration: GTM trigger conditions, CSS selectors, data layer keys, route patterns. Confirm each still matches the current site. 3. Walk the consent path. Deny consent, then grant consent, then refresh. The event should fire after grant. If it never fires, the consent gating is misconfigured. 4. Check the exact event name on the pixel side against Meta\'s standard events reference. `Purchase` not `purchase`. `AddToCart` not `Add_To_Cart`. 5. After fixing, wait 24 hours and confirm volume appears in Events Manager Overview. If a campaign was optimizing against the empty event, expect a learning reset.',
    example: 'Events Manager > Overview > 28-day volume column should show non-zero numbers for every Active event.',
    citationTemplate:
      'This Meta Pixel has one or more events with status Active but zero recorded volume across the audit window. Per Meta\'s pixel documentation, an active event with no volume is almost always one of three failures: a broken trigger (CSS selector, data layer key, or route pattern that no longer matches the live site), a consent gate that never resolves to granted, or an event name mismatch where the pixel uses different casing than Meta\'s canonical standard events. The downstream damage scales by event: an empty Purchase silently breaks revenue-optimized campaigns, an empty AddToCart kills abandoned-cart audiences and Advantage+ Catalog Ads retargeting, an empty Lead disables lead-gen optimization. The pixel passes surface health checks while the underlying signal is absent. Fix: walk each zero-volume event in Meta Pixel Helper, repair the trigger or consent path, verify exact-cased standard event names, then confirm 24 hours of recovered volume in Events Manager Overview before resuming optimized delivery. Source: developers.facebook.com/docs/meta-pixel.',
    references: [
      {
        label: 'Meta. Meta Pixel implementation guide',
        url: 'https://developers.facebook.com/docs/meta-pixel/',
      },
      {
        label: 'Meta. Standard events reference',
        url: 'https://developers.facebook.com/docs/meta-pixel/reference',
      },
      {
        label: 'Meta Business Help. About Standard Events',
        url: 'https://www.facebook.com/business/help/402791146561655',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['meta-disabled-conversions', 'meta-event-concentration'],
  },
  {
    id: 'tiktok-base-events-active',
    name: 'TikTok Base Events Active',
    source: 'tiktok',
    severity: 'critical',
    summary: 'The TikTok Pixel export has no active events with recorded volume.',
    directAnswer:
      'Your TikTok Pixel is reporting zero active events. No ViewContent, no ClickButton, no CompletePayment. TikTok can\'t see this site at all, which means any campaign optimizing toward a pixel event is optimizing on nothing.',
    why: 'TikTok Pixel sends events via the `ttq.track()` call (or its GTM template equivalent). When Events Manager shows zero volume across every event for a full reporting window, only a handful of things can be true: the base pixel snippet isn\'t on the page, it\'s on the page but `ttq.page()` is never called, the pixel loads but every `ttq.track()` is gated behind a consent state that never resolves, or a script blocker, ad blocker, or CSP rule kills the request before it leaves the browser.\n\nDownstream this turns nasty. TikTok can\'t build retargeting audiences without event volume. Smart Performance Campaigns optimize toward a conversion goal you haven\'t defined, so they fall back to the loosest signal available. Pixel-attributed conversions report as zero in the dashboard, but the spend still goes out the door. Anyone reading TikTok performance reports for this account is reading fiction.\n\nNo events also blocks the Events API path. You can\'t deduplicate server-side hits against client-side hits when the client side is empty, so the usual server-side fallback story doesn\'t save this one.',
    howToFix:
      '1. Load any tracked page and open DevTools. Filter network for `analytics.tiktok.com`. If you see no requests at all, the pixel snippet is missing or blocked. 2. If the snippet is present, confirm `ttq.page()` runs on initial load and that `ttq.track()` is wired to real site actions (button click, form submit, add-to-cart). 3. Check your CMP. TikTok Pixel needs marketing consent to fire. If default consent is denied and never granted, Events Manager stays at zero. 4. Reload TikTok Events Manager, switch to Test Events, paste your test URL, and walk a real flow. Live events should appear within seconds. 5. Do not enable conversion-optimized campaigns until at least one standard event is reporting consistent volume.',
    example: 'Expected: page browsing generates ViewContent or ClickButton volume in Events Manager within the test window.',
    citationTemplate:
      'This TikTok Pixel is reporting zero active events in Events Manager across the audited window. Per TikTok\'s Pixel setup documentation, an installed pixel should record at least one standard event (ViewContent, ClickButton, AddToCart, or CompletePayment) within minutes of page activity; sustained zero volume indicates the base snippet is missing, blocked by consent or CSP, or not wired to real site actions. The downstream impact is that no retargeting audience can build, no Smart Performance Campaign can optimize toward a real conversion goal, and any pixel-attributed performance in the TikTok Ads Manager is unreliable. Fix: confirm the base pixel and `ttq.page()` fire on every tracked page, validate consent gating, and walk a live flow in TikTok Test Events before launching conversion-optimized campaigns. Source: ads.tiktok.com/help/article/get-started-pixel.',
    references: [
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. About Events API', url: 'https://ads.tiktok.com/help/article/about-events-api' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-ecommerce-funnel', 'tiktok-completepayment-missing-value'],
  },
  {
    id: 'tiktok-completepayment-missing-value',
    name: 'TikTok CompletePayment Missing Value',
    source: 'tiktok',
    severity: 'critical',
    summary: 'TikTok CompletePayment events are firing without value data.',
    directAnswer:
      'Your CompletePayment events fire on every order, but they ship with no `value` and no `currency` field. TikTok counts the order. TikTok can\'t tell you what it was worth. Every purchase looks identical to the bidding system, so optimization treats a $9 trial and a $900 enterprise plan as the same outcome.',
    why: 'CompletePayment is the TikTok standard event tied to revenue. Per TikTok\'s standard-events spec, the event accepts `value` (the order total), `currency` (ISO 4217, e.g. USD), and a `contents` array describing the line items. When `value` is missing, TikTok\'s reporting drops to count-only. Value-based bidding, ROAS reporting, and the auction signals that prioritize high-LTV shoppers all degrade to a flat conversion count.\n\nThe usual failure modes look the same in code: a hardcoded `value: 0`, a templated value that resolves to `undefined` because the variable name doesn\'t match the data layer, or a value computed before discount and tax so it disagrees with what the customer actually paid. The pixel still fires. Events Manager still records the event. The match quality score even looks healthy. Only the revenue column is hollow.\n\nEvent Match Quality won\'t help you catch this. EMQ measures identifier coverage (email, phone, IP, user agent) — it doesn\'t validate parameter completeness. An account can hit a green EMQ score and still be invisible for value-based optimization. This is the gap agencies miss most often when reviewing client setups.',
    howToFix:
      '1. On the order-confirmation page, source the order total from the same field your accounting system reads. Pass it as `value` (number, not string) on `ttq.track(\'CompletePayment\', { value, currency, contents })`. 2. Set `currency` explicitly as a 3-letter ISO code. Do not assume USD. Multi-region storefronts must pass the buyer\'s currency, not the store default. 3. Decide once whether your value is gross (with tax, with shipping) or net, and document it. Mismatched conventions between client and server events break deduplication. 4. Open TikTok Test Events, run a real test purchase, and confirm `value` and `currency` appear on the CompletePayment payload. 5. Backfill the same parameters on any matching server-side Events API call so client and server agree.',
    example: "ttq.track('CompletePayment', { value: 129.99, currency: 'USD', contents: [{ content_id: 'SKU-1', quantity: 1, price: 129.99 }] });",
    citationTemplate:
      'This TikTok Pixel fires CompletePayment events without the `value` or `currency` parameters required for value-based optimization. Per TikTok\'s standard events and parameters reference, CompletePayment must include `value` (numeric order total) and `currency` (ISO 4217) for revenue reporting and value-based bidding to function; events without these parameters degrade to count-only and treat every purchase as equivalent at auction. Reported ROAS for this account is therefore not derived from actual order value, and high-LTV shoppers receive no bidding priority. Fix: pass dynamic `value` and `currency` from the confirmed order total on every CompletePayment call, align the same parameters across client and server Events API hits, and verify in TikTok Test Events. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Events API overview', url: 'https://business-api.tiktok.com/portal/docs?id=1741601162187777' },
      { label: 'TikTok. Event Match Quality', url: 'https://ads.tiktok.com/help/article/event-match-quality' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-ecommerce-funnel'],
  },
  {
    id: 'tiktok-ecommerce-funnel',
    name: 'TikTok E-commerce Funnel Events',
    source: 'tiktok',
    severity: 'warning',
    summary: 'TikTok standard e-commerce funnel events are missing or incomplete.',
    directAnswer:
      'Your TikTok Pixel is firing CompletePayment but not the events that lead up to it. ViewContent, AddToCart, or InitiateCheckout are missing. TikTok can see the sale and nothing else, which kills retargeting and forces the bidder to learn from a single end-of-funnel signal.',
    why: 'TikTok\'s recommended e-commerce funnel is ViewContent, AddToCart, InitiateCheckout, CompletePayment. Each step builds a retargeting pool (cart abandoners, checkout abandoners) and feeds the optimizer enough mid-funnel signal to find lookalikes before purchase volume scales. When one of those steps is missing, three things break.\n\nRetargeting pools collapse. You cannot target "added to cart, did not buy" without an AddToCart event. You fall back to broad retargeting against pageview audiences, which performs worse and exhausts faster. Optimization gets brittle. With only CompletePayment as a signal, Smart Performance Campaigns at low daily volume cannot exit learning, because TikTok needs roughly 50 conversions in 7 days to stabilize. Mid-funnel events give the system something to chew on while purchase volume builds. Diagnosis goes blind. When a campaign underperforms, you cannot tell whether the drop is at product view, cart, or checkout. Every conversation with the client ends in "we need more data."\n\nThis is the failure mode where match quality scores look fine but campaigns never scale.',
    howToFix:
      '1. Map each real funnel step on the site to a TikTok standard event: product detail page to `ViewContent`, add-to-cart button to `AddToCart`, checkout start to `InitiateCheckout`, order confirmation to `CompletePayment`. Use the exact event names from TikTok\'s standard events reference. 2. Include `content_id` (your SKU), `content_type` (`product` for single, `product_group` for variant), `quantity`, `value`, and `currency` on every event that has them. The bidder uses these for content-level optimization. 3. If you also run Events API server-side, send matching events with the same `event_id` so client and server deduplicate cleanly. 4. Walk the full funnel in TikTok Test Events. Confirm every step lands with the right parameters. 5. Wait 24 hours, then check Events Manager event volumes match real site behavior (cart events should outnumber checkout events, which should outnumber payments).',
    example: 'Expected events: ViewContent -> AddToCart -> InitiateCheckout -> CompletePayment.',
    citationTemplate:
      'This TikTok Pixel is missing one or more standard e-commerce funnel events (ViewContent, AddToCart, InitiateCheckout, CompletePayment). Per TikTok\'s standard events and parameters reference, the full funnel is required for retargeting pool construction, Smart Performance Campaign exit from learning, and content-level optimization. With only end-of-funnel events firing, cart-abandoner and checkout-abandoner retargeting is impossible, low-volume campaigns cannot stabilize on a single conversion signal, and underperformance cannot be diagnosed at the funnel-step level. Fix: implement each standard event at its matching site action, include `content_id`, `quantity`, `value`, and `currency` where applicable, and verify the full path in TikTok Test Events before relying on campaign optimization. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. Event Match Quality', url: 'https://ads.tiktok.com/help/article/event-match-quality' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-completepayment-missing-value'],
  },
  {
    id: 'tiktok-custom-event-standard-alternative',
    name: 'TikTok Custom Event Has Standard Alternative',
    source: 'tiktok',
    severity: 'info',
    summary: 'Custom TikTok events are firing where a standard event would map cleanly.',
    directAnswer:
      'Your TikTok Pixel is firing custom events with names like `purchase_complete` or `cart_add` when a standard event (CompletePayment, AddToCart) covers the same action. Custom events still record, but they sit outside the optimization paths TikTok built around the standard event taxonomy.',
    why: 'TikTok organizes its bidding, audience building, and reporting around a defined list of standard events: ViewContent, ClickButton, Search, AddToWishlist, AddToCart, InitiateCheckout, AddPaymentInfo, PlaceAnOrder, CompletePayment, CompleteRegistration, Contact, Download, SubmitForm, and Subscribe. Each maps to recognized auction signals and prebuilt reporting columns.\n\nWhen a pixel ships custom names instead (`buy_now`, `paid_checkout`, `cart_added`), three things degrade. Smart Performance Campaigns cannot target a custom event as a high-intent conversion goal with the same confidence as a standard one, because the bidder has less cross-account benchmarking to lean on. Ecommerce reports in TikTok Ads Manager group by standard event, so custom events appear as separate one-off rows that nobody compares against benchmarks. And handoff suffers: a new agency reading the account has to map every custom name back to a real funnel step before they can audit performance.\n\nThe fix is rarely invasive. Most of these custom names were chosen because a developer was unaware that a standard equivalent existed.',
    howToFix:
      '1. Open TikTok Events Manager and list every event firing on the pixel. 2. For each custom event, find its standard equivalent in TikTok\'s standard events reference. `purchase`, `buy`, `paid`, `bought` map to CompletePayment. `cart` or `added_item` map to AddToCart. `signup` maps to CompleteRegistration. 3. Update the `ttq.track()` call (or its GTM tag) to use the standard name and the parameters TikTok expects for that event (`value`, `currency`, `content_id`, `quantity` where applicable). 4. Leave the old custom event firing in parallel for one reporting window so you can deduplicate against historical data, then retire it. 5. Confirm in TikTok Test Events that the standard event lands with the right parameters before launching new conversion-optimized campaigns.',
    citationTemplate:
      'This TikTok Pixel is firing custom-named events where a standard TikTok event would cover the same site action. Per TikTok\'s standard events and parameters reference, recognized standard events (CompletePayment, AddToCart, InitiateCheckout, CompleteRegistration, SubmitForm, Subscribe, and others) feed Smart Performance Campaign optimization, prebuilt ecommerce reporting columns, and cross-account benchmarks. Custom events still record but sit outside those paths, which weakens auction signals and forces every reviewer to translate the naming back to real funnel steps. Fix: replace custom names with the matching standard event in `ttq.track()`, pass the parameters TikTok expects for that event, and verify in TikTok Test Events before retiring the custom version. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-ecommerce-funnel'],
  },
  {
    id: 'tiktok-disabled-conversions',
    name: 'TikTok Disabled Conversion Events',
    source: 'tiktok',
    severity: 'warning',
    summary: 'Standard TikTok conversion events are marked disabled in Events Manager.',
    directAnswer:
      'One or more of your TikTok conversion events (CompletePayment, PlaceAnOrder, CompleteRegistration, Subscribe, AddToCart, InitiateCheckout) is sitting in Events Manager with a Disabled status. Disabled events do not feed bidding, do not build audiences, and do not show in conversion reports.',
    why: 'Events get disabled for two reasons that look identical in the export. Someone paused the event deliberately (a seasonal campaign ended, the conversion was retired, the team migrated to Events API). Or someone disabled it by accident in a Campaign Manager cleanup sweep and never re-enabled it. Both cases land in the same place: the event still exists, the pixel call may still fire, but TikTok will not score it.\n\nThe risk is not theoretical. If a CompletePayment event is disabled and the team launches a purchase-optimization campaign anyway, TikTok will accept the campaign and optimize toward the next-best signal it can find, often a broad ViewContent pool. Spend goes out, attributed conversions stay at zero in the disabled column, and the dashboard tells a story that does not match revenue.\n\nDisabled events also tangle audit trails. A reviewer who pulls Events Manager and sees CompletePayment listed assumes the account tracks purchases. The Disabled status is easy to miss in a quick scan. The fix is to either re-enable or formally retire each disabled conversion so the export reflects what the account actually measures.',
    howToFix:
      '1. Open TikTok Events Manager and filter events by status. Pull every event tagged Disabled. 2. For each disabled conversion, decide its fate. If it should be live, re-enable it and verify with a test fire in TikTok Test Events. If it is genuinely retired, delete it or rename it so audit exports do not show a misleading active-conversion list. 3. Confirm no active campaign is configured to optimize toward a disabled conversion. Campaign Manager will let you save that configuration silently, so check the campaign-level optimization goal explicitly. 4. If the event was disabled as part of a migration to Events API, confirm the server-side path is reporting volume before retiring the client-side counterpart. 5. Document why each disabled event was disabled so the next reviewer does not have to reconstruct the history.',
    citationTemplate:
      'This TikTok Pixel has one or more standard conversion events (CompletePayment, PlaceAnOrder, CompleteRegistration, Subscribe, AddToCart, InitiateCheckout) marked Disabled in Events Manager. Per TikTok\'s Pixel documentation, disabled events do not feed Smart Performance Campaign optimization, do not build retargeting audiences, and do not populate the conversion reporting columns; campaigns configured to optimize for a disabled conversion will still spend but fall back to weaker signals. The Disabled status is easy to overlook in account handoffs and produces audit exports that misrepresent which conversions the account actually measures. Fix: re-enable each conversion that should be live, retire or rename the events that are genuinely paused, and confirm no campaign is optimizing toward a disabled goal. Source: ads.tiktok.com/help/article/get-started-pixel.',
    references: [
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-missing-conversion-events', 'tiktok-zero-volume-events'],
  },
  {
    id: 'tiktok-duplicate-events',
    name: 'TikTok Duplicate Event Names',
    source: 'tiktok',
    severity: 'warning',
    summary: 'Two or more TikTok events share the same name and double-count conversions.',
    directAnswer:
      'Your TikTok Pixel has multiple events configured under the same name. Two `CompletePayment` entries, two `AddToCart` entries. When both fire on the same site action, TikTok counts the conversion twice. Reported volume is inflated and bidding optimizes on a phantom signal.',
    why: 'Duplicate events typically come from a migration that left old configurations in place. A team rebuilt their pixel through GTM and forgot to remove the hardcoded snippet. A new agency added a fresh CompletePayment event without checking whether one already existed. The pixel now has two paths to the same name, and both fire on the same `ttq.track()` invocation or two separate trigger sources hit the same action.\n\nThe damage shows up in three places. Reported conversions and revenue inflate, sometimes by 2x. Smart Performance Campaigns optimize against a signal that does not match reality, so cost-per-action targets get set on inflated denominators. And deduplication against Events API server-side hits breaks, because TikTok cannot reconcile two client events with one server event when both clients share an event name and trigger window.\n\nFor agencies inheriting an account, this is one of the quickest wins on the audit list. Volume reconciles immediately and reported ROAS realigns with the source-of-truth order system.',
    howToFix:
      '1. Open TikTok Events Manager and sort the event list by name. Identify every name that appears more than once. 2. For each duplicate, open both events and compare their trigger source, parameters, and recent fire timestamps. The one that ships from your current GTM container or current code path is the keeper. 3. Pause and delete the older or hardcoded duplicate. Do not just rename it; rename leaves the trigger live under a new label. 4. Walk a real test transaction. Confirm only one `CompletePayment` lands in TikTok Test Events. 5. Reconcile the next 24 hours of TikTok-reported conversions against your order system. The inflated multiplier should drop to roughly 1.0.',
    citationTemplate:
      'This TikTok Pixel has multiple events configured under the same name, which causes TikTok to count the same site action more than once. Per TikTok\'s Pixel setup documentation, each conversion should map to a single event configuration; duplicate names typically result from incomplete migrations between hardcoded snippets and GTM containers, or from a second team adding an event without auditing the existing setup. The downstream impact is inflated conversion and revenue volume in TikTok reporting, Smart Performance Campaigns optimizing on a phantom signal, and broken deduplication against Events API server-side hits. Fix: identify the keeper configuration for each duplicate name, pause and delete the redundant one, and reconcile TikTok reported volume against the source-of-truth order system in the following 24 hours. Source: ads.tiktok.com/help/article/get-started-pixel.',
    references: [
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. About Events API', url: 'https://ads.tiktok.com/help/article/about-events-api' },
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-similar-event-names', 'tiktok-event-concentration'],
  },
  {
    id: 'tiktok-event-concentration',
    name: 'TikTok Event Volume Concentration',
    source: 'tiktok',
    severity: 'info',
    summary: 'A single non-ViewContent event accounts for almost all TikTok Pixel volume.',
    directAnswer:
      'Your TikTok Pixel volume is concentrated in one event that is not ViewContent. Over 95% of all event fires belong to a single name (often AddToCart, ClickButton, or a custom event). The rest of the funnel is either missing or barely firing, which is a tracking gap, not a behavioral truth.',
    why: 'A healthy TikTok Pixel distribution looks like a funnel. ViewContent at the top with the largest volume, AddToCart and other mid-funnel events in the middle, CompletePayment at the bottom. When one non-ViewContent event swallows the whole pie, the usual explanation is not that customers skipped every other step. The explanation is that the other events were never wired.\n\nThis hurts in two ways. First, the bidder has only one signal to optimize against. Smart Performance Campaigns work best with funnel context, because mid-funnel events let TikTok learn faster on accounts with low purchase volume. With one dominant event, learning slows and the system leans hard on whatever proxy that event represents, even if it is a weak conversion indicator. Second, retargeting pools collapse to a single audience. You cannot build a cart-abandoner audience without an AddToCart event firing on the cart page. You cannot build a checkout-abandoner audience without InitiateCheckout. The single dominant event probably is not the right audience anchor for most campaigns.\n\nThe check tolerates ViewContent dominance because ViewContent legitimately fires on every page load. Any other event taking 95%+ of volume is a tracking shape problem.',
    howToFix:
      '1. Identify the dominant event in TikTok Events Manager. Confirm what site action triggers it. 2. Audit the rest of the funnel. If the account is ecommerce, walk the product page (ViewContent), add-to-cart button (AddToCart), checkout start (InitiateCheckout), and order confirmation (CompletePayment). If any of these does not fire in TikTok Test Events, that is your gap. 3. Implement the missing standard events with their expected parameters (`content_id`, `quantity`, `value`, `currency` where applicable). 4. Wait 24 hours and recheck volume distribution. A balanced funnel should show descending volume from ViewContent down to CompletePayment, not a single event holding the whole account. 5. If the dominant event is a custom event, also check whether it has a standard equivalent and consolidate.',
    citationTemplate:
      'This TikTok Pixel has over 95% of total event volume concentrated in a single non-ViewContent event. Per TikTok\'s Pixel guidance, a healthy ecommerce or lead-gen setup should produce a descending funnel of volume (ViewContent down to CompletePayment), and concentration in one mid- or bottom-funnel event usually indicates missing tracking on the rest of the funnel rather than real user behavior. The impact is that Smart Performance Campaigns have only one signal to learn from, retargeting pools collapse to one audience, and funnel-step diagnosis is impossible. Fix: walk the full site funnel in TikTok Test Events, implement the missing standard events with their expected parameters, and recheck the volume distribution after 24 hours of live traffic. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-ecommerce-funnel', 'tiktok-zero-volume-events'],
  },
  {
    id: 'tiktok-missing-conversion-events',
    name: 'TikTok Missing Conversion Events',
    source: 'tiktok',
    severity: 'critical',
    summary: 'No standard TikTok conversion event is active on this pixel.',
    directAnswer:
      'Your TikTok Pixel has no active conversion event. No CompletePayment, no PlaceAnOrder, no CompleteRegistration, no Subscribe, no SubmitForm. TikTok cannot optimize toward an outcome that is not configured, so any conversion-objective campaign on this account is optimizing against nothing.',
    why: 'TikTok Smart Performance Campaigns and standard conversion-objective campaigns need at least one event that represents a real business outcome to bid against. Per the TikTok standard events spec, that means one of CompletePayment (revenue), PlaceAnOrder (order placed pre-confirmation), CompleteRegistration (account created), Subscribe (newsletter or paid subscription), or SubmitForm (lead capture). Without one of these active, the campaign objective falls back to the loosest available signal, usually a click or a ViewContent.\n\nThe immediate effect is that pixel-attributed conversions in Campaign Manager show zero against any conversion-optimized campaign, while spend continues. The strategic effect is that you cannot build value-based bidding, lookalike audiences seeded on converters, or retention exclusion audiences, because none of those features have a converter event to anchor on. Event Match Quality is irrelevant here. EMQ measures identifier coverage on events that do exist. It cannot create a conversion event that was never configured.\n\nLead-gen and agency-managed accounts often hit this finding when a client passes over a pixel that was set up for retargeting only. Adding one standard conversion event usually unlocks the whole optimization stack.',
    howToFix:
      '1. Decide which standard conversion fits the business. Ecommerce: CompletePayment on the order confirmation page. Lead-gen: SubmitForm on form submit success, or CompleteRegistration if accounts are created. Subscription: Subscribe. SaaS: a combination of CompleteRegistration and CompletePayment for paid signups. 2. Implement the event via `ttq.track(\'CompletePayment\', { value, currency, contents })` or its GTM tag equivalent. Pass the parameters TikTok expects for that event. 3. Fire a real test transaction and confirm the event lands in TikTok Test Events with the right parameters. 4. If you run Events API server-side, send the same event with a matching `event_id` for deduplication. 5. Wait until at least 50 conversions accrue in a 7-day window before launching Smart Performance Campaigns against the new conversion goal.',
    citationTemplate:
      'This TikTok Pixel has no active standard conversion event (CompletePayment, PlaceAnOrder, CompleteRegistration, Subscribe, or SubmitForm). Per TikTok\'s standard events and parameters reference, conversion-objective and Smart Performance Campaigns require at least one configured conversion event to bid against; without one, the optimizer falls back to weak proxy signals like clicks or page views and the conversion column in Campaign Manager stays at zero. Value-based bidding, converter-seeded lookalikes, and retention exclusion audiences are also impossible without a converter event to anchor on. Fix: pick the standard conversion that matches the business model, implement it with the expected parameters on the matching site action, verify in TikTok Test Events, and let volume accrue before launching conversion-optimized campaigns. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. About Events API', url: 'https://ads.tiktok.com/help/article/about-events-api' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-completepayment-missing-value', 'tiktok-disabled-conversions'],
  },
  {
    id: 'tiktok-similar-event-names',
    name: 'TikTok Similar Event Names',
    source: 'tiktok',
    severity: 'info',
    summary: 'Two or more TikTok events have near-identical names that suggest typos or duplicates.',
    directAnswer:
      'Your TikTok Pixel has events with names so close that they are likely typos or accidental duplicates. `AddToCart` and `Add_To_Cart`. `CompletePayment` and `Complete_Payment`. The pixel treats them as two separate events. TikTok bidding and reporting do too, so volume splits between names that should be one.',
    why: 'TikTok event names are case-sensitive and whitespace-sensitive at the configuration level. `AddToCart` and `addtocart` are the same in many of TikTok\'s standard-event lookups, but `Add_To_Cart` is not, and `Add-To-Cart` is not either. When a pixel ships near-duplicate names, three things happen.\n\nVolume splits across the variants, so no single name accrues enough volume to clear the optimization learning threshold (~50 conversions / 7 days for Smart Performance Campaigns). Reporting fragments, so the cart-add column in TikTok Events Manager shows half the real volume and the other half hides under a misspelled twin. And retargeting audiences anchored on one name miss everyone whose session triggered the other name.\n\nThe pattern usually traces to a code branch (server-side passes `Complete_Payment`, client-side passes `CompletePayment`) or a CMS theme that renamed a hook without telling the GTM team. The fix is almost always cosmetic in code and meaningful in results.',
    howToFix:
      '1. Open TikTok Events Manager and review the similarity pairs AdLint flagged. Confirm whether each pair is two real events or one event with a typo on one side. 2. For each typo, identify the source of the misspelled fire (GTM tag, hardcoded snippet, server-side Events API call, app SDK) and update it to the canonical standard event name from TikTok\'s reference. 3. Run a real test action and confirm only the canonical name lands in TikTok Test Events. 4. Leave the misspelled event in place for one reporting window so historical data does not stranded, then delete it once new volume reconciles. 5. Document the canonical event name list in your tracking spec so future contributors do not re-introduce variants.',
    citationTemplate:
      'This TikTok Pixel has two or more events with near-identical names (separated only by case, whitespace, or punctuation), which TikTok treats as separate events. Per TikTok\'s standard events and parameters reference, event names must match the canonical spelling for the standard-event behavior to apply; near-duplicate variants split volume across names, slow Smart Performance Campaign learning, fragment reporting, and break retargeting audiences anchored on one spelling. The pattern typically comes from a mismatch between client-side and server-side code paths or from a CMS theme renaming a hook independently of the GTM container. Fix: identify the canonical spelling for each pair, update the misspelled source, verify in TikTok Test Events, and retire the variant after one reporting window. Source: ads.tiktok.com/help/article/standard-events-parameters.',
    references: [
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-duplicate-events', 'tiktok-custom-event-standard-alternative'],
  },
  {
    id: 'tiktok-zero-volume-events',
    name: 'TikTok Zero Volume Events',
    source: 'tiktok',
    severity: 'warning',
    summary: 'TikTok events are active but reporting zero volume across the audited window.',
    directAnswer:
      'Your TikTok Pixel has active events (status is not disabled) that are recording zero fires. The configuration exists, the event is enabled, but nothing is reaching TikTok. Usually this means a broken trigger, a renamed site element, or a consent gate that never resolves.',
    why: 'A zero-volume active event is worse than a disabled one in some ways. Disabled events at least announce their state. Zero-volume active events look healthy in a quick scan of Events Manager (green status, no warnings), but they contribute nothing to bidding, audiences, or reporting. A campaign optimizing toward one of them spends against a goal that the pixel will never report.\n\nThe usual root causes look like this. A GTM trigger references a button class that the site CSS renamed during a redesign, so the click event no longer matches. An Events API server-side call was wired in dev and never deployed to production. A consent management platform defaults to denied for marketing storage, and the event sits behind a consent check that never gets granted. Or the event was added speculatively (a future feature, a campaign that never launched) and was never wired to a real site action.\n\nThe risk during an audit handoff is that the zero-volume events make the Events Manager export look fuller than the pixel really is. A new agency reads "we have AddToCart, InitiateCheckout, CompletePayment" and assumes coverage. The pixel has those names. It does not have the data.',
    howToFix:
      '1. List every zero-volume active event in TikTok Events Manager. For each one, identify the trigger source (GTM tag, hardcoded snippet, server-side Events API, app SDK). 2. Load the page where the event is supposed to fire. Open DevTools, filter network for `analytics.tiktok.com`, and trigger the action. If no request leaves the browser, the trigger is broken. 3. Check your CMP. If marketing consent is required and defaults to denied, confirm the event fires after consent is granted. 4. If the event was speculative, delete it rather than leaving it active. A clean Events Manager export is more useful than a padded one. 5. Re-run the audit after 24 hours of live traffic. Events that should fire will report volume; events that should not will disappear from the active list.',
    citationTemplate:
      'This TikTok Pixel has one or more active events reporting zero fires across the audited window. Per TikTok\'s Pixel setup documentation, an active event should record volume within minutes of real site activity; sustained zero volume on an active event indicates a broken trigger, a consent gate that never resolves, an undeployed server-side call, or an event that was added speculatively and never wired. The risk is that Events Manager exports look fuller than the pixel actually is, leading new reviewers or inheriting agencies to assume coverage that does not exist, and any campaign optimized toward a zero-volume event spends against a goal the pixel will never report. Fix: validate the trigger for each zero-volume event, confirm consent gating, and either re-wire the trigger or delete the event so the export reflects real coverage. Source: ads.tiktok.com/help/article/get-started-pixel.',
    references: [
      { label: 'TikTok. Get started with TikTok Pixel', url: 'https://ads.tiktok.com/help/article/get-started-pixel' },
      { label: 'TikTok. Standard events and parameters', url: 'https://ads.tiktok.com/help/article/standard-events-parameters' },
      { label: 'TikTok. About Events API', url: 'https://ads.tiktok.com/help/article/about-events-api' },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['tiktok-base-events-active', 'tiktok-disabled-conversions', 'tiktok-event-concentration'],
  },
  {
    id: 'linkedin-other-category-overuse',
    name: 'LinkedIn Other Category Overuse',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Too many LinkedIn conversion actions are categorized as Other.',
    directAnswer:
      'Your LinkedIn account has a stack of conversion actions sitting under the Other category. Other is a valid choice, but when it becomes the default bucket it stops carrying information. A reviewer reading the export cannot tell which actions are leads, which are signups, and which are page views worth optimizing for.',
    why: 'LinkedIn Conversion Categories (Lead, Sign-Up, Purchase, Download, Key Page View, Add to Cart, and a handful of others) are how Campaign Manager understands what a conversion means. Picking the right one is not cosmetic. The category shapes how the action shows up in reporting groupings, how comparable it is across campaigns, and how an account stranger reads the structure during a handoff or audit.\n\nOther exists for the genuinely uncategorizable. The pattern AdLint flags is the opposite. Demo Request marked as Other. Whitepaper download marked as Other. Newsletter signup marked as Other. Every one of those has a closer standard category, and using it costs nothing.\n\nThe damage shows up in three places. Conversion reports group by category, so an Other-heavy account turns one column into a junk drawer. Account reviews take longer because nothing about the export tells you the funnel stage of each action. And the team that inherits the account next quarter has to open every action in Campaign Manager to figure out what it actually represents.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Sort or filter by category and pull out every action sitting under Other. 2. For each one, decide which standard Conversion Category fits. Lead for form submits and qualified inquiries. Sign-Up for account creation. Download for gated assets. Key Page View for high-intent pages you deliberately want to measure. Purchase for revenue. Add to Cart for ecommerce mid-funnel. 3. Edit the conversion action and update the category. The internal ID stays the same. Historical data is preserved. 4. Keep Other only when no standard category honestly applies. If you find yourself defending the Other choice with a long explanation, that is the sign it belongs somewhere else. 5. Re-run the audit. The finding should clear once the Other rate drops below the threshold.',
    example: 'Problem: Demo Request categorized as Other\nBetter: Demo Request categorized as Lead',
    citationTemplate:
      'This LinkedIn account has a disproportionate share of conversion actions filed under the Other category when standard Conversion Categories (Lead, Sign-Up, Download, Key Page View, Purchase) would apply. Per LinkedIn\'s conversion tracking documentation, the Conversion Category determines how an action is grouped in Campaign Manager reporting and how it is interpreted across the account. Overuse of Other degrades the legibility of the conversion structure, complicates handoffs, and makes category-grouped reports less useful. Fix: open each Other conversion in Campaign Manager and remap it to the closest standard category; reserve Other for actions that genuinely do not fit. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-disabled-key-conversions'],
  },
  {
    id: 'linkedin-unattached-conversions',
    name: 'LinkedIn Unattached Conversions',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Active LinkedIn conversion actions are not attached to any campaign.',
    directAnswer:
      'Your account has active LinkedIn conversion actions that no campaign is using. The Insight Tag fires, the action records, the export looks healthy. But because the conversion is not attached at the campaign level, none of your campaigns can report on it or optimize toward it. The data lands in the account and stops there.',
    why: 'This is a LinkedIn-specific shape that trips up teams coming from Google Ads or Meta. Creating a conversion action is one step. Attaching it to a campaign is a separate step. Both have to happen before the conversion contributes to campaign reporting or bidding signal. A conversion can be active at the Account Asset level and invisible at the campaign level at the same time.\n\nWhen that mismatch exists, three things follow. Campaign-level reports show fewer conversions than the account totals, and nobody can tell whether the gap is real performance or an attachment bug. Optimization toward those outcomes never engages, because LinkedIn only optimizes for conversions a campaign is configured to track. And during a quarterly review the unattached actions look healthy on the account page, which makes the underperformance on the campaign page harder to diagnose.\n\nThis check usually catches one of two things. A new conversion that was rolled out at the tag level but never wired into the campaigns that should use it. Or a legacy conversion that used to be attached, got detached during a campaign rebuild, and was forgotten.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Look at the Campaigns column for each flagged action. Empty means unattached. 2. Decide whether the action still matters. If yes, edit each campaign that should use it and add the conversion under Campaign Attachment. Lead, Sign-Up, Purchase, and high-intent Key Page View actions almost always belong on a campaign. 3. If the action is genuinely stale (a launch event, a retired form, an experiment that ended), disable it rather than leaving it active and detached. Disabled actions stop firing and stop cluttering the account inventory. 4. Run the audit again. Newly attached actions clear the finding; retired ones drop out of the active set.',
    example: 'Active conversion: Book Demo\nCampaign attachments: 0\nFix: attach Book Demo to the demand-gen campaigns that should optimize for it',
    citationTemplate:
      'This LinkedIn account has active conversion actions with zero campaign attachments. Per LinkedIn\'s conversion tracking documentation, a conversion action only contributes to campaign-level reporting and optimization when it is attached to a campaign; an active but unattached action records at the account level and is invisible everywhere else. The result is a quiet measurement gap: account totals look correct, campaign totals undercount, and optimization never engages with the outcome. Fix: attach each active, business-relevant conversion to the campaigns that should report on or optimize toward it, and disable any conversion that is no longer in use. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'LinkedIn. Install the LinkedIn Insight Tag',
        url: 'https://www.linkedin.com/help/lms/answer/a420536',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-no-active-conversions', 'linkedin-zero-volume-conversions'],
  },
  {
    id: 'linkedin-conversion-window-too-short',
    name: 'LinkedIn Conversion Window Too Short',
    source: 'linkedin',
    severity: 'warning',
    summary: 'LinkedIn conversion windows are shorter than 7 days.',
    directAnswer:
      'Your LinkedIn account has conversion actions running on Click conversion windows shorter than 7 days. On LinkedIn, where most traffic is B2B or considered-purchase, that window cuts off legitimate conversions before they happen. The Insight Tag still fires correctly. Campaign reporting just undercounts the click that started the deal.',
    why: 'LinkedIn conversion windows have two dials. The Click conversion window (how long after a click LinkedIn will credit a conversion) and the View-through conversion window (how long after an impression LinkedIn will credit a view-attributed conversion). Both default to options that are reasonable for fast-converting actions, but B2B audiences rarely fit that shape.\n\nHere is what a 3-day Click window does on a typical B2B funnel. Someone sees a sponsored post on Monday, clicks through, lands on a product page, and bounces. They come back on Thursday, read a case study, book a demo. LinkedIn does not credit the click, because Thursday is outside the 3-day window. The demo gets logged as direct or unattributed. The campaign reports zero conversions for that user even though the click is what started the path.\n\nMultiply that across a quarter and the campaign looks unprofitable. The team cuts budget. The actual click-to-conversion lag never gets examined, because the dashboard says the campaign does not work. The Insight Tag is correctly configured the entire time.\n\nThe fix is to set the window to match the real click-to-conversion delay distribution for the business, not the LinkedIn default.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Open each flagged conversion action. 2. Look at the Click conversion window setting. For B2B lead generation, SaaS, considered-purchase ecommerce, or anything with stakeholder review built into the journey, set this to 30 days post-click. LinkedIn supports 1, 7, 30, 60, and 90 day Click windows. 3. If you have historical conversion lag data (CRM timestamps minus first-click timestamps), target the 90th percentile of that distribution. 4. Keep short windows only for genuinely immediate actions: webinar registration during a live promotion, time-boxed signup offers. 5. Save. Existing data is not re-attributed retroactively, so annotate the date and wait one full sales cycle before judging the new baseline.',
    example: 'Problem: Demo Request uses a 3-day post-click window\nBetter: 30 days post-click for a medium B2B sales cycle',
    citationTemplate:
      'This LinkedIn account has conversion actions configured with Click conversion windows shorter than the realistic click-to-conversion delay for the business. Per LinkedIn\'s conversion tracking documentation, the Click conversion window determines the maximum gap between an ad click and a credited conversion; windows shorter than the actual lag distribution systematically undercount campaign performance and bias optimization away from working creative. Fix: set the Click conversion window to match the 90th percentile of historical click-to-conversion delay (typically 30 days for B2B lead generation), and re-baseline campaign performance after one full sales cycle. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-unattached-conversions'],
  },
  {
    id: 'linkedin-disabled-key-conversions',
    name: 'LinkedIn Disabled Key Conversions',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Key LinkedIn conversion actions (Lead, Sign-Up, Purchase) are disabled.',
    directAnswer:
      'Your account has Lead, Sign-Up, or Purchase conversion actions sitting in a disabled state. Those three categories are the exact outcomes most LinkedIn campaigns are built to optimize for. When they are turned off, the campaigns either default to weaker proxy events or run blind, and nobody on the team can tell from a glance whether the disablement was deliberate or forgotten.',
    why: 'LinkedIn lets you disable a conversion action without deleting it. That is useful when a launch ends, a form is retired, or a category gets restructured. The problem is that disabled actions still appear in the Account Asset list, still carry their Internal ID, and look almost identical to active ones until you read the status column carefully. Three months later, when a new manager picks up the account, the export shows a Lead conversion named "Book Demo" and they assume LinkedIn is recording demo requests. It is not. The Insight Tag would fire if the action were active, but a disabled action records nothing.\n\nThe second-order effect is on campaign attachment. A campaign can still reference a disabled conversion in its attachment list. Reporting against that campaign quietly drops to zero on the affected outcome, while the rest of the funnel looks normal. The team interprets the flat line as poor performance instead of a measurement gap.\n\nLead, Sign-Up, and Purchase are the categories where this hurts most because they are the categories LinkedIn campaigns most often optimize toward. A disabled Key Page View is mostly a reporting issue. A disabled Lead is an optimization issue.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Filter the list by status to surface disabled actions. 2. For each disabled Lead, Sign-Up, or Purchase action, decide whether it is retired or paused by accident. Retired stays disabled, paused-by-accident gets re-enabled. 3. If you re-enable an action, check its Campaign Attachment list. Confirm the campaigns that should optimize toward it are still attached. Re-enabling alone does not restore attachments that were cleared during the disabled period. 4. For genuinely retired actions, consider renaming them with a "[retired YYYY-MM]" prefix so future audits can tell intent from accident. 5. Walk the Insight Tag in your browser to confirm re-enabled actions fire on the live site before you trust campaign reporting again.',
    example: 'Disabled conversion: Book Demo (Lead)\nFix: re-enable in Campaign Manager and confirm campaign attachments are intact',
    citationTemplate:
      'This LinkedIn account has key Conversion Categories (Lead, Sign-Up, Purchase) in a disabled state. Per LinkedIn\'s conversion tracking documentation, disabled conversion actions stop recording entirely while remaining visible in the Account Asset list, which makes them easy to mistake for active actions during audits and handoffs. When a disabled action is also referenced by an active campaign attachment, the campaign reports zero for that outcome and the gap can be misread as poor performance rather than a measurement issue. Fix: review each disabled Lead, Sign-Up, and Purchase action, re-enable any that were paused by accident, confirm campaign attachments are intact after re-enabling, and rename genuinely retired actions so intent is unambiguous in future reviews. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'LinkedIn. Install the LinkedIn Insight Tag',
        url: 'https://www.linkedin.com/help/lms/answer/a420536',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-no-active-conversions'],
  },
  {
    id: 'linkedin-duplicate-conversions',
    name: 'LinkedIn Duplicate Conversion Names',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Multiple LinkedIn conversion actions share the same name.',
    directAnswer:
      'Your account has two or more conversion actions with the same name. The Insight Tag fires correctly. The reporting export does not. When two actions both labeled "Demo Request" appear in a campaign report, no reader can tell which one represents the real funnel and which one is the duplicate, and the campaign-level totals split between them in ways that are hard to reconcile.',
    why: 'LinkedIn does not enforce name uniqueness on conversion actions. Each action carries a distinct Internal ID, so the system always knows them apart, but the human-readable name is the only thing that shows up in most report views. When two actions share a name, three things go wrong.\n\nReporting becomes ambiguous. A campaign that attaches both will sum them in the campaign view, while a different campaign that attaches only one will report a smaller number, and the gap looks like a performance difference rather than a configuration artifact. Optimization splits. If campaigns are attached to different duplicates by accident, LinkedIn optimizes each campaign against a fraction of the real signal, slowing exit from learning. Handoffs break. The new account owner sees "Lead - Demo Request" twice in the asset list and cannot tell from the name which one is canonical, which means they either guess (and get it wrong half the time) or open both in Campaign Manager to compare configurations.\n\nDuplicates usually come from one of three places. A second tag rollout that did not check the existing inventory. A copy-and-edit workflow where someone duplicated an action to test a setting and forgot to rename. A migration where two team members ran the same setup in parallel.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Sort by name to make duplicates land next to each other. 2. For each duplicate pair, compare Conversion Category, Click conversion window, View-through conversion window, value rules, and Campaign Attachment list. Pick the action that more campaigns rely on as the canonical one. 3. Move every campaign attachment from the duplicate to the canonical action. Save each campaign. 4. Disable the duplicate rather than deleting it, so historical data stays accessible by Internal ID. Rename it with a "[dup of #####]" prefix so the relationship is obvious in future audits. 5. Re-run the audit. The finding clears once each name appears exactly once in the active set.',
    example: 'Active conversions:\n- Demo Request (Lead, attached to 4 campaigns)\n- Demo Request (Lead, attached to 1 campaign)\nFix: move the single attachment, disable and rename the second',
    citationTemplate:
      'This LinkedIn account has two or more conversion actions sharing the same name. Per LinkedIn\'s conversion tracking documentation, conversion actions are identified internally by Internal ID, but the human-readable name is what surfaces in campaign reports; duplicates produce ambiguous totals, split optimization signal when different campaigns attach to different duplicates, and make account handoffs error-prone. Fix: identify the canonical action for each duplicated name, move all campaign attachments to it, disable the duplicates rather than deleting them so historical data remains accessible, and rename retired duplicates so the relationship is obvious in future reviews. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-similar-conversion-names', 'linkedin-unattached-conversions'],
  },
  {
    id: 'linkedin-missing-key-conversions',
    name: 'LinkedIn Missing Key Conversions',
    source: 'linkedin',
    severity: 'critical',
    summary: 'No active LinkedIn conversion actions in Lead, Sign-Up, Purchase, or Download categories.',
    directAnswer:
      'Your LinkedIn account has active conversion actions, but none of them represent a real business outcome. There is no Lead, no Sign-Up, no Purchase, and no Download in the active set. The Insight Tag is working. It is just measuring page views and side events instead of the things campaigns should optimize for.',
    why: 'LinkedIn campaigns optimize against the conversion actions you attach to them. The categories that map to revenue or pipeline are Lead (form submits, qualified inquiries), Sign-Up (account creation, free trial start), Purchase (paid orders), and Download (gated assets like whitepapers or pricing PDFs). When none of those exist in the active inventory, the system has nothing to bid toward except whatever else is configured (often Key Page View or Other). The campaigns still run, they still spend, and they still report numbers, but the numbers describe upstream engagement rather than the outcomes the business actually cares about.\n\nThis pattern almost always comes from one of two places. The account was set up before the funnel was wired (Insight Tag installed, conversions deferred to a "later" that never came), or the original key conversions were disabled during a rebuild and replacements were never created. In both cases the dashboard looks populated, which is why the issue survives review.\n\nThe practical cost is that LinkedIn cannot help you find buyers. Optimization toward a Key Page View teaches the model to find page viewers. Optimization toward a Lead teaches it to find people who fill out forms. Those are not the same audience, and the difference shows up as a flat lead pipeline next to a healthy traffic graph.',
    howToFix:
      '1. Decide which Conversion Category represents the primary outcome for the account. Lead for most B2B demand gen. Sign-Up for product-led SaaS. Purchase for ecommerce. Download for content-driven funnels. 2. Open Campaign Manager. Account Assets. Conversions. Click Create Conversion. Pick the category, give it an unambiguous name, and configure the trigger (a thank-you URL, an event tag, or a CAPI event from Microsoft Learn\'s Insight Tag reference). 3. Set a Click conversion window that matches the real lag in the funnel (typically 30 days for B2B). 4. Attach the new conversion to every campaign that should optimize toward it under Campaign Attachment. 5. Confirm the action fires by completing a test conversion on the live site and watching Campaign Manager record it within an hour. Only then promote it as the primary signal.',
    example: 'Current active conversions: Key Page View, Other\nFix: create Lead - Demo Request and attach to demand-gen campaigns',
    citationTemplate:
      'This LinkedIn account has zero active conversion actions in the Lead, Sign-Up, Purchase, or Download Conversion Categories. Per LinkedIn\'s conversion tracking documentation, campaigns optimize against the conversion actions attached to them; without a key business-outcome conversion in the active set, optimization defaults to upstream proxies like Key Page View or Other, and campaign performance describes engagement rather than pipeline or revenue. Fix: create at least one Lead, Sign-Up, Purchase, or Download conversion that maps to the primary business outcome, attach it to every campaign that should optimize toward it, set the Click conversion window to match the realistic click-to-conversion lag, and verify with a live test conversion before relying on the data. Source: linkedin.com/help/lms/answer/a425683.',
    references: [
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-no-active-conversions', 'linkedin-disabled-key-conversions'],
  },
  {
    id: 'linkedin-no-active-conversions',
    name: 'LinkedIn No Active Conversions',
    source: 'linkedin',
    severity: 'critical',
    summary: 'No active LinkedIn conversion actions with recorded volume.',
    directAnswer:
      'Your LinkedIn account has no active conversion action recording any volume. Either the Insight Tag is not installed, the conversion actions are configured but their triggers do not match the live site, or every active action is genuinely receiving zero traffic. In all three cases, campaigns cannot optimize and reporting cannot describe outcomes.',
    why: 'A LinkedIn account in this state is running unmeasured. There are a handful of configurations that land here, and each has a different fix path.\n\nThe most common cause on new accounts is that the Insight Tag was never installed. Campaign Manager still lets you create conversion actions, but no events fire because no tag is present to fire them. Microsoft Learn\'s Insight Tag reference documents the install footprint (a single script tag in the site header, or a Tag Manager template), and you can verify it from the browser console by inspecting requests to px.ads.linkedin.com.\n\nThe second pattern is when the tag is present but the conversion actions are misconfigured. A URL-based trigger that doesn\'t match the live thank-you page. An Event-Specific Pixel using a different conversion ID than the one in the tag. A CAPI event that fires server-side but isn\'t linked to the conversion in Campaign Manager. The Insight Tag fires on the site, the actions stay at zero because nothing matches.\n\nThe third case is when everything is wired correctly and traffic is genuinely zero — new campaigns that haven\'t started, paused accounts, regional accounts during off-season. Rare, but don\'t conflate it with the first two.\n\nThe symptom is the same in all three: campaigns run, dashboards populate with impressions and clicks, and the conversions column is permanently empty.',
    howToFix:
      '1. Confirm the Insight Tag is present. Open the live site in a browser, open the network tab, filter for px.ads.linkedin.com, and reload. A request should appear on every page load. If not, install the tag from Campaign Manager, Account Assets, Insight Tag, following the Install the LinkedIn Insight Tag help article. 2. If the tag is present, open each active conversion action and check its trigger. URL-based actions need a URL match that exists on the live site. Event-Specific actions need their event to actually fire in the page DOM. CAPI actions need a configured server endpoint sending events. 3. Trigger a real conversion end-to-end (submit the form, hit the thank-you page, complete the purchase) and watch Campaign Manager for recorded volume within an hour. 4. If nothing records, the issue is the trigger, not the tag. Compare the conversion action\'s configured trigger byte-for-byte against what the site actually does. 5. Only after at least one action records non-zero volume should you trust any LinkedIn reporting from this account.',
    example: 'Insight Tag installed: yes\nActive conversions: 4\nConversions with volume in last 30 days: 0\nFix: walk each action\'s trigger against the live site and reconcile',
    citationTemplate:
      'This LinkedIn account has zero active conversion actions recording any volume. Per LinkedIn\'s Install the LinkedIn Insight Tag documentation and the Microsoft Learn Insight Tag reference, recorded volume requires the Insight Tag to be present on the site, conversion action triggers to match real site events, and at least one campaign or organic visit to satisfy those triggers; failure of any of these three steps produces the same empty-conversions symptom. Fix: verify the Insight Tag fires on the live site, walk each active conversion action\'s trigger against the actual page or event it should match, complete an end-to-end test conversion, and confirm Campaign Manager records the test before relying on campaign reporting. Source: linkedin.com/help/lms/answer/a420536.',
    references: [
      {
        label: 'LinkedIn. Install the LinkedIn Insight Tag',
        url: 'https://www.linkedin.com/help/lms/answer/a420536',
      },
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-zero-volume-conversions'],
  },
  {
    id: 'linkedin-purchase-missing-value',
    name: 'LinkedIn Purchase Missing Value',
    source: 'linkedin',
    severity: 'critical',
    summary: 'LinkedIn Purchase conversion actions are recording without value data.',
    directAnswer:
      'Your LinkedIn Purchase conversion actions are firing without value or currency attached. The conversion records, the count goes up, the dashboard shows orders. The revenue column is empty. LinkedIn can\'t tell whether a campaign drove a $50 trial signup or a $50,000 annual contract, and any ROAS figure derived from this account is fiction.',
    why: 'Purchase is the only Conversion Category in LinkedIn whose value passes carry economic meaning. When a Purchase action is configured without a value rule, or when the trigger fires but the page doesn\'t expose order-total data to the Insight Tag, every recorded purchase lands at value=0 and currency=unset. The count is right. The economics are gone.\n\nReporting shows zero revenue against campaigns that are actually generating revenue, which makes the best-performing line in the account look unprofitable. Optimization can\'t weigh outcomes by value, so a campaign that produces ten small orders looks identical to one that produces one large order, and bidding stops favoring the high-value buyers. Cross-channel analysis fails too — anyone trying to reconcile LinkedIn revenue against the CRM finds a zero where every other channel reports a real number.\n\nThe usual mechanical cause is that the conversion was set up with a static value rule (or no value rule) instead of a dynamic value pulled from the order. Static values record the same dollar amount for every purchase, which is almost always wrong. No value rule records zero, which is always wrong on Purchase.\n\nMicrosoft Learn\'s Insight Tag reference documents the dynamic value pattern. The site fires a JavaScript event on the order-confirmation page containing the real order total and currency, and the conversion action reads those values into LinkedIn.',
    howToFix:
      '1. Open the order-confirmation page in your site. Confirm the page exposes the order total and currency in a place a tag can read (a data layer object, a hidden DOM element, or a URL parameter). 2. Open Campaign Manager. Account Assets. Conversions. Open the Purchase conversion. Edit the value rule. Choose "Value defined by sender" or the equivalent dynamic option per the Add a conversion tracking event help article. 3. Update the Insight Tag implementation (or the Event-Specific Pixel) to pass `value` and `currency` parameters from the page on every Purchase fire. Currency must be a 3-letter ISO code. Value must be a number. 4. Complete a test purchase. Watch Campaign Manager for the recorded conversion. Inspect it and confirm both `value` and `currency` arrived. 5. Reconcile the next 7 days of LinkedIn Purchase revenue against CRM revenue. The numbers should agree within attribution-window slack. If they do not, the dynamic value is still not flowing.',
    example: 'Purchase conversion: Checkout Complete\nValue recorded per event: 0\nFix: pass dynamic value and currency from the order-confirmation page',
    citationTemplate:
      'This LinkedIn account has Purchase conversion actions recording without value or currency data. Per LinkedIn\'s Add a conversion tracking event documentation and the Microsoft Learn Insight Tag reference, Purchase actions support dynamic value rules that read the real order total and currency from the confirmation page; without them, every purchase records at value=0 and any revenue or ROAS figure derived from the account is non-meaningful, optimization cannot weigh outcomes by value, and cross-channel reconciliation against the CRM fails. Fix: configure each Purchase action with a dynamic value rule, update the Insight Tag or Event-Specific Pixel to pass `value` and `currency` from the order-confirmation page, complete a test purchase, and reconcile LinkedIn Purchase revenue against CRM revenue before trusting reporting. Source: linkedin.com/help/lms/answer/a425683.',
    references: [
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-missing-key-conversions', 'linkedin-zero-volume-conversions'],
  },
  {
    id: 'linkedin-similar-conversion-names',
    name: 'LinkedIn Similar Conversion Names',
    source: 'linkedin',
    severity: 'info',
    summary: 'LinkedIn conversion actions have nearly identical names.',
    directAnswer:
      'Your account has conversion actions whose names differ by a character or a space. "Demo Request" and "Demo  Request" with two spaces. "Whitepaper Download" and "White paper Download". Each pair has its own Internal ID, so LinkedIn treats them as separate actions, but a human reading the export cannot tell them apart and almost certainly meant for them to be one thing.',
    why: 'This is the soft version of the duplicate-conversion problem. Exact duplicates are easy to spot because the names match. Near-duplicates hide. They survive name-sort reviews because the strings differ. They survive eyeball checks because the eye treats "Whitepaper" and "White paper" as the same word. They cause the same downstream pain as exact duplicates (split attachments, ambiguous reporting, broken handoffs) and they accumulate faster because nobody notices.\n\nThe usual origins are predictable. A typo during initial setup that nobody caught. A copy-paste from a slide deck that introduced a non-breaking space. A second team member who created their own version of an action because they could not find the existing one in a long list. A migration from another platform that produced a renamed version of an action that already existed.\n\nThe severity is lower than exact duplicates because the audit can only flag the suspicion, not confirm the intent. Some near-duplicates are intentional (a "Demo Request" Lead and a "Demo Requested" Sign-Up that measure different funnel stages). Others are accidents. The check\'s job is to surface the pair and let you decide.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. For each flagged pair, open both actions and compare Conversion Category, Click conversion window, View-through conversion window, value rules, and Campaign Attachment list. 2. If the configurations are identical or near-identical, the pair is an accidental near-duplicate. Pick the canonical one (usually the one with more campaign attachments), migrate attachments off the other, and disable the other with a "[near-dup of #####]" rename. 3. If the configurations are genuinely different and the pair represents two separate funnel stages, rename them to be unambiguously distinct. "Demo Request (form submit)" and "Demo Request (qualified)" reads better than "Demo Request" and "Demo Requested". 4. Add a naming convention note to the account documentation so the next person who creates an action follows the same pattern. 5. Re-run the audit. Intentional pairs with clarified names will no longer trip the similarity threshold.',
    example: 'Pair flagged:\n- "Demo Request"\n- "Demo  Request" (two spaces)\nLikely accidental; consolidate to one action',
    citationTemplate:
      'This LinkedIn account has conversion actions with near-identical names that differ only by whitespace, casing, or single-character variations. Per LinkedIn\'s conversion tracking documentation, conversion actions are identified by Internal ID rather than name, so near-duplicates coexist in the active inventory without any system-level warning; the practical effects mirror exact duplicates (split campaign attachments, ambiguous reporting, error-prone handoffs) and accumulate faster because the naming difference defeats sort-based review. Fix: open each flagged pair, compare configurations, consolidate accidental near-duplicates by migrating attachments to the canonical action and disabling the other with a rename that marks the relationship, and rename intentional pairs to be unambiguously distinct in reports. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'Microsoft Learn. LinkedIn Insight Tag',
        url: 'https://learn.microsoft.com/en-us/linkedin/marketing/insight-tag/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-duplicate-conversions', 'linkedin-unattached-conversions'],
  },
  {
    id: 'linkedin-zero-volume-conversions',
    name: 'LinkedIn Zero Volume Conversions',
    source: 'linkedin',
    severity: 'warning',
    summary: 'Active LinkedIn conversion actions are recording zero conversions.',
    directAnswer:
      'Your account has active conversion actions that have recorded zero conversions over the reporting window. The actions are switched on. The Insight Tag is installed. Something between the trigger configuration and the live site is not connecting, or the campaign attached to the action is not driving the audience that would convert on it.',
    why: 'A zero-volume active conversion is a quiet failure. It does not throw an error. It does not show up red in Campaign Manager. It just sits in the asset list looking healthy until somebody compares the conversion count against expected funnel volume and realizes the gap.\n\nThree patterns produce this finding. The trigger does not match the live site. A URL-based action looking for "/thank-you" when the live site uses "/thanks". An Event-Specific Pixel waiting on a `submit_lead` event that the form actually fires as `submitLead`. A CAPI event configured but never wired up to a server endpoint that sends. In every case the action is technically active and technically waiting to record, but the world is not sending the signal it is listening for.\n\nThe campaign attachment is empty or wrong. The action is attached to a paused campaign, an unfunded campaign, or no campaign at all, so the audience that would produce conversions never arrives at the trigger. This case overlaps with the unattached-conversions check, but it can also occur when the attachment exists and the campaign is genuinely not converting.\n\nThe action is new and the reporting window is too short. A conversion created yesterday on a B2B funnel may legitimately show zero for a week. This is the only innocent case, and it resolves itself.',
    howToFix:
      '1. Open Campaign Manager. Account Assets. Conversions. Sort by recorded volume. Open each zero-volume action. 2. Check the trigger. URL-based: confirm the URL pattern matches the live thank-you page byte-for-byte (paths, casing, trailing slashes). Event-Specific: confirm the event name and Conversion ID the page fires match what the action expects, via browser console. CAPI: confirm a server endpoint is configured and sending. 3. Check Campaign Attachment. If empty, attach the action to the campaigns that should drive it. If populated, confirm those campaigns are funded and running. 4. Complete a manual end-to-end conversion through the funnel. Wait one hour. Check Campaign Manager for the recorded conversion. If it does not appear, the trigger is wrong, not the campaign. 5. For actions less than 7 days old on slow funnels, document the creation date and defer judgment until a full sales cycle has passed.',
    example: 'Active conversion: Demo Request\nRecorded volume (30 days): 0\nFix: walk the trigger against the live thank-you URL and complete a test submission',
    citationTemplate:
      'This LinkedIn account has active conversion actions that recorded zero conversions over the reporting window. Per LinkedIn\'s conversion tracking documentation, an active action with zero volume typically indicates a trigger mismatch (URL pattern, event name, or CAPI endpoint not aligned with the live site), an attachment problem (the action is not driving any funded campaign), or a recently created action whose first conversion has not yet landed. Fix: open each zero-volume action, walk its trigger against the live site, verify Campaign Attachment is populated with funded running campaigns, complete a manual end-to-end conversion and confirm it records within an hour, and defer judgment only for actions less than a full sales cycle old. Source: linkedin.com/help/lms/answer/a425606.',
    references: [
      {
        label: 'LinkedIn. Conversion tracking overview',
        url: 'https://www.linkedin.com/help/lms/answer/a425606',
      },
      {
        label: 'LinkedIn. Add a conversion tracking event',
        url: 'https://www.linkedin.com/help/lms/answer/a425683',
      },
      {
        label: 'LinkedIn. Install the LinkedIn Insight Tag',
        url: 'https://www.linkedin.com/help/lms/answer/a420536',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['linkedin-no-active-conversions', 'linkedin-unattached-conversions'],
  },
  {
    id: 'conversion-linker-sequencing',
    name: 'Conversion Linker Sequencing',
    source: 'gtm',
    severity: 'critical',
    summary: 'Google Ads conversion tags are not explicitly sequenced to wait for the Conversion Linker tag.',
    directAnswer:
      'You have a Conversion Linker in the container. Good. But it isn\'t declared as a setup tag for your Google Ads conversion tags. On a fast page load the linker happens to fire first and everything works. On a slow load, a redirect-heavy checkout, or a consent banner mid-page, the order flips. The conversion tag fires before the GCLID has been written to `_gcl_aw`, and that conversion ships without click context. The dashboards still look fine.',
    why: 'Adding the Conversion Linker tag is necessary. It isn\'t sufficient. GTM doesn\'t guarantee any ordering between two tags that share the same trigger. Whichever one finishes its setup first, fires first. That depends on resource loading, consent state, redirects, third-party script injection, and a dozen other things you can\'t predict from inside Preview mode.\n\nHere\'s the failure mode. The Conversion Linker reads `gclid` from the URL and writes it to a first-party cookie called `_gcl_aw`. The Google Ads conversion tag, when it fires, reads `_gcl_aw` and sends whatever it finds along with the conversion request. If the conversion tag wins the race, `_gcl_aw` is empty, and the conversion is reported without a GCLID. Google still counts it. It just has no idea which campaign drove it.\n\nThe maddening part is that the failure is intermittent. In Preview mode on a fast dev machine the linker always wins. In production — on a slow connection, behind a privacy proxy, or when the user clicks through a consent banner that triggered a tag reload — the conversion tag occasionally wins. Some users get attribution. Some don\'t. The dashboard averages out to "mostly working" until somebody runs an audit like this one.\n\nGTM has a feature designed exactly for this: Tag Sequencing. You declare that Tag B requires Tag A to fire first, and GTM honors the declaration on every fire regardless of timing. The fix is to mark the Conversion Linker as a setup tag for every Google Ads conversion tag.',
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
      'Your conversion actions are reporting values in more than one currency. USD, EUR, sometimes blank. Google Ads doesn\'t normalise across currencies for bidding — Smart Bidding sums €100 and $100 as 200, and your aggregate ROAS column is meaningless until you fix this.',
    why: 'Google Ads supports per-conversion currency codes. It assumes the team configures them consistently. When that assumption breaks, two problems compound.\n\nValue-based bidding compares conversion values directly, without exchange-rate normalisation. A Target ROAS strategy that sees €100 and $100 treats them as economically equivalent. They aren\'t. Depending on the day, €100 is anywhere from $105 to $115. The optimisation signal is corrupted by exactly the exchange-rate noise the team assumed Google was handling. Aggregate reports also stop reconciling: the "conversion value" total in Google Ads is a sum of mixed currencies, so it won\'t match any single number in the e-commerce backend.\n\nThe mixed-currency state usually shows up in one of three places. Multi-region e-commerce that pushes the local currency without normalising before it hits dataLayer. GTM containers where the Currency Code field is hardcoded to USD but the actual transaction value is in EUR or GBP, so the value matches the customer\'s purchase but the currency lies. And Google Ads conversion imports where the Currency column was left blank or filled differently across upload sessions.\n\nUntil this is fixed, every Target ROAS decision and every cross-region comparison runs on suspect numbers.',
    howToFix:
      '1. Decide the account-level reporting currency. Usually this is the company\'s functional currency, not the customer\'s. 2. For GTM-managed conversions, open the Google Ads Conversion Tracking tag. Set Currency Code to a Data Layer Variable that resolves to the right ISO code, typically `{{DLV - ecommerce.currency}}`. Do not hardcode it. 3. For multi-region sites, pick one of two approaches and document it. Either (a) pass the local currency consistently and let Google Ads convert at the daily exchange rate, or (b) normalise to the reporting currency on the site before pushing to dataLayer. Both are valid. Mixing them is not. 4. For Google Ads conversion imports, standardise the Currency column on every upload. An empty Currency column means Google falls back to the account default, which can be different from what the import data was actually in. 5. Run a test conversion. Verify in Google Ads → Conversions that the Currency column shows the expected ISO code.',
    example: 'Expected currency code: USD\nGTM Currency Code field: {{DLV - ecommerce.currency}}\ndataLayer value: ecommerce.currency = "USD"',
    citationTemplate:
      'This account has Google Ads conversion actions reporting values in more than one currency code. Per Google\'s conversion-value documentation, value-based bidding and aggregate reporting assume consistent currency within each conversion action. Mixed currencies are summed without exchange-rate normalisation, so Target ROAS optimisation is corrupted and aggregate totals do not reconcile against backend revenue. Fix: standardise on the account reporting currency or pass per-conversion currency consistently from the site, and verify in Google Ads reports. Source: support.google.com/google-ads/answer/2998565.',
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
    directAnswer:
      'Google Ads matches conversion tags by conversion ID and label, not by friendly name, so a naming mismatch between GTM tag names and Google Ads action names does not break tracking on its own. It does make the setup hard to audit. A reviewer cannot tell at a glance which Ads action receives each tag hit, which increases the chance of editing the wrong tag, leaving renamed actions live, or missing duplicates during cleanup.',
    why: 'Google Ads matching is controlled by conversion ID and label, not by the friendly name, so a naming mismatch does not automatically break tracking. It does make the setup harder to audit because the person reviewing GTM cannot confidently tell which Google Ads action receives each tag hit. That increases the chance of editing the wrong tag, leaving renamed actions active, or missing duplicates during a cleanup. Clear naming is especially important when agencies hand off accounts or when multiple conversion actions share the same category.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions and copy the exact active conversion action names that should be tracked from GTM. In Google Tag Manager, open Workspace -> Tags and rename each Google Ads Conversion Tracking tag so the business action, source, and Ads action name are recognizable. Do not change conversion IDs or labels during the naming cleanup unless you are intentionally remapping the tag. Preview one conversion and compare the GTM tag name, send_to value, and Google Ads action name before publishing.',
    example: 'Google Ads action: Purchase - Website\nGTM tag name: Google Ads - Purchase - Website\nsend_to: AW-123456789/AbCdEfGhIjk',
    citationTemplate:
      'This GTM container contains Google Ads Conversion Tracking tags whose names do not clearly correspond to the active Google Ads conversion action names. Per Google Tag Manager and Google Ads documentation, tag-to-action matching is controlled by conversion ID and label rather than friendly name, so this is an auditability issue rather than a tracking break: it raises the cost of every future review, handoff, and cleanup, and increases the risk of editing the wrong tag or missing a duplicate. Fix: rename each Google Ads Conversion Tracking tag in GTM so the business action, source, and matching Ads action are recognisable in the tag list, leave conversion IDs and labels untouched during the naming cleanup, and verify in Tag Assistant Preview that the send_to value still routes to the intended Ads action before publishing. Source: support.google.com/tagmanager/answer/6105160.',
    references: [
      {
        label: 'Google Tag Manager. Google Ads Conversion Tracking tag',
        url: 'https://support.google.com/tagmanager/answer/6105160',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
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
      'Enhanced Conversions is turned on for one of your conversion tags. The user-data fields are empty. So the feature is on in name only. Google Ads receives the conversion but none of the hashed identifier that makes Enhanced Conversions worth turning on in the first place. Match rate sits at zero. The team probably thinks the feature doesn\'t work.',
    why: 'Enhanced Conversions is the highest-leverage measurement feature Google Ads has shipped since GDPR started shrinking attribution. The mechanic: when a user completes a conversion, GTM grabs their email (or phone, name, address) from the conversion page, hashes it with SHA-256, and sends it to Google Ads alongside the conversion. Google looks at signed-in users who clicked an ad. If the hashed identifier matches, attribution is restored, even when the third-party cookie was blocked.\n\nIt works. When configured. The whole mechanism falls apart if user data is missing at conversion time.\n\nThe failure mode looks like this: the tag has Enhanced Conversions turned on, but the user-data parameter is either unmapped, mapped to a Data Layer Variable that resolves to empty, or pointed at a dataLayer field the conversion page never pushes. The tag fires. Google records the conversion. The hashed identifier is missing. Google has nothing to match against. The Diagnostics panel in Google Ads shows a 0% match rate.\n\nWhen teams see 0% they almost always blame the feature, not the implementation. That gets the diagnosis backwards. The feature works. Yours isn\'t feeding it data.',
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
      'You have Google Ads conversion tags wired to click or form-submit triggers, with no "Wait for Tags" setting and no event callback. When a user clicks Submit, the browser starts navigating to the next page immediately. The conversion request often doesn\'t finish before navigation kills it. That conversion is gone, and you\'ll never know it happened.',
    why: 'Conversion tags on click and form-submit triggers are in a race with the browser. The user clicks the button. The form posts. The browser starts navigating. Meanwhile, the conversion tag is opening a connection to googleads.g.doubleclick.net and trying to send the conversion. Whoever finishes first wins.\n\nOn a fast desktop with a fast connection, the conversion request takes maybe 50ms. The browser doesn\'t start navigating for around 200ms after the form submit (network round-trips, redirects, etc.). The conversion almost always makes it. So everything looks fine in QA, on the dev machine, in Preview mode.\n\nOn a phone over a flaky 4G connection, the conversion request can take 1500ms. The browser starts navigating at 300ms because the form post completed faster than usual. The conversion request is mid-flight when navigation kills it. The conversion never arrives at Google Ads.\n\nThe result is a slow, invisible data loss that scales inversely with device speed. Fast devices report most of their conversions. Slow devices lose a chunk of them. Reported conversion data ends up biased toward fast-device demographics. Smart Bidding learns from biased data and shifts budget toward audiences whose conversions tend to make it through — which isn\'t the same as audiences who actually convert.\n\nGoogle gives you a few ways to fix this. Tag Sequencing with a setup tag that waits. An `eventCallback` parameter that delays the navigation until the tag completes. Or the trigger\'s built-in "Wait for Tags" option, which is the simplest and works for most cases.',
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
    directAnswer:
      'Your enabled Google Ads conversion actions cover only one or two stages of the user funnel. When the entire conversion setup tracks just a single end-stage outcome (typically Purchase or Lead), teams lose visibility into whether media is generating qualified visits, product interest, checkout progress, or repeat value. For lower-volume accounts this also makes Smart Bidding brittle: it sees only sparse macro outcomes and no diagnostic signal in between.',
    why: 'Google Ads conversion measurement is meant to track valuable actions such as purchases, sign-ups, and other customer activity after ad interactions. When only one end-stage action is tracked, teams lose visibility into whether media is generating qualified visits, product interest, checkout progress, leads, purchases, or repeat value. That can make optimization brittle for lower-volume accounts because Smart Bidding and analysts see only sparse macro outcomes. The goal is not to count every click as a conversion, but to maintain a defensible funnel map with Primary macro actions and Secondary diagnostic actions.',
    howToFix: 'In Google Ads, open Tools & Settings -> Measurement -> Conversions and list the enabled actions by funnel stage. Add or repair missing diagnostic actions for important stages, then set only the true business outcome as Primary and keep supporting micro-conversions Secondary unless they are intentionally used for bidding. In GTM, open Workspace -> Tags and verify each website-based action has a matching trigger on the real page or event, not only a button click that can fail validation. Re-run the full audit with both GTM and Google Ads exports to confirm no more than one major stage is missing.',
    example: 'Primary: Purchase or Qualified Lead\nSecondary: Landing Page Visit, Product View, Add to Cart, Begin Checkout, Repeat Purchase',
    citationTemplate:
      'This Google Ads account does not have enabled conversion actions covering enough stages of the user funnel (landing visit, product view, add to cart or begin checkout, lead or purchase, repeat purchase). Per Google Ads conversion goals documentation, the recommended structure is one Primary macro action per business outcome (Purchase or Qualified Lead) backed by Secondary diagnostic actions across the rest of the funnel. The funnel map gives analysts and Smart Bidding visibility between the campaign click and the macro outcome, which is especially important for lower-volume accounts where the macro action alone is too sparse for reliable optimisation. Fix: list enabled actions by funnel stage in Tools & Settings → Measurement → Conversions, add or repair missing diagnostic actions, mark only the true business outcome as Primary and the rest Secondary, and verify in GTM that each website-based action has a working trigger on the real page or event before re-running the audit. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. Primary and secondary actions',
        url: 'https://support.google.com/google-ads/answer/10812308',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['micro-conversion-pollution', 'missing-primary-conversion', 'conversion-naming-alignment'],
  },
  {
    id: 'conversion-callbacks',
    name: 'Conversion Callback Implementation',
    source: 'cross',
    severity: 'critical',
    summary: 'Google Ads conversion tags fire on navigations or form submits without event callbacks or sequencing.',
    directAnswer:
      'One or more Google Ads conversion tags in your GTM container fire on a form submit or link click trigger, then let the page redirect immediately. There is no `eventCallback`, no `event_callback`, and no tag sequencing. The browser tears down the request before the hit reaches Google. Your Google Ads conversion action records nothing for those users, and Smart Bidding never learns from them.',
    why: 'A Google Ads conversion tag is an outbound HTTPS request. It needs roughly 200 to 800 milliseconds to leave the browser. On a confirmation pageview that lifetime is fine. On a form submit or an outbound link click, the browser starts navigating before the tag finishes, kills in-flight requests, and the conversion is lost.\n\nThe fix is a callback or a sequence. With `eventCallback`, the form submit trigger waits for the tag to confirm the hit went out before letting navigation proceed. With tag sequencing (setupTag and cleanupTag in GTM), the conversion tag fires first, the navigation fires second, and the order is guaranteed.\n\nThe loss rate is uneven and that is what makes the bug hard to spot. Fast desktop browsers on good connections often complete the request in time. Mobile on a slow connection misses most of them. Your reported conversion volume looks fine in aggregate, but it is biased toward users on faster networks and faster devices, which is exactly the audience Smart Bidding is now told to chase.',
    howToFix:
      '1. Open every Google Ads conversion tag firing on a `formSubmit` or `linkClick` trigger. 2. Either set the trigger to "Wait for Tags" and enable Check Validation, or add tag sequencing so the conversion tag fires as a setup tag before the navigation. 3. For custom HTML conversion implementations, add `eventCallback` to the gtag config so the page only continues after the hit confirms. 4. In Preview mode, run the form submit on a throttled mobile profile and confirm the conversion request completes before the redirect. 5. Republish and verify reported conversion volume on those actions rises on mobile within one reporting cycle.',
    example: 'Trigger: Form Submit\nWait for Tags: enabled\nMax wait: 2000 ms\nOr: setupTag = AW Conversion, navigation fires after',
    citationTemplate:
      'Google Ads conversion tags in this GTM container fire on form submit or link click triggers without `eventCallback`, `event_callback`, or GTM tag sequencing configured. Per the Google Tag Manager trigger documentation, conversion tags that fire on navigation events require either a wait-for-tags configuration or explicit sequencing, otherwise the browser tears down the outbound request before it reaches Google Ads. The result is uneven conversion loss skewed toward slower devices and mobile connections, which biases the Smart Bidding signal toward the users least representative of your full customer base. Fix: enable Wait for Tags on the trigger, or add a setup tag sequence so the conversion fires before navigation, then verify on a throttled mobile profile in Preview. Source: support.google.com/tagmanager/answer/7679219.',
    references: [
      {
        label: 'Google Tag Manager. Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-conversion-linker', 'conversion-label-matching', 'ads-conversion-missing-gtm-tag'],
  },
  {
    id: 'cross-category-mismatch',
    name: 'Category Mismatch Between Settings and Report',
    source: 'cross',
    severity: 'info',
    summary: 'A conversion action has different category values in Google Ads conversion settings and the performance report.',
    directAnswer:
      'A conversion action in your Google Ads conversion settings is labeled with one category (for example "Purchase") while the same action shows up under a different category (for example "Sign-up") in the Performance report row. Same name, two different categories across the two exports. The bidding logic and segmentation reports cannot both be right.',
    why: 'Google Ads uses the conversion category in two places that you care about. It feeds the category-level rollups in the Conversions report (Purchase, Lead, Page view, etc), and it feeds Smart Bidding heuristics for which actions belong on the same funnel stage. When the category in settings drifts from the category recorded against historical volume, the rollups split the same action across two buckets and the funnel-stage views misclassify the work the action is actually doing.\n\nThe usual root cause is harmless. Someone renamed or recategorized the action in Tools and Settings after a campaign had already accumulated volume under the old category. The Performance report keeps the historical category until enough new volume accrues to recategorize. The drift is silent and never raises a warning inside the Google Ads UI.\n\nThe finding is info-level because the measurement loss is small, but the cleanup is worth doing for audit hygiene. Mismatched categories also make every "by category" report you hand to a client look slightly wrong, and clients notice.',
    howToFix:
      '1. Open the AdLint details and list each action where the settings category differs from the report category. 2. Decide which category is correct for the underlying business event. Purchase for a paid order. Lead for a form-completed prospect. 3. In Tools and Settings > Measurement > Conversions, open the action and confirm the category matches that decision. 4. Annotate the change date so future period-over-period reports can explain the bucket shift. 5. Wait one full reporting cycle. The Performance report will pick up the new category as new volume arrives.',
    example: 'Settings: "Newsletter Signup" - category: Lead\nReport: "Newsletter Signup" - category: Sign-up\nFix: align the settings category to match the intended funnel role.',
    citationTemplate:
      'A Google Ads conversion action in this account has different category values in conversion settings versus the Performance report. Per Google Ads conversion-tracking documentation, the conversion category drives both rollup reporting and Smart Bidding funnel-stage heuristics. When the two exports disagree, category-level reports split historical volume across the wrong buckets and any "by category" analysis handed to a stakeholder will appear inconsistent. The usual root cause is a settings rename that has not yet propagated through historical performance data. Fix: confirm the correct category for the underlying business event, align the conversion settings, annotate the change date, and allow one reporting cycle for the report to reflect the new value. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['cross-possible-renames', 'cross-orphaned-report-metrics'],
  },
  {
    id: 'cross-count-mismatch',
    name: 'Settings vs Report Conversion Count Mismatch',
    source: 'cross',
    severity: 'info',
    summary: 'The number of enabled conversion actions in settings differs sharply from the number of actions showing volume in the performance report.',
    directAnswer:
      'Your Google Ads conversion settings show one number of enabled actions. The Performance report shows a very different number of actions with actual volume. The gap is more than 50 percent of the larger count and at least three actions apart. That usually means enabled-but-inactive actions, recently added actions that have not banked volume yet, or a date-range mismatch between the two exports.',
    why: 'Google Ads conversion settings and the Performance report describe the account at two different layers. Settings is the configured surface: every action the team has set up, regardless of whether it is firing. The Performance report is the runtime surface: only actions that recorded volume in the report\'s date window. A small gap is expected. Most accounts have a handful of disabled or freshly added actions.\n\nA wide gap points at one of three problems. Either many enabled actions are not firing (broken tags, mismatched labels, deprecated trigger conditions), or the team added or paused actions recently and the report window does not yet reflect the change, or the two exports cover different date windows entirely and the comparison is apples to oranges.\n\nThe finding sits at info because the mismatch is diagnostic rather than directly broken. It is the prompt that tells you which other checks to take seriously. If you see this finding alongside ghost-conversions or cross-zero-volume-active, the mismatch is real and the account has dead actions. If you see it alone, the cause is probably the date window.',
    howToFix:
      '1. Confirm the date window on the Performance report matches the window you intended to audit. The Conversions report defaults to last 30 days. The settings export reflects the current state. 2. Cross-reference the settings list against the report\'s actions-with-volume list. Identify which enabled actions appear in settings but not in the report. 3. For each of those, check the conversion action page for "Recording" status. An action that reads "No recent conversions" is a ghost candidate. 4. Disable actions that are no longer expected to fire. Keep audit trail by archiving rather than deleting. 5. Re-run the audit. The gap should narrow to actions that were genuinely added recently and have not had time to bank volume.',
    example: 'Settings: 14 enabled conversion actions\nReport (last 30 days): 6 actions with volume\nDifference: 8 actions, 57 percent of the larger count.',
    citationTemplate:
      'This Google Ads account has a wide gap between enabled actions in conversion settings and actions with volume in the Performance report. Per Google Ads conversion documentation, the two views describe configuration state and runtime activity respectively; a healthy account expects a small gap from recently added or paused actions, but mismatches over 50 percent of the larger count typically indicate ghost actions, deprecated tag wiring, or a date-window mismatch between the two exports. Fix: confirm matching date windows, identify enabled actions with no recent recording, archive or disable dead actions, and re-run the comparison to isolate genuinely new actions still building volume. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'cross-zero-volume-active', 'tag-count-mismatch'],
  },
  {
    id: 'cross-disabled-with-volume',
    name: 'Disabled Conversions with Active Volume',
    source: 'cross',
    severity: 'warning',
    summary: 'Conversion actions marked Disabled in settings are still recording volume in the performance report.',
    directAnswer:
      'A conversion action in your Google Ads account is set to Disabled in Tools and Settings, but the Performance report still shows it accumulating conversions. Disabled actions should not be receiving hits. The fact that they are means either the tag is still firing in GTM, the report covers a window from before the action was disabled, or the action was disabled in Google Ads without anyone telling whoever owns the website.',
    why: 'When a Google Ads conversion action is disabled, Google stops counting incoming hits toward bidding and Primary reports, but the underlying conversion ID and label still receive traffic if any tag still points at them. The hits land in a holding state that the Performance report exposes, and they accumulate over the report window even though they no longer influence Smart Bidding.\n\nThe failure mode is a desync between two teams. Someone on the media side disables an action because it became obsolete or duplicative. Nobody removes the matching tag from GTM. The site keeps firing, the report keeps tallying, and nobody notices for months. Two specific risks follow. First, when the action is later re-enabled (often because the team forgot it was disabled), the count and value reset to whatever was accumulated under the dead label, which can flood Smart Bidding with stale signal. Second, if the same business event also has a live action, you cannot tell from the report alone whether the disabled action represents a leak or a stale clone.',
    howToFix:
      '1. Open the AdLint details and list each disabled action with non-zero volume. 2. For each, check the conversion ID and label in Google Ads. Open the matching GTM conversion tag and confirm where it fires. 3. If the action is genuinely obsolete, remove the GTM tag. Do not just pause it. A paused tag can be republished by mistake. 4. If the action was disabled prematurely and should still be tracking, re-enable it in Google Ads and document the recovery decision. 5. Re-run the audit. Disabled actions should report zero volume in the next reporting cycle.',
    example: 'Action: "Newsletter Signup (old)"\nStatus: Disabled\nReport volume (last 30 days): 412 conversions\nLikely cause: GTM tag for the old label still firing on the live signup form.',
    citationTemplate:
      'This Google Ads account has conversion actions marked Disabled in settings that are still receiving volume in the Performance report. Per Google Ads conversion-tracking documentation, disabled actions stop influencing Smart Bidding and Primary reporting but still accept incoming hits if any tag points at the original conversion ID and label. The result is a silent measurement leak: the website is sending conversions to a label nobody is monitoring, and re-enabling the action later flushes the accumulated stale signal back into bidding. Fix: identify each disabled action with volume, remove or rewire the originating GTM tag, and confirm zero volume on the action in the next reporting cycle. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Tag Manager. Help center',
        url: 'https://support.google.com/tagmanager/answer/6103693',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'cross-zero-volume-active', 'gtm-tag-not-in-ads'],
  },
  {
    id: 'cross-orphaned-report-metrics',
    name: 'Report Metrics Without Settings Configuration',
    source: 'cross',
    severity: 'warning',
    summary: 'Conversion names appear in the performance report with active volume but have no matching entry in conversion settings.',
    directAnswer:
      'Your Google Ads Performance report shows volume for one or more conversion actions whose names do not appear in your conversion settings export. Either the action was deleted from settings without removing the underlying tags, the report was pulled from a different account than the settings, or the action was renamed and the report kept the old name on historical volume.',
    why: 'Conversion settings is the live config. The Performance report is the historical record of what actually fired. The two should overlap. Names in the report should map cleanly to actions in settings.\n\nWhen they do not, three causes are typical. The first is deletion. Someone removed an action from settings while the GTM tag or imported feed kept firing. The report keeps recording until the upstream source is taken down. The second is renaming. Settings shows the new name, the report still carries pre-rename volume under the old name, and the two diverge until the historical window rolls past the rename date. The third is account confusion. The settings export and the report were pulled from different accounts or different manager-account views, and the comparison is invalid from the start.\n\nAdLint tries a fuzzy match to spot the rename case automatically. If a report name is similar to a settings name, the finding flags it as a "possible match" rather than an orphan. True orphans usually mean a deletion that was not followed through on the tagging side.',
    howToFix:
      '1. Open the AdLint details. The check separates truly-orphaned report names from fuzzy-matched possible renames. 2. For truly-orphaned names, find the upstream source. If it is a GTM tag, locate the tag by Conversion ID and either delete it or repoint it at a current action. If it is an offline conversion import or a Google Analytics import, disable the import. 3. For fuzzy-matched renames, confirm the rename was intentional and annotate the change date. The report will reconcile as new volume replaces historical volume. 4. If neither applies, verify the settings export and the report came from the same Google Ads account, the same time window, and the same view. 5. Re-run AdLint after the next reporting cycle.',
    example: 'Report row: "Lead - Demo Request (legacy)"\nSettings: no matching action.\nLikely cause: action deleted in Q1, but the form still fires the old AW-XXXXXX/legacyLabel tag.',
    citationTemplate:
      'This Google Ads account has conversion names in the Performance report that have no corresponding entry in conversion settings. Per Google Ads conversion-tracking documentation, settings is the current configuration surface while the Performance report is the historical record; orphaned report rows typically mean the action was deleted from settings without removing the GTM tag, offline import, or analytics import that feeds it, or the action was renamed and historical volume still carries the old name. Fix: separate truly-orphaned rows from fuzzy-matched possible renames, take down the upstream tag or import for genuine orphans, and annotate any intentional renames so historical reporting can be reconciled. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Tag Manager. Help center',
        url: 'https://support.google.com/tagmanager/answer/6103693',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['cross-possible-renames', 'cross-disabled-with-volume', 'ghost-conversions'],
  },
  {
    id: 'cross-possible-renames',
    name: 'Possible Renamed Conversions',
    source: 'cross',
    severity: 'info',
    summary: 'Conversion names in settings and the performance report differ slightly, suggesting renamed or duplicated actions.',
    directAnswer:
      'AdLint found pairs of conversion names where one appears in settings and a similar-but-not-identical name appears in the Performance report. Same action, two near-identical names. Either someone renamed the action mid-cycle, the export was generated before settings caught up, or the account has duplicate actions tracking the same event under slightly different labels.',
    why: 'Google Ads does not warn you when you rename a conversion action. The settings view picks up the new name immediately. The Performance report keeps historical volume on the old name until enough new volume accrues to dominate the row. For a few weeks, the same action exists twice in audits and reports, and the team has to remember which is which.\n\nDuplicates look like renames at first. Two actions named "Lead - Demo" and "Lead Demo" with both recording volume are not a rename. They are two separate actions counting the same event under different labels. Smart Bidding sees both, double-counts when both are Primary, and the account ROAS report stops matching the CRM.\n\nThe finding is info-level because the most common cause is a legitimate rename, which clears itself within a reporting cycle. The reason to surface it is the duplicate case. A handful of accounts have two Primary actions accidentally tracking the same purchase and the team has been arguing about why ROAS jumped 2x since the new tag launched.',
    howToFix:
      '1. Open the AdLint details. Each row shows a settings name, a report name, and the report volume. 2. For each pair, decide whether it is a rename or a duplicate. Pull up the conversion action in Google Ads and check the Conversion ID and label. Same ID and label across both means the same action under a renamed label (harmless). Different IDs or labels means two separate actions (potential duplicate). 3. For genuine renames, annotate the change date and let the next reporting cycle reconcile. 4. For duplicates, mark one Primary and the other Secondary, or remove the redundant tag from GTM. Pick whichever action has cleaner historical data. 5. Re-run AdLint after the next reporting cycle.',
    example: 'Settings: "Lead - Demo Request"\nReport: "Lead Demo Request"\nReport volume: 312 conversions\nLikely: rename, but verify both rows share the same AW conversion ID and label.',
    citationTemplate:
      'This Google Ads account has conversion names in settings and the Performance report that are similar but not identical. Per Google Ads conversion-tracking documentation, conversion-action renames update the settings view immediately but historical Performance-report rows retain the old name until new volume accrues; the same pattern also appears when two separate actions are accidentally tracking the same business event under slightly different labels. The first case is harmless and resolves within a reporting cycle. The second case is a duplicate that inflates reported conversion volume and biases Smart Bidding. Fix: open each flagged pair, compare the Conversion ID and label to distinguish a rename from a duplicate, annotate renames or consolidate duplicates accordingly. Source: support.google.com/google-ads/answer/1722022.',
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
    relatedChecks: ['cross-orphaned-report-metrics', 'duplicate-conversions', 'volume-weighted-duplicates'],
  },
  {
    id: 'cross-value-config-mismatch',
    name: 'Configured Value vs Actual Value Mismatch',
    source: 'cross',
    severity: 'warning',
    summary: 'A conversion action has a configured value in settings that differs by more than 50 percent from the actual average value in the performance report.',
    directAnswer:
      'A conversion action in your Google Ads settings is configured with one value (for example a default of 50 dollars per conversion), but the Performance report shows the actual average value per conversion is more than 50 percent off (for example 150 dollars). Either the configured default is stale, the dataLayer is sending a different value than the settings expect, or the action is using a static value while real transactions are dynamic.',
    why: 'Google Ads supports three value strategies per conversion action: no value, the same value for every conversion (a static default), or different values per conversion (transaction-specific values passed by the tag). Most accounts pick option two for actions like Lead with an "average lead value" estimate, and option three for Purchase actions where the real order total flows from the dataLayer.\n\nThe mismatch finding fires when the static default in option two diverges sharply from the average reported value. That happens for two reasons. First, the account was set up with an estimated value (often a marketing-finance guess) that has not been updated as the business changed. Second, the tag is sending dynamic values even though the setting says "use the same value for every conversion," and Google is reporting the average of those dynamic values back through the report.\n\nThe operational damage is in Smart Bidding. Target ROAS strategies treat the configured value as ground truth for the optimization target. If the configured value is half the real value, the campaign is bidding too low and leaving qualified traffic on the table. If it is double, the campaign is overbidding and burning budget on traffic that does not pay off.',
    howToFix:
      '1. Open the AdLint details and review each flagged action, including the configured value, the actual average from the report, and the variance percentage. 2. Open the action in Tools and Settings > Measurement > Conversions and choose the right value strategy. If the underlying business event has real transaction values (purchases, paid signups), switch to "Use different values for each conversion" and pass the value from GTM via a Data Layer Variable. 3. If the action is genuinely a single-value event (a Lead with no per-record monetization), update the configured value to match the rolling 90-day average from the report. 4. Annotate the change date for downstream reporting. 5. Wait one full conversion cycle, then verify the configured and reported values are now within 50 percent of each other.',
    example: 'Action: "Purchase"\nConfigured value: 50.00 (static default)\nReport average: 187.42\nVariance: 275 percent\nFix: switch to dynamic values from the dataLayer.',
    citationTemplate:
      'This Google Ads account has a conversion action where the configured value in settings differs from the actual average value in the Performance report by more than 50 percent. Per Google\'s value-based-bidding documentation, Target ROAS and Maximize Conversion Value strategies treat the configured value as the optimization target; a stale or wrong default causes campaigns to underbid or overbid against the real business value of each conversion. The two common root causes are an estimated default that has not been refreshed and a static value setting on an action whose tag is actually sending dynamic per-transaction values. Fix: choose the right value strategy for the underlying event, switch to dynamic values where transactions have real revenue, refresh static defaults from the rolling reported average, and verify the variance closes within one reporting cycle. Source: support.google.com/google-ads/answer/13064107.',
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
    relatedChecks: ['zero-value-purchases', 'dynamic-value-passing', 'roas-sanity'],
  },
  {
    id: 'cross-zero-volume-active',
    name: 'Active Conversions with Zero Report Volume',
    source: 'cross',
    severity: 'critical',
    summary: 'Conversion actions enabled in Google Ads settings show no volume in the performance report.',
    directAnswer:
      'You have enabled conversion actions in Google Ads that recorded zero volume in the Performance report window. Either the tag never fires, the Conversion ID and label do not match anything the site is sending, the date range of the two exports is misaligned, or the action is a recent addition that has not banked any conversions yet.',
    why: 'An enabled conversion action with zero volume is the textbook ghost conversion. Smart Bidding optimizes toward Primary actions. If a Primary action is enabled but never receives a hit, the algorithm has a target with no feedback. Campaigns can enter extended learning periods or, worse, fall back to whichever other Primary action does have volume, even if that action is a poor proxy for the actual business goal.\n\nThe root cause hierarchy is consistent. Most often, the GTM tag for the action was never deployed, was paused during a release, or was wired to a trigger that never fires (a CSS selector that no longer exists, a dataLayer event the site no longer pushes). Second most common: the Conversion ID or label in the GTM tag does not match the action in Google Ads, so hits land somewhere else. Third: the export covers a window before the action was set up, or the action was added in a recent campaign and has not seen traffic yet.\n\nThis is the most actionable critical finding in the cross-source family because it surfaces real broken pipes, not just configuration drift.',
    howToFix:
      '1. Open the AdLint details and list each zero-volume action with its category and status. 2. Confirm the export date window. The Performance report defaults to last 30 days. New actions added within that window may not have had time to bank volume. 3. For older actions, open the GTM container and search for the action\'s Conversion ID. If no tag references it, that is your ghost. Either build the tag (if the action should be live) or disable the action (if it is obsolete). 4. If a tag exists, open it in GTM Preview, run a test conversion, and confirm the hit reaches Google Ads via Tag Assistant. 5. Re-run the audit. The action should show volume within the next reporting cycle or be cleanly disabled.',
    example: 'Action: "Lead - White Paper Download"\nStatus: Enabled\nReport volume (last 30 days): 0\nLikely cause: GTM tag was paused during the website rebuild and never republished.',
    citationTemplate:
      'This Google Ads account has conversion actions marked Enabled in settings that recorded zero volume in the Performance report window. Per Google\'s conversion-tracking documentation, an enabled action expects to receive hits matching its Conversion ID and label; zero volume in the report typically means the originating GTM tag was never deployed, the tag was paused, the Conversion ID and label do not match what the site is firing, or the action is recent and has not had time to bank volume. Enabled Primary actions in this state are particularly damaging because Smart Bidding optimizes toward them without any usable feedback. Fix: confirm the export window, locate the originating tag in GTM, verify the conversion ID and label match, run a test conversion in Preview, and either repair the tag or disable the action. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Tag Manager. Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ghost-conversions', 'ads-conversion-missing-gtm-tag', 'conversion-label-matching'],
  },
  {
    id: 'currency-consistency-cross',
    name: 'GTM-Ads Currency Code Consistency',
    source: 'cross',
    severity: 'warning',
    summary: 'Currency codes configured in GTM conversion tags do not match the currencies recorded in Google Ads.',
    directAnswer:
      'The currency code sent by your GTM conversion tags does not match the currency configured on the matching Google Ads conversion action. Same conversion, two different currency labels. Google Ads will accept the hit, but the revenue numbers in Ads will not line up with the revenue numbers in your commerce backend, and every multi-currency ROAS calculation on this account is built on a quiet conversion error.',
    why: 'Google Ads requires every conversion with a value to carry an ISO 4217 currency code (USD, EUR, GBP, etc). When the tag does not send a currency, Google Ads infers the account default. When the tag sends a different currency than the action expects, Google Ads converts the value using its own exchange rate at the time of the hit.\n\nThat conversion is silent. The dashboards still show numbers. The ROAS column still populates. The numbers are just no longer comparable to anything else. A 100 EUR order recorded as USD becomes 100 USD in the Performance report, and the commerce backend that recorded it as 100 EUR will show roughly 110 USD for the same transaction. Multi-currency accounts can have reported Ads revenue diverge from real revenue by 10 to 30 percent depending on the mix.\n\nThe usual cause is a tag built off a hardcoded `currency: "USD"` string that was never updated when the business expanded to other markets, or a Data Layer Variable that resolves to the user\'s locale instead of the order currency.',
    howToFix:
      '1. List the currencies that appear in your GTM conversion tags and the currencies recorded on the corresponding Google Ads actions. AdLint surfaces both. 2. Decide whether the account is single-currency or multi-currency. For single-currency, hardcode the correct ISO 4217 code in the GTM tag and confirm Google Ads matches. 3. For multi-currency, source the currency code from the order object via a Data Layer Variable so each transaction carries its own currency. Do not source from the user\'s browser locale. 4. Verify in Tag Assistant that the currency field on a real transaction matches both the order in your commerce backend and the action setup in Google Ads. 5. Wait one full reporting cycle and reconcile a sample of transactions across Ads and the commerce backend.',
    example: "GTM value parameter: 129.99\nGTM currency parameter: 'USD'\nAds action expects: EUR\nResult: Google Ads converts 129.99 USD to roughly 119 EUR silently.",
    citationTemplate:
      'This account has GTM conversion tags sending currency codes that do not match the currencies recorded on the corresponding Google Ads conversion actions. Per Google\'s conversion-value documentation, Google Ads accepts any ISO 4217 currency code on the hit and silently converts to the account or action currency using its own exchange rate. Multi-currency accounts therefore see Ads-reported revenue diverge from commerce-backend revenue without any warning, and Target ROAS strategies optimize against the converted values rather than the real transaction values. The typical root cause is a hardcoded currency string in the tag or a Data Layer Variable sourced from the user locale rather than the order currency. Fix: source the currency from the order object, verify in Tag Assistant that the tag currency matches the commerce backend, and reconcile a sample of transactions across both surfaces after one reporting cycle. Source: support.google.com/google-ads/answer/2998565.',
    references: [
      {
        label: 'Google Ads. About currency in conversions',
        url: 'https://support.google.com/google-ads/answer/2998565',
      },
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'cross-value-config-mismatch', 'roas-sanity'],
  },
  {
    id: 'dynamic-value-passing',
    name: 'Dynamic Value Passing Validation',
    source: 'cross',
    severity: 'critical',
    summary: 'The account is configured to use dynamic conversion values, but GTM tags or Ads settings break the value pipeline.',
    directAnswer:
      'Your account is set up for dynamic conversion values (each order ships its real revenue from the dataLayer to Google Ads), but one of the links in the chain is broken. Either a GTM conversion tag has a hardcoded value where it should reference a Data Layer Variable, the value parameter is malformed, or the Ads conversion action is configured for fixed values while GTM is sending dynamic ones. The pipeline pretends to work; the bidding signal is wrong.',
    why: 'Dynamic value passing depends on three layers agreeing. The site dataLayer pushes the real order total. The GTM tag reads the dataLayer through a Data Layer Variable and writes it into the `conversionValue` (or `value`) parameter. The Google Ads action is set to "Use different values for each conversion" so it accepts the value the tag sends.\n\nWhen any link breaks, the symptom is the same: Google Ads reports conversion volume that looks healthy, but the value field is zero, garbage, or stuck on a fixed amount that does not reflect the real order. Target ROAS strategies cannot work against this signal. They optimize toward whichever order happens to have a non-zero value, biasing budget toward whatever traffic pattern fed those orders.\n\nThe common failure modes: a developer set a placeholder value during QA (`conversionValue: "1"`) and never replaced it with the variable. A Data Layer Variable reference is misspelled (`{{ecommerce.value}}` vs `{{DLV - ecommerce.value}}`) and resolves to an empty string. The Google Ads action was left on "Use the same value for every conversion" because the migration to dynamic values was only ever half-completed.',
    howToFix:
      '1. Open the AdLint details and review each flagged tag. Issues fall into three buckets: hardcoded values where dynamic was expected, malformed variable references, and configuration mismatches between GTM and Ads. 2. Replace any hardcoded `conversionValue` with a Data Layer Variable that resolves to the order total. In GTM, the binding is `{{DLV - ecommerce.value}}` against a Data Layer Variable Name of `ecommerce.value`. 3. Open each Google Ads action in Tools and Settings > Measurement > Conversions and set the value option to "Use different values for each conversion." 4. In GTM Preview, complete a test purchase. Confirm the conversion request shows the real order total in the value field. 5. Wait one reporting cycle and confirm reported values match the commerce backend within rounding.',
    example: "Tag: 'AW - Purchase'\nConversionValue parameter: '1' (hardcoded, was meant to be {{DLV - ecommerce.value}})\nAds action: 'Use different values for each conversion'\nResult: every order counts as $1 of revenue.",
    citationTemplate:
      'This account is configured to use dynamic conversion values but the value pipeline has a break in it. Per Google\'s value-based-bidding documentation, dynamic values require three layers to agree: a dataLayer that pushes the real order total, a GTM conversion tag that reads it via a Data Layer Variable, and a Google Ads action set to accept different values per conversion. When any link breaks, Google Ads reports healthy conversion volume with the wrong values, and Target ROAS strategies optimize against a signal that does not reflect business revenue. The common causes are placeholder values left in during QA, misspelled Data Layer Variable references, and Ads actions left on the static value setting after a half-completed migration. Fix: replace hardcoded values with verified Data Layer Variable references, set each Ads action to "Use different values for each conversion," and verify in GTM Preview that real order totals reach Google Ads. Source: support.google.com/google-ads/answer/13064107.',
    references: [
      {
        label: 'Google Ads. Set up conversion values',
        url: 'https://support.google.com/google-ads/answer/13064107',
      },
      {
        label: 'Google Ads. About value-based bidding',
        url: 'https://support.google.com/google-ads/answer/7335652',
      },
      {
        label: 'Google Tag Manager. Data Layer reference',
        url: 'https://developers.google.com/tag-platform/tag-manager/datalayer',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['zero-value-purchases', 'missing-datalayer-variables', 'cross-value-config-mismatch'],
  },
  {
    id: 'edge-all-round-values',
    name: 'Static Round Value Detection',
    source: 'cross',
    severity: 'warning',
    summary: 'Every configured conversion value is a clean round multiple, which suggests static defaults rather than real transaction values.',
    directAnswer:
      'Every conversion value on this account is a round number. 10, 25, 50, 100, 500. Real e-commerce values include cents and odd amounts (47.99, 129.43, 312.18). Round-everywhere values almost always mean someone configured a static default in Google Ads and the tag is not actually passing the real order total. Smart Bidding sees fake revenue and optimizes against it.',
    why: 'When a Google Ads conversion action is set to "Use the same value for every conversion," the team picks a single number and every conversion ships with that value. Round numbers are easy to pick. A "Lead" gets configured as 50 dollars. A "Purchase" gets configured as 100 dollars. The dashboards populate with neat totals (5,200 dollars in leads, 12,000 dollars in purchases) and the team feels like value-based bidding is working.\n\nIt is not working. Target ROAS needs real value variance to distinguish high-value traffic from low-value traffic. A static value collapses that variance to zero. Every conversion looks identical to the optimizer. The campaign drifts toward count optimization while the dashboard pretends ROAS is being measured.\n\nWhen the same finding shows up in both the Google Ads settings export and the Performance report (every reported value is also round), the suspicion firms up. Real-world transactional value, even averaged across an account, rarely produces clean round numbers. If both sides are round, the dynamic value pipeline almost certainly does not exist on this account.',
    howToFix:
      '1. Confirm the business actually has transactional value variance to capture. E-commerce purchases, paid leads, SaaS signups: yes. Free newsletter signups, content downloads: probably no. 2. For events with real value variance, switch each Google Ads action to "Use different values for each conversion" and wire the GTM tag to pass `{{DLV - ecommerce.value}}` from the dataLayer. 3. For events without real value variance (a fixed-price lead), keep the static value but refresh it to match the rolling average reported by sales or the CRM. 4. Verify in GTM Preview that the value field on a test conversion matches the order total in the commerce backend. 5. Wait one reporting cycle and confirm the reported values now include realistic decimals and variance.',
    example: 'Configured values: Purchase = 100.00, Lead = 50.00, Signup = 25.00\nAll multiples of 25. No decimals. Almost certainly static defaults.',
    citationTemplate:
      'Every configured conversion value on this Google Ads account is a clean round multiple. Per Google\'s value-based-bidding documentation, Target ROAS and Maximize Conversion Value optimize against per-conversion value variance; uniformly round values typically indicate static defaults (configured under "Use the same value for every conversion") rather than real transactional value flowing from the site dataLayer. The result is value-based bidding that runs against a flat signal, which collapses to count optimization while the dashboard reports neat-looking but synthetic revenue totals. Fix: confirm whether each action has real per-transaction value variance, switch eligible actions to "Use different values for each conversion" with the value sourced via a Data Layer Variable, and refresh any genuine static defaults to match the current rolling average. Source: support.google.com/google-ads/answer/13064107.',
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
    relatedChecks: ['zero-value-purchases', 'dynamic-value-passing', 'cross-value-config-mismatch'],
  },
  {
    id: 'edge-extreme-window-mismatch',
    name: 'Extreme Attribution Window Configuration',
    source: 'cross',
    severity: 'warning',
    summary: 'A conversion action has an unusual attribution window configuration, such as a very long click window on a purchase or a view window longer than the click window.',
    directAnswer:
      'One or more Google Ads conversion actions in this account have attribution windows that fall outside normal ranges. A purchase action with a click window over 60 days, a view-through window longer than the click window, or a click window under a day. Each of these patterns is rarely intentional and usually means somebody adjusted a window without realizing how it changes attribution.',
    why: 'Google Ads attribution windows define how long after an interaction a conversion can be credited to it. Click windows for most purchase actions sit at 30 to 90 days. View-through windows for display and YouTube usually sit at 1 to 7 days. The relationships matter. A click window should be longer than the view window on the same action, because a click is a stronger signal than a view and deserves more credit-time.\n\nThree anti-patterns show up in audits. First, a purchase action with a 120-day or 180-day click window. That over-attributes purchases to old clicks and inflates campaign ROAS. Second, a view window longer than the click window, which is the inverse of what attribution research recommends. Third, a click window measured in hours rather than days, usually a configuration mistake that excludes the majority of real conversions.\n\nThe finding is warning-level because the attribution choices may be intentional for specific business reasons (a B2B account with a known 90-day sales cycle, a brand campaign experimenting with view-through). But the configuration deserves a deliberate review rather than the default of "whoever last touched the settings."',
    howToFix:
      '1. Open the AdLint details and list each flagged action with its click window, view window, and category. 2. For each, decide whether the configuration is intentional. Check the Time Lag report in Google Ads to see the actual distribution of click-to-conversion delay for the business. 3. Set the click window to capture the 90th percentile of historical delay. Typical values: 7 to 30 days for direct-response, 30 to 60 days for considered purchases, 60 to 90 days for B2B leads. 4. Set the view window to no more than half the click window, usually 1 to 7 days. 5. Annotate the change date. Historical reporting will shift as conversions enter or exit the new windows.',
    example: 'Action: "Purchase"\nClick window: 90 days\nView window: 14 days\nIssue: view window longer than typical, but click window is reasonable for a considered-purchase site.',
    citationTemplate:
      'This Google Ads account has conversion actions with attribution window configurations that fall outside normal ranges, such as click windows over 60 days on purchase actions, view windows longer than click windows, or sub-day click windows. Per Google\'s attribution-window documentation, the click window should reflect the realistic click-to-conversion delay for the business and should exceed the view window on the same action. Mismatched windows cause systematic over- or under-attribution that distorts campaign ROAS and biases Smart Bidding feedback. Fix: review the actual conversion-lag distribution in the Time Lag report, set the click window to the 90th percentile of historical delay, set the view window to no more than half the click window, and annotate the change date for downstream reporting. Source: support.google.com/google-ads/answer/3123169.',
    references: [
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['short-attribution-windows', 'edge-very-long-window', 'model-attribution-drift'],
  },
  {
    id: 'edge-high-value-wrong-counting',
    name: 'High-Value Conversions with Wrong Counting Method',
    source: 'cross',
    severity: 'critical',
    summary: 'A purchase or high-value conversion action is set to count "One" per click instead of "Every," which suppresses repeat purchases.',
    directAnswer:
      'A high-value action on this account (a purchase, sale, or any action with a configured value over 100 dollars) is set to count "One" per click. That means Google only records the first conversion from each ad click, even if the same user comes back and buys three more times. Repeat customers are invisible. Your reported revenue is the floor of what those customers actually generated.',
    why: 'Google Ads supports two counting methods for conversion actions. "Every" counts every conversion (Google\'s recommended setting for purchases). "One" counts only the first conversion per ad click (recommended for lead-gen actions where one signup per click is meaningful and duplicates indicate form errors).\n\nThe rule is straightforward: purchases use "Every," leads use "One." When a purchase action is set to "One," every repeat transaction inside the click window disappears. The first order counts, the second does not, the third does not. For accounts with strong repeat customer behavior (food and beverage, subscriptions, beauty, anything consumable), this can suppress 20 to 50 percent of attributable revenue. The Performance report still looks healthy because the first order shows up; the missing volume is invisible by design.\n\nThe usual root cause is a counting method copied from a Lead action when the team set up the Purchase action. The default in Google Ads for new actions has changed over time, and older accounts have a higher chance of carrying the legacy setting.',
    howToFix:
      '1. Open the AdLint details and list each high-value action set to count "One." 2. Open Tools and Settings > Measurement > Conversions in Google Ads. For each flagged action, change the Count method to "Every." 3. Annotate the change date for downstream reporting. Reported conversion volume on the action will increase as the new method captures repeat purchases. 4. Wait one full reporting cycle. The realized lift depends on the share of repeat purchases on the site. 5. Re-run AdLint to confirm no high-value actions remain on the wrong counting method.',
    example: 'Action: "Purchase"\nConfigured value: 129.99\nCount: "One" (suppresses repeats)\nFix: switch to "Every".',
    citationTemplate:
      'This Google Ads account has high-value conversion actions (purchases or actions with configured values above typical thresholds) configured to count "One" per click rather than "Every." Per Google\'s counting-method documentation, "Every" is recommended for purchase and sale actions because it captures repeat transactions, while "One" is intended for actions where duplicates indicate errors (such as form submissions). The wrong setting suppresses repeat-customer revenue inside the attribution window, biasing Smart Bidding away from high-LTV traffic patterns and underreporting campaign-attributed revenue by 20 to 50 percent on repeat-friendly verticals. Fix: switch each flagged action to count "Every," annotate the change date, and verify that reported volume rises within one reporting cycle. Source: support.google.com/google-ads/answer/3438531.',
    references: [
      {
        label: 'Google Ads. About counting methods',
        url: 'https://support.google.com/google-ads/answer/3438531',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['edge-purchase-disabled-others-enabled', 'missing-primary-conversion'],
  },
  {
    id: 'edge-micro-dominating',
    name: 'Micro-Conversion Dominance',
    source: 'cross',
    severity: 'critical',
    summary: 'A micro-conversion (page view, scroll, video, search) accounts for more than 70 percent of total reported conversion volume.',
    directAnswer:
      'A micro-conversion in your Performance report is generating more than 70 percent of total conversion volume on this account. Either a page view, a scroll event, a search, or a video start is being counted alongside real macro outcomes like purchases or leads. Smart Bidding sees the noise more than the signal and optimizes toward whichever traffic produces the most micro-hits, which is rarely the traffic that produces revenue.',
    why: 'Google Ads counts every Primary conversion action equally for the purposes of Smart Bidding. A Primary "Page View" action and a Primary "Purchase" action both feed the optimizer. If the Page View is firing on every landing page and the Purchase is firing on confirmation pages, the Page View will out-volume the Purchase by 100x or more.\n\nThe optimizer then learns from the dominant signal. It pushes spend toward placements, audiences, and times that drive page views, because page views are 99 percent of what it sees. Purchases become rounding error in the training data. The campaign reports healthy conversion volume while real revenue erodes.\n\nThis is the worst kind of measurement leak because it looks like success. The "Conversions" column in Ads Manager climbs. Cost-per-conversion drops. The team celebrates. Meanwhile the commerce backend shows declining orders and the finance team is the first to notice the gap.\n\nThe critical fix is one setting per action: demote the micro-conversions to Secondary so they still report for analysis but stop feeding the optimizer.',
    howToFix:
      '1. Open the AdLint details and list each micro-conversion exceeding 70 percent of total volume. 2. In Google Ads, open Tools and Settings > Measurement > Conversion goals. 3. For each flagged action, change the role from Primary to Secondary. Secondary actions still record and report; they no longer drive Smart Bidding. 4. Confirm that the real macro action (Purchase, Lead, Qualified Lead) is the only Primary in the relevant conversion goal group. 5. Annotate the change date. Campaign performance metrics will reset because the optimizer now sees a different target. Allow a 7- to 14-day learning period before judging restored performance.',
    example: 'Report:\nPage View: 14,200 conversions (89 percent of volume)\nPurchase: 312 conversions (2 percent)\nLikely cause: page-view tag fires Primary on every landing.',
    citationTemplate:
      'This Google Ads account has a micro-conversion (page view, scroll, video, search, or similar lightweight event) accounting for more than 70 percent of total reported conversion volume. Per Google\'s conversion-goal documentation, Smart Bidding optimizes toward Primary actions equally regardless of business value; when a high-volume micro-action shares Primary status with low-volume macro actions, the optimizer learns predominantly from the micro signal and biases spend toward traffic patterns that drive lightweight events rather than revenue. The reported "Conversions" column climbs while real purchase volume erodes. Fix: demote micro-actions to Secondary in conversion-goal settings, keep the true business outcome as the only Primary in each goal group, annotate the change date, and allow a 7- to 14-day learning period before evaluating restored performance. Source: support.google.com/google-ads/answer/12727548.',
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
    relatedChecks: ['micro-conversion-pollution', 'missing-primary-conversion', 'edge-single-category-dominance'],
  },
  {
    id: 'edge-only-all-conversions',
    name: 'Secondary-Only Volume',
    source: 'cross',
    severity: 'info',
    summary: 'Some conversion actions have volume in the All Conversions column but zero volume in the Conversions column, meaning they are marked Secondary.',
    directAnswer:
      'One or more conversion actions on this account have volume in the "All conversions" report column but zero in the "Conversions" column. That means the action is marked Secondary in Google Ads. It is recording for analysis but is not feeding Smart Bidding. Sometimes that is intentional; sometimes a valuable action got demoted by mistake and the bidding optimizer no longer sees it.',
    why: 'Google Ads splits conversion actions into Primary (counted in the "Conversions" column, drives Smart Bidding) and Secondary (counted only in "All conversions," recorded for analysis but excluded from bidding). The split is deliberate. It lets accounts track many actions for diagnostics while telling Smart Bidding which subset matters for optimization.\n\nThe finding surfaces every action that is currently Secondary. Most of the time, the team meant for that. Page views, scrolls, and add-to-cart events should be Secondary. The risk case is when a macro action got demoted because someone was experimenting with conversion goals and forgot to put it back. A Purchase action marked Secondary by accident is a critical problem. The optimizer cannot see it. The campaign optimizes toward whatever other Primary action exists, often a weaker proxy.\n\nThis is info-level because the finding does not know intent. The fix is to review each Secondary action and confirm the role matches what the business needs.',
    howToFix:
      '1. Open the AdLint details and list each action with All-Conversions volume and zero Conversions volume. 2. For each, decide whether the Secondary role is intentional. Diagnostic and micro events: yes. Purchase, qualified Lead, signup: probably no. 3. In Google Ads, open Tools and Settings > Measurement > Conversion goals. Promote any mistakenly-demoted macro action to Primary in the relevant goal group. 4. Confirm campaigns inherit the right Primary goal. Campaign-level goal overrides can bypass account-level changes. 5. Annotate the promotion date. Smart Bidding will re-evaluate against the larger Primary signal over the next 7 to 14 days.',
    example: 'Action: "Qualified Lead"\nAll conversions: 412\nConversions: 0\nLikely cause: marked Secondary during a goal restructuring and never promoted back.',
    citationTemplate:
      'This Google Ads account has conversion actions with volume in "All conversions" but zero in the "Conversions" column, indicating Secondary status. Per Google\'s Primary vs Secondary conversion documentation, Secondary actions record for analysis but do not feed Smart Bidding. The finding is informational because the role may be intentional for diagnostic actions; the risk case is when a macro business action (Purchase, qualified Lead) is mistakenly Secondary and the optimizer falls back to weaker proxies. Fix: review each flagged action, promote any mistakenly-demoted macro action to Primary in conversion goals, confirm campaign-level goal inheritance, and allow a 7- to 14-day learning period after promotion. Source: support.google.com/google-ads/answer/9143218.',
    references: [
      {
        label: 'Google Ads. Primary vs Secondary conversion actions',
        url: 'https://support.google.com/google-ads/answer/9143218',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'edge-micro-dominating'],
  },
  {
    id: 'edge-purchase-disabled-others-enabled',
    name: 'Purchase Conversions Disabled While Others Enabled',
    source: 'cross',
    severity: 'critical',
    summary: 'Purchase or sale conversion actions are disabled while other conversion actions remain enabled, leaving Smart Bidding without a macro target.',
    directAnswer:
      'A purchase or sale action on this account is set to Disabled while other actions (signups, page views, add-to-carts) are still enabled. Smart Bidding has no purchase signal to optimize toward, so it picks whichever enabled action has the most volume. That is almost never the right target. For an e-commerce account, this is the most direct way to spend budget on the wrong goal.',
    why: 'Google Ads optimizes campaigns toward enabled Primary actions in the relevant conversion goal. When the purchase action is disabled and the only enabled Primary is something like "Add to Cart" or "Newsletter Signup," the campaign cheerfully drives add-to-carts. Many of those carts will never check out. Spend climbs, micro-volume climbs, real revenue declines, and the reporting surface does not flag the problem because the campaign is doing exactly what it was configured to do.\n\nThe usual cause is one of two patterns. A team experimented with disabling Purchase during a tracking-fix window and forgot to re-enable it. Or someone disabled a duplicate Purchase action without realizing it was the Primary one feeding bidding, leaving only the secondary or alternate Purchase action behind (which may itself be misconfigured or disabled).\n\nThe critical severity is appropriate because the misalignment between business intent (drive purchases) and configured signal (drive whatever else is enabled) is total. No fancier analysis is needed to spot the gap. It is one toggle in Google Ads.',
    howToFix:
      '1. Open the AdLint details and confirm which purchase or sale actions are currently disabled. 2. In Google Ads, open Tools and Settings > Measurement > Conversions, find each disabled purchase action, and decide whether it should be re-enabled. 3. If the action is genuinely obsolete (replaced by a newer Purchase action), confirm the replacement is enabled and Primary in the relevant conversion goal. Then archive the obsolete action. 4. If the action is the canonical Purchase, re-enable it and make sure it is Primary. Confirm any campaign-level goal overrides inherit the change. 5. Annotate the change date. Smart Bidding will re-enter a 7- to 14-day learning period as it adjusts to the restored macro signal.',
    example: 'Action: "Purchase"\nStatus: Disabled\nOther enabled actions: "Add to Cart" (Primary), "Newsletter Signup" (Primary)\nResult: Smart Bidding optimizes for add-to-cart volume.',
    citationTemplate:
      'This Google Ads account has purchase or sale conversion actions set to Disabled while other conversion actions remain enabled. Per Google\'s conversion-tracking and conversion-goal documentation, Smart Bidding optimizes toward enabled Primary actions; when the macro business outcome is disabled, the optimizer falls back to whichever enabled Primary has the most volume, typically a micro-conversion that does not correlate with revenue. The result is spend driving lightweight events while real purchase volume declines, with no warning surfaced in standard reporting. Fix: confirm which purchase action is canonical, re-enable it, set it Primary in the relevant conversion goal, archive any obsolete duplicates, and allow a 7- to 14-day learning period for Smart Bidding to adjust. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['missing-primary-conversion', 'edge-high-value-wrong-counting', 'edge-micro-dominating'],
  },
  {
    id: 'edge-single-category-dominance',
    name: 'Category Diversity',
    source: 'cross',
    severity: 'info',
    summary: 'More than 80 percent of enabled conversion actions share a single category, limiting funnel visibility.',
    directAnswer:
      'More than 80 percent of enabled conversion actions on this account share a single category (for example "Submit lead form" or "Page view"). Most accounts benefit from at least a small mix across the funnel: awareness, consideration, conversion, retention. Single-category dominance does not directly break bidding, but it limits diagnostic visibility and makes it harder to spot where the funnel is leaking.',
    why: 'Google Ads conversion categories drive the funnel-stage views in the Conversions report and inform some Smart Bidding heuristics. When every enabled action shares one category, those views collapse to a single row. The team loses the ability to see whether a campaign is driving consideration-stage actions (add-to-cart, video views) but failing at conversion-stage actions (purchase), or vice versa.\n\nThe finding is info-level for two reasons. First, the optimal mix depends on the business. A pure direct-response e-commerce account with one Purchase action and no diagnostic micro-events is not broken; it is just minimal. Second, an account in growth or rebuild mode may legitimately have only one category enabled while everything else is being staged.\n\nThe reason to surface this anyway is that single-category dominance is a leading indicator of two real problems: missing funnel diagnostics (a team that cannot see which stage is leaking) and over-reliance on a single signal for Smart Bidding feedback. The fix is to add diagnostic Secondary actions rather than rearranging Primary status.',
    howToFix:
      '1. Open the AdLint details and review the category breakdown of enabled actions. 2. Decide whether the current mix matches the business intent. A B2B account with one "Lead" Primary action might be fine. An e-commerce account with only "Page view" actions is probably not. 3. Add diagnostic Secondary actions for any missing funnel stage: ViewContent or product-page view for consideration, AddToCart or InitiateCheckout for late-funnel intent, repeat-purchase for retention. 4. Keep the macro business action as the only Primary. The new diagnostic actions should be Secondary so they record for analysis without competing with Smart Bidding signal. 5. Re-run AdLint to confirm category diversity has improved.',
    example: 'Enabled actions:\n12 of 14 actions are category "Submit lead form" (86 percent)\nFix: add diagnostic Secondary actions for product views, demo-watched, or pricing-page visited.',
    citationTemplate:
      'This Google Ads account has more than 80 percent of enabled conversion actions in a single category. Per Google\'s conversion-goal documentation, conversion categories drive funnel-stage rollups and inform Smart Bidding heuristics; single-category dominance collapses these views to one row and limits the team\'s ability to see where the funnel is leaking. The finding is informational because the optimal mix depends on the business, but uniform category coverage is a leading indicator of missing funnel diagnostics and over-reliance on a single signal. Fix: add diagnostic Secondary actions for the missing funnel stages (consideration, late-funnel intent, retention), keep the macro business action as the only Primary, and confirm improved category diversity in the next audit. Source: support.google.com/google-ads/answer/12727548.',
    references: [
      {
        label: 'Google Ads. About conversion goals',
        url: 'https://support.google.com/google-ads/answer/12727548',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['edge-micro-dominating', 'micro-conversion-pollution', 'missing-primary-conversion'],
  },
  {
    id: 'edge-very-long-window',
    name: 'Very Long Attribution Windows',
    source: 'cross',
    severity: 'warning',
    summary: 'A conversion action has an attribution window longer than 90 days on clicks or 30 days on views.',
    directAnswer:
      'A conversion action on this account has an attribution window over 90 days for clicks or over 30 days for views. Windows this long attribute conversions to ad interactions that happened months earlier, which usually credits more conversions to Google Ads than the campaigns actually drove. Unless the business genuinely has a 90-day sales cycle, the window is probably inflating reported performance.',
    why: 'Attribution windows define how long after an interaction Google Ads can credit a conversion to that interaction. The default click window for most actions is 30 days, but the system supports up to 90 days. The default view window is shorter, typically 1 day, and supports up to 30 days.\n\nLong windows have one legitimate use case: long sales cycles. A B2B SaaS account with a 60-day evaluation period needs a 90-day window to capture conversions from the prospecting ad that started the journey. Outside that case, long windows over-attribute. A user who clicked a brand-search ad 87 days ago and bought today probably did not buy because of that ad. The window credits Google Ads anyway, the campaign ROAS climbs on paper, and the team makes budget decisions on a number that double-counts the work.\n\nThe finding is warning-level rather than critical because the window may be intentional. The deliverable is a deliberate decision, not an automatic fix. Most direct-response e-commerce accounts should run 7- to 30-day click windows and 1- to 7-day view windows.',
    howToFix:
      '1. Open the AdLint details and list each action with click window over 90 days or view window over 30 days. 2. Open the Time Lag report in Google Ads (Reports > Predefined > Time > Time lag) and review the actual click-to-conversion delay distribution. 3. Set the click window to the 90th percentile of historical delay. Most direct-response accounts land at 7 to 30 days. B2B accounts may land at 60 to 90. 4. Set the view window to no more than half the click window, typically 1 to 7 days. 5. Annotate the change date. Historical reported volume will shift as conversions enter or exit the new windows. Allow one full sales cycle before judging.',
    example: 'Action: "Purchase"\nClick window: 120 days\nView window: 30 days\nFix: set click window to 30 days, view window to 7 days, unless the business has a verified long sales cycle.',
    citationTemplate:
      'This Google Ads account has conversion actions with attribution windows longer than 90 days on clicks or 30 days on views. Per Google\'s attribution-window documentation, windows beyond the defaults credit ad interactions for conversions that happened weeks or months after the click, which over-attributes campaign performance for businesses without a genuinely long sales cycle. The result is inflated reported ROAS that double-counts contribution from clicks long past their realistic influence horizon. Fix: review the actual click-to-conversion delay in the Time Lag report, set the click window to the 90th percentile of historical delay, keep the view window at no more than half the click window, and annotate the change date for downstream reporting. Source: support.google.com/google-ads/answer/3123169.',
    references: [
      {
        label: 'Google Ads. About conversion windows',
        url: 'https://support.google.com/google-ads/answer/3123169',
      },
      {
        label: 'Google Ads. About attribution models',
        url: 'https://support.google.com/google-ads/answer/6394265',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['short-attribution-windows', 'edge-extreme-window-mismatch', 'model-attribution-drift'],
  },
  {
    id: 'enhanced-conversions-user-data',
    name: 'Enhanced Conversions User Data Quality',
    source: 'cross',
    severity: 'critical',
    summary: 'Enhanced Conversions tags are configured but do not collect or hash the required user data fields.',
    directAnswer:
      'Your GTM container has Enhanced Conversions enabled on one or more Google Ads conversion tags, but the user data being collected is incomplete or improperly hashed. Either email is missing, phone and address are both absent (you need at least one), or the email is being passed unhashed instead of SHA-256. Google Ads silently drops or downgrades these hits, and the conversion match rate is far lower than the team expects.',
    why: 'Enhanced Conversions improves attribution by sending hashed user data (email, phone, address) alongside the conversion event. Google matches that data against the signed-in user pool on Google\'s side to recover conversions that would otherwise be lost to cookie loss, ITP, or consent denial.\n\nFor the match to work, three things must be true. The data has to be present (at minimum, an email; ideally email plus phone or address). The data has to be hashed (SHA-256, normalized to lowercase and trimmed). And the data has to come from the form or order object, not from a placeholder.\n\nMany implementations get one of these wrong. Email is passed in plaintext because the developer did not realize Google needs SHA-256. Phone is missing entirely because the form did not collect it. Address fields are sent but not normalized (mixed case, leading spaces, formatted phone numbers with parentheses). Each of those breaks the match and Google quietly drops the enhancement.\n\nThe critical severity reflects two things: regulatory exposure (sending plaintext PII to Google is a GDPR problem before it is a measurement problem) and lost attribution (Enhanced Conversions can recover 5 to 15 percent of conversions that would otherwise be unattributed, and a broken implementation captures none of that).',
    howToFix:
      '1. Open the AdLint details and list each Enhanced Conversions tag and its missing or malformed fields. 2. Confirm the source data: email is required, plus phone or address (ideally both). 3. Hash each field with SHA-256 before passing it to the tag. Email and phone need to be lowercased and trimmed first; phone needs to be normalized to E.164 format (+15551234567). Address fields need to be lowercased and stripped of punctuation. 4. Verify in GTM Preview that the payload sent to Google Ads contains hashed values, not plaintext. The hash should be a 64-character hex string. 5. Check the Enhanced Conversions diagnostic panel in Google Ads after 24 to 48 hours. The match rate should rise above the baseline within one reporting cycle.',
    example: 'Required: hashed email (SHA-256, lowercase, trimmed)\nRecommended: hashed phone (E.164) and hashed address (lowercased)\nNever: plaintext PII in the conversion request.',
    citationTemplate:
      'This GTM container has Enhanced Conversions tags configured for Google Ads but the user data collection has quality issues. Per Google\'s Enhanced Conversions documentation, the feature requires SHA-256 hashed email plus at least one of phone or address, with all values normalized (lowercased, trimmed, phone in E.164). Incomplete or unhashed payloads cause Google to silently drop or downgrade the enhancement, eliminating the 5 to 15 percent recoverable conversion lift Enhanced Conversions is meant to deliver and creating regulatory exposure where plaintext PII is sent. Fix: collect email plus phone or address from the form or order object, hash each field with SHA-256 after normalization, verify the payload in GTM Preview, and monitor the match rate in the Google Ads Enhanced Conversions diagnostic panel. Source: support.google.com/google-ads/answer/9888656.',
    references: [
      {
        label: 'Google Ads. About Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/9888656',
      },
      {
        label: 'Google Ads. Set up Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/13262500',
      },
      {
        label: 'Google Tag Manager. Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['first-party-data-completeness', 'missing-conversion-linker', 'consent-violations'],
  },
  {
    id: 'first-party-data-completeness',
    name: 'First-Party Data Collection Completeness',
    source: 'cross',
    severity: 'info',
    summary: 'Conversion tags collect less than half of the available first-party data points that would improve Enhanced Conversions match rates.',
    directAnswer:
      'Your Google Ads conversion tags are collecting fewer than half of the first-party data points Google Ads can use for matching. That includes email, phone, first name, last name, address fields, city, region, postal code, and country. The more of these fields you pass, the higher the Enhanced Conversions match rate. The current coverage limits the lift Enhanced Conversions can deliver on this account.',
    why: 'Enhanced Conversions matches conversion events against Google\'s signed-in user data using whichever first-party fields the tag provides. Email is the strongest single match key, but adding phone, address, and name fields raises the match rate substantially, particularly on iOS Safari and other browsers where cookie-based attribution is degraded.\n\nA tag that ships only email captures a baseline match rate (typically 40 to 60 percent of conversions). A tag that ships email plus phone plus normalized address can reach 70 to 85 percent. The difference is recoverable conversion volume that Smart Bidding gets to learn from.\n\nThe finding is info-level because the right amount of data to collect depends on the business. A pure ecommerce account where users always check out with full shipping address has high coverage available. A SaaS signup form that only collects email has limited coverage available, and there is nothing to fix on the tagging side until the form changes.\n\nThe reason to surface this is that many implementations leave coverage on the table. The order object on the confirmation page usually contains phone, address, and name; the tag was just wired to read only the email field. Adding the rest is one Data Layer Variable per field.',
    howToFix:
      '1. Open the AdLint details. Each data point is listed with the count of tags that collect it. 2. For each tag, audit the source. The order or form object usually contains more fields than the tag is currently reading. 3. Add Data Layer Variables for each missing field: `user_data.email_address`, `user_data.phone_number`, `user_data.address.first_name`, `user_data.address.postal_code`, etc. 4. Hash and normalize each field before passing it (lowercase, trim, phone in E.164). 5. Verify in GTM Preview that the conversion request now includes the additional fields. Check the Enhanced Conversions diagnostic panel in Google Ads after 24 to 48 hours and confirm the match rate rises.',
    example: 'Current coverage: email only (1 of 9 fields collected, 11 percent)\nAvailable from order object: email, phone, first_name, last_name, address, city, region, postal_code, country\nLikely lift: 20 to 30 points of match rate.',
    citationTemplate:
      'This account\'s Google Ads conversion tags collect less than half of the first-party data points available for Enhanced Conversions matching. Per Google\'s Enhanced Conversions documentation, match rate scales with the number of hashed first-party fields provided (email, phone, name, address components); a tag shipping only email captures a baseline match rate while a tag shipping email plus phone plus normalized address typically captures 20 to 40 percentage points more, particularly on iOS and other privacy-restricted browsers. The finding is informational because the available data depends on what the form or order object collects, but most implementations leave coverage on the table by reading only email from a payload that already contains more. Fix: add Data Layer Variables for each available field, hash and normalize each value, verify in GTM Preview, and monitor the Enhanced Conversions match rate after 24 to 48 hours. Source: support.google.com/google-ads/answer/9888656.',
    references: [
      {
        label: 'Google Ads. About Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/9888656',
      },
      {
        label: 'Google Ads. Set up Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/13262500',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['enhanced-conversions-user-data', 'user-id-consistency'],
  },
  {
    id: 'gtm-tag-not-in-ads',
    name: 'GTM Conversion Tags Not in Ads',
    source: 'cross',
    severity: 'critical',
    summary: 'GTM Google Ads conversion tags do not match any conversion action configured in Google Ads.',
    directAnswer:
      'One or more Google Ads conversion tags in your GTM container do not match any conversion action in your Google Ads conversion settings. The tags fire on real user behavior, the hits go out to Google, but they land against a Conversion ID and label that Google Ads no longer has on file. The tag thinks it is working. Google Ads silently discards every hit.',
    why: 'Each Google Ads conversion tag sends a `send_to` value made of an AW Conversion ID and a conversion label (`AW-123456789/abcDEF`). Google Ads matches that pair against the configured conversion actions in the account. If no action matches, the hit is dropped. There is no warning, no error log surfaced to the advertiser, and no row added to the Performance report. The hit just disappears.\n\nThe usual root causes are predictable. The Google Ads action was deleted or archived during a cleanup pass while the GTM tag was left in place. The account migration moved conversion actions to a new Google Ads account and the GTM tag is still pointed at the old account\'s Conversion ID. The label was regenerated (some workflows force a new label on edit) and the tag is still sending the previous label.\n\nThe critical severity reflects how silent the failure is. The GTM container looks healthy. The tag fires in Preview mode. Tag Assistant shows a green hit. Only by comparing GTM tags against the live Google Ads conversion settings can you see that the hits are landing nowhere.',
    howToFix:
      '1. Open the AdLint details and list each orphaned GTM tag with its name and the implied conversion action. 2. For each, open the tag in GTM and read the Conversion ID and label. Then open Tools and Settings > Measurement > Conversions in Google Ads and confirm whether any action carries that exact ID and label. 3. If the matching action exists under a different name, update the GTM tag\'s name to match. The hit will start landing again immediately. 4. If no matching action exists, either create one (if the tag should be live) or delete the GTM tag (if the action is genuinely obsolete). 5. Verify in GTM Preview that the hit completes, then check the Google Ads Performance report after 24 to 48 hours for newly-recorded volume.',
    example: 'GTM tag: "AW - Lead Submit"\nsend_to: AW-987654321/oldLabel\nGoogle Ads: no action matches that ID and label.\nLikely cause: action was archived during a Q2 cleanup. Tag was never updated.',
    citationTemplate:
      'This GTM container has Google Ads conversion tags whose Conversion ID and label do not match any action in the connected Google Ads conversion settings. Per Google\'s conversion-tracking documentation, the `send_to` value on the conversion request must match a live conversion action; hits with no matching action are silently discarded with no error surfaced to the advertiser, while the GTM tag continues to appear healthy in Preview and Tag Assistant. The typical causes are deleted or archived conversion actions, account migrations that left tags pointing at the old account, and regenerated labels. Fix: identify the implied action for each orphaned tag, repoint or rename to match a live action, or delete tags whose actions are genuinely obsolete, then verify newly-recorded volume in the Performance report. Source: support.google.com/google-ads/answer/1722022.',
    references: [
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'Google Tag Manager. Conversion Linker tag',
        url: 'https://support.google.com/tagmanager/answer/7549390',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['ads-conversion-missing-gtm-tag', 'conversion-label-matching', 'ghost-conversions'],
  },
  {
    id: 'tag-count-mismatch',
    name: 'Tag Count Mismatch',
    source: 'cross',
    severity: 'warning',
    summary: 'The number of Google Ads conversion tags in GTM differs sharply from the number of enabled conversion actions in Google Ads.',
    directAnswer:
      'The count of Google Ads conversion tags in your GTM container is more than 50 percent different from the count of enabled Google Ads conversion actions, with a gap of at least two. That suggests either duplicate tags counting the same action, missing tags for actions that have no corresponding tag, or a desync between what GTM is firing and what Google Ads is expecting.',
    why: 'In a healthy account, the number of Google Ads conversion tags in GTM should roughly match the number of enabled conversion actions in Google Ads. One tag per action, one action per business event. Small differences are expected (a tag that fires multiple actions, or an offline import action that has no GTM tag), but a large gap usually means something is off.\n\nWhen GTM has more tags than Ads has actions, the typical cause is duplicate tags. Two tags pointing at the same Conversion ID and label, both firing on the same trigger, both counting the same business event. The duplicate inflates reported conversion volume and biases Smart Bidding.\n\nWhen Ads has more actions than GTM has tags, the typical cause is enabled actions with no tag wiring (which produces ghost conversions: enabled, expected to fire, never receives volume). Either the team built actions in Google Ads ahead of the site implementation and never finished the wiring, or tags were removed during a cleanup without disabling the matching actions.\n\nThe finding is warning-level because the count gap by itself is diagnostic, not directly broken. Pair this finding with `duplicate-conversions`, `ads-conversion-missing-gtm-tag`, or `gtm-tag-not-in-ads` to identify the underlying root cause.',
    howToFix:
      '1. Open the AdLint details and review the GTM tag count vs Google Ads enabled action count. 2. If GTM has the larger count, check for duplicate tags. Two tags with the same `send_to` value firing on the same trigger should be consolidated to one. 3. If Google Ads has the larger count, list the enabled actions and confirm each has a matching GTM tag (or a legitimate non-GTM source like an offline import). Build the missing tags or disable the orphaned actions. 4. Verify the resulting counts in GTM and Google Ads are within roughly 20 percent of each other. 5. Re-run AdLint after the next publish and the next reporting cycle.',
    example: 'GTM: 12 Google Ads conversion tags\nGoogle Ads: 5 enabled conversion actions\nLikely cause: 7 duplicate tags accumulated from copy-paste during multiple rollouts.',
    citationTemplate:
      'This account has a wide gap between the count of Google Ads conversion tags in GTM and the count of enabled conversion actions in Google Ads. Per Google\'s conversion-tracking documentation, the two surfaces should roughly match (one tag per action, one action per business event); a 50-percent gap with at least two tags difference typically indicates duplicate tags (causing inflated conversion volume), orphaned enabled actions (causing ghost conversions), or a desync between deployment and configuration. The finding is diagnostic and pairs with other cross-source findings to identify the specific root cause. Fix: consolidate duplicate tags, build matching tags for orphaned actions or disable the actions, and verify counts converge within roughly 20 percent after the next publish. Source: support.google.com/google-ads/answer/1722022.',
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
    relatedChecks: ['duplicate-conversions', 'ads-conversion-missing-gtm-tag', 'gtm-tag-not-in-ads', 'cross-count-mismatch'],
  },
  {
    id: 'transaction-id-deduplication',
    name: 'Transaction ID Deduplication',
    source: 'cross',
    severity: 'warning',
    summary: 'Google Ads conversion tags do not pass a transaction or order ID, leaving duplicate conversions unprevented.',
    directAnswer:
      'Your Google Ads conversion tags for e-commerce events do not pass a transaction or order ID. Google Ads has no way to deduplicate conversions when a user reloads the confirmation page, navigates back and forward, or hits the order endpoint twice for any other reason. Every refresh counts as a new purchase. The same order can fire two or three times before the user closes the tab.',
    why: 'Google Ads deduplicates conversions using the transaction ID (`order_id`, `transactionId`, or the `transaction_id` parameter, depending on tagging surface). When two conversion requests arrive with the same transaction ID inside the deduplication window, Google counts only the first one. When the transaction ID is missing, every request is treated as a fresh conversion.\n\nThe failure modes are common on confirmation pages. A user refreshes to check their order status, the page reloads, the tag fires again. A user navigates back from the order tracking page, then forward to the confirmation page, the tag fires again. A user opens the order email and clicks back to the confirmation page, the tag fires again. Without a transaction ID, each of those duplicates counts. The order is real once. Google Ads thinks it happened two or three times.\n\nThe severity is warning rather than critical because the inflation is usually 5 to 15 percent rather than 100 percent, and it gets worse as more users land on a confirmation page from non-purchase paths (post-purchase emails, support links, bookmarks). The dashboards look healthy. The reconciliation against the commerce backend is where the gap shows up.',
    howToFix:
      '1. Open the AdLint details and list each conversion tag missing a transaction ID parameter. 2. Open each tag in GTM. Add a parameter named `transaction_id` (or `order_id`, depending on the gtag version) and bind it to a Data Layer Variable that reads the order ID from the dataLayer. 3. Confirm the source: the order or transaction ID should come from the order object pushed at purchase, not from a URL parameter (which can be missing or spoofed) and not from a generated timestamp (which changes on every load). 4. Verify in GTM Preview that the conversion request includes a stable transaction ID across page reloads. 5. Wait one reporting cycle. Reported volume on the action should drop slightly as duplicates are filtered. Reconcile a sample of orders against the commerce backend to confirm.',
    example: "Tag: 'AW - Purchase'\nMissing parameter: transaction_id\nFix: add transaction_id parameter bound to {{DLV - ecommerce.transaction_id}}.",
    citationTemplate:
      'This GTM container has Google Ads conversion tags for e-commerce events that do not pass a transaction or order ID. Per Google\'s conversion-tracking documentation, Google Ads deduplicates conversions using the transaction ID parameter; without it, page reloads, browser back-forward navigation, and confirmation-page revisits each count as fresh conversions. The result is reported conversion volume inflated by 5 to 15 percent on average, which biases Smart Bidding feedback and produces ROAS reports that diverge from commerce-backend totals. The transaction ID must come from the order object pushed at purchase, not from a URL parameter or generated timestamp. Fix: add a `transaction_id` parameter to each e-commerce conversion tag bound to the order ID from the dataLayer, verify stability across page reloads in Preview, and reconcile reported volume against the commerce backend after one reporting cycle. Source: support.google.com/google-ads/answer/6386790.',
    references: [
      {
        label: 'Google Ads. Troubleshoot duplicate conversions',
        url: 'https://support.google.com/google-ads/answer/6386790',
      },
      {
        label: 'Google Ads. About conversion tracking',
        url: 'https://support.google.com/google-ads/answer/1722022',
      },
      {
        label: 'GA4. Measure ecommerce',
        url: 'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['duplicate-conversions', 'ecommerce-datalayer-structure', 'missing-datalayer-variables'],
  },
  {
    id: 'user-id-consistency',
    name: 'Inconsistent User ID Implementation',
    source: 'cross',
    severity: 'warning',
    summary: 'Some Google Ads conversion tags send a user ID while others do not, fragmenting cross-device attribution.',
    directAnswer:
      'Some Google Ads conversion tags in your GTM container send a `user_id` parameter; others do not. Cross-device attribution depends on a consistent user identifier across every conversion event. When half the tags ship a user ID and half do not, Google can stitch user journeys for the tagged half and not for the rest. The cross-device match rate gets worse as the inconsistency persists.',
    why: 'User IDs let Google connect conversions that happen on different devices or browsers for the same user. A prospect clicks an ad on mobile, signs up, then completes the purchase on desktop a week later. With a `user_id` on both the signup tag and the purchase tag, Google can credit the desktop purchase to the mobile click. Without consistent user IDs, the desktop conversion arrives as a fresh anonymous user and the mobile click goes unattributed.\n\nThe failure mode in this finding is partial coverage. The Purchase tag was built with user_id because someone read the Enhanced Conversions docs. The Lead tag was built earlier, before the team standardized on user IDs, and never got updated. The two tags now produce conversions Google cannot link to the same user even when they describe the same person.\n\nThe usual cause is timeline. Tags get built over months or years, by different team members, against different specs. The newest tags follow the current best practice. The older tags carry the legacy implementation. Audits surface the inconsistency; the fix is mechanical.',
    howToFix:
      '1. Open the AdLint details and list each Google Ads conversion tag, marked with or without `user_id`. 2. Decide whether to standardize on sending user IDs across the board. For accounts with signed-in users (most SaaS, ecommerce with accounts, B2B), the answer is yes. For accounts with mostly anonymous traffic, the lift is smaller and the consistency question is moot. 3. For tags missing user_id, add a Data Layer Variable bound to the signed-in user ID from the dataLayer or auth context. Pass it as the `user_id` parameter on the conversion tag. 4. Confirm the user_id is stable across sessions for the same user. Generated timestamps and random IDs do not work. Use the persistent customer ID from your auth system. 5. Verify in GTM Preview that all conversion tags ship a populated `user_id` and that the value matches across tags fired for the same test user.',
    example: 'Tags with user_id: "AW - Purchase", "AW - Subscribe"\nTags without user_id: "AW - Lead", "AW - Newsletter Signup"\nFix: add user_id parameter to the two older tags.',
    citationTemplate:
      'This GTM container has Google Ads conversion tags with inconsistent `user_id` implementation: some tags pass a stable user identifier while others do not. Per Google\'s Enhanced Conversions and user-data documentation, cross-device attribution depends on a consistent user identifier across every conversion event; partial coverage fragments user journeys and prevents Google from linking conversions for the same user across devices or sessions. The typical root cause is tags built across multiple project phases against different specs, where newer tags follow current best practice and older tags carry the legacy implementation. Fix: standardize on a persistent customer ID from the auth system, add the `user_id` parameter to every Google Ads conversion tag via a Data Layer Variable, and verify in Preview that all tags ship the same `user_id` value for the same test user. Source: support.google.com/google-ads/answer/9888656.',
    references: [
      {
        label: 'Google Ads. About Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/9888656',
      },
      {
        label: 'Google Ads. Set up Enhanced Conversions',
        url: 'https://support.google.com/google-ads/answer/13262500',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['enhanced-conversions-user-data', 'first-party-data-completeness'],
  },
  {
    id: 'pinterest-conversion-api-parity',
    name: 'Pinterest Conversion API Parity',
    source: 'pinterest',
    severity: 'warning',
    summary: 'Pinterest browser events have no matching server-side Conversion API volume.',
    directAnswer:
      'Your Pinterest Tag is firing Checkout, Lead, and other conversion events in the browser, but Events Manager shows no matching Conversion API volume on the server side. That means Pinterest is hearing one side of the conversation. When a browser hit gets blocked by an extension, dropped by iOS Safari, or deferred by a slow consent banner, there is no server backup carrying the same event_id. Your conversion counts are exactly as durable as the browser channel, which is the channel breaking the fastest.',
    why: 'Pinterest treats the browser tag and the Conversions API as two paths for the same event. When both fire and share an `event_id`, Pinterest deduplicates and keeps whichever arrives intact. When only the browser fires, you lose everything ad blockers, ITP, network errors, and consent timing take with them. The gap is not theoretical. Pinterest publishes match-quality and event-coverage scores in Events Manager that visibly drop on browser-only accounts.\n\nThe second problem is field parity. Even when the server is configured, partial CAPI payloads (missing `event_time`, `event_name`, hashed email, value, currency) cannot deduplicate against the browser hit. Pinterest then double-counts or drops one side, and the account team cannot tell which without forensic work.\n\nFor agencies, the deliverable line is simple. If browser events exist without Conversion API parity, the attribution shown in the Pinterest dashboard is not the attribution the client is paying for.',
    howToFix:
      '1. Open Pinterest Events Manager and list every browser event by name (PageVisit, ViewCategory, AddToCart, Checkout, Search, Signup, Lead, WatchVideo, Custom). 2. For each conversion-class event (Checkout, Lead, Signup, AddToCart), build a Conversion API payload that sends the same event from the server with a shared `event_id`. 3. Include `event_time`, `event_name`, `action_source`, hashed Enhanced Match fields, `value`, `currency`, and `partner_name` on every CAPI hit. 4. Send a test event in Events Manager and confirm Pinterest reports both Browser and Server columns populated for the same `event_id`. 5. Wait 24 hours, then check the deduplication rate; healthy parity sits above 70 percent for major events.',
    example: 'Browser event: Checkout\nServer event: Checkout\nShared fields: event_id, value, currency, order_id, customer match fields',
    citationTemplate:
      'This Pinterest Tag is sending conversion events from the browser without matching Conversions API volume on the server. Pinterest documents the Conversions API as a server-side complement to the browser tag, with shared `event_id` used to deduplicate the two streams. When only the browser channel fires, conversion measurement depends entirely on client-side delivery, which is degraded by ad blockers, Safari Intelligent Tracking Prevention, consent banner timing, and network failures. The reported Pinterest conversion counts therefore understate true performance and produce attribution that cannot be defended in a client performance review. Fix: implement the Conversions API for every conversion-class event, share `event_id` between browser and server hits, and confirm deduplication in Events Manager before relying on campaign reporting. Source: developers.pinterest.com/docs/conversions/conversion-management/.',
    references: [
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
      {
        label: 'Pinterest. Track conversions with the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-tag-configuration-quality', 'pinterest-checkout-missing-value'],
  },
  {
    id: 'pinterest-tag-configuration-quality',
    name: 'Pinterest Tag Configuration Quality',
    source: 'pinterest',
    severity: 'warning',
    summary: 'Pinterest tag naming, enhanced match, or currency setup is inconsistent.',
    directAnswer:
      'Your Pinterest Tag fires, and the events arrive. The configuration around them is the problem. The `partner_name` matches the tag name so you cannot tell which integration owns the hits. Enhanced Match is off, so Pinterest is matching on cookies alone. Value events are arriving in two currencies on the same property, so revenue totals in Events Manager describe two different economic units stacked on top of each other. None of this breaks the pixel. All of it breaks the audit trail.',
    why: 'Pinterest setup quality is a governance problem, not a delivery problem. The tag is healthy. The data underneath is not defensible.\n\nThree patterns show up most often. First, the `partner_name` field gets reused as the tag display name (or left as the default "Main Tag"). When two integrations point at the same Pinterest account, you cannot tell from Events Manager whether a Checkout came from Shopify, a headless build, or a CMS plugin. Ownership disputes become unresolvable. Second, Enhanced Match is disabled or partially configured. Pinterest uses hashed email, phone, and other identifiers to match conversions to logged-in Pinners; without it, match rates drop and Conversions API deduplication degrades. Third, value events fire in mixed currencies (USD on one product, EUR on another) because the dataLayer pulls from the wrong locale variable. The dashboard sums them anyway and reports a number that is mathematically meaningless.\n\nFor an agency citing Pinterest performance in a client deliverable, every one of these makes the citation harder to defend.',
    howToFix:
      '1. In Pinterest Events Manager, rename the tag to describe the integration and store (for example, "Shopify US Store Pinterest Tag") and set `partner_name` to the actual partner platform. 2. Enable Enhanced Match in the tag settings and confirm the site is passing hashed email, phone, or external_id on Checkout and Lead events; verify the match quality indicator in Events Manager. 3. Standardize value events on a single currency per property, or split the property if multi-currency is a real business requirement. 4. Send test Checkout and Lead events and confirm Events Manager shows correct `partner_name`, Enhanced Match status of Good or Great, and a single currency on value events.',
    example: 'Problem: partnerName = Main Tag, tagName = Main Tag, currencies = USD and EUR\nBetter: partnerName = Shopify, tagName = US Store Pinterest Tag, currency = USD',
    citationTemplate:
      'This Pinterest Tag has configuration quality issues that compromise the defensibility of its event data. Pinterest documentation specifies that `partner_name` should identify the integration platform, that Enhanced Match should be enabled to improve conversion attribution with hashed identifiers, and that value events should report a consistent currency per property. The audited account uses generic naming, has Enhanced Match disabled or partial, and reports value events in mixed currencies on the same property. None of this prevents events from firing; all of it prevents the resulting reports from being citable in a client performance review. Fix: rename the tag and `partner_name` to describe the integration, enable Enhanced Match with hashed Checkout and Lead identifiers, and standardize on one currency per property. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Enhanced Match',
        url: 'https://help.pinterest.com/en/business/article/enhanced-match',
      },
      {
        label: 'Pinterest. Track conversions with the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-conversion-api-parity', 'pinterest-checkout-missing-value'],
  },
  {
    id: 'pinterest-checkout-missing-value',
    name: 'Pinterest Checkout Event Missing Value',
    source: 'pinterest',
    severity: 'critical',
    summary: 'Pinterest Checkout events are firing without a value or currency payload.',
    directAnswer:
      'Your Pinterest Checkout events are arriving in Events Manager with zero or missing `value`. The conversion counts. The dollars do not. That means every ROAS, AOV, and value-based bidding strategy your account team is running is working from a blank revenue field. Pinterest can tell that a Checkout happened, but it cannot tell whether the order was 12 dollars or 1,200, so the optimizer treats every Checkout as equivalent.',
    why: 'Pinterest documents `value` and `currency` as required for any optimization that bids on revenue, and for any reporting downstream that compares spend to outcome. When Checkout fires without them, three things break in sequence.\n\nFirst, value-based bidding cannot run. Pinterest Smart Bidding objectives that target ROAS need a populated `value` to learn from; without it, the campaign falls back to Checkout-volume optimization and ignores the size of the basket entirely. Second, the Events Manager revenue column reads zero, so the in-platform dashboard contradicts the ecommerce backend on every reconciliation. Third, the Conversions API mirror inherits the same gap, because a server payload that omits `value` cannot deduplicate against a browser payload that also omits it without ambiguity.\n\nFor an agency client review, this is the line that fails first. You can defend conversion count. You cannot defend revenue attribution when `value` is missing from the source event.',
    howToFix:
      '1. Open the Pinterest Tag implementation on the order confirmation page and confirm the Checkout call passes both `value` (numeric, no currency symbol) and `currency` (ISO 4217, for example USD or EUR). 2. In Tag Manager or your dataLayer, source `value` from the same order total your backend uses for reconciliation, not from a UI string. 3. Mirror the same `value` and `currency` into the Conversions API Checkout payload with a shared `event_id`. 4. Send a test Checkout and verify Events Manager reports the populated value and currency on both Browser and Server columns. 5. Confirm that the revenue column on the Pinterest campaign report begins populating within 24 hours and matches backend totals within an acceptable margin.',
    example: 'Problem: twq(\'event\', \'Checkout\', { event_id: \'abc\' })\nBetter:  twq(\'event\', \'Checkout\', { event_id: \'abc\', value: 84.50, currency: \'USD\', order_id: \'1001\' })',
    citationTemplate:
      'This Pinterest Tag is recording Checkout events without a `value` or `currency` payload. Pinterest documentation requires both fields for value-based bidding, revenue reporting in Events Manager, and Conversions API deduplication on monetary events. When Checkout fires with empty value, Pinterest Smart Bidding cannot optimize toward ROAS, the in-platform revenue column reads zero, and reconciliation against the ecommerce backend fails. Conversion volume in the Pinterest dashboard therefore overstates the defensible revenue picture and produces an attribution story that cannot survive a client performance review. Fix: populate `value` and `currency` on every Checkout event from the same order total the backend uses, mirror the fields into the Conversions API payload with a shared `event_id`, and verify Events Manager reports populated revenue on both Browser and Server columns. Source: help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-missing-conversion-events', 'pinterest-conversion-api-parity', 'pinterest-ecommerce-funnel'],
  },
  {
    id: 'pinterest-duplicate-events',
    name: 'Pinterest Duplicate Event Names',
    source: 'pinterest',
    severity: 'warning',
    summary: 'The same Pinterest event name is configured more than once on this account.',
    directAnswer:
      'Two or more Pinterest events share the same name in Events Manager. From the optimizer perspective, that means a single business action is producing two competing signals. Pinterest cannot tell which one is the source of truth for bidding, so it treats them as separate streams that count the same Checkout twice, or splits volume between them and starves both of learning data.',
    why: 'Pinterest configures bidding and reporting on the event name. Two Checkout events under one tag is not a redundancy. It is two distinct objects that each get their own audiences, their own optimization counters, and their own row in reporting.\n\nThe shapes that produce duplicates are predictable. A migration from a legacy tag template left the old Checkout in place when the new one launched. A staging configuration got promoted to production without removing the test event. A second GTM container loaded by a forgotten embed re-registered an event already published by the primary container. In every case, the front end still works. Events fire. The dashboard shows numbers. But the numbers are split, and the optimizer is running on half-evidence.\n\nFor agencies reviewing a Pinterest account, duplicate events are also the cleanest indicator that the implementation has been touched by multiple owners without governance. Even when reporting impact looks small, the configuration is a red flag for the rest of the audit.',
    howToFix:
      '1. In Pinterest Events Manager, sort the event list by name and identify every event that appears more than once. 2. For each duplicate pair, determine which event is currently used by active campaigns and audiences and which is dormant. 3. Pause the dormant event, confirm no campaign or audience depends on it, and then archive it. 4. If both events are in use, consolidate the campaigns onto the canonical event before archiving the other. 5. Reload the page and verify that each event name appears exactly once and that subsequent Checkout, Lead, or Signup hits land on the canonical event only.',
    example: 'Problem: Checkout (legacy template), Checkout (new template), both active\nBetter:  Checkout (canonical), legacy archived after audience and campaign migration',
    citationTemplate:
      'This Pinterest Tag has more than one event configured under the same name. Pinterest treats each configured event as a distinct object for bidding, audience building, and reporting, so duplicate names produce split signal where one business action feeds two competing streams. The pattern typically arises when a legacy template is not retired during a migration, when a staging configuration is promoted without cleanup, or when a secondary tag container re-registers an event already published by the primary container. The visible result is reporting that contradicts backend totals and bidding behaviour that underperforms because Smart Bidding learns from half the volume on each duplicate. Fix: identify duplicates in Events Manager, determine the canonical event in use by active campaigns and audiences, migrate dependents off the dormant duplicate, and archive the redundant configuration. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-similar-event-names', 'pinterest-standard-event-names', 'pinterest-zero-volume-events'],
  },
  {
    id: 'pinterest-ecommerce-funnel',
    name: 'Pinterest E-commerce Funnel Events',
    source: 'pinterest',
    severity: 'warning',
    summary: 'The Pinterest e-commerce funnel is missing one or more standard events.',
    directAnswer:
      'For an ecommerce account, Pinterest expects four standard events that map to the funnel: PageVisit, ViewCategory, AddToCart, and Checkout. One or more of these is missing or inactive on the audited tag. That gap removes the rung in the funnel where Pinterest builds the audience that gets retargeted, optimizes the upper-funnel campaign, or scores the conversion path leading into Checkout.',
    why: 'Pinterest documents the four standard ecommerce events as the minimum tag coverage for an online store. Each one has a job.\n\nPageVisit is the base signal. Every retargeting audience and every funnel diagnostic depends on it. ViewCategory feeds upper-funnel optimization and product-aware audiences. AddToCart is the strongest mid-funnel intent signal and the event most retargeting campaigns optimize against. Checkout is the revenue event that anchors ROAS and value-based bidding. Drop one of the four and the path the Pinner walks through your site becomes invisible in that slot.\n\nThe most common failure pattern is shipping PageVisit and Checkout while skipping ViewCategory and AddToCart, because those two require dataLayer work on the category and product detail pages. The result is a Pinterest account that can count revenue but cannot retarget cart-abandoners or build product-aware lookalikes. Smart Bidding then runs upper-funnel campaigns blind, because it cannot see which Pinners viewed categories without converting.\n\nFor agencies, a partial funnel is a finding that translates directly to campaign options the client cannot use until the tag is complete.',
    howToFix:
      '1. Open Pinterest Events Manager and list active events. Confirm PageVisit, ViewCategory, AddToCart, and Checkout each appear as active. 2. For each missing event, identify the trigger in your tag manager (PageVisit on all pages, ViewCategory on category templates, AddToCart on the add-to-cart action, Checkout on order confirmation). 3. Implement the missing events through the Pinterest Tag and mirror them through the Conversions API where Checkout and AddToCart are missing on the server. 4. Send test events for each newly added event and confirm Events Manager registers volume on both Browser and Server columns. 5. Wait 24 hours and verify that retargeting audiences (Add to Cart in last 30 days, Category viewers) begin populating.',
    example: 'Active: PageVisit, Checkout\nMissing: ViewCategory, AddToCart\nAdd category-page and PDP add-to-cart triggers to complete the funnel.',
    citationTemplate:
      'This Pinterest Tag is missing one or more standard events from the documented e-commerce funnel of PageVisit, ViewCategory, AddToCart, and Checkout. Pinterest defines this set as the minimum tag coverage for an online store, with each event powering a specific layer of optimization and audience building. A partial funnel leaves Smart Bidding running upper-funnel campaigns without category or cart signal, prevents the account from building retargeting audiences for cart-abandoners or category viewers, and produces reporting that can count revenue but cannot describe the path leading to it. The implementation works, but the campaign options available to the client are reduced to what the existing events can support. Fix: implement the missing PageVisit, ViewCategory, AddToCart, or Checkout events through the Pinterest Tag, mirror them through the Conversions API where applicable, and verify Events Manager registers volume on each before relying on retargeting audiences. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-missing-pagevisit', 'pinterest-missing-conversion-events', 'pinterest-checkout-missing-value'],
  },
  {
    id: 'pinterest-missing-conversion-events',
    name: 'Pinterest Missing Conversion Events',
    source: 'pinterest',
    severity: 'critical',
    summary: 'No active Pinterest Checkout, Lead, or Signup event is configured on this account.',
    directAnswer:
      'Your Pinterest Tag is loaded and PageVisit may be firing, but no conversion-class event (Checkout, Lead, or Signup) is active. That is the event Pinterest needs to optimize campaigns toward business outcomes. Without it, every Pinterest campaign is bidding for clicks and reach, not for sales or leads, regardless of what objective is selected in Ads Manager.',
    why: 'Pinterest Smart Bidding objectives like Conversions and Catalog Sales need a conversion event in Events Manager to optimize against. The Ads Manager UI will let you select these objectives even when no conversion event is configured, but the optimizer falls back to upstream proxy signals because it has nothing to learn from on the conversion side. Spend goes out. Optimization quality is whatever Pinterest can infer from clicks alone.\n\nThere are two common shapes. The first is a store that shipped the Pinterest Tag base code but never added the order-confirmation Checkout event, often because the Shopify or BigCommerce template hook was disabled or because the dataLayer push got dropped during a theme migration. The second is a lead-generation account that fires PageVisit and a few Custom events but never publishes a Lead or Signup event, so the CRM signups happening on the site are invisible to Pinterest entirely.\n\nFor an agency taking over the account, this is the first thing that has to be fixed before any conversion-objective campaign is worth running. Reporting will look fine in Ads Manager. The number of Pinners that actually bought, signed up, or filled out a form is unknown.',
    howToFix:
      '1. Open Pinterest Events Manager and confirm whether any of Checkout, Lead, or Signup is listed as active. 2. For ecommerce accounts, implement Checkout on the order confirmation page through the Pinterest Tag with `value`, `currency`, and `order_id`. For lead generation, implement Lead or Signup on the form-submission success page. 3. Mirror the conversion event into the Conversions API with a shared `event_id` for resilient server-side measurement. 4. Send a test conversion and confirm Events Manager registers it on both Browser and Server columns within minutes. 5. Once the conversion event is active and accruing volume, reconfigure existing Pinterest campaigns to optimize toward it.',
    example: 'Active events: PageVisit, ViewCategory\nMissing: Checkout (ecommerce) or Lead/Signup (lead gen)\nResult: Conversions campaigns optimize on click signal only.',
    citationTemplate:
      'This Pinterest account has no active Checkout, Lead, or Signup event configured in Events Manager. Pinterest documents these as the standard conversion-class events that Smart Bidding uses to optimize Conversions and Catalog Sales campaigns toward real business outcomes. Without an active conversion event, Pinterest campaigns continue to spend and the Ads Manager UI continues to allow conversion-objective selection, but the optimizer falls back to upstream click and view signals because there is no conversion data to learn from. The reported campaign performance therefore reflects upper-funnel proxy metrics rather than the sales or leads the client is paying to acquire. Fix: implement Checkout for ecommerce or Lead and Signup for lead generation through the Pinterest Tag, mirror the event through the Conversions API with a shared `event_id`, and verify Events Manager registers volume before configuring campaigns to optimize against it. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-missing-pagevisit', 'pinterest-checkout-missing-value', 'pinterest-conversion-api-parity'],
  },
  {
    id: 'pinterest-missing-pagevisit',
    name: 'Pinterest Missing PageVisit Event',
    source: 'pinterest',
    severity: 'critical',
    summary: 'No active Pinterest PageVisit event is configured on this account.',
    directAnswer:
      'Pinterest is not seeing PageVisit fire anywhere on the site. PageVisit is the base event that every other Pinterest signal sits on top of. With it missing, you cannot build a site-visitor retargeting audience, the funnel diagnostics in Events Manager will not populate, and conversion campaigns lose the upper-funnel reference that lets the optimizer connect a click to the rest of the session.',
    why: 'PageVisit is the Pinterest equivalent of a base pageview event. Pinterest expects it to fire on every tracked page, and it is the dependency for three things that all break together when it is absent.\n\nFirst, retargeting. The default site-visitor audience in Pinterest is built from PageVisit. No PageVisit, no audience, no retargeting line item. Second, Events Manager match-quality and event-coverage scoring. Pinterest evaluates the tag against a baseline of PageVisit volume; without it, the diagnostic columns sit empty or show artificially poor coverage on the downstream events. Third, attribution context. When a Checkout fires without a PageVisit ancestor, Pinterest has less session evidence to weigh against the click-through window and the resulting attribution is weaker.\n\nThe usual cause is a tag that was installed only on the conversion page (a common pattern when someone copies a Checkout snippet from documentation and stops there), or a GTM trigger set to fire PageVisit only on a single page template instead of All Pages. Sometimes the base tag fires but the PageVisit event call is commented out or guarded by a consent flag that never resolves.',
    howToFix:
      '1. Open Pinterest Events Manager and confirm no PageVisit event has recent volume. 2. In your tag manager, configure the Pinterest Tag base code on All Pages and ensure `pintrk(\'track\', \'PageVisit\')` runs on every page load, including SPA route changes. 3. If consent gating is in use, confirm PageVisit fires after consent is granted rather than being blocked indefinitely on no-decision. 4. Send a test PageVisit by browsing any page on the site and verify it lands in Events Manager within minutes. 5. Wait 24 hours and confirm site-visitor audience sizes begin populating in Ads Manager.',
    example: 'Problem: pintrk(\'track\', \'PageVisit\') only fires on /checkout/success\nBetter:  PageVisit fires on every page, including SPA route changes, after consent resolves.',
    citationTemplate:
      'This Pinterest Tag has no active PageVisit event firing. Pinterest documentation defines PageVisit as the base tag event expected on every tracked page, and as the dependency for site-visitor retargeting audiences, Events Manager match-quality scoring, and session context for downstream conversion events. The pattern typically appears when the Pinterest Tag is installed only on the conversion page, when a single-page-application route change is not instrumented, or when consent gating blocks the call indefinitely. The visible effect is retargeting audiences that fail to populate, diagnostic columns that read zero, and a conversion attribution that is weaker than the campaign reporting would suggest. Fix: configure the Pinterest base tag on all pages, ensure PageVisit fires on every page load including SPA route changes, verify consent gating resolves the call rather than blocking it, and confirm volume in Events Manager. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Enhanced Match',
        url: 'https://help.pinterest.com/en/business/article/enhanced-match',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-missing-conversion-events', 'pinterest-ecommerce-funnel', 'pinterest-zero-volume-events'],
  },
  {
    id: 'pinterest-similar-event-names',
    name: 'Pinterest Similar Event Names',
    source: 'pinterest',
    severity: 'info',
    summary: 'Two or more Pinterest events have names similar enough to be reporting on the same action.',
    directAnswer:
      'Pinterest is showing event pairs with names that differ by a typo, a capitalization, or a separator: `AddToCart` and `add_to_cart`, `Checkout` and `Checkout1`, `Lead` and `Leads`. The tag treats each as a separate event with its own audience, its own counter, and its own row in reporting. If both represent the same business action, your volume is split and the optimizer is learning from half the signal on each.',
    why: 'Pinterest matches events on the exact string. `AddToCart` and `addtocart` are two events, not one. When a similar pair exists, it is almost always because two different implementations on the site target the same user action: a Shopify template event fires `AddToCart` while a custom GTM tag fires `add_to_cart`, or a legacy snippet uses `Lead` while a new form integration uses `Leads`. Both work. Both record volume. The data is just split in a place no dashboard surfaces by default.\n\nThe operational impact depends on which events overlap. Standard events versus custom events with similar names produce the worst case, because Pinterest applies different optimization treatment to standard events. A `Checkout` event will feed Smart Bidding on conversion-objective campaigns; a custom event called `Checkout1` will not. Two similarly named custom events split audience size and weaken retargeting coverage. Two near-identical standard event names are the cleanest fix, because the resolution is unambiguous: pick one, migrate dependents, archive the other.',
    howToFix:
      '1. Open Pinterest Events Manager and list the similar event pairs flagged in the audit. 2. For each pair, decide which name is canonical, preferring the Pinterest standard event name (PageVisit, ViewCategory, AddToCart, Checkout, Search, Signup, Lead, WatchVideo) when one of the two matches. 3. Update the site implementation so only the canonical name fires going forward, and confirm the duplicate firing path is removed. 4. Migrate any campaigns or audiences off the deprecated event onto the canonical one. 5. Archive the deprecated event in Events Manager and verify subsequent volume lands only on the canonical name.',
    example: 'Problem: AddToCart (standard) and add_to_cart (custom) both active\nBetter:  AddToCart canonical, custom firing path removed, audiences migrated.',
    citationTemplate:
      'This Pinterest Tag has event names similar enough to suggest two implementations are tracking the same business action under different strings. Pinterest matches events on exact string equality, so `AddToCart` and `add_to_cart` are treated as independent events with separate audiences, counters, and reporting rows. The condition typically arises when a platform template event coexists with a custom GTM tag targeting the same action, or when a legacy snippet outlives a new integration. The result is split signal, weaker Smart Bidding performance because each event learns from half the volume, and retargeting audiences that under-cover the addressable visitor base. Fix: pick a canonical event name, prefer the Pinterest standard event when one of the variants matches, remove the duplicate firing path on the site, migrate campaigns and audiences onto the canonical event, and archive the deprecated event in Events Manager. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-duplicate-events', 'pinterest-standard-event-names', 'pinterest-zero-volume-events'],
  },
  {
    id: 'pinterest-standard-event-names',
    name: 'Pinterest Standard Event Names',
    source: 'pinterest',
    severity: 'info',
    summary: 'Custom Pinterest events have names that closely resemble a documented standard event.',
    directAnswer:
      'Some events on this Pinterest Tag are configured as Custom but use names that map almost exactly to a Pinterest standard event. A custom event called `checkout_complete` or `add-to-cart` does the same job as `Checkout` or `AddToCart`, except Pinterest does not give it the same treatment. Standard events get richer optimization, default audience templates, and the documented funnel diagnostics. Custom events do not.',
    why: 'Pinterest defines a set of standard events (PageVisit, ViewCategory, Search, AddToCart, Checkout, Lead, Signup, WatchVideo, Custom) and gives them platform-level affordances. Smart Bidding has built-in optimization paths for them. Events Manager funnel diagnostics expect them. Default audience templates use them. Catalog Sales campaigns reference Checkout and AddToCart by name.\n\nWhen the implementation ships a custom event named like a standard event, Pinterest cannot connect the dots. The campaign team has to manually configure conversion-objective optimization against the custom event, audience templates that would have worked out of the box need rebuilding, and funnel diagnostics in Events Manager omit the event from the standard view. None of this is broken. It is just measurably worse than the same volume flowing through a standard event.\n\nThe shape that produces this is usually a developer naming events to match the dataLayer convention on the site (snake_case, kebab-case) rather than the Pinterest convention (PascalCase standard event names). The fix is a string change on the tag side; the dataLayer can keep its own conventions.',
    howToFix:
      '1. Open the audit detail for the flagged custom events and compare each name to the Pinterest standard event list. 2. For each event that maps to a standard (for example `checkout_complete` to Checkout, `add-to-cart` to AddToCart, `signup_form` to Signup), update the Pinterest Tag call to use the standard event name. 3. Republish the tag and verify the standard event begins recording volume in Events Manager. 4. Migrate any campaigns or audiences from the custom event to the new standard event. 5. Archive the custom event once dependents have been moved and confirm the standard event is now feeding Smart Bidding and audience templates.',
    example: 'Problem: pintrk(\'track\', \'checkout_complete\', { value: 84.5, currency: \'USD\' })\nBetter:  pintrk(\'track\', \'Checkout\',           { value: 84.5, currency: \'USD\' })',
    citationTemplate:
      'This Pinterest Tag has custom events with names that closely resemble Pinterest standard events such as Checkout, AddToCart, Lead, or Signup. Pinterest gives standard events platform-level treatment: Smart Bidding optimization paths, default audience templates, Events Manager funnel diagnostics, and Catalog Sales campaign integration. Custom events with similar names produce the same volume but do not inherit any of these affordances, so the campaign team must configure conversion-objective optimization manually, audience templates need rebuilding, and funnel diagnostics omit the event from the standard view. The implementation works but trades default platform behaviour for naming choices that almost certainly do not need to differ from the Pinterest convention. Fix: rename the affected events to the matching Pinterest standard event, republish the tag, migrate campaigns and audiences onto the standard event, and archive the custom event once dependents have moved. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-duplicate-events', 'pinterest-similar-event-names', 'pinterest-ecommerce-funnel'],
  },
  {
    id: 'pinterest-zero-volume-events',
    name: 'Pinterest Zero Volume Active Events',
    source: 'pinterest',
    severity: 'warning',
    summary: 'Active Pinterest events show zero recorded volume in Events Manager.',
    directAnswer:
      'Pinterest Events Manager lists these events as active, but the volume column reads zero. The configuration is published. The event is wired up. Something between the site and Pinterest is silently dropping the call, or the event was never connected to a real user action in the first place. Either way, any campaign optimizing against the event is bidding for an outcome Pinterest cannot see.',
    why: 'A zero-volume active event has three usual causes, and the first audit task is figuring out which one applies.\n\nThe first is a trigger that does not match the real page. The tag is published, but the GTM trigger condition (URL contains, click on selector, dataLayer event name) never matches what the site actually emits. Order confirmation pages get redesigned and the trigger URL pattern goes stale. PDP add-to-cart selectors get renamed by a theme update. The tag still loads on every page; the event call inside it never executes.\n\nThe second is a tag blocked by consent or by an ad blocker before the event call runs. Consent platforms that gate the Pinterest Tag will allow the base script to load but suppress the `track` call indefinitely if the user has not granted consent or if the consent state never resolves. Ad blockers do the same thing at the network level.\n\nThe third is a renamed event that no longer matches the trigger code. Someone renamed the event in Events Manager from `Checkout` to `Purchase` to align with internal language, but the site code still calls `pintrk(\'track\', \'Checkout\', ...)`. Both sides exist; they do not point at each other.\n\nIn every case, the campaign optimizing against the event sees zero conversions and has no signal to learn from.',
    howToFix:
      '1. For each zero-volume event, identify the intended trigger (page URL, user action, dataLayer event) and confirm the trigger fires on the live site using Tag Manager preview or browser devtools. 2. Inspect the network panel during the expected user flow and look for the Pinterest `track` call carrying the event name. If the call never appears, the trigger is the problem. If it appears but Events Manager shows zero, the event name on the call does not match the event configured in Events Manager. 3. Check the consent platform integration to confirm the Pinterest Tag and its `track` calls execute after consent is granted. 4. Reconcile the site code event name with the Events Manager event name exactly. 5. Re-fire the event and confirm Events Manager registers volume within minutes; wait 24 hours and verify campaign optimization begins seeing the event.',
    example: 'Active in Events Manager: Checkout (0 volume)\nSite code: pintrk(\'track\', \'checkout\', ...)  // lowercase, no match\nFix:       pintrk(\'track\', \'Checkout\', ...)',
    citationTemplate:
      'This Pinterest Tag has events listed as active in Events Manager with zero recorded volume. Pinterest only counts an event when the `track` call from the site matches the configured event name exactly and the call reaches the Pinterest endpoint. Zero-volume active events typically indicate a trigger condition that no longer matches the live site, a consent platform suppressing the call indefinitely, an ad blocker dropping the request at the network layer, or a name mismatch between the published event and the site code. Any campaign or audience optimizing against the event has no signal to learn from while spend continues, producing reporting that shows zero conversions even when the underlying user action occurs on the site. Fix: confirm the trigger fires on the live site, inspect the network panel for the Pinterest `track` call during the expected user flow, reconcile event name strings between site code and Events Manager, and verify the consent integration releases the call after consent is granted. Source: help.pinterest.com/en/business/article/install-the-pinterest-tag.',
    references: [
      {
        label: 'Pinterest. Install the Pinterest Tag',
        url: 'https://help.pinterest.com/en/business/article/install-the-pinterest-tag',
      },
      {
        label: 'Pinterest. Conversions API',
        url: 'https://developers.pinterest.com/docs/conversions/conversion-management/',
      },
      {
        label: 'Pinterest. Conversions API getting started',
        url: 'https://developers.pinterest.com/docs/conversions/getting-started/',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['pinterest-duplicate-events', 'pinterest-similar-event-names', 'pinterest-conversion-api-parity'],
  },
  {
    id: 'twitter-event-id-format',
    name: 'Twitter/X Event ID Format',
    source: 'twitter',
    severity: 'critical',
    summary: 'Twitter/X website events do not use the expected tw-XXXX-XXXX event ID format.',
    directAnswer:
      'One or more X Pixel events on this site are firing with an event ID that does not match the `tw-XXXXX-XXXXX` shape X expects. The pixel still loads. The request still goes out. But the event ID is the routing key X uses to decide which configured conversion the hit belongs to. A malformed ID routes nowhere, so the Purchase you can see in the network tab never lands against the Purchase event you set up in Events Manager.',
    why: 'When you configure a website event in X Ads Events Manager (PageView, ContentView, Search, AddToCart, AddToWishlist, CheckoutInitiated, Purchase, Lead, SignUp, Subscribe), X mints an event tag ID for it. That ID is the second argument in `twq(\'event\', \'tw-XXXXX-XXXXX\', {...})`. The pixel runtime parses it, matches it against your account\'s registered event tags, and only then attributes the hit. There is no fallback. If the string is `abc123-def456`, or `TW-abc123`, or somebody pasted a campaign ID in by mistake, the call fires cleanly and the conversion never lands.\n\nThis is the easiest Twitter/X measurement bug to ship and the hardest to notice. Your tag manager preview shows a 200. Your Network tab shows a request to the X analytics endpoint. The pixel helper goes green. The only place the failure surfaces is Events Manager, where the event volume column sits at zero while the site is clearly producing the action. Teams usually catch this weeks in, after a campaign launches against an event with no signal and the optimizer has nothing to bid against.\n\nThe other variant is hand-typing IDs into a GTM template, or pulling them through a Lookup Table that got edited by someone who did not realise the format mattered. Both produce the same outcome.',
    howToFix:
      '1. Open X Ads Events Manager and copy the event tag ID directly from the UI for each configured event. Do not retype. 2. Paste each ID into the corresponding tag (GTM template variable, hardcoded snippet, server-side template). Confirm every active conversion uses a `tw-` prefix followed by two hex-style segments. 3. If you route IDs through a Lookup Table or Data Layer Variable, audit the mapping table against Events Manager and remove any rows that do not match the expected shape. 4. Fire a test conversion in GTM Preview or a staging Purchase, and confirm the outgoing request payload carries the same ID Events Manager shows. 5. Re-check Events Manager 30 to 60 minutes later and confirm the event count for that conversion ticked up.',
    example: 'Expected: tw-o1234-abcde\nProblem variants:\n  o1234-abcde (no tw- prefix)\n  TW abc123 def456 (spaces, wrong case)\n  tw-o1234 (truncated)\n  9876543210 (campaign ID pasted by mistake)',
    citationTemplate:
      'Your X Pixel is firing website events with IDs that do not match the platform-required `tw-XXXXX-XXXXX` format. Per X Ads Help Center documentation on the website tag and event tags, every configured website event is assigned a `tw-`-prefixed identifier in Events Manager, and the pixel uses that exact string as the routing key for attribution. Events fired with malformed IDs execute at the network layer but never land against the intended conversion, producing zero-volume events in Events Manager while site activity continues. The failure mode is invisible from the browser side and only surfaces in platform reporting, which means campaigns can launch against an event with no signal before anyone notices. Fix: copy event tag IDs directly from X Ads Events Manager into each pixel call or GTM template, audit any lookup tables that mediate the mapping, and verify a test conversion lands against the expected event before relying on the data for bidding. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-conversion-id-required', 'twitter-deduplication-conversion-id'],
  },
  {
    id: 'twitter-deduplication-conversion-id',
    name: 'Twitter/X conversion_id Deduplication',
    source: 'twitter',
    severity: 'warning',
    summary: 'Twitter/X conversion events are missing or reusing conversion_id values.',
    directAnswer:
      'Your X Pixel events either ship without a `conversion_id`, or they ship with `conversion_id` values that repeat across distinct orders. Either pattern breaks the dedupe contract. Missing IDs let the same Purchase get counted twice when the browser tag and the Conversions API both fire. Repeated IDs collapse two different orders into one event. Both directions break your reported Purchase count and the value attached to it.',
    why: 'X uses `conversion_id` (sometimes paired with `event_id`) to recognise that a browser hit and a server hit describe the same business event. The dedupe window inside X looks for matching `conversion_id` on the same configured event tag and merges them. When the browser pixel fires a Purchase with `conversion_id: "10492"` and your Conversions API call fires the same Purchase with `conversion_id: "10492"`, X keeps one record. When the browser sends `conversion_id: "10492"` and the server sends nothing, X has no basis to merge and you get two Purchases. When two different orders both send `conversion_id: "ORDER"` because somebody hard-coded a literal, X collapses them into one and your Purchase volume drops by exactly the duplicate rate.\n\nThe stable pattern is to derive `conversion_id` from a per-event identifier you already have. Order ID for Purchase. Lead ID for Lead. Subscription ID for Subscribe. Then pass that same value from every path that reports the same event. The audit pain comes from teams that wire the browser tag and the CAPI integration separately, using different generators, so the IDs never match even when they are both populated.\n\nFor accounts running browser-only with no CAPI yet, `conversion_id` still matters because retries and double-firing inside the page can produce duplicates that dedupe against the same identifier.',
    howToFix:
      '1. Pick a stable per-event identifier. Order ID for Purchase, Lead ID for Lead, Subscription ID for Subscribe. Avoid timestamps, session IDs, or literals like "ORDER". 2. Update the browser pixel call so every conversion event passes the identifier as `conversion_id` in the parameters object, for example `twq(\'event\', \'tw-XXXXX-XXXXX\', { conversion_id: orderId, value: 129.00, currency: \'USD\' })`. 3. Update your Conversions API or server-side tag to send the same `conversion_id` on the same event for the same order. The browser value and the server value must be byte-for-byte identical. 4. Audit recent events in Ads Events Manager. Look for events with no `conversion_id` and for `conversion_id` values that repeat across different timestamps or users. 5. Validate by completing one test Purchase and confirming Events Manager reports a single deduped event rather than two.',
    example: 'Purchase order 10492\n  Browser: twq(\'event\', \'tw-o1234-abcde\', { conversion_id: \'10492\', value: 129.00, currency: \'USD\' })\n  Server (CAPI): { event: \'Purchase\', conversion_id: \'10492\', value: 129.00, currency: \'USD\' }\nResult in Events Manager: 1 deduped Purchase, value $129.00',
    citationTemplate:
      'Your X Pixel conversion events are missing `conversion_id` values or reusing the same `conversion_id` across distinct transactions. Per X Ads Help Center documentation on website conversion tracking and the web event tags reference, `conversion_id` is the deduplication key X uses to merge matching browser and server-side events for the same business action. Missing IDs prevent the merge and produce double-counting when browser and Conversions API both fire, while repeated IDs collapse distinct events into one. Both patterns distort Purchase volume and reported conversion value, which then feeds back into optimisation. Fix: derive `conversion_id` from a stable per-event identifier such as order ID, pass the identical value from both browser and server paths for the same event, and verify in Ads Events Manager that a test transaction dedupes to a single record. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking tag',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-tag.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-conversion-id-required', 'twitter-event-id-format'],
  },
  {
    id: 'twitter-conversion-id-required',
    name: 'Twitter/X conversion_id Required',
    source: 'twitter',
    severity: 'critical',
    summary: 'Active X Pixel conversion events are firing without a conversion_id parameter.',
    directAnswer:
      'One or more active X Pixel conversion events on this site are firing without a `conversion_id` value in the parameters object. The event still reaches X, but X has no key to use when it later tries to merge that hit with a matching server-side event or a duplicate browser hit. The first time the page reloads, or the first time your Conversions API integration sends the same Purchase, you start double-counting.',
    why: 'Every X Pixel conversion call (Purchase, Lead, SignUp, Subscribe, CheckoutInitiated, AddToCart, AddToWishlist) accepts a `conversion_id` parameter. X uses it as the deduplication key. The contract is simple: if two events arrive on the same configured event tag with the same `conversion_id`, X keeps one. If `conversion_id` is missing, X has nothing to compare against and treats every hit as a fresh conversion.\n\nFor browser-only setups this still bites. A user reloads the confirmation page and your Purchase fires twice. A SPA route change triggers the tag a second time. Your reported Purchase count drifts above truth and the value attached drifts with it. For accounts that also run a server-side Conversions API integration, the impact is larger: every successful merge depends on `conversion_id` being present on both legs. Without it, the browser Purchase and the server Purchase both land in Events Manager as separate records.\n\nThe symptom you see in Ads Events Manager is a Purchase count that runs ahead of the order count in your commerce platform, often by a clean 1.5x to 2x multiple. The cause is almost always a tag that was wired up before `conversion_id` got added to the spec.',
    howToFix:
      '1. Pick a stable per-event identifier you already have on the page: order ID for Purchase, lead ID for Lead, subscription ID for Subscribe. 2. Update every active conversion tag so the parameters object includes `conversion_id`, for example `twq(\'event\', \'tw-XXXXX-XXXXX\', { conversion_id: orderId, value: 129.00, currency: \'USD\' })`. 3. Confirm GTM variables, hardcoded snippets, and any server-side tag template all read from the same source. 4. Fire a test conversion and inspect the outgoing request payload in the Network tab to confirm `conversion_id` is populated. 5. After 30 to 60 minutes, check Ads Events Manager and verify the event count tracks your real order count rather than running ahead of it.',
    example: 'Broken:\n  twq(\'event\', \'tw-o1234-abcde\', { value: 129.00, currency: \'USD\' })\nFixed:\n  twq(\'event\', \'tw-o1234-abcde\', { conversion_id: \'10492\', value: 129.00, currency: \'USD\' })',
    citationTemplate:
      'Your active X Pixel conversion events are firing without `conversion_id` in the parameters payload. Per X Ads Help Center documentation on conversion tracking for websites and the web event tags reference, `conversion_id` is the key X uses to deduplicate matching events across browser reloads, SPA re-fires, and any parallel Conversions API path. When the field is absent, X treats every hit as a distinct conversion, which inflates Purchase or Lead counts and pushes reported value above the real order book. The drift typically appears as a clean multiple over the commerce-platform truth, and it feeds directly into bidding once optimisation runs against the same event. Fix: pass a stable per-event identifier such as order ID as `conversion_id` on every X Pixel conversion call, mirror the same value on any server-side path for the same event, and verify in Ads Events Manager that the deduped count tracks your real order count. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking tag',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-tag.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-deduplication-conversion-id', 'twitter-event-id-format'],
  },
  {
    id: 'twitter-conversion-window-mismatch',
    name: 'Twitter/X Conversion Window Mismatch',
    source: 'twitter',
    severity: 'warning',
    summary: 'X Pixel events use conversion windows that do not match campaign settings or the real sales cycle.',
    directAnswer:
      'One or more X Pixel events on this account are reporting on a conversion window that does not line up with the window set at the campaign level, or the window is shorter than the sales cycle you actually run. The result is reporting that cuts off valid conversions, which then feeds back into optimisation and makes campaigns look worse than they are.',
    why: 'X conversion tracking supports post-click windows of 1, 7, 14, 30, and 90 days, plus view-through windows of 1 and 7 days. When an event-level window is shorter than the campaign-level window, the campaign sees fewer conversions than the event recorded, and your ROAS column reads low. When the event-level window is longer than the campaign window, the opposite happens and the totals do not reconcile across views.\n\nThe second variant is a window that is honest about itself but mismatched to the business. A 7-day post-click window on a B2B SaaS account with a 45-day median sales cycle truncates the majority of real conversions. Optimisation runs against the short tail it can see, learns from the wrong signal, and bids accordingly. The account does not look broken in Events Manager because the events that do land look clean. The damage is in everything that never got attributed.\n\nMismatches usually appear after a window change at one level (event or campaign) that was not mirrored at the other, or after a campaign was duplicated from a template that predates a window policy update.',
    howToFix:
      '1. In X Ads Events Manager, list every active conversion event and note the attribution window on each. 2. Open every campaign that optimises against those events and compare the campaign window to the event window. Resolve mismatches by setting both to the same value. 3. Pick the window from the real sales cycle, not from a template. Ecommerce checkout typically lives at 1 or 7 days post-click. Considered B2B purchases usually need 30 to 90 days. 4. Document the chosen window per event in the measurement plan so future campaign duplications inherit the right setting. 5. After changing windows, allow at least one full cycle of new data before judging the impact, since historical conversions are not reattributed.',
    example: 'Event Purchase: 7-day post-click attribution window\nCampaign optimising Purchase: 1-day post-click attribution window\nResult: campaign reports fewer Purchases than Events Manager, ROAS reads low.',
    citationTemplate:
      'Your X Pixel events are configured with conversion windows that do not align with the matching campaign settings, or the windows are shorter than the real sales cycle for this business. Per X Ads Help Center documentation on conversion tracking for websites, attribution windows are configurable per event and per campaign across the supported post-click options of 1, 7, 14, 30, and 90 days plus view-through options of 1 and 7 days, and reporting only counts conversions that fall inside the configured window. A mismatch between event and campaign settings produces reports that fail to reconcile across views, and a window that is shorter than the sales cycle truncates valid conversions and skews optimisation toward the short tail that the platform can see. Fix: align the event-level and campaign-level windows for every conversion event, pick the window from the real sales cycle rather than the template default, and document the chosen window per event so future campaign duplications inherit it. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-missing-conversion-events', 'twitter-zero-volume-events'],
  },
  {
    id: 'twitter-duplicate-events',
    name: 'Twitter/X Duplicate Event Names',
    source: 'twitter',
    severity: 'warning',
    summary: 'Multiple X Pixel events share the same name.',
    directAnswer:
      'Two or more X Pixel event tags on this account share the same name. Each tag is a separate event in Events Manager with its own event tag ID, but they all report against the same label. Volume splits across them, optimisation cannot tell which one to learn from, and the reporting view aggregates two distinct configurations into one row.',
    why: 'Event names in X Ads Events Manager are display labels. The actual routing key is the `tw-XXXXX-XXXXX` event tag ID, and X is happy to issue multiple IDs that share a label. That makes accidental duplication easy: someone creates a new Purchase event for a redesigned checkout, the old Purchase event stays active, and traffic now splits between two tags that both call themselves Purchase.\n\nThe consequence is that Events Manager and the campaign reporting view aggregate by name, which hides the split. The two tags each look healthy on their own, but neither carries the full conversion volume. Optimisation runs against one tag and ignores the other, so the bidder learns from half the signal. If the two tags have slightly different parameter shapes (one passes `value`, the other does not), reported revenue lurches based on which tag the request happened to hit.\n\nThe second variant is two different teams instrumenting the same action: the agency wires a Purchase tag through GTM, the engineering team wires another through the server. Both fire on the same checkout. Both call themselves Purchase. Volume doubles in the merged view.',
    howToFix:
      '1. List every active event in Ads Events Manager and group by event name. 2. For each duplicated name, decide which event tag ID is the canonical one and which should be retired. Prefer the tag with cleaner parameters and the integration you trust. 3. Remove the duplicate tag from the source where it is wired (GTM, hardcoded snippet, server template). Do not just pause the event in Events Manager; the tag will keep firing and producing zero-volume noise. 4. Update any campaign that optimises against the retired tag to point at the canonical one. 5. Verify in Events Manager that volume on the canonical tag now reflects the full real conversion count and the retired tag drops to zero.',
    example: 'Active events:\n  Purchase (tw-o1234-abcde): 412 events\n  Purchase (tw-o5678-fghij): 388 events\nReal order count in commerce platform: 800\nReporting view: 800 Purchases (correct in aggregate, wrong for optimisation)',
    citationTemplate:
      'Your X Pixel account has multiple active event tags sharing the same event name. Per X Ads Help Center documentation on the website tag and conversion tracking for websites, each event in Events Manager is uniquely identified by its `tw-XXXXX-XXXXX` event tag ID, while the event name is only a display label, which allows distinct tags to share a label and split traffic between them. The reporting view aggregates by name, so the split hides until you inspect Events Manager directly, and optimisation can only learn from one tag at a time, which means the bidder is trained on roughly half the conversion signal. If parameter shapes differ between the duplicates, reported value also lurches between them. Fix: pick a canonical event tag per business action, remove the duplicate tag at its source rather than only pausing it in Events Manager, point every campaign at the canonical tag, and confirm full conversion volume now lands against one event. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-similar-event-names', 'twitter-zero-volume-events'],
  },
  {
    id: 'twitter-engagements-vs-conversions',
    name: 'Twitter/X Engagements Used Instead of Conversions',
    source: 'twitter',
    severity: 'critical',
    summary: 'The active X Pixel events are Tweet engagement metrics rather than website conversion events.',
    directAnswer:
      'The active events on this X Pixel are all Tweet engagement style metrics (Tweet engagements, Retweets, Likes, Replies) rather than website conversion events. Engagement metrics measure activity on X itself. They do not measure what people do on the site after the click. With no website conversion event configured, campaigns cannot optimise toward Purchase, Lead, SignUp, or any business outcome.',
    why: 'X Ads supports two parallel measurement surfaces. Tweet engagement metrics come from the platform itself and describe interactions with the ad creative (a Retweet, a Like, a profile visit). Website conversion events come from the X Pixel and describe what the user did after landing on the site (PageView, ContentView, Search, AddToCart, AddToWishlist, CheckoutInitiated, Purchase, Lead, SignUp, Subscribe).\n\nOptimising a campaign against an engagement metric tells X to find people who tend to engage with Tweets. That is a different audience from people who tend to convert on a site, and the gap shows up immediately in ROAS once the campaign runs at scale. The account looks instrumented because events are firing, but the events that are firing have no relationship to the business outcome the spend is supposed to produce.\n\nThe usual cause is a setup that started with engagement objectives, kept the engagement events live, and never added a website conversion event when the goal shifted to performance. The pixel is installed, the JavaScript loads, but the configured event tags in Events Manager are still the engagement set.',
    howToFix:
      '1. Decide which website action you want X to optimise toward: Purchase, Lead, SignUp, Subscribe, or another supported event type. 2. In Ads Events Manager, create the matching event tag and copy its `tw-XXXXX-XXXXX` ID. 3. Wire the tag on the site so the conversion fires with parameters appropriate to the event (`value`, `currency`, `conversion_id`, plus event-type-specific fields). 4. Let the event accrue at least the minimum volume X recommends for stable optimisation, typically a few dozen events per week per ad group, before relying on it for bidding. 5. Switch any active campaign optimisation goal from the engagement metric to the new website conversion event, and monitor for at least one full learning phase before re-tuning bids.',
    example: 'Active events: Tweet engagements, Likes, Retweets\nMissing: Purchase, Lead, SignUp, Subscribe\nCampaign optimisation goal: Tweet engagements\nResult: bidder targets engagers, not buyers; ROAS sits below baseline.',
    citationTemplate:
      'This X Pixel has only Tweet engagement metrics active and no website conversion events configured. Per X Ads Help Center documentation on the X Pixel and conversion tracking for websites, engagement metrics are platform-side measurements of interaction with the ad creative and are distinct from website conversion events such as Purchase, Lead, SignUp, Subscribe, AddToCart, CheckoutInitiated, ContentView, and PageView, which are emitted by the X Pixel on the destination site. Optimising a campaign against an engagement metric tells X to find users who engage with Tweets rather than users who convert on the site, which is a different audience and produces poor ROAS once spend scales. Fix: create the website conversion event that matches the business outcome in Ads Events Manager, wire the corresponding `tw-XXXXX-XXXXX` event tag on the site with the right parameters, let the event accrue volume, and switch campaign optimisation goals from the engagement metric to the new conversion event. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-missing-conversion-events', 'twitter-purchase-missing-value'],
  },
  {
    id: 'twitter-missing-conversion-events',
    name: 'Twitter/X Missing Conversion Events',
    source: 'twitter',
    severity: 'critical',
    summary: 'No website conversion events are configured on this X Pixel.',
    directAnswer:
      'This X Pixel has no active website conversion events. The pixel itself may load fine, but Events Manager has nothing configured that maps to a business outcome (Purchase, Lead, SignUp, Subscribe, CheckoutInitiated, AddToCart, AddToWishlist, ContentView, Search). Campaigns running against this account have no conversion signal to optimise toward and no way to report ROAS or cost per acquisition.',
    why: 'The X Pixel is two layers. The base pixel handles page load and identifies the user. The website event tags, each with a `tw-XXXXX-XXXXX` ID, are what carry the conversion signal. Without at least one conversion event tag, the pixel is effectively a PageView counter. You can build retargeting audiences and that is about it.\n\nThe optimiser cannot run conversion bidding without a conversion event to optimise against. The reporting view cannot produce a meaningful cost per Purchase or cost per Lead column because nothing is feeding it. Campaign managers usually notice this when they try to set an optimisation goal and find no eligible events in the dropdown, or when reports show clicks and engagements but a blank conversion column.\n\nThe fix is to install at least one event that maps to the business outcome the spend is justified by. Ecommerce should have Purchase, plus AddToCart and CheckoutInitiated for funnel diagnostics. Lead gen should have Lead, plus the relevant upstream events such as ContentView and Search. SaaS should have SignUp or Subscribe.',
    howToFix:
      '1. Identify the single business outcome that justifies ad spend on this account (the one number you would report to the CFO). 2. In Ads Events Manager, create the matching website event tag (Purchase, Lead, SignUp, or Subscribe) and copy its `tw-XXXXX-XXXXX` ID. 3. Wire the tag on the site at the moment of the action, with the right parameters: `conversion_id`, plus `value` and `currency` for revenue events. 4. If the funnel is multi-step, also configure the upstream events (AddToCart, CheckoutInitiated, ContentView, Search) so you can diagnose drop-off and build optimisation audiences. 5. Validate one real event end-to-end and confirm it lands in Events Manager. Then switch campaign optimisation goals to the new event.',
    example: 'Configured events: PageView only\nMissing: Purchase, Lead, SignUp, Subscribe, AddToCart, CheckoutInitiated\nResult: campaigns cannot run conversion optimisation; reporting has no CPA column.',
    citationTemplate:
      'This X Pixel has no active website conversion events configured. Per X Ads Help Center documentation on the X Pixel and conversion tracking for websites, the pixel\'s base script handles page load and identification, while the website event tags carry the conversion signal that campaigns optimise against, including Purchase, Lead, SignUp, Subscribe, CheckoutInitiated, AddToCart, AddToWishlist, ContentView, and Search. Without at least one conversion event tag, the pixel is a PageView counter and a retargeting source, and campaigns cannot run conversion bidding or report cost per acquisition. Fix: identify the business outcome that justifies the ad spend, create the matching event tag in Ads Events Manager, wire the `tw-XXXXX-XXXXX` ID on the site at the moment of the action with `conversion_id` and (for revenue events) `value` and `currency`, validate one real event end to end, and switch campaign optimisation goals to the new event. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-engagements-vs-conversions', 'twitter-purchase-missing-value'],
  },
  {
    id: 'twitter-purchase-missing-value',
    name: 'Twitter/X Purchase Missing Value',
    source: 'twitter',
    severity: 'critical',
    summary: 'X Pixel Purchase or Checkout events are firing without value data.',
    directAnswer:
      'Your X Pixel Purchase or CheckoutInitiated events are firing with no `value` parameter (or a value of zero) while the event count is non-zero. The conversions land in Events Manager, but X has no revenue to attach to them, so the ROAS column reads zero and value-based bidding has nothing to optimise toward.',
    why: 'X Pixel revenue events accept `value` and `currency` parameters on the call: `twq(\'event\', \'tw-XXXXX-XXXXX\', { value: 129.00, currency: \'USD\', conversion_id: orderId })`. Both fields are required for the platform to produce a revenue number. Missing `value` means every Purchase is treated as a unit conversion with no revenue weight. Missing `currency` means X cannot normalise across markets, and the reporting view falls back to the account default, which may not be what the order actually transacted in.\n\nThe symptom is a Purchase column that ticks up in volume while the Revenue column stays at zero or sits suspiciously low. ROAS reads as zero or undefined. Value-based bidding strategies cannot run because there is no value signal to bid against, so the optimiser silently degrades to volume optimisation. Mixed-basket businesses (some $20 orders, some $400 orders) lose the ability to bid higher for higher-value carts, which is usually the reason the value parameter was supposed to be there in the first place.\n\nThe usual cause is a tag template that was wired with `value` mapped to a Data Layer Variable that does not actually carry the cart total at the moment Purchase fires, or a hardcoded snippet that omits the parameter entirely.',
    howToFix:
      '1. Identify the source of truth for cart total at the Purchase moment: the order confirmation Data Layer object, the server-rendered template variable, or the commerce platform webhook. 2. Update the Purchase tag so `value` reads that source and `currency` reads the actual transaction currency (ISO 4217 code, for example `USD`, `EUR`, `GBP`). 3. Mirror the same value on any Conversions API call for the same order so server and browser agree. 4. Fire a test Purchase and confirm the outgoing request payload carries the correct numeric `value` and the right `currency` string. 5. After data lands in Events Manager, verify Revenue and ROAS columns populate and the per-order average matches your commerce platform AOV.',
    example: 'Broken:\n  twq(\'event\', \'tw-o1234-abcde\', { conversion_id: \'10492\' })\nFixed:\n  twq(\'event\', \'tw-o1234-abcde\', { conversion_id: \'10492\', value: 129.00, currency: \'USD\' })',
    citationTemplate:
      'Your X Pixel Purchase or CheckoutInitiated events are firing with non-zero volume but no `value` parameter. Per X Ads Help Center documentation on conversion tracking for websites and the web event tags reference, revenue events accept `value` and `currency` parameters and both are required for the platform to attach revenue to a conversion, normalise across markets, and feed value-based bidding strategies. With value missing, every Purchase is recorded as a unit conversion, the Revenue and ROAS columns stay empty, and value-based optimisation degrades to volume optimisation, which costs mixed-basket businesses the ability to bid higher on higher-value carts. Fix: map `value` to the cart total source of truth at the Purchase moment, set `currency` to the actual transaction currency in ISO 4217 form, mirror the same values on any Conversions API path for the same order, and verify Events Manager reports a Revenue figure that matches commerce platform AOV. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html.',
    references: [
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking tag',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-tag.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-conversion-id-required', 'twitter-missing-conversion-events'],
  },
  {
    id: 'twitter-similar-event-names',
    name: 'Twitter/X Similar Event Names',
    source: 'twitter',
    severity: 'info',
    summary: 'X Pixel events have near-duplicate names that may describe the same action.',
    directAnswer:
      'Two or more X Pixel events on this account have names that look like minor variations of each other (Purchase and Purchases, SignUp and Sign Up, Lead and Leads). Each is a distinct event in Events Manager with its own `tw-XXXXX-XXXXX` ID, but they likely describe the same business action and split volume between them. Reporting and optimisation both suffer when the same conversion is reported under two near-identical labels.',
    why: 'X does not normalise event names. Whatever was typed in Events Manager is what appears in the reporting view. A misspelling, a casing difference, or a pluralisation produces a separate row, and the underlying tags route independently. Volume on the action splits across the rows in proportion to which tag actually fired, which is usually a function of which integration was wired most recently.\n\nThe optimisation impact is the same as the duplicate-name case: the bidder learns from one tag at a time, so it sees roughly half the real conversion signal. The reporting impact is worse: the rows do not aggregate in the standard view because the names are not identical, so the user comparing performance across periods may see a sudden drop that is actually just a renamed tag.\n\nCommon variants worth catching: trailing whitespace, capitalisation drift (`Purchase` vs `purchase`), pluralisation (`Lead` vs `Leads`), spacing (`SignUp` vs `Sign Up`), and translation drift on multi-market accounts (`Achat` and `Purchase` describing the same checkout).',
    howToFix:
      '1. Review the flagged pairs and decide for each whether the two events are the same action under different labels or genuinely distinct. 2. For pairs that describe the same action, pick a canonical event tag (the one with cleaner parameter coverage and the integration you trust) and retire the other at its source. 3. Update any campaigns pointing at the retired tag to optimise against the canonical one. 4. Standardise on a naming convention (PascalCase, no plurals, no spaces) and document it so future event creation does not re-introduce the drift. 5. Verify in Events Manager that the canonical tag now carries the full real conversion volume.',
    example: 'Flagged pair:\n  Purchase (tw-o1234-abcde)\n  Purchases (tw-o5678-fghij)\nLikely the same action; volume splits between them; reporting view shows two rows.',
    citationTemplate:
      'Your X Pixel account has multiple event tags with near-duplicate names that likely describe the same business action. Per X Ads Help Center documentation on the X Pixel and conversion tracking for websites, event names in Events Manager are free-text display labels with no platform-level normalisation, while routing happens on the underlying `tw-XXXXX-XXXXX` event tag ID, which means a casing, spacing, or pluralisation difference produces two separate rows that report and optimise independently. Volume on the action splits between them, the bidder learns from one tag at a time, and period-over-period reports can mistake a renamed tag for a drop in performance. Fix: pick a canonical event tag per business action, retire near-duplicates at their source rather than only pausing them, repoint campaigns at the canonical tag, and adopt a naming convention (PascalCase, no plurals, no spaces) so future event creation does not re-introduce drift. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-duplicate-events', 'twitter-zero-volume-events'],
  },
  {
    id: 'twitter-zero-volume-events',
    name: 'Twitter/X Zero Volume Active Events',
    source: 'twitter',
    severity: 'warning',
    summary: 'X Pixel events are marked active but have zero recorded volume.',
    directAnswer:
      'One or more X Pixel event tags on this account are marked active in Events Manager but have recorded zero events over the reporting window. Either the tag is wired but the trigger never fires on the site, the tag is being blocked, the tag is firing with a malformed event ID, or the underlying user activity does not actually exist. None of these are good states for a tag that campaigns may be optimising against.',
    why: 'An active event in Events Manager with zero volume is a measurement liability. If a campaign is optimising against that event, the bidder has no signal and either fails to spend or spends without a meaningful target. If no campaign is optimising against it yet but one is planned, launch day starts from a cold pixel with no learnings.\n\nThe usual root causes:\n\n1. Tag is wired but the trigger condition never matches. A Purchase tag attached to a thank-you page selector that changed after a redesign. A SignUp tag tied to a form submit listener that the new framework no longer dispatches.\n\n2. Tag is firing but the event ID is malformed, so X drops the hit. This is the failure mode the `twitter-event-id-format` check catches separately, and the symptom in Events Manager is identical: zero volume.\n\n3. Request is being blocked. Tracking protection in the user\'s browser, a CSP that does not allow the X analytics endpoint, or a network-level block at the visitor side.\n\n4. The underlying business activity does not exist. The site does not currently have any of the configured action happening, for example a CheckoutInitiated event on a site that has no checkout flow in production yet.\n\nDistinguishing between these requires checking the tag on the site, the outgoing request, and the business funnel separately.',
    howToFix:
      '1. For each zero-volume active event, fire the user action on the site in a clean browser and watch the Network tab for the outgoing request to the X analytics endpoint. 2. If no request fires, the tag is not triggering. Re-validate the trigger condition (selector, event listener, Data Layer push) against the current site. 3. If the request fires but Events Manager still shows zero, inspect the event ID in the payload and confirm it matches the `tw-XXXXX-XXXXX` ID registered for that event. 4. If the request and ID are both correct, check for tracking protection or CSP blocks by repeating the test in a different browser without extensions. 5. If the tag is genuinely correct and there is simply no traffic doing that action, either pause the event to keep Events Manager clean or accept the zero state until the funnel produces activity.',
    example: 'Active events with zero volume over last 7 days:\n  Purchase (tw-o1234-abcde)\n  AddToCart (tw-o5678-fghij)\nReal orders in commerce platform same period: 220\nLikely cause: thank-you page selector changed in last release; tag trigger no longer matches.',
    citationTemplate:
      'Your X Pixel has active event tags reporting zero volume over the audit window. Per X Ads Help Center documentation on the X Pixel and conversion tracking for websites, an active event in Events Manager with no recorded volume indicates one of four failure modes: the tag trigger never matches because of a site change, the tag fires but the event ID does not match a registered `tw-XXXXX-XXXXX` tag, the outbound request is blocked by browser tracking protection or CSP, or the underlying business activity does not currently exist on the site. Any of these leaves campaigns that optimise against the event without a signal, and a planned campaign launch against a cold pixel will start with no learnings. Fix: replay the action on the site in a clean browser, inspect the outbound request for both presence and a correct event ID, repeat in a CSP- and extension-free environment, and either repair the trigger, correct the ID, or pause the event if no real activity exists yet. Source: business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html.',
    references: [
      {
        label: 'X Ads Help Center. The X Pixel',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/twitter-pixel.html',
      },
      {
        label: 'X Ads Help Center. Conversion tracking for websites',
        url: 'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
      },
      {
        label: 'X Developer Platform. Web event tags reference',
        url: 'https://developer.x.com/en/docs/twitter-ads-api/measurement/api-reference/web-event-tags',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['twitter-event-id-format', 'twitter-duplicate-events'],
  },
  {
    id: 'snapchat-pixel-id-format',
    name: 'Snap Pixel ID Format',
    source: 'snapchat',
    severity: 'critical',
    summary: 'The Snap Pixel ID is missing or does not match the expected UUID-style format.',
    directAnswer:
      'Your Snap Pixel ID is missing, truncated, or does not match the UUID shape Snapchat issues (e.g. `12345678-1234-1234-1234-123456789012`). Until the ID is correct, your `snaptr(\'init\', ...)` call routes events to nothing. PAGE_VIEW and PURCHASE will appear to fire in the browser, but Snapchat Events Manager will not see them, and the ad account they are supposed to feed will sit empty.',
    why: 'The Snap Pixel snippet starts with `snaptr(\'init\', \'<PIXEL_ID>\')` and every subsequent `snaptr(\'track\', ...)` call binds to whatever ID that init received. Snapchat issues Pixel IDs in a UUID v4 shape: eight hex, four hex, four hex, four hex, twelve hex, separated by hyphens. Anything else is a copy-paste error or a leftover placeholder from a code sample.\n\nWhen the ID is wrong, the JavaScript still executes. `snaptr` is defined, the queue receives the call, the request leaves the browser. Snapchat just drops the event because no Pixel claims that ID. Events Manager shows zero traffic. Your audiences never populate. CAPI events may still arrive on the server side under a different ID, so the account looks half-broken in a way that is annoying to diagnose.\n\nThe second failure mode is two pixels on one site. A migration leaves the old ID in the GTM tag and the new ID in the Shopify integration. Both fire. Snapchat sees a split account and neither pixel reaches the volume Snap needs for reliable optimisation.',
    howToFix:
      '1. Open Snapchat Ads Manager, go to Events Manager, and copy the Pixel ID directly from the pixel detail page. 2. Search the GTM container, hardcoded site tags, and every commerce integration (Shopify, WooCommerce, BigCommerce) for `snaptr(\'init\'` and confirm a single canonical ID is used everywhere. 3. Validate the shape: 36 characters, four hyphens, lowercase hex. 4. Publish, load a page with the Snap Pixel Helper extension active, and confirm PAGE_VIEW reaches the expected pixel. 5. Fire one PURCHASE through a test order and confirm it appears in Events Manager under the right asset.',
    example: 'Expected shape: 12345678-1234-1234-1234-123456789012\nObserved: 12345678-1234-1234 (truncated)',
    citationTemplate:
      'Your Snap Pixel is initialised with an ID that does not match the UUID format Snapchat issues. Per Snapchat\'s Snap Pixel installation documentation, the Pixel ID must be the exact identifier shown on the pixel detail page in Events Manager, formatted as a UUID (eight-four-four-four-twelve hex characters separated by hyphens). When the ID is malformed or stale, `snaptr` continues to execute in the browser but Snapchat drops the events because no pixel asset claims that identifier, leaving Events Manager empty and audiences unable to populate. Fix: copy the Pixel ID from Events Manager, replace every occurrence in GTM, hardcoded site tags, and commerce integrations, then validate with the Snap Pixel Helper. Source: businesshelp.snapchat.com/s/article/snap-pixel-installation.',
    references: [
      {
        label: 'Snapchat. Snap Pixel installation',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-installation',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-missing-page-view', 'snapchat-capi-dedup-currency'],
  },
  {
    id: 'snapchat-capi-dedup-currency',
    name: 'Snap CAPI, Deduplication, and Currency Alignment',
    source: 'snapchat',
    severity: 'warning',
    summary: 'Snap Pixel and Conversions API events are not aligned on deduplication or currency.',
    directAnswer:
      'Your Snap Pixel and Conversions API (CAPI) are sending the same PURCHASE event from both the browser and the server, but they do not share an `event_id` for deduplication, and the currency on the two payloads does not match. Snapchat ends up counting one order as two conversions, and the value column in Events Manager mixes USD with whatever your CAPI integration is sending, so the totals stop describing a single set of orders.',
    why: 'Snapchat\'s recommended setup runs the browser pixel and CAPI in parallel. The browser is fast and carries client signals (Snap click ID, browser cookies). The server is reliable and carries authoritative order data (true value, hashed PII, transaction ID). To stop them from double-counting the same order, both sides must send a matching `event_id` on each PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT. Snapchat deduplicates on that ID inside a short window and keeps one canonical event.\n\nWhen the IDs do not align, PURCHASE volume inflates roughly 1.7x to 2x depending on CAPI delivery rates. ROAS in Snapchat Ads Manager looks better than it is, and the optimisation engine starts bidding against a signal that is partly hallucinated. The cleanup is painful because historical reports keep the inflated numbers.\n\nCurrency drift is the second problem. If the browser sends `currency: \'USD\'` and CAPI sends `currency: \'EUR\'` (or omits it and Snapchat assumes the account default), the value totals in Events Manager describe an exchange-rate average rather than a real currency. ROAS comparisons across markets become meaningless.',
    howToFix:
      '1. Derive a stable `event_id` from the order ID (or lead ID for SIGN_UP) and send the exact same string on the Snap Pixel `snaptr(\'track\', \'PURCHASE\', { ..., event_id: \'order-10492\' })` call and the CAPI request body. 2. Confirm CAPI volume is actually arriving for PURCHASE, SIGN_UP, and SUBSCRIBE in Events Manager. Browser-only coverage is the default failure mode. 3. Pick one ISO 4217 currency per pixel and pass it explicitly on every value event. Do not rely on account defaults. 4. Run a real test order, watch Events Manager, and confirm one deduplicated PURCHASE appears with the expected value and currency. 5. After 24 hours, check that the deduplication rate in the CAPI diagnostics is above 70 percent.',
    example: 'Browser: snaptr(\'track\', \'PURCHASE\', { event_id: \'order-10492\', price: 129.90, currency: \'USD\' })\nCAPI: { event_name: \'PURCHASE\', event_id: \'order-10492\', price: 129.90, currency: \'USD\' }',
    citationTemplate:
      'Your Snap Pixel and Conversions API are running in parallel without a shared `event_id`, and the currency on the two payloads is inconsistent. Per Snapchat\'s Conversions API documentation, browser and server events representing the same business action must share an `event_id` so Snapchat can deduplicate, and every value-bearing event must pass an explicit ISO 4217 currency. Without deduplication, PURCHASE volume in Ads Manager inflates by the CAPI delivery rate and biases optimisation. Without consistent currency, value totals mix units and ROAS comparisons stop being meaningful. Fix: derive `event_id` from the order ID, send it identically on both sides, pin one currency per pixel, and confirm a deduplication rate above 70 percent in the CAPI diagnostics. Source: marketingapi.snapchat.com/docs/conversion.html.',
    references: [
      {
        label: 'Snapchat. Conversions API overview',
        url: 'https://businesshelp.snapchat.com/s/article/capi-overview',
      },
      {
        label: 'Snapchat Marketing API. Conversions API reference',
        url: 'https://marketingapi.snapchat.com/docs/conversion.html',
      },
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-pixel-id-format', 'snapchat-purchase-missing-value'],
  },
  {
    id: 'snapchat-duplicate-events',
    name: 'Duplicate Snap Event Names',
    source: 'snapchat',
    severity: 'warning',
    summary: 'Two or more Snap Pixel events share the same name, splitting volume across copies.',
    directAnswer:
      'You have multiple Snap Pixel events firing under the same name (for example, two PURCHASE events from a GTM tag and a Shopify integration, or two PAGE_VIEW events from a hardcoded snippet and a tag manager). Snapchat treats each as a separate stream when you optimise against it, which means one business action ends up split across two signals and neither has the volume Snap needs.',
    why: 'Snap Pixel events are keyed by name. When `snaptr(\'track\', \'PURCHASE\', ...)` fires twice for the same order from two different sources, Events Manager logs both. The deduplication mechanism Snap provides is `event_id`, not the event name itself, so name collisions without matching event IDs produce true duplicates rather than dedup candidates.\n\nThe common cause is migrations that leave the old implementation live. A team installs Snap via Shopify, then later adds a GTM container with its own PURCHASE tag for richer parameters. Nobody removes the original. Both fire on the order confirmation page. PURCHASE volume in Ads Manager doubles overnight and ROAS appears to spike before anyone realises it is double counting.\n\nThe second cause is parameter forks. A team wants to test sending extra parameters on PURCHASE, copies the tag, edits the copy, forgets to pause the original. Now half the orders get the new payload and half get both.',
    howToFix:
      '1. Open Events Manager and look at the event list for the affected pixel. Sort by volume and identify names with suspicious traffic spikes. 2. In GTM, search for every tag that calls `snaptr(\'track\', ...)` and document which event names each one fires. 3. Cross-reference with hardcoded site snippets and commerce integrations (Shopify, WooCommerce). Snap is often installed in more than one place. 4. Pick one canonical source per event and pause or delete the duplicates. 5. Reload the affected pages with the Snap Pixel Helper extension and confirm each event fires exactly once per business action.',
    example: 'PURCHASE x 2 (one from Shopify integration, one from GTM)\nPAGE_VIEW x 2 (one hardcoded, one from GTM)',
    citationTemplate:
      'Your Snap Pixel has duplicate event names firing from more than one source for the same business action. Per Snapchat\'s standard events documentation, each business action should map to one event name and one firing source so Ads Manager volume describes real user behaviour rather than instrumentation overlap. Duplicate PURCHASE or PAGE_VIEW events inflate Events Manager totals, distort ROAS, and feed Snap\'s optimisation engine a doubled signal that biases bidding. Deduplication in Snap relies on `event_id`, not name collision, so two tags with the same name and no shared event ID produce true duplicates. Fix: identify every source firing each event name (GTM, hardcoded snippets, Shopify or other commerce integrations), pick one canonical source per event, pause the rest, and verify single-fire behaviour with the Snap Pixel Helper. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-similar-event-names', 'snapchat-capi-dedup-currency'],
  },
  {
    id: 'snapchat-ecommerce-funnel',
    name: 'Snap E-commerce Funnel Events',
    source: 'snapchat',
    severity: 'warning',
    summary: 'The Snap Pixel is missing one or more standard e-commerce funnel events.',
    directAnswer:
      'Your business is configured as e-commerce, but the Snap Pixel is not tracking the full funnel from PAGE_VIEW through VIEW_CONTENT, ADD_CART, START_CHECKOUT, and PURCHASE. Snapchat\'s audience tools and Smart Bidding expect those five events as the canonical shopper path. Any gap means lookalikes and retargeting pools draw from a partial picture, and Snap cannot model intent steps between landing and purchase.',
    why: 'Snap recommends the five-step e-commerce funnel for a reason: each step doubles or triples the audience size of the step below it, which is what Snap needs to build reliable lookalikes and run retargeting. PAGE_VIEW is the broadest, PURCHASE the narrowest. The middle three (VIEW_CONTENT for product detail pages, ADD_CART for cart adds, START_CHECKOUT for entering checkout) are what give Snap intent signal on users who are interested but did not convert.\n\nWhen one of those is missing, retargeting falls back to the next available step. If ADD_CART is not firing, the cart abandoner audience either does not exist or has to be approximated from VIEW_CONTENT, which is a far weaker signal. If VIEW_CONTENT is missing, dynamic product ads have no event to associate product IDs with, and DPA campaigns will not optimise correctly.\n\nThe most common gap is START_CHECKOUT. Teams remember to instrument the product page and the confirmation page but skip the checkout entry because it is buried in a multi-step flow. The result is a funnel that jumps straight from cart to purchase with no intermediate signal.',
    howToFix:
      '1. Audit each funnel step in the live site. Load a product page and confirm `snaptr(\'track\', \'VIEW_CONTENT\', { item_ids: [...] })` fires. 2. Add a product to cart and confirm ADD_CART fires with `item_ids` and `price`. 3. Enter checkout and confirm START_CHECKOUT fires. 4. Complete a test order and confirm PURCHASE fires with `transaction_id`, `price`, and `currency`. 5. In Events Manager, verify all five events appear in the event list and have non-zero volume after 24 hours. 6. If using Shopify, the native Snap integration covers most of these, but custom checkouts often need manual GTM tags.',
    example: 'Expected: PAGE_VIEW, VIEW_CONTENT, ADD_CART, START_CHECKOUT, PURCHASE\nObserved: PAGE_VIEW, PURCHASE (missing 3)',
    citationTemplate:
      'Your Snap Pixel is missing one or more standard e-commerce funnel events. Per Snapchat\'s standard events documentation, an e-commerce Pixel should fire PAGE_VIEW, VIEW_CONTENT, ADD_CART, START_CHECKOUT, and PURCHASE so Snap can build retargeting audiences at each step and run dynamic product ads correctly. When intermediate events such as ADD_CART or START_CHECKOUT are not firing, retargeting pools collapse to whichever event is available, lookalike seeds shrink to PURCHASE-only volume, and Smart Bidding loses the intent steps it uses to model conversion probability. Fix: instrument each missing event on the right page (VIEW_CONTENT on product pages, ADD_CART on cart adds, START_CHECKOUT on checkout entry), pass `item_ids`, `price`, and `currency` where applicable, and confirm volume in Events Manager. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-missing-conversion-events', 'snapchat-purchase-missing-value'],
  },
  {
    id: 'snapchat-missing-conversion-events',
    name: 'Missing Snap Conversion Events',
    source: 'snapchat',
    severity: 'critical',
    summary: 'No active Snap conversion event (PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT) was found.',
    directAnswer:
      'Your Snap Pixel is installed and may be firing PAGE_VIEW, but none of the standard conversion events Snap optimises against are active. Without at least one of PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT, you cannot run conversion campaigns, build value-based audiences, or measure cost per acquisition in Ads Manager. The pixel is acting as a traffic counter, not a measurement system.',
    why: 'Snap Ads Manager separates campaign objectives by event. To run a Conversions objective campaign you must select a standard event the pixel is already receiving. If your active events list only contains PAGE_VIEW (or some non-standard custom event), the conversion objective dropdown is empty for that pixel and the campaign cannot be built.\n\nThe second consequence is bidding. Snap\'s auto-bid and target cost strategies need a conversion event to optimise toward. With none configured, the only available strategy is impression-based, which gives up Snap\'s optimisation entirely. You are paying for reach, not outcomes.\n\nThe third is audiences. Retargeting and lookalike pools seeded from conversion events (purchasers, subscribers, signed-up users) are the highest-value audiences Snap offers. Without those events firing, the seed lists do not exist and you fall back to broad PAGE_VIEW retargeting, which performs poorly.\n\nThe usual cause is a partial install: the Snap Pixel base code is on every page (so PAGE_VIEW works) but the team never added the `snaptr(\'track\', \'PURCHASE\', ...)` call to the order confirmation page.',
    howToFix:
      '1. Identify the business outcome that matches a Snap standard conversion event. PURCHASE for e-commerce, SIGN_UP for lead gen, SUBSCRIBE for subscription products, START_CHECKOUT for funnel intent. 2. Add the matching `snaptr(\'track\', ...)` call on the page that confirms the outcome (order confirmation for PURCHASE, post-signup page for SIGN_UP). 3. Pass required parameters: `transaction_id`, `price`, and `currency` for PURCHASE; `user_email` (hashed) where relevant. 4. Deploy and place one real test conversion. 5. Confirm it appears in Events Manager within minutes and the event becomes available in the Conversions objective dropdown in Ads Manager.',
    example: 'Active events: PAGE_VIEW only\nExpected at minimum: PAGE_VIEW + one of PURCHASE, SIGN_UP, SUBSCRIBE, START_CHECKOUT',
    citationTemplate:
      'Your Snap Pixel has no active standard conversion event. Per Snapchat\'s standard events and Conversions objective documentation, running optimised campaigns requires at least one of PURCHASE, SIGN_UP, SUBSCRIBE, or START_CHECKOUT to be firing on the relevant business event. Without one, the Conversions objective dropdown for the pixel is empty, auto-bid strategies have no signal to optimise against, and conversion-seeded audiences cannot be built. The pixel reverts to a traffic counter rather than a measurement system. Fix: identify which standard conversion event matches your business outcome, instrument it on the page that confirms the outcome, pass `transaction_id`, `price`, and `currency` where applicable, and verify it appears in Events Manager and in the Ads Manager objective dropdown. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-missing-page-view', 'snapchat-ecommerce-funnel'],
  },
  {
    id: 'snapchat-missing-page-view',
    name: 'Missing Snap PAGE_VIEW Event',
    source: 'snapchat',
    severity: 'critical',
    summary: 'No active PAGE_VIEW event was found on the Snap Pixel.',
    directAnswer:
      'The Snap Pixel snippet is on the site, but PAGE_VIEW is either not firing or is paused. PAGE_VIEW is the base signal Snap uses to confirm the pixel is alive and to seed broad audiences. Without it, Events Manager shows no baseline traffic, retargeting pools cannot be built from site visitors, and Snap will surface the pixel as inactive even if conversion events occasionally fire.',
    why: 'When you install Snap, the base code includes a `snaptr(\'track\', \'PAGE_VIEW\')` call that runs on every page load. That single event does three jobs at once. It confirms to Snap that the pixel is reachable from the user\'s browser. It populates the broadest retargeting audience (all site visitors in the last N days). It serves as the denominator for funnel diagnostics so Snap can show conversion rates from view to purchase.\n\nWhen PAGE_VIEW is missing or disabled, all three break. Events Manager shows the pixel as low- or zero-volume and may flag it as unhealthy. Site-visitor retargeting either does not exist or relies on a custom event with much lower coverage. Funnel reports show conversion rates over an unknown base because Snap does not know how many pages were viewed.\n\nThe usual cause is one of two things. Either the base code was modified to remove the auto PAGE_VIEW call (sometimes done deliberately for SPAs where developers plan to fire it manually on route changes, then forget the manual call). Or the entire base snippet is gated behind a consent banner that never grants consent because of a misconfiguration.',
    howToFix:
      '1. Load any tracked page and open the Snap Pixel Helper extension. Confirm PAGE_VIEW appears in the event list. 2. If missing, check the base snippet in source view. The default snippet includes `snaptr(\'track\', \'PAGE_VIEW\')` at the bottom. 3. For SPAs, ensure a manual `snaptr(\'track\', \'PAGE_VIEW\')` fires on every route change, not just the initial load. 4. If consent gating is the cause, confirm the consent platform is granting Snap the right purpose before the base snippet runs. 5. After fixing, confirm PAGE_VIEW volume in Events Manager grows over a 24-hour window.',
    example: 'Base snippet ends with: snaptr(\'track\', \'PAGE_VIEW\');\nObserved: line removed or never executed',
    citationTemplate:
      'Your Snap Pixel is installed but PAGE_VIEW is not firing. Per Snapchat\'s Snap Pixel installation documentation, the base snippet auto-fires PAGE_VIEW on every page load, and this event acts as the health check, broad retargeting seed, and funnel denominator for the pixel. When PAGE_VIEW is absent, Events Manager may flag the pixel as inactive, broad site-visitor retargeting cannot be built, and conversion-rate reporting loses its base. Common causes include a modified base snippet on single-page apps without a replacement manual fire on route changes, or a consent banner gating the snippet without granting the right purpose. Fix: restore the auto PAGE_VIEW call, instrument route changes on SPAs, verify consent flow grants Snap, and confirm volume with the Snap Pixel Helper. Source: businesshelp.snapchat.com/s/article/snap-pixel-about.',
    references: [
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-pixel-id-format', 'snapchat-missing-conversion-events'],
  },
  {
    id: 'snapchat-purchase-missing-value',
    name: 'Snap PURCHASE Missing Value',
    source: 'snapchat',
    severity: 'critical',
    summary: 'PURCHASE events are firing without value data, blocking ROAS and value-based bidding.',
    directAnswer:
      'Your Snap PURCHASE events are firing with non-zero volume but the `price` field is zero or missing. Without value, Snapchat cannot compute ROAS, cannot run value-based bidding (target ROAS, value optimisation), and reports the campaign as if every order were worth nothing. Conversion counts look fine while the revenue column stays at zero.',
    why: 'Snap\'s PURCHASE event accepts `price` and `currency` as standard parameters. `price` carries the order total. `currency` is an ISO 4217 code that lets Snap convert across markets for aggregated reporting. When `price` is missing or zero, the event still counts as one conversion (so Conversions objective campaigns keep running), but ROAS in Ads Manager is zero divided by spend, which is zero, and value-based optimisation has no signal to weight against.\n\nThis usually happens for two reasons. First, the team copied a generic PURCHASE snippet that did not include a value parameter and never went back to wire up the order total from the cart object. Second, a server-side templating bug renders the price as a string with currency symbols (`$129.90`) or with a comma decimal (`129,90`), and the Snap Pixel rejects or coerces it to zero. The browser shows the event firing, the console shows the call going out, but Events Manager logs value as zero.\n\nWith value missing, you cannot meaningfully compare campaigns by ROAS, and you cannot trust Snap\'s lookalikes from value-based seed audiences, because the seed audience has no values to weight by.',
    howToFix:
      '1. Open the order confirmation page and inspect the `snaptr(\'track\', \'PURCHASE\', ...)` call in the browser console. 2. Confirm the second argument includes `price` as a number (not a string), and `currency` as a three-letter ISO 4217 code. 3. If your platform exposes the order total as a string like `$129.90`, strip the symbol and parse as a float before passing to Snap. 4. Fire a real test order and confirm the PURCHASE event in Events Manager shows the correct value and currency. 5. After 24 hours, check the ROAS column in Ads Manager has populated.',
    example: 'Wrong: snaptr(\'track\', \'PURCHASE\', { transaction_id: \'10492\' })\nRight: snaptr(\'track\', \'PURCHASE\', { transaction_id: \'10492\', price: 129.90, currency: \'USD\' })',
    citationTemplate:
      'Your Snap PURCHASE events are firing without value data. Per Snapchat\'s standard events documentation, PURCHASE should include `price` (as a number) and `currency` (as an ISO 4217 code) so Ads Manager can report ROAS and value-based bidding can weight conversions by revenue. When `price` is missing or zero, conversion counts still log but the revenue column reads as zero, ROAS becomes meaningless, and value-based optimisation has no signal to weight against. Common causes include generic copy-paste snippets that omit the parameter, or templating bugs that render the price as a string with currency symbols, which the pixel coerces to zero. Fix: pass `price` as a numeric value and `currency` as an ISO 4217 code on every PURCHASE call, verify in Events Manager, and confirm the ROAS column populates in Ads Manager. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat Marketing API. Conversions API reference',
        url: 'https://marketingapi.snapchat.com/docs/conversion.html',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-capi-dedup-currency', 'snapchat-ecommerce-funnel'],
  },
  {
    id: 'snapchat-similar-event-names',
    name: 'Similar Snap Event Names',
    source: 'snapchat',
    severity: 'info',
    summary: 'Two or more Snap events have similar names that may represent the same action.',
    directAnswer:
      'Your Snap Pixel has events with names that look like typos or variants of each other (for example, `purchase` and `Purchase`, or `ADD_CART` and `AddToCart`). Snap treats each unique string as a distinct event, so similar names split what should be one signal across two streams. Both streams end up below the volume Snap needs to optimise reliably.',
    why: 'Snap event names are case-sensitive strings. `PURCHASE`, `Purchase`, and `purchase` are three different events to Events Manager. The same goes for spacing and separators: `ADD_CART` is not the same event as `AddCart` or `ADD CART`. When two tags fire what was intended to be the same business action under slightly different names, both events appear in the event list, both accumulate volume, and the Conversions objective dropdown shows both as selectable.\n\nThis matters because Snap\'s optimisation engine needs roughly 50 events per week per event to bid well. Splitting one stream across two names cuts each in half. Two underpowered events optimise worse than one event at full volume.\n\nIt also confuses reporting. Analysts see two PURCHASE-like events in the dashboard, do not know which one to trust, and either sum them (risking double counting if both fire on the same order) or pick one arbitrarily.\n\nThe usual cause is a migration where the new tag introduced a different casing convention than the old one, or a custom event that should have been mapped to a Snap standard event but was given a bespoke name instead.',
    howToFix:
      '1. Review the flagged event pairs and identify the canonical name. For Snap standard events, the canonical name is the all-caps version listed in the standard events documentation (`PURCHASE`, not `Purchase`). 2. Update the tag firing the non-canonical name to use the canonical one. 3. If both names have historical volume, decide whether to keep the old name as a deprecated audience source or delete it. 4. Reload affected pages with the Snap Pixel Helper and confirm only the canonical name fires. 5. Re-baseline the canonical event\'s volume over the next week.',
    example: 'Flagged pair: \'PURCHASE\' and \'Purchase\'\nFlagged pair: \'ADD_CART\' and \'AddToCart\'',
    citationTemplate:
      'Your Snap Pixel has events with similar names that likely represent the same business action. Per Snapchat\'s standard events documentation, event names are case-sensitive strings and each unique name is treated as a distinct event by Events Manager and the Conversions objective optimiser. When near-duplicate names split one business action across two streams, each stream ends up below the roughly 50 events per week per event threshold Snap needs to optimise reliably, and reporting becomes ambiguous about which event represents the true conversion. Fix: identify the canonical name (the all-caps form for standard events), update the offending tag to use it, and verify single-fire behaviour with the Snap Pixel Helper. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-duplicate-events', 'snapchat-standard-event-names'],
  },
  {
    id: 'snapchat-standard-event-names',
    name: 'Snap Standard Event Names',
    source: 'snapchat',
    severity: 'warning',
    summary: 'Events tagged as standard do not match Snap\'s canonical standard event names.',
    directAnswer:
      'You have events marked as standard in the Snap Pixel that do not match Snap\'s canonical list (PAGE_VIEW, VIEW_CONTENT, SEARCH, ADD_CART, ADD_BILLING, ADD_TO_WISHLIST, START_CHECKOUT, PURCHASE, SIGN_UP, SUBSCRIBE). Snap will not treat these as standard for objective selection, audience templates, or dynamic product ads. They behave as custom events even though they are flagged as standard.',
    why: 'Snap maintains a fixed list of standard event names. These names unlock specific Ads Manager features: the Conversions objective dropdown lists them by default, dynamic product ads require VIEW_CONTENT and PURCHASE with specific `item_ids`, value-based bidding expects `price` on PURCHASE, and audience templates assume the standard names.\n\nWhen a team installs a Snap event using a near-match like `Purchase` instead of `PURCHASE`, or `Checkout` instead of `START_CHECKOUT`, Snap stores it as a custom event with a string name. It will still appear in Events Manager and you can still optimise against it as a custom conversion, but you lose the templated audience definitions, the dynamic product ad integration, and the default placement in the objective UI.\n\nThe migration cost is real. Once a campaign has been optimising against the wrong-name event for weeks, switching to the canonical name resets the learning phase on every campaign that depended on it. Better to instrument the canonical name from day one.\n\nThe usual cause is a developer who paraphrased the event name from memory or from a third-party blog post that used inconsistent casing.',
    howToFix:
      '1. Open Snapchat\'s standard events documentation and copy the exact canonical names. 2. Audit every `snaptr(\'track\', ...)` call in GTM, hardcoded snippets, and commerce integrations. 3. Replace non-canonical strings with the canonical ones. Pay attention to case (all caps) and separators (underscores, not spaces or dashes). 4. Deploy and verify each event reappears in Events Manager under the canonical name. 5. Where a campaign was optimising against a non-canonical name, plan for the optimisation reset and switch the campaign to the new canonical event when volume is sufficient.',
    example: 'Wrong: snaptr(\'track\', \'Purchase\') / snaptr(\'track\', \'Add to Cart\')\nRight: snaptr(\'track\', \'PURCHASE\') / snaptr(\'track\', \'ADD_CART\')',
    citationTemplate:
      'Your Snap Pixel has events flagged as standard that do not match the canonical Snap standard event names. Per Snapchat\'s standard events documentation, Snap recognises a fixed list (PAGE_VIEW, VIEW_CONTENT, SEARCH, ADD_CART, ADD_BILLING, ADD_TO_WISHLIST, START_CHECKOUT, PURCHASE, SIGN_UP, SUBSCRIBE) and only these names unlock the Conversions objective default dropdown, dynamic product ads, value-based bidding, and templated audience definitions. Near-match names such as `Purchase` or `AddToCart` are stored as custom events and lose those features even when the underlying business action is identical. Fix: copy the canonical names from the standard events documentation, replace non-canonical strings in every `snaptr(\'track\', ...)` call, and plan for the optimisation reset on any campaign that depended on the old name. Source: businesshelp.snapchat.com/s/article/standard-events.',
    references: [
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-similar-event-names', 'snapchat-duplicate-events'],
  },
  {
    id: 'snapchat-zero-volume-events',
    name: 'Zero Volume Active Snap Events',
    source: 'snapchat',
    severity: 'warning',
    summary: 'One or more active Snap events have recorded zero volume.',
    directAnswer:
      'You have Snap events marked active in Events Manager that have logged zero events. An active event with no volume usually means a broken trigger, a tag that never fires, a blocked request, or a rule scoped so narrowly that no real user matches it. Either way, the event is dead weight: it occupies a slot in the objective dropdown and the audience list, but it cannot be optimised against.',
    why: 'Snap shows three event states: active (eligible to receive volume), paused (intentionally stopped), and inactive (not eligible). A zero-volume active event is the most ambiguous of the three. From Snap\'s perspective, the event is ready to receive data. From your perspective, no data is coming in. The gap is always somewhere in your implementation.\n\nThe four common causes:\n\nFirst, the tag never fires. A GTM trigger is wired to an element selector that no longer exists on the page after a redesign. The tag is enabled, but no event ever matches the trigger.\n\nSecond, the request is blocked. A consent platform, ad blocker, or CSP rule prevents `snaptr` calls from reaching Snap. The tag executes, the call queues, the network request fails. Events Manager sees nothing.\n\nThird, the event name was renamed and the old name is still in the active list. You moved to `PURCHASE` from `Purchase`, but the `Purchase` event is still flagged active with zero new volume.\n\nFourth, the rule is too narrow. A custom event is gated behind a parameter check that almost no user satisfies.',
    howToFix:
      '1. For each zero-volume active event, identify the source tag in GTM or the hardcoded snippet. 2. Reproduce the triggering action in a browser with the Snap Pixel Helper extension open. Confirm whether `snaptr(\'track\', ...)` actually fires. 3. If the tag does not fire, fix the trigger (selector change, page path mismatch, consent gate). If the tag fires but the request is blocked, check the network tab for blocked requests to `sc-static.net` or `tr.snapchat.com`. 4. If the event is a renamed legacy, pause or archive it in Events Manager. 5. If the rule is too narrow, broaden the trigger or accept that the event has no audience and archive it.',
    example: 'Active events with zero volume: \'Lead\', \'PURCHASE_v2\', \'TestCheckout\'',
    citationTemplate:
      'Your Snap Pixel has events marked active in Events Manager with zero recorded volume. Per Snapchat\'s Snap Pixel documentation, an active event is eligible to receive data, so zero volume points to an implementation gap rather than a Snap-side issue. Common causes include GTM triggers wired to selectors that no longer exist after a site redesign, consent platforms or ad blockers blocking the network request to `tr.snapchat.com`, renamed events left active under their old name with no new traffic, or overly narrow rule conditions that no real user satisfies. Each zero-volume event still occupies a slot in the objective dropdown and audience list while delivering nothing optimisable. Fix: reproduce the triggering action with the Snap Pixel Helper, verify whether the tag fires and the request leaves the browser, fix or archive each event accordingly. Source: businesshelp.snapchat.com/s/article/snap-pixel-about.',
    references: [
      {
        label: 'Snapchat. About the Snap Pixel',
        url: 'https://businesshelp.snapchat.com/s/article/snap-pixel-about',
      },
      {
        label: 'Snapchat. Standard events',
        url: 'https://businesshelp.snapchat.com/s/article/standard-events',
      },
    ],
    lastUpdated: '2026-05-12',
    status: 'full',
    relatedChecks: ['snapchat-duplicate-events', 'snapchat-similar-event-names'],
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
      'Your Google Ads account has no enabled Primary conversion action. Not one. Every action is either disabled or marked Secondary, so Smart Bidding has zero signal to optimise against. Maximize Conversions, Target CPA, Target ROAS — they\'re all bidding blind right now. Fix this before you change anything else.',
    why: 'Smart Bidding optimises against Primary conversion actions. Only Primary. Secondary actions are recorded for reporting, but they don\'t feed the bidding algorithm. With no Primary at all, the algorithm has no target. Spend still goes out (budget and bid caps still work), clicks still come in, the account still looks active on the dashboard. Conversion-aware optimisation just isn\'t happening underneath.\n\nThis usually happens one of two ways. Either the team ran a measurement migration — created new conversion actions, demoted the old ones to Secondary while testing, and never came back to promote the new actions to Primary. Or someone demoted the macro action to Secondary while cleaning up duplicates and the change never surfaced because the campaigns kept running on autopilot.\n\nThe failure is invisible from any standard Google Ads report. Conversion volume reports show conversions (Secondary actions still count). Campaign performance reports show CPA and ROAS (computed from those same Secondary actions). Nothing flags "no Primary action." You have to look in Tools & Settings → Measurement → Conversion goals and notice the empty Primary column.\n\nUntil this is fixed, every automated bidding decision is arbitrary. Fix it first, then come back to the rest of this audit.',
    howToFix:
      '1. In Tools & Settings → Measurement → Conversions, find the canonical macro business outcome for this account. Purchase for e-commerce. Lead or Submit Lead Form for B2B. Sign-up for SaaS. 2. Mark that action Primary. If it is disabled, enable it first. 3. Open Tools & Settings → Measurement → Conversion goals. Confirm the new Primary action appears under the appropriate default goal. 4. Open each active campaign\'s goal settings. Confirm it inherits the account-default Primary goal (some campaigns override; check them individually). 5. Allow 7-14 days for Smart Bidding to re-enter normal learning before judging performance against the new baseline.',
    example: 'All conversion actions: Secondary\nPrimary actions: 0\nFix: mark the canonical macro action (Purchase or Lead) as Primary.',
    citationTemplate:
      'This Google Ads account has no enabled Primary conversion action. Per Google\'s Smart Bidding documentation, value- and volume-based bidding strategies optimise exclusively against Primary actions; without one, automated bidding cannot learn from conversion signal and every bidding decision is arbitrary. Fix: identify the canonical macro business outcome (Purchase, Lead, or equivalent), mark it Primary, and confirm inheritance into active campaign goals. Address this finding before any other measurement work, since the rest depends on having signal to optimise against. Source: support.google.com/google-ads/answer/12727548.',
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

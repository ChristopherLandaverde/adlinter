export type Severity = 'critical' | 'warning' | 'info';

export interface AuditCheck {
  id: string;
  severity: Severity;
  passed: boolean;
  title: string;
  description: string;
  details?: Record<string, unknown>;
  recommendation: string;
  requiresBothFiles?: boolean;
}

export interface AuditSummary {
  critical: number;
  warning: number;
  info: number;
  passed: number;
}

export interface AuditResults {
  gtm: AuditCheck[];
  ads: AuditCheck[];
  cross: AuditCheck[];
  report: AuditCheck[];
  meta: AuditCheck[];
  tiktok: AuditCheck[];
  linkedin: AuditCheck[];
  pinterest: AuditCheck[];
  twitter: AuditCheck[];
  snapchat: AuditCheck[];
  summary: AuditSummary;
}

// Google Ads Performance Report Data Structures
export interface AdsReportConversion {
  name: string;
  conversions: number;
  allConversions: number;
  viewThroughConversions: number;
  conversionsValue: number;
  allConversionsValue: number;
  valuePerConversion: number;
  valuePerAllConversions: number;
  conversionValuePerCost: number;
  currentModelAttributedConversions: number;
  category?: string;
}

export interface AdsReportData {
  conversions: AdsReportConversion[];
}

// GTM Data Structures
export interface GTMTag {
  name: string;
  type: string;
  parameter?: Array<{ key: string; value: string; type: string }>;
  firingTriggerId?: string[];
  consentSettings?: Record<string, unknown>;
  tagFiringOption?: string;
  setupTag?: Array<{ tagName: string }>;
  teardownTag?: Array<{ tagName: string }>;
  [key: string]: unknown;
}

export interface GTMTrigger {
  name: string;
  type: string;
  triggerId: string;
  filter?: Array<{ type: string; parameter: Array<{ key: string; value: string; type?: string }> }>;
  [key: string]: unknown;
}

export interface GTMVariable {
  name: string;
  type: string;
  parameter?: Array<{ key: string; value: string; type: string }>;
  [key: string]: unknown;
}

export interface GTMContainer {
  containerVersion: {
    tag?: GTMTag[];
    trigger?: GTMTrigger[];
    variable?: GTMVariable[];
    builtInVariable?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

// Google Ads Data Structures
export interface AdsConversion {
  name: string;
  category: string;
  value: number;
  count: string;
  attributionModel: string;
  clickWindow: string;
  viewWindow: string;
  status: string;
}

export interface AdsData {
  conversions: AdsConversion[];
}

// Meta Pixel Data Structures
export interface MetaPixelEvent {
  name: string;
  eventType: 'standard' | 'custom';
  status: string;
  eventCount: number;
  value: number;
  currency?: string;
  attributionWindow?: string;
  optimizationGoal?: string;
  parameters?: string[];
}

export interface MetaPixelData {
  pixelId?: string;
  pixelName?: string;
  events: MetaPixelEvent[];
}

// TikTok Pixel Data Structures
export interface TikTokPixelEvent {
  name: string;
  eventType: 'standard' | 'custom';
  status: string;
  eventCount: number;
  value: number;
  currency?: string;
  attributionWindow?: string;
}

export interface TikTokPixelData {
  pixelCode?: string;
  pixelName?: string;
  events: TikTokPixelEvent[];
}

// LinkedIn Insight Tag Data Structures
export interface LinkedInInsightEvent {
  name: string;
  type: 'AddToCart' | 'Download' | 'Install' | 'KeyPageView' | 'Lead' | 'Purchase' | 'SignUp' | 'Other';
  status: string;
  conversionWindow?: string;
  attributionModel?: string;
  count: number;
  value: number;
  currency?: string;
  campaignAttachments?: number;
}

export interface LinkedInInsightData {
  accountId?: string;
  accountName?: string;
  events: LinkedInInsightEvent[];
}

// Pinterest Tag Data Structures
export interface PinterestTagEvent {
  name: string;
  eventType: 'standard' | 'custom';
  status: string;
  eventCount: number;
  value: number;
  currency?: string;
  tagId?: string;
  tagName?: string;
  partnerName?: string;
  attributionWindow?: string;
  apiEventCount?: number;
  enhancedMatchConfigured?: boolean;
}

export interface PinterestTagData {
  tagId?: string;
  tagName?: string;
  partnerName?: string;
  events: PinterestTagEvent[];
}

// Twitter/X Pixel Data Structures
export interface TwitterPixelEvent {
  name: string;
  eventId?: string;
  conversionId?: string;
  eventType: 'conversion' | 'engagement' | 'custom';
  status: string;
  eventCount: number;
  value: number;
  currency?: string;
  attributionWindow?: string;
  campaignWindow?: string;
}

export interface TwitterPixelData {
  pixelId?: string;
  pixelName?: string;
  events: TwitterPixelEvent[];
}

// Snapchat Pixel Data Structures
export interface SnapchatPixelEvent {
  name: string;
  eventType: 'standard' | 'custom';
  status: string;
  eventCount: number;
  value: number;
  currency?: string;
  pixelId?: string;
  attributionWindow?: string;
  conversionApiEventCount?: number;
  deduplicationId?: string;
}

export interface SnapchatPixelData {
  pixelId?: string;
  pixelName?: string;
  events: SnapchatPixelEvent[];
}

// Contextual Audit Data
export type BusinessModel = 'ecommerce' | 'lead-generation' | 'saas' | 'local-service' | 'agency' | 'other';
export type ValueStrategy = 'dynamic' | 'fixed' | 'no-values' | 'not-sure';
export type ConversionCounting = 'once' | 'every-time' | 'not-sure';
export type SalesCycle = 'immediate' | 'short' | 'medium' | 'long' | 'very-long';
export type ConsentNeeds = 'yes' | 'no' | 'not-sure';

export interface AuditContext {
  businessModel?: BusinessModel;
  valueStrategy?: ValueStrategy;
  conversionCounting?: ConversionCounting;
  salesCycle?: SalesCycle;
  needsConsent?: ConsentNeeds;
}

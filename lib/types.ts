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
  filter?: Array<{ type: string; parameter: Array<{ key: string; value: string }> }>;
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

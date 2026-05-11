'use client';

import { useEffect, useState } from 'react';
import type {
  AuditContext,
  BusinessModel,
  ConsentNeeds,
  ConversionCounting,
  SalesCycle,
  ValueStrategy,
} from '@/lib/types';

const STORAGE_KEY = 'adlint:auditContext';

type FieldValue = string | undefined;

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

const businessModelOptions: SelectOption<BusinessModel>[] = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'lead-generation', label: 'Lead generation' },
  { value: 'saas', label: 'SaaS' },
  { value: 'local-service', label: 'Local service' },
  { value: 'agency', label: 'Agency / consultant' },
  { value: 'other', label: 'Other' },
];

const valueStrategyOptions: SelectOption<ValueStrategy>[] = [
  { value: 'dynamic', label: 'Dynamic (real transaction values)' },
  { value: 'fixed', label: 'Fixed (same value per conversion)' },
  { value: 'no-values', label: 'No values tracked' },
  { value: 'not-sure', label: 'Not sure' },
];

const conversionCountingOptions: SelectOption<ConversionCounting>[] = [
  { value: 'once', label: 'Once per click' },
  { value: 'every-time', label: 'Every conversion' },
  { value: 'not-sure', label: 'Not sure' },
];

const salesCycleOptions: SelectOption<SalesCycle>[] = [
  { value: 'immediate', label: 'Immediate (same session)' },
  { value: 'short', label: 'Short (under a week)' },
  { value: 'medium', label: 'Medium (1–4 weeks)' },
  { value: 'long', label: 'Long (1–3 months)' },
  { value: 'very-long', label: 'Very long (3+ months)' },
];

const consentNeedsOptions: SelectOption<ConsentNeeds>[] = [
  { value: 'yes', label: 'Yes — required' },
  { value: 'no', label: 'No' },
  { value: 'not-sure', label: 'Not sure' },
];

export function AuditContextPicker({
  onSubmit,
  onSkip,
  initial,
}: {
  onSubmit: (context: AuditContext) => void;
  onSkip: () => void;
  initial?: AuditContext;
}) {
  const [businessModel, setBusinessModel] = useState<FieldValue>(initial?.businessModel);
  const [valueStrategy, setValueStrategy] = useState<FieldValue>(initial?.valueStrategy);
  const [conversionCounting, setConversionCounting] = useState<FieldValue>(initial?.conversionCounting);
  const [salesCycle, setSalesCycle] = useState<FieldValue>(initial?.salesCycle);
  const [needsConsent, setNeedsConsent] = useState<FieldValue>(initial?.needsConsent);

  useEffect(() => {
    if (initial) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const context = JSON.parse(stored) as AuditContext;
      setBusinessModel(context.businessModel);
      setValueStrategy(context.valueStrategy);
      setConversionCounting(context.conversionCounting);
      setSalesCycle(context.salesCycle);
      setNeedsConsent(context.needsConsent);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [initial]);

  const handleSubmit = () => {
    const context: AuditContext = {
      ...(businessModel ? { businessModel: businessModel as BusinessModel } : {}),
      ...(valueStrategy ? { valueStrategy: valueStrategy as ValueStrategy } : {}),
      ...(conversionCounting ? { conversionCounting: conversionCounting as ConversionCounting } : {}),
      ...(salesCycle ? { salesCycle: salesCycle as SalesCycle } : {}),
      ...(needsConsent ? { needsConsent: needsConsent as ConsentNeeds } : {}),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    onSubmit(context);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Refine your audit</h2>
        <p className="text-sm text-gray-600">
          These answers tune the audit&apos;s severity rules to your situation. Leave any
          field blank if you&apos;re not sure.
        </p>
      </div>

      <div className="space-y-5">
        <ContextSelect
          id="businessModel"
          label="What's your business model?"
          value={businessModel ?? ''}
          options={businessModelOptions}
          onChange={setBusinessModel}
        />
        <ContextSelect
          id="valueStrategy"
          label="How do you track conversion values?"
          value={valueStrategy ?? ''}
          options={valueStrategyOptions}
          onChange={setValueStrategy}
        />
        <ContextSelect
          id="conversionCounting"
          label="How do you count conversions?"
          value={conversionCounting ?? ''}
          options={conversionCountingOptions}
          onChange={setConversionCounting}
        />
        <ContextSelect
          id="salesCycle"
          label="How long is your typical sales cycle?"
          value={salesCycle ?? ''}
          options={salesCycleOptions}
          onChange={setSalesCycle}
        />
        <ContextSelect
          id="needsConsent"
          label="Do you need to handle consent (GDPR/cookie banners)?"
          value={needsConsent ?? ''}
          options={consentNeedsOptions}
          onChange={setNeedsConsent}
        />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition-colors hover:bg-blue-700"
        >
          Continue to results
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Skip — use defaults
        </button>
      </div>
    </section>
  );
}

function ContextSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption<T>[];
  onChange: (value: FieldValue) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">— Skip this question —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

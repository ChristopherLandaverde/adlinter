'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import FileDropZone from '@/components/FileDropZone';
import { AuditContextPicker } from '@/components/AuditContextPicker';
import { getToolIcon } from '@/components/icons';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseMetaPixelCSV } from '@/lib/parsers/metaPixelParser';
import { parseTikTokPixelCSV } from '@/lib/parsers/tiktokPixelParser';
import { parseLinkedInInsightCSV } from '@/lib/parsers/linkedinInsightParser';
import type { AuditContext } from '@/lib/types';
import type { ToolConfig, ToolFileSlot } from '@/lib/tools';

type SlotState = {
  data: unknown;
  fileName: string;
  error: string;
  processing: boolean;
};

function parseFile(parser: ToolFileSlot['parser'], text: string) {
  switch (parser) {
    case 'gtm':
      return parseGTMJSON(text);
    case 'ads':
      return parseAdsCSV(text);
    case 'report':
      return parseAdsReportCSV(text);
    case 'meta':
      return parseMetaPixelCSV(text);
    case 'tiktok':
      return parseTikTokPixelCSV(text);
    case 'linkedin':
      return parseLinkedInInsightCSV(text);
  }
}

export function ToolWorkspace({ tool }: { tool: ToolConfig }) {
  const router = useRouter();
  const ToolIcon = getToolIcon(tool.iconName);
  const isMultiFile = tool.fileSlots.length > 1;
  const samples = useMemo(() => tool.samples ?? [], [tool.samples]);
  const hasSamples = samples.length > 0;
  const [showContextStep, setShowContextStep] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState('');

  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    const init: Record<string, SlotState> = {};
    for (const slot of tool.fileSlots) {
      init[slot.key] = { data: null, fileName: '', error: '', processing: false };
    }
    return init;
  });

  const handleFile = useCallback(
    async (slot: ToolFileSlot, file: File) => {
      setSlots((prev) => ({
        ...prev,
        [slot.key]: { ...prev[slot.key], processing: true, error: '' },
      }));

      try {
        const text = await file.text();
        const parsed = parseFile(slot.parser, text);

        sessionStorage.setItem(slot.key, JSON.stringify(parsed));

        setSlots((prev) => ({
          ...prev,
          [slot.key]: { data: parsed, fileName: file.name, error: '', processing: false },
        }));

        // Single-file tools: auto-navigate after successful parse
        if (!isMultiFile) {
          setShowContextStep(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse file.';
        setSlots((prev) => ({
          ...prev,
          [slot.key]: { ...prev[slot.key], error: message, processing: false },
        }));
      }
    },
    [isMultiFile],
  );

  const handleSampleLoad = useCallback(async () => {
    if (!hasSamples || sampleLoading) return;

    setSampleLoading(true);
    setSampleError('');

    const sampleSlotKeys = samples.map((sample) => sample.slotKey);
    setSlots((prev) => {
      const next = { ...prev };
      for (const key of sampleSlotKeys) {
        if (next[key]) {
          next[key] = { ...next[key], processing: true, error: '' };
        }
      }
      return next;
    });

    try {
      const loadedSamples: Array<{
        sample: (typeof samples)[number];
        parsed: unknown;
      }> = [];

      for (const sample of samples) {
        const slot = tool.fileSlots.find((fileSlot) => fileSlot.key === sample.slotKey);
        if (!slot) {
          throw new Error(`Sample is configured for an unknown slot: ${sample.slotKey}`);
        }

        const response = await fetch(sample.url);
        if (!response.ok) {
          throw new Error(`Failed to load ${sample.filename}.`);
        }

        const text = await response.text();
        const parsed = parseFile(slot.parser, text);
        loadedSamples.push({ sample, parsed });
      }

      for (const { sample, parsed } of loadedSamples) {
        sessionStorage.setItem(sample.slotKey, JSON.stringify(parsed));
      }

      setSlots((prev) => {
        const next = { ...prev };
        for (const { sample, parsed } of loadedSamples) {
          next[sample.slotKey] = {
            data: parsed,
            fileName: sample.filename,
            error: '',
            processing: false,
          };
        }
        return next;
      });

      setShowContextStep(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sample data.';
      setSampleError(message);
      setSlots((prev) => {
        const next = { ...prev };
        for (const key of sampleSlotKeys) {
          if (next[key]) {
            next[key] = { ...next[key], processing: false };
          }
        }
        return next;
      });
    } finally {
      setSampleLoading(false);
    }
  }, [hasSamples, sampleLoading, samples, tool.fileSlots]);

  const requiredReady = useMemo(
    () =>
      tool.fileSlots
        .filter((s) => s.required)
        .every((s) => slots[s.key]?.data),
    [tool.fileSlots, slots],
  );

  const handleRunAudit = () => {
    if (!requiredReady) return;
    setShowContextStep(true);
  };

  const handleContextSubmit = (context: AuditContext) => {
    sessionStorage.setItem('auditContext', JSON.stringify(context));
    router.push('/audit');
  };

  const handleContextSkip = () => {
    sessionStorage.removeItem('auditContext');
    router.push('/audit');
  };

  const uploadedCount = useMemo(
    () => tool.fileSlots.filter((s) => slots[s.key]?.data).length,
    [tool.fileSlots, slots],
  );

  const sampleDataPrompt = hasSamples ? (
    <div className="pt-4 text-center">
      <p className="mb-3 text-sm text-muted">Don&apos;t have a file ready?</p>
      <button
        type="button"
        onClick={handleSampleLoad}
        disabled={sampleLoading}
        className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:bg-muted/40"
      >
        {sampleLoading ? 'Loading sample…' : 'Try with sample data →'}
      </button>
      {sampleError && (
        <p className="mt-3 text-sm text-critical" role="alert">
          {sampleError}
        </p>
      )}
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <AuditHistoryLink />
            <span className="font-display text-xl font-semibold text-accent">AdLint</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-12 pb-8 text-center max-w-2xl">
        <ToolIcon className="mx-auto mb-5 h-8 w-8 text-ink" />
        <h1 className="mb-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          {tool.name}
        </h1>
        <p className="mb-2 text-muted">{tool.description}</p>
        <p className="text-sm text-muted/80">
          {tool.checkCount} checks will be performed
        </p>
      </div>

      {/* Workspace */}
      <div className="container mx-auto px-4 max-w-2xl pb-16">
        {showContextStep ? (
          <AuditContextPicker
            onSubmit={handleContextSubmit}
            onSkip={handleContextSkip}
          />
        ) : isMultiFile ? (
          /* Multi-file workspace (full-audit) */
          <div className="rounded-md border border-border bg-surface p-4 sm:p-6">
            {tool.fileSlots.map((slot, i) => (
              <div key={slot.key} className={i > 0 ? 'border-t border-border pt-5 mt-5' : ''}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-surface-2 text-xs font-semibold text-muted">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {slot.label}
                    {!slot.required && (
                      <span className="ml-1 font-normal text-muted">(optional)</span>
                    )}
                  </span>
                </div>
                <FileDropZone
                  accept={slot.accept}
                  label={slot.label}
                  onFile={(file) => handleFile(slot, file)}
                  uploaded={!!slots[slot.key]?.data}
                  fileName={slots[slot.key]?.fileName}
                  processing={slots[slot.key]?.processing}
                  error={slots[slot.key]?.error}
                  compact
                />
              </div>
            ))}

            {sampleDataPrompt}

            <div className="pt-6 text-center">
              <button
                onClick={handleRunAudit}
                disabled={!requiredReady}
                className={`h-10 rounded-sm px-8 text-sm font-medium transition-colors ${
                  requiredReady
                    ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer'
                    : 'bg-surface-2 text-muted/60 cursor-not-allowed'
                }`}
              >
                Run Full Audit
              </button>
              <p className="mt-3 text-sm text-muted">
                {requiredReady
                  ? `${uploadedCount} of ${tool.fileSlots.length} files uploaded — ready to audit`
                  : 'Upload required files to continue'}
              </p>
            </div>
          </div>
        ) : (
          /* Single-file workspace */
          <>
            <FileDropZone
              accept={tool.fileSlots[0].accept}
              label={tool.fileSlots[0].label}
              onFile={(file) => handleFile(tool.fileSlots[0], file)}
              uploaded={!!slots[tool.fileSlots[0].key]?.data}
              fileName={slots[tool.fileSlots[0].key]?.fileName}
              processing={slots[tool.fileSlots[0].key]?.processing}
              error={slots[tool.fileSlots[0].key]?.error}
            />

            {sampleDataPrompt}

            {/* How to export instructions */}
            <div className="mt-10 rounded-md border border-border bg-surface-2 p-6">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink">
                How to export your file
              </h3>
              <ExportInstructions parser={tool.fileSlots[0].parser} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}

function ExportInstructions({ parser }: { parser: ToolFileSlot['parser'] }) {
  switch (parser) {
    case 'gtm':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open Google Tag Manager</li>
          <li>Go to <strong>Admin</strong></li>
          <li>Click <strong>Export Container</strong></li>
          <li>Choose the latest version</li>
          <li>Save the .json file</li>
        </ol>
      );
    case 'ads':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open Google Ads</li>
          <li>Go to <strong>Tools &rarr; Conversions</strong></li>
          <li>Click the <strong>Download</strong> button</li>
          <li>Select CSV format</li>
          <li>Save the .csv file</li>
        </ol>
      );
    case 'report':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open Google Ads</li>
          <li>Go to <strong>Reports</strong></li>
          <li>Create a Conversion action report</li>
          <li>Include metrics: conversions, value, VTC</li>
          <li>Download as CSV or JSON</li>
        </ol>
      );
    case 'meta':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open Meta Events Manager</li>
          <li>Select your Pixel</li>
          <li>Go to <strong>Events</strong> tab</li>
          <li>Click <strong>Export</strong> or download event data</li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
    case 'tiktok':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open TikTok Events Manager</li>
          <li>Go to <strong>Web Events</strong></li>
          <li>Select your Pixel</li>
          <li>Click <strong>Export</strong> or download event data</li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
    case 'linkedin':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Open LinkedIn Campaign Manager</li>
          <li>Go to <strong>Account Assets</strong></li>
          <li>Open <strong>Conversions</strong></li>
          <li>Click <strong>Export</strong></li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
  }
}

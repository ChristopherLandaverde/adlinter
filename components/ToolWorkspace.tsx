'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuditHistoryLink } from '@/components/AuditHistoryLink';
import FileDropZone from '@/components/FileDropZone';
import { AuditContextPicker } from '@/components/AuditContextPicker';
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
    <div className="text-center pt-4">
      <p className="text-sm text-gray-500 mb-2">Don&apos;t have a file ready?</p>
      <button
        type="button"
        onClick={handleSampleLoad}
        disabled={sampleLoading}
        className="text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline text-sm font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-wait"
      >
        {sampleLoading ? 'Loading sample…' : 'Try with sample data →'}
      </button>
      {sampleError && (
        <p className="text-sm text-red-600 mt-3" role="alert">
          {sampleError}
        </p>
      )}
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <div className="flex items-center gap-4">
            <AuditHistoryLink />
            <span className="text-xl font-bold text-blue-600">AdLint</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-12 pb-8 text-center max-w-2xl">
        <div className="text-5xl mb-4">{tool.icon}</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          {tool.name}
        </h1>
        <p className="text-gray-600 mb-2">{tool.description}</p>
        <p className="text-sm text-gray-400">
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
          <div className="space-y-4">
            {tool.fileSlots.map((slot, i) => (
              <div key={slot.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {slot.label}
                    {!slot.required && (
                      <span className="ml-1 text-gray-400 font-normal">(optional)</span>
                    )}
                  </span>
                </div>
                <FileDropZone
                  accept={slot.accept}
                  label={slot.label}
                  color={tool.color}
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

            <div className="text-center pt-6">
              <button
                onClick={handleRunAudit}
                disabled={!requiredReady}
                className={`px-10 py-3.5 rounded-xl text-lg font-semibold transition-all ${
                  requiredReady
                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Run Full Audit
              </button>
              <p className="text-sm text-gray-400 mt-3">
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
              color={tool.color}
              onFile={(file) => handleFile(tool.fileSlots[0], file)}
              uploaded={!!slots[tool.fileSlots[0].key]?.data}
              fileName={slots[tool.fileSlots[0].key]?.fileName}
              processing={slots[tool.fileSlots[0].key]?.processing}
              error={slots[tool.fileSlots[0].key]?.error}
            />

            {sampleDataPrompt}

            {/* How to export instructions */}
            <div className="mt-10 bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                How to export your file
              </h3>
              <ExportInstructions parser={tool.fileSlots[0].parser} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
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
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open Google Tag Manager</li>
          <li>Go to <strong>Admin</strong></li>
          <li>Click <strong>Export Container</strong></li>
          <li>Choose the latest version</li>
          <li>Save the .json file</li>
        </ol>
      );
    case 'ads':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open Google Ads</li>
          <li>Go to <strong>Tools &rarr; Conversions</strong></li>
          <li>Click the <strong>Download</strong> button</li>
          <li>Select CSV format</li>
          <li>Save the .csv file</li>
        </ol>
      );
    case 'report':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open Google Ads</li>
          <li>Go to <strong>Reports</strong></li>
          <li>Create a Conversion action report</li>
          <li>Include metrics: conversions, value, VTC</li>
          <li>Download as CSV or JSON</li>
        </ol>
      );
    case 'meta':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open Meta Events Manager</li>
          <li>Select your Pixel</li>
          <li>Go to <strong>Events</strong> tab</li>
          <li>Click <strong>Export</strong> or download event data</li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
    case 'tiktok':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open TikTok Events Manager</li>
          <li>Go to <strong>Web Events</strong></li>
          <li>Select your Pixel</li>
          <li>Click <strong>Export</strong> or download event data</li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
    case 'linkedin':
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Open LinkedIn Campaign Manager</li>
          <li>Go to <strong>Account Assets</strong></li>
          <li>Open <strong>Conversions</strong></li>
          <li>Click <strong>Export</strong></li>
          <li>Save as CSV or JSON</li>
        </ol>
      );
  }
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getToolBySlug, type ToolFileSlot } from '@/lib/tools';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { parseAdsReportCSV } from '@/lib/parsers/adsReportParser';
import { parseMetaPixelCSV } from '@/lib/parsers/metaPixelParser';
import { parseTikTokPixelCSV } from '@/lib/parsers/tiktokPixelParser';
import FileDropZone from '@/components/FileDropZone';
import Link from 'next/link';

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
  }
}

export default function ToolWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const tool = getToolBySlug(params.slug);

  if (!tool || !tool.enabled) {
    notFound();
  }

  const isMultiFile = tool.fileSlots.length > 1;

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
          router.push('/audit');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse file.';
        setSlots((prev) => ({
          ...prev,
          [slot.key]: { ...prev[slot.key], error: message, processing: false },
        }));
      }
    },
    [isMultiFile, router],
  );

  const requiredReady = useMemo(
    () =>
      tool.fileSlots
        .filter((s) => s.required)
        .every((s) => slots[s.key]?.data),
    [tool.fileSlots, slots],
  );

  const handleRunAudit = () => {
    if (!requiredReady) return;
    router.push('/audit');
  };

  const uploadedCount = useMemo(
    () => tool.fileSlots.filter((s) => slots[s.key]?.data).length,
    [tool.fileSlots, slots],
  );

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
          <span className="text-xl font-bold text-blue-600">AdLint</span>
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
        {isMultiFile ? (
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
  }
}

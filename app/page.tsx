'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadCard from '@/components/UploadCard';
import { parseGTMJSON } from '@/lib/parsers/gtmParser';
import { parseAdsCSV } from '@/lib/parsers/adsParser';
import { GTMContainer, AdsData } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [gtmData, setGtmData] = useState<GTMContainer | null>(null);
  const [adsData, setAdsData] = useState<AdsData | null>(null);
  const [gtmFileName, setGtmFileName] = useState('');
  const [adsFileName, setAdsFileName] = useState('');
  const [error, setError] = useState('');

  const handleGTMUpload = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseGTMJSON(text);
      setGtmData(parsed);
      setGtmFileName(file.name);
      setError('');
      sessionStorage.setItem('gtmData', JSON.stringify(parsed));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse GTM file.';
      setError(message);
    }
  };

  const handleAdsUpload = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseAdsCSV(text);
      setAdsData(parsed);
      setAdsFileName(file.name);
      setError('');
      sessionStorage.setItem('adsData', JSON.stringify(parsed));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse Ads CSV.';
      setError(message);
    }
  };

  const handleRunAudit = () => {
    if (!gtmData && !adsData) return;
    if (gtmData) sessionStorage.setItem('gtmData', JSON.stringify(gtmData));
    if (adsData) sessionStorage.setItem('adsData', JSON.stringify(adsData));
    router.push('/audit');
  };

  const hasFile = gtmData || adsData;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">AdLint</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Free
            </span>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">
            GTM + Google Ads Audit Tool
          </p>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Audit Your Google Ads + GTM Setup
          <br />
          <span className="text-blue-600">in 60 Seconds</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
          Free tool that catches tracking issues before they cost you money.
          Upload your GTM container export, your Ads conversion CSV, or both.
        </p>
        <p className="text-sm text-gray-400">
          100% private &mdash; files never leave your browser.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="container mx-auto px-4 mb-6 max-w-3xl">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Upload Cards */}
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <UploadCard
            title="GTM Container"
            description="Export from GTM: Admin &rarr; Export Container"
            accept=".json"
            icon={'\uD83D\uDCCA'}
            onFileUpload={handleGTMUpload}
            uploaded={!!gtmData}
            fileName={gtmFileName}
          />
          <UploadCard
            title="Google Ads Conversions"
            description="Export from Ads: Tools &rarr; Conversions &rarr; Download"
            accept=".csv"
            icon={'\uD83D\uDCB0'}
            onFileUpload={handleAdsUpload}
            uploaded={!!adsData}
            fileName={adsFileName}
          />
        </div>

        {/* Run Audit Button */}
        <div className="text-center mb-16">
          <button
            onClick={handleRunAudit}
            disabled={!hasFile}
            className={`px-10 py-3.5 rounded-xl text-lg font-semibold transition-all ${
              hasFile
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Run Audit
          </button>
          {!hasFile && (
            <p className="text-sm text-gray-400 mt-3">
              Upload at least one file to get started
            </p>
          )}
          {hasFile && (
            <p className="text-sm text-gray-500 mt-3">
              {gtmData && adsData
                ? 'Both files loaded \u2014 full audit with cross-checks'
                : gtmData
                  ? 'GTM only \u2014 upload Ads CSV for cross-checks'
                  : 'Ads only \u2014 upload GTM JSON for cross-checks'}
            </p>
          )}
        </div>
      </div>

      {/* How-to Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            How to get your files
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">GTM Container Export</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Google Tag Manager</li>
                <li>Go to <strong>Admin</strong></li>
                <li>Click <strong>Export Container</strong></li>
                <li>Choose the latest version</li>
                <li>Save the .json file</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Google Ads Conversions</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Google Ads</li>
                <li>Go to <strong>Tools &rarr; Conversions</strong></li>
                <li>Click the <strong>Download</strong> button</li>
                <li>Select CSV format</li>
                <li>Save the .csv file</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; Free Google Ads + GTM Auditor. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}

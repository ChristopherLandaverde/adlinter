import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CompareClient } from './CompareClient';

export function generateMetadata(): Metadata {
  return {
    title: 'Audit comparison',
  };
}

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareFallback />}>
      <CompareClient />
    </Suspense>
  );
}

function CompareFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">Loading comparison...</p>
        </div>
      </div>
    </main>
  );
}

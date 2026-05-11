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
    <main className="min-h-screen bg-bg">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-muted">Loading comparison...</p>
        </div>
      </div>
    </main>
  );
}

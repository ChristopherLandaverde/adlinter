'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
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

      <div className="container mx-auto px-4 py-20 text-center max-w-2xl flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          There was an unexpected error while loading this page.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-8">
            Error reference: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl text-lg font-semibold transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-3.5 rounded-xl text-lg font-semibold transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            Back to Tools
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}

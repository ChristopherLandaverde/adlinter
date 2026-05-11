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
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
          <span className="font-display text-xl font-semibold text-accent">AdLint</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20 text-center max-w-2xl flex-1">
        <h1 className="mb-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mb-6 text-muted">
          There was an unexpected error while loading this page.
        </p>
        {error.digest && (
          <p className="mb-8 text-xs text-muted">
            Error reference: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-10 w-full cursor-pointer rounded-sm bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 w-full items-center justify-center rounded-sm border border-border bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink/20 sm:w-auto"
          >
            Back to Tools
          </Link>
        </div>
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}

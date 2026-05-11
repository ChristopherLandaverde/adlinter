import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover">
            AdLint
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">&larr;</span> Back to Tools
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20 text-center max-w-2xl flex-1">
        <div className="mb-6 font-display text-9xl font-semibold text-border">404</div>
        <h1 className="mb-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Page not found
        </h1>
        <p className="mb-8 text-muted">
          The page you requested does not exist or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-sm bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Back to Tools
        </Link>
      </div>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted">
          AdLint &mdash; 100% private. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}

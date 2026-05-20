import type { Metadata } from 'next';
import Link from 'next/link';
import { formatBlogDate, getPublishedPosts } from '@/lib/blog';

const siteUrl = 'https://adlint.dev';

export const metadata: Metadata = {
  title: 'Backchannel',
  description:
    'Backchannel by AdLint: product changes, ad-platform releases, and practical tracking commentary for agencies.',
  openGraph: {
    title: 'Backchannel | AdLint',
    description:
      'Product changes, ad-platform releases, and practical tracking commentary for agencies.',
    type: 'website',
    url: `${siteUrl}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Backchannel | AdLint',
    description:
      'Product changes, ad-platform releases, and practical tracking commentary for agencies.',
  },
};

export default function BlogIndexPage() {
  const posts = getPublishedPosts();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${siteUrl}/blog#blog`,
    name: 'AdLint Backchannel',
    url: `${siteUrl}/blog`,
    description:
      'Product changes, ad-platform releases, and practical tracking commentary for agencies.',
    publisher: { '@id': `${siteUrl}/#organization` },
  };

  return (
    <main className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            AdLint
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted">
            <Link href="/checks" className="transition-colors hover:text-ink">
              Check reference
            </Link>
            <Link href="/" className="transition-colors hover:text-ink">
              Tools
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-surface">
        <div className="container mx-auto max-w-5xl px-4 py-14 sm:py-18">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">
            Backchannel
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Tracking changes worth paying attention to.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Product changes, platform releases, and practical notes for agencies that need to know what changed before reporting starts drifting.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="grid gap-4 rounded-md border border-border bg-surface p-5 transition-colors hover:border-ink/20 sm:grid-cols-[140px_1fr]"
            >
              <div className="text-xs text-muted">
                <p className="font-medium text-ink">{formatBlogDate(post.publishedAt)}</p>
                <p className="mt-1">{post.readingTime}</p>
                <div className="mt-4 flex flex-wrap gap-2 sm:block sm:space-y-2">
                  <span className="inline-flex rounded-sm bg-surface-2 px-2 py-1 font-medium text-ink">
                    {post.type}
                  </span>
                  <span className="inline-flex rounded-sm border border-border px-2 py-1">
                    {post.source}
                  </span>
                </div>
              </div>

              <article>
                <h2 className="font-display text-2xl font-semibold leading-tight text-ink">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {post.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

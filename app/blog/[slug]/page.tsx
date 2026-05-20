import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  formatBlogDate,
  getPublishedPostBySlug,
  getPublishedPosts,
} from '@/lib/blog';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = 'https://adlint.dev';
const authorName = 'Christopher Landaverde';

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPostBySlug(slug);

  if (!post) {
    return { title: 'Post not found' };
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: `${post.title} | AdLint`,
      description: post.description,
      type: 'article',
      url: `${siteUrl}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const modifiedAt = post.updatedAt ?? post.publishedAt;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: postUrl,
    mainEntityOfPage: postUrl,
    datePublished: post.publishedAt,
    dateModified: modifiedAt,
    author: {
      '@type': 'Person',
      '@id': `${siteUrl}/about#person`,
      name: authorName,
      url: `${siteUrl}/about`,
    },
    publisher: { '@id': `${siteUrl}/#organization` },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AdLint', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Backchannel', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <main className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <header className="border-b border-border bg-surface/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            AdLint
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Backchannel
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/blog"
          className="mb-8 inline-flex text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Back to Backchannel
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-sm bg-surface-2 px-2 py-1 font-medium text-ink">
              {post.type}
            </span>
            <span className="rounded-sm border border-border px-2 py-1">
              {post.source}
            </span>
            <span>{formatBlogDate(post.publishedAt)}</span>
            <span>{post.readingTime}</span>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            {post.description}
          </p>
        </header>

        <div className="space-y-10">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 font-display text-2xl font-semibold text-ink">
                {section.heading}
              </h2>
              <div className="space-y-4 text-base leading-7 text-muted">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {post.sourceLinks && post.sourceLinks.length > 0 && (
          <section className="mt-12 border-t border-border pt-6">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">
              Sources
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              {post.sourceLinks.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent transition-colors hover:text-accent-hover hover:underline"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 border-t border-border pt-6">
          <Link
            href="/"
            className="inline-flex rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Open AdLint
          </Link>
        </footer>
      </article>
    </main>
  );
}

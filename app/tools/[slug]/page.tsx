import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolWorkspace } from '@/components/ToolWorkspace';
import { getToolBySlug } from '@/lib/tools';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool || !tool.enabled) {
    return { title: 'Page not found' };
  }

  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: `${tool.name} | AdLint`,
      description: tool.description,
      type: 'website',
      url: `https://adlint.dev/tools/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.name,
      description: tool.description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool || !tool.enabled) {
    notFound();
  }

  return <ToolWorkspace tool={tool} />;
}

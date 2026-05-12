'use client';

import Link from 'next/link';
import { checkRegistryById } from '@/lib/checks/registry.generated';
import { hasFullExplainer } from '@/lib/checks/explainers';

export function CheckLearnMoreLink({ id }: { id: string }) {
  // Render for any check ID known to the engine. Full explainers get a
  // direct "Learn more" link; stubs get a softer "Reference →" so users
  // know what to expect when they land on the page.
  if (!checkRegistryById[id]) return null;

  const isFull = hasFullExplainer(id);

  return (
    <Link
      href={`/checks/${id}`}
      className="text-xs font-medium text-accent hover:text-accent-hover hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {isFull ? 'Learn more →' : 'Reference →'}
    </Link>
  );
}

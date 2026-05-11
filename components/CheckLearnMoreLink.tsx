'use client';

import Link from 'next/link';
import { getExplainer } from '@/lib/checks/explainers';

export function CheckLearnMoreLink({ id }: { id: string }) {
  if (!getExplainer(id)) return null;

  return (
    <Link
      href={`/checks/${id}`}
      className="text-xs font-medium text-accent hover:text-accent-hover hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      Learn more &rarr;
    </Link>
  );
}

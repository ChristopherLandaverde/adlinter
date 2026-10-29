import { render, screen } from '@testing-library/react';
import CheckDetailPage from '@/app/checks/[id]/page';
import { explainers } from '@/lib/checks/explainers';
import { checkRegistry } from '@/lib/checks/registry.generated';

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
}));

async function renderPage(id: string) {
  const ui = await CheckDetailPage({ params: Promise.resolve({ id }) });
  return render(ui);
}

function follows(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('/checks/[id] editorial layout', () => {
  it('renders slots in the planned order', async () => {
    const explainer = explainers.find((e) => e.id === 'missing-conversion-linker')!;
    await renderPage(explainer.id);

    const chip = screen.getByText('Critical');
    const title = screen.getByRole('heading', { level: 1, name: explainer.name });
    const tldr = screen.getByRole('complementary', { name: 'TL;DR' });
    const why = screen.getByRole('heading', { level: 2, name: 'Why It Matters' });
    const fix = screen.getByRole('heading', { level: 2, name: 'How To Fix It' });
    const banner = screen.getByRole('complementary', {
      name: 'Audit your own files for this check',
    });

    expect(follows(chip, title)).toBe(true);
    expect(follows(title, tldr)).toBe(true);
    expect(follows(tldr, why)).toBe(true);
    expect(follows(why, fix)).toBe(true);
    expect(follows(fix, banner)).toBe(true);
    expect(tldr).toHaveTextContent(explainer.directAnswer!);
    expect(screen.getByRole('link', { name: 'Run a free audit' })).toHaveAttribute(
      'href',
      '/tools/gtm-auditor',
    );
  });

  it('places the broken-state mockup inside Why, before How To Fix', async () => {
    await renderPage('missing-conversion-linker');
    const legend = screen.getByText('Coloured rows show the configuration AdLint flags.');
    const fix = screen.getByRole('heading', { level: 2, name: 'How To Fix It' });
    expect(follows(legend, fix)).toBe(true);
  });

  it('renders every registered check with a TL;DR and a banner', async () => {
    for (const { id } of checkRegistry) {
      const { unmount } = await renderPage(id);
      expect(screen.getAllByRole('complementary', { name: 'TL;DR' })).toHaveLength(1);
      expect(screen.getAllByRole('link', { name: 'Run a free audit' })).toHaveLength(1);
      unmount();
    }
  });
});

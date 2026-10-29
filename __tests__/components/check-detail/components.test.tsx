import { render, screen, within } from '@testing-library/react';
import { SeverityChip } from '@/components/check-detail/SeverityChip';
import { TldrCard } from '@/components/check-detail/TldrCard';
import { HowToFixSteps } from '@/components/check-detail/HowToFixSteps';
import { RelatedChecksRow } from '@/components/check-detail/RelatedChecksRow';
import {
  EditorialBannerCTA,
  toolHrefForSource,
} from '@/components/check-detail/EditorialBannerCTA';
import { explainers, explainerSources, type CheckExplainer } from '@/lib/checks/explainers';
import { tools } from '@/lib/tools';

describe('SeverityChip', () => {
  it.each([
    ['critical', 'Critical', 'text-critical'],
    ['warning', 'Warning', 'text-warning'],
    ['info', 'Info', 'text-info'],
  ] as const)('renders %s as a DESIGN.md pill', (severity, label, color) => {
    render(<SeverityChip severity={severity} />);
    const chip = screen.getByText(label);
    expect(chip).toHaveClass('rounded-full', 'text-xs', 'font-medium', color);
  });
});

describe('TldrCard', () => {
  it('labels the card and renders its content', () => {
    render(<TldrCard>Short answer.</TldrCard>);
    const card = screen.getByRole('complementary', { name: 'TL;DR' });
    expect(within(card).getByText('Short answer.')).toBeInTheDocument();
    expect(card).toHaveClass('border-l-accent', 'bg-surface-2', 'rounded-md');
  });
});

describe('HowToFixSteps', () => {
  it('renders each numbered step as its own list item', () => {
    render(<HowToFixSteps text={'1. Open GTM.\n2. Add the tag.\n3. Publish.'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('01');
    expect(items[0]).toHaveTextContent('Open GTM.');
    expect(items[2]).toHaveTextContent('03');
  });

  it('falls back to paragraphs for prose', () => {
    render(<HowToFixSteps text={'First paragraph.\n\nSecond paragraph.'} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('First paragraph.').tagName).toBe('P');
    expect(screen.getByText('Second paragraph.').tagName).toBe('P');
  });
});

describe('RelatedChecksRow', () => {
  const checks: CheckExplainer[] = explainers.slice(0, 2);

  it('renders a card per related check linking to its page', () => {
    render(<RelatedChecksRow checks={checks} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `/checks/${checks[0].id}`);
    expect(links[0]).toHaveTextContent(checks[0].name);
  });

  it('renders nothing when empty', () => {
    const { container } = render(<RelatedChecksRow checks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EditorialBannerCTA', () => {
  it('check variant links to the tool for the source', () => {
    render(<EditorialBannerCTA variant="check" source="meta" />);
    expect(screen.getByText('Audit your own files for this check')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run a free audit' })).toHaveAttribute(
      'href',
      '/tools/meta-auditor',
    );
  });

  it('audit variant links to the full audit', () => {
    render(<EditorialBannerCTA variant="audit" />);
    expect(screen.getByText('Run a full audit on your own files')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run a free audit' })).toHaveAttribute(
      'href',
      '/tools/full-audit',
    );
  });

  it('maps every explainer source to a real tool slug', () => {
    const slugs = new Set(tools.map((t) => `/tools/${t.slug}`));
    for (const { key } of explainerSources) {
      expect(slugs).toContain(toolHrefForSource(key));
    }
  });
});

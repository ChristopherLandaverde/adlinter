import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

// A-03 (UX_AUDIT.md): the practice must be credited on /about, and must NOT
// reappear on /audit until that decision's gates are met. These tests pin the
// placement, not the prose.
describe('About page — practice credit', () => {
  it('should link the practice, in a new tab, safely', () => {
    render(<AboutPage />);

    const link = screen.getByRole('link', { name: 'Focosys' });
    expect(link.getAttribute('href')).toContain('https://focosys.io/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('should tag the outbound link so the referral is attributable', () => {
    render(<AboutPage />);

    const href = screen.getByRole('link', { name: 'Focosys' }).getAttribute('href') ?? '';
    expect(href).toContain('utm_source=adlint');
    expect(href).toContain('utm_medium=about');
    expect(href).toContain('utm_campaign=practice_credit');
  });

  it('should describe repair work without promising out-of-scope services', () => {
    const { container } = render(<AboutPage />);
    const copy = container.textContent ?? '';

    expect(copy).toMatch(/independent marketing systems practice/i);
    // PRODUCT.md: AdLint is not a generator, campaign manager, or predictor.
    expect(copy).not.toMatch(/campaign management|we.ll generate|forecast your|predict your/i);
  });

  it('should carry the practice in the Person schema sameAs for entity disambiguation', () => {
    const { container } = render(<AboutPage />);
    const scripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]')
    ).map((s) => s.textContent ?? '');

    const person = scripts
      .map((raw) => JSON.parse(raw))
      .flat()
      .find((node) => node?.['@type'] === 'Person');

    expect(person).toBeDefined();
    expect(person.sameAs).toContain('https://focosys.io/');
    expect(person.sameAs).toContain('https://github.com/ChristopherLandaverde');
  });
});

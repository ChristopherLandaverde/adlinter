import { render, screen } from '@testing-library/react';
import { PracticeCTA } from '@/components/PracticeCTA';

describe('PracticeCTA', () => {
  it('should render the heading and the practice credit', () => {
    render(<PracticeCTA />);

    expect(
      screen.getByRole('heading', { name: 'Some findings need a person, not a tool' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Focosys, an independent/)).toBeInTheDocument();
  });

  it('should link to focosys.io in a new tab, safely', () => {
    render(<PracticeCTA />);

    const link = screen.getByRole('link', { name: /Discuss a system review/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(link.getAttribute('href')).toContain('https://focosys.io/');
  });

  it('should tag the outbound link so the loop is measurable', () => {
    render(<PracticeCTA />);

    const href = screen.getByRole('link', { name: /Discuss a system review/ }).getAttribute('href');
    expect(href).toContain('utm_source=adlint');
    expect(href).toContain('utm_medium=product');
    expect(href).toContain('utm_campaign=audit_results');
  });

  // PRODUCT.md: files are never uploaded, so the copy must not imply the
  // findings were seen, and the offer must stay inside repair work.
  it('should not claim the audit was seen or promise out-of-scope work', () => {
    const { container } = render(<PracticeCTA />);
    const copy = container.textContent ?? '';

    expect(copy).toMatch(/stay in your browser/i);
    expect(copy).not.toMatch(/\bupload/i);
    expect(copy).not.toMatch(/I reviewed|we reviewed|your audit shows/i);
    expect(copy).not.toMatch(/generate|campaign management|predict/i);
  });

  it('should expose an accessible region label', () => {
    render(<PracticeCTA />);

    expect(
      screen.getByRole('complementary', { name: 'Some findings need a person, not a tool' })
    ).toBeInTheDocument();
  });
});

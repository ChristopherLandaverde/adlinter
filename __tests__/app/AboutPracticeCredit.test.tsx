import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

// A-03 (UX_AUDIT.md / progress.md v1.26.2) defers the paid-consultation
// decision past three gates. These tests pin this change to a factual
// authorship credit and assert it does not become that offer: no scope
// promise on /about, and nothing on /audit.
describe('About page — practice credit', () => {
  it('should link the practice, in a new tab, safely', () => {
    render(<AboutPage />);

    const link = screen.getByRole('link', { name: 'Focosys' });
    expect(link).toHaveAttribute('href', 'https://focosys.io/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('should read as a credit, not as a service offer', () => {
    const { container } = render(<AboutPage />);
    const copy = container.textContent ?? '';

    expect(copy).toMatch(/independent marketing systems practice/i);
    // The gated offer and anything that implies paid remediation of findings.
    expect(copy).not.toMatch(/measurement review|book a free|repair work|hire me|work with me/i);
    expect(copy).not.toMatch(/consultation|engagement|retainer|pricing/i);
  });

  it('should not alter the Person schema', () => {
    const { container } = render(<AboutPage />);
    const person = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((s) => JSON.parse(s.textContent ?? 'null'))
      .flat()
      .find((node) => node?.['@type'] === 'Person');

    expect(person).toBeDefined();
    // sameAs asserts pages that identify this person. focosys.io does not
    // display the name, so it is deliberately not listed here.
    expect(person.sameAs).toEqual(['https://github.com/ChristopherLandaverde']);
  });
});

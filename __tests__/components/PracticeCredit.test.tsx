import { render, screen } from '@testing-library/react';
import { PracticeCredit, practiceUrl } from '@/components/PracticeCredit';

// A-03 (UX_AUDIT.md). Christopher reopened the loop on 2026-11-17 in a softer
// form than the removed v1.26.2 CTA: a credit plus a mailto, no booking, no
// paid-review offer. These tests pin that shape and the attribution.
describe('PracticeCredit', () => {
  it.each(['audit', 'check'] as const)(
    'links focosys.io with UTM parameters for the %s surface',
    (placement) => {
      render(<PracticeCredit placement={placement} />);
      const link = screen.getByRole('link', { name: /^focosys\.io/i });
      const url = new URL(link.getAttribute('href') ?? '');

      expect(url.origin).toBe('https://focosys.io');
      expect(url.searchParams.get('utm_source')).toBe('adlint');
      expect(url.searchParams.get('utm_medium')).toBe('referral');
      expect(url.searchParams.get('utm_campaign')).toBe('practice_credit');
      expect(url.searchParams.get('utm_content')).toBe(
        placement === 'audit' ? 'audit_results' : 'check_page',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    },
  );

  it('offers a mailto whose subject says where it came from', () => {
    render(<PracticeCredit placement="audit" />);
    const mail = screen.getByRole('link', { name: /christopher@focosys\.io/i });
    const href = mail.getAttribute('href') ?? '';

    expect(href.startsWith('mailto:christopher@focosys.io?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('subject=AdLint audit finding');
  });

  it('reads as a credit, not as a paid-review offer', () => {
    const { container } = render(<PracticeCredit placement="audit" />);
    const copy = container.textContent ?? '';

    expect(copy).toMatch(/FOCO Systems/);
    expect(copy).not.toMatch(/book|free review|measurement review|consultation|pricing|hire me/i);
  });

  it('builds the practice URL deterministically', () => {
    expect(practiceUrl('check')).toBe(
      'https://focosys.io/?utm_source=adlint&utm_medium=referral&utm_campaign=practice_credit&utm_content=check_page',
    );
  });
});

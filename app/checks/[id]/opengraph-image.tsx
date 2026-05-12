import { ImageResponse } from 'next/og';
import { getExplainerOrStub, explainerSources } from '@/lib/checks/explainers';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AdLint check';

const SEVERITY_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#fee2e2', fg: '#991b1b', label: 'Critical' },
  warning: { bg: '#fef3c7', fg: '#92400e', label: 'Warning' },
  info: { bg: '#e2e8f0', fg: '#334155', label: 'Info' },
  pass: { bg: '#dcfce7', fg: '#166534', label: 'Pass' },
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const explainer = getExplainerOrStub(id);
  const sev = SEVERITY_COLOR[explainer?.severity ?? 'info'] ?? SEVERITY_COLOR.info;
  const sourceLabel = explainerSources.find((s) => s.key === explainer?.source)?.label ?? 'AdLint';
  const name = explainer?.name ?? 'Check reference';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#fafaf7',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 32,
              fontWeight: 600,
              color: '#1e3a8a',
              letterSpacing: '-0.01em',
            }}
          >
            AdLint
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 20,
              color: '#57534e',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            {sourceLabel}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '10px 22px',
              borderRadius: 999,
              background: sev.bg,
              color: sev.fg,
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {sev.label}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: name.length > 60 ? 56 : 68,
              fontWeight: 600,
              color: '#1c1917',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '95%',
            }}
          >
            {name}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            color: '#57534e',
          }}
        >
          <div style={{ display: 'flex' }}>adlint.dev/checks/{id}</div>
          <div style={{ display: 'flex', color: '#1c1917', fontWeight: 500 }}>
            Privacy-respecting ad-tracking audit
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

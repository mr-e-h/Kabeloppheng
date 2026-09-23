import {
  STATUS_COLOR,
  STATUS_LABEL,
  SOKNAD_STATUS_COLOR,
  SOKNAD_STATUS_LABEL,
  TILTAK_STATUS_COLOR,
  TILTAK_STATUS_LABEL,
  VURDERING_STATUS_COLOR,
  VURDERING_STATUS_LABEL,
  type VisueltStatusNivaa,
} from '../statusUtils';
import type { SoknadStatus } from '../types';

// Én felles, fargekodet statusknapp brukt overalt i appen. Fargen er alltid
// et supplement til teksten, aldri en erstatning for den.
export function ColorBadge({ text, color, small }: { text: string; color: string; small?: boolean }) {
  return (
    <span
      className="badge"
      style={{
        background: `${color}1a`,
        color,
        fontSize: small ? 11 : undefined,
        padding: small ? '2px 8px' : undefined,
      }}
    >
      <span className="badge-dot" style={{ background: color }} />
      {text}
    </span>
  );
}

export function StatusBadge({ status, small }: { status: VisueltStatusNivaa; small?: boolean }) {
  return <ColorBadge text={STATUS_LABEL[status]} color={STATUS_COLOR[status]} small={small} />;
}

export function SoknadStatusBadge({ status, small }: { status: SoknadStatus; small?: boolean }) {
  return <ColorBadge text={SOKNAD_STATUS_LABEL[status]} color={SOKNAD_STATUS_COLOR[status]} small={small} />;
}

export function TiltakStatusBadge({ status, small }: { status: string; small?: boolean }) {
  return <ColorBadge text={TILTAK_STATUS_LABEL[status] ?? status} color={TILTAK_STATUS_COLOR[status] ?? '#9ca3af'} small={small} />;
}

export function VurderingStatusBadge({ status, small }: { status: string; small?: boolean }) {
  return <ColorBadge text={VURDERING_STATUS_LABEL[status] ?? status} color={VURDERING_STATUS_COLOR[status] ?? '#9ca3af'} small={small} />;
}

export function PlainBadge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }) {
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: '#eef1f4', fg: '#4b5563' },
    primary: { bg: 'var(--primary-light)', fg: 'var(--primary-dark)' },
    success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', fg: '#92650a' },
    danger: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
    info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
  };
  const c = map[tone];
  return (
    <span className="badge" style={{ background: c.bg, color: c.fg }}>
      {text}
    </span>
  );
}

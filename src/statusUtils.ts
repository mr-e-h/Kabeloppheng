import type { SoknadPole, SoknadLine, SoknadPoleTiltak, SoknadStatus } from './types';

// ---------------------------------------------------------------------------
// Samlet, tekstlig og fargekodet status for kart-objekter (stolpe/strekk).
// Statusteksten skal ALLTID vises i tillegg til fargen (ikke fargeavhengig).
// ---------------------------------------------------------------------------

export type VisueltStatusNivaa =
  | 'ikke_omsokt'
  | 'omsokt'
  | 'under_behandling'
  | 'avventer_tiltak'
  | 'krever_ny_trasevurdering'
  | 'avslatt'
  | 'under_utforelse'
  | 'meldt_ferdig'
  | 'godkjent';

export const STATUS_LABEL: Record<VisueltStatusNivaa, string> = {
  ikke_omsokt: 'Ikke omsøkt',
  omsokt: 'Omsøkt',
  under_behandling: 'Under behandling',
  avventer_tiltak: 'Avventer svar på tiltak',
  krever_ny_trasevurdering: 'Krever ny trasévurdering',
  avslatt: 'Avslått',
  under_utforelse: 'Under utførelse',
  meldt_ferdig: 'Meldt ferdig – venter kontroll',
  godkjent: 'Godkjent for omsøkt oppheng',
};

export const STATUS_COLOR: Record<VisueltStatusNivaa, string> = {
  ikke_omsokt: '#9ca3af',
  omsokt: '#3b82f6',
  under_behandling: '#8b5cf6',
  avventer_tiltak: '#f59e0b',
  krever_ny_trasevurdering: '#ef4444',
  avslatt: '#dc2626',
  under_utforelse: '#0ea5e9',
  meldt_ferdig: '#14b8a6',
  godkjent: '#16a34a',
};

export function poleVisualStatus(sp: SoknadPole | undefined, tiltakForPole: SoknadPoleTiltak[]): VisueltStatusNivaa {
  if (!sp) return 'ikke_omsokt';
  if (sp.godkjentForOpphengAt) return 'godkjent';
  if (tiltakForPole.some((t) => t.status === 'meldt_ferdig')) return 'meldt_ferdig';
  if (tiltakForPole.some((t) => t.status === 'sendt_tilbake')) return 'under_utforelse';
  if (tiltakForPole.some((t) => t.status === 'pagar' || t.status === 'tildelt')) return 'under_utforelse';
  if (sp.vurderingStatus === 'avslatt') return 'avslatt';
  if (sp.sokerBeslutning === 'avslatt') return 'avslatt';
  if (sp.vurderingStatus === 'krever_tiltak') {
    if (sp.sokerBeslutning === 'akseptert') return 'under_utforelse';
    return 'avventer_tiltak';
  }
  if (sp.vurderingStatus === 'godkjent_direkte') return 'godkjent';
  return 'under_behandling';
}

export function lineVisualStatus(sl: SoknadLine | undefined): VisueltStatusNivaa {
  if (!sl) return 'ikke_omsokt';
  if (sl.kreverNyTrasevurdering) return 'krever_ny_trasevurdering';
  if (sl.vurderingStatus === 'avslatt') return 'avslatt';
  if (sl.vurderingStatus === 'krever_tiltak') return 'avventer_tiltak';
  if (sl.vurderingStatus === 'godkjent_direkte') return 'godkjent';
  return 'omsokt';
}

export const SOKNAD_STATUS_LABEL: Record<SoknadStatus, string> = {
  utkast: 'Utkast',
  innsendt: 'Innsendt',
  under_vurdering: 'Under vurdering',
  kalkyle_sendt: 'Kalkyle sendt',
  avventer_tiltak: 'Avventer svar fra søker',
  under_utforelse: 'Under utførelse',
  til_sluttkontroll: 'Til sluttkontroll',
  avsluttet: 'Avsluttet',
};

// Fargekoding følger samme språk som stolpe/strekk-statusene over, slik at
// samme farge alltid betyr samme fase i prosessen på tvers av hele appen.
export const SOKNAD_STATUS_COLOR: Record<SoknadStatus, string> = {
  utkast: '#9ca3af',
  innsendt: '#3b82f6',
  under_vurdering: '#8b5cf6',
  kalkyle_sendt: '#6366f1',
  avventer_tiltak: '#f59e0b',
  under_utforelse: '#0ea5e9',
  til_sluttkontroll: '#14b8a6',
  avsluttet: '#16a34a',
};

export const TILTAK_STATUS_LABEL: Record<string, string> = {
  foreslatt: 'Foreslått – venter svar fra søker',
  akseptert: 'Akseptert av søker',
  avslatt: 'Avslått av søker',
  tildelt: 'Tildelt entreprenør',
  pagar: 'Pågår',
  meldt_ferdig: 'Meldt ferdig',
  sendt_tilbake: 'Sendt tilbake til entreprenør',
  godkjent: 'Godkjent',
};

export const TILTAK_STATUS_COLOR: Record<string, string> = {
  foreslatt: '#f59e0b',
  akseptert: '#0ea5e9',
  avslatt: '#dc2626',
  tildelt: '#6366f1',
  pagar: '#0ea5e9',
  meldt_ferdig: '#14b8a6',
  sendt_tilbake: '#dc2626',
  godkjent: '#16a34a',
};

export const VURDERING_STATUS_LABEL: Record<string, string> = {
  ikke_vurdert: 'Ikke vurdert',
  godkjent_direkte: 'Godkjent direkte',
  krever_tiltak: 'Krever tiltak',
  avslatt: 'Avslått',
};

export const VURDERING_STATUS_COLOR: Record<string, string> = {
  ikke_vurdert: '#9ca3af',
  godkjent_direkte: '#16a34a',
  krever_tiltak: '#f59e0b',
  avslatt: '#dc2626',
};

export function formatNOK(n: number): string {
  return n.toLocaleString('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });
}

export function formatDate(iso?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('nb-NO', { year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

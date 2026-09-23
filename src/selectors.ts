import type { AppRole, Company, CompanyKind, RootData, Soknad } from './types';

export function getCompany(data: RootData, id: string): Company | undefined {
  return data.companies.find((c) => c.id === id);
}

export function getPerson(data: RootData, id: string) {
  return data.persons.find((p) => p.id === id);
}

export function getPole(data: RootData, id: string) {
  return data.poles.find((p) => p.id === id);
}

export function getPoleByNumber(data: RootData, n: number) {
  return data.poles.find((p) => p.number === n);
}

export function getLine(data: RootData, id: string) {
  return data.lines.find((l) => l.id === id);
}

export function getSoknadPole(data: RootData, soknadId: string, poleId: string) {
  return data.soknadPoler.find((x) => x.soknadId === soknadId && x.poleId === poleId);
}

export function getSoknadLine(data: RootData, soknadId: string, lineId: string) {
  return data.soknadLinjer.find((x) => x.soknadId === soknadId && x.lineId === lineId);
}

export function getTiltakForPole(data: RootData, soknadId: string, poleId: string) {
  return data.tiltak.filter((t) => t.soknadId === soknadId && t.poleId === poleId);
}

export function getTiltakForSoknad(data: RootData, soknadId: string) {
  return data.tiltak.filter((t) => t.soknadId === soknadId);
}

export function getKalkyleVersjoner(data: RootData, soknadId: string) {
  return data.kalkyleVersjoner.filter((v) => v.soknadId === soknadId).sort((a, b) => a.versjonsnummer - b.versjonsnummer);
}

export function getSisteKalkyle(data: RootData, soknadId: string) {
  const vs = getKalkyleVersjoner(data, soknadId);
  return vs[vs.length - 1];
}

export function getMeldinger(data: RootData, soknadId: string, filter?: { poleId?: string; lineId?: string }) {
  return data.meldinger
    .filter((m) => m.soknadId === soknadId)
    .filter((m) => (filter?.poleId ? m.poleId === filter.poleId : true))
    .filter((m) => (filter?.lineId ? m.lineId === filter.lineId : true))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getVarslerForCompany(data: RootData, companyId: string) {
  return data.varsler.filter((v) => v.forCompanyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getHendelser(data: RootData, soknadId: string) {
  return data.hendelser.filter((h) => h.soknadId === soknadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSoknad(data: RootData, id: string): Soknad | undefined {
  return data.soknader.find((s) => s.id === id);
}

export function companiesByKind(data: RootData, kind: CompanyKind) {
  return data.companies.filter((c) => c.kinds.includes(kind));
}

export function personsForCompany(data: RootData, companyId: string) {
  return data.persons.filter((p) => p.companyIds.includes(companyId));
}

export const ROLE_LABEL: Record<AppRole, string> = {
  soker: 'Søker',
  saksbehandler: 'Saksbehandler / netteier',
  entreprenor: 'Utførende entreprenør',
};

export const COMPANY_KIND_LABEL: Record<CompanyKind, string> = {
  soker: 'Søker',
  stolpeeier: 'Stolpeeier / netteier',
  entreprenor: 'Entreprenør',
};

export function roleForCompanyKind(kind: CompanyKind): AppRole {
  if (kind === 'stolpeeier') return 'saksbehandler';
  if (kind === 'entreprenor') return 'entreprenor';
  return 'soker';
}

// Søknader synlig/relevante for gjeldende virksomhet, avhengig av rolle.
export function soknaderForCurrent(data: RootData, companyId: string, role: AppRole): Soknad[] {
  if (role === 'soker') return data.soknader.filter((s) => s.sokerCompanyId === companyId);
  if (role === 'saksbehandler') return data.soknader.filter((s) => s.stolpeeierCompanyId === companyId);
  // entreprenør: søknader hvor virksomheten har minst ett tildelt tiltak
  const soknadIds = new Set(data.tiltak.filter((t) => t.tildeltCompanyId === companyId).map((t) => t.soknadId));
  return data.soknader.filter((s) => soknadIds.has(s.id));
}

export function poleCountLabel(n: number) {
  return `${n} ${n === 1 ? 'stolpe' : 'stolper'}`;
}

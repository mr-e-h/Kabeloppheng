import type {
  Company,
  Person,
  Pole,
  PowerLine,
  TiltakKatalogItem,
  KabelType,
  ProduktKatalogItem,
  Soknad,
  SoknadPole,
  SoknadLine,
  SoknadPoleTiltak,
  KalkyleVersjon,
  Melding,
  Varsel,
  HendelseLoggPost,
  RootData,
} from '../types';

// ---------------------------------------------------------------------------
// Deterministisk, "tilfeldig" tallgenerator slik at testdataene alltid blir
// like mellom kjøringer.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(42);

// ---------------------------------------------------------------------------
// Virksomheter
// ---------------------------------------------------------------------------

export const companies: Company[] = [
  {
    id: 'c-soker-1',
    name: 'Telenor Nett AS',
    kinds: ['soker'],
    orgNr: '981 234 567',
    contactName: 'Kari Iversen',
    contactEmail: 'kari.iversen@telenornett.example',
    contactPhone: '922 11 001',
  },
  {
    id: 'c-soker-2',
    name: 'Altibox Fiber AS',
    kinds: ['soker'],
    orgNr: '981 234 987',
    contactName: 'Ole Brekke',
    contactEmail: 'ole.brekke@altiboxfiber.example',
    contactPhone: '922 11 002',
  },
  {
    id: 'c-soker-3',
    name: 'Canal Digital Kabel AS',
    kinds: ['soker'],
    orgNr: '981 235 112',
    contactName: 'Mona Fjeld',
    contactEmail: 'mona.fjeld@canaldigitalkabel.example',
    contactPhone: '922 11 003',
  },
  {
    id: 'c-eier-1',
    name: 'Nettpartner AS',
    kinds: ['stolpeeier'],
    orgNr: '971 555 001',
    contactName: 'Per Solheim',
    contactEmail: 'per.solheim@nettpartner.example',
    contactPhone: '922 22 001',
  },
  {
    id: 'c-eier-2',
    name: 'Fjellkraft Nett AS',
    kinds: ['stolpeeier'],
    orgNr: '971 555 002',
    contactName: 'Grete Lund',
    contactEmail: 'grete.lund@fjellkraftnett.example',
    contactPhone: '922 22 002',
  },
  {
    id: 'c-utf-1',
    name: 'Linjebygg Entreprenør AS',
    kinds: ['entreprenor'],
    orgNr: '988 777 001',
    contactName: 'Jonas Berg',
    contactEmail: 'jonas.berg@linjebygg.example',
    contactPhone: '922 33 001',
  },
  {
    id: 'c-utf-2',
    name: 'Stolpeservice Nord AS',
    kinds: ['entreprenor'],
    orgNr: '988 777 002',
    contactName: 'Ingrid Vang',
    contactEmail: 'ingrid.vang@stolpeservicenord.example',
    contactPhone: '922 33 002',
  },
];

export const persons: Person[] = [
  { id: 'p-soker-1a', name: 'Kari Iversen', email: 'kari.iversen@telenornett.example', companyIds: ['c-soker-1'], title: 'Utbyggingskoordinator' },
  { id: 'p-soker-1b', name: 'Anders Moe', email: 'anders.moe@telenornett.example', companyIds: ['c-soker-1'], title: 'Feltingeniør' },
  { id: 'p-soker-2a', name: 'Ole Brekke', email: 'ole.brekke@altiboxfiber.example', companyIds: ['c-soker-2'], title: 'Prosjektleder utbygging' },
  { id: 'p-soker-3a', name: 'Mona Fjeld', email: 'mona.fjeld@canaldigitalkabel.example', companyIds: ['c-soker-3'], title: 'Nettplanlegger' },
  { id: 'p-eier-1a', name: 'Per Solheim', email: 'per.solheim@nettpartner.example', companyIds: ['c-eier-1'], title: 'Saksbehandler stolpeoppheng' },
  { id: 'p-eier-1b', name: 'Liv Dahl', email: 'liv.dahl@nettpartner.example', companyIds: ['c-eier-1'], title: 'Nettingeniør' },
  { id: 'p-eier-2a', name: 'Grete Lund', email: 'grete.lund@fjellkraftnett.example', companyIds: ['c-eier-2'], title: 'Saksbehandler nett' },
  { id: 'p-utf-1a', name: 'Jonas Berg', email: 'jonas.berg@linjebygg.example', companyIds: ['c-utf-1'], title: 'Formann' },
  { id: 'p-utf-1b', name: 'Silje Aas', email: 'silje.aas@linjebygg.example', companyIds: ['c-utf-1'], title: 'Montør' },
  { id: 'p-utf-2a', name: 'Ingrid Vang', email: 'ingrid.vang@stolpeservicenord.example', companyIds: ['c-utf-2'], title: 'Formann' },
];

// ---------------------------------------------------------------------------
// Stolper og strekk – 50 fiktive stolper langs en slynget trasé, delt mellom
// to stolpeeiere (1–25 Nettpartner AS, 26–50 Fjellkraft Nett AS).
// Stolpeparken er redigerbar i appen (legg til / fjern stolpe).
//
// Posisjonene legges på et ekte kart (OpenStreetMap). Ruten starter i
// Hadeland-området i Norge og genereres som en slynget trasé i meter langs
// en tilfeldig "vei", som deretter konverteres til lat/lon.
// ---------------------------------------------------------------------------

const POLE_COUNT = 50;

const START_LAT = 60.2385;
const START_LON = 10.4620;
const METERS_PER_DEG_LAT = 111320;
const METERS_PER_DEG_LON = 111320 * Math.cos((START_LAT * Math.PI) / 180);

function generatePolePositions(n: number) {
  const positions: { lat: number; lon: number }[] = [];
  let eastM = 0; // meter øst for startpunktet
  let northM = 0; // meter nord for startpunktet
  let heading = 0.3; // radianer, ca. nordøstlig retning
  for (let i = 0; i < n; i++) {
    const lat = START_LAT + northM / METERS_PER_DEG_LAT;
    const lon = START_LON + eastM / METERS_PER_DEG_LON;
    positions.push({ lat, lon });
    const turn = (rnd() - 0.5) * 0.5;
    heading += turn;
    heading = Math.max(-1.1, Math.min(1.7, heading));
    const step = 85 + rnd() * 25; // meter mellom stolpene, realistisk for en linjetrasé
    eastM += Math.cos(heading) * step;
    northM += Math.sin(heading) * step;
  }
  return positions;
}

const polePositions = generatePolePositions(POLE_COUNT);

export const poles: Pole[] = polePositions.map((pos, idx) => {
  const number = idx + 1;
  return {
    id: `pole-${number}`,
    number,
    ownerCompanyId: number <= 25 ? 'c-eier-1' : 'c-eier-2',
    lat: pos.lat,
    lon: pos.lon,
  };
});

export const lines: PowerLine[] = [];
for (let i = 0; i < poles.length - 1; i++) {
  lines.push({
    id: `line-${poles[i].number}-${poles[i + 1].number}`,
    poleAId: poles[i].id,
    poleBId: poles[i + 1].id,
  });
}

export function findLine(poleNumA: number, poleNumB: number): PowerLine {
  const l = lines.find(
    (ln) =>
      (ln.poleAId === `pole-${poleNumA}` && ln.poleBId === `pole-${poleNumB}`) ||
      (ln.poleAId === `pole-${poleNumB}` && ln.poleBId === `pole-${poleNumA}`)
  );
  if (!l) throw new Error(`Fant ikke strekk mellom ${poleNumA} og ${poleNumB}`);
  return l;
}

// ---------------------------------------------------------------------------
// Tiltakskatalog
// ---------------------------------------------------------------------------

export const katalog: TiltakKatalogItem[] = [
  {
    id: 'kat-stolpebytte',
    navn: 'Stolpebytte',
    beskrivelse: 'Bytte av stolpe som ikke lenger tilfredsstiller krav til bæreevne eller tilstand.',
    enhet: 'stk',
    standardpris: 18500,
  },
  {
    id: 'kat-justering',
    navn: 'Justering av oppheng',
    beskrivelse: 'Justering av eksisterende kabeloppheng for å oppnå riktig høyde/frihøyde.',
    enhet: 'stk',
    standardpris: 2200,
  },
  {
    id: 'kat-skade',
    navn: 'Utbedring av skade',
    beskrivelse: 'Reparasjon/impregnering av synlig skade på stolpe.',
    enhet: 'stk',
    standardpris: 4200,
  },
  {
    id: 'kat-nedforing',
    navn: 'Arbeid knyttet til nedføring',
    beskrivelse: 'Etablering eller utbedring av nedføring på stolpe.',
    enhet: 'stk',
    standardpris: 3100,
  },
  {
    id: 'kat-skjoteboks',
    navn: 'Montering av skjøteboks',
    beskrivelse: 'Montering av ny skjøteboks på stolpe.',
    enhet: 'stk',
    standardpris: 1800,
  },
  {
    id: 'kat-kveilramme',
    navn: 'Montering av kveilramme',
    beskrivelse: 'Montering av kveilramme for kabeloverlengde.',
    enhet: 'stk',
    standardpris: 1500,
  },
  {
    id: 'kat-baereevne',
    navn: 'Kontroll av bæreevne',
    beskrivelse: 'Sakkyndig vurdering av stolpens bæreevne før tillatelse gis.',
    enhet: 'stk',
    standardpris: 6000,
  },
];

// ---------------------------------------------------------------------------
// Kabeltyper og produkter (redigeres under «Innstillinger»)
// ---------------------------------------------------------------------------

export const kabelTyper: KabelType[] = [
  { id: 'kabel-adss12', navn: 'Fiberkabel ADSS 12fo', beskrivelse: 'Selvbærende fiberkabel, 12 fiber.' },
  { id: 'kabel-adss24', navn: 'Fiberkabel ADSS 24fo', beskrivelse: 'Selvbærende fiberkabel, 24 fiber.' },
  { id: 'kabel-adss48', navn: 'Fiberkabel ADSS 48fo', beskrivelse: 'Selvbærende fiberkabel, 48 fiber.' },
  { id: 'kabel-kobber', navn: 'Kobberkabel', beskrivelse: 'Tradisjonell kobber aksesskabel.' },
  { id: 'kabel-lavspent', navn: 'Lavspent hengekabel', beskrivelse: 'Isolert lavspent hengekabel (fellesføring).' },
];

export const produkter: ProduktKatalogItem[] = [
  { id: 'prod-skjoteboks', navn: 'Skjøteboks', beskrivelse: 'Skjøteboks for fiber- eller kobberkabel.' },
  { id: 'prod-kveilramme', navn: 'Kveilramme', beskrivelse: 'Ramme for kabeloverlengde ved retningsendring.' },
  { id: 'prod-nedforing', navn: 'Nedføring', beskrivelse: 'Nedføring/rør for kabel ned langs stolpen.' },
];

// ---------------------------------------------------------------------------
// Hjelpere for å bygge scenariodata
// ---------------------------------------------------------------------------

let idCounter = 1;
function nid(prefix: string) {
  return `${prefix}-${idCounter++}`;
}

const soknader: Soknad[] = [];
const soknadPoler: SoknadPole[] = [];
const soknadLinjer: SoknadLine[] = [];
const tiltak: SoknadPoleTiltak[] = [];
const kalkyleVersjoner: KalkyleVersjon[] = [];
const meldinger: Melding[] = [];
const varsler: Varsel[] = [];
const hendelser: HendelseLoggPost[] = [];

function poleId(n: number) {
  return `pole-${n}`;
}

function newSoknadPole(soknadId: string, poleNum: number, over: Partial<SoknadPole> = {}): SoknadPole {
  const sp: SoknadPole = {
    id: nid('sp'),
    soknadId,
    poleId: poleId(poleNum),
    skaderObservasjoner: '',
    anbefalteTiltak: '',
    merknad: '',
    bilder: [],
    monteringsobjekter: [],
    vurderingStatus: 'ikke_vurdert',
    vurderingBegrunnelse: '',
    sokerBeslutning: 'ikke_besvart',
    ...over,
  };
  soknadPoler.push(sp);
  return sp;
}

function newSoknadLine(soknadId: string, lineIdRef: string, over: Partial<SoknadLine> = {}): SoknadLine {
  const sl: SoknadLine = {
    id: nid('sl'),
    soknadId,
    lineId: lineIdRef,
    antallEksisterendeKabler: 0,
    antallUnderGulvbandet: 0,
    nyeKabler: [],
    merknad: '',
    bilder: [],
    vurderingStatus: 'ikke_vurdert',
    vurderingBegrunnelse: '',
    ...over,
  };
  soknadLinjer.push(sl);
  return sl;
}

function newTiltak(
  soknadId: string,
  poleNum: number,
  katalogId: string,
  antall: number,
  over: Partial<SoknadPoleTiltak> = {}
): SoknadPoleTiltak {
  const k = katalog.find((x) => x.id === katalogId)!;
  const t: SoknadPoleTiltak = {
    id: nid('t'),
    soknadId,
    poleId: poleId(poleNum),
    katalogId,
    navn: k.navn,
    beskrivelse: k.beskrivelse,
    enhet: k.enhet,
    antall,
    pris: k.standardpris,
    status: 'foreslatt',
    utforelseStatus: 'ikke_startet',
    utforendeBilder: [],
    ...over,
  };
  tiltak.push(t);
  return t;
}

function log(
  soknadId: string,
  actorPersonId: string,
  actorCompanyId: string,
  action: string,
  detaljer?: string,
  extra: { poleId?: string; lineId?: string; createdAt?: string } = {}
) {
  hendelser.push({
    id: nid('h'),
    soknadId,
    actorPersonId,
    actorCompanyId,
    action,
    detaljer,
    createdAt: extra.createdAt ?? new Date().toISOString(),
    poleId: extra.poleId,
    lineId: extra.lineId,
  });
}

function notify(
  soknadId: string,
  type: Varsel['type'],
  tekst: string,
  forCompanyId: string,
  extra: { poleId?: string; lineId?: string; read?: boolean; createdAt?: string } = {}
) {
  varsler.push({
    id: nid('v'),
    soknadId,
    type,
    tekst,
    createdAt: extra.createdAt ?? new Date().toISOString(),
    forCompanyId,
    poleId: extra.poleId,
    lineId: extra.lineId,
    read: extra.read ?? false,
  });
}

function msg(soknadId: string, authorPersonId: string, authorCompanyId: string, tekst: string, extra: { poleId?: string; lineId?: string; createdAt?: string } = {}) {
  meldinger.push({
    id: nid('m'),
    soknadId,
    authorPersonId,
    authorCompanyId,
    tekst,
    createdAt: extra.createdAt ?? new Date().toISOString(),
    poleId: extra.poleId,
    lineId: extra.lineId,
  });
}

// ===========================================================================
// SØKNAD A: stolpe 1–5 hos Nettpartner AS (Telenor Nett AS søker)
// Scenario: innsendt, priset, søker avslår én kostbar stolpe (stolpebytte),
// resten akseptert og under utførelse. Berørte strekk krever ny trasévurdering.
// ===========================================================================

const soknadA: Soknad = {
  id: 'soknad-a',
  soknadsnummer: 'KO-2026-0001',
  navn: 'Fiberoppheng Solbakken–Myra, stolpe 1–5',
  adresse: 'Solbakkveien 2–18, 2750 Gran',
  beskrivelse: 'Søknad om oppheng av ny fiberkabel langs eksisterende trasé fra Solbakken til Myra.',
  sokerCompanyId: 'c-soker-1',
  stolpeeierCompanyId: 'c-eier-1',
  status: 'under_utforelse',
  poleIds: [1, 2, 3, 4, 5].map(poleId),
  lineIds: [findLine(1, 2).id, findLine(2, 3).id, findLine(3, 4).id, findLine(4, 5).id],
  createdAt: '2026-08-10T08:00:00.000Z',
  createdByPersonId: 'p-soker-1a',
  submittedAt: '2026-08-11T09:30:00.000Z',
};
soknader.push(soknadA);

// Søkers registrering pr. stolpe
newSoknadPole(soknadA.id, 1, {
  skaderObservasjoner: 'Ingen synlige skader.',
  anbefalteTiltak: '',
  merknad: 'Endestolpe ved Solbakken transformator.',
  monteringsobjekter: [{ id: nid('mo'), produktId: 'prod-skjoteboks', antall: 1, merknad: 'For skjøt mot eksisterende linje' }],
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Eksisterende oppheng må justeres for å gi plass til ny kabel med riktig frihøyde.',
  vurdertAt: '2026-08-14T10:00:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'akseptert',
  sokerKommentar: 'Greit, sett i gang.',
  sokerBesluttetAt: '2026-08-20T12:00:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-a-1',
});
newSoknadPole(soknadA.id, 2, {
  skaderObservasjoner: 'Mindre råteskade nederst på stolpe, ca. 20 cm.',
  anbefalteTiltak: 'Vurder utbedring av skade.',
  merknad: '',
  monteringsobjekter: [],
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Skaden bør utbedres før nytt oppheng monteres.',
  vurdertAt: '2026-08-14T10:05:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'akseptert',
  sokerKommentar: '',
  sokerBesluttetAt: '2026-08-20T12:01:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-a-1',
});
newSoknadPole(soknadA.id, 3, {
  skaderObservasjoner: 'Tydelig råte og skjevhet i stolpetopp.',
  anbefalteTiltak: 'Stolpebytte anbefales.',
  merknad: 'Vanskelig adkomst, ligger nær bekk.',
  monteringsobjekter: [{ id: nid('mo'), produktId: 'prod-nedforing', antall: 1 }],
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Stolpen tilfredsstiller ikke krav til bæreevne. Stolpebytte nødvendig før oppheng kan tillates.',
  vurdertAt: '2026-08-14T10:10:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'avslatt',
  sokerKommentar: 'Kostnaden for stolpebytte er for høy for dette prosjektet. Ber om at det vurderes en rimeligere løsning, eventuelt at strekket legges om.',
  sokerBesluttetAt: '2026-08-20T12:03:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-a-1',
});
newSoknadPole(soknadA.id, 4, {
  skaderObservasjoner: 'Ingen synlige skader.',
  anbefalteTiltak: '',
  merknad: 'Nedføring i dårlig stand.',
  monteringsobjekter: [{ id: nid('mo'), produktId: 'prod-nedforing', antall: 1, merknad: 'Bytte av eksisterende nedføringsrør' }],
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Eksisterende nedføring må utbedres for å tåle ny kabel.',
  vurdertAt: '2026-08-14T10:15:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'akseptert',
  sokerKommentar: '',
  sokerBesluttetAt: '2026-08-20T12:04:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-a-1',
});
newSoknadPole(soknadA.id, 5, {
  skaderObservasjoner: 'Ingen merknader.',
  anbefalteTiltak: '',
  merknad: 'Endestolpe ved Myra.',
  monteringsobjekter: [],
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Stolpen tåler omsøkt oppheng uten ytterligere tiltak.',
  vurdertAt: '2026-08-14T10:20:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'ikke_besvart',
});

// Strekk
newSoknadLine(soknadA.id, findLine(1, 2).id, {
  antallEksisterendeKabler: 3,
  antallUnderGulvbandet: 1,
  nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss24', antall: 1 }],
  hoydeVerdi: 5.6,
  hoydeEnhet: 'm',
  hoydeMalepunkt: 'Midt på strekket, over kjørevei',
  hoydeBeskrivelse: 'Frihøyde over kommunal vei',
  merknad: '',
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Frihøyde tilstrekkelig etter justering på stolpe 1.',
  vurdertAt: '2026-08-14T10:25:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});
newSoknadLine(soknadA.id, findLine(2, 3).id, {
  antallEksisterendeKabler: 4,
  antallUnderGulvbandet: 2,
  nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss24', antall: 1 }],
  hoydeVerdi: 4.9,
  hoydeEnhet: 'm',
  hoydeMalepunkt: 'Lavpunkt nær bekk',
  hoydeBeskrivelse: 'Frihøyde over terreng/bekk',
  merknad: 'Lavt punkt midt på strekket.',
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Frihøyden er for lav på deler av strekket. Saksbehandler vurderer at stolpe 3 må byttes for å heve opphenget.',
  vurdertAt: '2026-08-14T10:30:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  kreverNyTrasevurdering: true,
});
newSoknadLine(soknadA.id, findLine(3, 4).id, {
  antallEksisterendeKabler: 4,
  antallUnderGulvbandet: 2,
  nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss24', antall: 1 }],
  hoydeVerdi: 5.1,
  hoydeEnhet: 'm',
  hoydeMalepunkt: 'Ved stolpe 4',
  hoydeBeskrivelse: 'Frihøyde over gårdstun',
  merknad: '',
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Nedføring på stolpe 4 må utbedres. Strekket berøres også av vurderingen på stolpe 3.',
  vurdertAt: '2026-08-14T10:32:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  kreverNyTrasevurdering: true,
});
newSoknadLine(soknadA.id, findLine(4, 5).id, {
  antallEksisterendeKabler: 3,
  antallUnderGulvbandet: 0,
  nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss24', antall: 1 }],
  hoydeVerdi: 5.8,
  hoydeEnhet: 'm',
  hoydeMalepunkt: 'Midt på strekket',
  hoydeBeskrivelse: 'Frihøyde over kjørevei',
  merknad: '',
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Tilstrekkelig frihøyde, ingen tiltak nødvendig.',
  vurdertAt: '2026-08-14T10:34:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});

// Tiltak
const tA1 = newTiltak(soknadA.id, 1, 'kat-justering', 1, {
  tildeltCompanyId: 'c-utf-1',
  tildeltAt: '2026-08-21T09:00:00.000Z',
});
tA1.status = 'pagar';
tA1.utforelseStatus = 'pagar';
tA1.utforelsesdato = '2026-08-25';
tA1.utforendeKommentar = 'Startet justering, ferdigstilles neste uke.';

const tA2 = newTiltak(soknadA.id, 2, 'kat-skade', 1, {
  tildeltCompanyId: 'c-utf-1',
  tildeltAt: '2026-08-21T09:00:00.000Z',
});
tA2.status = 'meldt_ferdig';
tA2.utforelseStatus = 'meldt_ferdig';
tA2.utforelsesdato = '2026-08-24';
tA2.utforendeKommentar = 'Skade utbedret og impregnert.';
tA2.utforendeBilder = ['stolpe2_etter_utbedring.jpg'];

const tA3 = newTiltak(soknadA.id, 3, 'kat-stolpebytte', 1);
tA3.status = 'avslatt';
tA3.merknad = 'Avslått av søker grunnet kostnad.';

const tA4 = newTiltak(soknadA.id, 4, 'kat-nedforing', 1, {
  tildeltCompanyId: 'c-utf-1',
  tildeltAt: '2026-08-21T09:05:00.000Z',
});
tA4.status = 'tildelt';

// Kalkyleversjon 1 (frosset kopi)
const kalkyleA1: KalkyleVersjon = {
  id: 'kalkyle-a-1',
  soknadId: soknadA.id,
  versjonsnummer: 1,
  sentAt: '2026-08-18T13:00:00.000Z',
  sentByPersonId: 'p-eier-1a',
  linjer: [
    { tiltakId: tA1.id, poleId: poleId(1), poleNummer: 1, navn: 'Justering av oppheng', antall: 1, pris: 2200, sum: 2200 },
    { tiltakId: tA2.id, poleId: poleId(2), poleNummer: 2, navn: 'Utbedring av skade', antall: 1, pris: 4200, sum: 4200 },
    { tiltakId: tA3.id, poleId: poleId(3), poleNummer: 3, navn: 'Stolpebytte', antall: 1, pris: 18500, sum: 18500 },
    { tiltakId: tA4.id, poleId: poleId(4), poleNummer: 4, navn: 'Arbeid knyttet til nedføring', antall: 1, pris: 3100, sum: 3100 },
  ],
  totalsum: 2200 + 4200 + 18500 + 3100,
};
kalkyleVersjoner.push(kalkyleA1);

// Meldinger
msg(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Kalkyle for stolpe 1–4 er nå sendt. Se spesielt kostnad for stolpe 3 (stolpebytte).', { poleId: poleId(3), createdAt: '2026-08-18T13:05:00.000Z' });
msg(soknadA.id, 'p-soker-1a', 'c-soker-1', 'Takk for kalkylen. Vi avslår tiltak på stolpe 3 grunnet kostnad – kan dere se på alternativer?', { poleId: poleId(3), createdAt: '2026-08-20T12:10:00.000Z' });
msg(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Notert. Vi vurderer trasé på nytt for strekket rundt stolpe 3 og kommer tilbake med revidert kalkyle.', { poleId: poleId(3), createdAt: '2026-08-20T14:30:00.000Z' });

// Hendelseslogg
log(soknadA.id, 'p-soker-1a', 'c-soker-1', 'Søknad opprettet', undefined, { createdAt: soknadA.createdAt });
log(soknadA.id, 'p-soker-1a', 'c-soker-1', 'Søknad sendt inn', undefined, { createdAt: soknadA.submittedAt });
log(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Vurdering registrert på stolpe 1–4 og strekk', undefined, { createdAt: '2026-08-14T10:35:00.000Z' });
log(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Kalkyle versjon 1 sendt til søker', 'Totalsum kr 28 000', { createdAt: '2026-08-18T13:00:00.000Z' });
log(soknadA.id, 'p-soker-1a', 'c-soker-1', 'Søker besvarte kalkyle', 'Akseptert stolpe 1, 2 og 4. Avslått stolpe 3.', { createdAt: '2026-08-20T12:05:00.000Z' });
log(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Strekk 2–3 og 3–4 merket "krever ny trasévurdering"', undefined, { createdAt: '2026-08-20T12:06:00.000Z' });
log(soknadA.id, 'p-eier-1a', 'c-eier-1', 'Tiltak på stolpe 1, 2 og 4 tildelt Linjebygg Entreprenør AS', undefined, { createdAt: '2026-08-21T09:05:00.000Z' });
log(soknadA.id, 'p-utf-1a', 'c-utf-1', 'Tiltak på stolpe 2 meldt ferdig', undefined, { createdAt: '2026-08-24T15:00:00.000Z', poleId: poleId(2) });

notify(soknadA.id, 'kalkyle_sendt', 'Kalkyle for søknad KO-2026-0001 er sendt til søker.', 'c-soker-1', { read: true, createdAt: '2026-08-18T13:00:00.000Z' });
notify(soknadA.id, 'soker_svarte', 'Søker har besvart kalkylen for KO-2026-0001. Stolpe 3 er avslått.', 'c-eier-1', { poleId: poleId(3), read: true, createdAt: '2026-08-20T12:05:00.000Z' });
notify(soknadA.id, 'trasevurdering_kreves', 'Strekk 2–3 og 3–4 krever ny trasévurdering etter avslag på stolpe 3.', 'c-eier-1', { read: false, createdAt: '2026-08-20T12:06:00.000Z' });
notify(soknadA.id, 'tiltak_tildelt', 'Dere har fått tildelt 3 tiltak på søknad KO-2026-0001.', 'c-utf-1', { read: true, createdAt: '2026-08-21T09:05:00.000Z' });
notify(soknadA.id, 'tiltak_meldt_ferdig', 'Tiltak på stolpe 2 er meldt ferdig og venter på kontroll.', 'c-eier-1', { poleId: poleId(2), read: false, createdAt: '2026-08-24T15:00:00.000Z' });

// ===========================================================================
// SØKNAD B: stolpe 6–10 hos Nettpartner AS (Telenor Nett AS søker)
// Scenario: full flyt til godkjenning – entreprenør melder ferdig, saksbehandler
// godkjenner, søker ser stolpen som klar.
// ===========================================================================

const soknadB: Soknad = {
  id: 'soknad-b',
  soknadsnummer: 'KO-2026-0002',
  navn: 'Fiberoppheng Myra–Kvernstad, stolpe 6–10',
  adresse: 'Kvernstadveien 4–22, 2750 Gran',
  beskrivelse: 'Videreføring av fibertrasé fra Myra til Kvernstad.',
  sokerCompanyId: 'c-soker-1',
  stolpeeierCompanyId: 'c-eier-1',
  status: 'til_sluttkontroll',
  poleIds: [6, 7, 8, 9, 10].map(poleId),
  lineIds: [findLine(6, 7).id, findLine(7, 8).id, findLine(8, 9).id, findLine(9, 10).id],
  createdAt: '2026-08-12T08:00:00.000Z',
  createdByPersonId: 'p-soker-1b',
  submittedAt: '2026-08-13T09:00:00.000Z',
};
soknader.push(soknadB);

newSoknadPole(soknadB.id, 6, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-08-15T09:00:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});
newSoknadPole(soknadB.id, 7, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-08-15T09:02:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});
const spB8 = newSoknadPole(soknadB.id, 8, {
  skaderObservasjoner: 'Ingen skader, men behov for kveilramme grunnet kabeloverlengde.',
  monteringsobjekter: [{ id: nid('mo'), produktId: 'prod-kveilramme', antall: 1 }],
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Kveilramme må monteres for å håndtere kabeloverlengde ved retningsendring.',
  vurdertAt: '2026-08-15T09:05:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
  sokerBeslutning: 'akseptert',
  sokerBesluttetAt: '2026-08-17T10:00:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-b-1',
});
newSoknadPole(soknadB.id, 9, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-08-15T09:07:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});
newSoknadPole(soknadB.id, 10, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-08-15T09:09:00.000Z',
  vurdertByPersonId: 'p-eier-1a',
});

[6, 7, 8, 9].forEach((n) => {
  newSoknadLine(soknadB.id, findLine(n, n + 1).id, {
    antallEksisterendeKabler: 2,
    antallUnderGulvbandet: 0,
    nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss24', antall: 1 }],
    hoydeVerdi: 5.4,
    hoydeEnhet: 'm',
    hoydeMalepunkt: 'Midt på strekket',
    hoydeBeskrivelse: 'Frihøyde over vei',
    vurderingStatus: 'godkjent_direkte',
    vurderingBegrunnelse: 'Tilstrekkelig frihøyde.',
    vurdertAt: '2026-08-15T09:10:00.000Z',
    vurdertByPersonId: 'p-eier-1a',
  });
});

const tB8 = newTiltak(soknadB.id, 8, 'kat-kveilramme', 1, {
  tildeltCompanyId: 'c-utf-2',
  tildeltAt: '2026-08-17T10:30:00.000Z',
});
tB8.status = 'godkjent';
tB8.utforelseStatus = 'meldt_ferdig';
tB8.utforelsesdato = '2026-08-19';
tB8.utforendeKommentar = 'Kveilramme montert iht. spesifikasjon.';
tB8.utforendeBilder = ['stolpe8_kveilramme.jpg'];
tB8.kontrollKommentar = 'Kontrollert på stedet, ser bra ut. Godkjent.';
tB8.kontrollertAt = '2026-08-21T08:00:00.000Z';
tB8.kontrollertByPersonId = 'p-eier-1a';

spB8.godkjentForOpphengAt = '2026-08-21T08:05:00.000Z';
spB8.godkjentForOpphengByPersonId = 'p-eier-1a';

const kalkyleB1: KalkyleVersjon = {
  id: 'kalkyle-b-1',
  soknadId: soknadB.id,
  versjonsnummer: 1,
  sentAt: '2026-08-16T12:00:00.000Z',
  sentByPersonId: 'p-eier-1a',
  linjer: [{ tiltakId: tB8.id, poleId: poleId(8), poleNummer: 8, navn: 'Montering av kveilramme', antall: 1, pris: 1500, sum: 1500 }],
  totalsum: 1500,
};
kalkyleVersjoner.push(kalkyleB1);

msg(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Kalkyle for stolpe 8 sendt. Kun ett tiltak nødvendig på dette strekket.', { poleId: poleId(8), createdAt: '2026-08-16T12:05:00.000Z' });
msg(soknadB.id, 'p-soker-1b', 'c-soker-1', 'Akseptert, sett i gang.', { poleId: poleId(8), createdAt: '2026-08-17T10:02:00.000Z' });
msg(soknadB.id, 'p-utf-2a', 'c-utf-2', 'Kveilramme montert på stolpe 8, melder ferdig.', { poleId: poleId(8), createdAt: '2026-08-19T14:05:00.000Z' });
msg(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Kontrollert og godkjent for omsøkt oppheng.', { poleId: poleId(8), createdAt: '2026-08-21T08:06:00.000Z' });

log(soknadB.id, 'p-soker-1b', 'c-soker-1', 'Søknad opprettet', undefined, { createdAt: soknadB.createdAt });
log(soknadB.id, 'p-soker-1b', 'c-soker-1', 'Søknad sendt inn', undefined, { createdAt: soknadB.submittedAt });
log(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Vurdering registrert på stolpe 6–10', undefined, { createdAt: '2026-08-15T09:10:00.000Z' });
log(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Kalkyle versjon 1 sendt til søker', 'Totalsum kr 1 500', { createdAt: '2026-08-16T12:00:00.000Z' });
log(soknadB.id, 'p-soker-1b', 'c-soker-1', 'Søker aksepterte tiltak på stolpe 8', undefined, { createdAt: '2026-08-17T10:00:00.000Z', poleId: poleId(8) });
log(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Tiltak på stolpe 8 tildelt Stolpeservice Nord AS', undefined, { createdAt: '2026-08-17T10:30:00.000Z', poleId: poleId(8) });
log(soknadB.id, 'p-utf-2a', 'c-utf-2', 'Tiltak på stolpe 8 meldt ferdig', undefined, { createdAt: '2026-08-19T14:00:00.000Z', poleId: poleId(8) });
log(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Tiltak på stolpe 8 kontrollert og godkjent', undefined, { createdAt: '2026-08-21T08:05:00.000Z', poleId: poleId(8) });
log(soknadB.id, 'p-eier-1a', 'c-eier-1', 'Stolpe 8 godkjent for omsøkt oppheng', undefined, { createdAt: '2026-08-21T08:05:00.000Z', poleId: poleId(8) });

notify(soknadB.id, 'kalkyle_sendt', 'Kalkyle for søknad KO-2026-0002 er sendt til søker.', 'c-soker-1', { read: true, createdAt: '2026-08-16T12:00:00.000Z' });
notify(soknadB.id, 'soker_svarte', 'Søker har akseptert tiltak på stolpe 8.', 'c-eier-1', { poleId: poleId(8), read: true, createdAt: '2026-08-17T10:00:00.000Z' });
notify(soknadB.id, 'tiltak_tildelt', 'Dere har fått tildelt 1 tiltak på søknad KO-2026-0002.', 'c-utf-2', { poleId: poleId(8), read: true, createdAt: '2026-08-17T10:30:00.000Z' });
notify(soknadB.id, 'tiltak_meldt_ferdig', 'Tiltak på stolpe 8 er meldt ferdig og venter på kontroll.', 'c-eier-1', { poleId: poleId(8), read: true, createdAt: '2026-08-19T14:00:00.000Z' });
notify(soknadB.id, 'stolpe_godkjent', 'Stolpe 8 er godkjent for omsøkt oppheng.', 'c-soker-1', { poleId: poleId(8), read: false, createdAt: '2026-08-21T08:05:00.000Z' });

// ===========================================================================
// SØKNAD C: stolpe 26–30 hos Fjellkraft Nett AS (samme søker: Telenor Nett AS)
// Viser at én søker har søknader hos begge stolpeeierne, og at samme
// entreprenør (Linjebygg) jobber for begge stolpeeiere.
// ===========================================================================

const soknadC: Soknad = {
  id: 'soknad-c',
  soknadsnummer: 'KO-2026-0003',
  navn: 'Fiberoppheng Kvernstad–Åsen, stolpe 26–30',
  adresse: 'Åsenveien 1–15, 2750 Gran',
  beskrivelse: 'Ny fibertrasé i Fjellkraft Nett sitt konsesjonsområde.',
  sokerCompanyId: 'c-soker-1',
  stolpeeierCompanyId: 'c-eier-2',
  status: 'avventer_tiltak',
  poleIds: [26, 27, 28, 29, 30].map(poleId),
  lineIds: [findLine(26, 27).id, findLine(27, 28).id, findLine(28, 29).id, findLine(29, 30).id],
  createdAt: '2026-09-01T08:00:00.000Z',
  createdByPersonId: 'p-soker-1a',
  submittedAt: '2026-09-02T08:30:00.000Z',
};
soknader.push(soknadC);

newSoknadPole(soknadC.id, 26, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-09-05T09:00:00.000Z',
  vurdertByPersonId: 'p-eier-2a',
});
newSoknadPole(soknadC.id, 27, {
  skaderObservasjoner: 'Lett slitasje på impregnering.',
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Mindre utbedring anbefales før nytt oppheng.',
  vurdertAt: '2026-09-05T09:05:00.000Z',
  vurdertByPersonId: 'p-eier-2a',
});
newSoknadPole(soknadC.id, 28, {
  vurderingStatus: 'ikke_vurdert',
});
newSoknadPole(soknadC.id, 29, {
  skaderObservasjoner: 'Skjevhet i toppen, mindre justering nødvendig.',
  vurderingStatus: 'krever_tiltak',
  vurderingBegrunnelse: 'Justering av eksisterende oppheng anbefales før nytt oppheng monteres.',
  vurdertAt: '2026-09-05T09:08:00.000Z',
  vurdertByPersonId: 'p-eier-2a',
  sokerBeslutning: 'akseptert',
  sokerBesluttetAt: '2026-09-07T09:00:00.000Z',
  sokerBesluttetKalkyleVersjonId: 'kalkyle-c-1',
});
newSoknadPole(soknadC.id, 30, {
  vurderingStatus: 'godkjent_direkte',
  vurderingBegrunnelse: 'Ingen tiltak nødvendig.',
  vurdertAt: '2026-09-05T09:10:00.000Z',
  vurdertByPersonId: 'p-eier-2a',
});

[26, 27, 28, 29].forEach((n) => {
  newSoknadLine(soknadC.id, findLine(n, n + 1).id, {
    antallEksisterendeKabler: 2,
    antallUnderGulvbandet: 1,
    nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss12', antall: 1 }],
    hoydeVerdi: 5.5,
    hoydeEnhet: 'm',
    hoydeMalepunkt: 'Midt på strekket',
    hoydeBeskrivelse: 'Frihøyde over vei',
    vurderingStatus: n === 27 ? 'krever_tiltak' : n === 28 ? 'krever_tiltak' : 'godkjent_direkte',
    vurderingBegrunnelse: n === 27 ? 'Se vurdering på stolpe 27.' : n === 28 ? 'Se vurdering på stolpe 29.' : 'Tilstrekkelig frihøyde.',
    vurdertAt: '2026-09-05T09:12:00.000Z',
    vurdertByPersonId: 'p-eier-2a',
  });
});

const tC27 = newTiltak(soknadC.id, 27, 'kat-skade', 1);
tC27.status = 'foreslatt';

// Stolpe 29: allerede akseptert av søker og tildelt Linjebygg Entreprenør AS,
// som dermed har oppdrag fra både Nettpartner AS (søknad A) og Fjellkraft
// Nett AS (denne søknaden) samtidig.
const tC29 = newTiltak(soknadC.id, 29, 'kat-justering', 1, {
  tildeltCompanyId: 'c-utf-1',
  tildeltAt: '2026-09-07T10:00:00.000Z',
});
tC29.status = 'pagar';
tC29.utforelseStatus = 'pagar';
tC29.utforendeKommentar = 'Planlagt befaring i uke 38.';

const kalkyleC1: KalkyleVersjon = {
  id: 'kalkyle-c-1',
  soknadId: soknadC.id,
  versjonsnummer: 1,
  sentAt: '2026-09-06T11:00:00.000Z',
  sentByPersonId: 'p-eier-2a',
  linjer: [
    { tiltakId: tC27.id, poleId: poleId(27), poleNummer: 27, navn: 'Utbedring av skade', antall: 1, pris: 4200, sum: 4200 },
    { tiltakId: tC29.id, poleId: poleId(29), poleNummer: 29, navn: 'Justering av oppheng', antall: 1, pris: 2200, sum: 2200 },
  ],
  totalsum: 6400,
};
kalkyleVersjoner.push(kalkyleC1);

msg(soknadC.id, 'p-eier-2a', 'c-eier-2', 'Kalkyle for stolpe 27 og 29 er sendt. Stolpe 28 gjenstår å vurdere.', { poleId: poleId(27), createdAt: '2026-09-06T11:05:00.000Z' });
msg(soknadC.id, 'p-soker-1a', 'c-soker-1', 'Akseptert på stolpe 29, sett i gang. Avventer fortsatt på stolpe 27.', { poleId: poleId(29), createdAt: '2026-09-07T09:05:00.000Z' });

log(soknadC.id, 'p-soker-1a', 'c-soker-1', 'Søknad opprettet', undefined, { createdAt: soknadC.createdAt });
log(soknadC.id, 'p-soker-1a', 'c-soker-1', 'Søknad sendt inn', undefined, { createdAt: soknadC.submittedAt });
log(soknadC.id, 'p-eier-2a', 'c-eier-2', 'Vurdering registrert på stolpe 26, 27, 29 og 30', undefined, { createdAt: '2026-09-05T09:12:00.000Z' });
log(soknadC.id, 'p-eier-2a', 'c-eier-2', 'Kalkyle versjon 1 sendt til søker', 'Totalsum kr 6 400', { createdAt: '2026-09-06T11:00:00.000Z' });
log(soknadC.id, 'p-soker-1a', 'c-soker-1', 'Søker aksepterte tiltak på stolpe 29', undefined, { createdAt: '2026-09-07T09:00:00.000Z', poleId: poleId(29) });
log(soknadC.id, 'p-eier-2a', 'c-eier-2', 'Tiltak på stolpe 29 tildelt Linjebygg Entreprenør AS', undefined, { createdAt: '2026-09-07T10:00:00.000Z', poleId: poleId(29) });

notify(soknadC.id, 'kalkyle_sendt', 'Kalkyle for søknad KO-2026-0003 er sendt til søker.', 'c-soker-1', { read: false, createdAt: '2026-09-06T11:00:00.000Z' });
notify(soknadC.id, 'soker_svarte', 'Søker har akseptert tiltak på stolpe 29.', 'c-eier-2', { poleId: poleId(29), read: true, createdAt: '2026-09-07T09:00:00.000Z' });
notify(soknadC.id, 'tiltak_tildelt', 'Dere har fått tildelt 1 tiltak på søknad KO-2026-0003.', 'c-utf-1', { poleId: poleId(29), read: false, createdAt: '2026-09-07T10:00:00.000Z' });

// ===========================================================================
// SØKNAD D: stolpe 31–33 hos Fjellkraft Nett AS – Altibox Fiber som søker,
// fortsatt i utkast (viser at flere uavhengige søknader/søkere kan eksistere
// samtidig, og at en søknad kan lagres som utkast før innsending).
// ===========================================================================

const soknadD: Soknad = {
  id: 'soknad-d',
  soknadsnummer: 'KO-2026-0004',
  navn: 'Fiberoppheng Åsen ring, stolpe 31–33',
  adresse: 'Åsenringen 3–9, 2750 Gran',
  beskrivelse: 'Planlagt ringforbindelse i Åsen-området. Under utarbeidelse.',
  sokerCompanyId: 'c-soker-2',
  stolpeeierCompanyId: 'c-eier-2',
  status: 'utkast',
  poleIds: [31, 32, 33].map(poleId),
  lineIds: [findLine(31, 32).id, findLine(32, 33).id],
  createdAt: '2026-09-15T10:00:00.000Z',
  createdByPersonId: 'p-soker-2a',
};
soknader.push(soknadD);

newSoknadPole(soknadD.id, 31, { merknad: 'Foreløpig registrering.' });
newSoknadPole(soknadD.id, 32, {});
newSoknadPole(soknadD.id, 33, {});
newSoknadLine(soknadD.id, findLine(31, 32).id, { nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss12', antall: 1 }] });
newSoknadLine(soknadD.id, findLine(32, 33).id, { nyeKabler: [{ id: nid('nk'), kabelTypeId: 'kabel-adss12', antall: 1 }] });

log(soknadD.id, 'p-soker-2a', 'c-soker-2', 'Søknad opprettet som utkast', undefined, { createdAt: soknadD.createdAt });

// ---------------------------------------------------------------------------

export function buildInitialData(): RootData {
  return {
    companies: JSON.parse(JSON.stringify(companies)),
    persons: JSON.parse(JSON.stringify(persons)),
    poles: JSON.parse(JSON.stringify(poles)),
    lines: JSON.parse(JSON.stringify(lines)),
    katalog: JSON.parse(JSON.stringify(katalog)),
    kabelTyper: JSON.parse(JSON.stringify(kabelTyper)),
    produkter: JSON.parse(JSON.stringify(produkter)),
    soknader: JSON.parse(JSON.stringify(soknader)),
    soknadPoler: JSON.parse(JSON.stringify(soknadPoler)),
    soknadLinjer: JSON.parse(JSON.stringify(soknadLinjer)),
    tiltak: JSON.parse(JSON.stringify(tiltak)),
    kalkyleVersjoner: JSON.parse(JSON.stringify(kalkyleVersjoner)),
    meldinger: JSON.parse(JSON.stringify(meldinger)),
    varsler: JSON.parse(JSON.stringify(varsler)),
    hendelser: JSON.parse(JSON.stringify(hendelser)),
  };
}

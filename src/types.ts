// ---------------------------------------------------------------------------
// Domenemodell for prototypen "Kabelopphenget" – søknad om kabeloppheng i
// stolper. Alt er testdata / fiktivt.
// ---------------------------------------------------------------------------

export type CompanyKind = 'soker' | 'stolpeeier' | 'entreprenor';

export interface Company {
  id: string;
  name: string;
  kinds: CompanyKind[]; // en virksomhet kan i prinsippet opptre i flere roller
  orgNr: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  companyIds: string[]; // medlem av én eller flere virksomheter
  title: string;
}

// Rollen en bruker opptrer som akkurat nå i prototypen
export type AppRole = 'soker' | 'saksbehandler' | 'entreprenor';

export interface Pole {
  id: string;
  number: number; // stolpenummer
  ownerCompanyId: string; // stolpeeier / netteier
  lat: number; // geografisk posisjon (fiktiv, men lagt på et ekte kart)
  lon: number;
  label?: string; // f.eks. stedsnavn
  removed?: boolean; // stolpe fjernet fra nettet (redigerbar stolpepark)
}

export interface PowerLine {
  id: string;
  poleAId: string;
  poleBId: string;
  removed?: boolean;
}

// -------------------- Tiltakskatalog --------------------

export interface TiltakKatalogItem {
  id: string;
  navn: string;
  beskrivelse: string;
  enhet: string; // f.eks. "stk", "time", "meter"
  standardpris: number; // NOK, eksempeldata
  egendefinert?: boolean;
}

// -------------------- Innstillinger: kabeltyper og produkter --------------------
// Felles, redigerbare kataloger (se siden «Innstillinger») som brukes når
// søker registrerer nye kabler på et strekk og objekter på en stolpe.

export interface KabelType {
  id: string;
  navn: string; // f.eks. "Fiberkabel ADSS 24fo"
  beskrivelse: string;
  egendefinert?: boolean;
  // Datablad (PDF) for kabelen. Lagres som data-URL i denne prototypen
  // (ingen egen filserver), sammen med opprinnelig filnavn og størrelse.
  databladDataUrl?: string;
  databladFilnavn?: string;
  databladStorrelse?: number;
}

export interface ProduktKatalogItem {
  id: string;
  navn: string; // f.eks. "Skjøteboks"
  beskrivelse: string;
  egendefinert?: boolean;
}

// -------------------- Søknad --------------------

export type SoknadStatus =
  | 'utkast'
  | 'innsendt'
  | 'under_vurdering'
  | 'kalkyle_sendt'
  | 'avventer_tiltak'
  | 'under_utforelse'
  | 'til_sluttkontroll'
  | 'avsluttet';

export interface Soknad {
  id: string;
  soknadsnummer: string;
  navn: string;
  beskrivelse: string;
  adresse?: string; // adresse/stedsangivelse for traseen søknaden gjelder
  sokerCompanyId: string;
  stolpeeierCompanyId: string;
  status: SoknadStatus;
  poleIds: string[]; // omsøkte stolper
  lineIds: string[]; // omsøkte strekk
  createdAt: string;
  createdByPersonId: string;
  submittedAt?: string;
}

// Ønskede objekter søker ber om å montere på en stolpe. `produktId` viser til
// produktkatalogen under Innstillinger.
export interface Monteringsobjekt {
  id: string;
  produktId: string;
  antall: number;
  merknad?: string;
}

// Søkers opplysninger/registrering per stolpe i en gitt søknad
export interface SoknadPole {
  id: string;
  soknadId: string;
  poleId: string;

  // Søkers registrering
  skaderObservasjoner: string;
  anbefalteTiltak: string; // fritekst-anbefaling fra søker, ikke bindende
  merknad: string;
  bilder: string[]; // placeholder-filnavn/beskrivelser
  monteringsobjekter: Monteringsobjekt[];

  // Saksbehandlers vurdering
  vurderingStatus: 'ikke_vurdert' | 'godkjent_direkte' | 'krever_tiltak' | 'avslatt';
  vurderingBegrunnelse: string;
  vurdertAt?: string;
  vurdertByPersonId?: string;

  // Søkers beslutning på kalkylen for denne stolpen
  sokerBeslutning: 'ikke_besvart' | 'akseptert' | 'avslatt';
  sokerKommentar?: string;
  sokerBesluttetAt?: string;
  sokerBesluttetKalkyleVersjonId?: string;

  // Endelig godkjenning fra saksbehandler etter utført arbeid
  godkjentForOpphengAt?: string;
  godkjentForOpphengByPersonId?: string;

  // Trasévurdering — satt automatisk hvis nabostrekk berøres av avslag
  kreverNyTrasevurdering?: boolean;
}

// Tiltak knyttet til en stolpe i en søknad
export type TiltakStatus =
  | 'foreslatt' // priset av saksbehandler, venter på søkers svar
  | 'akseptert'
  | 'avslatt'
  | 'tildelt'
  | 'pagar'
  | 'meldt_ferdig'
  | 'sendt_tilbake'
  | 'godkjent';

export interface SoknadPoleTiltak {
  id: string;
  soknadId: string;
  poleId: string;
  katalogId: string;
  navn: string; // kopiert fra katalog ved opprettelse (kan avvike ved egendefinert)
  beskrivelse: string;
  enhet: string;
  antall: number;
  pris: number; // pris pr enhet i denne søknaden (kan justeres av saksbehandler)
  merknad?: string;
  status: TiltakStatus;

  // Tildeling til utførende
  tildeltCompanyId?: string;
  tildeltAt?: string;

  // Utførelse
  utforelseStatus: 'ikke_startet' | 'pagar' | 'meldt_ferdig';
  utforelsesdato?: string;
  utforendeKommentar?: string;
  utforendeBilder: string[];

  // Kontroll
  kontrollKommentar?: string;
  kontrollertAt?: string;
  kontrollertByPersonId?: string;
}

// Én ny kabel søker ønsker å henge opp på et strekk. Et strekk kan ha flere
// slike (ulike kabeltyper, eller flere kabler av samme type).
export interface NyKabelPost {
  id: string;
  kabelTypeId: string; // viser til kabeltype-katalogen under Innstillinger
  antall: number;
  merknad?: string;
}

// Søkers registrering per omsøkt strekk
export interface SoknadLine {
  id: string;
  soknadId: string;
  lineId: string;

  antallEksisterendeKabler: number;
  antallUnderGulvbandet: number; // foreløpig feltnavn
  nyeKabler: NyKabelPost[];

  hoydeVerdi?: number;
  hoydeEnhet?: string; // f.eks. "m"
  hoydeMalepunkt?: string; // fritekst: hvor ble det målt
  hoydeBeskrivelse?: string; // hva målingen gjelder (frihøyde over vei osv.)

  merknad: string;
  bilder: string[];

  // Saksbehandlers vurdering av strekket
  vurderingStatus: 'ikke_vurdert' | 'godkjent_direkte' | 'krever_tiltak' | 'avslatt';
  vurderingBegrunnelse: string;
  vurdertAt?: string;
  vurdertByPersonId?: string;

  kreverNyTrasevurdering?: boolean;
}

// -------------------- Kalkyle --------------------

export interface KalkyleVersjon {
  id: string;
  soknadId: string;
  versjonsnummer: number;
  sentAt: string;
  sentByPersonId: string;
  // Frossen kopi av tiltak på sendetidspunktet
  linjer: {
    tiltakId: string;
    poleId: string;
    poleNummer: number;
    navn: string;
    antall: number;
    pris: number;
    sum: number;
  }[];
  totalsum: number;
}

// -------------------- Kommunikasjon --------------------

export interface Melding {
  id: string;
  soknadId: string;
  poleId?: string;
  lineId?: string;
  authorPersonId: string;
  authorCompanyId: string;
  tekst: string;
  createdAt: string;
}

export type VarselType =
  | 'kalkyle_sendt'
  | 'soker_svarte'
  | 'tiltak_meldt_ferdig'
  | 'arbeid_sendt_tilbake'
  | 'stolpe_godkjent'
  | 'soknad_innsendt'
  | 'tiltak_tildelt'
  | 'trasevurdering_kreves';

export interface Varsel {
  id: string;
  soknadId: string;
  type: VarselType;
  tekst: string;
  createdAt: string;
  // hvem varselet er relevant for
  forCompanyId: string;
  poleId?: string;
  lineId?: string;
  read: boolean;
}

export interface HendelseLoggPost {
  id: string;
  soknadId: string;
  actorPersonId: string;
  actorCompanyId: string;
  action: string; // kort beskrivelse
  detaljer?: string;
  createdAt: string;
  poleId?: string;
  lineId?: string;
}

// -------------------- Root state --------------------

export interface RootData {
  companies: Company[];
  persons: Person[];
  poles: Pole[];
  lines: PowerLine[];
  katalog: TiltakKatalogItem[];
  kabelTyper: KabelType[];
  produkter: ProduktKatalogItem[];
  soknader: Soknad[];
  soknadPoler: SoknadPole[];
  soknadLinjer: SoknadLine[];
  tiltak: SoknadPoleTiltak[];
  kalkyleVersjoner: KalkyleVersjon[];
  meldinger: Melding[];
  varsler: Varsel[];
  hendelser: HendelseLoggPost[];
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { buildInitialData } from './data/seed';
import type {
  AppRole,
  RootData,
  Soknad,
  SoknadPole,
  SoknadLine,
  SoknadPoleTiltak,
  TiltakKatalogItem,
  KabelType,
  ProduktKatalogItem,
  Monteringsobjekt,
  NyKabelPost,
  KalkyleVersjon,
} from './types';

// Bump denne når datamodellen/seed endres, slik at lagret localStorage-data
// fra en tidligere versjon av prototypen ikke gir feil ved lasting.
const DATA_VERSION = 9;

interface CurrentUser {
  personId: string;
  companyId: string;
  role: AppRole;
}

interface StoreState {
  dataVersion: number;
  data: RootData;
  current: CurrentUser;

  setCurrentUser: (u: CurrentUser) => void;
  resetDemoData: () => void;

  // ----- Stolper / strekk (redigerbar stolpepark) -----
  addPole: (input: { number: number; ownerCompanyId: string; lat: number; lon: number; label?: string }) => void;
  updatePole: (poleId: string, patch: Partial<{ number: number; ownerCompanyId: string; lat: number; lon: number; label: string }>) => void;
  removePole: (poleId: string) => void;
  addLine: (poleAId: string, poleBId: string) => void;
  removeLine: (lineId: string) => void;

  // ----- Søknad (søker) -----
  createSoknad: (input: { navn: string; beskrivelse: string; adresse?: string; sokerCompanyId: string; stolpeeierCompanyId: string; poleIds: string[]; lineIds: string[]; createdByPersonId: string }) => string;
  updateSoknadMeta: (soknadId: string, patch: Partial<Pick<Soknad, 'navn' | 'beskrivelse' | 'adresse'>>) => void;
  setSoknadPoleLines: (soknadId: string, poleIds: string[], lineIds: string[]) => void;
  updateSoknadPole: (soknadId: string, poleId: string, patch: Partial<SoknadPole>) => void;
  updateSoknadLine: (soknadId: string, lineId: string, patch: Partial<SoknadLine>) => void;
  addMonteringsobjekt: (soknadId: string, poleId: string, produktId: string, antall: number, merknad?: string) => void;
  removeMonteringsobjekt: (soknadId: string, poleId: string, objId: string) => void;
  addNyKabel: (soknadId: string, lineId: string, kabelTypeId: string, antall: number, merknad?: string) => void;
  addNyKabelTilFlereStrekk: (soknadId: string, lineIds: string[], kabelTypeId: string, antall: number, merknad: string | undefined, byPersonId: string) => void;
  removeNyKabel: (soknadId: string, lineId: string, kabelPostId: string) => void;
  submitSoknad: (soknadId: string, byPersonId: string) => void;

  // ----- Saksbehandler: vurdering -----
  setPoleVurdering: (soknadId: string, poleId: string, patch: { vurderingStatus: SoknadPole['vurderingStatus']; vurderingBegrunnelse: string }, byPersonId: string) => void;
  setLineVurdering: (soknadId: string, lineId: string, patch: { vurderingStatus: SoknadLine['vurderingStatus']; vurderingBegrunnelse: string }, byPersonId: string) => void;

  // ----- Tiltakskatalog -----
  addKatalogItem: (item: Omit<TiltakKatalogItem, 'id' | 'egendefinert'>) => string;
  updateKatalogItem: (id: string, patch: Partial<TiltakKatalogItem>) => void;

  // ----- Innstillinger: kabeltyper og produkter -----
  addKabelType: (item: Omit<KabelType, 'id' | 'egendefinert'>) => string;
  updateKabelType: (id: string, patch: Partial<KabelType>) => void;
  addProdukt: (item: Omit<ProduktKatalogItem, 'id' | 'egendefinert'>) => string;
  updateProdukt: (id: string, patch: Partial<ProduktKatalogItem>) => void;

  // ----- Tiltak / kalkyle -----
  addTiltak: (soknadId: string, poleId: string, katalogId: string, antall: number, byPersonId: string, merknad?: string) => void;
  updateTiltak: (tiltakId: string, patch: Partial<Pick<SoknadPoleTiltak, 'antall' | 'pris' | 'merknad'>>) => void;
  removeTiltak: (tiltakId: string) => void;
  sendKalkyle: (soknadId: string, byPersonId: string) => void;

  // ----- Søker: svar på kalkyle -----
  respondToPole: (soknadId: string, poleId: string, decision: 'akseptert' | 'avslatt', kommentar: string, byPersonId: string) => void;

  // ----- Tildeling og utførelse -----
  assignTiltak: (tiltakId: string, contractorCompanyId: string, byPersonId: string) => void;
  updateTiltakUtforelse: (tiltakId: string, patch: { utforelseStatus?: SoknadPoleTiltak['utforelseStatus']; utforelsesdato?: string; utforendeKommentar?: string }, byPersonId: string) => void;
  addUtforendeBilde: (tiltakId: string, filnavn: string) => void;
  meldPoleFerdig: (soknadId: string, poleId: string, byPersonId: string, kommentar?: string) => void;
  kontrollerTiltak: (tiltakId: string, decision: 'godkjent' | 'sendt_tilbake', kommentar: string, byPersonId: string) => void;
  godkjennPoleForOppheng: (soknadId: string, poleId: string, byPersonId: string) => void;

  // ----- Kommunikasjon -----
  addMelding: (soknadId: string, tekst: string, byPersonId: string, extra?: { poleId?: string; lineId?: string }) => void;
  markVarselRead: (varselId: string) => void;
  markAllVarslerRead: (forCompanyId: string) => void;
}

function nowIso() {
  return new Date().toISOString();
}

function pushLog(data: RootData, soknadId: string, actorPersonId: string, actorCompanyId: string, action: string, detaljer?: string, extra: { poleId?: string; lineId?: string } = {}) {
  data.hendelser.push({
    id: uuid(),
    soknadId,
    actorPersonId,
    actorCompanyId,
    action,
    detaljer,
    createdAt: nowIso(),
    poleId: extra.poleId,
    lineId: extra.lineId,
  });
}

function pushVarsel(data: RootData, soknadId: string, type: RootData['varsler'][number]['type'], tekst: string, forCompanyId: string, extra: { poleId?: string; lineId?: string } = {}) {
  data.varsler.push({
    id: uuid(),
    soknadId,
    type,
    tekst,
    createdAt: nowIso(),
    forCompanyId,
    poleId: extra.poleId,
    lineId: extra.lineId,
    read: false,
  });
}

function findSoknad(data: RootData, soknadId: string): Soknad {
  const s = data.soknader.find((x) => x.id === soknadId);
  if (!s) throw new Error(`Fant ikke søknad ${soknadId}`);
  return s;
}

function findOrCreateSoknadPole(data: RootData, soknadId: string, poleId: string): SoknadPole {
  let sp = data.soknadPoler.find((x) => x.soknadId === soknadId && x.poleId === poleId);
  if (!sp) {
    sp = {
      id: uuid(),
      soknadId,
      poleId,
      skaderObservasjoner: '',
      anbefalteTiltak: '',
      merknad: '',
      bilder: [],
      monteringsobjekter: [],
      vurderingStatus: 'ikke_vurdert',
      vurderingBegrunnelse: '',
      sokerBeslutning: 'ikke_besvart',
    };
    data.soknadPoler.push(sp);
  }
  return sp;
}

function findOrCreateSoknadLine(data: RootData, soknadId: string, lineId: string): SoknadLine {
  let sl = data.soknadLinjer.find((x) => x.soknadId === soknadId && x.lineId === lineId);
  if (!sl) {
    sl = {
      id: uuid(),
      soknadId,
      lineId,
      antallEksisterendeKabler: 0,
      antallUnderGulvbandet: 0,
      nyeKabler: [],
      merknad: '',
      bilder: [],
      vurderingStatus: 'ikke_vurdert',
      vurderingBegrunnelse: '',
    };
    data.soknadLinjer.push(sl);
  }
  return sl;
}

// Finn strekk i søknaden som har `poleId` som en av endestolpene.
function linesTouchingPoleInSoknad(data: RootData, soknad: Soknad, poleId: string) {
  return soknad.lineIds
    .map((lid) => data.lines.find((l) => l.id === lid))
    .filter((l): l is NonNullable<typeof l> => !!l && (l.poleAId === poleId || l.poleBId === poleId));
}

function poleNumber(data: RootData, poleId: string): number {
  return data.poles.find((p) => p.id === poleId)?.number ?? 0;
}

function withData(set: (fn: (s: StoreState) => Partial<StoreState>) => void, mutator: (data: RootData) => void) {
  set((s) => {
    const data: RootData = JSON.parse(JSON.stringify(s.data));
    mutator(data);
    return { data };
  });
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      dataVersion: DATA_VERSION,
      data: buildInitialData(),
      current: { personId: 'p-soker-1a', companyId: 'c-soker-1', role: 'soker' },

      setCurrentUser: (u) => set({ current: u }),

      resetDemoData: () => set({ data: buildInitialData(), dataVersion: DATA_VERSION }),

      addPole: (input) =>
        withData(set, (data) => {
          data.poles.push({ id: uuid(), number: input.number, ownerCompanyId: input.ownerCompanyId, lat: input.lat, lon: input.lon, label: input.label });
        }),

      updatePole: (poleId, patch) =>
        withData(set, (data) => {
          const p = data.poles.find((x) => x.id === poleId);
          if (p) Object.assign(p, patch);
        }),

      removePole: (poleId) =>
        withData(set, (data) => {
          const p = data.poles.find((x) => x.id === poleId);
          if (p) p.removed = true;
          data.lines.forEach((l) => {
            if (l.poleAId === poleId || l.poleBId === poleId) l.removed = true;
          });
        }),

      addLine: (poleAId, poleBId) =>
        withData(set, (data) => {
          if (poleAId === poleBId) return;
          const exists = data.lines.find(
            (l) => !l.removed && ((l.poleAId === poleAId && l.poleBId === poleBId) || (l.poleAId === poleBId && l.poleBId === poleAId))
          );
          if (exists) return;
          data.lines.push({ id: uuid(), poleAId, poleBId });
        }),

      removeLine: (lineId) =>
        withData(set, (data) => {
          const l = data.lines.find((x) => x.id === lineId);
          if (l) l.removed = true;
        }),

      createSoknad: (input) => {
        const id = uuid();
        withData(set, (data) => {
          const nummer = `KO-2026-${String(1000 + data.soknader.length + 1).slice(-4)}`;
          const soknad: Soknad = {
            id,
            soknadsnummer: nummer,
            navn: input.navn,
            beskrivelse: input.beskrivelse,
            adresse: input.adresse,
            sokerCompanyId: input.sokerCompanyId,
            stolpeeierCompanyId: input.stolpeeierCompanyId,
            status: 'utkast',
            poleIds: input.poleIds,
            lineIds: input.lineIds,
            createdAt: nowIso(),
            createdByPersonId: input.createdByPersonId,
          };
          data.soknader.push(soknad);
          input.poleIds.forEach((pid) => findOrCreateSoknadPole(data, id, pid));
          input.lineIds.forEach((lid) => findOrCreateSoknadLine(data, id, lid));
          pushLog(data, id, input.createdByPersonId, input.sokerCompanyId, 'Søknad opprettet som utkast');
        });
        return id;
      },

      updateSoknadMeta: (soknadId, patch) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          Object.assign(s, patch);
        }),

      setSoknadPoleLines: (soknadId, poleIds, lineIds) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          s.poleIds = poleIds;
          s.lineIds = lineIds;
          poleIds.forEach((pid) => findOrCreateSoknadPole(data, soknadId, pid));
          lineIds.forEach((lid) => findOrCreateSoknadLine(data, soknadId, lid));
        }),

      updateSoknadPole: (soknadId, poleId, patch) =>
        withData(set, (data) => {
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          Object.assign(sp, patch);
        }),

      updateSoknadLine: (soknadId, lineId, patch) =>
        withData(set, (data) => {
          const sl = findOrCreateSoknadLine(data, soknadId, lineId);
          Object.assign(sl, patch);
        }),

      addMonteringsobjekt: (soknadId, poleId, produktId, antall, merknad) =>
        withData(set, (data) => {
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          const obj: Monteringsobjekt = { id: uuid(), produktId, antall, merknad };
          sp.monteringsobjekter.push(obj);
        }),

      removeMonteringsobjekt: (soknadId, poleId, objId) =>
        withData(set, (data) => {
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          sp.monteringsobjekter = sp.monteringsobjekter.filter((o) => o.id !== objId);
        }),

      addNyKabel: (soknadId, lineId, kabelTypeId, antall, merknad) =>
        withData(set, (data) => {
          const sl = findOrCreateSoknadLine(data, soknadId, lineId);
          const post: NyKabelPost = { id: uuid(), kabelTypeId, antall, merknad };
          sl.nyeKabler.push(post);
        }),

      addNyKabelTilFlereStrekk: (soknadId, lineIds, kabelTypeId, antall, merknad, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const kabel = data.kabelTyper.find((k) => k.id === kabelTypeId);
          lineIds.forEach((lineId) => {
            const sl = findOrCreateSoknadLine(data, soknadId, lineId);
            sl.nyeKabler.push({ id: uuid(), kabelTypeId, antall, merknad });
          });
          if (lineIds.length > 0) {
            pushLog(
              data,
              soknadId,
              byPersonId,
              s.sokerCompanyId,
              `Kabel «${kabel?.navn ?? kabelTypeId}» (${antall} stk) lagt til på ${lineIds.length} strekk`,
              undefined
            );
          }
        }),

      removeNyKabel: (soknadId, lineId, kabelPostId) =>
        withData(set, (data) => {
          const sl = findOrCreateSoknadLine(data, soknadId, lineId);
          sl.nyeKabler = sl.nyeKabler.filter((k) => k.id !== kabelPostId);
        }),

      submitSoknad: (soknadId, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          s.status = 'innsendt';
          s.submittedAt = nowIso();
          pushLog(data, soknadId, byPersonId, s.sokerCompanyId, 'Søknad sendt inn');
          pushVarsel(data, soknadId, 'soknad_innsendt', `Søknad ${s.soknadsnummer} "${s.navn}" er sendt inn.`, s.stolpeeierCompanyId);
        }),

      setPoleVurdering: (soknadId, poleId, patch, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          sp.vurderingStatus = patch.vurderingStatus;
          sp.vurderingBegrunnelse = patch.vurderingBegrunnelse;
          sp.vurdertAt = nowIso();
          sp.vurdertByPersonId = byPersonId;
          if (s.status === 'innsendt') s.status = 'under_vurdering';
          pushLog(data, soknadId, byPersonId, s.stolpeeierCompanyId, `Vurdering registrert på stolpe ${poleNumber(data, poleId)}`, patch.vurderingBegrunnelse, { poleId });
        }),

      setLineVurdering: (soknadId, lineId, patch, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const sl = findOrCreateSoknadLine(data, soknadId, lineId);
          sl.vurderingStatus = patch.vurderingStatus;
          sl.vurderingBegrunnelse = patch.vurderingBegrunnelse;
          sl.vurdertAt = nowIso();
          sl.vurdertByPersonId = byPersonId;
          if (s.status === 'innsendt') s.status = 'under_vurdering';
          pushLog(data, soknadId, byPersonId, s.stolpeeierCompanyId, `Vurdering registrert på strekk`, patch.vurderingBegrunnelse, { lineId });
        }),

      addKatalogItem: (item) => {
        const id = uuid();
        withData(set, (data) => {
          data.katalog.push({ ...item, id, egendefinert: true });
        });
        return id;
      },

      updateKatalogItem: (id, patch) =>
        withData(set, (data) => {
          const k = data.katalog.find((x) => x.id === id);
          if (k) Object.assign(k, patch);
        }),

      addKabelType: (item) => {
        const id = uuid();
        withData(set, (data) => {
          data.kabelTyper.push({ ...item, id, egendefinert: true });
        });
        return id;
      },

      updateKabelType: (id, patch) =>
        withData(set, (data) => {
          const k = data.kabelTyper.find((x) => x.id === id);
          if (k) Object.assign(k, patch);
        }),

      addProdukt: (item) => {
        const id = uuid();
        withData(set, (data) => {
          data.produkter.push({ ...item, id, egendefinert: true });
        });
        return id;
      },

      updateProdukt: (id, patch) =>
        withData(set, (data) => {
          const p = data.produkter.find((x) => x.id === id);
          if (p) Object.assign(p, patch);
        }),

      addTiltak: (soknadId, poleId, katalogId, antall, byPersonId, merknad) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const k = data.katalog.find((x) => x.id === katalogId);
          if (!k) return;
          const t: SoknadPoleTiltak = {
            id: uuid(),
            soknadId,
            poleId,
            katalogId,
            navn: k.navn,
            beskrivelse: k.beskrivelse,
            enhet: k.enhet,
            antall,
            pris: k.standardpris,
            merknad,
            status: 'foreslatt',
            utforelseStatus: 'ikke_startet',
            utforendeBilder: [],
          };
          data.tiltak.push(t);
          pushLog(data, soknadId, byPersonId, s.stolpeeierCompanyId, `Tiltak "${k.navn}" lagt til på stolpe ${poleNumber(data, poleId)}`, undefined, { poleId });
        }),

      updateTiltak: (tiltakId, patch) =>
        withData(set, (data) => {
          const t = data.tiltak.find((x) => x.id === tiltakId);
          if (t) Object.assign(t, patch);
        }),

      removeTiltak: (tiltakId) =>
        withData(set, (data) => {
          data.tiltak = data.tiltak.filter((x) => x.id !== tiltakId);
        }),

      sendKalkyle: (soknadId, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const relevante = data.tiltak.filter((t) => t.soknadId === soknadId && (t.status === 'foreslatt' || t.status === 'akseptert' || t.status === 'avslatt'));
          const versjonsnummer = data.kalkyleVersjoner.filter((v) => v.soknadId === soknadId).length + 1;
          const linjer = relevante.map((t) => ({
            tiltakId: t.id,
            poleId: t.poleId,
            poleNummer: poleNumber(data, t.poleId),
            navn: t.navn,
            antall: t.antall,
            pris: t.pris,
            sum: t.antall * t.pris,
          }));
          const versjon: KalkyleVersjon = {
            id: uuid(),
            soknadId,
            versjonsnummer,
            sentAt: nowIso(),
            sentByPersonId: byPersonId,
            linjer,
            totalsum: linjer.reduce((sum, l) => sum + l.sum, 0),
          };
          data.kalkyleVersjoner.push(versjon);
          s.status = 'kalkyle_sendt';
          // sett tiltak som var i forrige runde tilbake til "foreslått" ift. søkers svar på ny versjon
          relevante.forEach((t) => {
            if (t.status !== 'akseptert') t.status = 'foreslatt';
          });
          pushLog(data, soknadId, byPersonId, s.stolpeeierCompanyId, `Kalkyle versjon ${versjonsnummer} sendt til søker`, `Totalsum ${versjon.totalsum.toLocaleString('nb-NO')} kr`);
          pushVarsel(data, soknadId, 'kalkyle_sendt', `Kalkyle versjon ${versjonsnummer} for søknad ${s.soknadsnummer} er sendt til søker.`, s.sokerCompanyId);
        }),

      respondToPole: (soknadId, poleId, decision, kommentar, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          const senesteKalkyle = data.kalkyleVersjoner.filter((v) => v.soknadId === soknadId).sort((a, b) => b.versjonsnummer - a.versjonsnummer)[0];

          sp.sokerBeslutning = decision;
          sp.sokerKommentar = kommentar;
          sp.sokerBesluttetAt = nowIso();
          sp.sokerBesluttetKalkyleVersjonId = senesteKalkyle?.id;

          const tiltakPaPole = data.tiltak.filter((t) => t.soknadId === soknadId && t.poleId === poleId);
          tiltakPaPole.forEach((t) => {
            if (t.status === 'foreslatt') t.status = decision;
          });

          pushLog(
            data,
            soknadId,
            byPersonId,
            s.sokerCompanyId,
            `Søker ${decision === 'akseptert' ? 'aksepterte' : 'avslo'} tiltak på stolpe ${poleNumber(data, poleId)}`,
            kommentar || undefined,
            { poleId }
          );
          pushVarsel(
            data,
            soknadId,
            'soker_svarte',
            `Søker har ${decision === 'akseptert' ? 'akseptert' : 'avslått'} tiltak på stolpe ${poleNumber(data, poleId)} i søknad ${s.soknadsnummer}.`,
            s.stolpeeierCompanyId,
            { poleId }
          );

          if (decision === 'avslatt') {
            const bertorteLinjer = linesTouchingPoleInSoknad(data, s, poleId);
            bertorteLinjer.forEach((l) => {
              const sl = findOrCreateSoknadLine(data, soknadId, l.id);
              sl.kreverNyTrasevurdering = true;
            });
            if (bertorteLinjer.length > 0) {
              pushLog(data, soknadId, byPersonId, s.sokerCompanyId, `Strekk ved stolpe ${poleNumber(data, poleId)} merket "krever ny trasévurdering"`, undefined, { poleId });
              pushVarsel(
                data,
                soknadId,
                'trasevurdering_kreves',
                `Strekk ved stolpe ${poleNumber(data, poleId)} i søknad ${s.soknadsnummer} krever ny trasévurdering etter avslag.`,
                s.stolpeeierCompanyId,
                { poleId }
              );
            }
            s.status = 'avventer_tiltak';
          }

          // Oppdater søknadsstatus dersom alt er besvart
          const harUbesvarteTiltak = data.tiltak.some((t) => t.soknadId === soknadId && t.status === 'foreslatt');
          if (!harUbesvarteTiltak && s.status !== 'avventer_tiltak') {
            s.status = 'under_utforelse';
          }
        }),

      assignTiltak: (tiltakId, contractorCompanyId, byPersonId) =>
        withData(set, (data) => {
          const t = data.tiltak.find((x) => x.id === tiltakId);
          if (!t) return;
          const s = findSoknad(data, t.soknadId);
          t.tildeltCompanyId = contractorCompanyId;
          t.tildeltAt = nowIso();
          t.status = 'tildelt';
          if (s.status !== 'avventer_tiltak') s.status = 'under_utforelse';
          pushLog(data, t.soknadId, byPersonId, s.stolpeeierCompanyId, `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} tildelt entreprenør`, undefined, { poleId: t.poleId });
          pushVarsel(data, t.soknadId, 'tiltak_tildelt', `Dere har fått tildelt tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} i søknad ${s.soknadsnummer}.`, contractorCompanyId, { poleId: t.poleId });
        }),

      updateTiltakUtforelse: (tiltakId, patch, byPersonId) =>
        withData(set, (data) => {
          const t = data.tiltak.find((x) => x.id === tiltakId);
          if (!t) return;
          const s = findSoknad(data, t.soknadId);
          if (patch.utforelseStatus) t.utforelseStatus = patch.utforelseStatus;
          if (patch.utforelsesdato !== undefined) t.utforelsesdato = patch.utforelsesdato;
          if (patch.utforendeKommentar !== undefined) t.utforendeKommentar = patch.utforendeKommentar;

          if (patch.utforelseStatus === 'meldt_ferdig') {
            t.status = 'meldt_ferdig';
            pushLog(data, t.soknadId, byPersonId, t.tildeltCompanyId ?? '', `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} meldt ferdig`, undefined, { poleId: t.poleId });
            pushVarsel(data, t.soknadId, 'tiltak_meldt_ferdig', `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} i søknad ${s.soknadsnummer} er meldt ferdig.`, s.stolpeeierCompanyId, { poleId: t.poleId });
            s.status = 'til_sluttkontroll';
          } else if (patch.utforelseStatus === 'pagar' && t.status === 'tildelt') {
            t.status = 'pagar';
          }
        }),

      addUtforendeBilde: (tiltakId, filnavn) =>
        withData(set, (data) => {
          const t = data.tiltak.find((x) => x.id === tiltakId);
          if (t) t.utforendeBilder.push(filnavn);
        }),

      meldPoleFerdig: (soknadId, poleId, byPersonId, kommentar) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const relevanteTiltak = data.tiltak.filter((t) => t.soknadId === soknadId && t.poleId === poleId && ['tildelt', 'pagar'].includes(t.status));
          relevanteTiltak.forEach((t) => {
            t.utforelseStatus = 'meldt_ferdig';
            t.status = 'meldt_ferdig';
            t.utforelsesdato = t.utforelsesdato ?? new Date().toISOString().slice(0, 10);
            if (kommentar) t.utforendeKommentar = kommentar;
          });
          if (relevanteTiltak.length > 0) {
            pushLog(data, soknadId, byPersonId, relevanteTiltak[0].tildeltCompanyId ?? '', `Stolpe ${poleNumber(data, poleId)} meldt ferdig av entreprenør`, kommentar, { poleId });
            pushVarsel(data, soknadId, 'tiltak_meldt_ferdig', `Stolpe ${poleNumber(data, poleId)} i søknad ${s.soknadsnummer} er meldt ferdig av entreprenør.`, s.stolpeeierCompanyId, { poleId });
            s.status = 'til_sluttkontroll';
          }
        }),

      kontrollerTiltak: (tiltakId, decision, kommentar, byPersonId) =>
        withData(set, (data) => {
          const t = data.tiltak.find((x) => x.id === tiltakId);
          if (!t) return;
          const s = findSoknad(data, t.soknadId);
          t.status = decision;
          t.kontrollKommentar = kommentar;
          t.kontrollertAt = nowIso();
          t.kontrollertByPersonId = byPersonId;
          if (decision === 'sendt_tilbake') {
            t.utforelseStatus = 'pagar';
            pushLog(data, t.soknadId, byPersonId, s.stolpeeierCompanyId, `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} sendt tilbake til entreprenør`, kommentar, { poleId: t.poleId });
            pushVarsel(data, t.soknadId, 'arbeid_sendt_tilbake', `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} i søknad ${s.soknadsnummer} er sendt tilbake.`, t.tildeltCompanyId ?? s.stolpeeierCompanyId, { poleId: t.poleId });
          } else {
            pushLog(data, t.soknadId, byPersonId, s.stolpeeierCompanyId, `Tiltak "${t.navn}" på stolpe ${poleNumber(data, t.poleId)} kontrollert og godkjent`, kommentar, { poleId: t.poleId });
          }
        }),

      godkjennPoleForOppheng: (soknadId, poleId, byPersonId) =>
        withData(set, (data) => {
          const s = findSoknad(data, soknadId);
          const sp = findOrCreateSoknadPole(data, soknadId, poleId);
          sp.godkjentForOpphengAt = nowIso();
          sp.godkjentForOpphengByPersonId = byPersonId;
          pushLog(data, soknadId, byPersonId, s.stolpeeierCompanyId, `Stolpe ${poleNumber(data, poleId)} godkjent for omsøkt oppheng`, undefined, { poleId });
          pushVarsel(data, soknadId, 'stolpe_godkjent', `Stolpe ${poleNumber(data, poleId)} i søknad ${s.soknadsnummer} er godkjent for omsøkt oppheng.`, s.sokerCompanyId, { poleId });

          // Er hele søknaden ferdig?
          const allePoler = s.poleIds.map((pid) => data.soknadPoler.find((x) => x.soknadId === soknadId && x.poleId === pid));
          const alleGodkjentEllerAvslatt = allePoler.every((p) => !p || !!p.godkjentForOpphengAt || p.sokerBeslutning === 'avslatt' || p.vurderingStatus === 'godkjent_direkte' || p.vurderingStatus === 'avslatt');
          if (alleGodkjentEllerAvslatt) s.status = 'avsluttet';
        }),

      addMelding: (soknadId, tekst, byPersonId, extra) =>
        withData(set, (data) => {
          data.meldinger.push({
            id: uuid(),
            soknadId,
            authorPersonId: byPersonId,
            authorCompanyId: get().current.companyId,
            tekst,
            createdAt: nowIso(),
            poleId: extra?.poleId,
            lineId: extra?.lineId,
          });
        }),

      markVarselRead: (varselId) =>
        withData(set, (data) => {
          const v = data.varsler.find((x) => x.id === varselId);
          if (v) v.read = true;
        }),

      markAllVarslerRead: (forCompanyId) =>
        withData(set, (data) => {
          data.varsler.forEach((v) => {
            if (v.forCompanyId === forCompanyId) v.read = true;
          });
        }),
    }),
    {
      name: 'kabelopphenget-storage-v9',
      version: DATA_VERSION,
      migrate: (persisted) => {
        // Enhver strukturendring i seed/typer -> forkast lagret state og bygg på nytt.
        return persisted as StoreState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<StoreState> | undefined;
        if (!persisted || persisted.dataVersion !== DATA_VERSION) {
          return currentState;
        }
        return { ...currentState, ...persisted } as StoreState;
      },
    }
  )
);

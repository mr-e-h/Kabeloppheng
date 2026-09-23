import { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../store';
import {
  getSoknad,
  getCompany,
  getPerson,
  getTiltakForSoknad,
  getKalkyleVersjoner,
  getMeldinger,
  getHendelser,
  getSoknadPole,
  getSoknadLine,
} from '../selectors';
import { MapView } from '../components/MapView';
import { PoleDetailPanel } from '../components/PoleDetailPanel';
import { LineDetailPanel } from '../components/LineDetailPanel';
import { StatusBadge, PlainBadge, SoknadStatusBadge, TiltakStatusBadge, VurderingStatusBadge } from '../components/StatusBadge';
import { poleVisualStatus, lineVisualStatus, SOKNAD_STATUS_LABEL, SOKNAD_STATUS_COLOR, TILTAK_STATUS_LABEL, formatNOK, formatDate } from '../statusUtils';
import type { Melding, HendelseLoggPost } from '../types';

type Tab = 'kart' | 'liste' | 'kalkyle' | 'aktivitet';

type AktivitetItem =
  | { kind: 'melding'; id: string; createdAt: string; melding: Melding }
  | { kind: 'hendelse'; id: string; createdAt: string; hendelse: HendelseLoggPost };

export function SoknadDetalj() {
  const { id } = useParams<{ id: string }>();
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();

  const [tab, setTab] = useState<Tab>('kart');
  const [selected, setSelected] = useState<{ type: 'pole' | 'line'; id: string } | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);

  // Velg flere strekk samtidig, f.eks. for å registrere én kabel over flere
  // stolpestrekk i ett steg.
  const [lineSelectMode, setLineSelectMode] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [bulkKabelTypeId, setBulkKabelTypeId] = useState(data.kabelTyper[0]?.id ?? '');
  const [bulkAntall, setBulkAntall] = useState(1);
  const [bulkMerknad, setBulkMerknad] = useState('');
  const [nyMelding, setNyMelding] = useState('');

  function toggleLineSelection(lineId: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  const soknad = id ? getSoknad(data, id) : undefined;

  const poles = useMemo(() => (soknad ? soknad.poleIds.map((pid) => data.poles.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => !!p) : []), [soknad, data.poles]);
  const lines = useMemo(() => (soknad ? soknad.lineIds.map((lid) => data.lines.find((l) => l.id === lid)).filter((l): l is NonNullable<typeof l> => !!l) : []), [soknad, data.lines]);

  if (!id) return <Navigate to="/soknader" replace />;
  if (!soknad) {
    return (
      <div className="empty-state">
        <h3>Fant ikke søknaden</h3>
        <p>Den kan ha blitt fjernet, eller lenken er feil.</p>
      </div>
    );
  }

  const soker = getCompany(data, soknad.sokerCompanyId);
  const stolpeeier = getCompany(data, soknad.stolpeeierCompanyId);
  const tiltak = getTiltakForSoknad(data, soknad.id);
  const kalkyler = getKalkyleVersjoner(data, soknad.id);
  const alleMeldinger = getMeldinger(data, soknad.id);
  const hendelser = getHendelser(data, soknad.id);

  // Samlet, kronologisk historikk for søknaden: meldinger og statusendringer
  // om hverandre, slik at søker, saksbehandler og utførende ser det samme.
  const aktivitet: AktivitetItem[] = [
    ...alleMeldinger.map((m): AktivitetItem => ({ kind: 'melding', id: m.id, createdAt: m.createdAt, melding: m })),
    ...hendelser.map((h): AktivitetItem => ({ kind: 'hendelse', id: h.id, createdAt: h.createdAt, hendelse: h })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const erSoker = current.role === 'soker' && current.companyId === soknad.sokerCompanyId;
  const erSaksbehandler = current.role === 'saksbehandler' && current.companyId === soknad.stolpeeierCompanyId;
  const erEntreprenor = current.role === 'entreprenor' && tiltak.some((t) => t.tildeltCompanyId === current.companyId);
  const harTilgang = erSoker || erSaksbehandler || erEntreprenor;

  if (!harTilgang) {
    return (
      <div className="empty-state">
        <h3>Ingen tilgang</h3>
        <p>Denne søknaden er ikke delt med din virksomhet i denne rollen. Bytt testbruker for å se søknaden fra riktig virksomhet.</p>
      </div>
    );
  }

  function getPoleStatus(pole: { id: string }) {
    const sp = getSoknadPole(data, soknad!.id, pole.id);
    return poleVisualStatus(sp, tiltak.filter((t) => t.poleId === pole.id));
  }
  function getLineStatus(line: { id: string }) {
    const sl = getSoknadLine(data, soknad!.id, line.id);
    return lineVisualStatus(sl);
  }

  // Kort, permanent tekst vist langs strekket i kartet: antall kabler før
  // søknaden (og etter, hvis den blir godkjent), samt målt høyde/frihøyde.
  function getLineLabel(line: { id: string }): string | null {
    const sl = getSoknadLine(data, soknad!.id, line.id);
    if (!sl) return null;
    const eksisterende = sl.antallEksisterendeKabler ?? 0;
    const nye = (sl.nyeKabler ?? []).reduce((sum, k) => sum + k.antall, 0);
    const parts: string[] = [];
    if (eksisterende > 0 || nye > 0) {
      parts.push(nye > 0 ? `${eksisterende}→${eksisterende + nye} kabler` : `${eksisterende} kabler`);
    }
    if (sl.hoydeVerdi != null) {
      parts.push(`${sl.hoydeVerdi}${sl.hoydeEnhet ?? 'm'}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  function tagForPoleId(poleId?: string): string | undefined {
    if (!poleId) return undefined;
    const p = data.poles.find((x) => x.id === poleId);
    return p ? `Stolpe ${p.number}` : undefined;
  }
  function tagForLineId(lineId?: string): string | undefined {
    if (!lineId) return undefined;
    const l = data.lines.find((x) => x.id === lineId);
    if (!l) return undefined;
    const a = data.poles.find((p) => p.id === l.poleAId);
    const b = data.poles.find((p) => p.id === l.poleBId);
    return a && b ? `Strekk ${a.number}–${b.number}` : undefined;
  }
  function gaTilKart(poleId?: string, lineId?: string) {
    if (poleId) setSelected({ type: 'pole', id: poleId });
    else if (lineId) setSelected({ type: 'line', id: lineId });
    setLineSelectMode(false);
    setTab('kart');
  }
  function sendGenerellMelding() {
    if (!nyMelding.trim()) return;
    store.addMelding(soknad!.id, nyMelding.trim(), current.personId);
    setNyMelding('');
  }

  const totalSum = tiltak.reduce((sum, t) => sum + t.antall * t.pris, 0);
  const akseptertSum = tiltak.filter((t) => ['akseptert', 'tildelt', 'pagar', 'meldt_ferdig', 'godkjent'].includes(t.status)).reduce((sum, t) => sum + t.antall * t.pris, 0);
  const harForeslatteTiltak = tiltak.some((t) => t.status === 'foreslatt');

  function exportCsv() {
    const rows = [
      ['Stolpenummer', 'Tiltak', 'Antall', 'Enhet', 'Pris', 'Sum', 'Status', 'Ansvarlig utførende'],
      ...tiltak.map((t) => {
        const pole = data.poles.find((p) => p.id === t.poleId);
        const utf = t.tildeltCompanyId ? getCompany(data, t.tildeltCompanyId)?.name ?? '' : '';
        return [String(pole?.number ?? ''), t.navn, String(t.antall), t.enhet, String(t.pris), String(t.antall * t.pris), TILTAK_STATUS_LABEL[t.status], utf];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiltaksliste_${soknad!.soknadsnummer}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div className="hstack" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{soknad.navn}</h1>
            <PlainBadge text={soknad.soknadsnummer} tone="primary" />
          </div>
          {editingMeta ? (
            <div className="stack" style={{ maxWidth: 520 }}>
              <input defaultValue={soknad.navn} onBlur={(e) => store.updateSoknadMeta(soknad.id, { navn: e.target.value })} />
              <input defaultValue={soknad.adresse ?? ''} placeholder="Adresse" onBlur={(e) => store.updateSoknadMeta(soknad.id, { adresse: e.target.value || undefined })} />
              <textarea defaultValue={soknad.beskrivelse} onBlur={(e) => store.updateSoknadMeta(soknad.id, { beskrivelse: e.target.value })} />
              <button className="btn btn-sm" onClick={() => setEditingMeta(false)}>Ferdig</button>
            </div>
          ) : (
            <p className="subtitle">
              {soknad.beskrivelse}{' '}
              {erSoker && soknad.status === 'utkast' && (
                <button className="btn btn-sm btn-ghost" onClick={() => setEditingMeta(true)}>✎ Rediger</button>
              )}
            </p>
          )}
          <div className="kv" style={{ marginTop: 6 }}>
            <dt>Søker</dt>
            <dd>{soker?.name}</dd>
            {soknad.adresse && (
              <>
                <dt>Adresse</dt>
                <dd>{soknad.adresse}</dd>
              </>
            )}
            <dt>Stolpeeier / netteier</dt>
            <dd>{stolpeeier?.name}</dd>
            <dt>Status</dt>
            <dd><SoknadStatusBadge status={soknad.status} /></dd>
            <dt>Opprettet</dt>
            <dd>{formatDate(soknad.createdAt)} {soknad.submittedAt && `· Sendt inn ${formatDate(soknad.submittedAt)}`}</dd>
          </div>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end' }}>
          {erSoker && soknad.status === 'utkast' && (
            <button className="btn btn-primary" onClick={() => store.submitSoknad(soknad.id, current.personId)}>
              Send inn søknad →
            </button>
          )}
          {erSaksbehandler && harForeslatteTiltak && (
            <button className="btn btn-primary" onClick={() => store.sendKalkyle(soknad.id, current.personId)}>
              Send kalkyle til søker
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'kart' ? 'active' : ''}`} onClick={() => setTab('kart')}>Kart</div>
        <div className={`tab ${tab === 'liste' ? 'active' : ''}`} onClick={() => setTab('liste')}>Stolper &amp; strekk ({poles.length + lines.length})</div>
        <div className={`tab ${tab === 'kalkyle' ? 'active' : ''}`} onClick={() => setTab('kalkyle')}>Kalkyle ({formatNOK(totalSum)})</div>
        <div className={`tab ${tab === 'aktivitet' ? 'active' : ''}`} onClick={() => setTab('aktivitet')}>Meldinger &amp; status ({aktivitet.length})</div>
      </div>

      {tab === 'kart' && (
        <>
          {erSoker && soknad.status === 'utkast' && (
            <div className="card card-pad" style={{ marginBottom: 12 }}>
              <div className="hstack" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong>Kabel over flere strekk</strong>
                {!lineSelectMode ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setSelected(null);
                      setLineSelectMode(true);
                    }}
                  >
                    📏 Velg flere strekk
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setLineSelectMode(false);
                      setSelectedLineIds(new Set());
                    }}
                  >
                    Avslutt valg
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="map-shell">
            <MapView
              poles={poles}
              lines={lines}
              getPoleStatus={getPoleStatus}
              getLineStatus={getLineStatus}
              getLineLabel={getLineLabel}
              selectedPoleId={selected?.type === 'pole' ? selected.id : undefined}
              selectedLineId={selected?.type === 'line' ? selected.id : undefined}
              onSelectPole={lineSelectMode ? undefined : (pid) => setSelected({ type: 'pole', id: pid })}
              onSelectLine={lineSelectMode ? undefined : (lid) => setSelected({ type: 'line', id: lid })}
              lineSelectMode={lineSelectMode}
              selectedLineIds={selectedLineIds}
              onToggleLine={toggleLineSelection}
              height={560}
            />
            {lineSelectMode ? (
              <div className="card detail-panel">
                <div className="card-pad stack">
                  <h4 style={{ margin: 0 }}>Legg til kabel på valgte strekk</h4>
                  {selectedLineIds.size > 0 && (
                    <div className="faint">
                      {selectedLineIds.size} strekk valgt:{' '}
                      {Array.from(selectedLineIds)
                        .map((lid) => {
                          const l = lines.find((x) => x.id === lid);
                          const a = l ? data.poles.find((p) => p.id === l.poleAId) : undefined;
                          const b = l ? data.poles.find((p) => p.id === l.poleBId) : undefined;
                          return a && b ? `${a.number}–${b.number}` : null;
                        })
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                  <div className="field">
                    <label className="field-label">Kabeltype</label>
                    <select value={bulkKabelTypeId} onChange={(e) => setBulkKabelTypeId(e.target.value)}>
                      {data.kabelTyper.map((kt) => (
                        <option key={kt.id} value={kt.id}>{kt.navn}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Antall</label>
                    <input type="number" min={1} value={bulkAntall} onChange={(e) => setBulkAntall(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="field">
                    <label className="field-label">Merknad (valgfritt)</label>
                    <input value={bulkMerknad} onChange={(e) => setBulkMerknad(e.target.value)} />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selectedLineIds.size === 0 || !bulkKabelTypeId}
                    onClick={() => {
                      store.addNyKabelTilFlereStrekk(soknad.id, Array.from(selectedLineIds), bulkKabelTypeId, bulkAntall, bulkMerknad || undefined, current.personId);
                      setBulkMerknad('');
                    }}
                  >
                    Legg til kabel på {selectedLineIds.size || ''} valgte strekk
                  </button>
                  {selectedLineIds.size > 0 && (
                    <button className="btn btn-sm btn-ghost" onClick={() => setSelectedLineIds(new Set())}>Tøm valg</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {selected?.type === 'pole' && <PoleDetailPanel key={selected.id} soknadId={soknad.id} poleId={selected.id} onClose={() => setSelected(null)} />}
                {selected?.type === 'line' && <LineDetailPanel key={selected.id} soknadId={soknad.id} lineId={selected.id} onClose={() => setSelected(null)} />}
                {!selected && (
                  <div className="card">
                    <div className="detail-panel-empty">👆 Velg en stolpe eller et strekk</div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'liste' && (
        <div className="grid-2">
          <div className="card card-pad">
            <h4>Stolper ({poles.length})</h4>
            <table>
              <thead>
                <tr><th>Nr</th><th>Status</th><th>Søkers vurdering</th><th>Tiltak</th><th></th></tr>
              </thead>
              <tbody>
                {poles.sort((a, b) => a.number - b.number).map((p) => {
                  const sp = getSoknadPole(data, soknad.id, p.id);
                  const tp = tiltak.filter((t) => t.poleId === p.id);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => { setSelected({ type: 'pole', id: p.id }); setTab('kart'); }}>
                      <td>{p.number}</td>
                      <td><StatusBadge status={getPoleStatus(p)} small /></td>
                      <td><VurderingStatusBadge status={sp?.vurderingStatus ?? 'ikke_vurdert'} small /></td>
                      <td className="faint">{tp.length > 0 ? `${tp.length} stk` : '–'}</td>
                      <td className="faint">→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card card-pad">
            <h4>Strekk ({lines.length})</h4>
            <table>
              <thead>
                <tr><th>Strekk</th><th>Status</th><th>Vurdering</th><th></th></tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const a = data.poles.find((p) => p.id === l.poleAId);
                  const b = data.poles.find((p) => p.id === l.poleBId);
                  const sl = getSoknadLine(data, soknad.id, l.id);
                  return (
                    <tr key={l.id} className="clickable" onClick={() => { setSelected({ type: 'line', id: l.id }); setTab('kart'); }}>
                      <td>{a?.number}–{b?.number}</td>
                      <td><StatusBadge status={getLineStatus(l)} small /></td>
                      <td><VurderingStatusBadge status={sl?.vurderingStatus ?? 'ikke_vurdert'} small /></td>
                      <td className="faint">→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'kalkyle' && (
        <div className="stack">
          <div className="stat-cards">
            <div className="stat-card"><div className="num">{formatNOK(totalSum)}</div><div className="label">Totalsum foreslåtte tiltak</div></div>
            <div className="stat-card"><div className="num" style={{ color: 'var(--success)' }}>{formatNOK(akseptertSum)}</div><div className="label">Sum akseptert av søker</div></div>
            <div className="stat-card"><div className="num">{tiltak.length}</div><div className="label">Antall tiltak totalt</div></div>
            <div className="stat-card"><div className="num">{kalkyler.length}</div><div className="label">Kalkyleversjoner sendt</div></div>
          </div>

          <div className="card card-pad">
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0 }}>Tiltaksliste for hele søknaden</h4>
              <div className="hstack">
                <button className="btn btn-sm" onClick={exportCsv}>⬇ Eksporter CSV</button>
                {erSaksbehandler && harForeslatteTiltak && (
                  <button className="btn btn-sm btn-primary" onClick={() => store.sendKalkyle(soknad.id, current.personId)}>
                    Send kalkyle til søker
                  </button>
                )}
              </div>
            </div>
            <hr className="sep" />
            {tiltak.length === 0 && <div className="empty-state">Ingen tiltak registrert ennå.</div>}
            {tiltak.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Stolpe</th><th>Tiltak</th><th>Antall</th><th>Pris</th><th>Sum</th><th>Status</th><th>Utførende</th>
                  </tr>
                </thead>
                <tbody>
                  {tiltak
                    .slice()
                    .sort((a, b) => (data.poles.find((p) => p.id === a.poleId)?.number ?? 0) - (data.poles.find((p) => p.id === b.poleId)?.number ?? 0))
                    .map((t) => {
                      const pole = data.poles.find((p) => p.id === t.poleId);
                      const utf = t.tildeltCompanyId ? getCompany(data, t.tildeltCompanyId) : undefined;
                      return (
                        <tr key={t.id} className="clickable" onClick={() => { setSelected({ type: 'pole', id: t.poleId }); setTab('kart'); }}>
                          <td>{pole?.number}</td>
                          <td>{t.navn}</td>
                          <td>{t.antall} {t.enhet}</td>
                          <td>{formatNOK(t.pris)}</td>
                          <td>{formatNOK(t.antall * t.pris)}</td>
                          <td><TiltakStatusBadge status={t.status} small /></td>
                          <td className="faint">{utf?.name ?? '–'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card card-pad">
            <h4>Kalkyleversjoner (frosne, sendte versjoner)</h4>
            {kalkyler.length === 0 && <div className="faint">Ingen kalkyle er sendt ennå.</div>}
            {kalkyler.map((v) => (
              <div key={v.id} style={{ marginBottom: 10 }}>
                <div className="hstack" style={{ justifyContent: 'space-between' }}>
                  <strong>Versjon {v.versjonsnummer}</strong>
                  <span className="faint">Sendt {formatDate(v.sentAt)} av {getPerson(data, v.sentByPersonId)?.name}</span>
                </div>
                <table>
                  <thead><tr><th>Stolpe</th><th>Tiltak</th><th>Antall</th><th>Pris</th><th>Sum</th></tr></thead>
                  <tbody>
                    {v.linjer.map((l, i) => (
                      <tr key={i}><td>{l.poleNummer}</td><td>{l.navn}</td><td>{l.antall}</td><td>{formatNOK(l.pris)}</td><td>{formatNOK(l.sum)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="hstack" style={{ justifyContent: 'flex-end' }}><strong>Totalsum: {formatNOK(v.totalsum)}</strong></div>
                <hr className="sep" />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'aktivitet' && (
        <div className="grid-2">
          <div className="card card-pad">
            <div className="hstack" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0 }}>Meldinger og status</h4>
              <SoknadStatusBadge status={soknad.status} />
            </div>
            <hr className="sep" />
            <div className="stack" style={{ gap: 8, maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
              {aktivitet.length === 0 && <div className="empty-state">Ingen aktivitet registrert ennå.</div>}
              {aktivitet.map((item) => {
                if (item.kind === 'melding') {
                  const m = item.melding;
                  const person = getPerson(data, m.authorPersonId);
                  const company = getCompany(data, m.authorCompanyId);
                  const tag = tagForPoleId(m.poleId) ?? tagForLineId(m.lineId);
                  return (
                    <div className="message-bubble" key={item.id}>
                      <div className="message-meta hstack" style={{ justifyContent: 'space-between' }}>
                        <span>💬 <strong>{person?.name ?? 'Ukjent'}</strong> · {company?.name} · {formatDate(m.createdAt)}</span>
                        {tag && (
                          <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', cursor: 'pointer' }} onClick={() => gaTilKart(m.poleId, m.lineId)}>
                            {tag} →
                          </span>
                        )}
                      </div>
                      <div>{m.tekst}</div>
                    </div>
                  );
                }
                const h = item.hendelse;
                const person = getPerson(data, h.actorPersonId);
                const company = getCompany(data, h.actorCompanyId);
                const tag = tagForPoleId(h.poleId) ?? tagForLineId(h.lineId);
                return (
                  <div key={item.id} className="hstack" style={{ alignItems: 'flex-start', gap: 8, padding: '4px 8px', borderLeft: '2px solid var(--border)' }}>
                    <span style={{ marginTop: 2 }}>📌</span>
                    <div style={{ flex: 1 }}>
                      <div>
                        {h.action}
                        {tag && (
                          <span className="badge" style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', marginLeft: 6, cursor: 'pointer' }} onClick={() => gaTilKart(h.poleId, h.lineId)}>
                            {tag} →
                          </span>
                        )}
                      </div>
                      {h.detaljer && <div className="faint">{h.detaljer}</div>}
                      <div className="faint" style={{ fontSize: 11 }}>{formatDate(h.createdAt)} · {person?.name} · {company?.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr className="sep" />
            <div className="hstack">
              <input
                value={nyMelding}
                onChange={(e) => setNyMelding(e.target.value)}
                placeholder="Skriv en melding til de andre partene i søknaden …"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nyMelding.trim()) sendGenerellMelding();
                }}
              />
              <button className="btn btn-sm" disabled={!nyMelding.trim()} onClick={sendGenerellMelding}>
                Send
              </button>
            </div>
          </div>

          <div className="card card-pad">
            <h4>Status</h4>
            <div className="stack" style={{ gap: 6 }}>
              {(Object.keys(SOKNAD_STATUS_LABEL) as (keyof typeof SOKNAD_STATUS_LABEL)[]).map((key) => {
                const erNa = key === soknad.status;
                const color = SOKNAD_STATUS_COLOR[key];
                return (
                  <div
                    key={key}
                    className="hstack"
                    style={{
                      gap: 8,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: erNa ? `${color}1a` : 'transparent',
                      border: erNa ? `1px solid ${color}55` : '1px solid transparent',
                      opacity: erNa ? 1 : 0.55,
                    }}
                  >
                    <span className="badge-dot" style={{ background: color }} />
                    <span style={{ fontWeight: erNa ? 700 : 400, color: erNa ? color : undefined }}>{SOKNAD_STATUS_LABEL[key]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

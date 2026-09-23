import { useState } from 'react';
import { useStore } from '../store';
import {
  getPole,
  getSoknad,
  getSoknadPole,
  getTiltakForPole,
  getCompany,
  companiesByKind,
} from '../selectors';
import { StatusBadge, TiltakStatusBadge, VurderingStatusBadge } from './StatusBadge';
import { poleVisualStatus, formatNOK, formatDate } from '../statusUtils';
import { MessageThread } from './MessageThread';

export function PoleDetailPanel({ soknadId, poleId, onClose }: { soknadId: string; poleId: string; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();

  const pole = getPole(data, poleId);
  const soknad = getSoknad(data, soknadId);
  const sp = getSoknadPole(data, soknadId, poleId);
  const tiltakListe = getTiltakForPole(data, soknadId, poleId);
  const eier = pole ? getCompany(data, pole.ownerCompanyId) : undefined;

  const [nyttTiltakKatalogId, setNyttTiltakKatalogId] = useState(data.katalog[0]?.id ?? '');
  const [nyttTiltakAntall, setNyttTiltakAntall] = useState(1);
  const [nyBegrunnelse, setNyBegrunnelse] = useState(sp?.vurderingBegrunnelse ?? '');
  const [nyVurderingStatus, setNyVurderingStatus] = useState(sp?.vurderingStatus ?? 'ikke_vurdert');
  const [sokerKommentar, setSokerKommentar] = useState('');
  const [nyttObjProduktId, setNyttObjProduktId] = useState(data.produkter[0]?.id ?? '');
  const [nyttObjAntall, setNyttObjAntall] = useState(1);
  const [tildelCompanyId, setTildelCompanyId] = useState(companiesByKind(data, 'entreprenor')[0]?.id ?? '');

  if (!pole || !soknad) return null;

  const erUtkast = soknad.status === 'utkast';
  const erSoker = current.role === 'soker' && current.companyId === soknad.sokerCompanyId;
  const erSaksbehandler = current.role === 'saksbehandler' && current.companyId === soknad.stolpeeierCompanyId;
  const erEntreprenorMedOppgave = current.role === 'entreprenor' && tiltakListe.some((t) => t.tildeltCompanyId === current.companyId);

  const status = poleVisualStatus(sp, tiltakListe);
  const totalSum = tiltakListe.reduce((sum, t) => sum + t.antall * t.pris, 0);
  const akseptertSum = tiltakListe.filter((t) => ['akseptert', 'tildelt', 'pagar', 'meldt_ferdig', 'godkjent'].includes(t.status)).reduce((sum, t) => sum + t.antall * t.pris, 0);

  const harUbesvarteTiltak = tiltakListe.some((t) => t.status === 'foreslatt');
  const alleTiltakGodkjent = tiltakListe.length > 0 && tiltakListe.every((t) => t.status === 'godkjent' || t.status === 'avslatt');
  const kanGodkjennesForOppheng =
    erSaksbehandler &&
    !sp?.godkjentForOpphengAt &&
    (sp?.vurderingStatus === 'godkjent_direkte' || (sp?.vurderingStatus === 'krever_tiltak' && alleTiltakGodkjent));

  return (
    <div className="card detail-panel">
      <div className="card-pad">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Stolpe {pole.number}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="faint" style={{ marginBottom: 10 }}>Eies av {eier?.name}</div>
        <StatusBadge status={status} />

        <hr className="sep" />

        <h4>Søkers registrering</h4>
        {erSoker && erUtkast ? (
          <div className="stack">
            <div className="field">
              <label className="field-label">Synlige skader / observasjoner</label>
              <textarea
                defaultValue={sp?.skaderObservasjoner}
                onBlur={(e) => store.updateSoknadPole(soknadId, poleId, { skaderObservasjoner: e.target.value })}
                placeholder="F.eks. råteskade, skjevhet, korrosjon …"
              />
            </div>
            <div className="field">
              <label className="field-label">Søkers anbefalte tiltak (ikke bindende)</label>
              <textarea
                defaultValue={sp?.anbefalteTiltak}
                onBlur={(e) => store.updateSoknadPole(soknadId, poleId, { anbefalteTiltak: e.target.value })}
                placeholder="F.eks. stolpebytte anbefales"
              />
            </div>
            <div className="field">
              <label className="field-label">Merknad</label>
              <textarea defaultValue={sp?.merknad} onBlur={(e) => store.updateSoknadPole(soknadId, poleId, { merknad: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">Bilder</label>
              <BildeListe
                bilder={sp?.bilder ?? []}
                onAdd={(navn) => store.updateSoknadPole(soknadId, poleId, { bilder: [...(sp?.bilder ?? []), navn] })}
                onRemove={(i) => store.updateSoknadPole(soknadId, poleId, { bilder: (sp?.bilder ?? []).filter((_, idx) => idx !== i) })}
              />
            </div>
            <div className="field">
              <label className="field-label">Objekter det søkes om å montere</label>
              <div className="stack" style={{ gap: 6 }}>
                {(sp?.monteringsobjekter ?? []).map((o) => (
                  <div className="hstack" key={o.id} style={{ justifyContent: 'space-between', background: 'var(--surface-alt)', padding: '4px 8px', borderRadius: 6 }}>
                    <span>{data.produkter.find((p) => p.id === o.produktId)?.navn ?? 'Ukjent produkt'} × {o.antall} {o.merknad ? `— ${o.merknad}` : ''}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => store.removeMonteringsobjekt(soknadId, poleId, o.id)}>Fjern</button>
                  </div>
                ))}
              </div>
              <div className="hstack" style={{ marginTop: 6 }}>
                <select value={nyttObjProduktId} onChange={(e) => setNyttObjProduktId(e.target.value)} style={{ flex: 1 }}>
                  {data.produkter.map((p) => (
                    <option key={p.id} value={p.id}>{p.navn}</option>
                  ))}
                </select>
                <input type="number" min={1} value={nyttObjAntall} onChange={(e) => setNyttObjAntall(parseInt(e.target.value) || 1)} style={{ width: 60 }} />
                <button className="btn btn-sm" disabled={!nyttObjProduktId} onClick={() => store.addMonteringsobjekt(soknadId, poleId, nyttObjProduktId, nyttObjAntall)}>Legg til</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="kv">
            <dt>Skader/observasjoner</dt>
            <dd>{sp?.skaderObservasjoner || '–'}</dd>
            <dt>Søkers anbefaling</dt>
            <dd>{sp?.anbefalteTiltak || '–'}</dd>
            <dt>Merknad</dt>
            <dd>{sp?.merknad || '–'}</dd>
            <dt>Bilder</dt>
            <dd>{sp?.bilder?.length ? sp.bilder.join(', ') : '–'}</dd>
            <dt>Ønskede objekter</dt>
            <dd>
              {sp?.monteringsobjekter?.length
                ? sp.monteringsobjekter.map((o) => `${data.produkter.find((p) => p.id === o.produktId)?.navn ?? 'Ukjent produkt'} × ${o.antall}`).join(', ')
                : '–'}
            </dd>
          </div>
        )}

        <hr className="sep" />

        <h4>Saksbehandlers vurdering</h4>
        {erSaksbehandler ? (
          <div className="stack">
            <div className="field">
              <label className="field-label">Vurdering</label>
              <select value={nyVurderingStatus} onChange={(e) => setNyVurderingStatus(e.target.value as typeof nyVurderingStatus)}>
                <option value="ikke_vurdert">Ikke vurdert</option>
                <option value="godkjent_direkte">Kan godkjennes direkte</option>
                <option value="krever_tiltak">Krever tiltak</option>
                <option value="avslatt">Avslås</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Begrunnelse</label>
              <textarea value={nyBegrunnelse} onChange={(e) => setNyBegrunnelse(e.target.value)} placeholder="Begrunn vurderingen …" />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => store.setPoleVurdering(soknadId, poleId, { vurderingStatus: nyVurderingStatus, vurderingBegrunnelse: nyBegrunnelse }, current.personId)}
            >
              Lagre vurdering
            </button>
            {sp?.vurdertAt && <div className="faint">Sist vurdert {formatDate(sp.vurdertAt)}</div>}
          </div>
        ) : (
          <div className="kv">
            <dt>Status</dt>
            <dd><VurderingStatusBadge status={sp?.vurderingStatus ?? 'ikke_vurdert'} small /></dd>
            <dt>Begrunnelse</dt>
            <dd>{sp?.vurderingBegrunnelse || '–'}</dd>
          </div>
        )}

        {erSaksbehandler && (nyVurderingStatus === 'krever_tiltak' || tiltakListe.length > 0) && (
          <>
            <hr className="sep" />
            <h4>Tiltak fra katalog</h4>
            <div className="hstack">
              <select value={nyttTiltakKatalogId} onChange={(e) => setNyttTiltakKatalogId(e.target.value)} style={{ flex: 1 }}>
                {data.katalog.map((k) => (
                  <option key={k.id} value={k.id}>{k.navn} ({formatNOK(k.standardpris)})</option>
                ))}
              </select>
              <input type="number" min={1} value={nyttTiltakAntall} onChange={(e) => setNyttTiltakAntall(parseInt(e.target.value) || 1)} style={{ width: 60 }} />
              <button className="btn btn-sm" onClick={() => store.addTiltak(soknadId, poleId, nyttTiltakKatalogId, nyttTiltakAntall, current.personId)}>
                Legg til tiltak
              </button>
            </div>
          </>
        )}

        {tiltakListe.length > 0 && (
          <>
            <hr className="sep" />
            <h4>Tiltak og kalkyle for stolpen</h4>
            <table>
              <thead>
                <tr>
                  <th>Tiltak</th>
                  <th>Antall</th>
                  <th>Pris</th>
                  <th>Sum</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tiltakListe.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.navn}
                      {erSaksbehandler && t.status === 'foreslatt' && (
                        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 6 }} onClick={() => store.removeTiltak(t.id)}>
                          Fjern
                        </button>
                      )}
                    </td>
                    <td>
                      {erSaksbehandler && t.status === 'foreslatt' ? (
                        <input
                          type="number"
                          min={1}
                          defaultValue={t.antall}
                          style={{ width: 55 }}
                          onBlur={(e) => store.updateTiltak(t.id, { antall: parseInt(e.target.value) || 1 })}
                        />
                      ) : (
                        `${t.antall} ${t.enhet}`
                      )}
                    </td>
                    <td>
                      {erSaksbehandler && t.status === 'foreslatt' ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={t.pris}
                          style={{ width: 80 }}
                          onBlur={(e) => store.updateTiltak(t.id, { pris: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        formatNOK(t.pris)
                      )}
                    </td>
                    <td>{formatNOK(t.antall * t.pris)}</td>
                    <td><TiltakStatusBadge status={t.status} small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
              <strong>Sum stolpe: {formatNOK(totalSum)} (akseptert: {formatNOK(akseptertSum)})</strong>
            </div>
          </>
        )}

        {erSoker && tiltakListe.length > 0 && harUbesvarteTiltak && (
          <>
            <hr className="sep" />
            <h4>Din beslutning på tiltak for denne stolpen</h4>
            <p className="faint">Totalkostnad for foreslåtte tiltak på stolpen: {formatNOK(totalSum)}</p>
            <div className="field">
              <label className="field-label">Kommentar (valgfritt)</label>
              <textarea value={sokerKommentar} onChange={(e) => setSokerKommentar(e.target.value)} placeholder="F.eks. begrunnelse for avslag, eller ønske om endring" />
            </div>
            <div className="hstack">
              <button className="btn btn-success" onClick={() => store.respondToPole(soknadId, poleId, 'akseptert', sokerKommentar, current.personId)}>
                ✓ Aksepter tiltak
              </button>
              <button className="btn btn-danger" onClick={() => store.respondToPole(soknadId, poleId, 'avslatt', sokerKommentar, current.personId)}>
                ✕ Avslå tiltak
              </button>
            </div>
          </>
        )}

        {sp && sp.sokerBeslutning !== 'ikke_besvart' && (
          <div className="faint" style={{ marginTop: 8 }}>
            Søkers beslutning: <strong>{sp.sokerBeslutning === 'akseptert' ? 'Akseptert' : 'Avslått'}</strong> ({formatDate(sp.sokerBesluttetAt)})
            {sp.sokerKommentar && ` — "${sp.sokerKommentar}"`}
          </div>
        )}

        {erSaksbehandler && tiltakListe.some((t) => t.status === 'akseptert' && !t.tildeltCompanyId) && (
          <>
            <hr className="sep" />
            <h4>Tildel utførelse</h4>
            <div className="hstack">
              <select value={tildelCompanyId} onChange={(e) => setTildelCompanyId(e.target.value)} style={{ flex: 1 }}>
                {companiesByKind(data, 'entreprenor').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => tiltakListe.filter((t) => t.status === 'akseptert' && !t.tildeltCompanyId).forEach((t) => store.assignTiltak(t.id, tildelCompanyId, current.personId))}
              >
                Tildel aksepterte tiltak
              </button>
            </div>
          </>
        )}

        {tiltakListe.some((t) => ['tildelt', 'pagar', 'meldt_ferdig', 'sendt_tilbake'].includes(t.status)) && (
          <>
            <hr className="sep" />
            <h4>Utførelse</h4>
            <div className="stack">
              {tiltakListe
                .filter((t) => ['tildelt', 'pagar', 'meldt_ferdig', 'sendt_tilbake', 'godkjent'].includes(t.status))
                .map((t) => (
                  <UtforelseRad
                    key={t.id}
                    tiltakId={t.id}
                    kanRedigere={erEntreprenorMedOppgave && t.tildeltCompanyId === current.companyId}
                    kanKontrollere={erSaksbehandler}
                  />
                ))}
            </div>
            {erEntreprenorMedOppgave && tiltakListe.some((t) => ['tildelt', 'pagar'].includes(t.status)) && (
              <button className="btn btn-sm btn-success" style={{ marginTop: 8 }} onClick={() => store.meldPoleFerdig(soknadId, poleId, current.personId)}>
                ✓ Meld hele stolpen ferdig
              </button>
            )}
          </>
        )}

        {kanGodkjennesForOppheng && (
          <>
            <hr className="sep" />
            <button className="btn btn-success" onClick={() => store.godkjennPoleForOppheng(soknadId, poleId, current.personId)}>
              ✓ Godkjenn stolpe for omsøkt oppheng
            </button>
          </>
        )}

        {sp?.godkjentForOpphengAt && (
          <>
            <hr className="sep" />
            <div className="card-pad" style={{ background: 'var(--success-bg)', borderRadius: 8, padding: 10 }}>
              <strong style={{ color: 'var(--success)' }}>Godkjent for omsøkt oppheng</strong>
              <div className="faint">{formatDate(sp.godkjentForOpphengAt)}</div>
            </div>
          </>
        )}

        <hr className="sep" />
        <h4>Meldinger om denne stolpen</h4>
        <MessageThread soknadId={soknadId} poleId={poleId} compact />
      </div>
    </div>
  );
}

function BildeListe({ bilder, onAdd, onRemove }: { bilder: string[]; onAdd: (navn: string) => void; onRemove: (i: number) => void }) {
  const [navn, setNavn] = useState('');
  return (
    <div>
      {bilder.map((b, i) => (
        <div className="hstack" key={i} style={{ justifyContent: 'space-between' }}>
          <span className="faint">📷 {b}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => onRemove(i)}>Fjern</button>
        </div>
      ))}
      <div className="hstack" style={{ marginTop: 4 }}>
        <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. stolpe_skade.jpg" />
        <button
          className="btn btn-sm"
          onClick={() => {
            if (navn.trim()) {
              onAdd(navn.trim());
              setNavn('');
            }
          }}
        >
          Legg til bilde
        </button>
      </div>
    </div>
  );
}

function UtforelseRad({ tiltakId, kanRedigere, kanKontrollere }: { tiltakId: string; kanRedigere: boolean; kanKontrollere: boolean }) {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();
  const t = data.tiltak.find((x) => x.id === tiltakId);
  const [kommentar, setKommentar] = useState('');
  const [nyttBildenavn, setNyttBildenavn] = useState('');
  if (!t) return null;
  const entreprenor = t.tildeltCompanyId ? getCompany(data, t.tildeltCompanyId) : undefined;

  return (
    <div className="card" style={{ padding: 10, background: 'var(--surface-alt)' }}>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <strong>{t.navn}</strong>
        <TiltakStatusBadge status={t.status} small />
      </div>
      <div className="faint">Utførende: {entreprenor?.name ?? 'Ikke tildelt'}</div>
      {t.utforelsesdato && <div className="faint">Utførelsesdato: {t.utforelsesdato}</div>}
      {t.utforendeKommentar && <div className="faint">Kommentar fra utførende: {t.utforendeKommentar}</div>}
      {t.utforendeBilder.length > 0 && <div className="faint">Bilder: {t.utforendeBilder.join(', ')}</div>}
      {t.kontrollKommentar && <div className="faint">Kontrollkommentar: {t.kontrollKommentar}</div>}

      {kanRedigere && t.status !== 'meldt_ferdig' && t.status !== 'godkjent' && (
        <div className="hstack" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          <select
            value={t.utforelseStatus}
            onChange={(e) => store.updateTiltakUtforelse(tiltakId, { utforelseStatus: e.target.value as typeof t.utforelseStatus }, current.personId)}
          >
            <option value="ikke_startet">Ikke startet</option>
            <option value="pagar">Pågår</option>
            <option value="meldt_ferdig">Meldt ferdig</option>
          </select>
          <input
            type="date"
            defaultValue={t.utforelsesdato}
            onBlur={(e) => store.updateTiltakUtforelse(tiltakId, { utforelsesdato: e.target.value }, current.personId)}
          />
        </div>
      )}
      {kanRedigere && t.status !== 'meldt_ferdig' && t.status !== 'godkjent' && (
        <div className="hstack" style={{ marginTop: 6 }}>
          <input
            placeholder="Kommentar til utført arbeid"
            defaultValue={t.utforendeKommentar}
            onBlur={(e) => store.updateTiltakUtforelse(tiltakId, { utforendeKommentar: e.target.value }, current.personId)}
          />
        </div>
      )}
      {kanRedigere && t.status !== 'meldt_ferdig' && t.status !== 'godkjent' && (
        <div className="hstack" style={{ marginTop: 6 }}>
          <input
            placeholder="Filnavn/beskrivelse for bilde, f.eks. stolpe_ferdig.jpg"
            value={nyttBildenavn}
            onChange={(e) => setNyttBildenavn(e.target.value)}
          />
          <button
            className="btn btn-sm"
            disabled={!nyttBildenavn.trim()}
            onClick={() => {
              store.addUtforendeBilde(tiltakId, nyttBildenavn.trim());
              setNyttBildenavn('');
            }}
          >
            📷 Legg til bilde
          </button>
        </div>
      )}

      {kanKontrollere && t.status === 'meldt_ferdig' && (
        <div className="stack" style={{ marginTop: 8 }}>
          <input value={kommentar} onChange={(e) => setKommentar(e.target.value)} placeholder="Kontrollkommentar" />
          <div className="hstack">
            <button className="btn btn-sm btn-success" onClick={() => store.kontrollerTiltak(tiltakId, 'godkjent', kommentar, current.personId)}>
              ✓ Godkjenn utførelse
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => store.kontrollerTiltak(tiltakId, 'sendt_tilbake', kommentar, current.personId)}>
              ↩ Send tilbake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

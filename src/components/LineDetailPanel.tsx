import { useState } from 'react';
import { useStore } from '../store';
import { getLine, getPole, getSoknad, getSoknadLine } from '../selectors';
import { StatusBadge, VurderingStatusBadge } from './StatusBadge';
import { lineVisualStatus, formatDate } from '../statusUtils';
import { MessageThread } from './MessageThread';

export function LineDetailPanel({ soknadId, lineId, onClose }: { soknadId: string; lineId: string; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();

  const line = getLine(data, lineId);
  const soknad = getSoknad(data, soknadId);
  const sl = getSoknadLine(data, soknadId, lineId);

  const [nyVurderingStatus, setNyVurderingStatus] = useState(sl?.vurderingStatus ?? 'ikke_vurdert');
  const [nyBegrunnelse, setNyBegrunnelse] = useState(sl?.vurderingBegrunnelse ?? '');
  const [nyKabelTypeId, setNyKabelTypeId] = useState(data.kabelTyper[0]?.id ?? '');
  const [nyKabelAntall, setNyKabelAntall] = useState(1);

  if (!line || !soknad) return null;
  const poleA = getPole(data, line.poleAId);
  const poleB = getPole(data, line.poleBId);

  const erUtkast = soknad.status === 'utkast';
  const erSoker = current.role === 'soker' && current.companyId === soknad.sokerCompanyId;
  const erSaksbehandler = current.role === 'saksbehandler' && current.companyId === soknad.stolpeeierCompanyId;

  const status = lineVisualStatus(sl);

  return (
    <div className="card detail-panel">
      <div className="card-pad">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Strekk {poleA?.number}–{poleB?.number}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <StatusBadge status={status} />
        {sl?.kreverNyTrasevurdering && erSaksbehandler && (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-sm" onClick={() => store.updateSoknadLine(soknadId, lineId, { kreverNyTrasevurdering: false })}>
              Marker som trasévurdert / løst
            </button>
          </div>
        )}

        <hr className="sep" />
        <h4>Søkers registrering av strekket</h4>
        {erSoker && erUtkast ? (
          <div className="stack">
            <div className="field-row">
              <div className="field">
                <label className="field-label">Ant. eksisterende kabler</label>
                <input type="number" min={0} defaultValue={sl?.antallEksisterendeKabler} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { antallEksisterendeKabler: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="field">
                <label className="field-label">Herav under «gulvbåndet»</label>
                <input type="number" min={0} defaultValue={sl?.antallUnderGulvbandet} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { antallUnderGulvbandet: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Nye kabler som ønskes hengt opp</label>
              <div className="stack" style={{ gap: 6 }}>
                {(sl?.nyeKabler ?? []).map((k) => {
                  const kabelType = data.kabelTyper.find((kt) => kt.id === k.kabelTypeId);
                  return (
                    <div className="hstack" key={k.id} style={{ justifyContent: 'space-between', background: 'var(--surface-alt)', padding: '4px 8px', borderRadius: 6 }}>
                      <span>
                        {kabelType?.navn ?? 'Ukjent kabeltype'} × {k.antall} {k.merknad ? `— ${k.merknad}` : ''}
                        {kabelType?.databladDataUrl && (
                          <>
                            {' '}
                            <a href={kabelType.databladDataUrl} target="_blank" rel="noreferrer" title="Åpne datablad (PDF)">📄</a>
                          </>
                        )}
                      </span>
                      <button className="btn btn-sm btn-ghost" onClick={() => store.removeNyKabel(soknadId, lineId, k.id)}>Fjern</button>
                    </div>
                  );
                })}
                {(sl?.nyeKabler ?? []).length === 0 && <div className="faint">Ingen kabler lagt til ennå.</div>}
              </div>
              <div className="hstack" style={{ marginTop: 6 }}>
                <select value={nyKabelTypeId} onChange={(e) => setNyKabelTypeId(e.target.value)} style={{ flex: 1 }}>
                  {data.kabelTyper.map((kt) => (
                    <option key={kt.id} value={kt.id}>{kt.navn}</option>
                  ))}
                </select>
                <input type="number" min={1} value={nyKabelAntall} onChange={(e) => setNyKabelAntall(parseInt(e.target.value) || 1)} style={{ width: 60 }} />
                <button
                  className="btn btn-sm"
                  disabled={!nyKabelTypeId}
                  onClick={() => store.addNyKabel(soknadId, lineId, nyKabelTypeId, nyKabelAntall)}
                >
                  Legg til kabel
                </button>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Oppgitt høyde/frihøyde</label>
                <input type="number" step="0.1" defaultValue={sl?.hoydeVerdi} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { hoydeVerdi: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="field">
                <label className="field-label">Enhet</label>
                <input defaultValue={sl?.hoydeEnhet ?? 'm'} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { hoydeEnhet: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Målepunkt (hvor på strekket ble det målt)</label>
              <input defaultValue={sl?.hoydeMalepunkt} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { hoydeMalepunkt: e.target.value })} placeholder="F.eks. midt på strekket, over vei" />
            </div>
            <div className="field">
              <label className="field-label">Hva målingen gjelder</label>
              <input defaultValue={sl?.hoydeBeskrivelse} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { hoydeBeskrivelse: e.target.value })} placeholder="F.eks. frihøyde over kommunal vei" />
            </div>
            <div className="field">
              <label className="field-label">Merknad</label>
              <textarea defaultValue={sl?.merknad} onBlur={(e) => store.updateSoknadLine(soknadId, lineId, { merknad: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="kv">
            <dt>Eksisterende kabler</dt>
            <dd>{sl?.antallEksisterendeKabler ?? 0} (herav {sl?.antallUnderGulvbandet ?? 0} under «gulvbåndet»)</dd>
            <dt>Nye kabler</dt>
            <dd>
              {sl?.nyeKabler?.length
                ? sl.nyeKabler.map((k, i) => {
                    const kabelType = data.kabelTyper.find((kt) => kt.id === k.kabelTypeId);
                    return (
                      <span key={k.id}>
                        {i > 0 && ', '}
                        {kabelType?.navn ?? 'Ukjent kabeltype'} × {k.antall}
                        {kabelType?.databladDataUrl && (
                          <>
                            {' '}
                            <a href={kabelType.databladDataUrl} target="_blank" rel="noreferrer" title="Åpne datablad (PDF)">📄</a>
                          </>
                        )}
                      </span>
                    );
                  })
                : '–'}
            </dd>
            <dt>Høyde/frihøyde</dt>
            <dd>{sl?.hoydeVerdi != null ? `${sl.hoydeVerdi} ${sl.hoydeEnhet ?? ''}` : '–'}{sl?.hoydeMalepunkt ? ` (målt: ${sl.hoydeMalepunkt})` : ''}</dd>
            <dt>Målingen gjelder</dt>
            <dd>{sl?.hoydeBeskrivelse || '–'}</dd>
            <dt>Merknad</dt>
            <dd>{sl?.merknad || '–'}</dd>
          </div>
        )}

        <hr className="sep" />
        <h4>Saksbehandlers vurdering av strekket</h4>
        {erSaksbehandler ? (
          <div className="stack">
            <div className="field">
              <label className="field-label">Vurdering</label>
              <select value={nyVurderingStatus} onChange={(e) => setNyVurderingStatus(e.target.value as typeof nyVurderingStatus)}>
                <option value="ikke_vurdert">Ikke vurdert</option>
                <option value="godkjent_direkte">Kan godkjennes direkte</option>
                <option value="krever_tiltak">Krever tiltak (høyde/frihøyde e.l.)</option>
                <option value="avslatt">Avslås</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Begrunnelse</label>
              <textarea value={nyBegrunnelse} onChange={(e) => setNyBegrunnelse(e.target.value)} placeholder="F.eks. for lav frihøyde over vei. Vurder hvilken/hvilke stolpe(r) som må ha tiltak." />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => store.setLineVurdering(soknadId, lineId, { vurderingStatus: nyVurderingStatus, vurderingBegrunnelse: nyBegrunnelse }, current.personId)}
            >
              Lagre vurdering
            </button>
            {sl?.vurdertAt && <div className="faint">Sist vurdert {formatDate(sl.vurdertAt)}</div>}
          </div>
        ) : (
          <div className="kv">
            <dt>Status</dt>
            <dd><VurderingStatusBadge status={sl?.vurderingStatus ?? 'ikke_vurdert'} small /></dd>
            <dt>Begrunnelse</dt>
            <dd>{sl?.vurderingBegrunnelse || '–'}</dd>
          </div>
        )}

        <hr className="sep" />
        <h4>Meldinger om dette strekket</h4>
        <MessageThread soknadId={soknadId} lineId={lineId} compact />
      </div>
    </div>
  );
}

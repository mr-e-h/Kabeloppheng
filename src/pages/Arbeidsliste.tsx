import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getCompany, getSoknad } from '../selectors';
import { formatNOK } from '../statusUtils';
import { TiltakStatusBadge } from '../components/StatusBadge';
import type { SoknadPoleTiltak } from '../types';

export function Arbeidsliste() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [soknadFilter, setSoknadFilter] = useState('');

  const mineTiltak = useMemo(() => data.tiltak.filter((t) => t.tildeltCompanyId === current.companyId), [data.tiltak, current.companyId]);
  const soknaderMedOppgaver = useMemo(() => {
    const ids = Array.from(new Set(mineTiltak.map((t) => t.soknadId)));
    return ids.map((id) => getSoknad(data, id)).filter((s): s is NonNullable<typeof s> => !!s);
  }, [mineTiltak, data]);

  const filtered = mineTiltak.filter((t) => {
    if (statusFilter && t.utforelseStatus !== statusFilter) return false;
    if (soknadFilter && t.soknadId !== soknadFilter) return false;
    return true;
  });

  function settStatus(t: SoknadPoleTiltak, status: SoknadPoleTiltak['utforelseStatus']) {
    store.updateTiltakUtforelse(t.id, { utforelseStatus: status }, current.personId);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Arbeidsliste — {getCompany(data, current.companyId)?.name}</h1>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="field-row">
          <div className="field">
            <label className="field-label">Søknad</label>
            <select value={soknadFilter} onChange={(e) => setSoknadFilter(e.target.value)}>
              <option value="">Alle søknader</option>
              {soknaderMedOppgaver.map((s) => (
                <option key={s.id} value={s.id}>{s.soknadsnummer} — {getCompany(data, s.stolpeeierCompanyId)?.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Utførelsesstatus</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Alle</option>
              <option value="ikke_startet">Ikke startet</option>
              <option value="pagar">Pågår</option>
              <option value="meldt_ferdig">Meldt ferdig</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        {filtered.length === 0 && <div className="empty-state">Ingen tildelte tiltak matcher filteret.</div>}
        {filtered.length > 0 && (
          <table>
            <thead>
              <tr><th>Søknad</th><th>Stolpeeier</th><th>Stolpe</th><th>Tiltak</th><th>Pris</th><th>Status</th><th>Utførelse</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const soknad = getSoknad(data, t.soknadId);
                const pole = data.poles.find((p) => p.id === t.poleId);
                const eier = soknad ? getCompany(data, soknad.stolpeeierCompanyId) : undefined;
                return (
                  <tr key={t.id}>
                    <td>{soknad?.soknadsnummer}</td>
                    <td>{eier?.name}</td>
                    <td>{pole?.number}</td>
                    <td>{t.navn}</td>
                    <td>{formatNOK(t.antall * t.pris)}</td>
                    <td><TiltakStatusBadge status={t.status} small /></td>
                    <td>
                      {t.status !== 'meldt_ferdig' && t.status !== 'godkjent' ? (
                        <select value={t.utforelseStatus} onChange={(e) => settStatus(t, e.target.value as SoknadPoleTiltak['utforelseStatus'])}>
                          <option value="ikke_startet">Ikke startet</option>
                          <option value="pagar">Pågår</option>
                          <option value="meldt_ferdig">Meldt ferdig</option>
                        </select>
                      ) : (
                        <span className="faint">{t.utforelseStatus === 'meldt_ferdig' ? 'Meldt ferdig' : t.utforelseStatus}</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => navigate(`/soknader/${t.soknadId}`)}>Åpne →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

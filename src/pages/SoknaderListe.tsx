import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getCompany, soknaderForCurrent } from '../selectors';
import { SOKNAD_STATUS_LABEL, formatDate } from '../statusUtils';
import { SoknadStatusBadge } from '../components/StatusBadge';
import type { SoknadStatus } from '../types';

export function SoknaderListe() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SoknadStatus | ''>('');

  const alle = soknaderForCurrent(data, current.companyId, current.role);

  const filtered = useMemo(() => {
    return alle.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const motpartNavn = (getCompany(data, s.sokerCompanyId)?.name ?? '') + ' ' + (getCompany(data, s.stolpeeierCompanyId)?.name ?? '');
        const poleNumre = s.poleIds
          .map((pid) => data.poles.find((p) => p.id === pid)?.number)
          .filter(Boolean)
          .join(' ');
        const haystack = `${s.soknadsnummer} ${s.navn} ${s.beskrivelse} ${motpartNavn} ${poleNumre}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [alle, query, statusFilter, data]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Søknader</h1>
        </div>
        {current.role === 'soker' && (
          <button className="btn btn-primary" onClick={() => navigate('/soknader/ny')}>
            + Ny søknad
          </button>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label className="field-label">Søk (søknadsnr, navn, virksomhet, stolpenummer)</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="F.eks. KO-2026-0001 eller «stolpe 3»" />
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SoknadStatus | '')}>
              <option value="">Alle statuser</option>
              {Object.entries(SOKNAD_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad">
          {filtered.length === 0 && <div className="empty-state">Ingen søknader matcher søket.</div>}
          {filtered.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Søknadsnr.</th>
                  <th>Navn</th>
                  <th>Søker</th>
                  <th>Stolpeeier</th>
                  <th>Status</th>
                  <th>Stolper</th>
                  <th>Opprettet</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
                  .map((s) => {
                    const poleNrs = s.poleIds
                      .map((pid) => data.poles.find((p) => p.id === pid)?.number)
                      .filter((n): n is number => n !== undefined)
                      .sort((a, b) => a - b);
                    return (
                      <tr key={s.id} className="clickable" onClick={() => navigate(`/soknader/${s.id}`)}>
                        <td>{s.soknadsnummer}</td>
                        <td>{s.navn}</td>
                        <td>{getCompany(data, s.sokerCompanyId)?.name}</td>
                        <td>{getCompany(data, s.stolpeeierCompanyId)?.name}</td>
                        <td><SoknadStatusBadge status={s.status} small /></td>
                        <td className="faint">{poleNrs.length > 0 ? `${poleNrs[0]}–${poleNrs[poleNrs.length - 1]} (${poleNrs.length})` : '–'}</td>
                        <td className="faint">{formatDate(s.createdAt)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

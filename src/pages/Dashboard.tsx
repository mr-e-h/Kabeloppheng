import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getCompany, soknaderForCurrent, getTiltakForSoknad } from '../selectors';
import { formatDate } from '../statusUtils';
import { SoknadStatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const navigate = useNavigate();
  const soknader = soknaderForCurrent(data, current.companyId, current.role);
  const company = getCompany(data, current.companyId);

  let stats: { label: string; num: number; tone?: string }[] = [];

  if (current.role === 'soker') {
    const venterSvar = soknader.reduce((sum, s) => sum + data.tiltak.filter((t) => t.soknadId === s.id && t.status === 'foreslatt').length, 0);
    const klareStolper = soknader.reduce((sum, s) => sum + data.soknadPoler.filter((p) => p.soknadId === s.id && p.godkjentForOpphengAt).length, 0);
    stats = [
      { label: 'Aktive søknader', num: soknader.filter((s) => s.status !== 'avsluttet').length },
      { label: 'Tiltak som venter ditt svar', num: venterSvar, tone: venterSvar > 0 ? 'warning' : undefined },
      { label: 'Stolper godkjent for oppheng', num: klareStolper, tone: 'success' },
      { label: 'Søknader totalt', num: soknader.length },
    ];
  } else if (current.role === 'saksbehandler') {
    const innkomne = soknader.filter((s) => s.status === 'innsendt').length;
    const venterKalkyleSvar = soknader.reduce((sum, s) => sum + data.tiltak.filter((t) => t.soknadId === s.id && t.status === 'foreslatt').length, 0);
    const venterUtforelse = soknader.reduce((sum, s) => sum + data.tiltak.filter((t) => t.soknadId === s.id && t.status === 'akseptert').length, 0);
    const venterSluttkontroll = soknader.reduce((sum, s) => sum + data.tiltak.filter((t) => t.soknadId === s.id && t.status === 'meldt_ferdig').length, 0);
    stats = [
      { label: 'Nye, innsendte søknader', num: innkomne, tone: innkomne > 0 ? 'primary' : undefined },
      { label: 'Tiltak som venter svar fra søker', num: venterKalkyleSvar },
      { label: 'Tiltak som venter tildeling/utførelse', num: venterUtforelse },
      { label: 'Meldt ferdig – venter sluttkontroll', num: venterSluttkontroll, tone: venterSluttkontroll > 0 ? 'warning' : undefined },
    ];
  } else {
    const mineTiltak = data.tiltak.filter((t) => t.tildeltCompanyId === current.companyId);
    stats = [
      { label: 'Tildelte tiltak totalt', num: mineTiltak.length },
      { label: 'Ikke startet', num: mineTiltak.filter((t) => t.utforelseStatus === 'ikke_startet').length },
      { label: 'Pågår', num: mineTiltak.filter((t) => t.utforelseStatus === 'pagar').length, tone: 'primary' },
      { label: 'Meldt ferdig', num: mineTiltak.filter((t) => t.utforelseStatus === 'meldt_ferdig').length, tone: 'success' },
    ];
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Oversikt — {company?.name}</h1>
        </div>
      </div>

      <div className="stat-cards">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="num" style={s.tone === 'warning' ? { color: 'var(--warning)' } : s.tone === 'success' ? { color: 'var(--success)' } : s.tone === 'primary' ? { color: 'var(--primary)' } : undefined}>
              {s.num}
            </div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-pad">
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{current.role === 'entreprenor' ? 'Søknader med tildelte tiltak' : 'Dine søknader'}</h3>
            {current.role === 'soker' && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/soknader/ny')}>
                + Ny søknad
              </button>
            )}
          </div>
          <hr className="sep" />
          {soknader.length === 0 && <div className="empty-state">Ingen søknader ennå.</div>}
          {soknader.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Søknadsnr.</th>
                  <th>Navn</th>
                  <th>Motpart</th>
                  <th>Status</th>
                  <th># stolper</th>
                  <th>Sist oppdatert</th>
                </tr>
              </thead>
              <tbody>
                {soknader
                  .slice()
                  .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
                  .map((s) => {
                    const motpart = current.role === 'soker' ? getCompany(data, s.stolpeeierCompanyId) : getCompany(data, s.sokerCompanyId);
                    const antallTiltak = getTiltakForSoknad(data, s.id).length;
                    return (
                      <tr key={s.id} className="clickable" onClick={() => navigate(`/soknader/${s.id}`)}>
                        <td>{s.soknadsnummer}</td>
                        <td>{s.navn}</td>
                        <td>{motpart?.name}</td>
                        <td><SoknadStatusBadge status={s.status} small /></td>
                        <td>{s.poleIds.length} {current.role !== 'soker' ? `(${antallTiltak} tiltak)` : ''}</td>
                        <td className="faint">{formatDate(s.submittedAt ?? s.createdAt)}</td>
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

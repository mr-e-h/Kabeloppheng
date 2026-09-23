import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { MapView } from '../components/MapView';
import { ConfirmDialog } from '../components/ConfirmDialog';

type PendingRemoval = { type: 'pole'; id: string; nummer: number } | { type: 'line'; id: string; label: string };

export function Stolpepark() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();

  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nyttNummer, setNyttNummer] = useState('');
  const [nyLabel, setNyLabel] = useState('');
  const [strekkA, setStrekkA] = useState('');
  const [strekkB, setStrekkB] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const eierPoler = useMemo(() => data.poles.filter((p) => p.ownerCompanyId === current.companyId && !p.removed).sort((a, b) => a.number - b.number), [data.poles, current.companyId]);
  const eierLinjer = useMemo(() => {
    const idSet = new Set(eierPoler.map((p) => p.id));
    return data.lines.filter((l) => !l.removed && idSet.has(l.poleAId) && idSet.has(l.poleBId));
  }, [data.lines, eierPoler]);

  // Foreslå et stolpenummer som ikke allerede er i bruk av noen stolpeeier,
  // slik at det ikke oppstår forvirrende dubletter på tvers av virksomheter.
  const nesteNummer = (Math.max(0, ...data.poles.map((p) => p.number)) + 1).toString();
  const valgtNummer = parseInt(nyttNummer || nesteNummer, 10);
  const nummerErOpptatt = !isNaN(valgtNummer) && data.poles.some((p) => !p.removed && p.number === valgtNummer);

  function leggTilStolpe() {
    if (!pendingCoords) return;
    const nummer = parseInt(nyttNummer || nesteNummer, 10);
    if (isNaN(nummer)) return;
    store.addPole({ number: nummer, ownerCompanyId: current.companyId, lat: pendingCoords.lat, lon: pendingCoords.lon, label: nyLabel || undefined });
    setPendingCoords(null);
    setNyttNummer('');
    setNyLabel('');
    setPlacementMode(false);
  }

  function utforFjerning() {
    if (!pendingRemoval) return;
    if (pendingRemoval.type === 'pole') store.removePole(pendingRemoval.id);
    else store.removeLine(pendingRemoval.id);
    setPendingRemoval(null);
  }

  function fjernStolpeMelding(poleId: string, nummer: number) {
    const brukIAntallSoknader = data.soknader.filter((s) => s.poleIds.includes(poleId)).length;
    return brukIAntallSoknader > 0
      ? `Stolpe ${nummer} inngår i ${brukIAntallSoknader} søknad(er). Historikken beholdes, men stolpen fjernes fra stolpeparken og kan ikke velges i nye søknader. Fortsette?`
      : `Fjerne stolpe ${nummer} fra stolpeparken?`;
  }

  if (current.role !== 'saksbehandler') {
    return (
      <div className="empty-state">
        <h3>Kun saksbehandler/netteier kan administrere stolpeparken</h3>
        <p>Bytt til en stolpeeier-virksomhet i brukervelgeren øverst til høyre for å redigere stolper og strekk.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Stolpepark</h1>
        </div>
      </div>

      <div className="map-shell">
        <MapView
          poles={eierPoler}
          lines={eierLinjer}
          getPoleStatus={() => 'ikke_omsokt'}
          getLineStatus={() => 'ikke_omsokt'}
          placementMode={placementMode}
          onPlacePole={(lat, lon) => setPendingCoords({ lat, lon })}
          height={560}
        />
        <div className="card detail-panel">
          <div className="card-pad stack">
            <h4>Legg til ny stolpe</h4>
            {!placementMode && !pendingCoords && (
              <button className="btn btn-sm" onClick={() => setPlacementMode(true)}>
                📍 Klikk i kartet for å plassere ny stolpe
              </button>
            )}
            {placementMode && !pendingCoords && (
              <div className="faint">Klikk hvor som helst i kartet for å plassere stolpen …</div>
            )}
            {pendingCoords && (
              <div className="stack">
                <div className="faint">Posisjon valgt: {pendingCoords.lat.toFixed(5)}, {pendingCoords.lon.toFixed(5)}</div>
                <div className="field">
                  <label className="field-label">Stolpenummer</label>
                  <input value={nyttNummer} onChange={(e) => setNyttNummer(e.target.value)} placeholder={nesteNummer} />
                  {nummerErOpptatt && (
                    <div className="faint" style={{ color: 'var(--warning)', marginTop: 4 }}>
                      ⚠ Stolpenummer {valgtNummer} er allerede i bruk av en annen stolpe.
                    </div>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">Stedsnavn / merkelapp (valgfritt)</label>
                  <input value={nyLabel} onChange={(e) => setNyLabel(e.target.value)} placeholder="F.eks. Ved låven" />
                </div>
                <div className="hstack">
                  <button className="btn btn-primary btn-sm" onClick={leggTilStolpe}>Lagre stolpe</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setPendingCoords(null); setPlacementMode(false); }}>Avbryt</button>
                </div>
              </div>
            )}

            <hr className="sep" />
            <h4>Legg til strekk</h4>
            <div className="field">
              <label className="field-label">Fra stolpe</label>
              <select value={strekkA} onChange={(e) => setStrekkA(e.target.value)}>
                <option value="">Velg …</option>
                {eierPoler.map((p) => <option key={p.id} value={p.id}>Stolpe {p.number}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Til stolpe</label>
              <select value={strekkB} onChange={(e) => setStrekkB(e.target.value)}>
                <option value="">Velg …</option>
                {eierPoler.map((p) => <option key={p.id} value={p.id}>Stolpe {p.number}</option>)}
              </select>
            </div>
            <button
              className="btn btn-sm"
              disabled={!strekkA || !strekkB || strekkA === strekkB}
              onClick={() => { store.addLine(strekkA, strekkB); setStrekkA(''); setStrekkB(''); }}
            >
              Legg til strekk
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card card-pad">
          <h4>Stolper ({eierPoler.length})</h4>
          <table>
            <thead><tr><th>Nr</th><th>Merkelapp</th><th>Posisjon</th><th></th></tr></thead>
            <tbody>
              {eierPoler.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      style={{ width: 60 }}
                      defaultValue={p.number}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n)) store.updatePole(p.id, { number: n });
                      }}
                    />
                  </td>
                  <td>
                    <input defaultValue={p.label ?? ''} onBlur={(e) => store.updatePole(p.id, { label: e.target.value })} placeholder="–" />
                  </td>
                  <td className="faint">{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => setPendingRemoval({ type: 'pole', id: p.id, nummer: p.number })}>
                      Fjern
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card card-pad">
          <h4>Strekk ({eierLinjer.length})</h4>
          <table>
            <thead><tr><th>Strekk</th><th></th></tr></thead>
            <tbody>
              {eierLinjer.map((l) => {
                const a = data.poles.find((p) => p.id === l.poleAId);
                const b = data.poles.find((p) => p.id === l.poleBId);
                return (
                  <tr key={l.id}>
                    <td>Stolpe {a?.number} – Stolpe {b?.number}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingRemoval({ type: 'line', id: l.id, label: `Stolpe ${a?.number} – Stolpe ${b?.number}` })}
                      >
                        Fjern
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pendingRemoval && (
        <ConfirmDialog
          title={pendingRemoval.type === 'pole' ? 'Fjern stolpe' : 'Fjern strekk'}
          message={pendingRemoval.type === 'pole' ? fjernStolpeMelding(pendingRemoval.id, pendingRemoval.nummer) : `Fjerne strekket ${pendingRemoval.label}?`}
          confirmLabel="Fjern"
          danger
          onConfirm={utforFjerning}
          onCancel={() => setPendingRemoval(null)}
        />
      )}
    </div>
  );
}

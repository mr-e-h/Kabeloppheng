import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { companiesByKind } from '../selectors';
import { MapView } from '../components/MapView';

export function NySoknad() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const createSoknad = useStore((s) => s.createSoknad);
  const navigate = useNavigate();

  const stolpeeiere = companiesByKind(data, 'stolpeeier');
  const [stolpeeierId, setStolpeeierId] = useState(stolpeeiere[0]?.id ?? '');
  const [navn, setNavn] = useState('');
  const [adresse, setAdresse] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [selectedPoleIds, setSelectedPoleIds] = useState<Set<string>>(new Set());

  const polesForOwner = useMemo(
    () => data.poles.filter((p) => p.ownerCompanyId === stolpeeierId && !p.removed),
    [data.poles, stolpeeierId]
  );
  const linesForOwner = useMemo(() => {
    const poleIdSet = new Set(polesForOwner.map((p) => p.id));
    return data.lines.filter((l) => !l.removed && poleIdSet.has(l.poleAId) && poleIdSet.has(l.poleBId));
  }, [data.lines, polesForOwner]);

  const derivedLineIds = useMemo(() => {
    return linesForOwner.filter((l) => selectedPoleIds.has(l.poleAId) && selectedPoleIds.has(l.poleBId)).map((l) => l.id);
  }, [linesForOwner, selectedPoleIds]);

  function togglePole(poleId: string) {
    setSelectedPoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(poleId)) next.delete(poleId);
      else next.add(poleId);
      return next;
    });
  }

  const canSubmit = navn.trim().length > 0 && stolpeeierId && selectedPoleIds.size > 0;

  function onOpprett() {
    if (!canSubmit) return;
    const id = createSoknad({
      navn: navn.trim(),
      beskrivelse: beskrivelse.trim(),
      adresse: adresse.trim() || undefined,
      sokerCompanyId: current.companyId,
      stolpeeierCompanyId: stolpeeierId,
      poleIds: Array.from(selectedPoleIds),
      lineIds: derivedLineIds,
      createdByPersonId: current.personId,
    });
    navigate(`/soknader/${id}`);
  }

  if (current.role !== 'soker') {
    return (
      <div className="empty-state">
        <h3>Kun søker kan opprette søknad</h3>
        <p>Bytt til en virksomhet med rollen «Søker» i brukervelgeren øverst til høyre for å opprette en ny søknad.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ny søknad om kabeloppheng</h1>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 16 }}>
        <div className="card card-pad stack">
          <div className="field">
            <label className="field-label">Stolpeeier / netteier søknaden rettes til</label>
            <select
              value={stolpeeierId}
              onChange={(e) => {
                setStolpeeierId(e.target.value);
                setSelectedPoleIds(new Set());
              }}
            >
              {stolpeeiere.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Navn på søknad</label>
            <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. Fiberoppheng Solbakken–Myra" />
          </div>
          <div className="field">
            <label className="field-label">Adresse</label>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="F.eks. Solbakkveien 12, 2750 Gran" />
          </div>
          <div className="field">
            <label className="field-label">Beskrivelse</label>
            <textarea value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} placeholder="Kort beskrivelse av prosjektet/formålet" />
          </div>
          <hr className="sep" />
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span className="faint">{selectedPoleIds.size} stolpe(r) valgt · {derivedLineIds.length} strekk følger automatisk</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelectedPoleIds(new Set())}>
              Tøm valg
            </button>
          </div>
          <hr className="sep" />
          <button className="btn btn-primary" disabled={!canSubmit} onClick={onOpprett}>
            Opprett søknad som utkast →
          </button>
        </div>

        <MapView
          key={stolpeeierId}
          poles={polesForOwner}
          lines={linesForOwner}
          getPoleStatus={() => 'ikke_omsokt'}
          getLineStatus={() => 'ikke_omsokt'}
          selectMode
          selectedPoleIds={selectedPoleIds}
          onTogglePole={togglePole}
          height={520}
        />
      </div>
    </div>
  );
}

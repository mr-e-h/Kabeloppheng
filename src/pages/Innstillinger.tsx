import { useState } from 'react';
import { useStore } from '../store';
import { formatNOK } from '../statusUtils';
import type { KabelType } from '../types';

const MAKS_DATABLAD_BYTES = 5 * 1024 * 1024; // 5 MB, romslig nok til et vanlig produktdatablad

function formatFilstorrelse(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lesPdfSomDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Kunne ikke lese filen'));
    reader.readAsDataURL(file);
  });
}

export function Innstillinger() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Innstillinger</h1>
        </div>
      </div>

      <div className="stack" style={{ gap: 24 }}>
        <TiltakSeksjon />
        <KabelTyperSeksjon />
        <ProdukterSeksjon />
      </div>
    </div>
  );
}

function TiltakSeksjon() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();
  const [navn, setNavn] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [enhet, setEnhet] = useState('stk');
  const [pris, setPris] = useState(0);

  function leggTil() {
    if (!navn.trim()) return;
    store.addKatalogItem({ navn: navn.trim(), beskrivelse: beskrivelse.trim(), enhet: enhet.trim() || 'stk', standardpris: pris });
    setNavn('');
    setBeskrivelse('');
    setPris(0);
  }

  return (
    <div>
      <h3>Tiltak</h3>
      {current.role !== 'saksbehandler' ? (
        <div className="card card-pad">
          <p className="faint" style={{ margin: 0 }}>Bytt til en stolpeeier-virksomhet i brukervelgeren øverst til høyre for å redigere tiltakskatalogen.</p>
        </div>
      ) : (
        <>
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <table>
              <thead>
                <tr><th>Navn</th><th>Beskrivelse</th><th>Enhet</th><th>Standardpris</th><th></th></tr>
              </thead>
              <tbody>
                {data.katalog.map((k) => (
                  <tr key={k.id}>
                    <td style={{ minWidth: 150 }}>
                      <input defaultValue={k.navn} onBlur={(e) => store.updateKatalogItem(k.id, { navn: e.target.value })} />
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <input defaultValue={k.beskrivelse} onBlur={(e) => store.updateKatalogItem(k.id, { beskrivelse: e.target.value })} />
                    </td>
                    <td style={{ width: 80 }}>
                      <input defaultValue={k.enhet} onBlur={(e) => store.updateKatalogItem(k.id, { enhet: e.target.value })} />
                    </td>
                    <td style={{ width: 130 }}>
                      <input type="number" defaultValue={k.standardpris} onBlur={(e) => store.updateKatalogItem(k.id, { standardpris: parseInt(e.target.value) || 0 })} />
                    </td>
                    <td className="faint">{k.egendefinert ? 'Egendefinert' : formatNOK(k.standardpris)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card card-pad">
            <h4>Legg til nytt tiltak</h4>
            <div className="field-row">
              <div className="field"><label className="field-label">Navn</label><input value={navn} onChange={(e) => setNavn(e.target.value)} /></div>
              <div className="field" style={{ flex: 2 }}><label className="field-label">Beskrivelse</label><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} /></div>
              <div className="field" style={{ maxWidth: 90 }}><label className="field-label">Enhet</label><input value={enhet} onChange={(e) => setEnhet(e.target.value)} /></div>
              <div className="field" style={{ maxWidth: 130 }}><label className="field-label">Standardpris (kr)</label><input type="number" value={pris} onChange={(e) => setPris(parseInt(e.target.value) || 0)} /></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={leggTil} disabled={!navn.trim()}>+ Legg til tiltak i katalogen</button>
          </div>
        </>
      )}
    </div>
  );
}

function KabelTyperSeksjon() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const store = useStore();
  const [navn, setNavn] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [nyttDatablad, setNyttDatablad] = useState<{ dataUrl: string; filnavn: string; storrelse: number } | null>(null);
  const [feil, setFeil] = useState('');

  async function velgDatabladForNy(file: File | undefined) {
    setFeil('');
    if (!file) {
      setNyttDatablad(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      setFeil('Datablad må være en PDF-fil.');
      return;
    }
    if (file.size > MAKS_DATABLAD_BYTES) {
      setFeil(`Filen er for stor (${formatFilstorrelse(file.size)}). Maks ${formatFilstorrelse(MAKS_DATABLAD_BYTES)}.`);
      return;
    }
    const dataUrl = await lesPdfSomDataUrl(file);
    setNyttDatablad({ dataUrl, filnavn: file.name, storrelse: file.size });
  }

  function leggTil() {
    if (!navn.trim() || !nyttDatablad) return;
    store.addKabelType({
      navn: navn.trim(),
      beskrivelse: beskrivelse.trim(),
      databladDataUrl: nyttDatablad.dataUrl,
      databladFilnavn: nyttDatablad.filnavn,
      databladStorrelse: nyttDatablad.storrelse,
    });
    setNavn('');
    setBeskrivelse('');
    setNyttDatablad(null);
  }

  return (
    <div>
      <h3>Kabeltyper</h3>
      {current.role !== 'soker' ? (
        <div className="card card-pad">
          <p className="faint" style={{ margin: 0 }}>Bytt til en søkervirksomhet i brukervelgeren øverst til høyre for å legge til eller redigere kabeltyper.</p>
        </div>
      ) : (
        <>
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <table>
              <thead>
                <tr><th>Navn</th><th>Beskrivelse</th><th>Datablad (PDF)</th><th></th></tr>
              </thead>
              <tbody>
                {data.kabelTyper.map((k) => (
                  <tr key={k.id}>
                    <td style={{ minWidth: 180 }}>
                      <input defaultValue={k.navn} onBlur={(e) => store.updateKabelType(k.id, { navn: e.target.value })} />
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <input defaultValue={k.beskrivelse} onBlur={(e) => store.updateKabelType(k.id, { beskrivelse: e.target.value })} />
                    </td>
                    <td style={{ minWidth: 200 }}>
                      <DatabladCelle kabelType={k} />
                    </td>
                    <td className="faint">{k.egendefinert ? 'Egendefinert' : ''}</td>
                  </tr>
                ))}
                {data.kabelTyper.length === 0 && (
                  <tr><td colSpan={4} className="empty-state">Ingen kabeltyper registrert ennå.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card card-pad">
            <h4>Legg til ny kabeltype</h4>
            <div className="field-row">
              <div className="field"><label className="field-label">Navn</label><input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. Fiberkabel ADSS 96fo" /></div>
              <div className="field" style={{ flex: 2 }}><label className="field-label">Beskrivelse</label><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} /></div>
            </div>
            <div className="field">
              <label className="field-label">Datablad (PDF) — påkrevd</label>
              <input type="file" accept="application/pdf" onChange={(e) => velgDatabladForNy(e.target.files?.[0])} />
              {nyttDatablad && <div className="faint" style={{ marginTop: 4 }}>✓ {nyttDatablad.filnavn} ({formatFilstorrelse(nyttDatablad.storrelse)}) valgt</div>}
              {feil && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>{feil}</div>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={leggTil} disabled={!navn.trim() || !nyttDatablad}>
              + Legg til kabeltype
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DatabladCelle({ kabelType }: { kabelType: KabelType }) {
  const store = useStore();
  const [feil, setFeil] = useState('');

  async function velgFil(file: File | undefined) {
    setFeil('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFeil('Må være en PDF-fil.');
      return;
    }
    if (file.size > MAKS_DATABLAD_BYTES) {
      setFeil(`For stor (${formatFilstorrelse(file.size)}), maks ${formatFilstorrelse(MAKS_DATABLAD_BYTES)}.`);
      return;
    }
    const dataUrl = await lesPdfSomDataUrl(file);
    store.updateKabelType(kabelType.id, { databladDataUrl: dataUrl, databladFilnavn: file.name, databladStorrelse: file.size });
  }

  if (kabelType.databladDataUrl) {
    return (
      <div className="stack" style={{ gap: 2 }}>
        <a href={kabelType.databladDataUrl} target="_blank" rel="noreferrer" download={kabelType.databladFilnavn}>
          📄 {kabelType.databladFilnavn ?? 'datablad.pdf'}
        </a>
        <span className="faint" style={{ fontSize: 11 }}>
          {kabelType.databladStorrelse != null ? formatFilstorrelse(kabelType.databladStorrelse) : ''} · <label style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            Bytt fil
            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => velgFil(e.target.files?.[0])} />
          </label>
        </span>
        {feil && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{feil}</span>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 2 }}>
      <span style={{ color: 'var(--warning)', fontSize: 12 }}>⚠ Mangler datablad</span>
      <input type="file" accept="application/pdf" onChange={(e) => velgFil(e.target.files?.[0])} style={{ fontSize: 11 }} />
      {feil && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{feil}</span>}
    </div>
  );
}

function ProdukterSeksjon() {
  const data = useStore((s) => s.data);
  const store = useStore();
  const [navn, setNavn] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');

  function leggTil() {
    if (!navn.trim()) return;
    store.addProdukt({ navn: navn.trim(), beskrivelse: beskrivelse.trim() });
    setNavn('');
    setBeskrivelse('');
  }

  return (
    <div>
      <h3>Produkter</h3>
      <div className="card card-pad" style={{ marginBottom: 12 }}>
        <table>
          <thead>
            <tr><th>Navn</th><th>Beskrivelse</th><th></th></tr>
          </thead>
          <tbody>
            {data.produkter.map((p) => (
              <tr key={p.id}>
                <td style={{ minWidth: 180 }}>
                  <input defaultValue={p.navn} onBlur={(e) => store.updateProdukt(p.id, { navn: e.target.value })} />
                </td>
                <td style={{ minWidth: 280 }}>
                  <input defaultValue={p.beskrivelse} onBlur={(e) => store.updateProdukt(p.id, { beskrivelse: e.target.value })} />
                </td>
                <td className="faint">{p.egendefinert ? 'Egendefinert' : ''}</td>
              </tr>
            ))}
            {data.produkter.length === 0 && (
              <tr><td colSpan={3} className="empty-state">Ingen produkter registrert ennå.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card card-pad">
        <h4>Legg til nytt produkt</h4>
        <div className="field-row">
          <div className="field"><label className="field-label">Navn</label><input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="F.eks. Stolpefeste" /></div>
          <div className="field" style={{ flex: 2 }}><label className="field-label">Beskrivelse</label><input value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={leggTil} disabled={!navn.trim()}>+ Legg til produkt</button>
      </div>
    </div>
  );
}

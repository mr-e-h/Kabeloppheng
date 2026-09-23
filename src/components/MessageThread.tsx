import { useState } from 'react';
import { useStore } from '../store';
import { getMeldinger, getCompany, getPerson } from '../selectors';
import { formatDate } from '../statusUtils';

export function MessageThread({ soknadId, poleId, lineId, compact }: { soknadId: string; poleId?: string; lineId?: string; compact?: boolean }) {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const addMelding = useStore((s) => s.addMelding);
  const [tekst, setTekst] = useState('');

  const meldinger = getMeldinger(data, soknadId, { poleId, lineId });

  return (
    <div className="stack">
      {meldinger.length === 0 && <div className="faint">Ingen meldinger her ennå.</div>}
      <div className="stack" style={{ maxHeight: compact ? 220 : undefined, overflowY: compact ? 'auto' : undefined }}>
        {meldinger.map((m) => {
          const person = getPerson(data, m.authorPersonId);
          const company = getCompany(data, m.authorCompanyId);
          return (
            <div className="message-bubble" key={m.id}>
              <div className="message-meta">
                <strong>{person?.name ?? 'Ukjent'}</strong> · {company?.name} · {formatDate(m.createdAt)}
              </div>
              <div>{m.tekst}</div>
            </div>
          );
        })}
      </div>
      <div className="hstack">
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Skriv en melding …"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tekst.trim()) {
              addMelding(soknadId, tekst.trim(), current.personId, { poleId, lineId });
              setTekst('');
            }
          }}
        />
        <button
          className="btn btn-sm"
          disabled={!tekst.trim()}
          onClick={() => {
            addMelding(soknadId, tekst.trim(), current.personId, { poleId, lineId });
            setTekst('');
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

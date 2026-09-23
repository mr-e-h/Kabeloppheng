import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getVarslerForCompany, getSoknad } from '../selectors';
import { formatDate } from '../statusUtils';

export function NotificationBell() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const markVarselRead = useStore((s) => s.markVarselRead);
  const markAllVarslerRead = useStore((s) => s.markAllVarslerRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const varsler = getVarslerForCompany(data, current.companyId);
  const unread = varsler.filter((v) => !v.read).length;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Varsler" title="Varsler">
        🔔
        {unread > 0 && <span className="notif-dot">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
            <strong style={{ fontSize: 12.5 }}>Varsler</strong>
            {unread > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={() => markAllVarslerRead(current.companyId)}>
                Merk alle som lest
              </button>
            )}
          </div>
          {varsler.length === 0 && <div className="empty-state" style={{ padding: 24 }}>Ingen varsler ennå.</div>}
          {varsler.slice(0, 30).map((v) => {
            const s = getSoknad(data, v.soknadId);
            return (
              <div
                key={v.id}
                className={`dropdown-item ${v.read ? '' : 'unread'}`}
                onClick={() => {
                  markVarselRead(v.id);
                  setOpen(false);
                  if (s) navigate(`/soknader/${s.id}`);
                }}
              >
                <div style={{ fontWeight: v.read ? 400 : 600 }}>{v.tekst}</div>
                <div className="faint">{s?.soknadsnummer} · {formatDate(v.createdAt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

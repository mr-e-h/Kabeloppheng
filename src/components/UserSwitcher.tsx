import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { COMPANY_KIND_LABEL, ROLE_LABEL, personsForCompany, roleForCompanyKind } from '../selectors';
import type { CompanyKind } from '../types';

const KIND_ORDER: CompanyKind[] = ['soker', 'stolpeeier', 'entreprenor'];

export function UserSwitcher() {
  const data = useStore((s) => s.data);
  const current = useStore((s) => s.current);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentCompany = data.companies.find((c) => c.id === current.companyId);
  const currentPerson = data.persons.find((p) => p.id === current.personId);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="selector-pill" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontWeight: 700 }}>{currentPerson?.name}</span>
        <span style={{ opacity: 0.8 }}>· {currentCompany?.name}</span>
        <span>▾</span>
      </button>
      {open && (
        <div className="dropdown" style={{ width: 420 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
            <strong style={{ fontSize: 12.5 }}>Bytt testbruker / virksomhet</strong>
          </div>
          {KIND_ORDER.map((kind) => {
            const companies = data.companies.filter((c) => c.kinds.includes(kind));
            return (
              <div key={kind}>
                <div className="nav-section-title" style={{ color: 'var(--text-faint)', padding: '10px 14px 2px' }}>
                  {COMPANY_KIND_LABEL[kind]}
                </div>
                {companies.map((c) => {
                  const ppl = personsForCompany(data, c.id);
                  return (
                    <div key={c.id} style={{ padding: '4px 14px 10px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                      <div className="hstack" style={{ flexWrap: 'wrap', gap: 6 }}>
                        {ppl.map((p) => {
                          const isActive = p.id === current.personId && c.id === current.companyId;
                          return (
                            <button
                              key={p.id}
                              className="btn btn-sm"
                              style={isActive ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : undefined}
                              onClick={() => {
                                setCurrentUser({ personId: p.id, companyId: c.id, role: roleForCompanyKind(kind) });
                                setOpen(false);
                              }}
                              title={p.title}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RolePill() {
  const current = useStore((s) => s.current);
  return <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>{ROLE_LABEL[current.role]}</span>;
}

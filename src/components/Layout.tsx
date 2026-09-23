import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { UserSwitcher } from './UserSwitcher';
import { NotificationBell } from './NotificationBell';
import { ConfirmDialog } from './ConfirmDialog';

export function Layout({ children }: { children: ReactNode }) {
  const current = useStore((s) => s.current);
  const resetDemoData = useStore((s) => s.resetDemoData);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-brand">
          <span>🗼 Kabelopphenget</span>
          <span className="badge">Prototype</span>
        </div>
        <div className="topbar-right">
          <NotificationBell />
          <UserSwitcher />
          <button
            className="btn btn-sm btn-ghost"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => setConfirmReset(true)}
            title="Tilbakestill all data til demo-utgangspunktet"
          >
            ↺ Nullstill demo
          </button>
        </div>
      </div>
      <div className="nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          📊 Oversikt
        </NavLink>
        <NavLink to="/soknader" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          📁 Søknader
        </NavLink>
        {current.role === 'soker' && (
          <NavLink to="/soknader/ny" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            ➕ Ny søknad
          </NavLink>
        )}
        {current.role === 'entreprenor' && (
          <NavLink to="/arbeidsliste" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🛠 Arbeidsliste
          </NavLink>
        )}
        {current.role === 'saksbehandler' && (
          <NavLink to="/stolpepark" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🗺 Stolpepark
          </NavLink>
        )}
        <NavLink to="/innstillinger" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          ⚙️ Innstillinger
        </NavLink>
        <div className="nav-section-title">Om prototypen</div>
        <NavLink to="/om" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          ℹ️ Om / veiledning
        </NavLink>
      </div>
      <div className="main">{children}</div>
      {confirmReset && (
        <ConfirmDialog
          title="Nullstill demo"
          message="Tilbakestille all demo-data til utgangspunktet? Dette fjerner alle endringer du har gjort i denne økten."
          confirmLabel="Nullstill"
          danger
          onConfirm={() => {
            resetDemoData();
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

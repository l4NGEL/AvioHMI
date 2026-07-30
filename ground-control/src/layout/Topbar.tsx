import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, BellIcon } from '../components/icons';
import { useTelemetry } from '../context/TelemetryContext';

const SESSION_KEY = 'aviohmi.demoAuthenticated';

export function Topbar() {
  const { activeAlerts, aircraftSummaries, setSelectedAircraftId } = useTelemetry();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const query = search.trim().toLowerCase();
    if (!query) return;
    const match = aircraftSummaries.find((a) => a.callsign.toLowerCase().includes(query));
    if (match) {
      setSelectedAircraftId(match.aircraftId);
      navigate('/fleet');
      setSearch('');
    }
  }

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={handleSearchSubmit}>
        <SearchIcon />
        <input
          placeholder="Search callsign… (e.g. AVIO102)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="topbar-actions">
        <button className="icon-button" onClick={() => navigate('/alerts')} aria-label="Alerts" title="Alerts">
          <BellIcon />
          {activeAlerts.length > 0 && <span className="icon-button-badge">{activeAlerts.length}</span>}
        </button>
        <button className="avatar-button" onClick={handleSignOut} title="Sign out">
          OP
        </button>
      </div>
    </header>
  );
}

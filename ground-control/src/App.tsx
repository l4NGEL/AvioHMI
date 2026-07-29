import { useEffect, useRef, useState } from 'react';
import { SAMPLE_ROUTE, TelemetrySimulator } from './mock/telemetryFeed';
import type { TelemetryTick } from './types/telemetry';
import { useTelemetrySocket } from './hooks/useTelemetrySocket';
import { useHistoryPlayback } from './hooks/useHistoryPlayback';
import { computeAlerts } from './lib/alerts';
import { RouteMap } from './components/RouteMap';
import { TelemetryPanel } from './components/TelemetryPanel';
import { MissionLog } from './components/MissionLog';
import { AircraftList } from './components/AircraftList';
import { AlertBanner } from './components/AlertBanner';
import { TelemetryChart } from './components/TelemetryChart';
import { SensorFeedPanel } from './components/SensorFeedPanel';
import './index.css';

const CORE_WS_URL = 'ws://localhost:8765';
const DEMO_FALLBACK_DELAY_MS = 3000;
const DEMO_AIRCRAFT_ID = 'AC-101';

type Mode = 'live' | 'playback';

function App() {
  const { route: liveRoute, historiesByAircraft, status } = useTelemetrySocket(CORE_WS_URL);

  const simulatorRef = useRef(new TelemetrySimulator(DEMO_AIRCRAFT_ID, 'AVIO101', SAMPLE_ROUTE, 420, 0.03));
  const [demoTicks, setDemoTicks] = useState<TelemetryTick[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const usingLive = status === 'live' && Object.keys(historiesByAircraft).length > 0;

  // If Core hasn't answered in a few seconds, fall back to a local simulation
  // so the panel is still demoable without the Java server running.
  useEffect(() => {
    if (usingLive) {
      setDemoMode(false);
      return;
    }
    const timer = setTimeout(() => setDemoMode(true), DEMO_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [usingLive]);

  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      setDemoTicks((prev) => [...prev, simulatorRef.current.tick()].slice(-200));
    }, 500);
    return () => clearInterval(interval);
  }, [demoMode]);

  const route = usingLive ? liveRoute ?? SAMPLE_ROUTE : SAMPLE_ROUTE;
  const histories: Record<string, TelemetryTick[]> = usingLive
    ? historiesByAircraft
    : demoTicks.length > 0
      ? { [DEMO_AIRCRAFT_ID]: demoTicks }
      : {};
  const aircraftIds = Object.keys(histories);

  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  useEffect(() => {
    if ((!selectedAircraftId || !histories[selectedAircraftId]) && aircraftIds.length > 0) {
      setSelectedAircraftId(aircraftIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftIds.join(','), selectedAircraftId]);

  const [mode, setMode] = useState<Mode>('live');
  const playback = useHistoryPlayback(mode === 'playback' ? selectedAircraftId : null);

  const selectedHistory = selectedAircraftId ? histories[selectedAircraftId] ?? [] : [];
  const selectedLatest = selectedHistory[selectedHistory.length - 1];

  if (!selectedLatest) {
    return <div className="app-loading">Connecting to Mission Computer Core…</div>;
  }

  const allAlerts = aircraftIds.flatMap((id) => {
    const h = histories[id];
    const latest = h[h.length - 1];
    return computeAlerts(id, latest.callsign, latest.data, latest.fuelPercent, route);
  });

  const aircraftSummaries = aircraftIds.map((id) => {
    const latest = histories[id][histories[id].length - 1];
    return {
      aircraftId: id,
      callsign: latest.callsign,
      speedKts: latest.data.speedKts,
      altitudeMeters: latest.data.altitudeMeters,
      fuelPercent: latest.fuelPercent,
    };
  });

  const playbackPoint = mode === 'playback' ? playback.points[playback.index] : undefined;
  const mapAircraft =
    mode === 'playback' && playbackPoint
      ? [{ aircraftId: selectedAircraftId!, callsign: selectedLatest.callsign, data: playbackPoint }]
      : aircraftIds.map((id) => {
          const latest = histories[id][histories[id].length - 1];
          return { aircraftId: id, callsign: latest.callsign, data: latest.data };
        });

  return (
    <div className="app">
      <header className="app-header">
        <h1>AvioHMI Ground Control</h1>
        <span className="route-name">{route.name}</span>
        <div className="mode-toggle">
          <button className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}>
            LIVE
          </button>
          <button className={mode === 'playback' ? 'active' : ''} onClick={() => setMode('playback')}>
            PLAYBACK
          </button>
        </div>
        <span className={`status-badge ${usingLive ? 'status-live' : 'status-demo'}`}>
          {usingLive ? '● LIVE' : '● OFFLINE PREVIEW'}
        </span>
      </header>

      {mode === 'live' && <AlertBanner alerts={allAlerts} />}

      <main className="app-body">
        <div className="map-column">
          <div className="map-card">
            <RouteMap
              route={route}
              aircraftList={mapAircraft}
              selectedAircraftId={selectedAircraftId}
              trail={mode === 'live' ? selectedHistory.map((t) => t.data) : []}
              onAircraftClick={setSelectedAircraftId}
            />
          </div>
          {mode === 'playback' && (
            <div className="playback-controls">
              <button onClick={() => playback.setPlaying((p) => !p)} disabled={playback.points.length === 0}>
                {playback.playing ? '⏸' : '▶'}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, playback.points.length - 1)}
                value={playback.index}
                onChange={(e) => playback.setIndex(Number(e.target.value))}
                disabled={playback.points.length === 0}
              />
              <span className="playback-status">
                {playback.loading
                  ? 'Loading history…'
                  : playback.points.length > 0
                    ? `${playback.index + 1} / ${playback.points.length}`
                    : 'No persisted history (Postgres not connected?)'}
              </span>
            </div>
          )}
        </div>

        <div className="side-column">
          <AircraftList aircraftList={aircraftSummaries} selectedId={selectedAircraftId} onSelect={setSelectedAircraftId} />
          {mode === 'live' && <TelemetryPanel tick={selectedLatest} />}
          {mode === 'playback' && playbackPoint && (
            <div className="telemetry-panel">
              <h2>{selectedLatest.callsign} — replay</h2>
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-label">Speed</span>
                  <span className="stat-value">{playbackPoint.speedKts.toFixed(0)} kt</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Altitude</span>
                  <span className="stat-value">{playbackPoint.altitudeMeters.toFixed(0)} m</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Heading</span>
                  <span className="stat-value">{playbackPoint.headingDeg.toFixed(0)}°</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Recorded</span>
                  <span className="stat-value">{new Date(playbackPoint.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
          <TelemetryChart history={selectedHistory.map((t) => t.data)} />
          <SensorFeedPanel />
          {mode === 'live' && <MissionLog ticks={selectedHistory} />}
        </div>
      </main>
    </div>
  );
}

export default App;

import { useTelemetry } from '../context/TelemetryContext';
import { useHistoryPlayback } from '../hooks/useHistoryPlayback';
import { RouteMap } from '../components/RouteMap';
import { AircraftList } from '../components/AircraftList';

export default function PlaybackPage() {
  const { route, aircraftSummaries, selectedAircraftId, setSelectedAircraftId, selectedLatest } = useTelemetry();
  const playback = useHistoryPlayback(selectedAircraftId);

  if (!selectedLatest || !selectedAircraftId) return null;

  const playbackPoint = playback.points[playback.index];
  const mapAircraft = playbackPoint
    ? [{ aircraftId: selectedAircraftId, callsign: selectedLatest.callsign, data: playbackPoint }]
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Playback</h1>
        <p className="page-subtitle">Replay any aircraft's persisted flight history from PostgreSQL</p>
      </div>

      <div className="fleet-layout">
        <div className="map-column">
          <div className="map-card">
            <RouteMap route={route} aircraftList={mapAircraft} selectedAircraftId={selectedAircraftId} trail={[]} />
          </div>
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
        </div>

        <div className="side-column">
          <AircraftList aircraftList={aircraftSummaries} selectedId={selectedAircraftId} onSelect={setSelectedAircraftId} />
          {playbackPoint && (
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
        </div>
      </div>
    </div>
  );
}

import { useTelemetry } from '../context/TelemetryContext';
import { RouteMap } from '../components/RouteMap';
import { TelemetryPanel } from '../components/TelemetryPanel';
import { MissionLog } from '../components/MissionLog';
import { AircraftList } from '../components/AircraftList';
import { AlertBanner } from '../components/AlertBanner';
import { TelemetryChart } from '../components/TelemetryChart';

export default function FleetPage() {
  const {
    route,
    dataMode,
    aircraftIds,
    aircraftSummaries,
    histories,
    selectedAircraftId,
    setSelectedAircraftId,
    selectedHistory,
    selectedLatest,
    activeAlerts,
  } = useTelemetry();

  if (!selectedLatest) return null;

  const mapAircraft = aircraftIds.map((id) => {
    const latest = histories[id][histories[id].length - 1];
    return { aircraftId: id, callsign: latest.callsign, data: latest.data };
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fleet &amp; Map</h1>
        <p className="page-subtitle">
          {route.name}
          {dataMode === 'LIVE' && <span className="mode-badge mode-badge-live"> ● LIVE — real ADS-B (OpenSky)</span>}
        </p>
      </div>

      <AlertBanner alerts={activeAlerts} />

      <div className="fleet-layout">
        <div className="map-column">
          <div className="map-card">
            <RouteMap
              route={route}
              aircraftList={mapAircraft}
              selectedAircraftId={selectedAircraftId}
              trail={selectedHistory.map((t) => t.data)}
              onAircraftClick={setSelectedAircraftId}
              showRoute={dataMode !== 'LIVE'}
            />
          </div>
        </div>

        <div className="side-column">
          <AircraftList aircraftList={aircraftSummaries} selectedId={selectedAircraftId} onSelect={setSelectedAircraftId} />
          <TelemetryPanel tick={selectedLatest} />
          <TelemetryChart history={selectedHistory.map((t) => t.data)} />
          <MissionLog ticks={selectedHistory} />
        </div>
      </div>
    </div>
  );
}

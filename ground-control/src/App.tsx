import { useEffect, useRef, useState } from 'react';
import { SAMPLE_ROUTE, TelemetrySimulator } from './mock/telemetryFeed';
import type { TelemetryTick } from './types/telemetry';
import { RouteMap } from './components/RouteMap';
import { TelemetryPanel } from './components/TelemetryPanel';
import { MissionLog } from './components/MissionLog';
import './index.css';

function App() {
  const simulatorRef = useRef(new TelemetrySimulator('AC-101', 'AVIO101', SAMPLE_ROUTE, 420, 0.03));
  const [ticks, setTicks] = useState<TelemetryTick[]>([simulatorRef.current.tick()]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicks((prev) => [...prev, simulatorRef.current.tick()].slice(-200));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const latest = ticks[ticks.length - 1];

  return (
    <div className="app">
      <header className="app-header">
        <h1>AvioHMI Ground Control</h1>
        <span className="route-name">{SAMPLE_ROUTE.name}</span>
      </header>
      <main className="app-body">
        <div className="map-card">
          <RouteMap route={SAMPLE_ROUTE} current={latest.data} />
        </div>
        <div className="side-column">
          <TelemetryPanel tick={latest} />
          <MissionLog ticks={ticks} />
        </div>
      </main>
    </div>
  );
}

export default App;

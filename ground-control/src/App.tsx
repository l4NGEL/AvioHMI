import { useEffect, useRef, useState } from 'react';
import { SAMPLE_ROUTE, TelemetrySimulator } from './mock/telemetryFeed';
import type { TelemetryTick } from './types/telemetry';
import { useTelemetrySocket } from './hooks/useTelemetrySocket';
import { RouteMap } from './components/RouteMap';
import { TelemetryPanel } from './components/TelemetryPanel';
import { MissionLog } from './components/MissionLog';
import './index.css';

const CORE_WS_URL = 'ws://localhost:8765';
const DEMO_FALLBACK_DELAY_MS = 3000;

function App() {
  const { route: liveRoute, ticks: liveTicks, status } = useTelemetrySocket(CORE_WS_URL);

  const simulatorRef = useRef(new TelemetrySimulator('AC-101', 'AVIO101', SAMPLE_ROUTE, 420, 0.03));
  const [demoTicks, setDemoTicks] = useState<TelemetryTick[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const usingLive = status === 'live' && liveTicks.length > 0;

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
  const ticks = usingLive ? liveTicks : demoTicks;
  const latest = ticks[ticks.length - 1];

  if (!latest) {
    return <div className="app-loading">Connecting to Mission Computer Core…</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AvioHMI Ground Control</h1>
        <span className="route-name">{route.name}</span>
        <span className={`status-badge ${usingLive ? 'status-live' : 'status-demo'}`}>
          {usingLive ? '● LIVE' : '● OFFLINE PREVIEW'}
        </span>
      </header>
      <main className="app-body">
        <div className="map-card">
          <RouteMap route={route} current={latest.data} trail={ticks.map((t) => t.data)} />
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

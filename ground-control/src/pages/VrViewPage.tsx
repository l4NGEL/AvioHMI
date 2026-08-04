import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Line, Grid } from '@react-three/drei';
import { createXRStore, XR } from '@react-three/xr';
import { useTelemetry } from '../context/TelemetryContext';
import { toLocalKm } from '../lib/geo';

const STAGE_SIZE = 26; // scene units the fleet's lat/lon bounding box is normalized into
const ALTITUDE_DIVISOR = 300; // meters of real altitude per scene unit of height

interface AircraftPoint {
  aircraftId: string;
  callsign: string;
  x: number;
  y: number;
  z: number;
  headingDeg: number;
  hasAlert: boolean;
}

/**
 * A live 3D view of the fleet — real WebXR immersive VR when a headset is
 * connected, falling back to a mouse-orbited 3D scene otherwise (same
 * graceful-degradation pattern as TLS/Postgres/ffmpeg elsewhere in Core).
 * Positions come from the same live/demo telemetry as every other page, just
 * projected into a normalized 3D stage instead of onto a 2D map.
 */
export default function VrViewPage() {
  const { aircraftIds, histories, selectedAircraftId, setSelectedAircraftId, activeAlerts } = useTelemetry();
  const store = useMemo(() => createXRStore(), []);
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [xrError, setXrError] = useState<string | null>(null);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
    if (!xr) {
      setXrSupported(false);
      return;
    }
    xr.isSessionSupported('immersive-vr')
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  const alertAircraftIds = useMemo(() => new Set(activeAlerts.map((a) => a.aircraftId)), [activeAlerts]);

  const points: AircraftPoint[] = useMemo(() => {
    const latest = aircraftIds
      .map((id) => histories[id]?.[histories[id].length - 1])
      .filter((t): t is NonNullable<typeof t> => !!t);
    if (latest.length === 0) return [];

    const lats = latest.map((t) => t.data.lat);
    const lons = latest.map((t) => t.data.lon);
    const origin = {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lon: (Math.min(...lons) + Math.max(...lons)) / 2,
    };

    const local = latest.map((t) => ({ tick: t, ...toLocalKm(origin, { lat: t.data.lat, lon: t.data.lon }) }));
    const maxSpreadKm = Math.max(1, ...local.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
    const scale = STAGE_SIZE / 2 / maxSpreadKm;

    return local.map(({ tick, x, y }) => ({
      aircraftId: tick.aircraftId,
      callsign: tick.callsign,
      x: x * scale,
      z: -y * scale, // north = -Z, matching heading 0 = north pointing -Z below
      y: tick.data.altitudeMeters / ALTITUDE_DIVISOR,
      headingDeg: tick.data.headingDeg,
      hasAlert: alertAircraftIds.has(tick.aircraftId),
    }));
  }, [aircraftIds, histories, alertAircraftIds]);

  function enterVr() {
    setXrError(null);
    store.enterVR().catch((e: unknown) => setXrError(e instanceof Error ? e.message : 'Failed to start VR session'));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>VR View — Fleet Tower</h1>
        <p className="page-subtitle">
          A 3D spatial view of the live fleet, positioned from the same telemetry as the map. Enters real immersive VR
          via WebXR if a headset is connected; otherwise drag to orbit the same scene on screen.
        </p>
      </div>

      <div className="card vr-controls-bar">
        <button className="vr-enter-button" disabled={!xrSupported} onClick={enterVr}>
          Enter VR
        </button>
        <span className="vr-support-note">
          {xrSupported === null && 'Checking WebXR support…'}
          {xrSupported === false && 'No WebXR VR device detected here — drag below to orbit the 3D scene instead.'}
          {xrSupported === true && 'VR headset detected — click Enter VR.'}
        </span>
      </div>
      {xrError && (
        <div className="card">
          <p className="empty-hint">{xrError}</p>
        </div>
      )}

      <div className="card vr-canvas-card">
        {points.length === 0 ? (
          <p className="empty-hint">No aircraft telemetry yet.</p>
        ) : (
          <div className="vr-canvas-wrap">
            <span className="vr-orbit-hint">🖱 Drag: rotate · Scroll: zoom · Right-drag: pan</span>
            <Canvas camera={{ position: [0, 16, 34], fov: 55 }}>
              <XR store={store}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 20, 10]} intensity={1.2} />
                <Grid
                  args={[STAGE_SIZE * 1.6, STAGE_SIZE * 1.6]}
                  cellColor="#2a3542"
                  sectionColor="#3d4f61"
                  fadeDistance={70}
                />
                {points.map((p) => (
                  <group key={p.aircraftId}>
                    <Line
                      points={[
                        [p.x, 0, p.z],
                        [p.x, p.y, p.z],
                      ]}
                      color={p.aircraftId === selectedAircraftId ? '#ffd166' : '#4a5b6d'}
                      dashed
                      dashSize={0.2}
                      gapSize={0.15}
                    />
                    <mesh
                      position={[p.x, p.y, p.z]}
                      rotation={[-Math.PI / 2, -(p.headingDeg * Math.PI) / 180, 0]}
                      onClick={() => setSelectedAircraftId(p.aircraftId)}
                    >
                      <coneGeometry args={[0.3, 1, 8]} />
                      <meshStandardMaterial
                        color={p.hasAlert ? '#ff5a5a' : p.aircraftId === selectedAircraftId ? '#ffd166' : '#8fa6ba'}
                      />
                    </mesh>
                    <Billboard position={[p.x, p.y + 0.8, p.z]}>
                      <Text fontSize={0.35} color="#e7edf3" anchorX="center" anchorY="bottom">
                        {p.callsign}
                      </Text>
                    </Billboard>
                  </group>
                ))}
                <OrbitControls makeDefault target={[0, 10, 0]} />
              </XR>
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
}

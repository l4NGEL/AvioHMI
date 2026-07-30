import { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { bearingDeg, haversineKm, type LatLon } from '../lib/geo';

const HUD_COLOR = '#57e6a8';

type CompassEvent = Event & { webkitCompassHeading?: number; alpha?: number | null; absolute?: boolean };
type OrientationPermissionEventConstructor = {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * AR wayfinding: points a live arrow at a real waypoint's true compass bearing,
 * computed from the device's actual GPS position and compass heading — not a
 * fixed HUD, but genuine phone-sensor-driven augmented reality. Desktop
 * browsers don't expose a compass, so this only really comes alive on a phone.
 */
export default function ArViewPage() {
  const { route } = useTelemetry();
  const [targetIndex, setTargetIndex] = useState(0);
  const target = route.waypoints[targetIndex];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<number | null>(null);
  const positionRef = useRef<LatLon | null>(null);
  const targetRef = useRef<LatLon>(target);
  targetRef.current = target;

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [position, setPosition] = useState<LatLon | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [needsOrientationTap, setNeedsOrientationTap] = useState(false);
  const [orientationError, setOrientationError] = useState<string | null>(null);

  headingRef.current = heading;
  positionRef.current = position;

  // Camera passthrough
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('This browser does not support camera access.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setCameraError('Camera access was denied or no camera is available.');
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Live GPS position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 2000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Device compass — iOS requires a permission prompt triggered by a tap; Android/Chrome doesn't.
  useEffect(() => {
    function onOrientation(e: Event) {
      const ev = e as CompassEvent;
      if (typeof ev.webkitCompassHeading === 'number') {
        setHeading(ev.webkitCompassHeading);
      } else if (ev.absolute && ev.alpha != null) {
        setHeading((360 - ev.alpha) % 360);
      }
    }

    const doe = (window as unknown as { DeviceOrientationEvent?: OrientationPermissionEventConstructor })
      .DeviceOrientationEvent;
    if (doe?.requestPermission) {
      setNeedsOrientationTap(true);
      return;
    }
    window.addEventListener('deviceorientationabsolute', onOrientation, true);
    window.addEventListener('deviceorientation', onOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation, true);
      window.removeEventListener('deviceorientation', onOrientation, true);
    };
  }, []);

  async function enableCompass() {
    try {
      const doe = (window as unknown as { DeviceOrientationEvent: Required<OrientationPermissionEventConstructor> })
        .DeviceOrientationEvent;
      const result = await doe.requestPermission();
      if (result !== 'granted') {
        setOrientationError('Compass permission denied.');
        return;
      }
      setNeedsOrientationTap(false);
      window.addEventListener(
        'deviceorientation',
        (e) => {
          const ev = e as CompassEvent;
          if (typeof ev.webkitCompassHeading === 'number') setHeading(ev.webkitCompassHeading);
          else if (ev.alpha != null) setHeading((360 - ev.alpha) % 360);
        },
        true,
      );
    } catch {
      setOrientationError('Compass permission request failed.');
    }
  }

  // Draw loop
  useEffect(() => {
    let rafId = 0;
    function draw() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth > 0) {
        const w = video.clientWidth;
        const h = video.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          drawWayfinding(ctx, w, h, headingRef.current, positionRef.current, targetRef.current);
        }
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const distanceKm = position ? haversineKm(position, target) : null;
  const trueBearing = position ? bearingDeg(position, target) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>AR View — Wayfinding</h1>
        <p className="page-subtitle">
          Points a live arrow at the selected waypoint's real compass bearing, computed from your device's actual GPS
          position and compass heading. Phone only — desktop browsers don't expose a compass.
        </p>
      </div>

      <div className="card ar-waypoint-picker">
        <span>Target waypoint</span>
        <select value={targetIndex} onChange={(e) => setTargetIndex(Number(e.target.value))} className="waypoint-select">
          {route.waypoints.map((w, i) => (
            <option key={w.name} value={i}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card ar-frame">
        {cameraError ? (
          <p className="empty-hint">{cameraError}</p>
        ) : (
          <div className="ar-video-wrap">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} muted playsInline className="ar-video" />
            <canvas ref={canvasRef} className="ar-canvas" />
            {!ready && <div className="ar-loading">Requesting camera…</div>}
            {needsOrientationTap && (
              <button className="ar-permission-button" onClick={enableCompass}>
                Enable compass
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Distance</span>
            <span className="stat-value">{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">True bearing</span>
            <span className="stat-value">{trueBearing != null ? `${trueBearing.toFixed(0)}°` : '—'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Device heading</span>
            <span className="stat-value">{heading != null ? `${heading.toFixed(0)}°` : 'no compass yet'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">GPS</span>
            <span className="stat-value">
              {geoError ?? (position ? `${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}` : 'locating…')}
            </span>
          </div>
        </div>
        {orientationError && <p className="empty-hint">{orientationError}</p>}
      </div>
    </div>
  );
}

function drawWayfinding(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  heading: number | null,
  position: LatLon | null,
  target: LatLon,
) {
  ctx.strokeStyle = HUD_COLOR;
  ctx.fillStyle = HUD_COLOR;
  ctx.lineWidth = 2;
  ctx.font = '13px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeRect(6, 6, w - 12, h - 12);

  const cx = w / 2;
  const cy = h / 2;

  if (heading == null || position == null) {
    ctx.fillText(heading == null ? 'Waiting for compass…' : 'Waiting for GPS…', cx, cy);
    return;
  }

  const targetBearing = bearingDeg(position, target);
  const relative = ((targetBearing - heading + 540) % 360) - 180; // -180..180, 0 = straight ahead

  const arrowLen = Math.min(w, h) * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((relative * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -arrowLen);
  ctx.lineTo(-arrowLen * 0.35, arrowLen * 0.3);
  ctx.lineTo(0, arrowLen * 0.1);
  ctx.lineTo(arrowLen * 0.35, arrowLen * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillText(`${Math.abs(relative).toFixed(0)}° ${relative >= 0 ? 'right' : 'left'}`, cx, cy + arrowLen + 24);
}

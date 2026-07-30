import { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import type { TelemetryTick } from '../types/telemetry';

const HUD_COLOR = '#57e6a8';

/**
 * Real augmented reality: a live getUserMedia camera feed with flight data
 * composited on top every animation frame via canvas — the camera passthrough
 * and the HUD are genuinely overlaid in real time, unlike the CUDA pipeline's
 * static-frame-swap HUD (which processes a pre-recorded sample video, not a
 * live feed, since there's no camera on this HMI's target hardware).
 */
export default function ArViewPage() {
  const { selectedLatest } = useTelemetry();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latestRef = useRef<TelemetryTick | undefined>(selectedLatest);
  latestRef.current = selectedLatest;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not support camera access (getUserMedia).');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setReady(true);
        draw();
      } catch {
        setError('Camera access was denied or no camera is available — grant permission and reload to use AR View.');
      }
    }

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
          drawHud(ctx, w, h, latestRef.current);
        }
      }
      rafId = requestAnimationFrame(draw);
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>AR View</h1>
        <p className="page-subtitle">
          Live camera passthrough with a real-time HUD composited via canvas — genuine camera + synthetic-overlay
          augmented reality, driven by the selected aircraft's live telemetry.
        </p>
      </div>

      <div className="card ar-frame">
        {error ? (
          <p className="empty-hint">{error}</p>
        ) : (
          <div className="ar-video-wrap">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} muted playsInline className="ar-video" />
            <canvas ref={canvasRef} className="ar-canvas" />
            {!ready && <div className="ar-loading">Requesting camera…</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function drawHud(ctx: CanvasRenderingContext2D, w: number, h: number, tick?: TelemetryTick) {
  ctx.strokeStyle = HUD_COLOR;
  ctx.fillStyle = HUD_COLOR;
  ctx.lineWidth = 2;
  ctx.font = '13px ui-monospace, Consolas, monospace';
  ctx.textBaseline = 'middle';

  // Frame border
  ctx.strokeRect(6, 6, w - 12, h - 12);

  const heading = tick?.data.headingDeg ?? 0;
  const speed = tick?.data.speedKts ?? 0;
  const altitude = tick?.data.altitudeMeters ?? 0;

  // Heading tape across the top
  const tapeY = 34;
  ctx.beginPath();
  ctx.moveTo(30, tapeY);
  ctx.lineTo(w - 30, tapeY);
  ctx.stroke();
  for (let i = -4; i <= 4; i++) {
    const tickHeading = Math.round((heading + i * 15) / 10) * 10;
    const x = w / 2 + i * 40;
    if (x < 30 || x > w - 30) continue;
    ctx.beginPath();
    ctx.moveTo(x, tapeY - 8);
    ctx.lineTo(x, tapeY);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(String(((tickHeading % 360) + 360) % 360).padStart(3, '0'), x, tapeY - 16);
  }
  ctx.beginPath();
  ctx.moveTo(w / 2 - 7, tapeY + 10);
  ctx.lineTo(w / 2 + 7, tapeY + 10);
  ctx.lineTo(w / 2, tapeY + 2);
  ctx.closePath();
  ctx.fill();

  // Speed (left) and altitude (right) readouts
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px ui-monospace, Consolas, monospace';
  ctx.fillText(speed.toFixed(0), 24, h / 2);
  ctx.font = '11px ui-monospace, Consolas, monospace';
  ctx.fillText('KT', 24, h / 2 + 20);

  ctx.textAlign = 'right';
  ctx.font = 'bold 20px ui-monospace, Consolas, monospace';
  ctx.fillText(altitude.toFixed(0), w - 24, h / 2);
  ctx.font = '11px ui-monospace, Consolas, monospace';
  ctx.fillText('M', w - 24, h / 2 + 20);

  // Center reticle
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx, cy + 16);
  ctx.stroke();

  // Callsign / nav readout at bottom
  if (tick) {
    ctx.textAlign = 'center';
    ctx.font = '13px ui-monospace, Consolas, monospace';
    ctx.fillText(
      `${tick.callsign} · NEXT ${tick.nextWaypoint.name} · ${tick.distanceToNextKm.toFixed(0)}km · fuel ${tick.fuelPercent.toFixed(0)}%`,
      cx,
      h - 24,
    );
  }
}

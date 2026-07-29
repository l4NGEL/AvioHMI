import { useEffect, useState } from 'react';

const OVERLAY_URL = 'http://localhost:8766/overlay.bmp';
const REFRESH_MS = 3000;

/** Polls Core's HTTP endpoint for the CUDA-generated HUD overlay frame (see video-processing/edge_detect.cu). */
export function SensorFeedPanel() {
  const [src, setSrc] = useState(`${OVERLAY_URL}?t=0`);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setSrc(`${OVERLAY_URL}?t=${Date.now()}`), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sensor-feed-card">
      <h3>Sensor Feed — CUDA HUD</h3>
      <div className="sensor-feed-frame">
        <img src={src} alt="CUDA-generated HUD overlay" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
        {broken && (
          <div className="sensor-feed-offline">
            Overlay unavailable — is core/serve.sh running with video-processing/edge_detect.exe built?
          </div>
        )}
      </div>
    </div>
  );
}

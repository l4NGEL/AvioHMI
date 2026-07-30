import { SensorFeedPanel } from '../components/SensorFeedPanel';

export default function SensorFeedPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Sensor Feed</h1>
        <p className="page-subtitle">
          Core decodes a real frame from a sample sensor video with ffmpeg, runs it through the CUDA Sobel kernel,
          and composites live telemetry into the HUD — refreshed every few seconds.
        </p>
      </div>

      <SensorFeedPanel />
    </div>
  );
}

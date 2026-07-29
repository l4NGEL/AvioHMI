import { useEffect, useState } from 'react';
import type { HistoryPoint } from '../types/telemetry';

const HTTP_BASE = 'http://localhost:8766';
const PLAYBACK_TICK_MS = 300;

/** Fetches persisted history for an aircraft from Core's /history endpoint and provides scrub/play controls. */
export function useHistoryPlayback(aircraftId: string | null) {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aircraftId) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${HTTP_BASE}/history?aircraftId=${encodeURIComponent(aircraftId)}&limit=300`)
      .then((r) => r.json())
      .then((data: HistoryPoint[]) => {
        if (cancelled) return;
        setPoints(data);
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aircraftId]);

  useEffect(() => {
    if (!playing || points.length === 0) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1 >= points.length ? 0 : i + 1));
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(interval);
  }, [playing, points.length]);

  return { points, index, setIndex, playing, setPlaying, loading };
}

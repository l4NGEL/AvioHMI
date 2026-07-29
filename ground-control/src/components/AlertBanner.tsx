import type { Alert } from '../lib/alerts';

interface Props {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-banner">
      {alerts.map((a, i) => (
        <span key={`${a.aircraftId}-${a.kind}-${i}`} className={`alert-chip alert-${a.kind.toLowerCase()}`}>
          {a.message}
        </span>
      ))}
    </div>
  );
}

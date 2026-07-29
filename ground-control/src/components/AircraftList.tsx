export interface AircraftSummary {
  aircraftId: string;
  callsign: string;
  speedKts: number;
  altitudeMeters: number;
  fuelPercent: number;
}

interface Props {
  aircraftList: AircraftSummary[];
  selectedId: string | null;
  onSelect: (aircraftId: string) => void;
}

export function AircraftList({ aircraftList, selectedId, onSelect }: Props) {
  return (
    <div className="aircraft-list">
      <h3>Fleet ({aircraftList.length})</h3>
      <ul>
        {aircraftList.map((a) => (
          <li
            key={a.aircraftId}
            className={a.aircraftId === selectedId ? 'aircraft-row selected' : 'aircraft-row'}
            onClick={() => onSelect(a.aircraftId)}
          >
            <span className="callsign">{a.callsign}</span>
            <span className="mini-stats">
              {a.speedKts.toFixed(0)}kt · {a.altitudeMeters.toFixed(0)}m · fuel {a.fuelPercent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

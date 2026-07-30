import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  iconColor: string;
  value: string;
  label: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

export function KpiCard({ icon, iconColor, value, label, trend, trendDirection = 'neutral' }: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className="kpi-icon" style={{ background: iconColor }}>
          {icon}
        </div>
        {trend && <span className={`kpi-trend kpi-trend-${trendDirection}`}>{trend}</span>}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

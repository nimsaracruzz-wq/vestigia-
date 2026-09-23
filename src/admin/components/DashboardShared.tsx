import { Reveal } from "../../animation/Reveal";
import React from "react";

export function StatCard({
  title,
  value,
  label,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: string;
}) {
  return (
    <Reveal className="admin-stat-card">
      <div className="admin-stat-card-top">
        <h3>{title}</h3>
        {icon && <span className="admin-stat-icon">{icon}</span>}
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-foot">
        <span className="admin-stat-label">{label}</span>
        {trend && <span className="admin-stat-trend">{trend}</span>}
      </div>
    </Reveal>
  );
}

export function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <Reveal className="admin-chart-wrapper">
      <svg width="100%" height="200" viewBox={`0 0 ${data.length * 40} 200`} preserveAspectRatio="none">
        {data.map((val, i) => {
          const height = (val / max) * 160;
          return (
            <rect 
              key={i} 
              x={i * 40 + 10} 
              y={200 - height} 
              width="20" 
              height={height} 
              fill="#111" 
              rx="4"
            />
          );
        })}
      </svg>
    </Reveal>
  );
}

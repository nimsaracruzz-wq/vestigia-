import React from "react";

export function StatCard({ title, value, label }: { title: string; value: string | number; label: string }) {
  return (
    <div className="admin-stat-card">
      <h3>{title}</h3>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

export function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="admin-chart-wrapper">
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
    </div>
  );
}

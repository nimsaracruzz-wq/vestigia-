import React from "react";

export function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="admin-donut-wrapper">
      <svg width="100%" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="transparent" stroke="#f0f0f0" strokeWidth="30" />
        {data.map((item, i) => {
          const dashArray = (item.value / total) * 502.4; // 2 * PI * 80
          const dashOffset = currentOffset;
          currentOffset -= dashArray;
          
          return (
            <circle
              key={i}
              cx="100"
              cy="100"
              r="80"
              fill="transparent"
              stroke={item.color}
              strokeWidth="30"
              strokeDasharray={`${dashArray} 502.4`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
              className="admin-donut-segment"
            />
          );
        })}
      </svg>
      <div className="admin-donut-legend">
        {data.map((item, i) => (
          <div key={i} className="admin-donut-legend-item">
            <span className="color-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            <strong>{Math.round((item.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

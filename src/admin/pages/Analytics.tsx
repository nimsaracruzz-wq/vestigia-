import { useState, useMemo } from "react";
import { useAdmin } from "../AdminContext";
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, Package,
  DollarSign, AlertTriangle, CheckCircle, Zap, BarChart2, Activity,
  Star, Clock, RefreshCw
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round(((a - b) / b) * 100);
}

// Simple linear regression for trend forecasting
function linearRegression(values: number[]) {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  const numerator = values.reduce((acc, y, x) => acc + (x - xMean) * (y - yMean), 0);
  const denominator = values.reduce((acc, _, x) => acc + (x - xMean) ** 2, 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  return { slope, intercept, predict: (x: number) => intercept + slope * x };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, title, value, sub, trend, color = "#111"
}: {
  icon: React.FC<any>; title: string; value: string; sub: string;
  trend?: number; color?: string;
}) {
  const isPos = (trend ?? 0) >= 0;
  return (
    <div className="analytics-kpi-card">
      <div className="analytics-kpi-header">
        <div className="analytics-kpi-icon" style={{ background: color + "15", color }}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`analytics-kpi-trend ${isPos ? "pos" : "neg"}`}>
            {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="analytics-kpi-value">{value}</div>
      <div className="analytics-kpi-title">{title}</div>
      <div className="analytics-kpi-sub">{sub}</div>
    </div>
  );
}

// ─── Revenue Bar Chart (SVG, proper axes, gridlines, tooltips) ───────────────
function RevenueBarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);

  const PAD_LEFT = 56;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 44;
  const W = 700;
  const H = 220;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(...data, 1);
  // Nice Y ticks
  const tickCount = 4;
  const rawStep = max / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  const yMax = yTicks[yTicks.length - 1] || 1;

  const barW = Math.max(2, (chartW / data.length) - 2);
  const barGap = chartW / data.length;

  // Trend line (linear regression)
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  const num = data.reduce((acc, y, x) => acc + (x - xMean) * (y - yMean), 0);
  const den = data.reduce((acc, _, x) => acc + (x - xMean) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const trendX1 = PAD_LEFT;
  const trendY1 = PAD_TOP + chartH - Math.min(Math.max((intercept / yMax) * chartH, 0), chartH);
  const trendX2 = PAD_LEFT + chartW;
  const trendY2 = PAD_TOP + chartH - Math.min(Math.max(((intercept + slope * (n - 1)) / yMax) * chartH, 0), chartH);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines + Y labels */}
        {yTicks.map((tick) => {
          const y = PAD_TOP + chartH - (tick / yMax) * chartH;
          return (
            <g key={tick}>
              <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + chartW} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#aaa">
                {tick >= 1000 ? `$${(tick / 1000).toFixed(0)}k` : `$${tick}`}
              </text>
            </g>
          );
        })}

        {/* Trend line */}
        {n > 1 && (
          <line
            x1={trendX1} y1={trendY1} x2={trendX2} y2={trendY2}
            stroke={slope >= 0 ? "#22c55e" : "#ef4444"}
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.7"
          />
        )}

        {/* Bars */}
        {data.map((v, i) => {
          const barHeight = Math.max((v / yMax) * chartH, v > 0 ? 2 : 0);
          const bx = PAD_LEFT + i * barGap + (barGap - barW) / 2;
          const by = PAD_TOP + chartH - barHeight;

          // X-axis label: show every Nth bar to avoid crowding
          const labelEvery = data.length <= 14 ? 1 : data.length <= 31 ? 5 : 10;
          const showLabel = i % labelEvery === 0 || i === data.length - 1;

          return (
            <g key={i}>
              {/* Invisible wide hit area */}
              <rect
                x={PAD_LEFT + i * barGap}
                y={PAD_TOP}
                width={barGap}
                height={chartH}
                fill="transparent"
                onMouseEnter={(e) => {
                  const svgRect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const scaleX = W / svgRect.width;
                  setTooltip({
                    x: bx + barW / 2,
                    y: by - 6,
                    value: v,
                    label: labels[i] || `Day ${i + 1}`,
                  });
                }}
              />
              {/* Bar */}
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barHeight}
                fill={tooltip?.label === (labels[i] || `Day ${i + 1}`) ? "#c8a96e" : "#1a1a1a"}
                rx="2"
                style={{ transition: "fill 0.15s" }}
              />
              {/* X label */}
              {showLabel && labels[i] && (
                <text
                  x={bx + barW / 2}
                  y={PAD_TOP + chartH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#999"
                >
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}

        {/* Axis line */}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + chartH} stroke="#e8e8e8" strokeWidth="1" />
        <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={PAD_LEFT + chartW} y2={PAD_TOP + chartH} stroke="#e8e8e8" strokeWidth="1" />

        {/* Tooltip bubble inside SVG */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 38, W - PAD_RIGHT - 80)}
              y={Math.max(tooltip.y - 32, PAD_TOP)}
              width={80}
              height={26}
              rx={5}
              fill="#111"
              opacity="0.92"
            />
            <text
              x={Math.min(tooltip.x - 38, W - PAD_RIGHT - 80) + 40}
              y={Math.max(tooltip.y - 32, PAD_TOP) + 11}
              textAnchor="middle"
              fontSize="9.5"
              fill="#aaa"
            >
              {tooltip.label}
            </text>
            <text
              x={Math.min(tooltip.x - 38, W - PAD_RIGHT - 80) + 40}
              y={Math.max(tooltip.y - 32, PAD_TOP) + 22}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#fff"
            >
              {fmt(tooltip.value)}
            </text>
          </g>
        )}
      </svg>
      {/* Trend legend */}
      <div style={{ display: "flex", gap: 16, fontSize: "0.75rem", color: "#888", marginTop: 4, paddingLeft: PAD_LEFT }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 16, height: 2, background: "#1a1a1a", borderRadius: 1 }} />
          Daily revenue
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 16, height: 2, background: slope >= 0 ? "#22c55e" : "#ef4444", borderRadius: 1, borderTop: "1px dashed" }} />
          Trend line
        </span>
      </div>
    </div>
  );
}

// ─── Sparkline (SVG area chart with axes) ─────────────────────────────────────
function SparkLine({ data, color = "#c8a96e" }: { data: number[]; color?: string }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; idx: number } | null>(null);
  if (data.length < 2) return <div style={{ color: "#aaa", fontSize: "0.85rem", padding: "16px 0" }}>Not enough data</div>;

  const PAD_LEFT = 48;
  const PAD_RIGHT = 8;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const W = 400;
  const H = 140;
  const cW = W - PAD_LEFT - PAD_RIGHT;
  const cH = H - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(...data, 1);
  const rawStep = max / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / mag) * mag;
  const yTicks = [0, step, step * 2, step * 3];
  const yMax = yTicks[yTicks.length - 1] || 1;

  const pts = data.map((v, i) => [
    PAD_LEFT + (i / (data.length - 1)) * cW,
    PAD_TOP + cH - Math.min((v / yMax) * cH, cH),
  ]);
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${PAD_LEFT},${PAD_TOP + cH} ${polyline} ${PAD_LEFT + cW},${PAD_TOP + cH}`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible" }}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Grid + Y labels */}
      {yTicks.map((tick) => {
        const y = PAD_TOP + cH - (tick / yMax) * cH;
        return (
          <g key={tick}>
            <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + cW} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={PAD_LEFT - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#bbb">
              {tick >= 1000 ? `$${(tick / 1000).toFixed(0)}k` : `$${tick}`}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <polygon points={area} fill={color} fillOpacity="0.12" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Hit areas + dots */}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill={tooltip?.idx === i ? color : "transparent"} stroke={tooltip?.idx === i ? color : "transparent"} />
          <rect
            x={x - cW / (data.length * 2)}
            y={PAD_TOP}
            width={cW / data.length}
            height={cH}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x, y, value: data[i], idx: i })}
          />
        </g>
      ))}

      {/* X labels (W1…W8) */}
      {data.map((_, i) => (
        <text
          key={i}
          x={pts[i][0]}
          y={H - 4}
          textAnchor="middle"
          fontSize="9"
          fill="#bbb"
        >
          W{i + 1}
        </text>
      ))}

      {/* Axes */}
      <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + cH} stroke="#e8e8e8" strokeWidth="1" />
      <line x1={PAD_LEFT} y1={PAD_TOP + cH} x2={PAD_LEFT + cW} y2={PAD_TOP + cH} stroke="#e8e8e8" strokeWidth="1" />

      {/* Tooltip */}
      {tooltip && (
        <g>
          <line x1={tooltip.x} y1={PAD_TOP} x2={tooltip.x} y2={PAD_TOP + cH} stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
          <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={color} />
          <rect
            x={Math.min(tooltip.x - 30, W - PAD_RIGHT - 64)}
            y={Math.max(tooltip.y - 32, PAD_TOP)}
            width={62}
            height={24}
            rx={4}
            fill="#111"
            opacity="0.9"
          />
          <text
            x={Math.min(tooltip.x - 30, W - PAD_RIGHT - 64) + 31}
            y={Math.max(tooltip.y - 32, PAD_TOP) + 15}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#fff"
          >
            {fmt(tooltip.value)}
          </text>
        </g>
      )}
    </svg>
  );
}

function StatusFunnel({ statusCounts }: { statusCounts: Record<string, number> }) {
  const order = ["pending", "confirmed", "processing", "quality_check", "packed", "ready_for_shipment", "shipped", "out_for_delivery", "delivered"];
  const colors: Record<string, string> = {
    pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6",
    quality_check: "#ec4899", packed: "#14b8a6", ready_for_shipment: "#0ea5e9",
    shipped: "#6366f1", out_for_delivery: "#f97316", delivered: "#22c55e"
  };
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="analytics-funnel">
      {order.filter(s => statusCounts[s]).map(s => (
        <div key={s} className="analytics-funnel-row">
          <span className="analytics-funnel-label">{s.replace(/_/g, " ")}</span>
          <div className="analytics-funnel-bar-bg">
            <div
              className="analytics-funnel-bar"
              style={{ width: `${(statusCounts[s] / total) * 100}%`, background: colors[s] }}
            />
          </div>
          <span className="analytics-funnel-count">{statusCounts[s]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── AI Insight Engine ────────────────────────────────────────────────────────

interface Insight {
  type: "positive" | "warning" | "tip" | "info";
  title: string;
  body: string;
}

function generateInsights({
  revenueThisMonth, revenuePrevMonth,
  avgOrderValue, totalOrders,
  cancelRate, topProduct,
  lowStockCount, repeatCustomerRate,
  slope, revenueToday,
}: {
  revenueThisMonth: number; revenuePrevMonth: number;
  avgOrderValue: number; totalOrders: number;
  cancelRate: number; topProduct: string;
  lowStockCount: number; repeatCustomerRate: number;
  slope: number; revenueToday: number;
}): Insight[] {
  const insights: Insight[] = [];
  const growth = pct(revenueThisMonth, revenuePrevMonth);

  if (growth > 10)
    insights.push({ type: "positive", title: "Revenue Accelerating", body: `Monthly revenue is up ${growth}% over last month — maintain momentum by pushing email campaigns this week.` });
  else if (growth < -10)
    insights.push({ type: "warning", title: "Revenue Declining", body: `Revenue fell ${Math.abs(growth)}% vs last month. Consider running a limited-time promotion or flash sale to re-engage shoppers.` });

  if (cancelRate > 15)
    insights.push({ type: "warning", title: "High Cancellation Rate", body: `${cancelRate.toFixed(0)}% of orders are being cancelled. Review fulfillment timelines — delays often drive cancellations before dispatch.` });
  else if (cancelRate > 0)
    insights.push({ type: "positive", title: "Healthy Fulfilment Rate", body: `Order cancellation rate is only ${cancelRate.toFixed(0)}%. Customers are satisfied with fulfilment — keep it up.` });

  if (avgOrderValue > 150)
    insights.push({ type: "positive", title: "Strong Average Order Value", body: `AOV of ${fmt(avgOrderValue)} suggests customers are buying multiple pieces. Bundle promotions could push this even higher.` });
  else if (avgOrderValue > 0)
    insights.push({ type: "tip", title: "Boost Average Order Value", body: `AOV is currently ${fmt(avgOrderValue)}. Try displaying "Complete the Look" suggestions at checkout to encourage upsells.` });

  if (lowStockCount > 0)
    insights.push({ type: "warning", title: "Inventory Alert", body: `${lowStockCount} product${lowStockCount > 1 ? "s are" : " is"} critically low on stock. Restock now to avoid lost sales and poor customer experience.` });

  if (topProduct)
    insights.push({ type: "info", title: `"${topProduct}" is your Best Seller`, body: "Feature this product prominently in your homepage hero and social media posts to capitalise on demand." });

  if (repeatCustomerRate > 30)
    insights.push({ type: "positive", title: "Strong Repeat Purchase Rate", body: `${repeatCustomerRate.toFixed(0)}% of your customers have placed more than one order — your brand loyalty is strong. Consider a loyalty rewards programme.` });
  else if (totalOrders > 5)
    insights.push({ type: "tip", title: "Grow Repeat Purchases", body: "Repeat customer rate is low. An automated post-purchase email sequence 7 days after delivery can significantly increase return visits." });

  if (slope > 50)
    insights.push({ type: "positive", title: "Upward Revenue Trend", body: "The 30-day revenue trendline is strongly positive. AI forecasting suggests continued growth — ideal time to run seasonal campaigns." });
  else if (slope < -50)
    insights.push({ type: "warning", title: "Downward Revenue Trend", body: "Revenue is on a downward trendline. Consider refreshing your product photography, running a targeted discount, or launching a new product." });

  if (revenueToday === 0 && totalOrders > 0)
    insights.push({ type: "tip", title: "No Revenue Today", body: "No sales recorded today. A social post or email to your subscriber list could spark activity." });

  if (insights.length === 0)
    insights.push({ type: "info", title: "All Systems Normal", body: "Your store metrics look healthy. Add more products and start marketing campaigns to accelerate growth." });

  return insights;
}

const insightColors: Record<string, { bg: string; border: string; icon: React.FC<any>; iconColor: string }> = {
  positive: { bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle, iconColor: "#22c55e" },
  warning: { bg: "#fff7ed", border: "#fed7aa", icon: AlertTriangle, iconColor: "#f97316" },
  tip: { bg: "#faf5ff", border: "#e9d5ff", icon: Zap, iconColor: "#a855f7" },
  info: { bg: "#eff6ff", border: "#bfdbfe", icon: Activity, iconColor: "#3b82f6" },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { orders, products, customers } = useAdmin();
  const [insightsRefreshKey, setInsightsRefreshKey] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  const analysis = useMemo(() => {
    const now = new Date();
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    const cancelled = orders.filter(o => o.status === "cancelled");
    const cancelRate = orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0;

    // Period revenue
    const revenueByDay = (days: number) =>
      Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split("T")[0];
        return activeOrders
          .filter(o => String(o.date).startsWith(key))
          .reduce((s, o) => s + o.total, 0);
      });

    const dailyRevenue = revenueByDay(selectedPeriod);

    // Month comparisons
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

    const revenueThisMonth = activeOrders
      .filter(o => String(o.date) >= monthStart)
      .reduce((s, o) => s + o.total, 0);

    const revenuePrevMonth = activeOrders
      .filter(o => String(o.date) >= prevMonthStart && String(o.date) <= prevMonthEnd)
      .reduce((s, o) => s + o.total, 0);

    // Today
    const todayKey = now.toISOString().split("T")[0];
    const revenueToday = activeOrders
      .filter(o => String(o.date).startsWith(todayKey))
      .reduce((s, o) => s + o.total, 0);
    const ordersToday = activeOrders.filter(o => String(o.date).startsWith(todayKey)).length;

    // AOV
    const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    });

    // Product sales
    const productSales: Record<string, { qty: number; rev: number }> = {};
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        if (!productSales[item.productName]) productSales[item.productName] = { qty: 0, rev: 0 };
        productSales[item.productName].qty += item.quantity;
        productSales[item.productName].rev += item.price * item.quantity;
      });
    });
    const topProducts = Object.entries(productSales)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);

    // Category breakdown
    const catMap = new Map(products.map(p => [p.id, p.category]));
    const catTotals: Record<string, number> = {};
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const cat = catMap.get(item.productId) ?? "Other";
        catTotals[cat] = (catTotals[cat] ?? 0) + item.price * item.quantity;
      });
    });

    // Color palette for categories
    const palette = ["#111", "#555", "#888", "#c8a96e", "#e9d5a0", "#d4b87a"];
    const categoryData = Object.entries(catTotals).map(([label, value], i) => ({
      label, value, color: palette[i % palette.length],
      pct: Math.round((value / (Object.values(catTotals).reduce((a, b) => a + b, 0) || 1)) * 100),
    }));

    // Customers: repeat buyers
    const customerOrderCounts: Record<string, number> = {};
    orders.forEach(o => {
      customerOrderCounts[o.email] = (customerOrderCounts[o.email] ?? 0) + 1;
    });
    const repeatCount = Object.values(customerOrderCounts).filter(c => c > 1).length;
    const repeatCustomerRate = customers.length > 0 ? (repeatCount / customers.length) * 100 : 0;

    // Weekly buckets (last 8 weeks)
    const weeklyRevenue = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return activeOrders
        .filter(o => {
          const d = String(o.date);
          return d >= weekStart.toISOString().split("T")[0] && d <= weekEnd.toISOString().split("T")[0];
        })
        .reduce((s, o) => s + o.total, 0);
    });

    // Forecasting
    const { slope, predict } = linearRegression(dailyRevenue);
    const forecastNext7 = Array.from({ length: 7 }, (_, i) =>
      Math.max(0, predict(dailyRevenue.length + i))
    );

    // Low stock
    const lowStockCount = products.filter(p => {
      if (!p.inventory) return false;
      return Object.values(p.inventory).some(s => Number(s) > 0 && Number(s) <= 3);
    }).length;

    // New customers this month
    const newCustomersThisMonth = customers.filter(c => c.joined >= monthStart).length;
    const newCustomersPrevMonth = customers.filter(c => c.joined >= prevMonthStart && c.joined <= prevMonthEnd).length;

    // Avg daily revenue (active period)
    const nonZeroDays = dailyRevenue.filter(v => v > 0).length;
    const avgDailyRevenue = nonZeroDays > 0 ? totalRevenue / nonZeroDays : 0;

    // Projected monthly (rest of month * avg)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();
    const projectedMonthlyRevenue = revenueThisMonth + avgDailyRevenue * daysRemaining;

    return {
      dailyRevenue, revenueThisMonth, revenuePrevMonth, revenueToday,
      ordersToday, totalRevenue, avgOrderValue, cancelRate, statusCounts,
      topProducts, categoryData, repeatCustomerRate, weeklyRevenue,
      slope, forecastNext7, lowStockCount, newCustomersThisMonth,
      newCustomersPrevMonth, projectedMonthlyRevenue, activeOrders,
    };
  }, [orders, products, customers, selectedPeriod]);

  const insights = useMemo(() => generateInsights({
    revenueThisMonth: analysis.revenueThisMonth,
    revenuePrevMonth: analysis.revenuePrevMonth,
    avgOrderValue: analysis.avgOrderValue,
    totalOrders: orders.length,
    cancelRate: analysis.cancelRate,
    topProduct: analysis.topProducts[0]?.name ?? "",
    lowStockCount: analysis.lowStockCount,
    repeatCustomerRate: analysis.repeatCustomerRate,
    slope: analysis.slope,
    revenueToday: analysis.revenueToday,
  }), [analysis, orders.length, insightsRefreshKey]);

  const revGrowth = pct(analysis.revenueThisMonth, analysis.revenuePrevMonth);
  const custGrowth = pct(analysis.newCustomersThisMonth, analysis.newCustomersPrevMonth);
  const dayLabels = Array.from({ length: selectedPeriod }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (selectedPeriod - 1 - i));
    return d.getDate() % 5 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : "";
  });

  return (
    <div className="admin-page analytics-page">
      <div className="admin-page-header">
        <div>
          <h1>Analytics</h1>
          <p>AI-powered insights into your store's performance.</p>
        </div>
        <div className="analytics-period-tabs">
          {([7, 30, 90] as const).map(p => (
            <button
              key={p}
              className={`analytics-period-btn ${selectedPeriod === p ? "active" : ""}`}
              onClick={() => setSelectedPeriod(p)}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="analytics-kpi-grid">
        <KpiCard
          icon={DollarSign} title="Revenue This Month" color="#22c55e"
          value={fmt(analysis.revenueThisMonth)}
          sub={`Projected: ${fmt(analysis.projectedMonthlyRevenue)}`}
          trend={revGrowth}
        />
        <KpiCard
          icon={ShoppingBag} title="Avg. Order Value" color="#3b82f6"
          value={fmt(analysis.avgOrderValue)}
          sub={`${analysis.activeOrders.length} total orders`}
        />
        <KpiCard
          icon={Users} title="New Customers" color="#8b5cf6"
          value={analysis.newCustomersThisMonth.toString()}
          sub="Joined this month"
          trend={custGrowth}
        />
        <KpiCard
          icon={Activity} title="Cancellation Rate" color={analysis.cancelRate > 15 ? "#ef4444" : "#111"}
          value={`${analysis.cancelRate.toFixed(1)}%`}
          sub="Of all orders"
        />
        <KpiCard
          icon={Star} title="Repeat Customer Rate" color="#f59e0b"
          value={`${analysis.repeatCustomerRate.toFixed(0)}%`}
          sub="More than 1 order"
        />
        <KpiCard
          icon={Package} title="Low Stock Alerts" color={analysis.lowStockCount > 0 ? "#ef4444" : "#22c55e"}
          value={analysis.lowStockCount.toString()}
          sub="Products ≤ 3 units left"
        />
      </div>

      {/* ── Revenue Chart + AI Insights ── */}
      <div className="analytics-main-grid">

        {/* Revenue Trend */}
        <div className="admin-panel analytics-chart-panel">
          <div className="admin-panel-header">
            <h2><BarChart2 size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />Revenue — Last {selectedPeriod} Days</h2>
            <span className={`analytics-kpi-trend ${analysis.slope >= 0 ? "pos" : "neg"}`} style={{ fontSize: "0.8rem" }}>
              {analysis.slope >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {analysis.slope >= 0 ? "Upward" : "Downward"} trend
            </span>
          </div>
          <div className="admin-panel-content">
            <div className="analytics-chart-container">
              <RevenueBarChart data={analysis.dailyRevenue} labels={dayLabels} />
            </div>
            <div className="analytics-forecast-row">
              <Clock size={14} />
              <span>7-day AI forecast: <strong>{fmt(analysis.forecastNext7.reduce((a, b) => a + b, 0))}</strong></span>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="admin-panel analytics-insights-panel">
          <div className="admin-panel-header">
            <h2><Zap size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />AI Insights</h2>
            <button
              className="admin-btn-icon"
              title="Refresh insights"
              onClick={() => setInsightsRefreshKey(k => k + 1)}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="admin-panel-content analytics-insights-list">
            {insights.map((ins, i) => {
              const cfg = insightColors[ins.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className="analytics-insight-card" style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="analytics-insight-icon" style={{ color: cfg.iconColor }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="analytics-insight-title">{ins.title}</div>
                    <div className="analytics-insight-body">{ins.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="analytics-bottom-grid">

        {/* Top Products */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Top Products by Revenue</h2>
          </div>
          <div className="admin-panel-content p-0">
            {analysis.topProducts.length === 0 ? (
              <p style={{ padding: "24px", color: "#888", fontSize: "0.9rem" }}>No sales data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th className="text-right">Units</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.topProducts.map((p, i) => {
                    const totalRev = analysis.topProducts.reduce((a, x) => a + x.rev, 0) || 1;
                    const share = Math.round((p.rev / totalRev) * 100);
                    return (
                      <tr key={i}>
                        <td style={{ color: "#999", width: 32 }}>{i + 1}</td>
                        <td><strong>{p.name}</strong></td>
                        <td className="text-right">{p.qty}</td>
                        <td className="text-right">{fmt(p.rev)}</td>
                        <td className="text-right">
                          <div className="analytics-share-bar">
                            <div className="analytics-share-fill" style={{ width: `${share}%` }} />
                            <span>{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Order Status Funnel */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Order Status Breakdown</h2>
          </div>
          <div className="admin-panel-content">
            <StatusFunnel statusCounts={analysis.statusCounts} />
          </div>
        </div>

        {/* Sales by Category */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Sales by Category</h2>
          </div>
          <div className="admin-panel-content">
            {analysis.categoryData.length === 0 ? (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>No sales data yet.</p>
            ) : (
              <div className="analytics-category-list">
                {analysis.categoryData.map((cat, i) => (
                  <div key={i} className="analytics-category-row">
                    <div className="analytics-category-info">
                      <span className="analytics-category-dot" style={{ background: cat.color }} />
                      <span className="analytics-category-name">{cat.label}</span>
                    </div>
                    <div className="analytics-category-bar-bg">
                      <div className="analytics-category-bar" style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                    <span className="analytics-category-pct">{cat.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Revenue Trend */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>Weekly Revenue (Last 8 Weeks)</h2>
          </div>
          <div className="admin-panel-content">
            <div className="analytics-chart-container">
              <SparkLine data={analysis.weeklyRevenue} color="#c8a96e" />
            </div>
            <div className="analytics-weekly-labels">
              {analysis.weeklyRevenue.map((v, i) => (
                <div key={i} className="analytics-weekly-label">
                  <span>W{i + 1}</span>
                  <strong>{v > 0 ? fmt(v) : "—"}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

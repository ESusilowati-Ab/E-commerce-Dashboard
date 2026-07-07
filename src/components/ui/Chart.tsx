import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import type { ChartSpec } from "../../types";
import { toNumber } from "../../lib/analysis";

const CHART_COLORS = [
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
  "#84cc16",
];

const tooltipStyle = {
  backgroundColor: "#161922",
  border: "1px solid #2a2f3d",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#e2e8f0",
  boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
};

const axisStyle = { fontSize: 11, fill: "#64748b" };

interface ChartProps {
  spec: ChartSpec;
  height?: number;
}

export function ChartRenderer({ spec, height = 300 }: ChartProps) {
  if (spec.type === "bar") {
    const data =
      spec.series?.[0]?.data?.map((d) => ({
        name: String(d.x),
        value: Number(d.y),
      })) || [];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#232733"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            angle={data.length > 6 ? -25 : 0}
            textAnchor={data.length > 6 ? "end" : "middle"}
            height={data.length > 6 ? 60 : 30}
          />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1c2030" }} />
          <Bar
            dataKey="value"
            name={spec.series?.[0]?.name || spec.yKey}
            radius={[6, 6, 0, 0]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "line" || spec.type === "area") {
    const data =
      spec.series?.[0]?.data?.map((d) => ({
        name: String(d.x),
        value: Number(d.y),
      })) || [];
    const Chart = spec.type === "area" ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#232733"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          {spec.type === "area" ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#chartGrad)"
              name={spec.series?.[0]?.name}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
              name={spec.series?.[0]?.name}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "pie") {
    const data =
      spec.series?.[0]?.data?.map((d) => ({
        name: String(d.x),
        value: Number(d.y),
      })) || [];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height / 2.5, 100)}
            innerRadius={Math.min(height / 4, 50)}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                stroke="#161922"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "scatter") {
    const data = (spec.data || [])
      .map((r) => ({
        x: toNumber(r[spec.xKey || ""]) ?? 0,
        y: toNumber(r[spec.yKey || ""]) ?? 0,
      }))
      .filter((d) => d.x !== null && d.y !== null);
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
          <XAxis
            dataKey="x"
            name={spec.xLabel || spec.xKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="y"
            name={spec.yLabel || spec.yKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter data={data} fill="#10b981" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "histogram") {
    const values = (spec.data || [])
      .map((r) => toNumber(r[spec.xKey || ""]))
      .filter((v): v is number => v !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 12;
    const binSize = (max - min) / bins || 1;
    const histogram = Array.from({ length: bins }, (_, i) => ({
      name: `${(min + i * binSize).toFixed(0)}`,
      value: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
      histogram[idx].value++;
    });
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={histogram}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#232733"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1c2030" }} />
          <Bar
            dataKey="value"
            fill="#0ea5e9"
            radius={[6, 6, 0, 0]}
            name="Frequency"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (spec.type === "heatmap") {
    // correlation matrix
    const cols = spec.xKey ? [spec.xKey] : [];
    return (
      <div className="text-center text-slate-500 text-sm py-8">
        Heatmap rendering for {cols.join(", ") || "matrix"}
      </div>
    );
  }

  return null;
}

interface QualityGaugeProps {
  score: number;
  size?: number;
}

export function QualityGauge({ score, size = 160 }: QualityGaugeProps) {
  const data = [
    {
      name: "quality",
      value: score,
      fill: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
    },
  ];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            background={{ fill: "#1c2030" }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

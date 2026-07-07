import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Grid3x3,
  Download,
  Sparkles,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import { ChartRenderer } from "../components/ui/Chart";
import { toNumber, mean } from "../lib/analysis";
import { cn } from "../lib/utils";
import type { ChartSpec } from "../types";

type ChartType = "bar" | "line" | "pie" | "scatter" | "histogram" | "area";

const chartTypes: { type: ChartType; label: string; icon: typeof BarChart3 }[] =
  [
    { type: "bar", label: "Bar", icon: BarChart3 },
    { type: "line", label: "Line", icon: LineIcon },
    { type: "area", label: "Area", icon: LineIcon },
    { type: "pie", label: "Pie", icon: PieIcon },
    { type: "scatter", label: "Scatter", icon: ScatterIcon },
    { type: "histogram", label: "Histogram", icon: Grid3x3 },
  ];

export function VisualizationsPage() {
  const { dataset } = useDataset();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");
  const [agg, setAgg] = useState<"avg" | "sum" | "count" | "none">("avg");

  const numericCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "numeric" && !c.isLikelyId)
      .map((c) => c.name);
  }, [dataset]);

  const catCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "categorical" && !c.isLikelyId && c.unique < 50)
      .map((c) => c.name);
  }, [dataset]);

  const dateCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "datetime")
      .map((c) => c.name);
  }, [dataset]);

  // Auto-select defaults
  useMemo(() => {
    if (!xCol && catCols.length > 0) setXCol(catCols[0]);
    if (!yCol && numericCols.length > 0) setYCol(numericCols[0]);
  }, [catCols, numericCols]);

  const chartSpec = useMemo((): ChartSpec | null => {
    if (!dataset || !xCol) return null;

    if (chartType === "histogram") {
      return {
        type: "histogram",
        title: `Distribution of ${yCol || numericCols[0] || xCol}`,
        xKey: yCol || numericCols[0] || xCol,
        data: dataset.rows,
      };
    }

    if (chartType === "scatter") {
      return {
        type: "scatter",
        title: `${yCol} vs ${xCol}`,
        xKey: xCol,
        yKey: yCol || numericCols[0],
        data: dataset.rows,
      };
    }

    if (chartType === "pie") {
      const counts = new Map<string, number>();
      dataset.rows.forEach((r) => {
        const k = String(r[xCol] ?? "N/A");
        counts.set(k, (counts.get(k) || 0) + 1);
      });
      const data = [...counts.entries()]
        .map(([x, y]) => ({ x, y }))
        .sort((a, b) => b.y - a.y)
        .slice(0, 10);
      return {
        type: "pie",
        title: `${xCol} distribution`,
        series: [{ name: xCol, data }],
      };
    }

    // bar / line / area — aggregate y by x
    const yColumn = yCol || numericCols[0];
    if (!yColumn) return null;

    if (agg === "none") {
      // line over date or index
      const data = dataset.rows.slice(0, 100).map((r, i) => ({
        x: dateCols.includes(xCol) ? String(r[xCol] ?? i) : String(i),
        y: toNumber(r[yColumn]) ?? 0,
      }));
      return {
        type: chartType,
        title: `${yColumn} over ${xCol}`,
        series: [{ name: yColumn, data }],
      };
    }

    const groups = new Map<string, number[]>();
    dataset.rows.forEach((r) => {
      const k = String(r[xCol] ?? "N/A");
      const v = toNumber(r[yColumn]);
      if (v !== null) {
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(v);
      }
    });
    const data = [...groups.entries()]
      .map(([x, vals]) => {
        let y: number;
        if (agg === "sum") y = vals.reduce((a, b) => a + b, 0);
        else if (agg === "count") y = vals.length;
        else y = mean(vals);
        return { x, y: Math.round(y * 100) / 100 };
      })
      .sort((a, b) => Number(b.y) - Number(a.y))
      .slice(0, 15);
    return {
      type: chartType,
      title: `${agg.toUpperCase()} ${yColumn} by ${xCol}`,
      series: [{ name: yColumn, data }],
    };
  }, [dataset, chartType, xCol, yCol, agg, numericCols, dateCols]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to create visualizations."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Visualizations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Build custom charts with intelligent column selection
        </p>
      </div>

      {/* Chart type selector */}
      <div className="flex flex-wrap gap-2">
        {chartTypes.map((t) => (
          <button
            key={t.type}
            onClick={() => setChartType(t.type)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition",
              chartType === t.type
                ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                : "bg-bg-input border-border-subtle text-slate-400 hover:bg-bg-hover",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label block mb-2">
              X Axis{" "}
              {chartType === "scatter"
                ? "(Numeric)"
                : chartType === "histogram"
                  ? ""
                  : "(Category)"}
            </label>
            <select
              value={xCol}
              onChange={(e) => setXCol(e.target.value)}
              className="input"
            >
              <option value="">Select column...</option>
              {(chartType === "scatter"
                ? numericCols
                : [...catCols, ...dateCols]
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {chartType !== "pie" && chartType !== "histogram" && (
            <div>
              <label className="label block mb-2">Y Axis (Numeric)</label>
              <select
                value={yCol}
                onChange={(e) => setYCol(e.target.value)}
                className="input"
              >
                <option value="">Select column...</option>
                {numericCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(chartType === "bar" ||
            chartType === "line" ||
            chartType === "area") && (
            <div>
              <label className="label block mb-2">Aggregation</label>
              <select
                value={agg}
                onChange={(e) => setAgg(e.target.value as typeof agg)}
                className="input"
              >
                <option value="avg">Average</option>
                <option value="sum">Sum</option>
                <option value="count">Count</option>
                <option value="none">None (raw)</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Chart */}
      {chartSpec ? (
        <motion.div
          key={chartSpec.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                {chartSpec.title}
              </h3>
              <Badge variant="primary">
                <Sparkles className="w-3 h-3" /> Custom
              </Badge>
            </div>
            <ChartRenderer spec={chartSpec} height={400} />
          </Card>
        </motion.div>
      ) : (
        <Card className="p-12 text-center">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Select columns to generate a chart
          </p>
        </Card>
      )}

      {/* Auto-generated dashboard preview */}
      <div>
        <SectionHeader
          title="Auto-Generated Charts"
          subtitle="Intelligent chart recommendations based on your data"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {numericCols.slice(0, 2).map((num) =>
            catCols.slice(0, 2).map((cat) => {
              const groups = new Map<string, number[]>();
              dataset.rows.forEach((r) => {
                const k = String(r[cat] ?? "N/A");
                const v = toNumber(r[num]);
                if (v !== null) {
                  if (!groups.has(k)) groups.set(k, []);
                  groups.get(k)!.push(v);
                }
              });
              const data = [...groups.entries()]
                .map(([x, vals]) => ({
                  x,
                  y: Math.round(mean(vals) * 100) / 100,
                }))
                .sort((a, b) => b.y - a.y)
                .slice(0, 8);
              return (
                <Card key={`${num}-${cat}`} className="p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    {num} by {cat}
                  </h3>
                  <ChartRenderer
                    spec={{
                      type: "bar",
                      title: `${num} by ${cat}`,
                      series: [{ name: num, data }],
                    }}
                    height={240}
                  />
                </Card>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

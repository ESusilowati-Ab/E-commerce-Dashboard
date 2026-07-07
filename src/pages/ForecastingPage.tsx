import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  Target,
  Sparkles,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import {
  Card,
  KpiCard,
  SectionHeader,
  Badge,
  EmptyState,
} from "../components/ui/Card";
import { ChartRenderer } from "../components/ui/Chart";
import { forecastSeries, toNumber } from "../lib/analysis";
import type { ChartSpec } from "../types";

export function ForecastingPage() {
  const { dataset } = useDataset();
  const [dateCol, setDateCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [periods, setPeriods] = useState(12);

  const dateCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "datetime")
      .map((c) => c.name);
  }, [dataset]);

  const numericCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "numeric" && !c.isLikelyId)
      .map((c) => c.name);
  }, [dataset]);

  // auto-select
  useMemo(() => {
    if (!dateCol && dateCols.length > 0) setDateCol(dateCols[0]);
    if (!valueCol && numericCols.length > 0) setValueCol(numericCols[0]);
  }, [dateCols, numericCols]);

  const forecast = useMemo(() => {
    if (!dataset || !dateCol || !valueCol) return null;
    const history = dataset.rows
      .map((r) => ({
        date: String(r[dateCol]),
        value: toNumber(r[valueCol]) ?? 0,
      }))
      .filter((h) => h.date && h.date !== "null")
      .sort((a, b) => a.date.localeCompare(b.date));

    // aggregate by month if many rows
    const monthly = new Map<string, number[]>();
    history.forEach((h) => {
      const month = h.date.substring(0, 7);
      if (!monthly.has(month)) monthly.set(month, []);
      monthly.get(month)!.push(h.value);
    });
    const monthlyHistory = [...monthly.entries()].map(([date, vals]) => ({
      date: `${date}-01`,
      value: vals.reduce((a, b) => a + b, 0),
    }));

    if (monthlyHistory.length < 3) return null;

    const result = forecastSeries(monthlyHistory, periods);
    return { history: monthlyHistory, ...result };
  }, [dataset, dateCol, valueCol, periods]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<TrendingUp className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset with a date column to generate forecasts."
      />
    );
  }

  if (dateCols.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-7 h-7" />}
        title="No date column found"
        description="Forecasting requires a datetime column. Please upload a dataset with date/time fields."
      />
    );
  }

  const chartSpec: ChartSpec | null = forecast
    ? {
        type: "area",
        title: `${valueCol} — Historical + Forecast`,
        series: [
          {
            name: valueCol,
            data: [
              ...forecast.history.map((h) => ({ x: h.date, y: h.value })),
              ...forecast.forecast.map((f) => ({ x: f.date, y: f.value })),
            ],
          },
        ],
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Forecasting
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Time-series prediction with trend and seasonality detection
        </p>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label block mb-2">Date Column</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="input"
            >
              {dateCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-2">Value Column</label>
            <select
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              className="input"
            >
              {numericCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-2">Forecast Periods</label>
            <select
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="input"
            >
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
        </div>
      </Card>

      {forecast ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Trend"
              value={
                forecast.trend > 0
                  ? "Upward"
                  : forecast.trend < 0
                    ? "Downward"
                    : "Flat"
              }
              icon={
                forecast.trend > 0 ? (
                  <ArrowUp className="w-5 h-5" />
                ) : forecast.trend < 0 ? (
                  <ArrowDown className="w-5 h-5" />
                ) : (
                  <Minus className="w-5 h-5" />
                )
              }
              accent={
                forecast.trend > 0
                  ? "success"
                  : forecast.trend < 0
                    ? "error"
                    : "primary"
              }
              sublabel={`${forecast.trend > 0 ? "+" : ""}${forecast.trend.toFixed(2)} per period`}
            />
            <KpiCard
              label="Model Fit (R²)"
              value={forecast.r2.toFixed(3)}
              icon={<Target className="w-5 h-5" />}
              accent="primary"
              sublabel={
                forecast.r2 > 0.7
                  ? "Strong fit"
                  : forecast.r2 > 0.4
                    ? "Moderate fit"
                    : "Weak fit"
              }
            />
            <KpiCard
              label="Seasonality"
              value={forecast.seasonality ? "Detected" : "None"}
              icon={<Activity className="w-5 h-5" />}
              accent={forecast.seasonality ? "warning" : "primary"}
            />
            <KpiCard
              label="Forecast Periods"
              value={periods}
              icon={<Calendar className="w-5 h-5" />}
              accent="secondary"
              sublabel="months ahead"
            />
          </div>

          {/* Chart */}
          {chartSpec && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  {chartSpec.title}
                </h3>
                <Badge variant="primary">
                  <Sparkles className="w-3 h-3" /> Linear trend + CI
                </Badge>
              </div>
              <ChartRenderer spec={chartSpec} height={400} />
            </Card>
          )}

          {/* Forecast table */}
          <Card className="p-5">
            <SectionHeader
              title="Forecast Details"
              subtitle={`${periods}-month prediction with 95% confidence interval`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <div className="overflow-x-auto rounded-xl border border-border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-input/50 border-b border-border-subtle">
                    <th className="text-left px-3 py-2.5 font-medium text-slate-400">
                      Date
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-400">
                      Forecast
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-400">
                      Lower Bound
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-400">
                      Upper Bound
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-400">
                      Range
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast.map((f) => (
                    <tr
                      key={f.date}
                      className="border-b border-border-subtle last:border-0 hover:bg-bg-hover/30"
                    >
                      <td className="px-3 py-2 text-slate-300">{f.date}</td>
                      <td className="px-3 py-2 text-right text-white font-medium">
                        {f.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {f.lower.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {f.upper.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {(f.upper - f.lower).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Methodology */}
          <Card className="p-5 bg-gradient-to-br from-bg-card to-bg-panel">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Forecasting Methodology
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This forecast uses ordinary least squares (OLS) linear
                  regression on the time index to capture the trend component,
                  with autocorrelation analysis at lag{" "}
                  {forecast.history.length > 24 ? 12 : 4} to detect seasonality.
                  The 95% confidence interval is derived from the residual
                  standard deviation scaled by the t-distribution. This mirrors
                  the approach used by Prophet's additive model (trend +
                  seasonality) in a lightweight browser implementation.
                </p>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Not enough time-series data points. Need at least 3 periods after
            monthly aggregation.
          </p>
        </Card>
      )}
    </div>
  );
}

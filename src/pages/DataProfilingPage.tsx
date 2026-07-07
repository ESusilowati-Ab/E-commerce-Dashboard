import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  AlertTriangle,
  Key,
  Fingerprint,
  TrendingUp,
  Database,
  Search,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import {
  Card,
  KpiCard,
  SectionHeader,
  Badge,
  EmptyState,
} from "../components/ui/Card";
import { QualityGauge } from "../components/ui/Chart";
import { cn } from "../lib/utils";
import type { ColumnType } from "../types";

const typeIcons: Record<ColumnType, typeof Hash> = {
  numeric: Hash,
  categorical: Type,
  datetime: Calendar,
  boolean: ToggleLeft,
  unknown: Type,
};

const typeColors: Record<ColumnType, string> = {
  numeric: "text-primary-400 bg-primary-500/10",
  categorical: "text-secondary-400 bg-secondary-500/10",
  datetime: "text-accent-500 bg-accent-500/10",
  boolean: "text-blue-400 bg-blue-500/10",
  unknown: "text-slate-400 bg-slate-500/10",
};

export function DataProfilingPage() {
  const { dataset } = useDataset();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ColumnType | "all">("all");

  const filteredColumns = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [dataset, search, filterType]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to see its profile."
      />
    );
  }

  const p = dataset.profile!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Data Profiling
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Automatic statistical analysis of every column
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Quality Score"
          value={`${p.qualityScore}/100`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent={p.qualityScore >= 80 ? "success" : "warning"}
        />
        <KpiCard
          label="Missing Cells"
          value={p.missingCells.toLocaleString()}
          sublabel={`${p.missingPct.toFixed(1)}%`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="warning"
        />
        <KpiCard
          label="Duplicate Rows"
          value={p.duplicateRows.toLocaleString()}
          sublabel={`${p.duplicatePct.toFixed(1)}%`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="error"
        />
        <KpiCard
          label="Memory Usage"
          value={p.memoryUsage}
          icon={<Database className="w-5 h-5" />}
          accent="info"
        />
      </div>

      {/* Quality gauge + type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <p className="label mb-3">Overall Quality</p>
          <QualityGauge score={p.qualityScore} size={140} />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <SectionHeader
            title="Column Type Distribution"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                type: "numeric" as ColumnType,
                count: p.numericColumns,
                label: "Numeric",
              },
              {
                type: "categorical" as ColumnType,
                count: p.categoricalColumns,
                label: "Categorical",
              },
              {
                type: "datetime" as ColumnType,
                count: p.datetimeColumns,
                label: "Datetime",
              },
              {
                type: "boolean" as ColumnType,
                count: p.booleanColumns,
                label: "Boolean",
              },
            ].map((t) => {
              const Icon = typeIcons[t.type];
              return (
                <button
                  key={t.type}
                  onClick={() =>
                    setFilterType(filterType === t.type ? "all" : t.type)
                  }
                  className={cn(
                    "p-4 rounded-xl border text-left transition",
                    filterType === t.type
                      ? "border-primary-500/40 bg-primary-500/5"
                      : "border-border-subtle bg-bg-input/30 hover:bg-bg-hover",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                      typeColors[t.type],
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">{t.count}</p>
                  <p className="text-xs text-slate-500">{t.label}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Keys */}
      {(p.possiblePrimaryKeys.length > 0 ||
        p.possibleForeignKeys.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {p.possiblePrimaryKeys.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-semibold text-white">
                  Primary Keys Detected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.possiblePrimaryKeys.map((k) => (
                  <Badge key={k} variant="primary">
                    {k}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
          {p.possibleForeignKeys.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="w-4 h-4 text-secondary-400" />
                <span className="text-sm font-semibold text-white">
                  Possible Foreign Keys
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.possibleForeignKeys.map((k) => (
                  <Badge key={k} variant="info">
                    {k}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            className="input pl-10 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "chip border",
            filterType === "all"
              ? "bg-primary-500/10 text-primary-400 border-primary-500/30"
              : "bg-bg-input text-slate-400 border-border-subtle",
          )}
        >
          All ({p.columnProfiles.length})
        </button>
      </div>

      {/* Column profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredColumns.map((col, i) => {
          const Icon = typeIcons[col.type];
          return (
            <motion.div
              key={col.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        typeColors[col.type],
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {col.name}
                      </p>
                      <p className="text-xs text-slate-500">{col.dtype}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {col.isPrimaryKey && (
                      <Badge variant="primary">
                        <Key className="w-3 h-3" /> PK
                      </Badge>
                    )}
                    {col.isLikelyId && <Badge variant="info">ID</Badge>}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Count" value={col.count.toLocaleString()} />
                  <Stat label="Unique" value={col.unique.toLocaleString()} />
                  <Stat
                    label="Missing"
                    value={`${col.missing} (${col.missingPct.toFixed(1)}%)`}
                    warn={col.missing > 0}
                  />
                  <Stat
                    label="Missing %"
                    value={`${col.missingPct.toFixed(1)}%`}
                    warn={col.missingPct > 5}
                  />
                </div>

                {/* Numeric stats */}
                {col.type === "numeric" && col.mean !== undefined && (
                  <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-3 gap-2 text-xs">
                    <Stat
                      label="Min"
                      value={col.min!.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    />
                    <Stat
                      label="Mean"
                      value={col.mean!.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    />
                    <Stat
                      label="Max"
                      value={col.max!.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    />
                    <Stat label="Std" value={col.std!.toFixed(2)} />
                    <Stat label="Median" value={col.median!.toFixed(2)} />
                    <Stat label="IQR" value={col.iqr!.toFixed(2)} />
                    {col.outliers! > 0 && (
                      <div className="col-span-3 mt-1">
                        <Badge variant="warning">
                          <AlertTriangle className="w-3 h-3" /> {col.outliers}{" "}
                          outliers detected
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Categorical top values */}
                {col.type === "categorical" &&
                  col.topValues &&
                  col.topValues.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5">
                      <p className="label mb-1.5">Top Values</p>
                      {col.topValues.slice(0, 4).map((tv) => {
                        const pct = (tv.count / col.count) * 100;
                        return (
                          <div
                            key={String(tv.value)}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs text-slate-300 truncate flex-1">
                              {String(tv.value)}
                            </span>
                            <div className="w-20 h-1.5 bg-bg-input rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">
                              {tv.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Date range */}
                {col.type === "datetime" && col.minDate && (
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                    <div>
                      <p className="text-slate-500">From</p>
                      <p className="text-slate-200 font-medium">
                        {col.minDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">To</p>
                      <p className="text-slate-200 font-medium">
                        {col.maxDate}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={cn("font-medium", warn ? "text-warning" : "text-slate-200")}
      >
        {value}
      </span>
    </div>
  );
}

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sigma,
  TrendingUp,
  GitCompare,
  BarChart3,
  FlaskConical,
  Target,
  Activity,
  Hash,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import { ChartRenderer } from "../components/ui/Chart";
import {
  toNumber,
  pearson,
  linearRegression,
  tTestTwoSample,
  anova,
  shapiroWilkLikeTest,
  mean,
  std,
} from "../lib/analysis";
import { cn } from "../lib/utils";

type Tab =
  | "correlation"
  | "regression"
  | "distribution"
  | "anova"
  | "hypothesis";

export function StatisticsPage() {
  const { dataset } = useDataset();
  const [tab, setTab] = useState<Tab>("correlation");
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [groupCol, setGroupCol] = useState("");
  const [valCol, setValCol] = useState("");

  const numericCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "numeric" && !c.isLikelyId)
      .map((c) => c.name);
  }, [dataset]);

  const catCols = useMemo(() => {
    if (!dataset?.profile) return [];
    return dataset.profile.columnProfiles
      .filter((c) => c.type === "categorical" && !c.isLikelyId && c.unique < 30)
      .map((c) => c.name);
  }, [dataset]);

  useMemo(() => {
    if (!colA && numericCols.length > 0) setColA(numericCols[0]);
    if (!colB && numericCols.length > 1) setColB(numericCols[1]);
    if (!valCol && numericCols.length > 0) setValCol(numericCols[0]);
    if (!groupCol && catCols.length > 0) setGroupCol(catCols[0]);
  }, [numericCols, catCols]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<Sigma className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to run statistical analysis."
      />
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Sigma }[] = [
    { id: "correlation", label: "Correlation", icon: GitCompare },
    { id: "regression", label: "Regression", icon: TrendingUp },
    { id: "distribution", label: "Distribution", icon: BarChart3 },
    { id: "anova", label: "ANOVA", icon: FlaskConical },
    { id: "hypothesis", label: "Hypothesis Test", icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Statistical Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Rigorous statistical methods for evidence-based decisions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition",
              tab === t.id
                ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                : "bg-bg-input border-border-subtle text-slate-400 hover:bg-bg-hover",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {tab === "correlation" && (
          <CorrelationAnalysis dataset={dataset} numericCols={numericCols} />
        )}
        {tab === "regression" && (
          <RegressionAnalysis
            dataset={dataset}
            numericCols={numericCols}
            colA={colA}
            colB={colB}
            setColA={setColA}
            setColB={setColB}
          />
        )}
        {tab === "distribution" && (
          <DistributionAnalysis
            dataset={dataset}
            numericCols={numericCols}
            colA={colA}
            setColA={setColA}
          />
        )}
        {tab === "anova" && (
          <AnovaAnalysis
            dataset={dataset}
            catCols={catCols}
            numericCols={numericCols}
            groupCol={groupCol}
            valCol={valCol}
            setGroupCol={setGroupCol}
            setValCol={setValCol}
          />
        )}
        {tab === "hypothesis" && (
          <HypothesisAnalysis
            dataset={dataset}
            numericCols={numericCols}
            catCols={catCols}
            colA={colA}
            colB={colB}
            setColA={setColA}
            setColB={setColB}
          />
        )}
      </motion.div>
    </div>
  );
}

function CorrelationAnalysis({
  dataset,
  numericCols,
}: {
  dataset: import("../types").Dataset;
  numericCols: string[];
}) {
  const corr = dataset.profile!.correlations;
  const cols = corr.columns;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Correlation Matrix"
        subtitle="Pearson correlation between numeric variables"
        icon={<GitCompare className="w-4 h-4" />}
      />
      {cols.length < 2 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          Need at least 2 numeric columns
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="p-2"></th>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="p-2 text-xs font-medium text-slate-400 whitespace-nowrap text-left max-w-[100px] truncate"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map((row, i) => (
                <tr key={row}>
                  <td className="p-2 text-xs font-medium text-slate-400 whitespace-nowrap max-w-[100px] truncate">
                    {row}
                  </td>
                  {cols.map((col, j) => {
                    const v = corr.matrix[i][j];
                    const intensity = Math.abs(v);
                    const color =
                      v > 0
                        ? `rgba(16, 185, 129, ${intensity})`
                        : `rgba(239, 68, 68, ${intensity})`;
                    return (
                      <td key={col} className="p-1.5">
                        <div
                          className="w-14 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-medium"
                          style={{
                            backgroundColor: color,
                            color: intensity > 0.5 ? "#fff" : "#94a3b8",
                          }}
                          title={`${row} vs ${col}: ${v.toFixed(3)}`}
                        >
                          {v.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-500" /> Positive
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-error" /> Negative
        </span>
        <span>Stronger color = stronger correlation</span>
      </div>
    </Card>
  );
}

function RegressionAnalysis({
  dataset,
  numericCols,
  colA,
  colB,
  setColA,
  setColB,
}: {
  dataset: import("../types").Dataset;
  numericCols: string[];
  colA: string;
  colB: string;
  setColA: (v: string) => void;
  setColB: (v: string) => void;
}) {
  const result = useMemo(() => {
    if (!colA || !colB) return null;
    const pairs: [number, number][] = [];
    dataset.rows.forEach((r) => {
      const x = toNumber(r[colA]);
      const y = toNumber(r[colB]);
      if (x !== null && y !== null) pairs.push([x, y]);
    });
    if (pairs.length < 3) return null;
    const { slope, intercept, r2 } = linearRegression(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
    );
    const r = Math.sqrt(r2);
    return { slope, intercept, r2, r, n: pairs.length };
  }, [dataset, colA, colB]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-2">X (Independent)</label>
            <select
              value={colA}
              onChange={(e) => setColA(e.target.value)}
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
            <label className="label block mb-2">Y (Dependent)</label>
            <select
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              className="input"
            >
              {numericCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Slope" value={result.slope.toFixed(4)} />
            <StatCard label="Intercept" value={result.intercept.toFixed(4)} />
            <StatCard
              label="R²"
              value={result.r2.toFixed(4)}
              accent={result.r2 > 0.7 ? "success" : "primary"}
            />
            <StatCard label="Correlation (r)" value={result.r.toFixed(4)} />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Regression: {colB} = {result.slope.toFixed(3)} × {colA} +{" "}
              {result.intercept.toFixed(3)}
            </h3>
            <ChartRenderer
              spec={{
                type: "scatter",
                title: `${colA} vs ${colB}`,
                xKey: colA,
                yKey: colB,
                data: dataset.rows,
              }}
              height={350}
            />
          </Card>
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-sm text-slate-300">
              {result.r2 > 0.7
                ? `${colA} explains ${(result.r2 * 100).toFixed(1)}% of the variance in ${colB} — a strong linear relationship.`
                : result.r2 > 0.4
                  ? `${colA} explains ${(result.r2 * 100).toFixed(1)}% of the variance in ${colB} — a moderate relationship.`
                  : `Only ${(result.r2 * 100).toFixed(1)}% of variance in ${colB} is explained by ${colA} — the relationship is weak.`}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function DistributionAnalysis({
  dataset,
  numericCols,
  colA,
  setColA,
}: {
  dataset: import("../types").Dataset;
  numericCols: string[];
  colA: string;
  setColA: (v: string) => void;
}) {
  const stats = useMemo(() => {
    if (!colA) return null;
    const vals = dataset.rows
      .map((r) => toNumber(r[colA]))
      .filter((v): v is number => v !== null);
    if (vals.length < 3) return null;
    const m = mean(vals);
    const s = std(vals);
    const sw = shapiroWilkLikeTest(vals);
    return { mean: m, std: s, n: vals.length, normality: sw };
  }, [dataset, colA]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <label className="label block mb-2">Column</label>
        <select
          value={colA}
          onChange={(e) => setColA(e.target.value)}
          className="input max-w-xs"
        >
          {numericCols.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Card>
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Mean" value={stats.mean.toFixed(2)} />
            <StatCard label="Std Deviation" value={stats.std.toFixed(2)} />
            <StatCard label="Sample Size" value={stats.n.toLocaleString()} />
            <StatCard
              label="Normality"
              value={stats.normality.normal ? "Normal" : "Non-normal"}
              accent={stats.normality.normal ? "success" : "warning"}
            />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Distribution of {colA}
            </h3>
            <ChartRenderer
              spec={{
                type: "histogram",
                title: `Histogram of ${colA}`,
                xKey: colA,
                data: dataset.rows,
              }}
              height={300}
            />
          </Card>
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-sm text-slate-300">
              Normality test (skewness & kurtosis): statistic ={" "}
              {stats.normality.statistic.toFixed(3)}, p ={" "}
              {stats.normality.p.toFixed(3)}.
              {stats.normality.normal
                ? " Data appears normally distributed (parametric tests are appropriate)."
                : " Data is not normally distributed — consider non-parametric tests."}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function AnovaAnalysis({
  dataset,
  catCols,
  numericCols,
  groupCol,
  valCol,
  setGroupCol,
  setValCol,
}: {
  dataset: import("../types").Dataset;
  catCols: string[];
  numericCols: string[];
  groupCol: string;
  valCol: string;
  setGroupCol: (v: string) => void;
  setValCol: (v: string) => void;
}) {
  const result = useMemo(() => {
    if (!groupCol || !valCol) return null;
    const groups = new Map<string, number[]>();
    dataset.rows.forEach((r) => {
      const g = String(r[groupCol] ?? "N/A");
      const v = toNumber(r[valCol]);
      if (v !== null) {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(v);
      }
    });
    const groupArrays = [...groups.values()].filter((g) => g.length >= 2);
    if (groupArrays.length < 2) return null;
    const anovaResult = anova(groupArrays);
    return {
      ...anovaResult,
      groupCount: groupArrays.length,
      groups: [...groups.entries()].map(([k, v]) => ({
        name: k,
        mean: mean(v),
        count: v.length,
      })),
    };
  }, [dataset, groupCol, valCol]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-2">Grouping Variable</label>
            <select
              value={groupCol}
              onChange={(e) => setGroupCol(e.target.value)}
              className="input"
            >
              {catCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-2">Value Variable</label>
            <select
              value={valCol}
              onChange={(e) => setValCol(e.target.value)}
              className="input"
            >
              {numericCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="F-statistic" value={result.f.toFixed(3)} />
            <StatCard label="p-value" value={result.p.toFixed(4)} />
            <StatCard label="Groups" value={String(result.groupCount)} />
            <StatCard
              label="Significant?"
              value={result.significant ? "Yes (p<0.05)" : "No"}
              accent={result.significant ? "success" : "primary"}
            />
          </div>
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-sm text-slate-300">
              {result.significant
                ? `There is a statistically significant difference in ${valCol} across ${groupCol} groups (F=${result.f.toFixed(2)}, p=${result.p.toFixed(4)}). The group means are not all equal.`
                : `No statistically significant difference in ${valCol} across ${groupCol} groups (p=${result.p.toFixed(4)}). The group means appear equal.`}
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Group Means
            </h3>
            <div className="space-y-2">
              {result.groups
                .sort((a, b) => b.mean - a.mean)
                .map((g) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-32 truncate">
                      {g.name}
                    </span>
                    <div className="flex-1 h-6 bg-bg-input rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-end pr-2"
                        style={{
                          width: `${(g.mean / Math.max(...result.groups.map((x) => x.mean))) * 100}%`,
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {g.mean.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">
                      n={g.count}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function HypothesisAnalysis({
  dataset,
  numericCols,
  catCols,
  colA,
  colB,
  setColA,
  setColB,
}: {
  dataset: import("../types").Dataset;
  numericCols: string[];
  catCols: string[];
  colA: string;
  colB: string;
  setColA: (v: string) => void;
  setColB: (v: string) => void;
}) {
  const result = useMemo(() => {
    if (!colA || !colB) return null;
    const x = dataset.rows
      .map((r) => toNumber(r[colA]))
      .filter((v): v is number => v !== null);
    const y = dataset.rows
      .map((r) => toNumber(r[colB]))
      .filter((v): v is number => v !== null);
    if (x.length < 3 || y.length < 3) return null;
    return {
      ...tTestTwoSample(x, y),
      xMean: mean(x),
      yMean: mean(y),
      xN: x.length,
      yN: y.length,
    };
  }, [dataset, colA, colB]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block mb-2">Sample A</label>
            <select
              value={colA}
              onChange={(e) => setColA(e.target.value)}
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
            <label className="label block mb-2">Sample B</label>
            <select
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              className="input"
            >
              {numericCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="t-statistic" value={result.t.toFixed(3)} />
            <StatCard label="p-value" value={result.p.toFixed(4)} />
            <StatCard label="Mean A" value={result.xMean.toFixed(2)} />
            <StatCard label="Mean B" value={result.yMean.toFixed(2)} />
          </div>
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-sm text-slate-300">
              <strong className="text-white">
                Two-sample t-test (Welch's):
              </strong>{" "}
              t({result.xN + result.yN - 2}) = {result.t.toFixed(3)}, p ={" "}
              {result.p.toFixed(4)}.
              {result.significant
                ? ` There is a significant difference between ${colA} (M=${result.xMean.toFixed(2)}) and ${colB} (M=${result.yMean.toFixed(2)}).`
                : ` No significant difference between ${colA} and ${colB}.`}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "primary",
}: {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning";
}) {
  const colors = {
    primary: "text-white",
    success: "text-success",
    warning: "text-warning",
  };
  return (
    <Card className="p-4">
      <p className="label mb-1.5">{label}</p>
      <p className={cn("text-xl font-bold", colors[accent])}>{value}</p>
    </Card>
  );
}

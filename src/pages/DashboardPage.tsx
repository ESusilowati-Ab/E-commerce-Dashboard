import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Database,
  Rows3,
  Columns3,
  AlertTriangle,
  Copy,
  Gauge,
  Sparkles,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  BarChart3,
  Brain,
  Target,
  AlertCircle,
  Rocket,
  Upload,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import {
  Card,
  KpiCard,
  SectionHeader,
  Badge,
  EmptyState,
} from "../components/ui/Card";
import { ChartRenderer, QualityGauge } from "../components/ui/Chart";
import { generateInsights } from "../lib/analysis";
import { generateDatasetSummary } from "../lib/ai";
import { generateSampleDataset } from "../lib/sampleData";
import { toNumber, mean } from "../lib/analysis";

export function DashboardPage() {
  const { dataset, loadDataset, aiStatus } = useDataset();
  const navigate = useNavigate();

  // Auto-load sample dataset on first visit
  useEffect(() => {
    if (!dataset) {
      const sample = generateSampleDataset(500);
      loadDataset(
        "HR Analytics",
        "hr_analytics.csv",
        "csv",
        sample.rows,
        sample.columns,
      );
    }
  }, [dataset, loadDataset]);

  const insights = useMemo(
    () =>
      dataset?.profile ? generateInsights(dataset.rows, dataset.profile) : [],
    [dataset],
  );

  const summary = useMemo(
    () => (dataset ? generateDatasetSummary(dataset) : ""),
    [dataset],
  );

  // Auto-generated charts
  const autoCharts = useMemo(() => {
    if (!dataset?.profile) return [];
    const p = dataset.profile;
    const numCols = p.columnProfiles.filter(
      (c) => c.type === "numeric" && !c.isLikelyId,
    );
    const catCols = p.columnProfiles.filter(
      (c) => c.type === "categorical" && !c.isLikelyId && c.unique < 30,
    );
    const charts: { spec: import("../types").ChartSpec; key: string }[] = [];

    // Bar chart: avg numeric by category
    if (catCols.length > 0 && numCols.length > 0) {
      const cat = catCols[0];
      const num = numCols[0];
      const groups = new Map<string, number[]>();
      dataset.rows.forEach((r) => {
        const c = String(r[cat.name] ?? "N/A");
        const v = toNumber(r[num.name]);
        if (v !== null) {
          if (!groups.has(c)) groups.set(c, []);
          groups.get(c)!.push(v);
        }
      });
      const data = [...groups.entries()]
        .map(([x, vals]) => ({ x, y: Math.round(mean(vals) * 100) / 100 }))
        .sort((a, b) => Number(b.y) - Number(a.y))
        .slice(0, 10);
      charts.push({
        key: "bar1",
        spec: {
          type: "bar",
          title: `${num.name} by ${cat.name}`,
          series: [{ name: num.name, data }],
        },
      });
    }

    // Pie chart: category distribution
    if (catCols.length > 0) {
      const cat = catCols[0];
      const counts = new Map<string, number>();
      dataset.rows.forEach((r) => {
        const c = String(r[cat.name] ?? "N/A");
        counts.set(c, (counts.get(c) || 0) + 1);
      });
      const data = [...counts.entries()]
        .map(([x, y]) => ({ x, y }))
        .sort((a, b) => b.y - a.y)
        .slice(0, 8);
      charts.push({
        key: "pie1",
        spec: {
          type: "pie",
          title: `${cat.name} distribution`,
          series: [{ name: cat.name, data }],
        },
      });
    }

    // Histogram: first numeric
    if (numCols.length > 0) {
      charts.push({
        key: "hist1",
        spec: {
          type: "histogram",
          title: `Distribution of ${numCols[0].name}`,
          xKey: numCols[0].name,
          data: dataset.rows,
        },
      });
    }

    // Scatter: two numerics
    if (numCols.length >= 2) {
      charts.push({
        key: "scatter1",
        spec: {
          type: "scatter",
          title: `${numCols[0].name} vs ${numCols[1].name}`,
          xKey: numCols[0].name,
          yKey: numCols[1].name,
          data: dataset.rows,
        },
      });
    }

    return charts;
  }, [dataset]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<Database className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a CSV, Excel, or JSON file to begin your analysis. A sample dataset will load automatically."
        action={
          <button onClick={() => navigate("/sources")} className="btn-primary">
            <Upload className="w-4 h-4" /> Go to Data Sources
          </button>
        }
      />
    );
  }

  const p = dataset.profile!;
  const suggestionCards = [
    {
      icon: BarChart3,
      label: "Explore Correlations",
      desc: "Find relationships between metrics",
      to: "/statistics",
    },
    {
      icon: Target,
      label: "Compare Segments",
      desc: "Analyze metrics across categories",
      to: "/visualizations",
    },
    {
      icon: AlertCircle,
      label: "Detect Outliers",
      desc: "Identify anomalies and data issues",
      to: "/cleaning",
    },
    {
      icon: TrendingUp,
      label: "Forecast Trends",
      desc: "Predict future values with AI",
      to: "/forecasting",
    },
    {
      icon: Brain,
      label: "Ask AI Assistant",
      desc: "Natural language data exploration",
      to: "/chat",
    },
    {
      icon: Rocket,
      label: "Executive Report",
      desc: "Generate a stakeholder-ready report",
      to: "/reports",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-generated overview of {dataset.name}
          </p>
        </div>
        <Badge variant="primary">
          <Sparkles className="w-3 h-3" /> Auto-generated
        </Badge>
      </motion.div>

      {/* AI Summary */}
      <Card className="p-5 bg-gradient-to-br from-bg-card to-bg-panel border-primary-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white">
                AI Dataset Summary
              </h3>
              <Badge variant="primary">GPT-style analysis</Badge>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Rows"
          value={p.rows.toLocaleString()}
          icon={<Rows3 className="w-5 h-5" />}
          accent="primary"
          delay={0}
        />
        <KpiCard
          label="Total Columns"
          value={p.columns}
          icon={<Columns3 className="w-5 h-5" />}
          accent="secondary"
          delay={0.05}
        />
        <KpiCard
          label="Missing Values"
          value={p.missingCells.toLocaleString()}
          sublabel={`${p.missingPct.toFixed(1)}% of cells`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="warning"
          delay={0.1}
        />
        <KpiCard
          label="Duplicate Rows"
          value={p.duplicateRows.toLocaleString()}
          sublabel={`${p.duplicatePct.toFixed(1)}% of rows`}
          icon={<Copy className="w-5 h-5" />}
          accent="error"
          delay={0.15}
        />
      </div>

      {/* Quality + Column types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="p-5 flex flex-col items-center justify-center"
          delay={0.1}
        >
          <p className="label mb-3">Data Quality Score</p>
          <QualityGauge score={p.qualityScore} />
          <p className="text-xs text-slate-500 mt-3 text-center">
            {p.qualityScore >= 80
              ? "Excellent — ready for analysis"
              : p.qualityScore >= 60
                ? "Good — minor cleaning needed"
                : "Needs attention"}
          </p>
        </Card>
        <Card className="p-5" delay={0.15}>
          <SectionHeader
            title="Column Types"
            icon={<Database className="w-4 h-4" />}
          />
          <div className="space-y-3">
            {[
              {
                label: "Numeric",
                count: p.numericColumns,
                color: "bg-primary-500",
              },
              {
                label: "Categorical",
                count: p.categoricalColumns,
                color: "bg-secondary-500",
              },
              {
                label: "Datetime",
                count: p.datetimeColumns,
                color: "bg-accent-500",
              },
              {
                label: "Boolean",
                count: p.booleanColumns,
                color: "bg-blue-500",
              },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${t.color}`} />
                <span className="text-sm text-slate-300 flex-1">{t.label}</span>
                <span className="text-sm font-semibold text-white">
                  {t.count}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-border-subtle">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Memory usage</span>
                <span className="font-medium text-slate-300">
                  {p.memoryUsage}
                </span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5" delay={0.2}>
          <SectionHeader
            title="Dataset Info"
            icon={<Gauge className="w-4 h-4" />}
          />
          <div className="space-y-2.5 text-sm">
            <InfoRow label="File" value={dataset.fileName} />
            <InfoRow label="Type" value={dataset.fileType.toUpperCase()} />
            <InfoRow
              label="Total cells"
              value={p.totalCells.toLocaleString()}
            />
            <InfoRow
              label="Primary keys"
              value={
                p.possiblePrimaryKeys.length
                  ? p.possiblePrimaryKeys.join(", ")
                  : "None detected"
              }
            />
            <InfoRow
              label="Possible FKs"
              value={
                p.possibleForeignKeys.length
                  ? p.possibleForeignKeys.join(", ")
                  : "None detected"
              }
            />
          </div>
        </Card>
      </div>

      {/* Auto charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {autoCharts.map((c, i) => (
          <Card key={c.key} className="p-5" delay={0.1 * i}>
            <h3 className="text-sm font-semibold text-white mb-4">
              {c.spec.title}
            </h3>
            <ChartRenderer spec={c.spec} height={260} />
          </Card>
        ))}
      </div>

      {/* AI Suggestions */}
      <div>
        <SectionHeader
          title="AI Suggestions"
          subtitle="Recommended next analyses"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestionCards.map((s, i) => (
            <motion.button
              key={s.label}
              onClick={() => navigate(s.to)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ y: -2 }}
              className="card card-hover p-4 text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Smart Insights */}
      <div>
        <SectionHeader
          title="Smart Insights"
          subtitle="Auto-generated business findings"
          icon={<Lightbulb className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, i) => {
            const config = {
              finding: {
                icon: Lightbulb,
                color: "text-blue-400 bg-blue-500/10",
              },
              risk: { icon: AlertCircle, color: "text-error bg-error/10" },
              opportunity: {
                icon: Rocket,
                color: "text-success bg-success/10",
              },
              recommendation: {
                icon: Target,
                color: "text-primary-400 bg-primary-500/10",
              },
              trend: {
                icon: TrendingUp,
                color: "text-secondary-400 bg-secondary-500/10",
              },
              pattern: {
                icon: Sparkles,
                color: "text-accent-500 bg-accent-500/10",
              },
            }[ins.category];
            const Icon = config.icon;
            return (
              <Card key={ins.id} className="p-4" delay={0.05 * i}>
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">
                        {ins.title}
                      </p>
                      {ins.metric && (
                        <Badge variant="default">{ins.metric}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {ins.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200 truncate text-right">
        {value}
      </span>
    </div>
  );
}

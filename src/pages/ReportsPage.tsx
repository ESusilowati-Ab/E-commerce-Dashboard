import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Target,
  Rocket,
  Lightbulb,
  Check,
  BarChart3,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import { ChartRenderer } from "../components/ui/Chart";
import { generateInsights, toNumber, mean } from "../lib/analysis";
import { generateDatasetSummary } from "../lib/ai";

export function ReportsPage() {
  const { dataset } = useDataset();

  const report = useMemo(() => {
    if (!dataset?.profile) return null;
    const p = dataset.profile;
    const insights = generateInsights(dataset.rows, p);
    const summary = generateDatasetSummary(dataset);
    const numCols = p.columnProfiles.filter(
      (c) => c.type === "numeric" && !c.isLikelyId,
    );
    const catCols = p.columnProfiles.filter(
      (c) => c.type === "categorical" && !c.isLikelyId && c.unique < 30,
    );

    // top chart data
    let topChart: import("../types").ChartSpec | null = null;
    if (catCols.length > 0 && numCols.length > 0) {
      const groups = new Map<string, number[]>();
      dataset.rows.forEach((r) => {
        const k = String(r[catCols[0].name] ?? "N/A");
        const v = toNumber(r[numCols[0].name]);
        if (v !== null) {
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(v);
        }
      });
      const data = [...groups.entries()]
        .map(([x, vals]) => ({ x, y: Math.round(mean(vals) * 100) / 100 }))
        .sort((a, b) => b.y - a.y)
        .slice(0, 8);
      topChart = {
        type: "bar",
        title: `${numCols[0].name} by ${catCols[0].name}`,
        series: [{ name: numCols[0].name, data }],
      };
    }

    return { p, insights, summary, numCols, catCols, topChart };
  }, [dataset]);

  if (!dataset || !report) {
    return (
      <EmptyState
        icon={<FileText className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to generate an executive report."
      />
    );
  }

  const { p, insights, summary, numCols, catCols, topChart } = report;
  const findings = insights.filter(
    (i) => i.category === "finding" || i.category === "pattern",
  );
  const risks = insights.filter((i) => i.category === "risk");
  const opportunities = insights.filter(
    (i) => i.category === "opportunity" || i.category === "recommendation",
  );

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Executive Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auto-generated stakeholder-ready analysis
          </p>
        </div>
        <button onClick={handlePrint} className="btn-primary text-sm">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-8 bg-gradient-to-br from-bg-card to-bg-panel">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border-subtle">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Data Analysis Report
              </h2>
              <p className="text-sm text-slate-500">
                {dataset.name} · Generated {new Date().toLocaleDateString()}
              </p>
            </div>
            <Badge variant="primary" className="ml-auto">
              <Sparkles className="w-3 h-3" /> AI Generated
            </Badge>
          </div>

          {/* 1. Overview */}
          <Section title="1. Dataset Overview" icon={BarChart3}>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <Metric label="Rows" value={p.rows.toLocaleString()} />
              <Metric label="Columns" value={String(p.columns)} />
              <Metric label="Quality Score" value={`${p.qualityScore}/100`} />
              <Metric
                label="Missing Data"
                value={`${p.missingPct.toFixed(1)}%`}
              />
            </div>
          </Section>

          {/* 2. Key Metrics */}
          <Section title="2. Key Metrics" icon={TrendingUp}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {numCols.slice(0, 6).map((c) => (
                <div
                  key={c.name}
                  className="p-3 rounded-xl bg-bg-input/50 border border-border-subtle"
                >
                  <p className="text-xs text-slate-500 mb-1">{c.name}</p>
                  <p className="text-lg font-bold text-white">
                    {c.mean?.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-slate-500">
                    avg · range [
                    {c.min?.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    ,{" "}
                    {c.max?.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    ]
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* 3. Charts */}
          {topChart && (
            <Section title="3. Visual Analysis" icon={BarChart3}>
              <ChartRenderer spec={topChart} height={280} />
            </Section>
          )}

          {/* 4. Insights */}
          <Section title="4. Key Findings" icon={Lightbulb}>
            <ul className="space-y-2">
              {findings.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">{f.title}:</strong>{" "}
                    {f.description}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 5. Risks */}
          {risks.length > 0 && (
            <Section title="5. Business Risks" icon={AlertCircle}>
              <ul className="space-y-2">
                {risks.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{r.title}:</strong>{" "}
                      {r.description}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 6. Opportunities */}
          {opportunities.length > 0 && (
            <Section title="6. Opportunities & Recommendations" icon={Rocket}>
              <ul className="space-y-2">
                {opportunities.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <Target className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{o.title}:</strong>{" "}
                      {o.description}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 7. Conclusion */}
          <Section title="7. Conclusion" icon={FileText}>
            <p className="text-sm text-slate-300 leading-relaxed">
              The analysis of {dataset.name} reveals a dataset with{" "}
              {p.qualityScore >= 80 ? "excellent" : "acceptable"} data quality
              (score: {p.qualityScore}/100). Key metrics span {numCols.length}{" "}
              numeric measures across {catCols.length} categorical dimensions.
              {p.datetimeColumns > 0 &&
                ` Time-series analysis is available with ${p.datetimeColumns} date dimension${p.datetimeColumns > 1 ? "s" : ""}.`}
              The strongest patterns{" "}
              {findings.length > 0
                ? "relate to correlations and segment differences"
                : "are available upon deeper exploration"}
              . Recommended next steps include forecasting future trends,
              segment-level deep dives, and addressing{" "}
              {p.missingPct > 5
                ? "missing data issues"
                : "any remaining data quality gaps"}
              .
            </p>
          </Section>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-xs text-slate-500">
              Generated by DataMind AI · AI Data Analyst Copilot
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-bg-input/50 border border-border-subtle">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  Play,
  Sparkles,
  Database,
  Table2,
  Lightbulb,
  Wand2,
  Download,
  AlertCircle,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import { generateSQL, executeSQL } from "../lib/ai";
import { cn } from "../lib/utils";

const exampleQueries = [
  "Average salary by department",
  "Top 10 highest paid employees",
  "Count of employees by city",
  "Total revenue by month",
  "Show all records",
];

export function SqlExplorerPage() {
  const { dataset } = useDataset();
  const [nlQuery, setNlQuery] = useState("");
  const [sql, setSql] = useState("");
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState<{
    columns: string[];
    rows: import("../types").DataRow[];
    error?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!dataset) {
    return (
      <EmptyState
        icon={<Code2 className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to use the SQL Copilot."
      />
    );
  }

  const tableName = dataset.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  const generateFromNL = () => {
    if (!nlQuery.trim() || !dataset) return;
    setGenerating(true);
    setTimeout(() => {
      const { sql, explanation } = generateSQL(dataset, nlQuery);
      setSql(sql);
      setExplanation(explanation);
      setGenerating(false);
    }, 400);
  };

  const runSQL = () => {
    if (!sql || !dataset) return;
    const res = executeSQL(dataset, sql);
    setResult(res);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          SQL Copilot
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Natural language to SQL — generate, execute, and explain
        </p>
      </div>

      {/* NL to SQL */}
      <Card className="p-5">
        <SectionHeader
          title="Natural Language Query"
          icon={<Wand2 className="w-4 h-4" />}
        />
        <div className="flex gap-2">
          <input
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateFromNL()}
            placeholder="e.g. Average salary by department"
            className="input flex-1"
          />
          <button
            onClick={generateFromNL}
            disabled={generating || !nlQuery.trim()}
            className="btn-primary"
          >
            <Sparkles className="w-4 h-4" /> Generate SQL
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {exampleQueries.map((q) => (
            <button
              key={q}
              onClick={() => {
                setNlQuery(q);
              }}
              className="chip border border-border-subtle bg-bg-input text-slate-400 hover:bg-bg-hover hover:text-slate-200 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* SQL editor */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white">SQL Editor</h3>
            <Badge variant="default">Table: {tableName}</Badge>
          </div>
          <button
            onClick={runSQL}
            disabled={!sql}
            className="btn-primary text-sm"
          >
            <Play className="w-4 h-4" /> Execute
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="-- Write or generate SQL here&#10;SELECT * FROM hr_analytics LIMIT 100;"
          className="w-full h-40 bg-bg-input border border-border-subtle rounded-xl p-4 text-sm font-mono text-primary-300 focus:outline-none focus:border-primary-500/40 resize-none"
          spellCheck={false}
        />
        {explanation && (
          <div className="mt-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/20 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">{explanation}</p>
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold text-white">
                  Query Results
                </h3>
                <Badge variant="default">{result.rows.length} rows</Badge>
              </div>
              <button className="btn-ghost text-xs">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            {result.error ? (
              <div className="p-4 rounded-xl bg-error/10 border border-error/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error">{result.error}</p>
              </div>
            ) : result.rows.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No rows returned
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-subtle max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-bg-input/80 backdrop-blur border-b border-border-subtle">
                      {result.columns.map((c) => (
                        <th
                          key={c}
                          className="text-left px-3 py-2.5 font-medium text-slate-400 whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 100).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-subtle last:border-0 hover:bg-bg-hover/30"
                      >
                        {result!.columns.map((c) => (
                          <td
                            key={c}
                            className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {String(row[c] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Schema */}
      <Card className="p-5">
        <SectionHeader
          title="Schema"
          subtitle="Available columns"
          icon={<Database className="w-4 h-4" />}
        />
        <div className="flex flex-wrap gap-2">
          {dataset.columns.map((c) => {
            const profile = dataset.profile?.columnProfiles.find(
              (p) => p.name === c,
            );
            return (
              <div
                key={c}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-input/50 border border-border-subtle"
              >
                <span className="text-sm text-slate-200 font-mono">{c}</span>
                <Badge variant="default" className="capitalize">
                  {profile?.type || "unknown"}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

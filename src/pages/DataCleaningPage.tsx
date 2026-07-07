import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  Copy,
  Hash,
  Calendar,
  Type,
  Check,
  Undo2,
  Wand2,
  History,
  X,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import {
  Card,
  KpiCard,
  SectionHeader,
  Badge,
  EmptyState,
} from "../components/ui/Card";
import { detectCleaningIssues, applyCleaning } from "../lib/cleaning";
import { cn } from "../lib/utils";
import type { CleaningSuggestion, DataRow } from "../types";

const issueIcons = {
  missing: AlertTriangle,
  duplicate: Copy,
  outlier: Hash,
  invalid_date: Calendar,
  wrong_type: Type,
  extra_spaces: Type,
  mixed_case: Type,
};

const severityColors = {
  high: "text-error bg-error/10 border-error/30",
  medium: "text-warning bg-warning/10 border-warning/30",
  low: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

export function DataCleaningPage() {
  const { dataset, updateRows, addCleaningHistory, cleaningHistory } =
    useDataset();
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[] | null>(
    null,
  );
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<
    { rows: DataRow[]; suggestion: CleaningSuggestion }[]
  >([]);

  const currentSuggestions = useMemo(() => {
    if (suggestions) return suggestions;
    if (!dataset) return [];
    return detectCleaningIssues(dataset.rows, dataset.columns);
  }, [suggestions, dataset]);

  if (!dataset) {
    return (
      <EmptyState
        icon={<Sparkles className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to detect cleaning issues."
      />
    );
  }

  const p = dataset.profile!;

  const applyOne = (suggestion: CleaningSuggestion) => {
    const beforeRows = dataset.rows.length;
    const newRows = applyCleaning(dataset.rows, suggestion);
    const afterRows = newRows.length;
    updateRows(newRows);
    setUndoStack((prev) => [...prev, { rows: dataset.rows, suggestion }]);
    setAppliedIds((prev) => new Set(prev).add(suggestion.id));
    addCleaningHistory({
      id: `h-${Date.now()}`,
      timestamp: Date.now(),
      action: `Applied: ${suggestion.fixDescription}`,
      description: suggestion.description,
      beforeRows,
      afterRows,
    });
  };

  const applyAll = () => {
    let currentRows = dataset.rows;
    const applied: CleaningSuggestion[] = [];
    currentSuggestions.forEach((s) => {
      if (!appliedIds.has(s.id)) {
        currentRows = applyCleaning(currentRows, s);
        applied.push(s);
      }
    });
    if (applied.length === 0) return;
    setUndoStack((prev) => [
      ...prev,
      { rows: dataset.rows, suggestion: applied[0] },
    ]);
    updateRows(currentRows);
    setAppliedIds(new Set(currentSuggestions.map((s) => s.id)));
    addCleaningHistory({
      id: `h-${Date.now()}`,
      timestamp: Date.now(),
      action: `Applied ${applied.length} cleaning operations`,
      description: "Bulk apply all suggestions",
      beforeRows: dataset.rows.length,
      afterRows: currentRows.length,
    });
  };

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    updateRows(last.rows);
    setUndoStack((prev) => prev.slice(0, -1));
    setAppliedIds((prev) => {
      const next = new Set(prev);
      // un-apply the suggestion(s) from this undo
      currentSuggestions.forEach((s) => {
        if (s.id === last.suggestion.id) next.delete(s.id);
      });
      return next;
    });
  };

  const pendingCount = currentSuggestions.filter(
    (s) => !appliedIds.has(s.id),
  ).length;
  const appliedCount = currentSuggestions.length - pendingCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Data Cleaning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-detected issues with one-click fixes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {undoStack.length > 0 && (
            <button onClick={undo} className="btn-outline text-sm">
              <Undo2 className="w-4 h-4" /> Undo ({undoStack.length})
            </button>
          )}
          {pendingCount > 0 && (
            <button onClick={applyAll} className="btn-primary text-sm">
              <Wand2 className="w-4 h-4" /> Apply All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Issues Found"
          value={currentSuggestions.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="warning"
        />
        <KpiCard
          label="Issues Fixed"
          value={appliedCount}
          icon={<Check className="w-5 h-5" />}
          accent="success"
        />
        <KpiCard
          label="Missing Values"
          value={p.missingCells.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="error"
        />
        <KpiCard
          label="Duplicate Rows"
          value={p.duplicateRows.toLocaleString()}
          icon={<Copy className="w-5 h-5" />}
          accent="warning"
        />
      </div>

      {/* Suggestions */}
      <div>
        <SectionHeader
          title="Cleaning Suggestions"
          subtitle={`${pendingCount} pending · ${appliedCount} applied`}
          icon={<Sparkles className="w-4 h-4" />}
        />
        {currentSuggestions.length === 0 ? (
          <Card className="p-8 text-center">
            <Check className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Dataset is clean</p>
            <p className="text-xs text-slate-500 mt-1">
              No issues detected. Your data is ready for analysis.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {currentSuggestions.map((s, i) => {
                const Icon = issueIcons[s.issue] || AlertTriangle;
                const applied = appliedIds.has(s.id);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Card className={cn("p-4", applied && "opacity-60")}>
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                            severityColors[s.severity],
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-white">
                              {s.column === "*" ? "All columns" : s.column}
                            </p>
                            <Badge variant="default" className="capitalize">
                              {s.issue.replace("_", " ")}
                            </Badge>
                            <Badge
                              variant={
                                s.severity === "high"
                                  ? "error"
                                  : s.severity === "medium"
                                    ? "warning"
                                    : "default"
                              }
                              className="capitalize"
                            >
                              {s.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400">
                            {s.description}
                          </p>
                          <p className="text-xs text-primary-400 mt-1.5 flex items-center gap-1">
                            <Wand2 className="w-3 h-3" /> {s.fixDescription}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {applied ? (
                            <Badge variant="success">
                              <Check className="w-3 h-3" /> Applied
                            </Badge>
                          ) : (
                            <button
                              onClick={() => applyOne(s)}
                              className="btn-outline text-xs py-1.5 px-3"
                            >
                              Apply Fix
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* History */}
      {cleaningHistory.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Cleaning History"
            icon={<History className="w-4 h-4" />}
          />
          <div className="space-y-2">
            {cleaningHistory.slice(0, 10).map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-input/30 text-sm"
              >
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="text-slate-300 flex-1 truncate">
                  {h.action}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(h.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

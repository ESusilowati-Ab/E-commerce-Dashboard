import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Image,
  FileCode,
  Check,
  Loader2,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import { cn } from "../lib/utils";

type ExportFormat = "csv" | "excel" | "json" | "markdown" | "png" | "pdf";

const formats: {
  id: ExportFormat;
  label: string;
  icon: typeof FileText;
  desc: string;
  color: string;
}[] = [
  {
    id: "csv",
    label: "CSV",
    icon: FileText,
    desc: "Comma-separated values",
    color: "text-primary-400",
  },
  {
    id: "excel",
    label: "Excel",
    icon: FileSpreadsheet,
    desc: "XLSX spreadsheet",
    color: "text-success",
  },
  {
    id: "json",
    label: "JSON",
    icon: FileJson,
    desc: "Structured JSON data",
    color: "text-secondary-400",
  },
  {
    id: "markdown",
    label: "Markdown",
    icon: FileCode,
    desc: "Formatted report",
    color: "text-accent-500",
  },
  {
    id: "png",
    label: "PNG Charts",
    icon: Image,
    desc: "Chart images",
    color: "text-blue-400",
  },
  {
    id: "pdf",
    label: "PDF Report",
    icon: FileText,
    desc: "Print-ready document",
    color: "text-error",
  },
];

export function ExportPage() {
  const { dataset } = useDataset();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);

  if (!dataset) {
    return (
      <EmptyState
        icon={<Download className="w-7 h-7" />}
        title="No dataset loaded"
        description="Upload a dataset to export."
      />
    );
  }

  const handleExport = (format: ExportFormat) => {
    setExporting(format);
    setDone(null);
    setTimeout(() => {
      if (format === "csv") {
        const headers = dataset.columns.join(",");
        const rows = dataset.rows
          .map((r) =>
            dataset.columns.map((c) => JSON.stringify(r[c] ?? "")).join(","),
          )
          .join("\n");
        downloadFile(
          `${dataset.name}.csv`,
          [headers, rows].join("\n"),
          "text/csv",
        );
      } else if (format === "json") {
        downloadFile(
          `${dataset.name}.json`,
          JSON.stringify(dataset.rows, null, 2),
          "application/json",
        );
      } else if (format === "markdown") {
        const md = generateMarkdown(dataset);
        downloadFile(`${dataset.name}_report.md`, md, "text/markdown");
      } else if (format === "excel") {
        // simple CSV as xlsx placeholder
        const headers = dataset.columns.join(",");
        const rows = dataset.rows
          .map((r) =>
            dataset.columns.map((c) => JSON.stringify(r[c] ?? "")).join(","),
          )
          .join("\n");
        downloadFile(
          `${dataset.name}.csv`,
          [headers, rows].join("\n"),
          "text/csv",
        );
      } else if (format === "pdf") {
        window.print();
      } else if (format === "png") {
        alert(
          'Chart export: right-click any chart and select "Save image as" to export as PNG.',
        );
      }
      setExporting(null);
      setDone(format);
      setTimeout(() => setDone(null), 2000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Export</h1>
        <p className="text-sm text-slate-500 mt-1">
          Download your data and analysis in multiple formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formats.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => handleExport(f.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ y: -2 }}
            disabled={exporting !== null}
            className="card card-hover p-5 text-left group disabled:opacity-50"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl bg-bg-input/50 border border-border-subtle flex items-center justify-center",
                  f.color,
                )}
              >
                <f.icon className="w-5 h-5" />
              </div>
              {done === f.id ? (
                <Badge variant="success">
                  <Check className="w-3 h-3" /> Done
                </Badge>
              ) : exporting === f.id ? (
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-600 group-hover:text-primary-400 transition" />
              )}
            </div>
            <p className="text-sm font-semibold text-white">{f.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
          </motion.button>
        ))}
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Export Summary"
          icon={<FileText className="w-4 h-4" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Dataset:</span>{" "}
            <span className="text-white font-medium">{dataset.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Rows:</span>{" "}
            <span className="text-white font-medium">
              {dataset.rows.length.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Columns:</span>{" "}
            <span className="text-white font-medium">
              {dataset.columns.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">File type:</span>{" "}
            <span className="text-white font-medium">
              {dataset.fileType.toUpperCase()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateMarkdown(dataset: import("../types").Dataset): string {
  const p = dataset.profile!;
  return `# ${dataset.name} — Analysis Report

Generated by **DataMind AI** on ${new Date().toLocaleDateString()}

## 1. Dataset Overview

- **Rows:** ${p.rows.toLocaleString()}
- **Columns:** ${p.columns}
- **Quality Score:** ${p.qualityScore}/100
- **Missing Data:** ${p.missingPct.toFixed(1)}%
- **Duplicate Rows:** ${p.duplicateRows}

## 2. Column Summary

| Column | Type | Unique | Missing | Mean/Top |
|--------|------|--------|---------|----------|
${p.columnProfiles.map((c) => `| ${c.name} | ${c.type} | ${c.unique} | ${c.missingPct.toFixed(1)}% | ${c.type === "numeric" ? c.mean?.toFixed(2) : c.topValues?.[0]?.value || "-"} |`).join("\n")}

## 3. Key Insights

${p.columnProfiles
  .filter((c) => c.type === "numeric")
  .slice(0, 5)
  .map(
    (c) =>
      `- **${c.name}**: avg ${c.mean?.toFixed(2)}, range [${c.min}, ${c.max}]`,
  )
  .join("\n")}

## 4. Data Quality

- Completeness: ${(100 - p.missingPct).toFixed(1)}%
- Uniqueness: ${(100 - p.duplicatePct).toFixed(1)}%
- Memory usage: ${p.memoryUsage}

---
*Generated by DataMind AI — AI Data Analyst Copilot*
`;
}

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileSpreadsheet,
  FileJson,
  FileText,
  Database,
  CheckCircle2,
  X,
  Sheet,
  Table2,
  FileCode,
  HardDrive,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { Card, SectionHeader, Badge, EmptyState } from "../components/ui/Card";
import {
  parseCSV,
  parseJSON,
  parseExcel,
  parseExcelSheet,
  detectFileType,
} from "../lib/parse";
import { generateSampleDataset } from "../lib/sampleData";
import { cn } from "../lib/utils";

interface RecentFile {
  name: string;
  type: string;
  size: string;
  rows: number;
  cols: number;
  date: number;
}

export function DataSourcesPage() {
  const { dataset, loadDataset, switchSheet } = useDataset();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(5);
    setParseError(null);
    try {
      const ext = detectFileType(file.name);
      let result;
      if (ext === "csv" || ext === "tsv" || ext === "txt") {
        const text = await file.text();
        setProgress(40);
        result = parseCSV(text);
      } else if (ext === "json") {
        const text = await file.text();
        setProgress(40);
        result = parseJSON(text);
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        setProgress(40);
        result = parseExcel(buffer);
        setExcelBuffer(buffer);
        setExcelSheets(result.sheetNames || []);
      } else {
        const text = await file.text();
        result = parseCSV(text);
      }
      setProgress(75);
      const name = file.name.replace(/\.[^.]+$/, "");
      loadDataset(
        name,
        file.name,
        ext,
        result.rows,
        result.columns,
        result.sheetNames,
      );
      setRecentFiles((prev) =>
        [
          {
            name: file.name,
            type: ext,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            rows: result.rows.length,
            cols: result.columns.length,
            date: Date.now(),
          },
          ...prev.filter((f) => f.name !== file.name),
        ].slice(0, 8),
      );
      setProgress(100);
    } catch (e) {
      setParseError((e as Error).message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 600);
    }
  };

  const handleSheetSwitch = (sheetName: string) => {
    if (!excelBuffer) return;
    const result = parseExcelSheet(excelBuffer, sheetName);
    switchSheet(result.rows, result.columns, sheetName);
  };

  const loadSample = () => {
    const sample = generateSampleDataset(500);
    loadDataset(
      "HR Analytics",
      "hr_analytics.csv",
      "csv",
      sample.rows,
      sample.columns,
    );
    setRecentFiles((prev) =>
      [
        {
          name: "hr_analytics.csv",
          type: "csv",
          size: "48.2 KB",
          rows: 502,
          cols: 12,
          date: Date.now(),
        },
        ...prev,
      ].slice(0, 8),
    );
  };

  const supportedTypes = [
    { ext: "CSV", icon: FileText, color: "text-primary-400" },
    { ext: "XLSX", icon: FileSpreadsheet, color: "text-success" },
    { ext: "JSON", icon: FileJson, color: "text-secondary-400" },
    { ext: "SQL", icon: Database, color: "text-accent-500" },
    { ext: "SQLite", icon: HardDrive, color: "text-blue-400" },
    { ext: "MySQL", icon: Database, color: "text-blue-400" },
    { ext: "PostgreSQL", icon: Database, color: "text-blue-400" },
    { ext: "Power BI", icon: Table2, color: "text-warning" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Data Sources
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload your dataset to begin AI-powered analysis
        </p>
      </div>

      {/* Drop zone */}
      <Card className="p-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
            dragging
              ? "border-primary-500 bg-primary-500/5 scale-[1.01]"
              : "border-border hover:border-border-strong hover:bg-bg-hover/30",
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center"
                >
                  <UploadCloud className="w-6 h-6" />
                </motion.div>
                <p className="text-sm font-medium text-white">
                  Processing dataset...
                </p>
                <div className="w-64 h-1.5 bg-bg-input rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{progress}%</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-bg-input border border-border-subtle flex items-center justify-center text-slate-400">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    Drag & drop your file here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    or click to browse · CSV, Excel, JSON up to 50MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {parseError && (
          <div className="mt-4 p-3 rounded-xl bg-error/10 border border-error/30 text-sm text-error">
            {parseError}
          </div>
        )}
      </Card>

      {/* Supported types */}
      <Card className="p-5">
        <SectionHeader
          title="Supported Data Sources"
          icon={<Database className="w-4 h-4" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {supportedTypes.map((t) => (
            <div
              key={t.ext}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-bg-input/50 border border-border-subtle"
            >
              <t.icon className={cn("w-4 h-4", t.color)} />
              <span className="text-sm font-medium text-slate-300">
                {t.ext}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Excel sheet selector */}
      {excelSheets.length > 1 && (
        <Card className="p-5">
          <SectionHeader
            title="Sheet Selection"
            subtitle={`${excelSheets.length} sheets found in workbook`}
            icon={<Sheet className="w-4 h-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {excelSheets.map((sheet) => (
              <button
                key={sheet}
                onClick={() => handleSheetSwitch(sheet)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border transition",
                  dataset?.activeSheet === sheet
                    ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                    : "bg-bg-input border-border-subtle text-slate-300 hover:bg-bg-hover",
                )}
              >
                {sheet}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Sample data */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">No data handy?</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Load a sample HR analytics dataset to explore the platform
            </p>
          </div>
          <button onClick={loadSample} className="btn-outline text-sm">
            <FileCode className="w-4 h-4" /> Load Sample Dataset
          </button>
        </div>
      </Card>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Recent Files"
            icon={<FileSpreadsheet className="w-4 h-4" />}
          />
          <div className="space-y-2">
            {recentFiles.map((f, i) => (
              <motion.div
                key={f.name + i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center gap-3 p-3 rounded-xl bg-bg-input/50 border border-border-subtle hover:bg-bg-hover transition"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {f.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {f.rows.toLocaleString()} rows · {f.cols} cols · {f.size}
                  </p>
                </div>
                <Badge variant="default">{f.type.toUpperCase()}</Badge>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Current dataset preview */}
      {dataset && (
        <Card className="p-5">
          <SectionHeader
            title="Current Dataset Preview"
            subtitle={`${dataset.rows.length.toLocaleString()} rows · ${dataset.columns.length} columns`}
            icon={<Table2 className="w-4 h-4" />}
          />
          <div className="overflow-x-auto rounded-xl border border-border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-input/50 border-b border-border-subtle">
                  {dataset.columns.slice(0, 8).map((c) => (
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
                {dataset.rows.slice(0, 5).map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle last:border-0 hover:bg-bg-hover/30"
                  >
                    {dataset.columns.slice(0, 8).map((c) => (
                      <td
                        key={c}
                        className="px-3 py-2.5 text-slate-300 whitespace-nowrap max-w-[160px] truncate"
                      >
                        {String(row[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

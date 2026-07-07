import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Upload,
  Database,
  ChevronDown,
  Sparkles,
  Circle,
} from "lucide-react";
import { useDataset } from "../store/DatasetContext";
import { parseCSV, parseJSON, parseExcel, detectFileType } from "../lib/parse";
import { cn } from "../lib/utils";

export function TopNav() {
  const { dataset, aiStatus, loadDataset } = useDataset();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(10);
    try {
      const ext = detectFileType(file.name);
      let result;
      if (ext === "csv" || ext === "tsv" || ext === "txt") {
        const text = await file.text();
        setUploadProgress(50);
        result = parseCSV(text);
      } else if (ext === "json") {
        const text = await file.text();
        setUploadProgress(50);
        result = parseJSON(text);
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        setUploadProgress(50);
        result = parseExcel(buffer);
      } else {
        // try CSV as fallback
        const text = await file.text();
        result = parseCSV(text);
      }
      setUploadProgress(80);
      const name = file.name.replace(/\.[^.]+$/, "");
      loadDataset(
        name,
        file.name,
        ext,
        result.rows,
        result.columns,
        result.sheetNames,
      );
      setUploadProgress(100);
      navigate("/");
    } catch (e) {
      console.error("Upload error:", e);
      alert(`Failed to parse file: ${(e as Error).message}`);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const statusColor = {
    idle: "text-slate-500",
    loading: "text-warning",
    analyzing: "text-warning",
    profiling: "text-secondary-400",
    generating: "text-accent-500",
    ready: "text-success",
  }[aiStatus.state];

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-border-subtle">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Dataset selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                {dataset?.name || "No dataset"}
              </p>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <p className="text-xs text-slate-500">
              {dataset
                ? `${dataset.rows.length.toLocaleString()} rows · ${dataset.columns.length} cols`
                : "Upload to begin"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns, insights, charts..."
            className="input pl-10 py-2 text-sm"
          />
        </div>

        {/* AI Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-border-subtle">
          <motion.div
            animate={
              aiStatus.state !== "ready" && aiStatus.state !== "idle"
                ? { scale: [1, 1.3, 1] }
                : {}
            }
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Circle className={cn("w-2 h-2 fill-current", statusColor)} />
          </motion.div>
          <span className={cn("text-xs font-medium", statusColor)}>
            {aiStatus.label}
          </span>
        </div>

        {/* Upload */}
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-primary text-sm"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              Uploading... {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload
            </>
          )}
        </button>
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

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:shadow-glow-accent transition">
          DA
        </div>
      </div>

      {/* Upload progress bar */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 3 }}
            exit={{ height: 0 }}
            className="bg-bg-base overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

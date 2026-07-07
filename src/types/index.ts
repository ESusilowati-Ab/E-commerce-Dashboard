// Core type definitions for DataMind AI

export type CellValue = string | number | boolean | null;

export type DataRow = Record<string, CellValue>;

export type ColumnType =
  | "numeric"
  | "categorical"
  | "datetime"
  | "boolean"
  | "unknown";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  dtype: string;
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  uniquePct: number;
  // numeric stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  outliers?: number;
  // categorical
  topValues?: { value: CellValue; count: number }[];
  // datetime
  minDate?: string;
  maxDate?: string;
  // quality
  isPrimaryKey?: boolean;
  isLikelyId?: boolean;
  nullPercentage?: number;
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  totalCells: number;
  missingCells: number;
  missingPct: number;
  duplicateRows: number;
  duplicatePct: number;
  memoryUsage: string;
  numericColumns: number;
  categoricalColumns: number;
  datetimeColumns: number;
  booleanColumns: number;
  qualityScore: number;
  columnProfiles: ColumnProfile[];
  correlations: CorrelationMatrix;
  possiblePrimaryKeys: string[];
  possibleForeignKeys: string[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
}

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  uploadedAt: number;
  rows: DataRow[];
  columns: string[];
  sheetNames?: string[];
  activeSheet?: string;
  profile?: DatasetProfile;
}

export interface CleaningSuggestion {
  id: string;
  column: string;
  issue:
    | "missing"
    | "duplicate"
    | "outlier"
    | "invalid_date"
    | "wrong_type"
    | "extra_spaces"
    | "mixed_case";
  severity: "low" | "medium" | "high";
  description: string;
  affectedCount: number;
  fixDescription: string;
  applied: boolean;
}

export interface CleaningHistory {
  id: string;
  timestamp: number;
  action: string;
  description: string;
  beforeRows: number;
  afterRows: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  code?: string;
  chart?: ChartSpec;
  table?: { columns: string[]; rows: DataRow[] };
  timestamp: number;
}

export interface ChartSpec {
  type:
    | "bar"
    | "line"
    | "pie"
    | "scatter"
    | "histogram"
    | "area"
    | "box"
    | "heatmap";
  title: string;
  xKey?: string;
  yKey?: string;
  xLabel?: string;
  yLabel?: string;
  series?: { name: string; data: { x: CellValue; y: CellValue }[] }[];
  data?: DataRow[];
  color?: string;
}

export interface Insight {
  id: string;
  category:
    | "finding"
    | "risk"
    | "opportunity"
    | "recommendation"
    | "trend"
    | "pattern";
  title: string;
  description: string;
  severity?: "info" | "warning" | "critical" | "positive";
  metric?: string;
}

export interface ForecastResult {
  column: string;
  dateColumn: string;
  history: { date: string; value: number }[];
  forecast: { date: string; value: number; lower: number; upper: number }[];
  trend: number;
  seasonality: boolean;
  r2: number;
}

export interface KpiCard {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  icon?: string;
  sublabel?: string;
}

export interface AIStatus {
  state:
    | "idle"
    | "loading"
    | "analyzing"
    | "profiling"
    | "generating"
    | "ready";
  label: string;
}

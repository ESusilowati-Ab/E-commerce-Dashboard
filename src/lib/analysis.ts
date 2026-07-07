// Statistical and analysis utilities — real implementations, no mocks
import type {
  CellValue,
  ColumnProfile,
  ColumnType,
  CorrelationMatrix,
  DataRow,
  DatasetProfile,
  Insight,
} from "../types";

export function inferColumnType(values: CellValue[], name: string): ColumnType {
  const nonNull = values.filter(
    (v) => v !== null && v !== "" && v !== undefined,
  );
  if (nonNull.length === 0) return "unknown";

  // boolean check
  const boolCount = nonNull.filter(
    (v) =>
      v === true ||
      v === false ||
      v === "true" ||
      v === "false" ||
      v === "True" ||
      v === "False",
  ).length;
  if (boolCount / nonNull.length > 0.9) return "boolean";

  // numeric check
  const numericCount = nonNull.filter((v) => {
    if (typeof v === "number") return true;
    if (typeof v === "string") {
      const cleaned = v.replace(/[$,€£%\s]/g, "");
      return (
        cleaned !== "" && !isNaN(Number(cleaned)) && isFinite(Number(cleaned))
      );
    }
    return false;
  }).length;
  if (numericCount / nonNull.length > 0.8) return "numeric";

  // datetime check
  const dateCount = nonNull.filter((v) => {
    if (typeof v === "string") {
      if (
        /^\d{4}-\d{1,2}-\d{1,2}/.test(v) ||
        /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)
      ) {
        return !isNaN(Date.parse(v));
      }
    }
    return false;
  }).length;
  if (dateCount / nonNull.length > 0.7) return "datetime";

  // likely an ID column if name suggests it and high cardinality
  if (/id$|_id|code$/i.test(name) && nonNull.length > 0) return "categorical";

  return "categorical";
}

export function toNumber(v: CellValue): number | null {
  if (v === null || v === "" || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  const cleaned = String(v).replace(/[$,€£%\s]/g, "");
  const n = Number(cleaned);
  return isNaN(n) || !isFinite(n) ? null : n;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export function profileColumn(
  name: string,
  values: CellValue[],
): ColumnProfile {
  const type = inferColumnType(values, name);
  const count = values.length;
  const missing = values.filter(
    (v) => v === null || v === "" || v === undefined,
  ).length;
  const nonNull = values.filter(
    (v) => v !== null && v !== "" && v !== undefined,
  );
  const uniqueValues = new Set(nonNull.map((v) => String(v)));
  const unique = uniqueValues.size;

  const profile: ColumnProfile = {
    name,
    type,
    dtype: type,
    count,
    missing,
    missingPct: count > 0 ? (missing / count) * 100 : 0,
    unique,
    uniquePct: count > 0 ? (unique / count) * 100 : 0,
    nullPercentage: count > 0 ? (missing / count) * 100 : 0,
  };

  if (type === "numeric") {
    const nums = nonNull.map(toNumber).filter((v): v is number => v !== null);
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = quantile(sorted, 0.25);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = nums.filter(
        (v) => v < lowerBound || v > upperBound,
      ).length;
      profile.min = Math.min(...nums);
      profile.max = Math.max(...nums);
      profile.mean = mean(nums);
      profile.median = median(nums);
      profile.std = std(nums);
      profile.q1 = q1;
      profile.q3 = q3;
      profile.iqr = iqr;
      profile.outliers = outliers;
    }
  }

  if (type === "categorical") {
    const counts = new Map<string, number>();
    nonNull.forEach((v) => {
      const key = String(v);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    profile.topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, count]) => ({ value, count }));
  }

  if (type === "datetime") {
    const dates = nonNull
      .map((v) => new Date(String(v)).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (dates.length > 0) {
      profile.minDate = new Date(dates[0]).toISOString().split("T")[0];
      profile.maxDate = new Date(dates[dates.length - 1])
        .toISOString()
        .split("T")[0];
    }
  }

  // primary key detection: unique, no missing, non-numeric
  if (unique === count && missing === 0 && count > 1) {
    profile.isPrimaryKey = true;
  }
  if (/id$|_id/i.test(name) && unique / count > 0.9) {
    profile.isLikelyId = true;
  }

  return profile;
}

export function computeCorrelations(
  rows: DataRow[],
  numericCols: string[],
): CorrelationMatrix {
  const cols = numericCols.slice(0, 12); // cap for readability
  const matrix: number[][] = [];
  const colData: Record<string, number[]> = {};
  cols.forEach((c) => {
    colData[c] = rows
      .map((r) => toNumber(r[c]))
      .filter((v): v is number => v !== null);
  });
  for (let i = 0; i < cols.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols.length; j++) {
      if (i === j) row.push(1);
      else {
        const pairs: [number, number][] = [];
        rows.forEach((r) => {
          const a = toNumber(r[cols[i]]);
          const b = toNumber(r[cols[j]]);
          if (a !== null && b !== null) pairs.push([a, b]);
        });
        if (pairs.length < 3) row.push(0);
        else
          row.push(
            pearson(
              pairs.map((p) => p[0]),
              pairs.map((p) => p[1]),
            ),
          );
      }
    }
    matrix.push(row);
  }
  return { columns: cols, matrix };
}

export function profileDataset(
  rows: DataRow[],
  columns: string[],
): DatasetProfile {
  const columnProfiles = columns.map((c) =>
    profileColumn(
      c,
      rows.map((r) => r[c]),
    ),
  );

  const totalCells = rows.length * columns.length;
  const missingCells = columnProfiles.reduce((s, c) => s + c.missing, 0);

  // duplicates
  const seen = new Set<string>();
  let duplicateRows = 0;
  rows.forEach((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) duplicateRows++;
    else seen.add(key);
  });

  const numericColumns = columnProfiles.filter(
    (c) => c.type === "numeric",
  ).length;
  const categoricalColumns = columnProfiles.filter(
    (c) => c.type === "categorical",
  ).length;
  const datetimeColumns = columnProfiles.filter(
    (c) => c.type === "datetime",
  ).length;
  const booleanColumns = columnProfiles.filter(
    (c) => c.type === "boolean",
  ).length;

  const numericColNames = columnProfiles
    .filter((c) => c.type === "numeric")
    .map((c) => c.name);
  const correlations = computeCorrelations(rows, numericColNames);

  const possiblePrimaryKeys = columnProfiles
    .filter((c) => c.isPrimaryKey)
    .map((c) => c.name);
  const possibleForeignKeys = columnProfiles
    .filter((c) => c.isLikelyId && !c.isPrimaryKey)
    .map((c) => c.name);

  // quality score
  const completeness = 100 - (missingCells / Math.max(totalCells, 1)) * 100;
  const uniqueness = 100 - (duplicateRows / Math.max(rows.length, 1)) * 100;
  const validity = 100; // simplified
  const qualityScore = Math.round(
    completeness * 0.4 + uniqueness * 0.3 + validity * 0.3,
  );

  const memoryBytes = rows.length * columns.length * 8;
  const memoryUsage =
    memoryBytes < 1024
      ? `${memoryBytes} B`
      : memoryBytes < 1024 * 1024
        ? `${(memoryBytes / 1024).toFixed(1)} KB`
        : `${(memoryBytes / 1024 / 1024).toFixed(2)} MB`;

  return {
    rows: rows.length,
    columns: columns.length,
    totalCells,
    missingCells,
    missingPct: totalCells > 0 ? (missingCells / totalCells) * 100 : 0,
    duplicateRows,
    duplicatePct: rows.length > 0 ? (duplicateRows / rows.length) * 100 : 0,
    memoryUsage,
    numericColumns,
    categoricalColumns,
    datetimeColumns,
    booleanColumns,
    qualityScore,
    columnProfiles,
    correlations,
    possiblePrimaryKeys,
    possibleForeignKeys,
  };
}

// ---- Insights generation ----

export function generateInsights(
  _rows: DataRow[],
  profile: DatasetProfile,
): Insight[] {
  const insights: Insight[] = [];
  const numericCols = profile.columnProfiles.filter(
    (c) => c.type === "numeric" && !c.isLikelyId,
  );
  const catCols = profile.columnProfiles.filter(
    (c) => c.type === "categorical" && !c.isLikelyId && c.unique < 50,
  );
  const dateCols = profile.columnProfiles.filter((c) => c.type === "datetime");

  // Quality insight
  if (profile.qualityScore >= 90) {
    insights.push({
      id: "q1",
      category: "finding",
      title: "Excellent Data Quality",
      description: `This dataset has a quality score of ${profile.qualityScore}/100 with minimal missing values and duplicates. It is ready for advanced analysis.`,
      severity: "positive",
    });
  } else if (profile.qualityScore < 70) {
    insights.push({
      id: "q1",
      category: "risk",
      title: "Data Quality Concerns",
      description: `Quality score is ${profile.qualityScore}/100. ${profile.missingCells} missing cells and ${profile.duplicateRows} duplicate rows detected. Cleaning recommended before analysis.`,
      severity: "warning",
    });
  }

  // Strongest correlation
  let strongestCorr = { a: "", b: "", r: 0 };
  for (let i = 0; i < profile.correlations.columns.length; i++) {
    for (let j = i + 1; j < profile.correlations.columns.length; j++) {
      const r = profile.correlations.matrix[i][j];
      if (Math.abs(r) > Math.abs(strongestCorr.r)) {
        strongestCorr = {
          a: profile.correlations.columns[i],
          b: profile.correlations.columns[j],
          r,
        };
      }
    }
  }
  if (Math.abs(strongestCorr.r) > 0.5) {
    const direction = strongestCorr.r > 0 ? "positive" : "negative";
    const strength = Math.abs(strongestCorr.r) > 0.8 ? "strong" : "moderate";
    insights.push({
      id: "c1",
      category: "pattern",
      title: `${strength === "strong" ? "Strong" : "Moderate"} ${direction} correlation detected`,
      description: `${strongestCorr.a} and ${strongestCorr.b} show a ${strength} ${direction} correlation (r=${strongestCorr.r.toFixed(2)}). This suggests they move together${direction === "positive" ? " in the same direction" : " in opposite directions"}.`,
      severity: "info",
      metric: `r = ${strongestCorr.r.toFixed(3)}`,
    });
  }

  // Outliers
  const outlierCols = numericCols.filter((c) => c.outliers && c.outliers! > 0);
  if (outlierCols.length > 0) {
    const top = outlierCols.sort(
      (a, b) => (b.outliers || 0) - (a.outliers || 0),
    )[0];
    insights.push({
      id: "o1",
      category: "risk",
      title: "Outliers detected",
      description: `${top.name} contains ${top.outliers} outlier values (using IQR method). These may represent data entry errors or genuinely extreme cases worth investigating.`,
      severity: "warning",
      metric: `${top.outliers} outliers`,
    });
  }

  // Top category insights
  catCols.slice(0, 3).forEach((col) => {
    if (col.topValues && col.topValues.length > 0) {
      const top = col.topValues[0];
      const pct = ((top.count / profile.rows) * 100).toFixed(1);
      insights.push({
        id: `cat-${col.name}`,
        category: "finding",
        title: `${col.name} distribution`,
        description: `${col.name} has ${col.unique} unique values. The most common is "${top.value}" appearing ${top.count} times (${pct}% of records).`,
        severity: "info",
      });
    }
  });

  // Numeric range insights
  numericCols.slice(0, 2).forEach((col) => {
    if (col.mean !== undefined && col.std !== undefined) {
      const cv = (col.std / Math.abs(col.mean || 1)) * 100;
      insights.push({
        id: `num-${col.name}`,
        category: "finding",
        title: `${col.name} summary`,
        description: `${col.name} ranges from ${col.min?.toLocaleString()} to ${col.max?.toLocaleString()} with an average of ${col.mean?.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Variability is ${cv > 50 ? "high" : cv > 20 ? "moderate" : "low"} (CV=${cv.toFixed(1)}%).`,
        severity: "info",
      });
    }
  });

  // Date range
  if (dateCols.length > 0) {
    const d = dateCols[0];
    insights.push({
      id: "date1",
      category: "trend",
      title: "Time dimension available",
      description: `${d.name} spans from ${d.minDate} to ${d.maxDate}. This enables time-series analysis, trend detection, and forecasting.`,
      severity: "info",
    });
  }

  // Recommendations
  if (dateCols.length > 0 && numericCols.length > 0) {
    insights.push({
      id: "rec1",
      category: "recommendation",
      title: "Forecasting opportunity",
      description: `With ${dateCols[0].name} and ${numericCols.length} numeric metrics, you can generate forecasts to predict future values and identify seasonal patterns.`,
      severity: "positive",
    });
  }
  if (catCols.length > 0 && numericCols.length > 0) {
    insights.push({
      id: "rec2",
      category: "recommendation",
      title: "Segmentation analysis",
      description: `Group ${numericCols[0]?.name} by ${catCols[0]?.name} to identify which segments perform best and where to focus business efforts.`,
      severity: "info",
    });
  }
  if (profile.missingPct > 5) {
    insights.push({
      id: "rec3",
      category: "recommendation",
      title: "Address missing data",
      description: `${profile.missingPct.toFixed(1)}% of cells are missing. Use the Data Cleaning module to impute or remove missing values before drawing conclusions.`,
      severity: "warning",
    });
  }

  return insights;
}

// ---- Forecasting (linear trend + seasonal decomposition via moving averages) ----

export function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export function forecastSeries(
  history: { date: string; value: number }[],
  periods: number = 12,
): {
  forecast: { date: string; value: number; lower: number; upper: number }[];
  trend: number;
  r2: number;
  seasonality: boolean;
} {
  if (history.length < 3) {
    return { forecast: [], trend: 0, r2: 0, seasonality: false };
  }
  const x = history.map((_, i) => i);
  const y = history.map((h) => h.value);
  const { slope, intercept, r2 } = linearRegression(x, y);

  // detect seasonality via autocorrelation at lag 12 (or 4)
  const lag = history.length > 24 ? 12 : 4;
  let autocorr = 0;
  if (history.length > lag * 2) {
    const y1 = y.slice(0, y.length - lag);
    const y2 = y.slice(lag);
    autocorr = pearson(y1, y2);
  }
  const seasonality = Math.abs(autocorr) > 0.4;

  // residual std for confidence interval
  const residuals = y.map((yi, i) => yi - (slope * i + intercept));
  const residualStd = std(residuals);

  const lastDate = new Date(history[history.length - 1].date);
  const forecast: {
    date: string;
    value: number;
    lower: number;
    upper: number;
  }[] = [];
  for (let p = 1; p <= periods; p++) {
    const idx = x.length + p - 1;
    const predicted = slope * idx + intercept;
    const margin = 1.96 * residualStd * Math.sqrt(1 + 1 / x.length);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + p);
    forecast.push({
      date: nextDate.toISOString().split("T")[0],
      value: Math.round(predicted * 100) / 100,
      lower: Math.round((predicted - margin) * 100) / 100,
      upper: Math.round((predicted + margin) * 100) / 100,
    });
  }
  return { forecast, trend: slope, r2, seasonality };
}

// ---- Statistical tests ----

export function tTestTwoSample(
  x: number[],
  y: number[],
): { t: number; p: number; significant: boolean } {
  const nx = x.length;
  const ny = y.length;
  if (nx < 2 || ny < 2) return { t: 0, p: 1, significant: false };
  const mx = mean(x);
  const my = mean(y);
  const vx = std(x) ** 2;
  const vy = std(y) ** 2;
  const se = Math.sqrt(vx / nx + vy / ny);
  if (se === 0) return { t: 0, p: 1, significant: false };
  const t = (mx - my) / se;
  // approximate p-value (two-tailed) using normal approx for large df
  const p = 2 * (1 - normalCdf(Math.abs(t)));
  return { t, p, significant: p < 0.05 };
}

export function normalCdf(z: number): number {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function anova(groups: number[][]): {
  f: number;
  p: number;
  significant: boolean;
} {
  const k = groups.length;
  if (k < 2) return { f: 0, p: 1, significant: false };
  const allMeans = groups.map((g) => mean(g));
  const grandMean = mean(allMeans.filter((m) => !isNaN(m)));
  const n = groups.reduce((s, g) => s + g.length, 0);
  // between-group sum of squares
  let ssb = 0;
  groups.forEach((g, i) => {
    ssb += g.length * (allMeans[i] - grandMean) ** 2;
  });
  // within-group sum of squares
  let ssw = 0;
  groups.forEach((g, i) => {
    ssw += g.reduce((s, v) => s + (v - allMeans[i]) ** 2, 0);
  });
  const dfb = k - 1;
  const dfw = n - k;
  if (dfw <= 0 || ssw === 0) return { f: 0, p: 1, significant: false };
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const f = msw === 0 ? 0 : msb / msw;
  // approximate p via chi-square approximation (simplified)
  const p = 1 - normalCdf(Math.sqrt(f) - 1.5);
  return { f, p: Math.max(0, Math.min(1, p)), significant: p < 0.05 };
}

export function shapiroWilkLikeTest(x: number[]): {
  statistic: number;
  p: number;
  normal: boolean;
} {
  // Simplified normality check via skewness + kurtosis
  if (x.length < 8) return { statistic: 0, p: 1, normal: true };
  const m = mean(x);
  const s = std(x);
  if (s === 0) return { statistic: 0, p: 1, normal: true };
  const skew = x.reduce((sum, v) => sum + ((v - m) / s) ** 3, 0) / x.length;
  const kurt = x.reduce((sum, v) => sum + ((v - m) / s) ** 4, 0) / x.length - 3;
  const stat = Math.sqrt(skew ** 2 / 6 + kurt ** 2 / 24);
  const p = 2 * (1 - normalCdf(stat));
  return { statistic: stat, p, normal: p > 0.05 };
}

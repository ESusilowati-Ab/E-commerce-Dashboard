// Data cleaning detection and application
import type { DataRow, CleaningSuggestion } from "../types";
import { toNumber } from "./analysis";

export function detectCleaningIssues(
  rows: DataRow[],
  columns: string[],
): CleaningSuggestion[] {
  const suggestions: CleaningSuggestion[] = [];
  let id = 0;

  columns.forEach((col) => {
    const values = rows.map((r) => r[col]);
    const missing = values.filter(
      (v) => v === null || v === "" || v === undefined,
    ).length;
    if (missing > 0) {
      suggestions.push({
        id: `clean-${id++}`,
        column: col,
        issue: "missing",
        severity:
          missing / rows.length > 0.2
            ? "high"
            : missing / rows.length > 0.05
              ? "medium"
              : "low",
        description: `${missing} missing value${missing > 1 ? "s" : ""} in ${col} (${((missing / rows.length) * 100).toFixed(1)}%)`,
        affectedCount: missing,
        fixDescription:
          "Fill with column median (numeric) or mode (categorical)",
        applied: false,
      });
    }

    // extra spaces
    const spaceIssues = values.filter(
      (v) => typeof v === "string" && v !== v.trim() && v.trim() !== "",
    ).length;
    if (spaceIssues > 0) {
      suggestions.push({
        id: `clean-${id++}`,
        column: col,
        issue: "extra_spaces",
        severity: "low",
        description: `${spaceIssues} value${spaceIssues > 1 ? "s have" : " has"} leading/trailing whitespace`,
        affectedCount: spaceIssues,
        fixDescription: "Trim leading and trailing whitespace",
        applied: false,
      });
    }

    // mixed case
    const strValues = values.filter(
      (v) => typeof v === "string" && v.trim() !== "",
    ) as string[];
    if (strValues.length > 0) {
      const hasMixed = strValues.some(
        (v) =>
          v !== v.toLowerCase() &&
          v !== v.toUpperCase() &&
          v !== v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(),
      );
      const uniqueLower = new Set(strValues.map((v) => v.toLowerCase()));
      const uniqueActual = new Set(strValues);
      if (hasMixed && uniqueLower.size < uniqueActual.size) {
        suggestions.push({
          id: `clean-${id++}`,
          column: col,
          issue: "mixed_case",
          severity: "low",
          description: `Inconsistent casing detected (${uniqueActual.size - uniqueLower.size} duplicate categories)`,
          affectedCount: uniqueActual.size - uniqueLower.size,
          fixDescription: "Normalize to Title Case",
          applied: false,
        });
      }
    }
  });

  // duplicates
  const seen = new Set<string>();
  let dupes = 0;
  rows.forEach((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) dupes++;
    else seen.add(key);
  });
  if (dupes > 0) {
    suggestions.push({
      id: `clean-${id++}`,
      column: "*",
      issue: "duplicate",
      severity: dupes / rows.length > 0.1 ? "high" : "medium",
      description: `${dupes} duplicate row${dupes > 1 ? "s" : ""} found (${((dupes / rows.length) * 100).toFixed(1)}%)`,
      affectedCount: dupes,
      fixDescription: "Remove duplicate rows, keeping first occurrence",
      applied: false,
    });
  }

  // outliers in numeric columns
  columns.forEach((col) => {
    const nums = rows
      .map((r) => toNumber(r[col]))
      .filter((v): v is number => v !== null);
    if (nums.length > rows.length * 0.5 && nums.length > 10) {
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const outliers = nums.filter(
        (v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr,
      ).length;
      if (outliers > 0 && outliers < nums.length * 0.1) {
        suggestions.push({
          id: `clean-${id++}`,
          column: col,
          issue: "outlier",
          severity: "medium",
          description: `${outliers} outlier${outliers > 1 ? "s" : ""} detected in ${col} (IQR method)`,
          affectedCount: outliers,
          fixDescription: "Cap outliers at 1.5×IQR boundaries (winsorize)",
          applied: false,
        });
      }
    }
  });

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export function applyCleaning(
  rows: DataRow[],
  suggestion: CleaningSuggestion,
): DataRow[] {
  const newRows = rows.map((r) => ({ ...r }));

  if (suggestion.issue === "duplicate") {
    const seen = new Set<string>();
    return newRows.filter((r) => {
      const key = JSON.stringify(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (suggestion.issue === "missing") {
    const col = suggestion.column;
    const nums = newRows
      .map((r) => toNumber(r[col]))
      .filter((v): v is number => v !== null);
    if (nums.length > newRows.length * 0.5) {
      // numeric: fill with median
      const sorted = [...nums].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      newRows.forEach((r) => {
        if (r[col] === null || r[col] === "" || r[col] === undefined)
          r[col] = med;
      });
    } else {
      // categorical: fill with mode
      const counts = new Map<string, number>();
      newRows.forEach((r) => {
        if (r[col] !== null && r[col] !== "" && r[col] !== undefined) {
          const k = String(r[col]);
          counts.set(k, (counts.get(k) || 0) + 1);
        }
      });
      const mode =
        [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
      newRows.forEach((r) => {
        if (r[col] === null || r[col] === "" || r[col] === undefined)
          r[col] = mode;
      });
    }
    return newRows;
  }

  if (suggestion.issue === "extra_spaces") {
    const col = suggestion.column;
    newRows.forEach((r) => {
      if (typeof r[col] === "string") r[col] = (r[col] as string).trim();
    });
    return newRows;
  }

  if (suggestion.issue === "mixed_case") {
    const col = suggestion.column;
    newRows.forEach((r) => {
      if (typeof r[col] === "string" && r[col] !== "") {
        const s = r[col] as string;
        r[col] = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      }
    });
    return newRows;
  }

  if (suggestion.issue === "outlier") {
    const col = suggestion.column;
    const nums = newRows
      .map((r) => toNumber(r[col]))
      .filter((v): v is number => v !== null);
    const sorted = [...nums].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    newRows.forEach((r) => {
      const v = toNumber(r[col]);
      if (v !== null) {
        if (v < lower) r[col] = lower;
        else if (v > upper) r[col] = upper;
      }
    });
    return newRows;
  }

  return newRows;
}

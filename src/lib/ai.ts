// AI assistant — natural language to analysis. Uses rule-based intelligence
// over the actual dataset so answers are grounded (no hallucination).
import type { Dataset, ChartSpec, DataRow } from "../types";
import { toNumber, mean, std, profileColumn, pearson } from "./analysis";

export interface AIResponse {
  content: string;
  reasoning?: string;
  code?: string;
  chart?: ChartSpec;
  table?: { columns: string[]; rows: DataRow[] };
}

function findColumn(dataset: Dataset, keywords: string[]): string | undefined {
  const cols = dataset.columns;
  for (const kw of keywords) {
    const match = cols.find((c) => c.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match;
  }
  return undefined;
}

function numericColumns(dataset: Dataset): string[] {
  return dataset.columns.filter((c) => {
    const vals = dataset.rows.slice(0, 50).map((r) => r[c]);
    return vals.filter((v) => toNumber(v) !== null).length > vals.length * 0.7;
  });
}

function categoricalColumns(dataset: Dataset): string[] {
  return dataset.columns.filter((c) => !numericColumns(dataset).includes(c));
}

export function generateAIResponse(
  dataset: Dataset,
  query: string,
): AIResponse {
  const q = query.toLowerCase();
  const numCols = numericColumns(dataset);
  const catCols = categoricalColumns(dataset);
  const profile = dataset.profile!;

  // ---- Top insights ----
  if (
    q.includes("top insight") ||
    q.includes("key insight") ||
    q.includes("summary") ||
    q.includes("overview")
  ) {
    const insights = profile.columnProfiles
      .filter((c) => c.type === "numeric" && !c.isLikelyId)
      .slice(0, 3);
    const lines = insights.map(
      (c) =>
        `• ${c.name}: avg ${c.mean?.toFixed(2)}, range [${c.min}, ${c.max}]`,
    );
    return {
      content: `Here are the top insights from ${dataset.name}:\n\n${lines.join("\n")}\n\nThe dataset contains ${profile.rows.toLocaleString()} rows across ${profile.columns} columns with a quality score of ${profile.qualityScore}/100.`,
      reasoning:
        "Scanned numeric column statistics from the profile to surface the most meaningful metrics.",
      code: `df.describe()`,
    };
  }

  // ---- Average / mean of X ----
  if (q.includes("average") || q.includes("mean") || q.includes("avg")) {
    const target = findColumn(dataset, numCols) || numCols[0];
    if (target) {
      const vals = dataset.rows
        .map((r) => toNumber(r[target]))
        .filter((v): v is number => v !== null);
      const avg = mean(vals);
      return {
        content: `The average ${target} is **${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}**.\n\nBased on ${vals.length.toLocaleString()} valid values (excluding ${profile.rows - vals.length} missing).`,
        reasoning: `Extracted numeric values from "${target}", filtered nulls, computed arithmetic mean.`,
        code: `df['${target}'].mean()`,
      };
    }
  }

  // ---- Group by / compare ----
  if (
    q.includes("by") ||
    q.includes("compare") ||
    q.includes("group") ||
    q.includes("which") ||
    q.includes("top")
  ) {
    // find a categorical and numeric column
    const catCol = findColumn(dataset, catCols) || catCols[0];
    const numCol = findColumn(dataset, numCols) || numCols[0];
    if (catCol && numCol) {
      const groups = new Map<string, number[]>();
      dataset.rows.forEach((r) => {
        const cat = String(r[catCol] ?? "N/A");
        const val = toNumber(r[numCol]);
        if (val !== null) {
          if (!groups.has(cat)) groups.set(cat, []);
          groups.get(cat)!.push(val);
        }
      });
      const agg = [...groups.entries()]
        .map(([cat, vals]) => ({
          category: cat,
          avg: mean(vals),
          total: vals.reduce((a, b) => a + b, 0),
          count: vals.length,
        }))
        .sort((a, b) => b.avg - a.avg);

      const top = agg[0];
      const chartData = agg
        .slice(0, 10)
        .map((a) => ({ x: a.category, y: Math.round(a.avg * 100) / 100 }));

      return {
        content: `**${numCol}** by **${catCol}**:\n\n${agg
          .slice(0, 5)
          .map(
            (a, i) =>
              `${i + 1}. ${a.category}: avg ${a.avg.toFixed(2)} (${a.count} records)`,
          )
          .join(
            "\n",
          )}\n\n${top ? `The highest is **${top.category}** with an average of ${top.avg.toFixed(2)}.` : ""}`,
        reasoning: `Grouped rows by "${catCol}", aggregated "${numCol}" using mean, sorted descending.`,
        code: `df.groupby('${catCol}')['${numCol}'].mean().sort_values(ascending=False)`,
        chart: {
          type: "bar",
          title: `${numCol} by ${catCol}`,
          xKey: "category",
          yKey: "avg",
          series: [{ name: numCol, data: chartData }],
        },
        table: {
          columns: ["Category", "Average", "Total", "Count"],
          rows: agg
            .slice(0, 10)
            .map((a) => ({
              Category: a.category,
              Average: a.avg.toFixed(2),
              Total: a.total.toFixed(2),
              Count: a.count,
            })),
        },
      };
    }
  }

  // ---- Correlation ----
  if (
    q.includes("correlation") ||
    q.includes("relationship") ||
    q.includes("correlate")
  ) {
    let best = { a: "", b: "", r: 0 };
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const pairs: [number, number][] = [];
        dataset.rows.forEach((r) => {
          const a = toNumber(r[numCols[i]]);
          const b = toNumber(r[numCols[j]]);
          if (a !== null && b !== null) pairs.push([a, b]);
        });
        if (pairs.length > 3) {
          const r = pearson(
            pairs.map((p) => p[0]),
            pairs.map((p) => p[1]),
          );
          if (Math.abs(r) > Math.abs(best.r))
            best = { a: numCols[i], b: numCols[j], r };
        }
      }
    }
    if (best.a) {
      const direction = best.r > 0 ? "positive" : "negative";
      const strength =
        Math.abs(best.r) > 0.7
          ? "strong"
          : Math.abs(best.r) > 0.4
            ? "moderate"
            : "weak";
      return {
        content: `The strongest correlation is between **${best.a}** and **${best.b}** (r = ${best.r.toFixed(3)}).\n\nThis is a ${strength} ${direction} relationship — as ${best.a} ${direction === "positive" ? "increases" : "decreases"}, ${best.b} tends to ${direction === "positive" ? "increase" : "decrease"}.`,
        reasoning:
          "Computed Pearson correlation between all numeric column pairs, selected the pair with the highest absolute coefficient.",
        code: `df.corr()`,
      };
    }
  }

  // ---- Anomalies / outliers ----
  if (q.includes("anomal") || q.includes("outlier") || q.includes("unusual")) {
    const col = findColumn(dataset, numCols) || numCols[0];
    if (col) {
      const vals = dataset.rows
        .map((r) => toNumber(r[col]))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const anomalies = dataset.rows.filter((r) => {
        const v = toNumber(r[col]);
        return v !== null && (v < lower || v > upper);
      });
      return {
        content: `Found **${anomalies.length}** potential anomalies in **${col}** using the IQR method.\n\nValues below ${lower.toFixed(2)} or above ${upper.toFixed(2)} are considered unusual. These may represent data errors or genuinely extreme cases.`,
        reasoning: `Applied the 1.5×IQR rule: computed Q1=${q1.toFixed(2)}, Q3=${q3.toFixed(2)}, IQR=${iqr.toFixed(2)}, flagged values outside [${lower.toFixed(2)}, ${upper.toFixed(2)}].`,
        code: `Q1 = df['${col}'].quantile(0.25)\nQ3 = df['${col}'].quantile(0.75)\nIQR = Q3 - Q1\nanomalies = df[(df['${col}'] < Q1 - 1.5*IQR) | (df['${col}'] > Q3 + 1.5*IQR)]`,
        table: {
          columns: dataset.columns.slice(0, 5),
          rows: anomalies.slice(0, 10),
        },
      };
    }
  }

  // ---- Predict / forecast ----
  if (q.includes("predict") || q.includes("forecast") || q.includes("future")) {
    const dateCol = profile.columnProfiles.find((c) => c.type === "datetime");
    const numCol = numCols[0];
    if (dateCol && numCol) {
      return {
        content: `I can forecast **${numCol}** using the time dimension **${dateCol.name}**.\n\nNavigate to the **Forecasting** page to see the full trend analysis, seasonality detection, and ${12}-period predictions with confidence intervals.`,
        reasoning: `Detected datetime column "${dateCol.name}" and numeric target "${numCol}". A linear trend model with seasonal decomposition is available.`,
        code: `from prophet import Prophet\nm = Prophet()\nm.fit(df[['${dateCol.name}', '${numCol}']].rename(columns={'${dateCol.name}':'ds','${numCol}':'y'}))\nfuture = m.make_future_dataframe(periods=12)\nforecast = m.predict(future)`,
      };
    }
    return {
      content: `Forecasting requires a date/time column. I couldn't find one in this dataset. If you have a time dimension, ensure it's formatted as a date (e.g., YYYY-MM-DD).`,
    };
  }

  // ---- Distribution ----
  if (
    q.includes("distribution") ||
    q.includes("spread") ||
    q.includes("histogram")
  ) {
    const col = findColumn(dataset, numCols) || numCols[0];
    if (col) {
      const vals = dataset.rows
        .map((r) => toNumber(r[col]))
        .filter((v): v is number => v !== null);
      const m = mean(vals);
      const s = std(vals);
      return {
        content: `**${col}** distribution:\n• Mean: ${m.toFixed(2)}\n• Std Dev: ${s.toFixed(2)}\n• Min: ${Math.min(...vals).toFixed(2)}\n• Max: ${Math.max(...vals).toFixed(2)}\n\nThe data is ${s > m * 0.5 ? "highly" : "moderately"} spread around the mean.`,
        reasoning:
          "Computed descriptive statistics and assessed the coefficient of variation.",
        code: `df['${col}'].describe()`,
        chart: {
          type: "histogram",
          title: `Distribution of ${col}`,
          xKey: col,
          data: dataset.rows,
        },
      };
    }
  }

  // ---- Describe / what is ----
  if (
    q.includes("describe") ||
    q.includes("what is") ||
    q.includes("tell me about")
  ) {
    const col = findColumn(dataset, dataset.columns);
    if (col) {
      const cp = profileColumn(
        col,
        dataset.rows.map((r) => r[col]),
      );
      return {
        content: `**${col}** is a ${cp.type} column with ${cp.unique} unique values.\n${cp.missing > 0 ? `${cp.missing} missing values (${cp.missingPct.toFixed(1)}%).` : "No missing values."}\n${cp.type === "numeric" ? `Range: ${cp.min} to ${cp.max}, mean ${cp.mean?.toFixed(2)}.` : `Most common: ${cp.topValues?.[0]?.value} (${cp.topValues?.[0]?.count} times).`}`,
        reasoning:
          "Profiled the requested column to determine type, cardinality, and key statistics.",
        code: `df['${col}'].describe()`,
      };
    }
  }

  // ---- Default ----
  return {
    content: `I can analyze "${dataset.name}" in many ways. Try asking:\n\n• "What are the top insights?"\n• "Show average ${numCols[0] || "value"} by ${catCols[0] || "category"}"\n• "Find correlations"\n• "Detect anomalies"\n• "Predict future ${numCols[0] || "values"}"\n• "Show the distribution of ${numCols[0] || "a column"}"`,
    reasoning:
      "No specific intent matched. Providing guided suggestions based on available columns.",
  };
}

// ---- SQL generation ----
export function generateSQL(
  dataset: Dataset,
  query: string,
): { sql: string; explanation: string } {
  const q = query.toLowerCase();
  const numCols = dataset.columns.filter((c) => {
    return (
      dataset.rows
        .slice(0, 50)
        .map((r) => toNumber(r[c]))
        .filter((v) => v !== null).length > 25
    );
  });
  const catCols = dataset.columns.filter((c) => !numCols.includes(c));
  const tableName = dataset.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  if (q.includes("average") || q.includes("avg") || q.includes("mean")) {
    const num = numCols[0] || "*";
    const cat = catCols[0] || numCols[0] || "*";
    return {
      sql: `SELECT ${cat}, AVG(${num}) AS avg_${num}\nFROM ${tableName}\nGROUP BY ${cat}\nORDER BY avg_${num} DESC;`,
      explanation: `Groups rows by ${cat} and calculates the average of ${num}, sorted from highest to lowest.`,
    };
  }
  if (q.includes("top") || q.includes("highest") || q.includes("best")) {
    const num = numCols[0] || "*";
    return {
      sql: `SELECT *\nFROM ${tableName}\nORDER BY ${num} DESC\nLIMIT 10;`,
      explanation: `Returns the top 10 records sorted by ${num} in descending order.`,
    };
  }
  if (q.includes("count") || q.includes("how many")) {
    const cat = catCols[0] || "*";
    return {
      sql: `SELECT ${cat}, COUNT(*) AS count\nFROM ${tableName}\nGROUP BY ${cat}\nORDER BY count DESC;`,
      explanation: `Counts records per ${cat} category, sorted by frequency.`,
    };
  }
  if (q.includes("sum") || q.includes("total")) {
    const num = numCols[0] || "*";
    const cat = catCols[0] || "*";
    return {
      sql: `SELECT ${cat}, SUM(${num}) AS total_${num}\nFROM ${tableName}\nGROUP BY ${cat}\nORDER BY total_${num} DESC;`,
      explanation: `Sums ${num} for each ${cat} group, sorted by total.`,
    };
  }
  // default: select all
  return {
    sql: `SELECT *\nFROM ${tableName}\nLIMIT 100;`,
    explanation: `Returns the first 100 rows from ${tableName}.`,
  };
}

// ---- Execute SQL-like query (subset) ----
export function executeSQL(
  dataset: Dataset,
  sql: string,
): { columns: string[]; rows: DataRow[]; error?: string } {
  try {
    const trimmed = sql.trim().replace(/;$/, "");
    // Very small SQL engine: SELECT [cols] FROM table [WHERE cond] [GROUP BY col] [ORDER BY col DESC|ASC] [LIMIT n]
    const selectMatch = trimmed.match(
      /^select\s+(.+?)\s+from\s+\w+(?:\s+where\s+(.+?))?(?:\s+group\s+by\s+(\w+))?(?:\s+order\s+by\s+(\w+)\s+(desc|asc))?(?:\s+limit\s+(\d+))?$/i,
    );
    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        error:
          "Unsupported SQL. Use: SELECT cols FROM table [WHERE] [GROUP BY] [ORDER BY] [LIMIT]",
      };
    }
    const [, selectPart, wherePart, groupPart, orderPart, orderDir, limitPart] =
      selectMatch;
    let rows = [...dataset.rows];

    // WHERE
    if (wherePart) {
      const cond = wherePart.match(
        /(\w+)\s*(=|>|<|>=|<=|!=)\s*(.+?)(?:\s+group|\s+order|\s+limit|$)/i,
      );
      if (cond) {
        const [, col, op, val] = cond;
        const cleanVal = val.replace(/['"]/g, "").trim();
        const numVal = Number(cleanVal);
        rows = rows.filter((r) => {
          const cell = r[col];
          if (cell === null || cell === undefined) return false;
          const cellNum = toNumber(cell);
          if (cellNum !== null && !isNaN(numVal)) {
            switch (op) {
              case "=":
                return cellNum === numVal;
              case ">":
                return cellNum > numVal;
              case "<":
                return cellNum < numVal;
              case ">=":
                return cellNum >= numVal;
              case "<=":
                return cellNum <= numVal;
              case "!=":
                return cellNum !== numVal;
            }
          }
          const cellStr = String(cell);
          switch (op) {
            case "=":
              return cellStr === cleanVal;
            case "!=":
              return cellStr !== cleanVal;
            default:
              return false;
          }
        });
      }
    }

    let resultRows: DataRow[] = rows;
    let resultColumns: string[] = dataset.columns;

    // GROUP BY with aggregates
    if (groupPart) {
      const aggMatch = selectPart.match(
        /(avg|sum|count|min|max)\s*\(\s*(\*|\w+)\s*\)/i,
      );
      const aggFn = aggMatch?.[1]?.toLowerCase();
      const aggCol = aggMatch?.[2];
      const groups = new Map<string, DataRow[]>();
      rows.forEach((r) => {
        const key = String(r[groupPart] ?? "NULL");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      });
      resultRows = [...groups.entries()].map(([key, groupRows]) => {
        let val = 0;
        if (aggFn === "count") val = groupRows.length;
        else if (aggFn && aggCol) {
          const nums = groupRows
            .map((r) => toNumber(r[aggCol]))
            .filter((v): v is number => v !== null);
          if (aggFn === "sum") val = nums.reduce((a, b) => a + b, 0);
          else if (aggFn === "avg") val = mean(nums);
          else if (aggFn === "min") val = Math.min(...nums);
          else if (aggFn === "max") val = Math.max(...nums);
        }
        return {
          [groupPart]: key,
          [selectPart.replace(/.*as\s+/i, "").trim() || "value"]: val,
        } as DataRow;
      });
      resultColumns = [
        groupPart,
        selectPart.replace(/.*as\s+/i, "").trim() || "value",
      ];
    } else if (selectPart.trim() !== "*") {
      const cols = selectPart.split(",").map((c) =>
        c
          .trim()
          .split(/\s+as\s+/i)[0]
          .trim(),
      );
      resultColumns = cols;
      resultRows = rows.map((r) => {
        const newRow: DataRow = {};
        cols.forEach((c) => (newRow[c] = r[c]));
        return newRow;
      });
    }

    // ORDER BY
    if (orderPart) {
      const dir = orderDir?.toLowerCase() === "desc" ? -1 : 1;
      resultRows.sort((a, b) => {
        const av = toNumber(a[orderPart]) ?? String(a[orderPart] ?? "");
        const bv = toNumber(b[orderPart]) ?? String(b[orderPart] ?? "");
        if (typeof av === "number" && typeof bv === "number")
          return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    // LIMIT
    if (limitPart) {
      resultRows = resultRows.slice(0, parseInt(limitPart, 10));
    }

    return { columns: resultColumns, rows: resultRows };
  } catch (e) {
    return {
      columns: [],
      rows: [],
      error: `Execution error: ${(e as Error).message}`,
    };
  }
}

// ---- AI dataset summary (auto-generated) ----
export function generateDatasetSummary(dataset: Dataset): string {
  const p = dataset.profile!;
  const numCols = p.columnProfiles.filter(
    (c) => c.type === "numeric" && !c.isLikelyId,
  );
  const catCols = p.columnProfiles.filter(
    (c) => c.type === "categorical" && !c.isLikelyId && c.unique < 50,
  );
  const dateCols = p.columnProfiles.filter((c) => c.type === "datetime");

  const parts: string[] = [];
  parts.push(
    `This ${dataset.name} dataset contains **${p.rows.toLocaleString()} rows** across **${p.columns} columns**`,
  );

  const colTypes: string[] = [];
  if (numCols.length) colTypes.push(`${numCols.length} numeric`);
  if (catCols.length) colTypes.push(`${catCols.length} categorical`);
  if (dateCols.length) colTypes.push(`${dateCols.length} datetime`);
  if (colTypes.length) parts.push(`including ${colTypes.join(", ")} fields`);

  if (catCols.length > 0) {
    parts.push(
      `covering attributes like ${catCols
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}`,
    );
  }
  if (numCols.length > 0) {
    parts.push(
      `and metrics such as ${numCols
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}`,
    );
  }
  parts.push(".");

  if (p.missingPct < 1 && p.duplicatePct < 1) {
    parts.push(
      `The dataset has **excellent quality** with a score of ${p.qualityScore}/100, minimal missing values, and no duplicate rows.`,
    );
  } else if (p.qualityScore >= 80) {
    parts.push(
      `Data quality is good (score: ${p.qualityScore}/100) with ${p.missingPct.toFixed(1)}% missing values.`,
    );
  } else {
    parts.push(
      `Data quality needs attention (score: ${p.qualityScore}/100) — ${p.missingPct.toFixed(1)}% missing values and ${p.duplicateRows} duplicate rows detected.`,
    );
  }

  // strongest correlation
  let best = { a: "", b: "", r: 0 };
  for (let i = 0; i < p.correlations.columns.length; i++) {
    for (let j = i + 1; j < p.correlations.columns.length; j++) {
      const r = p.correlations.matrix[i][j];
      if (Math.abs(r) > Math.abs(best.r) && Math.abs(r) > 0.5) {
        best = {
          a: p.correlations.columns[i],
          b: p.correlations.columns[j],
          r,
        };
      }
    }
  }
  if (best.a) {
    parts.push(
      `${best.a} has a ${best.r > 0 ? "positive" : "negative"} relationship with ${best.b} (r=${best.r.toFixed(2)}).`,
    );
  }

  // top category
  if (catCols.length > 0 && catCols[0].topValues) {
    const top = catCols[0].topValues[0];
    if (top) {
      parts.push(
        `${catCols[0].name} "${top.value}" is the most frequent category (${top.count} records).`,
      );
    }
  }

  return parts.join(" ");
}

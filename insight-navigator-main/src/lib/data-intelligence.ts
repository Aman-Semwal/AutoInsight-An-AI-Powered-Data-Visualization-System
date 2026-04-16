import type { ParsedData } from "@/lib/file-parsers";

export type ColumnType = "numeric" | "categorical" | "date" | "boolean" | "text";

export interface ChartSuggestion {
  id: string;
  title: string;
  type: string;
  reason: string;
  xAxis?: string;
  yAxis?: string;
  priority: "high" | "medium" | "low";
}

export interface InsightBullet {
  type: "trend" | "anomaly" | "correlation" | "summary" | "recommendation";
  severity: "info" | "warning" | "critical";
  title: string;
  text: string;
  metric?: string;
}

export interface QualityIssue {
  type: "null" | "outlier" | "format";
  column: string;
  severity: "info" | "warning" | "critical";
  count?: number;
  message: string;
}

export interface DatasetQualityReport {
  columnTypes: Record<string, ColumnType>;
  summary: {
    rows: number;
    columns: number;
    missingValues: number;
    duplicateRows: number;
    completeness: number;
  };
  missingByColumn: Record<string, number>;
  issues: QualityIssue[];
  suggestions: ChartSuggestion[];
  insights: InsightBullet[];
  statsByColumn: Record<string, { unique: number; sampleValues: string[] }>;
}

type CleaningAction = "remove_nulls" | "fill_missing_values" | "normalize_data";

const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "1", "0"]);

const isEmpty = (value: string | null | undefined) => value == null || value.trim() === "";
const normalizeText = (value: string) => value.trim();
const isNumeric = (value: string) => !isEmpty(value) && Number.isFinite(Number(value));
const isDateLike = (value: string) => !isEmpty(value) && !Number.isNaN(Date.parse(value));

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < x.length; i += 1) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff ** 2;
    yDenominator += yDiff ** 2;
  }

  if (xDenominator === 0 || yDenominator === 0) return 0;
  return numerator / Math.sqrt(xDenominator * yDenominator);
}

function inferColumnType(values: string[]): ColumnType {
  const normalized = values.filter((value) => !isEmpty(value)).map(normalizeText);
  if (!normalized.length) return "categorical";

  const numericRate = normalized.filter(isNumeric).length / normalized.length;
  const dateRate = normalized.filter(isDateLike).length / normalized.length;
  const booleanRate = normalized.filter((value) => BOOLEAN_VALUES.has(value.toLowerCase())).length / normalized.length;
  const uniqueCount = new Set(normalized.map((value) => value.toLowerCase())).size;
  const uniqueRatio = uniqueCount / normalized.length;

  if (booleanRate >= 0.8) return "boolean";
  if (numericRate >= 0.8) return "numeric";
  if (dateRate >= 0.8) return "date";
  if (uniqueCount <= 12 || uniqueRatio <= 0.35) return "categorical";
  return "text";
}

export function analyzeParsedData(parsed: ParsedData, overrides?: Partial<Record<string, ColumnType>>): DatasetQualityReport {
  const columnTypes = Object.fromEntries(
    parsed.columns.map((column) => {
      const values = parsed.rows.map((row) => String(row[column] ?? ""));
      return [column, overrides?.[column] ?? inferColumnType(values)];
    }),
  ) as Record<string, ColumnType>;

  const missingByColumn = Object.fromEntries(
    parsed.columns.map((column) => [column, parsed.rows.filter((row) => isEmpty(String(row[column] ?? ""))).length]),
  ) as Record<string, number>;

  const duplicateRows = parsed.rows.length - new Set(parsed.rows.map((row) => JSON.stringify(row))).size;
  const missingValues = Object.values(missingByColumn).reduce((sum, value) => sum + value, 0);
  const totalCells = Math.max(parsed.rows.length * Math.max(parsed.columns.length, 1), 1);
  const completeness = Math.max(0, Math.round(((totalCells - missingValues) / totalCells) * 100));

  const issues: QualityIssue[] = [];
  const statsByColumn: DatasetQualityReport["statsByColumn"] = {};

  parsed.columns.forEach((column) => {
    const values = parsed.rows.map((row) => String(row[column] ?? ""));
    const normalized = values.map(normalizeText);
    const nonEmpty = normalized.filter((value) => !isEmpty(value));
    const uniqueValues = [...new Set(nonEmpty)];
    statsByColumn[column] = {
      unique: uniqueValues.length,
      sampleValues: uniqueValues.slice(0, 4),
    };

    if (missingByColumn[column] > 0) {
      issues.push({
        type: "null",
        column,
        severity: missingByColumn[column] / Math.max(parsed.rows.length, 1) > 0.25 ? "critical" : "warning",
        count: missingByColumn[column],
        message: `${missingByColumn[column]} missing values found in ${column}`,
      });
    }

    if (columnTypes[column] === "numeric") {
      const numbers = nonEmpty.filter(isNumeric).map(Number).sort((a, b) => a - b);
      if (numbers.length >= 4) {
        const q1 = percentile(numbers, 0.25);
        const q3 = percentile(numbers, 0.75);
        const iqr = q3 - q1;
        const min = q1 - 1.5 * iqr;
        const max = q3 + 1.5 * iqr;
        const outlierCount = numbers.filter((value) => value < min || value > max).length;
        if (outlierCount > 0) {
          issues.push({
            type: "outlier",
            column,
            severity: outlierCount / numbers.length > 0.1 ? "warning" : "info",
            count: outlierCount,
            message: `${outlierCount} possible outliers detected in ${column}`,
          });
        }
      }

      const invalidCount = normalized.filter((value) => !isEmpty(value) && !isNumeric(value)).length;
      if (invalidCount > 0) {
        issues.push({
          type: "format",
          column,
          severity: "warning",
          count: invalidCount,
          message: `${invalidCount} values use inconsistent numeric formatting in ${column}`,
        });
      }
    }

    if (columnTypes[column] === "date") {
      const invalidCount = normalized.filter((value) => !isEmpty(value) && !isDateLike(value)).length;
      if (invalidCount > 0) {
        issues.push({
          type: "format",
          column,
          severity: "warning",
          count: invalidCount,
          message: `${invalidCount} values in ${column} look inconsistent for dates`,
        });
      }
    }

    if (columnTypes[column] === "categorical") {
      const lowercaseMap = new Map<string, Set<string>>();
      nonEmpty.forEach((value) => {
        const key = value.toLowerCase();
        if (!lowercaseMap.has(key)) lowercaseMap.set(key, new Set());
        lowercaseMap.get(key)?.add(value);
      });
      const inconsistentLabels = [...lowercaseMap.values()].filter((variants) => variants.size > 1).length;
      if (inconsistentLabels > 0) {
        issues.push({
          type: "format",
          column,
          severity: "info",
          count: inconsistentLabels,
          message: `${inconsistentLabels} label groups in ${column} have inconsistent casing or spacing`,
        });
      }
    }
  });

  const numericColumns = parsed.columns.filter((column) => columnTypes[column] === "numeric");
  const categoricalColumns = parsed.columns.filter((column) => columnTypes[column] === "categorical");
  const dateColumns = parsed.columns.filter((column) => columnTypes[column] === "date");

  const suggestions: ChartSuggestion[] = [];
  if (dateColumns[0] && numericColumns[0]) {
    suggestions.push({
      id: `line-${dateColumns[0]}-${numericColumns[0]}`,
      title: `Line chart for ${numericColumns[0]} over ${dateColumns[0]}`,
      type: "line",
      reason: "Best for spotting time-based trends and momentum.",
      xAxis: dateColumns[0],
      yAxis: numericColumns[0],
      priority: "high",
    });
  }
  if (categoricalColumns[0] && numericColumns[0]) {
    suggestions.push({
      id: `bar-${categoricalColumns[0]}-${numericColumns[0]}`,
      title: `Bar chart for ${categoricalColumns[0]} vs ${numericColumns[0]}`,
      type: "bar",
      reason: "Useful for comparing magnitude across categories.",
      xAxis: categoricalColumns[0],
      yAxis: numericColumns[0],
      priority: "high",
    });
  }
  if (numericColumns.length >= 2) {
    suggestions.push({
      id: `scatter-${numericColumns[0]}-${numericColumns[1]}`,
      title: `Scatter plot for ${numericColumns[0]} vs ${numericColumns[1]}`,
      type: "scatter",
      reason: "Great for revealing correlations and clusters.",
      xAxis: numericColumns[0],
      yAxis: numericColumns[1],
      priority: "medium",
    });
  }
  if (categoricalColumns[0] && !numericColumns.length) {
    suggestions.push({
      id: `pie-${categoricalColumns[0]}`,
      title: `Pie chart for ${categoricalColumns[0]} distribution`,
      type: "pie",
      reason: "Works well for showing category share of total rows.",
      xAxis: categoricalColumns[0],
      priority: "medium",
    });
  }
  if (numericColumns[0]) {
    suggestions.push({
      id: `histogram-${numericColumns[0]}`,
      title: `Histogram for ${numericColumns[0]}`,
      type: "histogram",
      reason: "Highlights spread, skew, and unusual concentrations.",
      xAxis: numericColumns[0],
      priority: "low",
    });
  }

  const insights: InsightBullet[] = [
    {
      type: "summary",
      severity: "info",
      title: "Dataset shape",
      text: `${parsed.totalRows.toLocaleString()} rows across ${parsed.columns.length} columns were detected immediately after upload.`,
      metric: `${completeness}% complete`,
    },
  ];

  if (duplicateRows > 0) {
    insights.push({
      type: "anomaly",
      severity: duplicateRows / Math.max(parsed.totalRows, 1) > 0.1 ? "critical" : "warning",
      title: "Duplicate records found",
      text: `${duplicateRows.toLocaleString()} rows appear duplicated and may distort aggregations or chart totals.`,
      metric: `${duplicateRows}`,
    });
  }

  const worstMissing = [...Object.entries(missingByColumn)].sort((a, b) => b[1] - a[1])[0];
  if (worstMissing && worstMissing[1] > 0) {
    insights.push({
      type: "recommendation",
      severity: worstMissing[1] / Math.max(parsed.totalRows, 1) > 0.25 ? "critical" : "warning",
      title: "Missing data hotspot",
      text: `${worstMissing[0]} has the highest missing-value count, so cleaning it first will improve chart reliability.`,
      metric: `${worstMissing[1]} blanks`,
    });
  }

  if (numericColumns[0]) {
    const numbers = parsed.rows.map((row) => Number(row[numericColumns[0]])).filter((value) => Number.isFinite(value));
    if (numbers.length > 1) {
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const avg = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      insights.push({
        type: "trend",
        severity: "info",
        title: `${numericColumns[0]} spread`,
        text: `${numericColumns[0]} ranges from ${min.toLocaleString()} to ${max.toLocaleString()}, with an average around ${avg.toFixed(2)}.`,
        metric: `${(max - min).toLocaleString()} range`,
      });
    }
  }

  if (numericColumns.length >= 2) {
    const paired = parsed.rows
      .map((row) => [Number(row[numericColumns[0]]), Number(row[numericColumns[1]])] as const)
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    if (paired.length >= 3) {
      const correlation = pearson(
        paired.map(([a]) => a),
        paired.map(([, b]) => b),
      );
      if (Math.abs(correlation) >= 0.5) {
        insights.push({
          type: "correlation",
          severity: Math.abs(correlation) >= 0.8 ? "warning" : "info",
          title: "Potential numeric relationship",
          text: `${numericColumns[0]} and ${numericColumns[1]} move ${correlation > 0 ? "together" : "in opposite directions"} strongly enough to justify a scatter or composed chart.`,
          metric: correlation.toFixed(2),
        });
      }
    }
  }

  if (categoricalColumns[0]) {
    const counts = new Map<string, number>();
    parsed.rows.forEach((row) => {
      const value = normalizeText(String(row[categoricalColumns[0]] ?? ""));
      if (!isEmpty(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    const topCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push({
        type: "trend",
        severity: "info",
        title: `Top ${categoricalColumns[0]} segment`,
        text: `${topCategory[0]} is currently the most frequent value in ${categoricalColumns[0]}.`,
        metric: `${topCategory[1]} rows`,
      });
    }
  }

  return {
    columnTypes,
    summary: {
      rows: parsed.totalRows,
      columns: parsed.columns.length,
      missingValues,
      duplicateRows,
      completeness,
    },
    missingByColumn,
    issues,
    suggestions,
    insights: insights.slice(0, 6),
    statsByColumn,
  };
}

export function applyCleaningAction(
  parsed: ParsedData,
  report: DatasetQualityReport,
  action: CleaningAction,
): ParsedData {
  if (action === "remove_nulls") {
    const rows = parsed.rows.filter((row) => parsed.columns.every((column) => !isEmpty(String(row[column] ?? ""))));
    return { ...parsed, rows, totalRows: rows.length };
  }

  if (action === "fill_missing_values") {
    const fillers = Object.fromEntries(
      parsed.columns.map((column) => {
        const values = parsed.rows.map((row) => String(row[column] ?? "")).filter((value) => !isEmpty(value));
        if (!values.length) return [column, ""];

        if (report.columnTypes[column] === "numeric") {
          const numbers = values.filter(isNumeric).map(Number);
          const avg = numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
          return [column, String(Number.isFinite(avg) ? Number(avg.toFixed(2)) : 0)];
        }

        const frequencies = new Map<string, number>();
        values.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1));
        return [column, [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""];
      }),
    );

    const rows = parsed.rows.map((row) =>
      Object.fromEntries(parsed.columns.map((column) => [column, isEmpty(String(row[column] ?? "")) ? fillers[column] : String(row[column] ?? "")])) as Record<string, string>,
    );
    return { ...parsed, rows, totalRows: rows.length };
  }

  const rows = parsed.rows.map((row) =>
    Object.fromEntries(
      parsed.columns.map((column) => {
        const raw = String(row[column] ?? "");
        if (isEmpty(raw)) return [column, ""];
        if (report.columnTypes[column] === "date" && isDateLike(raw)) return [column, new Date(raw).toISOString().slice(0, 10)];
        if (report.columnTypes[column] === "numeric" && isNumeric(raw)) return [column, String(Number(raw))];
        return [column, normalizeText(raw).replace(/\s+/g, " ")];
      }),
    ) as Record<string, string>,
  );

  return { ...parsed, rows, totalRows: rows.length };
}

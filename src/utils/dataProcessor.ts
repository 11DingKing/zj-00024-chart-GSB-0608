import { compile } from "expression-eval";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import type {
  DataField,
  FieldType,
  AggregationType,
  Filter,
  BucketConfig,
  DataSource,
} from "../types";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

export function evaluateExpression(
  expression: string,
  row: Record<string, any>,
): any {
  try {
    const compiled = compile(expression);
    return compiled(row);
  } catch (e) {
    console.error("Expression evaluation error:", e);
    return null;
  }
}

export function applyComputedFields(
  dataSource: DataSource,
  computedFields: DataField[],
): DataSource {
  const newFields = [...dataSource.fields];
  const newRows = dataSource.rows.map((row) => {
    const newRow = { ...row };
    computedFields.forEach((field) => {
      if (field.expression) {
        newRow[field.name] = evaluateExpression(field.expression, row);
      }
    });
    return newRow;
  });

  return {
    ...dataSource,
    fields: [...newFields, ...computedFields],
    rows: newRows,
  };
}

export function applyBuckets(
  dataSource: DataSource,
  fieldName: string,
  bucketConfig: BucketConfig,
): DataSource {
  const field = dataSource.fields.find((f) => f.name === fieldName);
  if (!field) return dataSource;

  const bucketFieldName = `${fieldName}_bucket`;

  const newFields = dataSource.fields.map((f) => {
    if (f.name === fieldName) {
      return { ...f, bucketed: true, bucketConfig };
    }
    return f;
  });

  const newRows = dataSource.rows.map((row) => {
    const value = row[fieldName];
    let bucketValue: string | null = null;

    if (value !== null && value !== undefined) {
      if (bucketConfig.type === "range" && bucketConfig.ranges) {
        for (const range of bucketConfig.ranges) {
          if (value >= range.min && value < range.max) {
            bucketValue = range.label;
            break;
          }
        }
      } else if (["year", "month", "day", "week"].includes(bucketConfig.type)) {
        const date = dayjs(value);
        if (date.isValid()) {
          switch (bucketConfig.type) {
            case "year":
              bucketValue = date.format("YYYY");
              break;
            case "month":
              bucketValue = date.format("YYYY-MM");
              break;
            case "day":
              bucketValue = date.format("YYYY-MM-DD");
              break;
            case "week":
              bucketValue = `${date.year()}-W${date.week()}`;
              break;
          }
        }
      }
    }

    return {
      ...row,
      [bucketFieldName]: bucketValue,
    };
  });

  if (!newFields.find((f) => f.name === bucketFieldName)) {
    newFields.push({
      name: bucketFieldName,
      type: "text",
      bucketed: true,
      bucketConfig,
    });
  }

  return {
    ...dataSource,
    fields: newFields,
    rows: newRows,
  };
}

export function applyFilters(
  rows: Record<string, any>[],
  filters: Filter[],
): Record<string, any>[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) => {
    return filters.every((filter) => {
      const value = row[filter.field];

      switch (filter.type) {
        case "range":
          if (value === null || value === undefined) return false;
          if (filter.min !== undefined && value < filter.min) return false;
          if (filter.max !== undefined && value > filter.max) return false;
          return true;

        case "enum":
          if (!filter.values || filter.values.length === 0) return true;
          return filter.values.includes(String(value));

        case "fuzzy":
          if (!filter.pattern) return true;
          if (value === null || value === undefined) return false;
          return String(value)
            .toLowerCase()
            .includes(filter.pattern.toLowerCase());

        default:
          return true;
      }
    });
  });
}

export function aggregateValues(values: any[], type: AggregationType): number {
  const numericValues = values.map((v) => Number(v)).filter((v) => !isNaN(v));

  if (numericValues.length === 0) return 0;

  switch (type) {
    case "sum":
      return numericValues.reduce((a, b) => a + b, 0);
    case "avg":
      return numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    case "max":
      return Math.max(...numericValues);
    case "min":
      return Math.min(...numericValues);
    case "count":
      return values.length;
    case "distinctCount":
      return new Set(values.map((v) => String(v))).size;
    default:
      return 0;
  }
}

export function groupAndAggregate(
  rows: Record<string, any>[],
  groupFields: string[],
  valueFields: Array<{ field: string; aggregation: AggregationType }>,
): Array<Record<string, any>> {
  const groups = new Map<string, Record<string, any>>();

  rows.forEach((row) => {
    const groupKey = groupFields
      .map((f) => String(row[f] ?? "null"))
      .join("|||");

    if (!groups.has(groupKey)) {
      const group: Record<string, any> = {};
      groupFields.forEach((f) => {
        group[f] = row[f];
      });
      valueFields.forEach((vf) => {
        group[vf.field] = [];
      });
      groups.set(groupKey, group);
    }

    const group = groups.get(groupKey)!;
    valueFields.forEach((vf) => {
      group[vf.field].push(row[vf.field]);
    });
  });

  return Array.from(groups.values()).map((group) => {
    const result: Record<string, any> = { ...group };
    valueFields.forEach((vf) => {
      const values = group[vf.field];
      result[vf.field] = aggregateValues(values, vf.aggregation);
    });
    return result;
  });
}

export function convertFieldType(
  dataSource: DataSource,
  fieldName: string,
  newType: FieldType,
): DataSource {
  const newFields = dataSource.fields.map((f) => {
    if (f.name === fieldName) {
      return {
        ...f,
        type: newType,
        originalType: f.originalType ?? f.type,
      };
    }
    return f;
  });

  const newRows = dataSource.rows.map((row) => {
    const value = row[fieldName];
    let convertedValue: any = value;

    if (value !== null && value !== undefined) {
      switch (newType) {
        case "number":
          const num = Number(value);
          convertedValue = isNaN(num) ? null : num;
          break;
        case "boolean":
          const str = String(value).toLowerCase();
          convertedValue = str === "true" || str === "yes" || str === "1";
          break;
        case "date":
          const date = new Date(value);
          convertedValue = isNaN(date.getTime()) ? null : date.toISOString();
          break;
        case "text":
          convertedValue = String(value);
          break;
      }
    }

    return {
      ...row,
      [fieldName]: convertedValue,
    };
  });

  return {
    ...dataSource,
    fields: newFields,
    rows: newRows,
  };
}

export function prepareChartData(
  dataSource: DataSource,
  slots: {
    x: { fieldName: string } | null;
    y: Array<{ fieldName: string; aggregation?: AggregationType }>;
    group: { fieldName: string } | null;
    legend: { fieldName: string } | null;
    metric: { fieldName: string; aggregation?: AggregationType } | null;
    filters: Filter[];
  },
): {
  categories: any[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  rawData: Record<string, any>[];
} {
  let processedRows = applyFilters(dataSource.rows, slots.filters);

  const groupFields: string[] = [];
  if (slots.x) groupFields.push(slots.x.fieldName);
  if (slots.group) groupFields.push(slots.group.fieldName);
  if (slots.legend) groupFields.push(slots.legend.fieldName);

  const valueFields: Array<{ field: string; aggregation: AggregationType }> =
    [];
  slots.y.forEach((y) => {
    valueFields.push({
      field: y.fieldName,
      aggregation: y.aggregation || "sum",
    });
  });
  if (slots.metric) {
    valueFields.push({
      field: slots.metric.fieldName,
      aggregation: slots.metric.aggregation || "sum",
    });
  }

  let aggregatedData: Record<string, any>[];
  if (groupFields.length > 0 && valueFields.length > 0) {
    aggregatedData = groupAndAggregate(processedRows, groupFields, valueFields);
  } else {
    aggregatedData = processedRows;
  }

  const categories: any[] = [];
  const seriesMap = new Map<string, number[]>();

  if (slots.x) {
    const uniqueCategories = [
      ...new Set(aggregatedData.map((d) => d[slots.x!.fieldName])),
    ];
    categories.push(...uniqueCategories);

    const legendField = slots.legend?.fieldName || slots.group?.fieldName;
    if (legendField) {
      const uniqueLegends = [
        ...new Set(aggregatedData.map((d) => d[legendField])),
      ];
      if (valueFields.length > 1) {
        valueFields.forEach((vf) => {
          uniqueLegends.forEach((legend) => {
            const seriesName = `${vf.field} - ${String(legend)}`;
            const data: number[] = [];
            uniqueCategories.forEach((cat) => {
              const row = aggregatedData.find(
                (d) =>
                  d[slots.x!.fieldName] === cat && d[legendField] === legend,
              );
              data.push(row?.[vf.field] ?? 0);
            });
            seriesMap.set(seriesName, data);
          });
        });
      } else {
        uniqueLegends.forEach((legend) => {
          const data: number[] = [];
          uniqueCategories.forEach((cat) => {
            const row = aggregatedData.find(
              (d) => d[slots.x!.fieldName] === cat && d[legendField] === legend,
            );
            const valueField = valueFields[0]?.field;
            data.push(row?.[valueField] ?? 0);
          });
          seriesMap.set(String(legend), data);
        });
      }
    } else if (valueFields.length > 1) {
      valueFields.forEach((vf) => {
        const data: number[] = [];
        uniqueCategories.forEach((cat) => {
          const row = aggregatedData.find((d) => d[slots.x!.fieldName] === cat);
          data.push(row?.[vf.field] ?? 0);
        });
        seriesMap.set(vf.field, data);
      });
    } else if (valueFields.length === 1) {
      const data: number[] = [];
      uniqueCategories.forEach((cat) => {
        const row = aggregatedData.find((d) => d[slots.x!.fieldName] === cat);
        data.push(row?.[valueFields[0].field] ?? 0);
      });
      seriesMap.set(valueFields[0].field, data);
    }
  }

  const series = Array.from(seriesMap.entries()).map(([name, data]) => ({
    name,
    data,
  }));

  return {
    categories,
    series,
    rawData: aggregatedData,
  };
}

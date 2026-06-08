import type { ChartType, ChartSlots, DataField } from '../types'

export function inferChartType(slots: ChartSlots, fields: DataField[]): ChartType | null {
  const hasX = slots.x !== null
  const hasY = slots.y && slots.y.length > 0
  const hasGroup = slots.group !== null
  const hasLegend = slots.legend !== null
  const hasMetric = slots.metric !== null

  if (!hasX && !hasY && !hasMetric) {
    return null
  }

  const getField = (fieldName: string) => fields.find((f) => f.name === fieldName)

  const xField = slots.x ? getField(slots.x.fieldName) : null
  const yFields = slots.y.map((s) => getField(s.fieldName)).filter(Boolean)
  const isXDate = xField?.type === 'date'
  const isXNumber = xField?.type === 'number'
  const isXText = xField?.type === 'text'

  if (hasMetric && !hasX && !hasY) {
    return 'pie'
  }

  if (hasX && hasMetric) {
    if (yFields.length === 0) {
      if (isXDate || isXNumber) {
        return 'line'
      }
      return 'bar'
    }
  }

  if (hasX && hasY) {
    if (isXDate && yFields.length >= 1) {
      return hasGroup || hasLegend ? 'line' : 'area'
    }

    if (isXNumber && yFields.every((f) => f?.type === 'number')) {
      return 'scatter'
    }

    if (isXText) {
      return yFields.length > 1 || hasGroup || hasLegend ? 'bar' : 'bar'
    }
  }

  if (hasGroup && hasY) {
    return 'radar'
  }

  if (hasX && hasY && isXText && yFields.length > 1) {
    return 'heatmap'
  }

  return 'bar'
}

export function getDefaultChartStyle() {
  return {
    theme: 'default',
    colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    legendPosition: 'top' as const,
    showTooltip: true,
    xAxisConfig: {
      show: true,
      rotate: 0
    },
    yAxisConfig: {
      show: true,
      rotate: 0
    }
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChartConfig, ChartType, ChartSlots, SlotField, Filter, ChartStyle } from '../types'
import { generateId, getDefaultChartStyle, inferChartType } from '../utils/chartUtils'
import * as idb from '../utils/idb'

export const useChartsStore = defineStore('charts', () => {
  const charts = ref<ChartConfig[]>([])
  const activeChartId = ref<string | null>(null)
  const isLoading = ref(false)

  const activeChart = computed(() =>
    charts.value.find((c) => c.id === activeChartId.value) || null
  )

  async function loadCharts() {
    isLoading.value = true
    try {
      charts.value = await idb.getAllCharts()
    } finally {
      isLoading.value = false
    }
  }

  function createEmptySlots(): ChartSlots {
    return {
      x: null,
      y: [],
      group: null,
      legend: null,
      metric: null,
      filters: []
    }
  }

  async function createChart(dataSourceId: string, title: string = 'New Chart'): Promise<ChartConfig> {
    const now = Date.now()
    const chart: ChartConfig = {
      id: generateId(),
      title,
      dataSourceId,
      chartType: null,
      slots: createEmptySlots(),
      style: getDefaultChartStyle(),
      createdAt: now,
      updatedAt: now
    }

    charts.value.push(chart)
    await idb.saveChart(chart)
    activeChartId.value = chart.id

    return chart
  }

  async function updateChart(chart: ChartConfig) {
    const index = charts.value.findIndex((c) => c.id === chart.id)
    if (index !== -1) {
      charts.value[index] = {
        ...chart,
        updatedAt: Date.now()
      }
      await idb.saveChart(charts.value[index])
    }
  }

  async function setSlot(slotName: keyof ChartSlots, field: SlotField | null, dataSourceFields: any[]) {
    if (!activeChart.value) return

    const updatedSlots = { ...activeChart.value.slots }

    if (slotName === 'y') {
      if (field && !updatedSlots.y.find((y) => y.fieldName === field.fieldName)) {
        updatedSlots.y = [...updatedSlots.y, field]
      }
    } else if (slotName === 'filters') {
    } else {
      (updatedSlots as any)[slotName] = field
    }

    const inferredType = inferChartType(updatedSlots, dataSourceFields)

    const updated: ChartConfig = {
      ...activeChart.value,
      slots: updatedSlots,
      chartType: inferredType || activeChart.value.chartType,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function removeFromSlot(slotName: keyof ChartSlots, fieldName?: string) {
    if (!activeChart.value) return

    const updatedSlots = { ...activeChart.value.slots }

    if (slotName === 'y' && fieldName) {
      updatedSlots.y = updatedSlots.y.filter((y) => y.fieldName !== fieldName)
    } else {
      (updatedSlots as any)[slotName] = slotName === 'y' ? [] : slotName === 'filters' ? [] : null
    }

    const updated: ChartConfig = {
      ...activeChart.value,
      slots: updatedSlots,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function setChartType(chartType: ChartType) {
    if (!activeChart.value) return

    const updated: ChartConfig = {
      ...activeChart.value,
      chartType,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function updateStyle(style: Partial<ChartStyle>) {
    if (!activeChart.value) return

    const updated: ChartConfig = {
      ...activeChart.value,
      style: {
        ...activeChart.value.style,
        ...style
      },
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function addFilter(filter: Filter) {
    if (!activeChart.value) return

    const updatedSlots = {
      ...activeChart.value.slots,
      filters: [...activeChart.value.slots.filters, filter]
    }

    const updated: ChartConfig = {
      ...activeChart.value,
      slots: updatedSlots,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function updateFilter(index: number, filter: Filter) {
    if (!activeChart.value) return

    const newFilters = [...activeChart.value.slots.filters]
    newFilters[index] = filter

    const updatedSlots = {
      ...activeChart.value.slots,
      filters: newFilters
    }

    const updated: ChartConfig = {
      ...activeChart.value,
      slots: updatedSlots,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function removeFilter(index: number) {
    if (!activeChart.value) return

    const newFilters = activeChart.value.slots.filters.filter((_, i) => i !== index)

    const updatedSlots = {
      ...activeChart.value.slots,
      filters: newFilters
    }

    const updated: ChartConfig = {
      ...activeChart.value,
      slots: updatedSlots,
      updatedAt: Date.now()
    }

    await updateChart(updated)
  }

  async function selectChart(id: string) {
    activeChartId.value = id
  }

  async function deleteChart(id: string) {
    const index = charts.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      charts.value.splice(index, 1)
      await idb.deleteChart(id)

      if (activeChartId.value === id) {
        activeChartId.value = null
      }
    }
  }

  async function renameChart(id: string, newTitle: string) {
    const chart = charts.value.find((c) => c.id === id)
    if (chart) {
      chart.title = newTitle
      chart.updatedAt = Date.now()
      await idb.saveChart(chart)
    }
  }

  return {
    charts,
    activeChartId,
    activeChart,
    isLoading,
    loadCharts,
    createChart,
    updateChart,
    setSlot,
    removeFromSlot,
    setChartType,
    updateStyle,
    addFilter,
    updateFilter,
    removeFilter,
    selectChart,
    deleteChart,
    renameChart
  }
})

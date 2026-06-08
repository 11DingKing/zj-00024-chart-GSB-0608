<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardsStore } from '../stores/dashboards'
import { useChartsStore } from '../stores/charts'
import { useDataSourcesStore } from '../stores/dataSources'
import * as echarts from 'echarts'
import { prepareChartData } from '../utils/dataProcessor'
import type { DashboardItem } from '../types'

const dashboardsStore = useDashboardsStore()
const chartsStore = useChartsStore()
const dataSourcesStore = useDataSourcesStore()

const gridContainer = ref<HTMLDivElement | null>(null)
const chartInstances = ref<Map<string, echarts.ECharts>>(new Map())

const activeTab = computed(() => dashboardsStore.activeTab)

const layout = computed<DashboardItem[]>(() => {
  return (activeTab.value?.layout || []).map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    chartId: item.chartId
  }))
})

function getChart(chartId: string) {
  return chartsStore.charts.find((c) => c.id === chartId)
}

function getDataSource(dataSourceId: string) {
  return dataSourcesStore.dataSources.find((ds) => ds.id === dataSourceId)
}

function generateEChartsOption(chartId: string) {
  const chart = getChart(chartId)
  if (!chart) return null

  const ds = getDataSource(chart.dataSourceId)
  if (!ds) return null

  if (!chart.chartType) return null

  const { categories, series } = prepareChartData(ds, chart.slots)

  if (categories.length === 0 && series.length === 0) return null

  const commonOptions = {
    title: {
      text: chart.title,
      left: 'center',
      textStyle: {
        fontSize: chart.style.fontSize + 2,
        fontFamily: chart.style.fontFamily
      }
    },
    tooltip: {
      show: chart.style.showTooltip,
      trigger: chart.chartType === 'pie' ? 'item' : 'axis'
    },
    legend: {
      show: true,
      position: chart.style.legendPosition,
      textStyle: {
        fontSize: chart.style.fontSize - 2,
        fontFamily: chart.style.fontFamily
      }
    },
    color: chart.style.colors,
    textStyle: {
      fontSize: chart.style.fontSize - 2,
      fontFamily: chart.style.fontFamily
    }
  }

  switch (chart.chartType) {
    case 'bar':
      return {
        ...commonOptions,
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name,
          type: 'bar',
          data: s.data
        }))
      }
    case 'line':
      return {
        ...commonOptions,
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name,
          type: 'line',
          data: s.data,
          smooth: true
        }))
      }
    case 'pie':
      const pieData = categories.map((cat, i) => ({
        name: String(cat),
        value: series[0]?.data[i] || 0
      }))
      return {
        ...commonOptions,
        series: [{ type: 'pie', radius: '40%', data: pieData }]
      }
    case 'area':
      return {
        ...commonOptions,
        xAxis: { type: 'category', data: categories, boundaryGap: false },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name,
          type: 'line',
          data: s.data,
          areaStyle: {}
        }))
      }
    default:
      return {
        ...commonOptions,
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name,
          type: 'bar',
          data: s.data
        }))
      }
  }
}

function renderChart(itemId: string, chartId: string, element: HTMLElement) {
  let instance = chartInstances.value.get(itemId)
  if (!instance) {
    instance = echarts.init(element)
    chartInstances.value.set(itemId, instance)
  }

  const option = generateEChartsOption(chartId)
  if (option) {
    instance.setOption(option, true)
  } else {
    instance.clear()
  }
}

function handleRemoveItem(itemId: string) {
  dashboardsStore.removeFromLayout(itemId)
  const instance = chartInstances.value.get(itemId)
  if (instance) {
    instance.dispose()
    chartInstances.value.delete(itemId)
  }
}

watch(
  () => [activeTab.value, chartsStore.charts],
  () => {
    nextTick(() => {
      if (activeTab.value) {
        activeTab.value.layout.forEach((item) => {
          const element = document.getElementById(`chart-${item.i}`)
          if (element) {
            renderChart(item.i, item.chartId, element)
          }
        })
      }
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    if (activeTab.value) {
      activeTab.value.layout.forEach((item) => {
        const element = document.getElementById(`chart-${item.i}`)
        if (element) {
          renderChart(item.i, item.chartId, element)
        }
      })
    }
  })
})

function handleResize() {
  chartInstances.value.forEach((instance) => {
    instance.resize()
  })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <div class="dashboard-canvas h-full p-4 overflow-auto">
    <div v-if="activeTab && activeTab.layout.length > 0" ref="gridContainer" class="grid-container">
      <div
        v-for="item in layout"
        :key="item.i"
        class="grid-item bg-card border border-[var(--border-color)] rounded p-2 relative"
        :style="{
          position: 'absolute',
          left: `${item.x * (100 / 12)}%`,
          top: `${item.y * 120}px`,
          width: `calc(${item.w * (100 / 12)}% - 8px)`,
          height: `${item.h * 120}px`
        }"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium truncate flex-1">
            {{ getChart(item.chartId)?.title || 'Chart' }}
          </span>
          <button
            class="text-xs text-[var(--danger-color)] hover:bg-[var(--danger-color)] hover:text-white rounded px-1"
            @click="handleRemoveItem(item.i)"
          >
            ✕
          </button>
        </div>
        <div :id="`chart-${item.i}`" class="w-full" style="height: calc(100% - 32px)"></div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-secondary">
      <div class="text-center">
        <div class="text-4xl mb-4">📊</div>
        <div class="mb-4">仪表盘为空</div>
        <div class="text-sm">从编辑器创建图表并添加到仪表盘</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-canvas {
  background-color: var(--bg-color);
  position: relative;
  min-height: 100%;
}

.grid-container {
  position: relative;
  width: 100%;
  min-height: 600px;
}

.grid-item {
  transition: left 0.2s, top 0.2s, width 0.2s, height 0.2s;
  resize: both;
  overflow: auto;
}
</style>

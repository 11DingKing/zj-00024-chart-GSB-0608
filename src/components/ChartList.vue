<script setup lang="ts">
import { useChartsStore } from '../stores/charts'
import { useDataSourcesStore } from '../stores/dataSources'
import { useDashboardsStore } from '../stores/dashboards'
import { useI18nStore } from '../stores/i18n'

const chartsStore = useChartsStore()
const dataSourcesStore = useDataSourcesStore()
const dashboardsStore = useDashboardsStore()
const i18nStore = useI18nStore()

const chartTypeIcons: Record<string, string> = {
  bar: '📊',
  line: '📈',
  pie: '🥧',
  scatter: '⚬',
  area: '📉',
  radar: '🎯',
  heatmap: '🔥',
  null: '📝'
}

async function handleCreateChart() {
  if (!dataSourcesStore.activeDataSourceId) {
    alert(i18nStore.t('dataSource.select'))
    return
  }
  await chartsStore.createChart(dataSourcesStore.activeDataSourceId)
}

async function handleDeleteChart(id: string) {
  if (confirm(i18nStore.t('common.confirm') + '?')) {
    await chartsStore.deleteChart(id)
  }
}

async function handleAddToDashboard(chartId: string) {
  if (dashboardsStore.dashboards.length === 0) {
    await dashboardsStore.createDashboard()
  }
  await dashboardsStore.addChartToDashboard(chartId)
  alert('已添加到仪表盘！')
}
</script>

<template>
  <div class="chart-list flex flex-col h-full">
    <div class="p-2 border-b border-[var(--border-color)] flex items-center justify-between">
      <h3 class="font-medium">{{ i18nStore.t('chart.title') }}</h3>
      <button class="btn text-sm" @click="handleCreateChart">
        + {{ i18nStore.t('chart.addChart') }}
      </button>
    </div>

    <div class="flex-1 overflow-auto p-2 scrollbar-thin">
      <div
        v-for="chart in chartsStore.charts"
        :key="chart.id"
        class="chart-item flex items-center gap-2 p-2 mb-1 border rounded cursor-pointer transition-colors"
        :class="[
          chartsStore.activeChartId === chart.id
            ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-10'
            : 'border-[var(--border-color)] hover:border-[var(--primary-color)]'
        ]"
        @click="chartsStore.selectChart(chart.id)"
      >
        <span class="text-lg">{{ chartTypeIcons[chart.chartType || 'null'] }}</span>
        <span class="flex-1 text-sm truncate">{{ chart.title }}</span>
        <button
          class="btn text-xs"
          @click.stop="handleAddToDashboard(chart.id)"
          title="添加到仪表盘"
        >
          📌
        </button>
        <button
          class="btn danger text-xs"
          @click.stop="handleDeleteChart(chart.id)"
        >
          ✕
        </button>
      </div>

      <div v-if="chartsStore.charts.length === 0" class="text-center text-secondary text-sm py-8">
        点击上方按钮创建图表
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chart-list {
  background-color: var(--card-bg);
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDataSourcesStore } from '../stores/dataSources'
import { useChartsStore } from '../stores/charts'
import { useDashboardsStore } from '../stores/dashboards'
import Header from '../components/Header.vue'
import FieldList from '../components/FieldList.vue'
import ChartCanvas from '../components/ChartCanvas.vue'
import ConfigPanel from '../components/ConfigPanel.vue'
import ChartList from '../components/ChartList.vue'

const dataSourcesStore = useDataSourcesStore()
const chartsStore = useChartsStore()
const dashboardsStore = useDashboardsStore()

onMounted(async () => {
  await dataSourcesStore.loadDataSources()
  await chartsStore.loadCharts()
  await dashboardsStore.loadDashboards()
})
</script>

<template>
  <div class="editor-view flex flex-col h-full">
    <Header />
    <div class="flex flex-1 overflow-hidden">
      <div class="w-64 border-r border-[var(--border-color)] bg-card flex flex-col">
        <FieldList />
        <div class="border-t border-[var(--border-color)] flex-1 overflow-hidden">
          <ChartList />
        </div>
      </div>
      <div class="flex-1 flex flex-col overflow-hidden">
        <ChartCanvas />
      </div>
      <div class="w-80 border-l border-[var(--border-color)] bg-card overflow-hidden">
        <ConfigPanel />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-view {
  background-color: var(--bg-color);
}
</style>

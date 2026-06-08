<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboardsStore } from '../stores/dashboards'
import { useChartsStore } from '../stores/charts'
import { useDataSourcesStore } from '../stores/dataSources'
import DashboardHeader from '../components/DashboardHeader.vue'
import DashboardCanvas from '../components/DashboardCanvas.vue'

const dashboardsStore = useDashboardsStore()
const chartsStore = useChartsStore()
const dataSourcesStore = useDataSourcesStore()

onMounted(async () => {
  await dataSourcesStore.loadDataSources()
  await chartsStore.loadCharts()
  await dashboardsStore.loadDashboards()

  if (dashboardsStore.dashboards.length === 0) {
    await dashboardsStore.createDashboard('My Dashboard')
  }
})
</script>

<template>
  <div class="dashboard-view flex flex-col h-full">
    <DashboardHeader />
    <div class="flex-1 overflow-hidden">
      <DashboardCanvas />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-view {
  background-color: var(--bg-color);
}
</style>

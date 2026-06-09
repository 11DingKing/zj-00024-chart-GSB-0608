<script setup lang="ts">
import { onMounted } from "vue";
import { useDataSourcesStore } from "../stores/dataSources";
import { useChartsStore } from "../stores/charts";
import { useDashboardsStore } from "../stores/dashboards";
import { useHistoryStore } from "../stores/history";
import Header from "../components/Header.vue";
import FieldList from "../components/FieldList.vue";
import ChartCanvas from "../components/ChartCanvas.vue";
import ConfigPanel from "../components/ConfigPanel.vue";
import ChartList from "../components/ChartList.vue";

const dataSourcesStore = useDataSourcesStore();
const chartsStore = useChartsStore();
const dashboardsStore = useDashboardsStore();
const historyStore = useHistoryStore();

let subscribed = false;

function getCurrentState() {
  return {
    dataSources: JSON.parse(JSON.stringify(dataSourcesStore.dataSources)),
    charts: JSON.parse(JSON.stringify(chartsStore.charts)),
    dashboards: JSON.parse(JSON.stringify(dashboardsStore.dashboards)),
    activeDataSourceId: dataSourcesStore.activeDataSourceId,
    activeChartId: chartsStore.activeChartId,
    activeDashboardId: dashboardsStore.activeDashboardId,
  };
}

function snapshotHistory(type: string, description: string) {
  if (historyStore.isRestoring) return;
  historyStore.push(type, description, getCurrentState());
}

onMounted(async () => {
  await dataSourcesStore.loadDataSources();
  await chartsStore.loadCharts();
  await dashboardsStore.loadDashboards();

  if (!historyStore.present) {
    historyStore.setInitialState(getCurrentState());
  }

  if (!subscribed) {
    subscribed = true;
    dataSourcesStore.$subscribe(
      () => {
        snapshotHistory("dataSource", "Data source changed");
      },
      { detached: true },
    );

    chartsStore.$subscribe(
      () => {
        snapshotHistory("chart", "Chart changed");
      },
      { detached: true },
    );

    dashboardsStore.$subscribe(
      () => {
        snapshotHistory("dashboard", "Dashboard changed");
      },
      { detached: true },
    );
  }
});
</script>

<template>
  <div class="editor-view flex flex-col h-full">
    <Header />
    <div class="flex flex-1 overflow-hidden">
      <div
        class="w-64 border-r border-[var(--border-color)] bg-card flex flex-col"
      >
        <FieldList />
        <div
          class="border-t border-[var(--border-color)] flex-1 overflow-hidden"
        >
          <ChartList />
        </div>
      </div>
      <div class="flex-1 flex flex-col overflow-hidden">
        <ChartCanvas />
      </div>
      <div
        class="w-80 border-l border-[var(--border-color)] bg-card overflow-hidden"
      >
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

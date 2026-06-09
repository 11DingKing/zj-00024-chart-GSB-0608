import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { HistoryRecord } from "../types";
import { useDataSourcesStore } from "./dataSources";
import { useChartsStore } from "./charts";
import { useDashboardsStore } from "./dashboards";

const MAX_HISTORY = 50;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function captureCurrentState(): Record<string, any> {
  const dataSourcesStore = useDataSourcesStore();
  const chartsStore = useChartsStore();
  const dashboardsStore = useDashboardsStore();

  return {
    dataSources: deepClone(dataSourcesStore.dataSources),
    charts: deepClone(chartsStore.charts),
    dashboards: deepClone(dashboardsStore.dashboards),
    activeDataSourceId: dataSourcesStore.activeDataSourceId,
    activeChartId: chartsStore.activeChartId,
    activeDashboardId: dashboardsStore.activeDashboardId,
  };
}

function applyState(state: Record<string, any>) {
  const dataSourcesStore = useDataSourcesStore();
  const chartsStore = useChartsStore();
  const dashboardsStore = useDashboardsStore();

  if (state.dataSources !== undefined) {
    dataSourcesStore.dataSources = deepClone(state.dataSources);
  }
  if (state.charts !== undefined) {
    chartsStore.charts = deepClone(state.charts);
  }
  if (state.dashboards !== undefined) {
    dashboardsStore.dashboards = deepClone(state.dashboards);
  }
  if (state.activeDataSourceId !== undefined) {
    dataSourcesStore.activeDataSourceId = state.activeDataSourceId;
  }
  if (state.activeChartId !== undefined) {
    chartsStore.activeChartId = state.activeChartId;
  }
  if (state.activeDashboardId !== undefined) {
    dashboardsStore.activeDashboardId = state.activeDashboardId;
  }
}

export const useHistoryStore = defineStore("history", () => {
  const past = ref<HistoryRecord[]>([]);
  const present = ref<HistoryRecord | null>(null);
  const future = ref<HistoryRecord[]>([]);

  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  function push(type: string, description: string) {
    if (!present.value) {
      present.value = {
        timestamp: Date.now(),
        type: "initial",
        description: "Initial state",
        state: captureCurrentState(),
      };
    }

    past.value.push(present.value);
    if (past.value.length > MAX_HISTORY) {
      past.value.shift();
    }

    present.value = {
      timestamp: Date.now(),
      type,
      description,
      state: captureCurrentState(),
    };

    future.value = [];
  }

  function undo(): HistoryRecord | null {
    if (past.value.length === 0) return null;

    if (present.value) {
      future.value.unshift(present.value);
    }
    const prev = past.value.pop()!;
    present.value = prev;

    applyState(prev.state);

    return prev;
  }

  function redo(): HistoryRecord | null {
    if (future.value.length === 0) return null;

    if (present.value) {
      past.value.push(present.value);
    }
    const next = future.value.shift()!;
    present.value = next;

    applyState(next.state);

    return next;
  }

  function clear() {
    past.value = [];
    present.value = null;
    future.value = [];
  }

  return {
    past,
    present,
    future,
    canUndo,
    canRedo,
    push,
    undo,
    redo,
    clear,
  };
});

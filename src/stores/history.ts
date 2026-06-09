import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { HistoryRecord } from "../types";
import { useDataSourcesStore } from "./dataSources";
import { useChartsStore } from "./charts";
import { useDashboardsStore } from "./dashboards";
import { cloneDeep } from "lodash-es";

const MAX_HISTORY = 50;

export const useHistoryStore = defineStore("history", () => {
  const past = ref<HistoryRecord[]>([]);
  const present = ref<HistoryRecord | null>(null);
  const future = ref<HistoryRecord[]>([]);
  const isRestoring = ref(false);

  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  function getCurrentState() {
    const dataSourcesStore = useDataSourcesStore();
    const chartsStore = useChartsStore();
    const dashboardsStore = useDashboardsStore();

    return {
      dataSources: cloneDeep(dataSourcesStore.dataSources),
      activeDataSourceId: dataSourcesStore.activeDataSourceId,
      charts: cloneDeep(chartsStore.charts),
      activeChartId: chartsStore.activeChartId,
      dashboards: cloneDeep(dashboardsStore.dashboards),
      activeDashboardId: dashboardsStore.activeDashboardId,
    };
  }

  function restoreState(state: Record<string, any>) {
    isRestoring.value = true;

    try {
      const dataSourcesStore = useDataSourcesStore();
      const chartsStore = useChartsStore();
      const dashboardsStore = useDashboardsStore();

      if (state.dataSources !== undefined) {
        dataSourcesStore.dataSources = cloneDeep(state.dataSources);
      }
      if (state.activeDataSourceId !== undefined) {
        dataSourcesStore.activeDataSourceId = state.activeDataSourceId;
      }
      if (state.charts !== undefined) {
        chartsStore.charts = cloneDeep(state.charts);
      }
      if (state.activeChartId !== undefined) {
        chartsStore.activeChartId = state.activeChartId;
      }
      if (state.dashboards !== undefined) {
        dashboardsStore.dashboards = cloneDeep(state.dashboards);
      }
      if (state.activeDashboardId !== undefined) {
        dashboardsStore.activeDashboardId = state.activeDashboardId;
      }
    } finally {
      setTimeout(() => {
        isRestoring.value = false;
      }, 0);
    }
  }

  function push(
    type: string,
    description: string,
    state?: Record<string, any>,
  ) {
    const stateToSave = state ? cloneDeep(state) : getCurrentState();

    if (present.value) {
      past.value.push(present.value);
      if (past.value.length > MAX_HISTORY) {
        past.value.shift();
      }
    }

    present.value = {
      timestamp: Date.now(),
      type,
      description,
      state: stateToSave,
    };

    future.value = [];
  }

  function undo(): HistoryRecord | null {
    if (past.value.length === 0) return null;

    const prev = past.value.pop()!;
    if (present.value) {
      future.value.unshift(present.value);
    }
    present.value = prev;

    if (prev.state) {
      restoreState(prev.state);
    }

    return prev;
  }

  function redo(): HistoryRecord | null {
    if (future.value.length === 0) return null;

    const next = future.value.shift()!;
    if (present.value) {
      past.value.push(present.value);
    }
    present.value = next;

    if (next.state) {
      restoreState(next.state);
    }

    return next;
  }

  function clear() {
    past.value = [];
    present.value = null;
    future.value = [];
  }

  function initialize() {
    if (!present.value) {
      push("init", "初始状态");
    }
  }

  return {
    past,
    present,
    future,
    canUndo,
    canRedo,
    isRestoring,
    push,
    undo,
    redo,
    clear,
    initialize,
    getCurrentState,
    restoreState,
  };
});

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Dashboard, DashboardTab, DashboardItem } from "../types";
import { generateId } from "../utils/chartUtils";
import * as idb from "../utils/idb";

function recordHistory(type: string, description: string) {
  import("./history").then(({ useHistoryStore }) => {
    const historyStore = useHistoryStore();
    if (!historyStore.isRestoring) {
      historyStore.push(type, description);
    }
  });
}

export const useDashboardsStore = defineStore("dashboards", () => {
  const dashboards = ref<Dashboard[]>([]);
  const activeDashboardId = ref<string | null>(null);
  const isLoading = ref(false);

  const activeDashboard = computed(
    () =>
      dashboards.value.find((d) => d.id === activeDashboardId.value) || null,
  );

  const activeTab = computed(() => {
    if (!activeDashboard.value) return null;
    return (
      activeDashboard.value.tabs[activeDashboard.value.activeTabIndex] || null
    );
  });

  async function loadDashboards() {
    isLoading.value = true;
    try {
      dashboards.value = await idb.getAllDashboards();
    } finally {
      isLoading.value = false;
    }
  }

  function createTab(name: string = "Tab 1"): DashboardTab {
    return {
      id: generateId(),
      name,
      layout: [],
    };
  }

  async function createDashboard(
    name: string = "New Dashboard",
  ): Promise<Dashboard> {
    const now = Date.now();
    const dashboard: Dashboard = {
      id: generateId(),
      name,
      tabs: [createTab("Tab 1")],
      activeTabIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    dashboards.value.push(dashboard);
    await idb.saveDashboard(dashboard);
    activeDashboardId.value = dashboard.id;
    recordHistory("create", `创建仪表盘: ${name}`);

    return dashboard;
  }

  async function updateDashboard(dashboard: Dashboard) {
    const index = dashboards.value.findIndex((d) => d.id === dashboard.id);
    if (index !== -1) {
      dashboards.value[index] = {
        ...dashboard,
        updatedAt: Date.now(),
      };
      await idb.saveDashboard(dashboards.value[index]);
      recordHistory("update", `更新仪表盘: ${dashboard.name}`);
    }
  }

  async function selectDashboard(id: string) {
    activeDashboardId.value = id;
    recordHistory("select", "切换仪表盘");
  }

  async function selectTab(index: number) {
    if (!activeDashboard.value) return;
    if (index < 0 || index >= activeDashboard.value.tabs.length) return;

    const updated: Dashboard = {
      ...activeDashboard.value,
      activeTabIndex: index,
      updatedAt: Date.now(),
    };

    await updateDashboard(updated);
  }

  async function addTab(name: string) {
    if (!activeDashboard.value) return;

    const updated: Dashboard = {
      ...activeDashboard.value,
      tabs: [...activeDashboard.value.tabs, createTab(name)],
      updatedAt: Date.now(),
    };

    await updateDashboard(updated);
  }

  async function renameTab(tabId: string, newName: string) {
    if (!activeDashboard.value) return;

    const updatedTabs = activeDashboard.value.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, name: newName } : tab,
    );

    const updated: Dashboard = {
      ...activeDashboard.value,
      tabs: updatedTabs,
      updatedAt: Date.now(),
    };

    await updateDashboard(updated);
  }

  async function removeTab(tabId: string) {
    if (!activeDashboard.value) return;
    if (activeDashboard.value.tabs.length <= 1) return;

    const tabIndex = activeDashboard.value.tabs.findIndex(
      (t) => t.id === tabId,
    );
    if (tabIndex === -1) return;

    const newTabs = activeDashboard.value.tabs.filter((t) => t.id !== tabId);
    let newActiveIndex = activeDashboard.value.activeTabIndex;
    if (tabIndex <= activeDashboard.value.activeTabIndex) {
      newActiveIndex = Math.max(0, activeDashboard.value.activeTabIndex - 1);
    }

    const updated: Dashboard = {
      ...activeDashboard.value,
      tabs: newTabs,
      activeTabIndex: newActiveIndex,
      updatedAt: Date.now(),
    };

    await updateDashboard(updated);
  }

  async function updateLayout(layout: DashboardItem[]) {
    if (!activeDashboard.value || !activeTab.value) return;

    const updatedTabs = activeDashboard.value.tabs.map((tab) =>
      tab.id === activeTab.value!.id ? { ...tab, layout } : tab,
    );

    const updated: Dashboard = {
      ...activeDashboard.value,
      tabs: updatedTabs,
      updatedAt: Date.now(),
    };

    await updateDashboard(updated);
  }

  async function addChartToDashboard(chartId: string) {
    if (!activeDashboard.value || !activeTab.value) return;

    const existingLayout = activeTab.value.layout;
    const maxX = existingLayout.reduce(
      (max, item) => Math.max(max, item.x + item.w),
      0,
    );
    const maxY = existingLayout.reduce(
      (max, item) => Math.max(max, item.y + item.h),
      0,
    );

    const newItem: DashboardItem = {
      i: generateId(),
      x: maxX >= 12 ? 0 : maxX,
      y: maxX >= 12 ? maxY : 0,
      w: 6,
      h: 4,
      chartId,
    };

    const newLayout = [...existingLayout, newItem];
    await updateLayout(newLayout);
  }

  async function removeFromLayout(itemId: string) {
    if (!activeDashboard.value || !activeTab.value) return;

    const newLayout = activeTab.value.layout.filter(
      (item) => item.i !== itemId,
    );
    await updateLayout(newLayout);
  }

  async function deleteDashboard(id: string) {
    const index = dashboards.value.findIndex((d) => d.id === id);
    const dashboardName = dashboards.value[index]?.name || "";
    if (index !== -1) {
      dashboards.value.splice(index, 1);
      await idb.deleteDashboard(id);

      if (activeDashboardId.value === id) {
        activeDashboardId.value = dashboards.value[0]?.id || null;
      }
      recordHistory("delete", `删除仪表盘: ${dashboardName}`);
    }
  }

  async function renameDashboard(id: string, newName: string) {
    const dashboard = dashboards.value.find((d) => d.id === id);
    if (dashboard) {
      dashboard.name = newName;
      dashboard.updatedAt = Date.now();
      await idb.saveDashboard(dashboard);
      recordHistory("rename", `重命名仪表盘: ${newName}`);
    }
  }

  return {
    dashboards,
    activeDashboardId,
    activeDashboard,
    activeTab,
    isLoading,
    loadDashboards,
    createDashboard,
    updateDashboard,
    selectDashboard,
    selectTab,
    addTab,
    renameTab,
    removeTab,
    updateLayout,
    addChartToDashboard,
    removeFromLayout,
    deleteDashboard,
    renameDashboard,
  };
});

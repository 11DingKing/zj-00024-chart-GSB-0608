<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useDashboardsStore } from '../stores/dashboards'
import { useChartsStore } from '../stores/charts'
import { useDataSourcesStore } from '../stores/dataSources'
import { exportProjectAsJSON, exportDashboardAsPDF } from '../utils/exportUtils'
import { useI18nStore } from '../stores/i18n'

const router = useRouter()
const settingsStore = useSettingsStore()
const dashboardsStore = useDashboardsStore()
const chartsStore = useChartsStore()
const dataSourcesStore = useDataSourcesStore()
const i18nStore = useI18nStore()

const dashboardRef = ref<HTMLDivElement | null>(null)
const newTabName = ref('')
const showAddTabModal = ref(false)

async function handleAddTab() {
  if (!newTabName.value) return
  await dashboardsStore.addTab(newTabName.value)
  newTabName.value = ''
  showAddTabModal.value = false
}

async function handleExportPDF() {
  if (dashboardRef.value) {
    await exportDashboardAsPDF(dashboardRef.value, dashboardsStore.activeDashboard?.name || 'dashboard')
  }
}

function handleExportProject() {
  exportProjectAsJSON(
    dashboardsStore.dashboards,
    chartsStore.charts,
    dataSourcesStore.dataSources,
    'dataviz-dashboard'
  )
}
</script>

<template>
  <div ref="dashboardRef" class="dashboard-header flex flex-col">
    <header class="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-card">
      <div class="flex items-center gap-4">
        <h1 class="text-lg font-bold text-primary">{{ i18nStore.t('app.title') }}</h1>
        <nav class="flex gap-2">
          <button
            class="btn"
            :class="{ primary: router.currentRoute.value.name === 'editor' }"
            @click="router.push('/')"
          >
            {{ i18nStore.t('app.editor') }}
          </button>
          <button
            class="btn"
            :class="{ primary: router.currentRoute.value.name === 'dashboard' }"
            @click="router.push('/dashboard')"
          >
            {{ i18nStore.t('app.dashboard') }}
          </button>
        </nav>

        <select
          v-if="dashboardsStore.dashboards.length > 0"
          class="select"
          :value="dashboardsStore.activeDashboardId || ''"
          @change="dashboardsStore.selectDashboard(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="d in dashboardsStore.dashboards" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn" @click="handleExportProject">📤 JSON</button>
        <button class="btn" @click="handleExportPDF">📄 PDF</button>
        <div class="w-px h-6 bg-[var(--border-color)] mx-2"></div>
        <select
          class="select"
          :value="settingsStore.language"
          @change="settingsStore.setLanguage(($event.target as HTMLSelectElement).value as 'zh' | 'en')"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <button class="btn" @click="settingsStore.toggleDarkMode">
          {{ settingsStore.isDark ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <div v-if="dashboardsStore.activeDashboard" class="flex items-center px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-color)]">
      <div class="flex items-center gap-1">
        <button
          v-for="(tab, index) in dashboardsStore.activeDashboard.tabs"
          :key="tab.id"
          class="px-3 py-1 rounded-t text-sm cursor-pointer transition-colors"
          :class="[
            dashboardsStore.activeDashboard?.activeTabIndex === index
              ? 'bg-card border border-b-0 border-[var(--border-color)]'
              : 'hover:bg-card hover:bg-opacity-50'
          ]"
          @click="dashboardsStore.selectTab(index)"
        >
          {{ tab.name }}
          <span
            v-if="dashboardsStore.activeDashboard!.tabs.length > 1"
            class="ml-2 text-xs hover:text-[var(--danger-color)]"
            @click.stop="dashboardsStore.removeTab(tab.id)"
          >
            ✕
          </span>
        </button>
        <button class="btn text-sm" @click="showAddTabModal = true">
          + {{ i18nStore.t('dashboard.addTab') }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="showAddTabModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-card p-4 rounded shadow-lg w-80">
      <h3 class="font-bold mb-4">{{ i18nStore.t('dashboard.addTab') }}</h3>
      <input
        v-model="newTabName"
        class="input w-full mb-4"
        placeholder="标签页名称"
        @keyup.enter="handleAddTab"
      />
      <div class="flex justify-end gap-2">
        <button class="btn" @click="showAddTabModal = false">{{ i18nStore.t('common.cancel') }}</button>
        <button class="btn primary" @click="handleAddTab">{{ i18nStore.t('common.save') }}</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-header {
  background-color: var(--card-bg);
}
</style>

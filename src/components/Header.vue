<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useDataSourcesStore } from '../stores/dataSources'
import { useChartsStore } from '../stores/charts'
import { useHistoryStore } from '../stores/history'
import { exportProjectAsJSON, importProjectFromJSON } from '../utils/exportUtils'
import { useI18nStore } from '../stores/i18n'

const router = useRouter()
const settingsStore = useSettingsStore()
const dataSourcesStore = useDataSourcesStore()
const chartsStore = useChartsStore()
const historyStore = useHistoryStore()
const i18nStore = useI18nStore()

const fileInputRef = ref<HTMLInputElement | null>(null)

function handleUndo() {
  if (historyStore.canUndo) {
    historyStore.undo()
  }
}

function handleRedo() {
  if (historyStore.canRedo) {
    historyStore.redo()
  }
}

async function handleExportProject() {
  exportProjectAsJSON(
    [],
    chartsStore.charts,
    dataSourcesStore.dataSources,
    'dataviz-project'
  )
}

async function handleImportClick() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const { charts, dataSources } = await importProjectFromJSON(file)

    for (const ds of dataSources) {
      await dataSourcesStore.updateDataSource(ds)
    }
    for (const chart of charts) {
      await chartsStore.updateChart(chart)
    }

    await dataSourcesStore.loadDataSources()
    await chartsStore.loadCharts()
  } catch (e) {
    console.error('Import failed:', e)
  }

  input.value = ''
}
</script>

<template>
  <header class="header flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-card">
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
    </div>

    <div class="flex items-center gap-2">
      <button
        class="btn"
        :disabled="!historyStore.canUndo"
        @click="handleUndo"
      >
        ↩ {{ i18nStore.t('common.undo') }}
      </button>
      <button
        class="btn"
        :disabled="!historyStore.canRedo"
        @click="handleRedo"
      >
        ↪ {{ i18nStore.t('common.redo') }}
      </button>
      <div class="w-px h-6 bg-[var(--border-color)] mx-2"></div>
      <button class="btn" @click="handleExportProject">
        📤 {{ i18nStore.t('common.export') }}
      </button>
      <button class="btn" @click="handleImportClick">
        📥 {{ i18nStore.t('common.import') }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleFileChange"
      />
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
</template>

<style lang="scss" scoped>
.header {
  min-height: 48px;
}
</style>

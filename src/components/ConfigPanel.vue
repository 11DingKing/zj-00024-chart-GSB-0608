<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChartsStore } from '../stores/charts'
import { useDataSourcesStore } from '../stores/dataSources'
import { useI18nStore } from '../stores/i18n'
import type { Filter, ChartStyle } from '../types'

const chartsStore = useChartsStore()
const dataSourcesStore = useDataSourcesStore()
const i18nStore = useI18nStore()

const activeChart = computed(() => chartsStore.activeChart)
const activeDataSource = computed(() => {
  if (!activeChart.value) return null
  return dataSourcesStore.dataSources.find((ds) => ds.id === activeChart.value?.dataSourceId)
})

const newFilter = ref<Filter>({
  field: '',
  type: 'range',
  min: undefined,
  max: undefined,
  values: [],
  pattern: ''
})

const presetColors = [
  ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
  ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552'],
  ['#c12e34', '#e6b600', '#0098d9', '#2b821d', '#005eaa', '#339ca8', '#cda819', '#32a487']
]

async function handleAddFilter() {
  if (!newFilter.value.field) return

  const filter: Filter = { ...newFilter.value }
  if (filter.type === 'enum' && typeof filter.values === 'string') {
    filter.values = (filter.values as any).split(',').map((v: string) => v.trim())
  }

  await chartsStore.addFilter(filter)
  newFilter.value = {
    field: '',
    type: 'range',
    min: undefined,
    max: undefined,
    values: [],
    pattern: ''
  }
}

async function handleRemoveFilter(index: number) {
  await chartsStore.removeFilter(index)
}

async function handleStyleChange(key: keyof ChartStyle, value: any) {
  await chartsStore.updateStyle({ [key]: value })
}

async function handleAxisChange(axis: 'x' | 'y', key: 'show' | 'rotate', value: any) {
  const configKey = axis === 'x' ? 'xAxisConfig' : 'yAxisConfig'
  const current = activeChart.value?.style[configKey] || { show: true, rotate: 0 }
  await chartsStore.updateStyle({
    [configKey]: {
      ...current,
      [key]: value
    }
  })
}

function getUniqueValues(fieldName: string): string[] {
  if (!activeDataSource.value) return []
  const values = [...new Set(activeDataSource.value.rows.map((r) => String(r[fieldName])))]
  return values.filter((v) => v !== 'null' && v !== 'undefined')
}
</script>

<template>
  <div class="config-panel flex flex-col h-full overflow-auto scrollbar-thin">
    <template v-if="activeChart">
      <div class="p-3 border-b border-[var(--border-color)]">
        <h3 class="font-medium mb-3">{{ i18nStore.t('style.title') }}</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-sm text-secondary mb-1">{{ i18nStore.t('style.colors') }}</label>
            <div class="flex gap-2 flex-wrap">
              <div
                v-for="(colors, index) in presetColors"
                :key="index"
                class="flex cursor-pointer p-1 rounded border"
                :class="activeChart.style.colors === colors ? 'border-[var(--primary-color)]' : 'border-transparent'"
                @click="handleStyleChange('colors', colors)"
              >
                <div
                  v-for="(color, ci) in colors.slice(0, 4)"
                  :key="ci"
                  class="w-4 h-4"
                  :style="{ backgroundColor: color }"
                ></div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-sm text-secondary mb-1">{{ i18nStore.t('style.fontSize') }}</label>
              <input
                type="number"
                class="input w-full"
                :value="activeChart.style.fontSize"
                @change="handleStyleChange('fontSize', Number(($event.target as HTMLInputElement).value))"
                min="8"
                max="24"
              />
            </div>
            <div>
              <label class="block text-sm text-secondary mb-1">{{ i18nStore.t('style.legendPosition') }}</label>
              <select
                class="select w-full"
                :value="activeChart.style.legendPosition"
                @change="handleStyleChange('legendPosition', ($event.target as HTMLSelectElement).value as any)"
              >
                <option value="top">{{ i18nStore.t('style.top') }}</option>
                <option value="bottom">{{ i18nStore.t('style.bottom') }}</option>
                <option value="left">{{ i18nStore.t('style.left') }}</option>
                <option value="right">{{ i18nStore.t('style.right') }}</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="showTooltip"
              :checked="activeChart.style.showTooltip"
              @change="handleStyleChange('showTooltip', ($event.target as HTMLInputElement).checked)"
            />
            <label for="showTooltip" class="text-sm">{{ i18nStore.t('style.showTooltip') }}</label>
          </div>

          <div>
            <label class="block text-sm text-secondary mb-1">{{ i18nStore.t('style.xAxis') }}</label>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="activeChart.style.xAxisConfig.show"
                @change="handleAxisChange('x', 'show', ($event.target as HTMLInputElement).checked)"
              />
              <span class="text-sm">显示</span>
              <input
                type="number"
                class="input flex-1"
                placeholder="旋转角度"
                :value="activeChart.style.xAxisConfig.rotate"
                @change="handleAxisChange('x', 'rotate', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm text-secondary mb-1">{{ i18nStore.t('style.yAxis') }}</label>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="activeChart.style.yAxisConfig.show"
                @change="handleAxisChange('y', 'show', ($event.target as HTMLInputElement).checked)"
              />
              <span class="text-sm">显示</span>
              <input
                type="number"
                class="input flex-1"
                placeholder="旋转角度"
                :value="activeChart.style.yAxisConfig.rotate"
                @change="handleAxisChange('y', 'rotate', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="p-3">
        <h3 class="font-medium mb-3">{{ i18nStore.t('filter.title') }}</h3>

        <div class="space-y-2 mb-4">
          <div
            v-for="(filter, index) in activeChart.slots.filters"
            :key="index"
            class="p-2 border border-[var(--border-color)] rounded"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium">{{ filter.field }}</span>
              <button class="text-xs text-[var(--danger-color)]" @click="handleRemoveFilter(index)">✕</button>
            </div>
            <div class="text-xs text-secondary">
              <template v-if="filter.type === 'range'">
                {{ filter.min }} - {{ filter.max }}
              </template>
              <template v-else-if="filter.type === 'enum'">
                {{ filter.values?.join(', ') }}
              </template>
              <template v-else-if="filter.type === 'fuzzy'">
                包含: {{ filter.pattern }}
              </template>
            </div>
          </div>
        </div>

        <div class="border-t border-[var(--border-color)] pt-3">
          <h4 class="text-sm font-medium mb-2">添加筛选</h4>
          <div class="space-y-2">
            <select
              class="select w-full"
              v-model="newFilter.field"
            >
              <option value="" disabled>选择字段</option>
              <option
                v-for="field in activeDataSource?.fields"
                :key="field.name"
                :value="field.name"
              >
                {{ field.name }}
              </option>
            </select>

            <select
              class="select w-full"
              v-model="newFilter.type"
            >
              <option value="range">{{ i18nStore.t('filter.range') }}</option>
              <option value="enum">{{ i18nStore.t('filter.enum') }}</option>
              <option value="fuzzy">{{ i18nStore.t('filter.fuzzy') }}</option>
            </select>

            <template v-if="newFilter.type === 'range'">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="newFilter.min"
                  class="input"
                  type="number"
                  :placeholder="i18nStore.t('filter.min')"
                />
                <input
                  v-model.number="newFilter.max"
                  class="input"
                  type="number"
                  :placeholder="i18nStore.t('filter.max')"
                />
              </div>
            </template>

            <template v-else-if="newFilter.type === 'enum'">
              <div v-if="newFilter.field" class="flex flex-wrap gap-1 max-h-32 overflow-auto">
                <label
                  v-for="val in getUniqueValues(newFilter.field)"
                  :key="val"
                  class="flex items-center gap-1 text-xs px-2 py-1 bg-[var(--bg-color)] rounded"
                >
                  <input
                    type="checkbox"
                    :value="val"
                    :checked="(newFilter.values as string[]).includes(val)"
                    @change="(e) => {
                      const checked = (e.target as HTMLInputElement).checked
                      const arr = newFilter.values as string[]
                      if (checked) {
                        newFilter.values = [...arr, val]
                      } else {
                        newFilter.values = arr.filter((v) => v !== val)
                      }
                    }"
                  />
                  {{ val }}
                </label>
              </div>
            </template>

            <template v-else-if="newFilter.type === 'fuzzy'">
              <input
                v-model="newFilter.pattern"
                class="input w-full"
                :placeholder="i18nStore.t('filter.pattern')"
              />
            </template>

            <button
              class="btn primary w-full"
              @click="handleAddFilter"
              :disabled="!newFilter.field"
            >
              + {{ i18nStore.t('common.add') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center text-secondary text-sm">
      选择一个图表进行配置
    </div>
  </div>
</template>

<style lang="scss" scoped>
.config-panel {
  background-color: var(--card-bg);
}
</style>

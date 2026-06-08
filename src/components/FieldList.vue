<script setup lang="ts">
import { ref } from 'vue'
import { useDataSourcesStore } from '../stores/dataSources'
import { useI18nStore } from '../stores/i18n'
import type { FieldType } from '../types'

const dataSourcesStore = useDataSourcesStore()
const i18nStore = useI18nStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const showComputedFieldModal = ref(false)
const showBucketModal = ref(false)
const selectedFieldForBucket = ref<string | null>(null)

const newComputedField = ref({
  name: '',
  expression: '',
  type: 'number' as FieldType
})

const newBucketConfig = ref({
  type: 'range' as const,
  ranges: [{ min: 0, max: 100, label: '0-100' }]
})

const fieldTypeIcons: Record<FieldType, string> = {
  number: '#',
  text: 'T',
  date: '📅',
  boolean: '✓'
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    try {
      await dataSourcesStore.uploadFile(file)
    } catch (e) {
      console.error('Upload failed:', e)
    }
  }

  input.value = ''
}

function handleDragStart(event: DragEvent, fieldName: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', fieldName)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

async function handleFieldTypeChange(fieldName: string, newType: FieldType) {
  await dataSourcesStore.changeFieldType(fieldName, newType)
}

async function handleAddComputedField() {
  if (!newComputedField.value.name || !newComputedField.value.expression) return

  await dataSourcesStore.addComputedField({
    name: newComputedField.value.name,
    expression: newComputedField.value.expression,
    type: newComputedField.value.type
  })

  newComputedField.value = { name: '', expression: '', type: 'number' }
  showComputedFieldModal.value = false
}

function openBucketModal(fieldName: string) {
  selectedFieldForBucket.value = fieldName
  showBucketModal.value = true
}

async function handleAddBucket() {
  if (!selectedFieldForBucket.value) return

  await dataSourcesStore.addBucket(selectedFieldForBucket.value, {
    type: newBucketConfig.value.type,
    ranges: newBucketConfig.value.type === 'range' ? newBucketConfig.value.ranges : undefined
  })

  selectedFieldForBucket.value = null
  showBucketModal.value = false
}

function addBucketRange() {
  const lastRange = newBucketConfig.value.ranges[newBucketConfig.value.ranges.length - 1]
  newBucketConfig.value.ranges.push({
    min: lastRange.max,
    max: lastRange.max + 100,
    label: `${lastRange.max}-${lastRange.max + 100}`
  })
}

function removeBucketRange(index: number) {
  newBucketConfig.value.ranges.splice(index, 1)
}
</script>

<template>
  <div class="field-list flex flex-col h-full">
    <div class="p-2 border-b border-[var(--border-color)]">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">{{ i18nStore.t('dataSource.title') }}</h3>
        <button class="btn text-sm" @click="fileInputRef?.click()">
          + {{ i18nStore.t('dataSource.upload') }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          multiple
          class="hidden"
          @change="handleFileChange"
        />
      </div>

      <select
        v-if="dataSourcesStore.dataSources.length > 0"
        class="select w-full"
        :value="dataSourcesStore.activeDataSourceId || ''"
        @change="dataSourcesStore.selectDataSource(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="ds in dataSourcesStore.dataSources" :key="ds.id" :value="ds.id">
          {{ ds.name }} ({{ ds.rows.length }} 行)
        </option>
      </select>
    </div>

    <div class="flex-1 overflow-auto p-2 scrollbar-thin">
      <template v-if="dataSourcesStore.activeDataSource">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-secondary">{{ i18nStore.t('dataSource.fields') }}</span>
          <button
            class="btn text-sm"
            @click="showComputedFieldModal = true"
          >
            + 计算
          </button>
        </div>

        <div
          v-for="field in dataSourcesStore.activeDataSource.fields"
          :key="field.name"
          class="field-item flex items-center gap-2 p-2 mb-1 border border-[var(--border-color)] rounded cursor-move hover:border-[var(--primary-color)] transition-colors"
          draggable="true"
          @dragstart="handleDragStart($event, field.name)"
        >
          <span class="w-6 h-6 flex items-center justify-center rounded text-xs font-bold bg-[var(--primary-color)] text-white">
            {{ fieldTypeIcons[field.type] }}
          </span>
          <span class="flex-1 text-sm truncate">
            {{ field.name }}
            <span v-if="field.computed" class="text-[var(--success-color)]"> (计算)</span>
            <span v-if="field.bucketed" class="text-[var(--warning-color)]"> (分桶)</span>
          </span>
          <select
            class="select text-xs w-16"
            :value="field.type"
            @click.stop
            @change="handleFieldTypeChange(field.name, ($event.target as HTMLSelectElement).value as FieldType)"
          >
            <option value="number">#</option>
            <option value="text">T</option>
            <option value="date">📅</option>
            <option value="boolean">✓</option>
          </select>
          <button
            v-if="field.type === 'number' || field.type === 'date'"
            class="btn text-xs"
            @click.stop="openBucketModal(field.name)"
          >
            🪣
          </button>
        </div>
      </template>

      <div v-else class="text-center text-secondary text-sm py-8">
        {{ i18nStore.t('common.noData') }}
        <br />
        <span class="text-xs">{{ i18nStore.t('dataSource.supportedFormats') }}</span>
      </div>
    </div>

    <div v-if="showComputedFieldModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-card p-4 rounded shadow-lg w-96">
        <h3 class="font-bold mb-4">{{ i18nStore.t('dataSource.addComputedField') }}</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">{{ i18nStore.t('dataSource.fieldName') }}</label>
            <input v-model="newComputedField.name" class="input w-full" placeholder="profit" />
          </div>
          <div>
            <label class="block text-sm mb-1">{{ i18nStore.t('dataSource.expression') }}</label>
            <input v-model="newComputedField.expression" class="input w-full" :placeholder="i18nStore.t('dataSource.example')" />
          </div>
          <div>
            <label class="block text-sm mb-1">{{ i18nStore.t('dataSource.fieldType') }}</label>
            <select v-model="newComputedField.type" class="select w-full">
              <option value="number">{{ i18nStore.t('dataSource.number') }}</option>
              <option value="text">{{ i18nStore.t('dataSource.text') }}</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="showComputedFieldModal = false">{{ i18nStore.t('common.cancel') }}</button>
          <button class="btn primary" @click="handleAddComputedField">{{ i18nStore.t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showBucketModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-card p-4 rounded shadow-lg w-96 max-h-[80vh] overflow-auto">
        <h3 class="font-bold mb-4">{{ i18nStore.t('dataSource.addBucket') }}</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">{{ i18nStore.t('dataSource.bucketType') }}</label>
            <select v-model="newBucketConfig.type" class="select w-full">
              <option value="range">{{ i18nStore.t('dataSource.range') }}</option>
              <option value="year">{{ i18nStore.t('dataSource.year') }}</option>
              <option value="month">{{ i18nStore.t('dataSource.month') }}</option>
              <option value="day">{{ i18nStore.t('dataSource.day') }}</option>
              <option value="week">{{ i18nStore.t('dataSource.week') }}</option>
            </select>
          </div>

          <div v-if="newBucketConfig.type === 'range'" class="space-y-2">
            <div
              v-for="(range, index) in newBucketConfig.ranges"
              :key="index"
              class="flex gap-2 items-center"
            >
              <input v-model.number="range.min" class="input flex-1" type="number" placeholder="Min" />
              <span>-</span>
              <input v-model.number="range.max" class="input flex-1" type="number" placeholder="Max" />
              <input v-model="range.label" class="input flex-1" placeholder="Label" />
              <button class="btn danger text-sm" @click="removeBucketRange(index)">-</button>
            </div>
            <button class="btn w-full" @click="addBucketRange">+ {{ i18nStore.t('common.add') }}</button>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="showBucketModal = false">{{ i18nStore.t('common.cancel') }}</button>
          <button class="btn primary" @click="handleAddBucket">{{ i18nStore.t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.field-list {
  background-color: var(--card-bg);
}

.field-item {
  user-select: none;
}
</style>

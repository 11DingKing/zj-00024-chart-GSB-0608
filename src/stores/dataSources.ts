import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataSource, DataField, FieldType, BucketConfig } from '../types'
import { parseFile } from '../utils/fileParser'
import { generateId } from '../utils/chartUtils'
import { convertFieldType, applyComputedFields } from '../utils/dataProcessor'
import * as idb from '../utils/idb'
import { useHistoryStore } from './history'

export const useDataSourcesStore = defineStore('dataSources', () => {
  const dataSources = ref<DataSource[]>([])
  const activeDataSourceId = ref<string | null>(null)
  const isLoading = ref(false)

  const activeDataSource = computed(() =>
    dataSources.value.find((ds) => ds.id === activeDataSourceId.value) || null
  )

  async function loadDataSources() {
    isLoading.value = true
    try {
      dataSources.value = await idb.getAllDataSources()
    } finally {
      isLoading.value = false
    }
  }

  async function uploadFile(file: File): Promise<DataSource> {
    const parsed = await parseFile(file)
    const now = Date.now()
    const dataSource: DataSource = {
      id: generateId(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fields: parsed.fields,
      rows: parsed.rows,
      createdAt: now,
      updatedAt: now
    }

    dataSources.value.push(dataSource)
    await idb.saveDataSource(dataSource)

    const historyStore = useHistoryStore()
    historyStore.push('uploadFile', '上传数据源')

    return dataSource
  }

  async function selectDataSource(id: string) {
    activeDataSourceId.value = id
  }

  async function updateDataSource(dataSource: DataSource) {
    const index = dataSources.value.findIndex((ds) => ds.id === dataSource.id)
    if (index !== -1) {
      dataSources.value[index] = {
        ...dataSource,
        updatedAt: Date.now()
      }
      await idb.saveDataSource(dataSources.value[index])

      const historyStore = useHistoryStore()
      historyStore.push('updateDataSource', '更新数据源')
    }
  }

  async function changeFieldType(fieldName: string, newType: FieldType) {
    if (!activeDataSource.value) return

    const updated = convertFieldType(activeDataSource.value, fieldName, newType)
    await updateDataSource(updated)
  }

  async function addComputedField(field: Omit<DataField, 'type'> & { type?: FieldType }) {
    if (!activeDataSource.value) return

    const newField: DataField = {
      ...field,
      type: field.type || 'number',
      computed: true
    }

    const dataSourceWithComputed = applyComputedFields(activeDataSource.value, [newField])
    await updateDataSource(dataSourceWithComputed)
  }

  async function addBucket(fieldName: string, bucketConfig: BucketConfig) {
    if (!activeDataSource.value) return

    const field = activeDataSource.value.fields.find((f) => f.name === fieldName)
    if (!field) return

    const updatedFields = activeDataSource.value.fields.map((f) => {
      if (f.name === fieldName) {
        return {
          ...f,
          bucketed: true,
          bucketConfig
        }
      }
      return f
    })

    const updated: DataSource = {
      ...activeDataSource.value,
      fields: updatedFields,
      updatedAt: Date.now()
    }

    await updateDataSource(updated)
  }

  async function deleteDataSource(id: string) {
    const index = dataSources.value.findIndex((ds) => ds.id === id)
    if (index !== -1) {
      dataSources.value.splice(index, 1)
      await idb.deleteDataSource(id)

      if (activeDataSourceId.value === id) {
        activeDataSourceId.value = dataSources.value[0]?.id || null
      }

      const historyStore = useHistoryStore()
      historyStore.push('deleteDataSource', '删除数据源')
    }
  }

  async function renameDataSource(id: string, newName: string) {
    const dataSource = dataSources.value.find((ds) => ds.id === id)
    if (dataSource) {
      dataSource.name = newName
      dataSource.updatedAt = Date.now()
      await idb.saveDataSource(dataSource)

      const historyStore = useHistoryStore()
      historyStore.push('renameDataSource', '重命名数据源')
    }
  }

  return {
    dataSources,
    activeDataSourceId,
    activeDataSource,
    isLoading,
    loadDataSources,
    uploadFile,
    selectDataSource,
    updateDataSource,
    changeFieldType,
    addComputedField,
    addBucket,
    deleteDataSource,
    renameDataSource
  }
})

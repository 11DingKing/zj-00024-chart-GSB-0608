import { openDB, IDBPDatabase } from 'idb'
import type { DataSource, ChartConfig, Dashboard } from '../types'

const DB_NAME = 'dataviz_editor_db'
const DB_VERSION = 1

export interface AppDB {
  dataSources: DataSource
  charts: ChartConfig
  dashboards: Dashboard
}

let db: IDBPDatabase<AppDB> | null = null

// IndexedDB 的 structured clone 不能克隆 Vue 的 reactive Proxy，
// 写入前先把对象转成纯 JSON 对象，避免 DataCloneError。
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export async function initDB(): Promise<IDBPDatabase<AppDB>> {
  if (db) return db

  db = await openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('dataSources')) {
        const store = db.createObjectStore('dataSources', { keyPath: 'id' })
        store.createIndex('name', 'name', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('charts')) {
        const store = db.createObjectStore('charts', { keyPath: 'id' })
        store.createIndex('dataSourceId', 'dataSourceId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('dashboards')) {
        const store = db.createObjectStore('dashboards', { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })

  return db
}

export async function getAllDataSources(): Promise<DataSource[]> {
  const database = await initDB()
  return database.getAll('dataSources')
}

export async function saveDataSource(dataSource: DataSource): Promise<void> {
  const database = await initDB()
  await database.put('dataSources', toPlain(dataSource))
}

export async function deleteDataSource(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('dataSources', id)
}

export async function getAllCharts(): Promise<ChartConfig[]> {
  const database = await initDB()
  return database.getAll('charts')
}

export async function saveChart(chart: ChartConfig): Promise<void> {
  const database = await initDB()
  await database.put('charts', toPlain(chart))
}

export async function deleteChart(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('charts', id)
}

export async function getAllDashboards(): Promise<Dashboard[]> {
  const database = await initDB()
  return database.getAll('dashboards')
}

export async function saveDashboard(dashboard: Dashboard): Promise<void> {
  const database = await initDB()
  await database.put('dashboards', toPlain(dashboard))
}

export async function deleteDashboard(id: string): Promise<void> {
  const database = await initDB()
  await database.delete('dashboards', id)
}

export async function clearAllData(): Promise<void> {
  const database = await initDB()
  const tx = database.transaction(
    ['dataSources', 'charts', 'dashboards'],
    'readwrite'
  )
  await Promise.all([
    tx.objectStore('dataSources').clear(),
    tx.objectStore('charts').clear(),
    tx.objectStore('dashboards').clear()
  ])
  await tx.done
}

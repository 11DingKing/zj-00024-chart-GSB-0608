export type FieldType = 'number' | 'text' | 'date' | 'boolean'

export interface DataField {
  name: string
  type: FieldType
  originalType?: FieldType
  computed?: boolean
  expression?: string
  bucketed?: boolean
  bucketConfig?: BucketConfig
}

export type BucketType = 'range' | 'year' | 'month' | 'day' | 'week'

export interface BucketConfig {
  type: BucketType
  ranges?: Array<{ min: number; max: number; label: string }>
  interval?: number
}

export interface DataSource {
  id: string
  name: string
  fileName: string
  fields: DataField[]
  rows: Record<string, any>[]
  createdAt: number
  updatedAt: number
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap'

export type SlotType = 'x' | 'y' | 'group' | 'legend' | 'metric' | 'filter'

export type AggregationType = 'sum' | 'avg' | 'max' | 'min' | 'count' | 'distinctCount'

export type FilterType = 'range' | 'enum' | 'fuzzy'

export interface Filter {
  field: string
  type: FilterType
  min?: number | Date
  max?: number | Date
  values?: string[]
  pattern?: string
}

export interface SlotField {
  fieldName: string
  aggregation?: AggregationType
  filter?: Filter
}

export interface ChartSlots {
  x: SlotField | null
  y: SlotField[]
  group: SlotField | null
  legend: SlotField | null
  metric: SlotField | null
  filters: Filter[]
}

export interface ChartStyle {
  theme: string
  colors: string[]
  fontSize: number
  fontFamily: string
  legendPosition: 'top' | 'bottom' | 'left' | 'right'
  showTooltip: boolean
  xAxisConfig: {
    show: boolean
    rotate: number
  }
  yAxisConfig: {
    show: boolean
    rotate: number
  }
}

export interface ChartConfig {
  id: string
  title: string
  dataSourceId: string
  chartType: ChartType | null
  slots: ChartSlots
  style: ChartStyle
  createdAt: number
  updatedAt: number
}

export interface DashboardItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  chartId: string
}

export interface Dashboard {
  id: string
  name: string
  tabs: DashboardTab[]
  activeTabIndex: number
  createdAt: number
  updatedAt: number
}

export interface DashboardTab {
  id: string
  name: string
  layout: DashboardItem[]
}

export interface HistoryRecord {
  timestamp: number
  type: string
  description: string
  state: Partial<PiniaState>
}

export interface PiniaState {
  dataSources: DataSource[]
  charts: ChartConfig[]
  dashboards: Dashboard[]
  activeDataSourceId: string | null
  activeChartId: string | null
  activeDashboardId: string | null
}

export interface HistoryState {
  past: HistoryRecord[]
  present: HistoryRecord | null
  future: HistoryRecord[]
}

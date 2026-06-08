<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import * as echarts from "echarts";
import { useChartsStore } from "../stores/charts";
import { useDataSourcesStore } from "../stores/dataSources";
import { useI18nStore } from "../stores/i18n";
import { prepareChartData } from "../utils/dataProcessor";
import { exportChartAsPNG, exportChartAsSVG } from "../utils/exportUtils";
import type { SlotType, SlotField, AggregationType, ChartType, ChartSlots } from "../types";

const chartsStore = useChartsStore();
const dataSourcesStore = useDataSourcesStore();
const i18nStore = useI18nStore();

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const slotLabels: Record<SlotType, string> = {
  x: "X 轴",
  y: "Y 轴",
  group: "分组",
  legend: "图例",
  metric: "指标",
  filter: "筛选",
};

const chartTypes: ChartType[] = [
  "bar",
  "line",
  "pie",
  "scatter",
  "area",
  "radar",
  "heatmap",
];

const dragOverSlot = ref<SlotType | null>(null);

const activeChart = computed(() => chartsStore.activeChart);
const activeDataSource = computed(() => {
  if (!activeChart.value) return null;
  return dataSourcesStore.dataSources.find(
    (ds) => ds.id === activeChart.value?.dataSourceId,
  );
});

function handleDragOver(event: DragEvent, slot: SlotType) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  dragOverSlot.value = slot;
}

function handleDragLeave() {
  dragOverSlot.value = null;
}

async function handleDrop(event: DragEvent, slot: SlotType) {
  event.preventDefault();
  dragOverSlot.value = null;

  const fieldName = event.dataTransfer?.getData("text/plain");
  if (!fieldName || !activeChart.value || !activeDataSource.value) return;

  const slotField: SlotField = {
    fieldName,
    aggregation: slot === "y" || slot === "metric" ? "sum" : undefined,
  };

  await chartsStore.setSlot(slot as keyof ChartSlots, slotField, activeDataSource.value.fields);
}

async function handleRemoveFromSlot(slot: SlotType, fieldName?: string) {
  await chartsStore.removeFromSlot(slot as keyof ChartSlots, fieldName);
}

async function handleAggregationChange(
  slotField: SlotField,
  newAgg: AggregationType,
) {
  slotField.aggregation = newAgg;
  if (activeChart.value) {
    await chartsStore.updateChart(activeChart.value);
  }
}

function generateEChartsOption() {
  if (!activeChart.value || !activeDataSource.value) return null;

  const chart = activeChart.value;
  const ds = activeDataSource.value;

  if (!chart.chartType) return null;

  const { categories, series } = prepareChartData(ds, chart.slots);

  if (categories.length === 0 && series.length === 0) return null;

  const commonOptions = {
    title: {
      text: chart.title,
      left: "center",
      textStyle: {
        fontSize: chart.style.fontSize + 4,
        fontFamily: chart.style.fontFamily,
      },
    },
    tooltip: {
      show: chart.style.showTooltip,
      trigger: chart.chartType === "pie" ? "item" : "axis",
    },
    legend: {
      show: true,
      position: chart.style.legendPosition,
      textStyle: {
        fontSize: chart.style.fontSize,
        fontFamily: chart.style.fontFamily,
      },
    },
    color: chart.style.colors,
    textStyle: {
      fontSize: chart.style.fontSize,
      fontFamily: chart.style.fontFamily,
    },
  };

  switch (chart.chartType) {
    case "bar":
      return {
        ...commonOptions,
        xAxis: {
          show: chart.style.xAxisConfig.show,
          type: "category",
          data: categories,
          axisLabel: {
            rotate: chart.style.xAxisConfig.rotate,
          },
        },
        yAxis: {
          show: chart.style.yAxisConfig.show,
          type: "value",
          axisLabel: {
            rotate: chart.style.yAxisConfig.rotate,
          },
        },
        series: series.map((s) => ({
          name: s.name,
          type: "bar",
          data: s.data,
        })),
      };

    case "line":
      return {
        ...commonOptions,
        xAxis: {
          show: chart.style.xAxisConfig.show,
          type: "category",
          data: categories,
          axisLabel: {
            rotate: chart.style.xAxisConfig.rotate,
          },
        },
        yAxis: {
          show: chart.style.yAxisConfig.show,
          type: "value",
          axisLabel: {
            rotate: chart.style.yAxisConfig.rotate,
          },
        },
        series: series.map((s) => ({
          name: s.name,
          type: "line",
          data: s.data,
          smooth: true,
        })),
      };

    case "area":
      return {
        ...commonOptions,
        xAxis: {
          show: chart.style.xAxisConfig.show,
          type: "category",
          data: categories,
          boundaryGap: false,
          axisLabel: {
            rotate: chart.style.xAxisConfig.rotate,
          },
        },
        yAxis: {
          show: chart.style.yAxisConfig.show,
          type: "value",
          axisLabel: {
            rotate: chart.style.yAxisConfig.rotate,
          },
        },
        series: series.map((s) => ({
          name: s.name,
          type: "line",
          data: s.data,
          areaStyle: {},
        })),
      };

    case "pie":
      const pieData =
        series.length > 0
          ? categories.map((cat, i) => ({
              name: String(cat),
              value: series[0].data[i] || 0,
            }))
          : [];
      return {
        ...commonOptions,
        series: [
          {
            type: "pie",
            radius: "50%",
            data: pieData,
          },
        ],
      };

    case "scatter":
      return {
        ...commonOptions,
        xAxis: {
          show: chart.style.xAxisConfig.show,
          type: "value",
        },
        yAxis: {
          show: chart.style.yAxisConfig.show,
          type: "value",
        },
        series: series.map((s) => ({
          name: s.name,
          type: "scatter",
          data: s.data.map((v, i) => [v, series[1]?.data[i] || 0]),
        })),
      };

    case "radar":
      return {
        ...commonOptions,
        radar: {
          indicator: categories.map((cat) => ({
            name: String(cat),
            max: Math.max(...series.flatMap((s) => s.data), 100),
          })),
        },
        series: series.map((s) => ({
          name: s.name,
          type: "radar",
          data: [{ value: s.data, name: s.name }],
        })),
      };

    case "heatmap":
      const heatmapData: number[][] = [];
      for (let i = 0; i < categories.length; i++) {
        for (let j = 0; j < series.length; j++) {
          heatmapData.push([i, j, series[j].data[i] || 0]);
        }
      }
      return {
        ...commonOptions,
        xAxis: {
          type: "category",
          data: categories,
        },
        yAxis: {
          type: "category",
          data: series.map((s) => s.name),
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.map((d) => d[2]), 1),
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: "10%",
        },
        series: [
          {
            name: "Heatmap",
            type: "heatmap",
            data: heatmapData,
            label: {
              show: true,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      };

    default:
      return null;
  }
}

function renderChart() {
  if (!chartRef.value || !activeChart.value) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const option = generateEChartsOption();
  if (option) {
    chartInstance.setOption(option, true);
  } else {
    chartInstance.clear();
  }
}

function handleResize() {
  chartInstance?.resize();
}

function handleExportPNG() {
  if (chartInstance && activeChart.value) {
    exportChartAsPNG(chartInstance, activeChart.value.title);
  }
}

function handleExportSVG() {
  if (chartInstance && activeChart.value) {
    exportChartAsSVG(chartInstance, activeChart.value.title);
  }
}

watch(
  () => [activeChart.value, activeDataSource.value],
  () => {
    nextTick(() => renderChart());
  },
  { deep: true },
);

onMounted(() => {
  window.addEventListener("resize", handleResize);
  nextTick(() => renderChart());
});
</script>

<template>
  <div class="chart-canvas flex flex-col h-full">
    <div v-if="activeChart" class="flex-1 flex flex-col">
      <div
        class="p-2 border-b border-[var(--border-color)] flex items-center justify-between"
      >
        <input
          v-model="activeChart.title"
          class="input text-lg font-bold bg-transparent border-none outline-none flex-1"
          placeholder="图表标题"
        />
        <div class="flex gap-2">
          <select
            class="select"
            :value="activeChart.chartType || ''"
            @change="
              chartsStore.setChartType(
                ($event.target as HTMLSelectElement).value as ChartType,
              )
            "
          >
            <option value="" disabled>自动推断</option>
            <option v-for="type in chartTypes" :key="type" :value="type">
              {{ i18nStore.t(`chart.${type}`) }}
            </option>
          </select>
          <button class="btn" @click="handleExportPNG">📷 PNG</button>
          <button class="btn" @click="handleExportSVG">📐 SVG</button>
        </div>
      </div>

      <div class="p-2 border-b border-[var(--border-color)]">
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="slot in ['x', 'group', 'legend'] as SlotType[]"
            :key="slot"
            class="slot-container border border-dashed rounded p-2 min-h-[60px] transition-colors"
            :class="
              dragOverSlot === slot
                ? 'drag-over'
                : 'border-[var(--border-color)]'
            "
            @dragover="handleDragOver($event, slot)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, slot)"
          >
            <div class="text-xs text-secondary mb-1">
              {{ slotLabels[slot] }}
            </div>
            <template v-if="activeChart.slots[slot as keyof ChartSlots]">
              <div
                class="flex items-center gap-1 bg-[var(--primary-color)] bg-opacity-10 rounded px-2 py-1"
              >
                <span class="text-sm">{{
                  (activeChart.slots[slot as keyof ChartSlots] as SlotField).fieldName
                }}</span>
                <button
                  class="text-xs hover:text-[var(--danger-color)]"
                  @click="handleRemoveFromSlot(slot)"
                >
                  ✕
                </button>
              </div>
            </template>
            <template v-else>
              <div class="text-xs text-secondary">
                {{ i18nStore.t("chart.dropFieldHere") }}
              </div>
            </template>
          </div>

          <div
            class="slot-container border border-dashed rounded p-2 min-h-[60px] transition-colors col-span-2"
            :class="
              dragOverSlot === 'y'
                ? 'drag-over'
                : 'border-[var(--border-color)]'
            "
            @dragover="handleDragOver($event, 'y')"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, 'y')"
          >
            <div class="text-xs text-secondary mb-1">{{ slotLabels.y }}</div>
            <template v-if="activeChart.slots.y.length > 0">
              <div class="flex flex-wrap gap-1">
                <div
                  v-for="(yField, index) in activeChart.slots.y"
                  :key="index"
                  class="flex items-center gap-1 bg-[var(--primary-color)] bg-opacity-10 rounded px-2 py-1"
                >
                  <span class="text-sm">{{ yField.fieldName }}</span>
                  <select
                    class="select text-xs border-none bg-transparent outline-none"
                    :value="yField.aggregation"
                    @change="
                      handleAggregationChange(
                        yField,
                        ($event.target as HTMLSelectElement)
                          .value as AggregationType,
                      )
                    "
                  >
                    <option value="sum">Σ</option>
                    <option value="avg">AVG</option>
                    <option value="max">MAX</option>
                    <option value="min">MIN</option>
                    <option value="count">CNT</option>
                    <option value="distinctCount">DST</option>
                  </select>
                  <button
                    class="text-xs hover:text-[var(--danger-color)]"
                    @click="handleRemoveFromSlot('y', yField.fieldName)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="text-xs text-secondary">
                {{ i18nStore.t("chart.dropFieldHere") }}
              </div>
            </template>
          </div>

          <div
            class="slot-container border border-dashed rounded p-2 min-h-[60px] transition-colors"
            :class="
              dragOverSlot === 'metric'
                ? 'drag-over'
                : 'border-[var(--border-color)]'
            "
            @dragover="handleDragOver($event, 'metric')"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, 'metric')"
          >
            <div class="text-xs text-secondary mb-1">
              {{ slotLabels.metric }}
            </div>
            <template v-if="activeChart.slots.metric">
              <div
                class="flex items-center gap-1 bg-[var(--primary-color)] bg-opacity-10 rounded px-2 py-1"
              >
                <span class="text-sm">{{
                  activeChart.slots.metric.fieldName
                }}</span>
                <select
                  class="select text-xs border-none bg-transparent outline-none"
                  :value="activeChart.slots.metric.aggregation"
                >
                  <option value="sum">Σ</option>
                  <option value="avg">AVG</option>
                  <option value="max">MAX</option>
                  <option value="min">MIN</option>
                  <option value="count">CNT</option>
                </select>
                <button
                  class="text-xs hover:text-[var(--danger-color)]"
                  @click="handleRemoveFromSlot('metric')"
                >
                  ✕
                </button>
              </div>
            </template>
            <template v-else>
              <div class="text-xs text-secondary">
                {{ i18nStore.t("chart.dropFieldHere") }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <div ref="chartRef" class="flex-1 min-h-0"></div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-secondary">
      <div class="text-center">
        <div class="text-4xl mb-4">📊</div>
        <div>选择或创建一个图表</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chart-canvas {
  background-color: var(--card-bg);
}

.slot-container {
  min-height: 60px;
}
</style>
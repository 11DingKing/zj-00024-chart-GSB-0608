import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { DataSource, DataField, FieldType, BucketConfig } from "../types";
import { parseFile } from "../utils/fileParser";
import { generateId } from "../utils/chartUtils";
import {
  convertFieldType,
  applyComputedFields,
  applyBuckets,
} from "../utils/dataProcessor";
import * as idb from "../utils/idb";

function recordHistory(type: string, description: string) {
  import("./history").then(({ useHistoryStore }) => {
    const historyStore = useHistoryStore();
    if (!historyStore.isRestoring) {
      historyStore.push(type, description);
    }
  });
}

export const useDataSourcesStore = defineStore("dataSources", () => {
  const dataSources = ref<DataSource[]>([]);
  const activeDataSourceId = ref<string | null>(null);
  const isLoading = ref(false);

  const activeDataSource = computed(
    () =>
      dataSources.value.find((ds) => ds.id === activeDataSourceId.value) ||
      null,
  );

  async function loadDataSources() {
    isLoading.value = true;
    try {
      dataSources.value = await idb.getAllDataSources();
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadFile(file: File): Promise<DataSource> {
    const parsed = await parseFile(file);
    const now = Date.now();
    const dataSource: DataSource = {
      id: generateId(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      fileName: file.name,
      fields: parsed.fields,
      rows: parsed.rows,
      createdAt: now,
      updatedAt: now,
    };

    dataSources.value.push(dataSource);
    await idb.saveDataSource(dataSource);
    recordHistory("upload", `上传数据源: ${dataSource.name}`);

    return dataSource;
  }

  async function selectDataSource(id: string) {
    activeDataSourceId.value = id;
    recordHistory("select", "切换数据源");
  }

  async function updateDataSource(dataSource: DataSource) {
    const index = dataSources.value.findIndex((ds) => ds.id === dataSource.id);
    if (index !== -1) {
      dataSources.value[index] = {
        ...dataSource,
        updatedAt: Date.now(),
      };
      await idb.saveDataSource(dataSources.value[index]);
      recordHistory("update", `更新数据源: ${dataSource.name}`);
    }
  }

  async function changeFieldType(fieldName: string, newType: FieldType) {
    if (!activeDataSource.value) return;

    const updated = convertFieldType(
      activeDataSource.value,
      fieldName,
      newType,
    );
    await updateDataSource(updated);
  }

  async function addComputedField(
    field: Omit<DataField, "type"> & { type?: FieldType },
  ) {
    if (!activeDataSource.value) return;

    const newField: DataField = {
      ...field,
      type: field.type || "number",
      computed: true,
    };

    const dataSourceWithComputed = applyComputedFields(activeDataSource.value, [
      newField,
    ]);
    await updateDataSource(dataSourceWithComputed);
  }

  async function addBucket(fieldName: string, bucketConfig: BucketConfig) {
    if (!activeDataSource.value) return;

    const field = activeDataSource.value.fields.find(
      (f) => f.name === fieldName,
    );
    if (!field) return;

    const dataSourceWithBuckets = applyBuckets(
      activeDataSource.value,
      fieldName,
      bucketConfig,
    );
    await updateDataSource(dataSourceWithBuckets);
  }

  async function deleteDataSource(id: string) {
    const index = dataSources.value.findIndex((ds) => ds.id === id);
    const dsName = dataSources.value[index]?.name || "";
    if (index !== -1) {
      dataSources.value.splice(index, 1);
      await idb.deleteDataSource(id);

      if (activeDataSourceId.value === id) {
        activeDataSourceId.value = dataSources.value[0]?.id || null;
      }
      recordHistory("delete", `删除数据源: ${dsName}`);
    }
  }

  async function renameDataSource(id: string, newName: string) {
    const dataSource = dataSources.value.find((ds) => ds.id === id);
    if (dataSource) {
      dataSource.name = newName;
      dataSource.updatedAt = Date.now();
      await idb.saveDataSource(dataSource);
      recordHistory("rename", `重命名数据源: ${newName}`);
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
    renameDataSource,
  };
});

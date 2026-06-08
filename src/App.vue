<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { computed, onMounted } from 'vue'

const settingsStore = useSettingsStore()

const isDark = computed(() => settingsStore.isDark)

onMounted(() => {
  settingsStore.initialize()
})
</script>

<template>
  <div :class="['app-container', { 'dark-mode': isDark }]">
    <RouterView />
  </div>
</template>

<style lang="scss">
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
  color: #303133;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;

  &.dark-mode {
    background-color: #1a1a2e;
    color: #e0e0e0;
  }
}
</style>

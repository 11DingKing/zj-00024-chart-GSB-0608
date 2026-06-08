import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryRecord } from '../types'

const MAX_HISTORY = 50

export const useHistoryStore = defineStore('history', () => {
  const past = ref<HistoryRecord[]>([])
  const present = ref<HistoryRecord | null>(null)
  const future = ref<HistoryRecord[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function push(
    type: string,
    description: string,
    state: Record<string, any>
  ) {
    if (present.value) {
      past.value.push(present.value)
      if (past.value.length > MAX_HISTORY) {
        past.value.shift()
      }
    }

    present.value = {
      timestamp: Date.now(),
      type,
      description,
      state
    }

    future.value = []
  }

  function undo(): HistoryRecord | null {
    if (past.value.length === 0) return null

    const prev = past.value.pop()!
    if (present.value) {
      future.value.unshift(present.value)
    }
    present.value = prev

    return prev
  }

  function redo(): HistoryRecord | null {
    if (future.value.length === 0) return null

    const next = future.value.shift()!
    if (present.value) {
      past.value.push(present.value)
    }
    present.value = next

    return next
  }

  function clear() {
    past.value = []
    present.value = null
    future.value = []
  }

  return {
    past,
    present,
    future,
    canUndo,
    canRedo,
    push,
    undo,
    redo,
    clear
  }
})

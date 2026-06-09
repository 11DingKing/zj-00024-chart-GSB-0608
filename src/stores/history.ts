import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryRecord } from '../types'

const MAX_HISTORY = 50

function cloneState<T>(state: T): T {
  if (state === null || state === undefined) return state
  try {
    return JSON.parse(JSON.stringify(state))
  } catch {
    return state
  }
}

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
    const record: HistoryRecord = {
      timestamp: Date.now(),
      type,
      description,
      state: cloneState(state)
    }

    if (present.value) {
      past.value.push(present.value)
    } else {
      // First push: capture an implicit baseline so the very first
      // action can be undone back to the initial state.
      past.value.push({
        timestamp: record.timestamp,
        type: '__initial__',
        description: 'initial',
        state: {}
      })
    }
    if (past.value.length > MAX_HISTORY) {
      past.value.shift()
    }

    present.value = record
    future.value = []
  }

  function undo(): HistoryRecord | null {
    if (past.value.length === 0) return null

    const prev = past.value.pop()!
    if (present.value) {
      future.value.unshift(present.value)
    }
    present.value = prev

    return {
      ...prev,
      state: cloneState(prev.state)
    }
  }

  function redo(): HistoryRecord | null {
    if (future.value.length === 0) return null

    const next = future.value.shift()!
    if (present.value) {
      past.value.push(present.value)
    }
    present.value = next

    return {
      ...next,
      state: cloneState(next.state)
    }
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

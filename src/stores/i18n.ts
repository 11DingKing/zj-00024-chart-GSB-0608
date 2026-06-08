import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { zh, en } from '../i18n'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<'zh' | 'en'>('zh')
  const messages = { zh, en }

  const currentMessages = computed(() => messages[locale.value])

  function setLocale(lang: 'zh' | 'en') {
    locale.value = lang
  }

  function t(key: string): string {
    const keys = key.split('.')
    let value: any = currentMessages.value
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    return typeof value === 'string' ? value : key
  }

  return {
    locale,
    currentMessages,
    setLocale,
    t
  }
})

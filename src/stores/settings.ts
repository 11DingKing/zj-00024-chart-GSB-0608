import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useI18nStore } from './i18n'

const STORAGE_KEY = 'dataviz_settings'

export const useSettingsStore = defineStore('settings', () => {
  const i18nStore = useI18nStore()

  const isDark = ref(false)
  const language = ref<'zh' | 'en'>('zh')

  const currentLanguage = computed(() => language.value)

  function initialize() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        isDark.value = settings.isDark ?? false
        language.value = settings.language ?? 'zh'
      } catch (e) {
        console.error('Failed to load settings', e)
      }
    }
    i18nStore.setLocale(language.value)
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isDark: isDark.value,
        language: language.value
      })
    )
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value
    save()
  }

  function setLanguage(lang: 'zh' | 'en') {
    language.value = lang
    i18nStore.setLocale(lang)
    save()
  }

  return {
    isDark,
    language,
    currentLanguage,
    initialize,
    toggleDarkMode,
    setLanguage
  }
})

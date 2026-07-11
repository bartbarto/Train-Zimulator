import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getLocale, setLocale as persistLocale, t as translate } from '@/i18n'
import type { Locale } from '@/i18n/types'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<Locale>(getLocale())
  const tick = ref(0)

  watch(locale, (value) => {
    persistLocale(value)
    tick.value++
  }, { immediate: true })

  function setLocale(value: Locale): void {
    locale.value = value
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    tick.value
    return translate(key, params)
  }

  return {
    locale,
    setLocale,
    t,
    localeLabel: computed(() => locale.value),
  }
})

export function useI18n() {
  const store = useI18nStore()
  return {
    locale: computed(() => store.locale),
    setLocale: store.setLocale,
    t: store.t,
  }
}

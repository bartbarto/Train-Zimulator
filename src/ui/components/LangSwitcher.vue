<script setup lang="ts">
import { useI18n } from '@/stores/i18nStore'
import { LOCALES } from '@/i18n/types'

const { locale, setLocale, t } = useI18n()
</script>

<template>
  <div class="lang-switcher">
    <!-- <span class="label">{{ t('menu.language') }}</span> -->
    <div class="options" role="group" :aria-label="t('menu.language')">
      <button
        v-for="opt in LOCALES"
        :key="opt.id"
        class="lang-btn"
        :class="{ active: locale === opt.id }"
        @click="setLocale(opt.id)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  position: absolute;
  top: 1rem;
  right: 1rem;
}
.label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.options {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  justify-content: center;
}
.lang-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1.5px solid var(--divider);
  color: var(--text);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.lang-btn:hover {
  border-color: var(--brand-blue);
  background: var(--nmbs-blue-tint);
  transform: none;
}
.lang-btn.active {
  background: var(--brand-blue);
  color: var(--text-light);
  border-color: var(--brand-blue);
}
</style>

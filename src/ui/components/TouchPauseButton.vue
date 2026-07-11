<script setup lang="ts">
import { useI18n } from '@/stores/i18nStore'

defineEmits<{ pause: [] }>()
const { t } = useI18n()
</script>

<template>
  <button type="button" class="touch-pause" @click="$emit('pause')">
    {{ t('hud.touchPause') }}
  </button>
</template>

<style scoped>
.touch-pause {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  padding: 0.5rem 1rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(0, 56, 117, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(0, 56, 117, 0.35);
  touch-action: manipulation;
}

.touch-pause:active {
  transform: scale(0.97);
  background: rgba(0, 56, 117, 0.72);
}
</style>

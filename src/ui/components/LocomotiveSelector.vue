<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import { useI18n } from '@/stores/i18nStore'
import type { Game } from '@/Game'

const props = defineProps<{ game: Game }>()

const store = useSimStore()
const { locomotiveId, locomotiveOptions, locomotiveSwitching, phase } = storeToRefs(store)
const { t } = useI18n()

async function onSelect(event: Event): Promise<void> {
  const id = (event.target as HTMLSelectElement).value
  if (!id || id === locomotiveId.value || locomotiveSwitching.value) return

  const wasPlaying = phase.value === 'playing'
  if (wasPlaying) props.game.setPaused(true)

  store.setLocomotiveSwitching(true)
  const ok = await props.game.switchLocomotive(id)
  store.setLocomotiveSwitching(false)

  if (!ok) {
    ;(event.target as HTMLSelectElement).value = locomotiveId.value
    if (wasPlaying) props.game.setPaused(false)
  }
}
</script>

<template>
  <div class="loco-picker panel" :class="{ switching: locomotiveSwitching }">
    <label class="mono">
      <span class="label">{{ t('locoSelector.locomotive') }}</span>
      <select :value="locomotiveId" :disabled="locomotiveSwitching" @change="onSelect">
        <option v-for="loco in locomotiveOptions" :key="loco.id" :value="loco.id">
          {{ loco.name }}
        </option>
      </select>
    </label>
    <span v-if="locomotiveSwitching" class="status mono">{{ t('locoSelector.switching') }}</span>
  </div>
</template>

<style scoped>
.loco-picker {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.45rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 220px;
  z-index: 10;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
}
.label {
  color: var(--muted);
  letter-spacing: 0.08rem;
  text-transform: uppercase;
}
select {
  width: 100%;
  background: rgba(0, 0, 0, 0.35);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font: inherit;
  cursor: pointer;
}
select:disabled {
  opacity: 0.6;
  cursor: wait;
}
.status {
  color: var(--accent);
  font-size: 0.7rem;
}
.switching select {
  border-color: var(--accent);
}
</style>

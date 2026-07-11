<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SessionResult } from '@/simulation/SessionStats'

const props = defineProps<{ result: SessionResult }>()
const emit = defineEmits<{ menu: [] }>()

const showOffences = ref(false)
const r = computed(() => props.result)

const timeLabel = computed(() => formatDuration(r.value.elapsedSeconds))
const stationsLabel = computed(() => `${r.value.stationsServed} / ${r.value.stationsTotal}`)
const distanceLabel = computed(() => `${(r.value.distanceMetres / 1000).toFixed(1)} km`)
const rating = computed(() => {
  const missed = r.value.stationsTotal - r.value.stationsServed
  if (r.value.offences === 0 && missed === 0) return 'Excellent run'
  if (r.value.offences <= 2 && missed === 0) return 'Good run'
  if (missed > 0) return 'Incomplete service'
  return 'Room for improvement'
})

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatOffenceTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="scrim">
    <div class="screen menu-surface">
      <header class="menu-header">
        <div>
          <h2>End of line</h2>
          <p class="route">{{ r.routeName }}</p>
        </div>
        <span class="rating">{{ rating }}</span>
      </header>

      <div class="stats">
        <div class="stat">
          <span class="label">Time taken</span>
          <span class="value mono">{{ timeLabel }}</span>
        </div>
        <div class="stat offences-row">
          <span class="label">Offences</span>
          <div class="offences-summary">
            <span class="value mono" :class="{ bad: r.offences > 0 }">{{ r.offences }}</span>
            <button
              v-if="r.offences > 0"
              class="view-offences"
              @click="showOffences = !showOffences"
            >
              {{ showOffences ? 'Hide details' : 'View details' }}
            </button>
          </div>
        </div>
        <ul v-if="showOffences && r.offenceDetails.length" class="offence-list">
          <li v-for="(offence, i) in r.offenceDetails" :key="i">
            <span class="offence-time mono">{{ formatOffenceTime(offence.elapsedSeconds) }}</span>
            <span class="offence-label">{{ offence.label }}</span>
          </li>
        </ul>
        <div class="stat">
          <span class="label">Passengers transported</span>
          <span class="value mono">{{ r.passengersTransported }}</span>
        </div>
        <div class="stat">
          <span class="label">Stations served</span>
          <span class="value mono" :class="{ bad: r.stationsServed < r.stationsTotal }">{{ stationsLabel }}</span>
        </div>
        <div class="stat">
          <span class="label">Distance traveled</span>
          <span class="value mono">{{ distanceLabel }}</span>
        </div>
      </div>

      <footer>
        <button class="primary" @click="emit('menu')">Back to menu</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
}

.screen {
  width: min(480px, 92vw);
  overflow: hidden;
  color: var(--text);
}

.menu-header {
  align-items: flex-start;
  gap: 1rem;
}

.menu-header h2 {
  font-size: 1.35rem;
}

.route {
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 0.2rem;
  font-weight: 500;
}

.rating {
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.18);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.stats {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--divider);
}

.stat:last-child {
  border-bottom: none;
}

.label {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 500;
}

.value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nmbs-blue-dark);
}

.value.bad {
  color: var(--danger);
}

.offences-summary {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.view-offences {
  font-size: 0.75rem;
  padding: 0.3rem 0.75rem;
  font-weight: 600;
}

.offence-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 1.5rem 0.85rem;
  border-bottom: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.offence-list li {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  font-size: 0.82rem;
}

.offence-time {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  min-width: 2.5rem;
}

.offence-label {
  color: var(--nmbs-red-dark);
  font-weight: 500;
  line-height: 1.35;
}

footer {
  padding: 1.1rem 1.5rem;
  border-top: 1px solid var(--divider);
  background: var(--surface-muted);
  display: flex;
  justify-content: center;
}

footer button {
  min-width: 160px;
  padding: 0.65rem 1.5rem;
}
</style>

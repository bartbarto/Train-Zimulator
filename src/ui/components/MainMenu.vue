<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import { useI18n } from '@/stores/i18nStore'
import type { SettingsManager } from '@/core/SettingsManager'
import type { BestScoresManager } from '@/core/BestScoresManager'
import { formatDuration } from '@/core/SessionScore'
import SettingsPanel from '@/ui/components/SettingsPanel.vue'
import LangSwitcher from '@/ui/components/LangSwitcher.vue'

const props = defineProps<{ settings: SettingsManager; bestScores: BestScoresManager }>()
const emit = defineEmits<{ start: [locomotiveId: string, routeId: string] }>()

const store = useSimStore()
const { locomotiveOptions, routeOptions, locomotiveId, routeId } = storeToRefs(store)
const { t } = useI18n()

const showSettings = ref(false)
const selectedLocoId = ref('')
const selectedRouteId = ref('')

watch(locomotiveId, (id) => { if (id) selectedLocoId.value = id }, { immediate: true })
watch(routeId, (id) => { if (id) selectedRouteId.value = id }, { immediate: true })

const selectedLoco = computed(() => locomotiveOptions.value.find((l) => l.id === selectedLocoId.value))
const selectedRoute = computed(() => routeOptions.value.find((r) => r.id === selectedRouteId.value))
const personalBest = computed(() =>
  selectedLocoId.value && selectedRouteId.value
    ? props.bestScores.get(selectedRouteId.value, selectedLocoId.value)
    : null,
)

function powerLabel(type: string): string {
  if (type === 'diesel') return t('power.diesel')
  if (type === 'electric') return t('power.electric')
  if (type === 'steam') return t('power.steam')
  return type
}

function start(): void {
  if (!selectedLocoId.value || !selectedRouteId.value) return
  emit('start', selectedLocoId.value, selectedRouteId.value)
}
</script>

<template>
  <div class="menu">
    <div class="brand">
      <div class="logo" aria-hidden="true">
        <img src="/logo_clean.svg" :alt="t('app.title')" />
      </div>
      <h1>{{ t('app.title') }}</h1>
      <p class="tagline">{{ t('app.tagline') }}</p>
    </div>

    <div class="layout menu-surface">
      <section class="picker">
        <h2>{{ t('menu.locomotive') }}</h2>
        <div class="cards">
          <button
            v-for="loco in locomotiveOptions"
            :key="loco.id"
            class="card"
            :class="{ active: selectedLocoId === loco.id }"
            @click="selectedLocoId = loco.id"
          >
            <span class="name">{{ loco.name }}</span>
            <span class="type mono">{{ powerLabel(loco.type) }}</span>
          </button>
        </div>
      </section>

      <section class="picker">
        <h2>{{ t('menu.route') }}</h2>
        <div class="cards">
          <button
            v-for="route in routeOptions"
            :key="route.id"
            class="card"
            :class="{ active: selectedRouteId === route.id }"
            @click="selectedRouteId = route.id"
          >
            <span class="name">{{ route.name }}</span>
          </button>
        </div>
      </section>

      <aside class="stats">
        <h2>{{ t('menu.details') }}</h2>
        <template v-if="selectedLoco">
          <h3>{{ selectedLoco.name }}</h3>
          <dl class="mono">
            <div><dt>{{ t('menu.type') }}</dt><dd>{{ powerLabel(selectedLoco.type) }}</dd></div>
            <div><dt>{{ t('menu.maxSpeed') }}</dt><dd>{{ selectedLoco.maxSpeedKmh }} km/h</dd></div>
            <div><dt>{{ t('menu.power') }}</dt><dd>{{ selectedLoco.maxPowerKW }} kW</dd></div>
            <div><dt>{{ t('menu.mass') }}</dt><dd>{{ selectedLoco.massTonnes }} t</dd></div>
            <div><dt>{{ t('menu.length') }}</dt><dd>{{ selectedLoco.lengthMetres }} m</dd></div>
          </dl>
        </template>
        <template v-if="selectedRoute">
          <h3>{{ selectedRoute.name }}</h3>
          <dl class="mono">
            <div><dt>{{ t('menu.length') }}</dt><dd>{{ selectedRoute.lengthMetres.toLocaleString() }} m</dd></div>
            <div><dt>{{ t('menu.stations') }}</dt><dd>{{ selectedRoute.stationCount }}</dd></div>
            <div><dt>{{ t('menu.signals') }}</dt><dd>{{ selectedRoute.signalCount }}</dd></div>
            <div><dt>{{ t('menu.lineSpeed') }}</dt><dd>{{ selectedRoute.maxSpeedKmh }} km/h</dd></div>
          </dl>
        </template>
        <template v-if="selectedLoco && selectedRoute">
          <h3 class="personal-best-heading">{{ t('menu.personalBest') }}</h3>
          <dl v-if="personalBest" class="mono personal-best">
            <div><dt>{{ t('menu.bestScore') }}</dt><dd>{{ personalBest.bestScore.toLocaleString() }}</dd></div>
            <div>
              <dt>{{ t('menu.bestTime') }}</dt>
              <dd>{{ personalBest.bestTimeSeconds != null ? formatDuration(personalBest.bestTimeSeconds) : '—' }}</dd>
            </div>
            <div><dt>{{ t('menu.attempts') }}</dt><dd>{{ personalBest.attempts }}</dd></div>
          </dl>
          <p v-else class="no-record">{{ t('menu.noRuns') }}</p>
        </template>
      </aside>
    </div>

    <LangSwitcher />

    <div class="actions">
      <button class="primary start" @click="start">{{ t('menu.start') }}</button>
      <button @click="showSettings = true">{{ t('menu.settings') }}</button>
    </div>

    <SettingsPanel v-if="showSettings" :settings="settings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 1.5rem;
  background: linear-gradient(160deg, var(--nmbs-blue-tint) 0%, var(--surface-muted) 45%, var(--surface) 100%);
  color: var(--text);
}
.brand {
  text-align: center;
}
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.4rem;
  height: auto;
}
.logo img {
  width: 100%;
  height: auto;
}
h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 0.85rem;
  line-height: 1.2;
  color: var(--nmbs-blue-dark);
}
.tagline {
  font-size: 0.9rem;
  color: var(--muted);
  margin-top: 0.35rem;
  font-weight: 500;
}
.layout {
  width: min(920px, 96vw);
  display: grid;
  grid-template-columns: 1fr 1fr minmax(210px, 250px);
  gap: 0;
  padding: 0;
  overflow: hidden;
}
.picker,
.stats {
  padding: 1.25rem 1.35rem;
  border-right: 1px solid var(--divider);
}
.stats {
  border-right: none;
  background: var(--surface-muted);
}
.picker h2,
.stats h2 {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.85rem;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  padding: 0.7rem 0.9rem;
  background: var(--surface);
  border: 1.5px solid var(--divider);
  border-radius: var(--radius-md);
  box-shadow: none;
  font-size: 0.875rem;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  border-color: var(--brand-blue);
  background: var(--nmbs-blue-tint);
  transform: none;
  box-shadow: none;
}
.card.active {
  background: var(--brand-blue);
  color: var(--text-light);
  border-color: var(--brand-blue);
  box-shadow: var(--shadow-card);
}
.card.active .type {
  color: rgba(255, 255, 255, 0.8);
}
.name {
  font-size: 0.9rem;
  font-weight: 600;
}
.type {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 500;
}
.stats h3 {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--nmbs-blue-dark);
  margin: 0.85rem 0 0.5rem;
}
.stats h3:first-of-type {
  margin-top: 0;
}
.personal-best-heading {
  /* margin-top: 1.1rem !important; */
  /* padding-top: 0.85rem; */
  /* border-top: 1px solid var(--divider); */
}
.personal-best dd {
  color: var(--brand-blue);
}
.no-record {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 500;
  margin-top: 0.35rem;
  line-height: 1.4;
}
dl {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--divider);
}
dt {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}
dd {
  font-weight: 600;
  color: var(--nmbs-blue-dark);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: center;
}
.start {
  min-width: 140px;
  padding: 0.65rem 1.5rem;
}
@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .picker,
  .stats {
    border-right: none;
    border-bottom: 1px solid var(--divider);
  }
  .stats {
    border-bottom: none;
  }
  .actions {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }
  .actions button {
    width: 100%;
  }
}
</style>

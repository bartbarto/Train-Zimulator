<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import type { SettingsManager } from '@/core/SettingsManager'
import SettingsPanel from '@/ui/components/SettingsPanel.vue'

defineProps<{ settings: SettingsManager }>()
const emit = defineEmits<{ start: [locomotiveId: string, routeId: string] }>()

const store = useSimStore()
const { locomotiveOptions, routeOptions, locomotiveId, routeId } = storeToRefs(store)

const showSettings = ref(false)
const selectedLocoId = ref('')
const selectedRouteId = ref('')

watch(locomotiveId, (id) => { if (id) selectedLocoId.value = id }, { immediate: true })
watch(routeId, (id) => { if (id) selectedRouteId.value = id }, { immediate: true })

const selectedLoco = computed(() => locomotiveOptions.value.find((l) => l.id === selectedLocoId.value))
const selectedRoute = computed(() => routeOptions.value.find((r) => r.id === selectedRouteId.value))

function powerLabel(type: string): string {
  if (type === 'diesel') return 'Diesel'
  if (type === 'electric') return 'Electric'
  if (type === 'steam') return 'Steam'
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
      <div class="logo"><span /><span /><span /></div>
      <h1>TRAIN ZIMULATOR</h1>
      <p class="tagline mono">Select your train and route</p>
    </div>

    <div class="layout">
      <section class="picker">
        <h2>Locomotive</h2>
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
        <h2>Route</h2>
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
        <h2>Details</h2>
        <template v-if="selectedLoco">
          <h3>{{ selectedLoco.name }}</h3>
          <dl class="mono">
            <div><dt>Type</dt><dd>{{ powerLabel(selectedLoco.type) }}</dd></div>
            <div><dt>Max speed</dt><dd>{{ selectedLoco.maxSpeedKmh }} km/h</dd></div>
            <div><dt>Power</dt><dd>{{ selectedLoco.maxPowerKW }} kW</dd></div>
            <div><dt>Mass</dt><dd>{{ selectedLoco.massTonnes }} t</dd></div>
            <div><dt>Length</dt><dd>{{ selectedLoco.lengthMetres }} m</dd></div>
          </dl>
        </template>
        <template v-if="selectedRoute">
          <h3>{{ selectedRoute.name }}</h3>
          <dl class="mono">
            <div><dt>Length</dt><dd>{{ selectedRoute.lengthMetres.toLocaleString() }} m</dd></div>
            <div><dt>Stations</dt><dd>{{ selectedRoute.stationCount }}</dd></div>
            <div><dt>Signals</dt><dd>{{ selectedRoute.signalCount }}</dd></div>
            <div><dt>Line speed</dt><dd>{{ selectedRoute.maxSpeedKmh }} km/h</dd></div>
          </dl>
        </template>
      </aside>
    </div>

    <div class="actions">
      <button class="primary start" @click="start">Start</button>
      <button @click="showSettings = true">Settings</button>
    </div>

    <footer class="mono">Add <code>?skipMenu=1</code> to the URL to skip this screen</footer>

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
  gap: 1.4rem;
  padding: 1.5rem;
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 39px,
      rgba(0, 56, 117, 0.07) 39px,
      rgba(0, 56, 117, 0.07) 40px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 39px,
      rgba(0, 56, 117, 0.07) 39px,
      rgba(0, 56, 117, 0.07) 40px
    ),
    var(--bg-warm);
  color: var(--text);
}
.brand {
  text-align: center;
}
.logo {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.35rem;
}
.logo span {
  display: block;
  width: 1.1rem;
  border: 3px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.logo span:nth-child(1) { height: 2.4rem; background: var(--nmbs-red); }
.logo span:nth-child(2) { height: 1.8rem; background: var(--nmbs-blue-dark); }
.logo span:nth-child(3) { height: 2.2rem; background: var(--nmbs-blue-light); }
h1 {
  font-size: 3.2rem;
  letter-spacing: 0.35rem;
  margin-top: 0.5rem;
  line-height: 1;
}
.tagline {
  font-family: 'Space Mono', monospace;
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 0.5rem;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
}
.layout {
  width: min(960px, 96vw);
  display: grid;
  grid-template-columns: 1fr 1fr minmax(200px, 240px);
  gap: 0;
  padding: 0;
  border: 3px solid var(--border);
  box-shadow: var(--shadow);
  background: var(--panel);
}
.picker,
.stats {
  padding: 1rem 1.1rem;
  border-right: 3px solid var(--border);
}
.stats {
  border-right: none;
  background: color-mix(in srgb, var(--highlight) 35%, var(--nmbs-white));
}
.picker h2,
.stats h2 {
  font-size: 0.95rem;
  letter-spacing: 0.18rem;
  text-transform: uppercase;
  color: var(--brand-blue);
  margin-bottom: 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 3px solid var(--border);
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  padding: 0.6rem 0.75rem;
  background: var(--bg-warm);
  border: 2px solid var(--border);
  border-radius: 0;
  box-shadow: none;
  font-family: 'Space Mono', monospace;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  text-transform: none;
}
.card:hover {
  transform: none;
  box-shadow: inset 0 0 0 2px var(--brand-blue);
}
.card.active {
  background: var(--nmbs-red);
  color: var(--text-light);
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}
.card.active .type {
  color: rgba(255, 255, 255, 0.75);
}
.name {
  font-size: 0.82rem;
  font-weight: 700;
}
.type {
  font-size: 0.68rem;
  color: var(--muted);
  text-transform: uppercase;
}
.stats h3 {
  font-size: 1rem;
  letter-spacing: 0.1rem;
  margin: 0.75rem 0 0.4rem;
}
.stats h3:first-of-type {
  margin-top: 0;
}
dl {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.72rem;
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid var(--border-light);
}
dt { color: var(--muted); text-transform: uppercase; font-size: 0.65rem; }
dd { font-weight: 700; }
.actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.start {
  min-width: 160px;
  padding: 0.7rem 1.6rem;
  font-size: 1.15rem;
}
footer {
  font-family: 'Space Mono', monospace;
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  text-transform: none;
}
code {
  color: var(--brand-blue);
  font-weight: 700;
}
@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .picker,
  .stats {
    border-right: none;
    border-bottom: 3px solid var(--border);
  }
  .stats {
    border-bottom: none;
  }
}
</style>

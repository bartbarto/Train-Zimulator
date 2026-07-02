<script setup lang="ts">
import { computed } from 'vue'
import type { UiSnapshot } from '@/ui/types'

const props = defineProps<{ snapshot: UiSnapshot }>()
const d = computed(() => props.snapshot.debug)
const s = computed(() => props.snapshot)
</script>

<template>
  <div class="debug panel mono">
    <div class="title">DEBUG</div>
    <div class="grid">
      <span>FPS</span><b :class="{ bad: d.fps < 50, ok: d.fps >= 58 }">{{ d.fps }}</b>
      <span>Draw calls</span><b>{{ d.drawCalls }}</b>
      <span>Triangles</span><b>{{ d.triangles.toLocaleString() }}</b>
      <span>Programs</span><b>{{ d.programs }}</b>
      <span>Geometries</span><b>{{ d.geometries }}</b>
      <span>Textures</span><b>{{ d.textures }}</b>
      <span>Speed m/s</span><b>{{ (s.speedKmh / 3.6).toFixed(2) }}</b>
      <span>Power lever</span><b>{{ s.powerLever.toFixed(2) }}</b>
      <span>Doors</span><b>{{ s.doorsOpen ? 'open' : 'closed' }}</b>
      <span>Next signal</span><b>{{ s.signalAspect ?? '—' }} @ {{ Math.round(s.distanceToSignal) }}m</b>
      <span>AI speed</span><b>{{ d.aiSpeedKmh.toFixed(0) }} km/h</b>
      <span>Wheel slip</span><b :class="{ bad: s.wheelSlip }">{{ s.wheelSlip ? 'YES' : 'no' }}</b>
    </div>
  </div>
</template>

<style scoped>
.debug {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.8rem 1rem;
  font-size: 0.78rem;
  min-width: 220px;
}
.title {
  color: var(--accent);
  letter-spacing: 0.2rem;
  margin-bottom: 0.5rem;
}
.grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 1rem;
}
.grid span { color: var(--muted); }
.bad { color: var(--danger); }
.ok { color: var(--ok); }
</style>

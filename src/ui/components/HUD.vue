<script setup lang="ts">
import { computed } from 'vue'
import type { UiSnapshot } from '@/ui/types'

const props = defineProps<{ snapshot: UiSnapshot }>()
const s = computed(() => props.snapshot)

const aspectLabel: Record<string, string> = {
  danger: 'STOP',
  caution: 'CAUTION',
  preliminaryCaution: 'PRELIM',
  clear: 'CLEAR',
}
const overspeed = computed(() => s.value.speedKmh > s.value.speedLimitKmh + 3)
const SPEED_ZONE_STEP_METRES = 50

function quantiseDistanceMetres(distance: number): number {
  const stepped = Math.floor(distance / SPEED_ZONE_STEP_METRES) * SPEED_ZONE_STEP_METRES
  return stepped === 0 && distance > 0 ? SPEED_ZONE_STEP_METRES : stepped
}

const speedZoneWarning = computed(() => {
  const next = s.value.upcomingSpeedLimitKmh
  if (next === null || !isFinite(s.value.distanceToSpeedLimit)) return ''
  if (s.value.distanceToSpeedLimit > 900) return ''
  const direction = next < s.value.speedLimitKmh ? 'Reduce to' : 'Speed limit'
  const distance = quantiseDistanceMetres(s.value.distanceToSpeedLimit)
  return `${direction} ${Math.round(next)} km/h in ${distance} m`
})
const POWER_DEADZONE = 0.01

const displayLever = computed(() =>
  Math.abs(s.value.powerLever) < POWER_DEADZONE ? 0 : s.value.powerLever,
)
const powerPct = computed(() => Math.round(displayLever.value * 100))
const powerFillPct = computed(() => Math.abs(displayLever.value) * 50)
const driverBrakePct = computed(() => (displayLever.value < -POWER_DEADZONE ? -powerPct.value : 0))
const autoBrakePct = computed(() => Math.round(s.value.autoBrakeDemand * 100))
const totalBrakePct = computed(() => Math.max(driverBrakePct.value, autoBrakePct.value))
const brakeFillPct = computed(() => Math.min(50, Math.abs(totalBrakePct.value) * 0.5))
const brakeBarClass = computed(() => {
  if (s.value.autoBrakeActive && driverBrakePct.value < autoBrakePct.value) return 'auto-brk'
  if (driverBrakePct.value < 0) return 'brk'
  return 'auto-brk'
})
const powerLabel = computed(() => {
  if (s.value.autoBrakeActive && driverBrakePct.value < autoBrakePct.value) return `AUTO BRAKE ${autoBrakePct.value}%`
  if (displayLever.value > POWER_DEADZONE) return `POWER ${powerPct.value}%`
  if (displayLever.value < -POWER_DEADZONE) return `BRAKE ${-powerPct.value}%`
  return 'IDLE'
})
</script>

<template>
  <div class="hud">
    <div class="top">
      <div class="objective panel">{{ s.objective }}</div>
      <div class="signal panel" :class="s.signalAspect ?? 'clear'">
        <span class="lamp" />
        <span>{{ s.signalAspect ? aspectLabel[s.signalAspect] : '—' }}</span>
      </div>
    </div>

    <div class="warnings">
      <div v-if="speedZoneWarning" class="warn speed-zone">{{ speedZoneWarning }}</div>
      <div v-if="s.autoBrakeActive" class="warn auto-brake">AUTO BRAKE — {{ s.autoBrakeLabel }}</div>
      <div v-if="!s.departureAllowed" class="warn warn-y">DEPARTURE INTERLOCK</div>
      <div v-if="s.wheelSlip" class="warn warn-y">WHEEL SLIP</div>
      <div v-if="overspeed" class="warn warn-y">OVERSPEED</div>
    </div>

    <div class="bottom">
      <div class="power panel">
        <label>POWER / BRAKE</label>
        <div class="bar">
          <span class="tick top mono">100</span>
          <div class="center" />
          <span class="tick bottom mono">−100</span>
          <div
            v-if="displayLever > POWER_DEADZONE"
            class="fill thr"
            :style="{ height: `${powerFillPct}%` }"
          />
          <div
            v-else-if="totalBrakePct > 0"
            class="fill"
            :class="brakeBarClass"
            :style="{ height: `${brakeFillPct}%` }"
          />
        </div>
        <span class="mono label">{{ powerLabel }}</span>
      </div>

      <div class="speedo panel">
        <div class="speed mono" :class="{ over: overspeed }">{{ Math.round(Math.abs(s.speedKmh)) }}</div>
        <div class="unit">km/h</div>
        <div class="limit mono">limit {{ Math.round(s.speedLimitKmh) }}</div>
      </div>

      <div class="status panel mono">
        <div class="row">
          <span>DOORS</span>
          <b :class="s.doorsOpen ? 'open' : 'closed'">{{ s.doorsOpen ? 'OPEN' : 'CLOSED' }}</b>
        </div>
        <div v-if="s.doorsOpen && !s.departureAllowed" class="row boarding">
          <span>PEOPLE ON PLATFORM</span>
          <b>{{ s.platformWaiting }}</b>
        </div>
        <div v-if="s.doorsOpen && s.boardingRemaining > 0" class="row boarding">
          <span>BOARDING</span>
          <b>{{ Math.ceil(s.boardingRemaining) }}s</b>
        </div>
        <div v-if="s.horn" class="row horn">HORN</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  font-size: 0.9rem;
}
.top {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.objective {
  padding: 0.5rem 1rem;
  background: var(--instrument-bg);
  color: var(--text-dark);
  font-family: 'Space Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.signal {
  padding: 0.45rem 0.85rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 400;
  font-size: 1rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: var(--instrument-bg);
  color: var(--text-dark);
}
.lamp {
  width: 12px;
  height: 12px;
  border-radius: 0;
  border: 2px solid var(--border);
  background: var(--muted-light);
}
.signal.clear .lamp { background: var(--signal-clear); }
.signal.caution .lamp,
.signal.preliminaryCaution .lamp { background: var(--warn); }
.signal.danger .lamp { background: var(--danger); }

.warnings {
  position: absolute;
  top: 4.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
}
.warn {
  padding: 0.35rem 0.85rem;
  border-radius: 0;
  border: 2px solid var(--border);
  /* box-shadow: var(--shadow-sm); */
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 400;
  font-size: 0.95rem;
  letter-spacing: 0.12em;
}
.warn.warn-y { background: var(--warn); color: var(--text); }
.warn.speed-zone { background: var(--highlight); color: var(--text); }
.warn.auto-brake { background: var(--nmbs-red); color: var(--text-light); }

.bottom {
  position: absolute;
  bottom: 1.4rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}
.power {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 0.9rem;
  background: var(--instrument-bg);
  color: var(--instrument-text);
}
.power > label {
  font-size: 0.65rem;
  color: var(--instrument-muted);
  letter-spacing: 0.14em;
  font-family: 'Bebas Neue', sans-serif;
}
.bar {
  width: 24px;
  height: 100px;
  border-radius: 0;
  background: var(--instrument-bg-dark);
  border: 2px solid var(--border);
  position: relative;
  overflow: hidden;
}
.tick {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5rem;
  color: var(--instrument-text);
  z-index: 1;
  pointer-events: none;
}
.tick.top { top: 2px; }
.tick.bottom { bottom: 2px; }
.center {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--border);
  transform: translateY(-50%);
}
.fill {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  transition: height 0.12s linear;
}
.fill.thr {
  bottom: 50%;
  background: var(--throttle-up);
}
.fill.brk {
  top: 50%;
  background: var(--nmbs-red);
}
.fill.auto-brk {
  top: 50%;
  background: var(--nmbs-red-dark);
}
.label {
  font-size: 0.62rem;
  color: var(--instrument-muted);
  text-transform: uppercase;
}

.speedo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.4rem 0.65rem;
  background: var(--instrument-bg);
  color: var(--instrument-text);
  min-width: 130px;
  position: relative;
}
.speedo::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid var(--border-light);
  pointer-events: none;
}
.speedo::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 10px;
  background: var(--border);
}
.speed {
  font-size: 3.6rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
}
.speed.over { color: var(--danger); }
.unit {
  color: var(--instrument-muted);
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  position: relative;
  z-index: 1;
}
.limit {
  color: var(--brand-blue);
  margin-top: 0.35rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

.status {
  padding: 0.65rem 0.9rem;
  min-width: 130px;
  background: var(--instrument-bg);
  color: var(--instrument-text);
  font-size: 0.72rem;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0;
  border-bottom: 1px solid var(--instrument-bg-dark);
}
.row:last-child { border-bottom: none; }
.row span {
  color: var(--instrument-muted);
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0.1em;
  font-size: 0.75rem;
}
.open { color: var(--warn); }
.closed { color: var(--highlight); }
.boarding { color: var(--highlight); }
.horn { color: var(--highlight); justify-content: center; font-weight: 700; }
</style>

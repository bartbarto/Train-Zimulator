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
  if (s.value.autoBrakeActive && driverBrakePct.value < autoBrakePct.value) return `Auto brake ${autoBrakePct.value}%`
  if (displayLever.value > POWER_DEADZONE) return `Power ${powerPct.value}%`
  if (displayLever.value < -POWER_DEADZONE) return `Brake ${-powerPct.value}%`
  return 'Idle'
})
</script>

<template>
  <div class="hud">
    <div class="top">
      <div class="objective hud-card">{{ s.objective }}</div>
      <div class="signal hud-card" :class="s.signalAspect ?? 'clear'">
        <span class="lamp" />
        <span>{{ s.signalAspect ? aspectLabel[s.signalAspect] : '—' }}</span>
      </div>
    </div>

    <div class="warnings">
      <div v-if="speedZoneWarning" class="warn speed-zone">{{ speedZoneWarning }}</div>
      <div v-if="s.autoBrakeActive" class="warn auto-brake">Auto brake — {{ s.autoBrakeLabel }}</div>
      <div v-if="!s.departureAllowed" class="warn warn-y">Departure interlock</div>
      <div v-if="s.wheelSlip" class="warn warn-y">Wheel slip</div>
      <div v-if="overspeed" class="warn warn-y">Overspeed</div>
    </div>

    <div class="bottom">
      <div class="power hud-card">
        <label>Power / brake</label>
        <div class="bar">
          <!-- <span class="tick top mono">100</span> -->
          <div class="center" />
          <!-- <span class="tick bottom mono">−100</span> -->
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

      <div class="speedo hud-card">
        <div class="speed mono" :class="{ over: overspeed }">{{ Math.round(Math.abs(s.speedKmh)) }}</div>
        <div class="unit">km/h</div>
        <div class="limit">Limit {{ Math.round(s.speedLimitKmh) }}</div>
      </div>

      <div class="status hud-card">
        <div class="row">
          <span>Doors</span>
          <b :class="s.doorsOpen ? 'open' : 'closed'">{{ s.doorsOpen ? 'Open' : 'Closed' }}</b>
        </div>
        <div v-if="s.doorsOpen && !s.departureAllowed" class="row boarding">
          <span>On platform</span>
          <b>{{ s.platformWaiting }}</b>
        </div>
        <div v-if="s.doorsOpen && s.boardingRemaining > 0" class="row boarding">
          <span>Boarding</span>
          <b>{{ Math.ceil(s.boardingRemaining) }}s</b>
        </div>
        <div v-if="s.horn" class="row horn">Horn</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  font-size: 0.9rem;
  font-family: inherit;
  pointer-events: none;
}

.hud-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--divider);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(8px);
}

.top {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.objective {
  padding: 0.5rem 0.95rem;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 500;
  max-width: min(420px, 80vw);
  text-align: center;
  line-height: 1.35;
}

.signal {
  padding: 0.45rem 0.85rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text);
  white-space: nowrap;
}

.lamp {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 56, 117, 0.15);
  background: var(--divider);
  flex-shrink: 0;
}

.signal.clear .lamp { background: var(--signal-clear); border-color: var(--signal-clear); }
.signal.caution .lamp,
.signal.preliminaryCaution .lamp { background: var(--warn); border-color: var(--warn); }
.signal.danger .lamp { background: var(--danger); border-color: var(--danger); }

.warnings {
  position: absolute;
  top: 4.25rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
}

.warn {
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

.warn.warn-y {
  background: #fff4e0;
  color: #7a5200;
  border-color: #f0d090;
}

.warn.speed-zone {
  background: var(--nmbs-blue-tint);
  color: var(--nmbs-blue-dark);
  border-color: #c5dff0;
}

.warn.auto-brake {
  background: #fdeaea;
  color: var(--nmbs-red-dark);
  border-color: #f0c0c0;
}

.bottom {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.55rem;
  align-items: flex-end;
}

.power {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem 0.85rem;
  color: var(--text);
}

.power > label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.bar {
  width: 22px;
  height: 96px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  border: 1px solid var(--divider);
  position: relative;
  overflow: hidden;
}

.tick {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.48rem;
  font-weight: 600;
  color: var(--muted);
  text-shadow: 1px 1px 0 1px var(--surface);
  z-index: 1;
  pointer-events: none;
}

.tick.top { top: 4px; }
.tick.bottom { bottom: 4px; }

.center {
  position: absolute;
  top: 50%;
  left: 4px;
  right: 4px;
  height: 2px;
  background: var(--divider);
  border-radius: var(--radius-pill);
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
  border-radius: 0 0 var(--radius-pill) var(--radius-pill);
}

.fill.brk {
  top: 50%;
  background: var(--nmbs-red);
  border-radius: var(--radius-pill) var(--radius-pill) 0 0;
}

.fill.auto-brk {
  top: 50%;
  background: var(--nmbs-red-dark);
  border-radius: var(--radius-pill) var(--radius-pill) 0 0;
}

.label {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--muted);
  text-align: center;
  max-width: 72px;
  line-height: 1.25;
}

.speedo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.7rem 1.25rem 0.6rem;
  color: var(--text);
  min-width: 118px;
}

.speed {
  font-size: 3rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--nmbs-blue-dark);
}

.speed.over { color: var(--danger); }

.unit {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.1rem;
}

.limit {
  color: var(--brand-blue);
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
}

.status {
  padding: 0.6rem 0.85rem;
  min-width: 128px;
  color: var(--text);
  font-size: 0.8rem;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--divider);
}

.row:last-child { border-bottom: none; }

.row span {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.row b {
  font-weight: 600;
  color: var(--nmbs-blue-dark);
}

.open { color: var(--warn) !important; }
.closed { color: var(--brand-blue) !important; }
.boarding b { color: var(--brand-blue); }
.horn {
  color: var(--brand-blue);
  justify-content: center;
  font-weight: 600;
  border-bottom: none;
}
</style>

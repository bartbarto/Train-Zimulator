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
const powerPct = computed(() => Math.round(Math.abs(s.value.powerLever) * 100))
const driverBrakePct = computed(() => (s.value.powerLever < -0.02 ? powerPct.value : 0))
const autoBrakePct = computed(() => Math.round(s.value.autoBrakeDemand * 100))
const totalBrakePct = computed(() => Math.max(driverBrakePct.value, autoBrakePct.value))
const brakeBarClass = computed(() => {
  if (s.value.autoBrakeActive && driverBrakePct.value < autoBrakePct.value) return 'auto-brk'
  if (driverBrakePct.value > 0) return 'brk'
  return 'auto-brk'
})
const powerLabel = computed(() => {
  if (s.value.autoBrakeActive && driverBrakePct.value < autoBrakePct.value) return `AUTO BRAKE ${autoBrakePct.value}%`
  if (s.value.powerLever > 0.02) return `POWER ${powerPct.value}%`
  if (s.value.powerLever < -0.02) return `BRAKE ${powerPct.value}%`
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
          <div class="center" />
          <div
            v-if="s.powerLever > 0"
            class="fill thr"
            :style="{ height: `${powerPct}%` }"
          />
          <div
            v-else-if="totalBrakePct > 0"
            class="fill"
            :class="brakeBarClass"
            :style="{ height: `${totalBrakePct}%` }"
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
}
.signal {
  padding: 0.5rem 0.9rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}
.lamp {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #555;
}
.signal.clear .lamp { background: var(--ok); }
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
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
}
.warn.warn-y { background: var(--warn); color: #1a1200; }
.warn.speed-zone { background: rgba(78, 161, 255, 0.9); color: #041222; }
.warn.auto-brake { background: rgba(255, 149, 0, 0.95); color: #1a0d00; }

.bottom {
  position: absolute;
  bottom: 1.4rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}
.power {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.8rem 1rem;
}
.power > label {
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.06rem;
}
.bar {
  width: 22px;
  height: 100px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  position: relative;
  overflow: hidden;
}
.center {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.25);
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
  background: var(--ok);
}
.fill.brk {
  top: 50%;
  background: var(--danger);
}
.fill.auto-brk {
  top: 50%;
  background: #ff9500;
  box-shadow: 0 0 10px rgba(255, 149, 0, 0.45);
}
.label {
  font-size: 0.75rem;
  color: var(--muted);
}

.speedo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.6rem 1.6rem;
}
.speed {
  font-size: 3.4rem;
  line-height: 1;
  font-weight: 700;
}
.speed.over { color: var(--danger); }
.unit { color: var(--muted); }
.limit { color: var(--warn); margin-top: 0.3rem; font-size: 0.8rem; }

.status {
  padding: 0.7rem 1rem;
  min-width: 120px;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.row span { color: var(--muted); }
.open { color: var(--warn); }
.closed { color: var(--ok); }
.boarding { color: var(--accent); }
.horn { color: var(--accent); justify-content: center; font-weight: 700; }
</style>

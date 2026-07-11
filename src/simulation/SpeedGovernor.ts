import { KMH_TO_MS, MS_TO_KMH } from '@/engine/constants'
import { clamp01 } from '@/engine/math'
import type { RouteProgress } from './RouteManager'
import type { StationServiceState, StationTractionPolicy } from './StationService'
import { getStopZoneStart, isInStopZone } from './stationZone'

export type AutoBrakeReason = 'speedLimit' | 'signal' | 'station'

export interface AutoBrakeState {
  active: boolean
  /** Minimum train-brake handle position the governor is enforcing (0..1). */
  demand: number
  reason: AutoBrakeReason | null
  targetSpeedKmh: number
  label: string
}

const IDLE: AutoBrakeState = {
  active: false,
  demand: 0,
  reason: null,
  targetSpeedKmh: 0,
  label: '',
}

/** Auto brake never takes more than a light assist — the driver stays in control. */
const MAX_AUTO_DEMAND = 0.22

const DANGER_FULL_BRAKE_DISTANCE_M = 45
const DANGER_APPROACH_DISTANCE_M = 180
const DANGER_APPROACH_KMH = 12
const STATION_ENTRY_KMH = 20
const STATION_ZONE_MARGIN_M = 25

interface SpeedAssist {
  ms: number
  reason: AutoBrakeReason
  label: string
  /** 0..1 scales how firmly this assist may apply (still capped globally). */
  strength: number
}

/**
 * Light automatic train protection. Mostly advisory — applies a gentle brake
 * nudge for station entry and restrictive signals, leaving stopping to the driver.
 */
export function computeAutoBrake(
  speedMs: number,
  distance: number,
  driverBrake: number,
  progress: RouteProgress,
  tractionPolicy: StationTractionPolicy,
  stationState: StationServiceState,
  doorsOpen: boolean,
): AutoBrakeState {
  const assists: SpeedAssist[] = []

  const signal = progress.nextSignal
  if (signal?.aspect === 'danger') {
    const d = progress.distanceToSignal
    if (d < DANGER_APPROACH_DISTANCE_M) {
      const targetKmh = d < DANGER_FULL_BRAKE_DISTANCE_M ? 0 : DANGER_APPROACH_KMH
      assists.push({
        ms: targetKmh * KMH_TO_MS,
        reason: 'signal',
        label: d < DANGER_FULL_BRAKE_DISTANCE_M ? 'Stop signal' : 'Approach stop signal',
        strength: d < DANGER_FULL_BRAKE_DISTANCE_M ? 0.85 : 0.45,
      })
    }
  }

  const station = stationState.station
  if (
    station &&
    !doorsOpen &&
    tractionPolicy !== 'inch' &&
    tractionPolicy !== 'recover' &&
    tractionPolicy !== 'full' &&
    isInStopZone(station, distance)
  ) {
    const zoneStart = getStopZoneStart(station)
    const justEntered = distance < zoneStart + STATION_ZONE_MARGIN_M
    const entryMs = STATION_ENTRY_KMH * KMH_TO_MS
    if (justEntered && speedMs > entryMs) {
      assists.push({
        ms: entryMs,
        reason: 'station',
        label: 'Ease into station',
        strength: 0.35,
      })
    }
  }

  if (assists.length === 0) return IDLE

  const assist = assists.reduce((best, next) => (next.ms < best.ms ? next : best))
  const toleranceMs = assist.reason === 'station' ? 2.5 * KMH_TO_MS : 1.2 * KMH_TO_MS
  const overspeed = Math.abs(speedMs) - assist.ms - toleranceMs
  if (overspeed <= 0) return { ...IDLE, targetSpeedKmh: assist.ms * MS_TO_KMH }

  const scale = Math.max(assist.ms, 8 * KMH_TO_MS)
  const desiredDemand = clamp01((overspeed / scale) * 0.55 * assist.strength) * MAX_AUTO_DEMAND
  const demand = Math.max(0, desiredDemand - driverBrake)
  if (demand <= 0.015) {
    return {
      active: false,
      demand: desiredDemand,
      reason: assist.reason,
      targetSpeedKmh: assist.ms * MS_TO_KMH,
      label: assist.label,
    }
  }

  return {
    active: true,
    demand: desiredDemand,
    reason: assist.reason,
    targetSpeedKmh: assist.ms * MS_TO_KMH,
    label: assist.label,
  }
}

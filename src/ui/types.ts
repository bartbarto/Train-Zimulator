import type { SignalAspect } from '@/simulation/SignalSystem'
import type { WeatherKind } from '@/simulation/Environment'
import type { SessionResult } from '@/simulation/SessionStats'
import type { RecordUpdate } from '@/core/BestScoresManager'
import type { ControlId } from '@/cab/types'

/** Debug overlay statistics. */
export interface DebugStats {
  fps: number
  drawCalls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
  aiSpeedKmh: number
}

/**
 * Flat, plain-data snapshot pushed from the engine to the reactive UI each
 * update tick. Keeping it flat and primitive avoids deep Vue reactivity cost.
 */
export interface UiSnapshot {
  speedKmh: number
  speedLimitKmh: number
  upcomingSpeedLimitKmh: number | null
  distanceToSpeedLimit: number
  /** Combined lever: +1 power, −1 brake. */
  powerLever: number
  doorsOpen: boolean
  doorsCanOpen: boolean
  departureAllowed: boolean
  boardingRemaining: number
  platformWaiting: number
  signalAspect: SignalAspect | null
  distanceToSignal: number
  nextStationName: string
  distanceToStation: number
  wheelSlip: boolean
  horn: boolean
  weather: WeatherKind
  timeOfDay: number
  hoveredControlId: ControlId | ''
  touchControls: boolean
  objective: string
  autoBrakeActive: boolean
  autoBrakeDemand: number
  autoBrakeLabel: string
  debug: DebugStats
}

export interface SessionCompletion {
  result: SessionResult
  locomotiveId: string
  routeId: string
  score: number
  record: RecordUpdate
}

export function createEmptySnapshot(): UiSnapshot {
  return {
    speedKmh: 0,
    speedLimitKmh: 0,
    upcomingSpeedLimitKmh: null,
    distanceToSpeedLimit: Infinity,
    powerLever: 0,
    doorsOpen: false,
    doorsCanOpen: false,
    departureAllowed: true,
    boardingRemaining: 0,
    platformWaiting: 0,
    signalAspect: null,
    distanceToSignal: Infinity,
    nextStationName: '—',
    distanceToStation: Infinity,
    wheelSlip: false,
    horn: false,
    weather: 'clear',
    timeOfDay: 43200,
    hoveredControlId: '',
    touchControls: false,
    objective: '',
    autoBrakeActive: false,
    autoBrakeDemand: 0,
    autoBrakeLabel: '',
    debug: { fps: 0, drawCalls: 0, triangles: 0, programs: 0, geometries: 0, textures: 0, aiSpeedKmh: 0 },
  }
}

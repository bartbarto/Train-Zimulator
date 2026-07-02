import type { WebGLInfo } from 'three'
import type { TrainTelemetry } from '@/simulation/Train'
import type { RouteProgress } from '@/simulation/RouteManager'
import type { Environment } from '@/simulation/Environment'
import type { Controls } from '@/simulation/Controls'
import type { StationServiceState } from '@/simulation/StationService'
import type { UiSnapshot } from './types'

export interface SnapshotInput {
  telemetry: TrainTelemetry
  progress: RouteProgress
  controls: Controls
  stationService: StationServiceState
  environment: Environment
  hovered: string
  fps: number
  info: WebGLInfo
  aiSpeedKmh: number
}

export function buildSnapshot(i: SnapshotInput): UiSnapshot {
  const { telemetry: t, progress: p, controls: c, stationService } = i
  const objective = stationService.message || (p.nextStation
    ? `Proceed to ${p.nextStation.name} (${formatStationDistance(p.distanceToStation)})`
    : 'End of line')

  return {
    speedKmh: t.speedKmh,
    speedLimitKmh: p.speedLimitKmh,
    upcomingSpeedLimitKmh: p.nextSpeedLimit?.limitKmh ?? null,
    distanceToSpeedLimit: p.distanceToNextSpeedLimit,
    powerLever: c.powerLever,
    doorsOpen: c.state.doorsOpen,
    doorsCanOpen: stationService.doorsCanOpen,
    departureAllowed: stationService.departureAllowed && !c.state.doorsOpen,
    boardingRemaining: stationService.boardingRemaining,
    signalAspect: p.nextSignal?.aspect ?? null,
    distanceToSignal: p.distanceToSignal,
    nextStationName: p.nextStation?.name ?? '—',
    distanceToStation: p.distanceToStation,
    wheelSlip: t.wheelSlip,
    horn: c.state.horn,
    weather: i.environment.weather,
    timeOfDay: i.environment.timeOfDay,
    hoveredControl: i.hovered,
    objective,
    autoBrakeActive: t.autoBrake.active,
    autoBrakeDemand: t.autoBrake.demand,
    autoBrakeLabel: t.autoBrake.label,
    debug: {
      fps: i.fps,
      drawCalls: i.info.render.calls,
      triangles: i.info.render.triangles,
      programs: i.info.programs?.length ?? 0,
      geometries: i.info.memory.geometries,
      textures: i.info.memory.textures,
      aiSpeedKmh: i.aiSpeedKmh,
    },
  }
}

function formatStationDistance(metres: number): string {
  if (!isFinite(metres)) return '—'
  if (metres < 0) return 'passed'
  if (metres > 1000) return `${(metres / 1000).toFixed(1)} km`
  const stepped = Math.floor(metres / 10) * 10
  const display = stepped === 0 && metres > 0 ? 10 : stepped
  return `${display} m`
}

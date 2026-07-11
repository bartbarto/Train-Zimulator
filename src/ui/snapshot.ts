import type { WebGLInfo } from 'three'
import { t } from '@/i18n'
import type { TrainTelemetry } from '@/simulation/Train'
import type { RouteProgress } from '@/simulation/RouteManager'
import type { Environment } from '@/simulation/Environment'
import type { Controls } from '@/simulation/Controls'
import type { StationServiceState } from '@/simulation/StationService'
import type { ControlId } from '@/cab/types'
import type { UiSnapshot } from './types'

export interface SnapshotInput {
  telemetry: TrainTelemetry
  progress: RouteProgress
  controls: Controls
  stationService: StationServiceState
  environment: Environment
  hoveredControlId: ControlId | ''
  fps: number
  info: WebGLInfo
  aiSpeedKmh: number
  platformWaiting: number
}

export function buildSnapshot(i: SnapshotInput): UiSnapshot {
  const { telemetry: tel, progress: p, controls: c, stationService } = i
  const objective = stationService.message || (p.nextStation
    ? t('objective.proceedTo', {
        name: p.nextStation.name,
        distance: formatStationDistance(p.distanceToStation),
      })
    : t('objective.endOfLine'))

  return {
    speedKmh: tel.speedKmh,
    speedLimitKmh: p.speedLimitKmh,
    upcomingSpeedLimitKmh: p.nextSpeedLimit?.limitKmh ?? null,
    distanceToSpeedLimit: p.distanceToNextSpeedLimit,
    powerLever: c.powerLever,
    doorsOpen: c.state.doorsOpen,
    doorsCanOpen: stationService.doorsCanOpen,
    departureAllowed: stationService.departureAllowed && !c.state.doorsOpen,
    boardingRemaining: stationService.boardingRemaining,
    platformWaiting: i.platformWaiting,
    signalAspect: p.nextSignal?.aspect ?? null,
    distanceToSignal: p.distanceToSignal,
    nextStationName: p.nextStation?.name ?? '—',
    distanceToStation: p.distanceToStation,
    wheelSlip: tel.wheelSlip,
    horn: c.state.horn,
    weather: i.environment.weather,
    timeOfDay: i.environment.timeOfDay,
    hoveredControlId: i.hoveredControlId,
    objective,
    autoBrakeActive: tel.autoBrake.active,
    autoBrakeDemand: tel.autoBrake.demand,
    autoBrakeLabel: tel.autoBrake.label,
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
  if (metres < 0) return t('objective.passed')
  if (metres > 1000) return `${(metres / 1000).toFixed(1)} km`
  const stepped = Math.floor(metres / 10) * 10
  const display = stepped === 0 && metres > 0 ? 10 : stepped
  return `${display} m`
}

import { KMH_TO_MS } from '@/engine/constants'
import type { RouteSpec, SpeedLimitSpec, StationSpec } from '@/data/types'
import { Track } from '@/world/Track'
import { SignalSystem, type SignalState } from './SignalSystem'

export interface RouteProgress {
  speedLimitKmh: number
  speedLimitMs: number
  nextSpeedLimit: SpeedLimitSpec | null
  distanceToNextSpeedLimit: number
  nextStation: StationSpec | null
  distanceToStation: number
  nextSignal: SignalState | null
  distanceToSignal: number
}

/**
 * Binds a route's static data (track, stations, speed limits, signals) to the
 * train's live position, producing the contextual information the HUD,
 * objectives and signalling need.
 */
export class RouteManager {
  readonly spec: RouteSpec
  readonly track: Track
  readonly signals: SignalSystem

  constructor(spec: RouteSpec) {
    this.spec = spec
    this.track = new Track(spec)
    this.signals = new SignalSystem(spec.signals, this.track.length)
    // Speed limits are queried in order, so keep them sorted by distance.
    this.spec.speedLimits.sort((a, b) => a.distance - b.distance)
    this.spec.stations.sort((a, b) => a.distance - b.distance)
  }

  getSpeedLimitKmh(distance: number): number {
    let limit = this.spec.speedLimits[0]?.limitKmh ?? 0
    for (const sl of this.spec.speedLimits) {
      if (sl.distance <= distance) limit = sl.limitKmh
      else break
    }
    return limit
  }

  getNextStation(distance: number): StationSpec | null {
    for (const station of this.spec.stations) {
      if (station.distance >= distance) return station
    }
    return null
  }

  getNextSpeedLimit(distance: number): SpeedLimitSpec | null {
    const current = this.getSpeedLimitKmh(distance)
    for (const limit of this.spec.speedLimits) {
      if (limit.distance > distance && limit.limitKmh !== current) return limit
    }
    return null
  }

  getProgress(distance: number): RouteProgress {
    const speedLimitKmh = this.getSpeedLimitKmh(distance)
    const nextSpeedLimit = this.getNextSpeedLimit(distance)
    const nextStation = this.getNextStation(distance)
    const nextSignal = this.signals.getNextSignal(distance)
    return {
      speedLimitKmh,
      speedLimitMs: speedLimitKmh * KMH_TO_MS,
      nextSpeedLimit,
      distanceToNextSpeedLimit: nextSpeedLimit ? nextSpeedLimit.distance - distance : Infinity,
      nextStation,
      distanceToStation: nextStation ? nextStation.distance - distance : Infinity,
      nextSignal,
      distanceToSignal: nextSignal ? nextSignal.distance - distance : Infinity,
    }
  }
}

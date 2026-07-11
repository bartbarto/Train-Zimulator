import type { LocomotiveSpec, RouteSpec } from '@/data/types'
import { Track } from '@/world/Track'

export interface LocomotiveOption {
  id: string
  name: string
  type: string
  maxSpeedKmh: number
  maxPowerKW: number
  massTonnes: number
  lengthMetres: number
}

export interface RouteOption {
  id: string
  name: string
  lengthMetres: number
  stationCount: number
  signalCount: number
  maxSpeedKmh: number
}

export function locomotiveToOption(spec: LocomotiveSpec): LocomotiveOption {
  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    maxSpeedKmh: spec.maxSpeedKmh,
    maxPowerKW: spec.maxPowerKW,
    massTonnes: spec.massTonnes,
    lengthMetres: spec.lengthMetres,
  }
}

export function routeToOption(spec: RouteSpec): RouteOption {
  const track = new Track(spec)
  const maxSpeedKmh = spec.speedLimits.reduce((max, zone) => Math.max(max, zone.limitKmh), 0)
  return {
    id: spec.id,
    name: spec.name,
    lengthMetres: Math.round(track.length),
    stationCount: spec.stations.length,
    signalCount: spec.signals.length,
    maxSpeedKmh,
  }
}

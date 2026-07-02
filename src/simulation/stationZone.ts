import type { StationSpec } from '@/data/types'

export const DEFAULT_STOP_ZONE_MIN_METRES = 30
export const DEFAULT_STOP_ZONE_MAX_METRES = 90

/** Length of the valid stopping zone, centred on the station marker. */
export function getStopZoneLength(station: StationSpec): number {
  if (station.stopZoneLength !== undefined) return station.stopZoneLength
  return Math.min(
    DEFAULT_STOP_ZONE_MAX_METRES,
    Math.max(DEFAULT_STOP_ZONE_MIN_METRES, station.platformLength * 0.5),
  )
}

export function getStopZoneStart(station: StationSpec): number {
  return station.distance - getStopZoneLength(station) / 2
}

export function getStopZoneEnd(station: StationSpec): number {
  return station.distance + getStopZoneLength(station) / 2
}

export function isInStopZone(station: StationSpec, distance: number): boolean {
  return distance >= getStopZoneStart(station) && distance <= getStopZoneEnd(station)
}

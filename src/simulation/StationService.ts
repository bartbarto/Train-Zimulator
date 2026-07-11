import type { StationSpec } from '@/data/types'
import type { Controls } from './Controls'
import type { RouteManager } from './RouteManager'
import {
  getStopZoneEnd,
  getStopZoneStart,
  isInStopZone,
} from './stationZone'

const STOPPED_SPEED_MS = 0.35
const BOARDING_SECONDS = 20
const PASSED_STATION_GRACE_METRES = 80
const INCH_ZONE_END_MARGIN_M = 1.0

export type StationPhase = 'approach' | 'stopRequired' | 'boarding' | 'readyToDepart' | 'departed'
export type StationTractionPolicy = 'full' | 'inch' | 'blocked'

export interface StationServiceState {
  phase: StationPhase
  station: StationSpec | null
  distanceToStation: number
  doorsCanOpen: boolean
  departureAllowed: boolean
  boardingRemaining: number
  message: string
  stopZoneStart: number
  stopZoneEnd: number
}

/** Enforces basic passenger-service rules for station stops and doors. */
export class StationService {
  private readonly route: RouteManager
  private readonly served = new Set<string>()
  private activeStation: StationSpec | null = null
  private boardingRemaining = 0
  private phase: StationPhase = 'approach'
  private message = ''

  constructor(route: RouteManager) {
    this.route = route
  }

  update(
    dt: number,
    controls: Controls,
    distance: number,
    speedMs: number,
    allPassengersBoarded = false,
  ): void {
    const station = this.findRelevantStation(distance)
    const stopped = Math.abs(speedMs) <= STOPPED_SPEED_MS
    const inStopZone = !!station && isInStopZone(station, distance)

    if (station && this.activeStation?.id !== station.id) {
      this.activeStation = station
      this.boardingRemaining = 0
    }

    if (!station) {
      this.phase = 'departed'
      this.message = ''
      if (controls.state.doorsOpen) controls.state.doorsOpen = false
      return
    }

    if (controls.state.doorsOpen && (!inStopZone || !stopped)) {
      controls.state.doorsOpen = false
      this.message = stopped ? 'Doors can only open in the stop zone' : 'Stop before opening doors'
    }

    if (!inStopZone || !stopped) {
      if (this.served.has(station.id)) {
        this.phase = 'departed'
        this.message = ''
      } else if (distance < getStopZoneStart(station)) {
        this.phase = 'approach'
        this.message = ''
      } else {
        this.phase = 'stopRequired'
        if (!stopped && inStopZone && !controls.state.doorsOpen && this.canInchForward(station, distance)) {
          this.message = `Creep forward in the ${station.name} stop zone`
        } else {
          this.message = stopped
            ? this.getStopZoneMessage(station, distance)
            : `Stop in the ${station.name} zone`
        }
      }
      return
    }

    if (controls.state.doorsOpen) {
      if (this.boardingRemaining <= 0 && !this.served.has(station.id)) {
        this.boardingRemaining = BOARDING_SECONDS
      }
      if (!this.served.has(station.id)) {
        this.boardingRemaining = Math.max(0, this.boardingRemaining - dt)
        if (this.boardingRemaining <= 0 || allPassengersBoarded) this.served.add(station.id)
      }
      this.phase = this.served.has(station.id) ? 'readyToDepart' : 'boarding'
      this.message = this.served.has(station.id)
        ? 'Boarding complete - close doors'
        : `Boarding ${Math.ceil(this.boardingRemaining)}s`
      return
    }

    if (this.served.has(station.id)) {
      this.phase = 'readyToDepart'
      this.message = 'Ready to depart'
      return
    }

    this.phase = 'stopRequired'
    this.message = `Open doors for ${station.name}`
  }

  toggleDoors(controls: Controls, distance: number, speedMs: number): boolean {
    if (controls.state.doorsOpen) {
      controls.state.doorsOpen = false
      return true
    }

    const station = this.findRelevantStation(distance)
    const stopped = Math.abs(speedMs) <= STOPPED_SPEED_MS
    const inStopZone = !!station && isInStopZone(station, distance)
    if (!station || !inStopZone || !stopped) {
      this.message = stopped ? 'Doors can only open in the station stop zone' : 'Stop in the station zone before opening doors'
      return false
    }

    controls.state.doorsOpen = true
    return true
  }

  canDepart(): boolean {
    const station = this.activeStation
    if (!station) return true
    if (this.phase === 'stopRequired' || this.phase === 'boarding') return false
    if (this.phase === 'approach' || this.phase === 'departed') return true
    return this.served.has(station.id)
  }

  /** Allows slow forward moves within the stop zone before full departure is permitted. */
  getTractionPolicy(controls: Controls, distance: number): StationTractionPolicy {
    if (controls.state.doorsOpen) return 'blocked'

    const station = this.activeStation
    if (!station) return 'full'
    if (this.canDepart()) return 'full'
    if (this.phase === 'approach' || this.phase === 'departed') return 'full'
    if (this.canInchForward(station, distance)) return 'inch'
    return 'blocked'
  }

  private canInchForward(station: StationSpec, distance: number): boolean {
    return (
      isInStopZone(station, distance) &&
      distance < getStopZoneEnd(station) - INCH_ZONE_END_MARGIN_M
    )
  }

  get servedCount(): number {
    return this.served.size
  }

  get totalStations(): number {
    return this.route.spec.stations.length
  }

  getRelevantStation(distance: number): StationSpec | null {
    return this.findRelevantStation(distance)
  }

  getState(distance = 0): StationServiceState {
    const station = this.activeStation
    const distanceToStation = station ? station.distance - distance : Infinity
    const stopZoneStart = station ? getStopZoneStart(station) : Infinity
    const stopZoneEnd = station ? getStopZoneEnd(station) : Infinity
    return {
      phase: this.phase,
      station,
      distanceToStation,
      doorsCanOpen: this.phase === 'stopRequired' && !!station && isInStopZone(station, distance),
      departureAllowed: this.canDepart(),
      boardingRemaining: this.boardingRemaining,
      message: this.message,
      stopZoneStart,
      stopZoneEnd,
    }
  }

  private findRelevantStation(distance: number): StationSpec | null {
    for (const station of this.route.spec.stations) {
      const delta = station.distance - distance
      if (delta >= -PASSED_STATION_GRACE_METRES && !this.served.has(station.id)) return station
      if (isInStopZone(station, distance)) return station
    }
    return null
  }

  private getStopZoneMessage(station: StationSpec, distance: number): string {
    if (distance < getStopZoneStart(station)) return `Move forward into ${station.name} stop zone`
    if (distance > getStopZoneEnd(station)) return `Overshot ${station.name} stop zone`
    return `Open doors for ${station.name}`
  }
}

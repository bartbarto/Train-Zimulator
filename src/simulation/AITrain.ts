import { KMH_TO_MS, MS_TO_KMH } from '@/engine/constants'
import { clamp, moveTowards } from '@/engine/math'
import type { Occupancy } from './SignalSystem'
import type { RouteManager } from './RouteManager'

const STATION_DWELL = 20 // seconds
const PLATFORM_TOLERANCE = 25

/**
 * Lightweight AI train: drives along the route respecting the line speed
 * limit, slows/stops for restrictive signals ahead, and dwells at stations. It
 * contributes block occupancy so the player's signals respond to its presence.
 */
export class AITrain {
  distance: number
  speedMs = 0
  private readonly length: number
  private readonly route: RouteManager
  private dwellTimer = 0
  private lastStationDistance = -Infinity

  constructor(route: RouteManager, startDistance: number, lengthMetres = 120) {
    this.route = route
    this.distance = startDistance
    this.length = lengthMetres
  }

  update(dt: number): void {
    if (this.dwellTimer > 0) {
      this.dwellTimer -= dt
      this.speedMs = 0
      return
    }

    const targetMs = this.computeTargetSpeed()
    const accel = this.speedMs < targetMs ? 0.4 : 1.0
    this.speedMs = clamp(moveTowards(this.speedMs, targetMs, accel * dt), 0, 45 * KMH_TO_MS)
    this.distance += this.speedMs * dt

    this.handleStations()
    if (this.distance > this.route.track.length) this.distance = 0
  }

  private computeTargetSpeed(): number {
    const progress = this.route.getProgress(this.distance)
    let limit = progress.speedLimitMs
    const signal = progress.nextSignal
    if (signal) {
      const d = progress.distanceToSignal
      if (signal.aspect === 'danger') limit = Math.min(limit, d < 120 ? 0 : 8 * KMH_TO_MS)
      else if (signal.aspect === 'caution') limit = Math.min(limit, 25 * KMH_TO_MS)
    }
    return limit
  }

  private handleStations(): void {
    const station = this.route.getNextStation(this.distance - 5)
    if (!station) return
    if (
      Math.abs(station.distance - this.distance) < PLATFORM_TOLERANCE &&
      station.distance !== this.lastStationDistance
    ) {
      this.dwellTimer = STATION_DWELL
      this.lastStationDistance = station.distance
    }
  }

  get speedKmh(): number {
    return this.speedMs * MS_TO_KMH
  }

  getOccupancy(): Occupancy {
    return { start: this.distance - this.length, end: this.distance }
  }
}

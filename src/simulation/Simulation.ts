import type { LocomotiveSpec, RouteSpec } from '@/data/types'
import { Train, type TrainTelemetry } from './Train'
import { Environment } from './Environment'
import { RouteManager, type RouteProgress } from './RouteManager'
import { AITrain } from './AITrain'
import type { Occupancy } from './SignalSystem'
import { StationService, type StationServiceState } from './StationService'
import { computeAutoBrake } from './SpeedGovernor'
import { SessionStats, type SessionResult } from './SessionStats'

/**
 * Owns the entire deterministic simulation: the player's train, the AI traffic,
 * the route/signalling and the environment. Advanced at a fixed timestep by the
 * game loop. Pure logic — no rendering or input concerns.
 */
export class Simulation {
  readonly train: Train
  readonly route: RouteManager
  readonly environment = new Environment()
  readonly aiTrains: AITrain[]
  readonly stations: StationService
  readonly sessionStats = new SessionStats()

  private readonly occupancies: Occupancy[] = []
  private allPassengersBoardedCheck: ((stationId: string) => boolean) | null = null

  constructor(loco: LocomotiveSpec, routeSpec: RouteSpec) {
    this.route = new RouteManager(routeSpec)
    this.train = new Train(loco, routeSpec, this.route.track)
    this.stations = new StationService(this.route)
    this.aiTrains = [new AITrain(this.route, this.route.track.length * 0.45)]
  }

  /** Advance one fixed step. */
  update(dt: number): void {
    this.environment.update(dt)
    this.train.railAdhesionFactor = this.environment.adhesionFactor

    for (const ai of this.aiTrains) ai.update(dt)
    this.updateSignals()

    const controls = this.train.controls
    const distance = this.train.physics.distance
    const speedMs = this.train.physics.speed

    const station = this.stations.getRelevantStation(distance)
    const allPassengersBoarded =
      !!station && (this.allPassengersBoardedCheck?.(station.id) ?? false)

    this.stations.update(dt, controls, distance, speedMs, allPassengersBoarded)
    const tractionPolicy = this.stations.getTractionPolicy(controls, distance)
    const stationState = this.stations.getState(distance)
    const progress = this.route.getProgress(distance)

    this.train.tractionMode = tractionPolicy
    this.train.autoBrake = computeAutoBrake(
      speedMs,
      distance,
      controls.state.trainBrake,
      progress,
      tractionPolicy,
      stationState,
      controls.state.doorsOpen,
    )
    this.train.update(dt)

    this.sessionStats.update(dt, {
      speedMs,
      speedLimitKmh: progress.speedLimitKmh,
      stationOvershot: stationState.stationOvershot,
      stationId: stationState.station?.id ?? null,
      stationName: stationState.station?.name ?? null,
    })
  }

  setAllPassengersBoardedCheck(fn: (stationId: string) => boolean): void {
    this.allPassengersBoardedCheck = fn
  }

  isRouteComplete(): boolean {
    return this.sessionStats.checkComplete(this.train.physics.distance, this.route.track.length)
  }

  getSessionResult(routeName: string, passengersTransported: number): SessionResult {
    return this.sessionStats.getResult(
      routeName,
      passengersTransported,
      this.stations.servedCount,
      this.stations.totalStations,
      this.train.physics.distance,
      this.route.track.length,
    )
  }

  private updateSignals(): void {
    this.occupancies.length = 0
    const playerDistance = this.train.physics.distance
    this.occupancies.push({ start: playerDistance - 200, end: playerDistance })
    for (const ai of this.aiTrains) this.occupancies.push(ai.getOccupancy())
    this.route.signals.update(this.occupancies)
  }

  getTelemetry(): TrainTelemetry {
    return this.train.getTelemetry()
  }

  getProgress(): RouteProgress {
    return this.route.getProgress(this.train.physics.distance)
  }

  getStationService(): StationServiceState {
    return this.stations.getState(this.train.physics.distance)
  }

  toggleDoors(): boolean {
    return this.stations.toggleDoors(this.train.controls, this.train.physics.distance, this.train.physics.speed)
  }
}

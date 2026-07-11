import { Group, Vector3 } from 'three'
import type { RouteSpec } from '@/data/types'
import type { Environment } from '@/simulation/Environment'
import type { RouteManager } from '@/simulation/RouteManager'
import { Terrain, type TerrainBounds } from './Terrain'
import { TrackMesh } from './TrackMesh'
import { Scenery } from './Scenery'
import { Stations, type StationBoardingState } from './Stations'
import { StopZoneMarkers } from './StopZoneMarkers'
import { SignalMast } from './SignalMast'
import { Weather } from './Weather'

/**
 * Assembles all static and dynamic world geometry (terrain, track, scenery,
 * stations, signals, weather) into a single group and drives the per-frame
 * updates (signal lamps, rain). Built once from the route at load.
 */
export class World {
  readonly group = new Group()
  readonly weather = new Weather()
  private readonly stations: Stations
  private readonly signalMast: SignalMast

  constructor(route: RouteManager, routeSpec: RouteSpec) {
    const bounds = this.computeBounds(routeSpec)
    const terrain = new Terrain(bounds)
    const trackMesh = new TrackMesh(route.track)
    const scenery = new Scenery(route.track, terrain, bounds, 16000)
    const stations = new Stations(routeSpec.stations, route.track)
    this.stations = stations
    const stopZones = new StopZoneMarkers(routeSpec.stations, route.track)
    this.signalMast = new SignalMast(route.signals, route.track)

    this.group.add(terrain.mesh)
    this.group.add(trackMesh.group)
    this.group.add(stopZones.group)
    this.group.add(scenery.group)
    this.group.add(stations.group)
    this.group.add(this.signalMast.group)
    this.group.add(this.weather.points)
  }

  private computeBounds(route: RouteSpec): TerrainBounds {
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const p of route.points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
    const margin = 700
    return { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin }
  }

  update(dt: number, env: Environment, cameraPos: Vector3, boarding: StationBoardingState): void {
    this.stations.update(dt, boarding)
    this.signalMast.update()
    this.weather.update(dt, env, cameraPos)
  }

  getPlatformWaitingCount(stationId: string | null): number {
    return this.stations.getWaitingPassengerCount(stationId)
  }

  getPlatformLookTarget(stationId: string | null, out: Vector3): boolean {
    return this.stations.getPlatformLookTarget(stationId, out)
  }
}

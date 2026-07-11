import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import type { StationSpec } from '@/data/types'
import { lerp } from '@/engine/math'
import { getStopZoneLength } from '@/simulation/stationZone'
import type { Track } from './Track'

const UP = new Vector3(0, 1, 0)
const PLATFORM_OFFSET = 3.0
const PLATFORM_TOP_Y = 0.4
const BODY_HEIGHT = 0.72
const BODY_RADIUS = 0.24
const HEAD_RADIUS = 0.15
const STOPPED_SPEED_MS = 0.35
const STRIDE_HEIGHT = 0.045
const MIN_WALK_SPEED_MS = 3
const MAX_WALK_SPEED_MS = 6
const SIGN_CLEARANCE_M = 2.8
/** Platform +X faces the track; passengers queue on −X and walk to this edge. */
const DOOR_APPROACH_X = 1.05
const PLATFORM_WAIT_X_MIN = -0.95
const PLATFORM_WAIT_X_MAX = -0.45

const SKIN_TONES = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3d2e, 0x3b2219]

export interface StationBoardingState {
  trainDistance: number
  trainSpeedMs: number
  doorsOpen: boolean
  stationId: string | null
  stopZoneStart: number
  stopZoneEnd: number
  trainLengthMetres: number
  carriageDoorOffsetsZ: readonly number[]
}

interface PassengerAgent {
  readonly group: Group
  readonly homeX: number
  readonly homeZ: number
  readonly homeYaw: number
  readonly walkRate: number
  readonly maxWalkSpeedMs: number
  readonly boardingDelay: number
  walkedMetres: number
  pathLength: number
  stridePhase: number
  waitTimer: number
  boarded: boolean
}

interface StationPlatform {
  readonly id: string
  readonly distance: number
  readonly group: Group
  readonly passengers: PassengerAgent[]
  visitActive: boolean
}

/**
 * Builds simple platform slabs and station name signs at each station, positioned
 * and oriented along the track using the spline pose.
 */
export class Stations {
  readonly group = new Group()
  private readonly platforms: StationPlatform[] = []

  constructor(stations: StationSpec[], track: Track) {
    const slabMat = new MeshStandardMaterial({ color: 0x9a9488, roughness: 0.95 })
    const bodyGeo = new ConeGeometry(BODY_RADIUS, BODY_HEIGHT * 1.8, 8)
    const headGeo = new SphereGeometry(HEAD_RADIUS, 8, 8)

    for (const station of stations) {
      const group = new Group()
      const length = getStopZoneLength(station)
      const slab = new Mesh(new BoxGeometry(2.6, 0.4, length), slabMat)
      slab.position.y = 0.2
      slab.receiveShadow = true
      group.add(slab)

      group.add(this.buildStationSign(station.name))

      const passengers = this.addPassengers(group, station, length, bodyGeo, headGeo)

      this.place(group, station.distance, track)
      this.group.add(group)
      this.platforms.push({
        id: station.id,
        distance: station.distance,
        group,
        passengers,
        visitActive: false,
      })
    }
  }

  update(dt: number, state: StationBoardingState): void {
    const stopped = Math.abs(state.trainSpeedMs) <= STOPPED_SPEED_MS

    for (const platform of this.platforms) {
      const atThisStation = state.stationId === platform.id
      const inThisStopZone =
        atThisStation &&
        state.trainDistance >= state.stopZoneStart &&
        state.trainDistance <= state.stopZoneEnd

      if (inThisStopZone) platform.visitActive = true

      if (platform.visitActive && !inThisStopZone) {
        platform.visitActive = false
      }

      const walkToDoors = state.doorsOpen && stopped && inThisStopZone
      const trainLocalZ = state.trainDistance - platform.distance
      for (const passenger of platform.passengers) {
        this.updatePassenger(passenger, dt, walkToDoors, trainLocalZ, state.carriageDoorOffsetsZ)
      }
    }
  }

  /** Passengers still waiting or walking at a station (not yet aboard). */
  getWaitingPassengerCount(stationId: string | null): number {
    if (!stationId) return 0
    const platform = this.platforms.find((p) => p.id === stationId)
    if (!platform) return 0
    let waiting = 0
    for (const passenger of platform.passengers) {
      if (!passenger.boarded) waiting++
    }
    return waiting
  }

  /** World-space point on the platform face for the cab monitor to aim at. */
  getPlatformLookTarget(stationId: string | null, out: Vector3): boolean {
    if (!stationId) return false
    const platform = this.platforms.find((p) => p.id === stationId)
    if (!platform) return false
    platform.group.getWorldPosition(out)
    out.y += 1.1
    return true
  }

  private buildStationSign(name: string): Group {
    const sign = new Group()
    const poleMat = new MeshStandardMaterial({ color: 0x6a6a6a, metalness: 0.45, roughness: 0.55 })
    const poleGeo = new CylinderGeometry(0.055, 0.06, 2.5, 8)

    for (const x of [-1.05, 1.05]) {
      const pole = new Mesh(poleGeo, poleMat)
      pole.position.set(x, 1.65, 0)
      pole.castShadow = true
      sign.add(pole)
    }

    const texture = createSignTexture(name)
    const aspect = texture.image.width / texture.image.height
    const signHeight = 0.72
    const signWidth = signHeight * aspect
    const board = new Mesh(
      new PlaneGeometry(signWidth, signHeight),
      new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide }),
    )
    board.position.set(0, 2.95, 0.04)
    board.rotation.y = Math.PI
    sign.add(board)

    return sign
  }

  private updatePassenger(
    passenger: PassengerAgent,
    dt: number,
    walkToDoors: boolean,
    trainLocalZ: number,
    carriageDoorOffsetsZ: readonly number[],
  ): void {
    const person = passenger.group
    const target = boardingTarget(passenger, trainLocalZ, carriageDoorOffsetsZ)

    if (walkToDoors) {
      if (passenger.boarded) {
        person.visible = false
        return
      }

      passenger.pathLength = walkPathLength(passenger, target)

      passenger.stridePhase += dt * passenger.walkRate
      passenger.walkedMetres = Math.min(
        passenger.pathLength,
        passenger.walkedMetres + passenger.maxWalkSpeedMs * dt,
      )

      const { x, z, t } = positionAlongPath(passenger, target, passenger.walkedMetres, passenger.pathLength)
      const stride = Math.abs(Math.sin(passenger.stridePhase * Math.PI * 2)) * STRIDE_HEIGHT
      const walkYaw = yawToward(passenger.homeX, passenger.homeZ, target.x, target.z)

      person.visible = true
      person.position.set(x, PLATFORM_TOP_Y + stride, z)
      person.rotation.y = lerp(passenger.homeYaw, walkYaw, Math.min(1, t * 3))

      if (passenger.walkedMetres >= passenger.pathLength * 0.98) passenger.boarded = true
      return
    }

    if (passenger.boarded) {
      person.visible = false
      return
    }

    passenger.waitTimer = 0
    passenger.stridePhase = 0
    if (passenger.walkedMetres > 0) {
      passenger.walkedMetres = Math.max(0, passenger.walkedMetres - passenger.maxWalkSpeedMs * dt)
      const pathLen = passenger.pathLength || walkPathLength(passenger, target)
      const { x, z } = positionAlongPath(passenger, target, passenger.walkedMetres, pathLen)
      person.visible = true
      person.position.set(x, PLATFORM_TOP_Y, z)
      person.rotation.y = passenger.homeYaw
      if (passenger.walkedMetres <= 0.01) passenger.pathLength = 0
      return
    }

    person.visible = true
    person.position.set(passenger.homeX, PLATFORM_TOP_Y, passenger.homeZ)
    person.rotation.y = passenger.homeYaw
  }

  private addPassengers(
    group: Group,
    station: StationSpec,
    platformLength: number,
    bodyGeo: ConeGeometry,
    headGeo: SphereGeometry,
  ): PassengerAgent[] {
    const passengers = new Group()
    const agents: PassengerAgent[] = []
    const rand = seededRandom(hashSeed(station.id))
    const count = Math.min(36, Math.max(8, Math.floor(platformLength / 5) + Math.floor(rand() * 4)))
    const margin = 4
    const zMin = -platformLength / 2 + margin
    const zMax = platformLength / 2 - margin

    for (let i = 0; i < count; i++) {
      let z = zMin + rand() * (zMax - zMin)
      if (Math.abs(z) < SIGN_CLEARANCE_M + 1.2) {
        z = z < 0 ? -SIGN_CLEARANCE_M - 1.2 - rand() * 8 : SIGN_CLEARANCE_M + 1.2 + rand() * 8
        z = Math.max(zMin, Math.min(zMax, z))
      }

      const x = PLATFORM_WAIT_X_MIN + rand() * (PLATFORM_WAIT_X_MAX - PLATFORM_WAIT_X_MIN)
      const scale = 0.88 + rand() * 0.2
      const yaw = -Math.PI / 2 + (rand() - 0.5) * 0.45

      const bodyColor = new Color().setHSL(rand(), 0.42 + rand() * 0.35, 0.28 + rand() * 0.22)
      const skinColor = new Color(SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)]!)
      skinColor.offsetHSL(0, 0, (rand() - 0.5) * 0.06)

      const person = new Group()
      person.position.set(x, PLATFORM_TOP_Y, z)
      person.rotation.y = yaw
      person.scale.setScalar(scale)

      const body = new Mesh(
        bodyGeo,
        new MeshStandardMaterial({ color: bodyColor, roughness: 0.88, metalness: 0.02 }),
      )
      body.position.y = BODY_HEIGHT / 2
      body.castShadow = true
      body.receiveShadow = true
      person.add(body)

      const head = new Mesh(
        headGeo,
        new MeshStandardMaterial({ color: skinColor, roughness: 0.82, metalness: 0 }),
      )
      head.position.y = BODY_HEIGHT + HEAD_RADIUS * 0.92
      head.castShadow = true
      head.receiveShadow = true
      person.add(head)

      passengers.add(person)
      agents.push({
        group: person,
        homeX: x,
        homeZ: z,
        homeYaw: yaw,
        walkRate: 2.8 + rand() * 1.2,
        maxWalkSpeedMs: MIN_WALK_SPEED_MS + rand() * (MAX_WALK_SPEED_MS - MIN_WALK_SPEED_MS),
        boardingDelay: rand() * 2.8,
        walkedMetres: 0,
        pathLength: 0,
        stridePhase: rand(),
        waitTimer: 0,
        boarded: false,
      })
    }

    group.add(passengers)
    return agents
  }

  private place(group: Group, distance: number, track: Track): void {
    const u = distance / track.length
    const pos = track.curve.getPointAt(u, new Vector3())
    const tangent = track.curve.getTangentAt(u, new Vector3())
    const right = new Vector3().crossVectors(tangent, UP).normalize()
    pos.addScaledVector(right, PLATFORM_OFFSET)
    group.position.copy(pos)
    group.lookAt(pos.clone().add(tangent))
  }
}

function createSignTexture(name: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  const width = 640
  const height = 160
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pad = 10
  const radius = 28

  ctx.beginPath()
  ctx.moveTo(pad + radius, pad)
  ctx.lineTo(width - pad - radius, pad)
  ctx.quadraticCurveTo(width - pad, pad, width - pad, pad + radius)
  ctx.lineTo(width - pad, height - pad - radius)
  ctx.quadraticCurveTo(width - pad, height - pad, width - pad - radius, height - pad)
  ctx.lineTo(pad + radius, height - pad)
  ctx.quadraticCurveTo(pad, height - pad, pad, height - pad - radius)
  ctx.lineTo(pad, pad + radius)
  ctx.quadraticCurveTo(pad, pad, pad + radius, pad)
  ctx.closePath()
  ctx.fillStyle = '#1b5fbf'
  ctx.fill()

  let fontSize = 56
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  while (ctx.measureText(name).width > width - 48 && fontSize > 28) {
    fontSize -= 2
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  }
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, width / 2, height / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = 'srgb'
  return texture
}

function boardingTarget(
  passenger: PassengerAgent,
  trainLocalZ: number,
  carriageDoorOffsetsZ: readonly number[],
): { x: number; z: number } {
  let nearestOffset = carriageDoorOffsetsZ[0] ?? 0
  let nearestDist = Infinity
  for (const offset of carriageDoorOffsetsZ) {
    // Cab +Z is backward along the track; platform +Z is forward — subtract offset.
    const doorZ = trainLocalZ - offset
    const dist = Math.abs(doorZ - passenger.homeZ)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestOffset = offset
    }
  }
  return {
    x: DOOR_APPROACH_X,
    z: trainLocalZ - nearestOffset,
  }
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ)
}

function walkPathLength(passenger: PassengerAgent, target: { x: number; z: number }): number {
  const dx = target.x - passenger.homeX
  const dz = target.z - passenger.homeZ
  return Math.max(0.5, Math.hypot(dx, dz))
}

function positionAlongPath(
  passenger: PassengerAgent,
  target: { x: number; z: number },
  walkedMetres: number,
  pathLength: number,
): { x: number; z: number; t: number } {
  const t = pathLength > 0 ? Math.min(1, walkedMetres / pathLength) : 1
  const smooth = t * t * (3 - 2 * t)
  return {
    x: lerp(passenger.homeX, target.x, smooth),
    z: lerp(passenger.homeZ, target.z, smooth),
    t: smooth,
  }
}

function hashSeed(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h) + 1
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

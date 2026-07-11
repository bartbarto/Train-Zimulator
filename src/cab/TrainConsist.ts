import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { damp } from '@/engine/math'
import type { CabColorOptions } from './CabModel'
import {
  resolveCarriageAccentColor,
  resolveCarriageColor,
  resolveCarriageDoorColor,
  resolveRoofColor,
} from './CabModel'

export const CARRIAGE_COUNT = 3
export const CARRIAGE_LENGTH = 12
/** Front edge of the first carriage in cab-local +Z (metres behind the cab origin). */
export const CARRIAGE_START_Z = 2.8
/** Nose of the power car in cab-local −Z (forward). Monitor-only exterior. */
export const POWER_CAR_FRONT_Z = -2.5
/** Render layer for exterior consist — hidden from the cab camera, visible on the monitor. */
export const CONSIST_RENDER_LAYER = 2

/** +X side faces the platform for the current track layout. */
const PLATFORM_SIDE_X = 1

const BODY_METALNESS = 0.05
const BODY_ROUGHNESS = 0.88
const ACCENT_METALNESS = 0
const ACCENT_ROUGHNESS = 0.9
const DOOR_METALNESS = 0.12
const DOOR_ROUGHNESS = 0.7
const ROOF_METALNESS = 0.08
const ROOF_ROUGHNESS = 0.82
const DOOR_LEAF_WIDTH = 0.58
const DOOR_LEAF_HEIGHT = 1.95
const DOOR_LEAF_DEPTH = 0.05
const DOOR_GAP = 0.1
/** Clear gap between shell face and door so leaves don't z-fight the body. */
const DOOR_STANDOFF = -0.15
/** How far each leaf slides outward (+X) when fully open. */
const DOOR_OPEN_OUTWARD = 0.1
/** How far each leaf slides along the carriage when fully open. */
const DOOR_OPEN_APART = 0.3

interface DoorLeaf {
  readonly mesh: Mesh
  readonly closedX: number
  readonly closedZ: number
  /** +1 or −1: direction along Z when opening apart. */
  readonly apartSign: number
}

/**
 * Simple trailing carriages rendered behind the cab.
 * Body uses `carriageColor`; stripe uses `carriageAccentColor`; doors use `carriageDoorColor`; roofs use `roofColor`.
 */
export class TrainConsist {
  readonly group = new Group()
  /** Door centre positions in cab-local +Z (metres behind the cab origin). */
  readonly doorOffsetsZ: number[]

  private body!: MeshStandardMaterial
  private accent!: MeshStandardMaterial
  private door!: MeshStandardMaterial
  private roof!: MeshStandardMaterial
  private readonly doorLeaves: DoorLeaf[] = []
  private doorOpenAmount = 0

  constructor(colors: CabColorOptions = {}) {
    this.doorOffsetsZ = []
    this.build(colors)
  }

  get rearOffsetZ(): number {
    return CARRIAGE_START_Z + CARRIAGE_COUNT * CARRIAGE_LENGTH
  }

  get totalLengthMetres(): number {
    return this.rearOffsetZ
  }

  setColors(colors: CabColorOptions = {}): void {
    const { bodyHex, accentHex, doorHex, roofHex } = resolveConsistColors(colors)
    this.body.color.setHex(bodyHex)
    this.accent.color.setHex(accentHex)
    this.door.color.setHex(doorHex)
    this.roof.color.setHex(roofHex)
  }

  /** Animate platform-side door leaves open (outward + apart) or closed. */
  updateDoors(dt: number, doorsOpen: boolean): void {
    const target = doorsOpen ? 1 : 0
    this.doorOpenAmount = damp(this.doorOpenAmount, target, 9, dt)
    const t = this.doorOpenAmount
    for (const leaf of this.doorLeaves) {
      leaf.mesh.position.x = leaf.closedX + t * DOOR_OPEN_OUTWARD * PLATFORM_SIDE_X
      leaf.mesh.position.z = leaf.closedZ + t * DOOR_OPEN_APART * leaf.apartSign
    }
  }

  private build(colors: CabColorOptions): void {
    const { bodyHex, accentHex, doorHex, roofHex } = resolveConsistColors(colors)
    this.body = new MeshStandardMaterial({
      color: bodyHex,
      metalness: BODY_METALNESS,
      roughness: BODY_ROUGHNESS,
      toneMapped: false,
      fog: false,
    })
    this.accent = new MeshStandardMaterial({
      color: accentHex,
      metalness: ACCENT_METALNESS,
      roughness: ACCENT_ROUGHNESS,
      toneMapped: false,
      fog: false,
    })
    this.door = new MeshStandardMaterial({
      color: doorHex,
      metalness: DOOR_METALNESS,
      roughness: DOOR_ROUGHNESS,
      toneMapped: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    this.roof = new MeshStandardMaterial({
      color: roofHex,
      metalness: ROOF_METALNESS,
      roughness: ROOF_ROUGHNESS,
      toneMapped: false,
      fog: false,
    })

    for (let i = 0; i < CARRIAGE_COUNT; i++) {
      const bodyDepth = CARRIAGE_LENGTH - 0.35
      const centreZ = CARRIAGE_START_Z + i * CARRIAGE_LENGTH + bodyDepth / 2
      this.doorOffsetsZ.push(centreZ)
      this.group.add(this.buildCarriage(centreZ))
    }

    this.group.add(this.buildPowerCar())
    this.group.traverse((child) => child.layers.set(CONSIST_RENDER_LAYER))
  }

  private buildPowerCar(): Group {
    const body = new Group()
    const w = 2.6
    const h = 2.15
    const d = CARRIAGE_START_Z - POWER_CAR_FRONT_Z - 0.2
    const centreZ = (CARRIAGE_START_Z + POWER_CAR_FRONT_Z) / 2

    const shell = new Mesh(new BoxGeometry(w, h, d), this.body)
    shell.position.y = h / 2 + 0.15
    shell.castShadow = true
    shell.receiveShadow = true
    body.add(shell)

    const roof = new Mesh(new BoxGeometry(w + 0.06, 0.12, d), this.roof)
    roof.position.y = h + 0.21
    body.add(roof)

    const stripe = new Mesh(new BoxGeometry(w + 0.02, 0.38, d - 0.15), this.accent)
    stripe.position.y = h * 0.62 + 0.15
    body.add(stripe)

    const nose = new Mesh(new BoxGeometry(w * 0.88, h * 0.72, 0.55), this.body)
    nose.position.set(0, h * 0.48 + 0.15, -d / 2 - 0.22)
    body.add(nose)

    // this.addDoubleDoors(body, w / 2, 0.95, d * 0.08)

    body.position.z = centreZ
    return body
  }

  private buildCarriage(centreZ: number): Group {
    const body = new Group()
    const w = 2.6
    const h = 2.15
    const d = CARRIAGE_LENGTH - 0.35

    const shell = new Mesh(new BoxGeometry(w, h, d), this.body)
    shell.position.y = h / 2 + 0.15
    shell.castShadow = true
    shell.receiveShadow = true
    body.add(shell)

    const roof = new Mesh(new BoxGeometry(w + 0.06, 0.12, d), this.roof)
    roof.position.y = h + 0.21
    body.add(roof)

    const stripe = new Mesh(new BoxGeometry(w + 0.001, 0.38, d - 0.2), this.accent)
    stripe.position.y = h * 0.62 + 0.15
    body.add(stripe)

    this.addDoubleDoors(body, w / 2 + 0.1, 0.95, 0)

    body.position.z = centreZ
    return body
  }

  private addDoubleDoors(parent: Group, halfWidth: number, doorY: number, centreZ: number): void {
    const faceX = PLATFORM_SIDE_X * halfWidth
    const leafCenterX = faceX + PLATFORM_SIDE_X * (DOOR_STANDOFF + DOOR_LEAF_DEPTH / 2)
    const pairWidth = DOOR_LEAF_WIDTH * 2 + DOOR_GAP
    const halfSpan = DOOR_LEAF_WIDTH + DOOR_GAP / 2

    const frame = new Mesh(
      new BoxGeometry(DOOR_LEAF_DEPTH, DOOR_LEAF_HEIGHT + 0.14, pairWidth + 0.16),
      this.door,
    )
    frame.position.set(leafCenterX, doorY, centreZ)
    frame.renderOrder = 1
    parent.add(frame)

    for (const zOff of [-halfSpan, halfSpan]) {
      const leaf = new Mesh(
        new BoxGeometry(DOOR_LEAF_DEPTH, DOOR_LEAF_HEIGHT, DOOR_LEAF_WIDTH),
        this.door,
      )
      leaf.position.set(leafCenterX, doorY, centreZ + zOff)
      leaf.renderOrder = 2
      leaf.castShadow = true
      parent.add(leaf)
      this.doorLeaves.push({
        mesh: leaf,
        closedX: leafCenterX,
        closedZ: centreZ + zOff,
        apartSign: Math.sign(zOff) || 1,
      })
    }
  }
}

function resolveConsistColors(colors: CabColorOptions): {
  bodyHex: number
  accentHex: number
  doorHex: number
  roofHex: number
} {
  return {
    bodyHex: resolveCarriageColor(colors.carriageColor, colors.cabColor),
    accentHex: resolveCarriageAccentColor(colors.carriageAccentColor, colors.cabColorAccent),
    doorHex: resolveCarriageDoorColor(colors.carriageDoorColor, colors.carriageColor, colors.cabColor),
    roofHex: resolveRoofColor(colors.roofColor, colors.carriageColor, colors.cabColor),
  }
}

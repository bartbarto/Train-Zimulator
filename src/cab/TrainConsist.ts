import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import type { CabColorOptions } from './CabModel'
import { resolveCarriageAccentColor, resolveCarriageColor } from './CabModel'

export const CARRIAGE_COUNT = 3
export const CARRIAGE_LENGTH = 12
/** Front edge of the first carriage in cab-local +Z (metres behind the cab). */
export const CARRIAGE_START_Z = 2.8
/** Nose of the power car in cab-local −Z (forward). Monitor-only exterior. */
export const POWER_CAR_FRONT_Z = -2.5
/** Render layer for exterior consist — hidden from the cab camera, visible on the monitor. */
export const CONSIST_RENDER_LAYER = 2

const BODY_METALNESS = 0.05
const BODY_ROUGHNESS = 0.88
const ACCENT_METALNESS = 0
const ACCENT_ROUGHNESS = 0.9

/**
 * Simple trailing carriages rendered behind the cab.
 * Body uses `carriageColor`; side stripe uses `carriageAccentColor`.
 */
export class TrainConsist {
  readonly group = new Group()
  /** Door centre positions in cab-local +Z (metres behind the cab origin). */
  readonly doorOffsetsZ: number[]

  private body!: MeshStandardMaterial
  private accent!: MeshStandardMaterial

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
    const { bodyHex, accentHex } = resolveConsistColors(colors)
    this.body.color.setHex(bodyHex)
    this.accent.color.setHex(accentHex)
  }

  private build(colors: CabColorOptions): void {
    const { bodyHex, accentHex } = resolveConsistColors(colors)
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
    const w = 2.5
    const h = 2.15
    const d = CARRIAGE_START_Z - POWER_CAR_FRONT_Z - 0.2
    const centreZ = (CARRIAGE_START_Z + POWER_CAR_FRONT_Z) / 2

    const shell = new Mesh(new BoxGeometry(w, h, d), this.body)
    shell.position.y = h / 2 + 0.15
    shell.castShadow = true
    shell.receiveShadow = true
    body.add(shell)

    const roof = new Mesh(new BoxGeometry(w + 0.06, 0.12, d), this.body)
    roof.position.y = h + 0.21
    body.add(roof)

    const stripe = new Mesh(new BoxGeometry(w + 0.02, 0.38, d - 0.15), this.accent)
    stripe.position.y = h * 0.62 + 0.15
    body.add(stripe)

    const nose = new Mesh(new BoxGeometry(w * 0.88, h * 0.72, 0.55), this.body)
    nose.position.set(0, h * 0.48 + 0.15, -d / 2 - 0.22)
    body.add(nose)

    const door = new Mesh(new BoxGeometry(0.08, 1.35, 1.1), this.body)
    door.position.set(-w / 2 - 0.03, 0.95, d * 0.08)
    body.add(door)

    body.position.z = centreZ
    return body
  }

  private buildCarriage(centreZ: number): Group {
    const body = new Group()
    const w = 2.5
    const h = 2.15
    const d = CARRIAGE_LENGTH - 0.35

    const shell = new Mesh(new BoxGeometry(w, h, d), this.body)
    shell.position.y = h / 2 + 0.15
    shell.castShadow = true
    shell.receiveShadow = true
    body.add(shell)

    const roof = new Mesh(new BoxGeometry(w + 0.06, 0.12, d), this.body)
    roof.position.y = h + 0.21
    body.add(roof)

    const stripe = new Mesh(new BoxGeometry(w + 0.02, 0.38, d - 0.2), this.accent)
    stripe.position.y = h * 0.62 + 0.15
    body.add(stripe)

    const door = new Mesh(new BoxGeometry(0.08, 1.35, 1.1), this.body)
    door.position.set(-w / 2 - 0.03, 0.95, 0)
    body.add(door)

    body.position.z = centreZ
    return body
  }
}

function resolveConsistColors(colors: CabColorOptions): { bodyHex: number; accentHex: number } {
  return {
    bodyHex: resolveCarriageColor(colors.carriageColor, colors.cabColor),
    accentHex: resolveCarriageAccentColor(colors.carriageAccentColor, colors.cabColorAccent),
  }
}

import {
  CircleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Object3D,
} from 'three'
import { clamp, lerp } from '@/engine/math'

const NEEDLE_MIN = -Math.PI * 1.35 // sweep start (radians)
const NEEDLE_MAX = -Math.PI * 2.7 // sweep start (radians)

/**
 * Physical gauge dials mounted on the console: a speedometer and a brake-pipe
 * pressure gauge with animated needles. Needles ease toward their target each
 * frame for a mechanical feel. Mirrors data the HUD also shows, for immersion.
 */
export class Gauges {
  readonly group = new Group()
  private readonly speedNeedle: Object3D
  private readonly brakeNeedle: Object3D
  private speedAngle = NEEDLE_MIN
  private brakeAngle = NEEDLE_MIN

  constructor() {
    this.speedNeedle = this.buildDial(-0.32, 0xbcbcbc)
    this.brakeNeedle = this.buildDial(0.32, 0xbcbcbc)
  }

  private buildDial(x: number, color: number): Object3D {
    const dial = new Group()
    const faceMat = new MeshStandardMaterial({
      color,
      roughness: 0.6,
      emissive: 0x0a0c10,
      emissiveIntensity: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const face = new Mesh(new CircleGeometry(0.13, 32), faceMat)
    face.position.z = -0.004
    const needle = new Mesh(
      new PlaneGeometry(0.012, 0.11),
      new MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffcc44, emissiveIntensity: 1.2 }),
    )
    needle.position.set(0, 0.045, 0.006)
    needle.renderOrder = 1
    const pivot = new Group()
    pivot.add(needle)
    dial.add(face, pivot)
    // Forward of the console lip so the face does not coplanar-fight the desk.
    dial.position.set(x, 1.34, -0.82)
    this.group.add(dial)
    return pivot
  }

  update(dt: number, speedKmh: number, maxSpeedKmh: number, brakePipeBar: number, maxBar: number): void {
    const speedT = clamp(Math.abs(speedKmh) / maxSpeedKmh, 0, 1)
    const brakeT = clamp(brakePipeBar / maxBar, 0, 1)
    this.speedAngle = lerp(this.speedAngle, lerp(NEEDLE_MIN, NEEDLE_MAX, speedT), Math.min(1, dt * 8))
    this.brakeAngle = lerp(this.brakeAngle, lerp(NEEDLE_MIN, NEEDLE_MAX, brakeT), Math.min(1, dt * 8))
    this.speedNeedle.rotation.z = this.speedAngle
    this.brakeNeedle.rotation.z = this.brakeAngle
  }
}

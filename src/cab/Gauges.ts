import {
  BoxGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
} from 'three'
import { clamp, lerp } from '@/engine/math'

const NEEDLE_MIN = -Math.PI * 1.35 // sweep start (radians)
const NEEDLE_MAX = -Math.PI * 2.7 // sweep start (radians)

const FACE = 0xb0aaa4
const INK = 0x003875
const ACCENT = 0x8c1d40
const MOUNT = 0x969088

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
    this.speedNeedle = this.buildDial(-0.32)
    this.brakeNeedle = this.buildDial(0.32)
  }

  private buildDial(x: number): Object3D {
    const dial = new Group()

    const mountMat = new MeshStandardMaterial({ color: MOUNT, roughness: 0.95, metalness: 0.05 })
    const mount = new Mesh(new BoxGeometry(0.34, 0.34, 0.018), mountMat)
    mount.position.z = -0.01

    const faceMat = new MeshStandardMaterial({
      color: FACE,
      roughness: 0.94,
      metalness: 0,
      emissive: 0x3a3834,
      emissiveIntensity: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const face = new Mesh(new CircleGeometry(0.11, 32), faceMat)
    face.position.z = 0.001

    const bezelMat = new MeshStandardMaterial({ color: INK, roughness: 0.75, metalness: 0.25 })
    const bezel = new Mesh(new RingGeometry(0.102, 0.125, 32), bezelMat)
    bezel.position.z = 0.003

    const tickMat = new MeshStandardMaterial({ color: INK, roughness: 0.9, metalness: 0 })
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      const angle = lerp(NEEDLE_MIN, NEEDLE_MAX, t)
      const major = i % 5 === 0
      const tick = new Mesh(
        new BoxGeometry(major ? 0.012 : 0.007, major ? 0.028 : 0.018, 0.003),
        tickMat,
      )
      const r = 0.088
      tick.position.set(Math.sin(-angle) * r, Math.cos(-angle) * r, 0.006)
      tick.rotation.z = angle + Math.PI / 2
      dial.add(tick)
    }

    const needle = new Mesh(
      new PlaneGeometry(0.013, 0.092),
      new MeshStandardMaterial({ color: ACCENT, roughness: 0.55, metalness: 0.15 }),
    )
    needle.position.set(0, 0.038, 0.008)
    needle.renderOrder = 1

    const hub = new Mesh(new CircleGeometry(0.016, 12), bezelMat)
    hub.position.z = 0.009
    hub.renderOrder = 2

    const pivot = new Group()
    pivot.add(needle)
    dial.add(mount, face, bezel, pivot, hub)
    dial.position.set(x, 1.4, -0.82)
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

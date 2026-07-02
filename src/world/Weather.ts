import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
  Vector3,
} from 'three'
import type { Environment } from '@/simulation/Environment'

const RAIN_COUNT = 4000
const RAIN_RADIUS = 60
const RAIN_HEIGHT = 50
const FALL_SPEED = 95

/**
 * GPU point-cloud rain that follows the camera. Particles recycle in place
 * (no per-frame allocation) and the whole system fades with the active
 * weather preset's rain intensity.
 */
export class Weather {
  readonly points: Points
  private readonly positions: Float32Array
  private readonly velocities: Float32Array
  private readonly origin = new Vector3()

  constructor() {
    this.positions = new Float32Array(RAIN_COUNT * 3)
    this.velocities = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) this.reset(i, true)

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(this.positions, 3))
    const mat = new PointsMaterial({
      color: 0x9fb4c8,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    this.points = new Points(geo, mat)
    this.points.frustumCulled = false
  }

  private reset(i: number, randomHeight: boolean): void {
    const idx = i * 3
    this.positions[idx] = (Math.random() - 0.5) * RAIN_RADIUS * 2
    this.positions[idx + 1] = randomHeight ? Math.random() * RAIN_HEIGHT : RAIN_HEIGHT
    this.positions[idx + 2] = (Math.random() - 0.5) * RAIN_RADIUS * 2
    this.velocities[i] = FALL_SPEED * (0.85 + Math.random() * 0.3)
  }

  update(dt: number, env: Environment, cameraPos: Vector3): void {
    const intensity = env.preset.rain
    const mat = this.points.material as PointsMaterial
    mat.opacity = intensity * 0.55
    this.points.visible = intensity > 0.01
    if (!this.points.visible) return

    this.origin.copy(cameraPos)
    this.points.position.copy(this.origin)
    for (let i = 0; i < RAIN_COUNT; i++) {
      const idx = i * 3
      this.positions[idx + 1] -= this.velocities[i] * dt
      if (this.positions[idx + 1] < -RAIN_HEIGHT * 0.2) this.reset(i, false)
    }
    ;(this.points.geometry.attributes.position as BufferAttribute).needsUpdate = true
  }
}

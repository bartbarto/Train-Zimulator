import { Euler, PerspectiveCamera, Vector3 } from 'three'
import { clamp, damp, DEG_TO_RAD } from '@/engine/math'

const YAW_LIMIT = 175 * DEG_TO_RAD // can look back over the shoulder
const PITCH_LIMIT = 78 * DEG_TO_RAD
const LEAN_LIMIT = 0.45 // metres of head lean toward side windows

export interface CameraConfig {
  fov: number
  lookSensitivity: number
  invertY: boolean
  smoothing: number
}

/**
 * Models the driver's head. The camera is a child of the cab so it inherits the
 * train's motion; locally it applies smoothed yaw/pitch (mouse/stick look),
 * head lean toward the side windows, and an adjustable FOV with a momentary
 * zoom. Look angles are clamped to realistic neck limits.
 */
export class CabCamera {
  readonly camera: PerspectiveCamera
  private readonly seat = new Vector3(0, 1.7, 0.5)
  private readonly euler = new Euler(0, 0, 0, 'YXZ')

  private yaw = 0
  private pitch = 0
  private targetYaw = 0
  private targetPitch = 0
  private leanX = 0
  private targetLeanX = 0
  private baseFov: number
  private zoomFactor = 1

  private config: CameraConfig

  constructor(config: CameraConfig, aspect: number) {
    this.config = config
    this.baseFov = config.fov
    this.camera = new PerspectiveCamera(config.fov, aspect, 0.05, 6000)
    this.camera.position.copy(this.seat)
  }

  setConfig(config: CameraConfig): void {
    this.config = config
    this.baseFov = config.fov
  }

  /** Accumulate look deltas (in pixels/stick units) into target angles. */
  look(dx: number, dy: number): void {
    const s = this.config.lookSensitivity * 0.0022
    this.targetYaw = clamp(this.targetYaw - dx * s, -YAW_LIMIT, YAW_LIMIT)
    const dyy = this.config.invertY ? -dy : dy
    this.targetPitch = clamp(this.targetPitch - dyy * s, -PITCH_LIMIT, PITCH_LIMIT)
  }

  /** Lean the head sideways (e.g. to look out of a side window). */
  lean(amount: number): void {
    this.targetLeanX = clamp(amount, -1, 1) * LEAN_LIMIT
  }

  /** Momentary zoom: factor < 1 narrows FOV. */
  setZoom(zoomedIn: boolean): void {
    this.zoomFactor = zoomedIn ? 0.55 : 1
  }

  reset(): void {
    this.targetYaw = 0
    this.targetPitch = 0
    this.targetLeanX = 0
    this.zoomFactor = 1
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update(dt: number): void {
    const k = this.config.smoothing
    this.yaw = damp(this.yaw, this.targetYaw, k, dt)
    this.pitch = damp(this.pitch, this.targetPitch, k, dt)
    // Automatic lean toward whichever side the driver is looking out of.
    const autoLean = Math.sin(this.yaw) * 0.2
    this.leanX = damp(this.leanX, this.targetLeanX + autoLean, k, dt)

    this.euler.set(this.pitch, this.yaw, 0)
    this.camera.quaternion.setFromEuler(this.euler)
    this.camera.position.set(this.seat.x + this.leanX, this.seat.y, this.seat.z)

    const targetFov = this.baseFov * this.zoomFactor
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = damp(this.camera.fov, targetFov, 14, dt)
      this.camera.updateProjectionMatrix()
    }
  }
}

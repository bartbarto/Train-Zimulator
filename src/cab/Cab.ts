import { Group, Mesh, MeshStandardMaterial, PointLight, SpotLight, Vector3 } from 'three'
import { clamp01, damp, lerp } from '@/engine/math'
import type { CameraConfig } from './CabCamera'
import { CabCamera } from './CabCamera'
import { CabModel } from './CabModel'
import { Interaction } from './Interaction'
import { Gauges } from './Gauges'
import type { CabControlHandle } from './types'
import type { Controls, ControlState, MultiState } from '@/simulation/Controls'
import type { TrackPose } from '@/simulation/ITrackProvider'
import type { ITrackProvider } from '@/simulation/ITrackProvider'

export class Cab {
  readonly root = new Group()
  readonly camera: CabCamera
  readonly interaction: Interaction
  readonly handles: CabControlHandle[]

  private readonly model = new CabModel()
  private readonly gauges = new Gauges()
  private readonly cabLight = new PointLight(0xffe6b0, 1.4, 6)
  private readonly headlight = new SpotLight(0xfff0d4, 0, 280, Math.PI / 4.5, 0.35, 1.5)
  private readonly pose: TrackPose
  private readonly track: ITrackProvider

  constructor(track: ITrackProvider, cameraConfig: CameraConfig, aspect: number) {
    this.track = track
    this.camera = new CabCamera(cameraConfig, aspect)
    this.handles = this.model.handles
    this.interaction = new Interaction(this.handles)

    this.cabLight.position.set(0, 2.1, 0.4)
    this.headlight.position.set(0, 1.1, -2.6)
    this.headlight.target.position.set(0, -0.15, -90)
    this.headlight.castShadow = true
    this.headlight.shadow.mapSize.set(1024, 1024)
    this.headlight.shadow.camera.near = 1
    this.headlight.shadow.camera.far = 150
    this.headlight.shadow.bias = -0.0002
    this.root.add(this.model.group, this.gauges.group, this.cabLight, this.headlight, this.headlight.target, this.camera.camera)
    this.pose = { position: new Vector3(), tangent: new Vector3(), cant: 0 }
  }

  ride(distance: number): void {
    this.track.getPose(distance, this.pose)
    this.root.position.copy(this.pose.position)
    // A Group's lookAt aims its +Z at the target, but the child camera looks
    // down −Z, so target behind the tangent to face the direction of travel.
    LOOK_TARGET.copy(this.pose.position).sub(this.pose.tangent)
    this.root.lookAt(LOOK_TARGET)
    this.root.rotateZ(this.pose.cant)
  }

  syncControls(dt: number, controls: Controls): void {
    const state = controls.state
    for (const h of this.handles) {
      if (h.kind !== 'lever' || h.id !== 'power') continue
      const v = controls.powerLever
      // +v = throttle (lever forward), −v = brake (lever backward).
      const target =
        v >= 0
          ? h.restRotation + v * h.rangeRotation
          : h.restRotation + -v * (h.rangeRotationBack ?? -h.rangeRotation)
      h.pivot.rotation.x = damp(h.pivot.rotation.x, target, 16, dt)
    }
    this.syncDoorButton(state)
  }

  private syncDoorButton(state: ControlState): void {
    const door = this.handles.find((h) => h.id === 'doors')
    if (!door) return
    const mat = (door.object as Mesh).material as MeshStandardMaterial
    if (mat?.emissive) mat.emissiveIntensity = state.doorsOpen ? 0.5 : 0
  }

  updateGauges(dt: number, speedKmh: number, maxSpeedKmh: number, brakePipeBar: number, maxBar: number): void {
    this.gauges.update(dt, speedKmh, maxSpeedKmh, brakePipeBar, maxBar)
  }

  update(dt: number): void {
    this.camera.update(dt)
  }

  /** Front headlight — auto-on at night; optional manual dim/bright via control state. */
  updateHeadlight(daylight: number, headlights: MultiState = 0): void {
    const dark = clamp01(1 - daylight / 0.32)
    const level = headlights === 0 ? dark : headlights / 2
    const on = level > 0.02
    this.headlight.intensity = on ? level * 450 : 0
    this.headlight.castShadow = on && dark > 0.45
    this.cabLight.intensity = lerp(0.25, 1.5, dark)
  }
}

const LOOK_TARGET = new Vector3()

import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Scene,
  Vector3,
} from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import { clamp, lerp } from '@/engine/math'
import type { Environment } from '@/simulation/Environment'

const SHADOW_RANGE = 220

/**
 * Owns the Three.js scene graph root and global atmosphere: an atmospheric sky
 * dome, a sun directional light that casts shadows near the player, hemisphere
 * fill light and exponential fog. Everything is driven each frame from the
 * {@link Environment} so time-of-day and weather are reflected visually.
 */
export class SceneManager {
  readonly scene = new Scene()
  readonly sun = new DirectionalLight(0xfff3e0, 3)
  readonly hemi = new HemisphereLight(0x9fc4ff, 0x4a4438, 0.6)
  private readonly sky = new Sky()
  private readonly fog = new FogExp2(0xcdd6e0, 0.0008)
  private readonly sunWorld = new Vector3()

  constructor() {
    this.scene.fog = this.fog

    this.sky.scale.setScalar(10000)
    const u = this.sky.material.uniforms
    u.turbidity.value = 6
    u.rayleigh.value = 2
    u.mieCoefficient.value = 0.005
    u.mieDirectionalG.value = 0.8
    this.scene.add(this.sky)

    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 800
    this.sun.shadow.camera.left = -SHADOW_RANGE
    this.sun.shadow.camera.right = SHADOW_RANGE
    this.sun.shadow.camera.top = SHADOW_RANGE
    this.sun.shadow.camera.bottom = -SHADOW_RANGE
    this.sun.shadow.bias = -0.0004
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)
    this.scene.add(this.hemi)
  }

  /** Update sky, sun and fog from the environment, keeping shadows near focus. */
  update(env: Environment, focus: Vector3): void {
    this.sky.material.uniforms.sunPosition.value.copy(env.sunDirection)
    this.sky.material.uniforms.turbidity.value = lerp(4, 14, env.preset.cloudCover)
    this.sky.material.uniforms.rayleigh.value = lerp(1, 4, 1 - env.daylight)

    this.sunWorld.copy(env.sunDirection).multiplyScalar(300).add(focus)
    this.sun.position.copy(this.sunWorld)
    this.sun.target.position.copy(focus)
    this.sun.intensity = env.sunIntensity
    this.sun.color.setHSL(0.1, 0.4, lerp(0.4, 0.95, env.daylight))

    this.hemi.intensity = lerp(0.15, 0.7, env.daylight)
    this.hemi.position.copy(focus).add(new Vector3(0, 50, 0))

    const fogColor = this.fog.color
    fogColor.copy(NIGHT_FOG).lerp(DAY_FOG, env.daylight)
    this.fog.density = lerp(0.0004, 0.02, env.preset.fog) * (1 + (1 - env.daylight) * 0.5)
    this.scene.background = fogColor
  }

  setBackgroundIntensity(value: number): void {
    this.scene.backgroundIntensity = clamp(value, 0, 2)
  }
}

const DAY_FOG = new Color(0xcdd6e0)
const NIGHT_FOG = new Color(0x0a0e16)

import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Vector2 } from 'three'

export interface RendererOptions {
  bloom: boolean
  shadows: boolean
  pixelRatioCap: number
  exposure: number
}

export const DEFAULT_RENDERER_OPTIONS: RendererOptions = {
  bloom: true,
  shadows: true,
  pixelRatioCap: 2,
  exposure: 1.0,
}

/**
 * Wraps the WebGL renderer with physically based defaults: ACES tone mapping,
 * sRGB output, soft shadow maps, FXAA and an optional bloom post-processing chain.
 * Owns resize handling and exposes a single {@link render} entry point.
 */
export class Renderer {
  readonly gl: WebGLRenderer
  private composer: EffectComposer | null = null
  private bloomPass: UnrealBloomPass | null = null
  private renderPass: RenderPass | null = null
  private options: RendererOptions
  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, options: Partial<RendererOptions> = {}) {
    this.canvas = canvas
    this.options = { ...DEFAULT_RENDERER_OPTIONS, ...options }
    // MSAA on the default framebuffer does not apply to EffectComposer targets; FXAA handles AA.
    this.gl = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.gl.outputColorSpace = SRGBColorSpace
    this.gl.toneMapping = ACESFilmicToneMapping
    this.gl.toneMappingExposure = this.options.exposure
    this.gl.shadowMap.enabled = this.options.shadows
    this.gl.shadowMap.type = PCFShadowMap
    this.applyPixelRatio()
  }

  /** Build the post-processing composer for a given scene/camera. */
  setupPostProcessing(scene: Scene, camera: PerspectiveCamera): void {
    this.composer = new EffectComposer(this.gl)
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    // strength, radius, threshold — only genuinely bright (HDR > 1) sources
    // bloom, so emissive lamps glow without washing out the daylit scene.
    const size = this.gl.getSize(new Vector2())
    this.bloomPass = new UnrealBloomPass(size, 0.01, 0.4, 0.95)
    this.bloomPass.enabled = this.options.bloom
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(new FXAAPass())
    this.composer.addPass(new OutputPass())
    this.resize()
  }

  setBloom(enabled: boolean): void {
    this.options.bloom = enabled
    if (this.bloomPass) this.bloomPass.enabled = enabled
  }

  setExposure(value: number): void {
    this.options.exposure = value
    this.gl.toneMappingExposure = value
  }

  setShadows(enabled: boolean): void {
    this.options.shadows = enabled
    this.gl.shadowMap.enabled = enabled
  }

  private applyPixelRatio(): void {
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, this.options.pixelRatioCap))
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    this.applyPixelRatio()
    this.gl.setSize(width, height, false)
    this.composer?.setSize(width, height)
  }

  get aspect(): number {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    return width / height
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    if (this.composer) this.composer.render()
    else this.gl.render(scene, camera)
  }

  dispose(): void {
    this.composer?.dispose()
    this.gl.dispose()
  }
}

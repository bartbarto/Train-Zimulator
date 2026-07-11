import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { CONSIST_RENDER_LAYER } from './TrainConsist'

const TEXTURE_W = 640
const TEXTURE_H = 480

/**
 * Cab-mounted rear-view monitor on the right interior wall.
 * Feed comes from an exterior platform-side camera looking backward along the train.
 */
export class PlatformMonitor {
  readonly group = new Group()
  readonly camera = new PerspectiveCamera(72, TEXTURE_W / TEXTURE_H, 0.1, 900)

  private readonly canvas: HTMLCanvasElement
  private readonly monitorGl: WebGLRenderer
  private readonly texture: CanvasTexture
  private readonly screenMat: MeshBasicMaterial
  private readonly camLocalPos = new Vector3()
  private readonly camLocalLook = new Vector3()
  private readonly worldLook = new Vector3()
  private readonly monitorFill = new HemisphereLight(0xffffff, 0x666666, 1.35)

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = TEXTURE_W
    this.canvas.height = TEXTURE_H

    this.monitorGl = new WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false })
    this.monitorGl.setPixelRatio(1)
    this.monitorGl.setSize(TEXTURE_W, TEXTURE_H, false)
    this.monitorGl.outputColorSpace = SRGBColorSpace
    this.monitorGl.toneMapping = ACESFilmicToneMapping
    this.monitorGl.toneMappingExposure = 1.45

    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter

    this.screenMat = new MeshBasicMaterial({
      map: this.texture,
      color: 0xffffff,
      toneMapped: false,
      fog: false,
    })

    const monitor = new Group()
    monitor.position.set(0.85, 1.45, -0.65)
    // monitor.rotation.z = -Math.PI / 4
    monitor.rotation.y = -Math.PI / 6

    const housing = new Mesh(
      new BoxGeometry(0.52, 0.36, 0.035),
      new MeshBasicMaterial({ color: 0x444444, toneMapped: false, fog: false }),
    )
    housing.position.z = -0.012

    const border = new Mesh(
      new PlaneGeometry(0.48, 0.32),
      new MeshBasicMaterial({ color: 0x0a0a0a, toneMapped: false, fog: false }),
    )
    border.position.z = 0.002

    const screen = new Mesh(new PlaneGeometry(0.44, 0.28), this.screenMat)
    screen.position.z = 0.008
    screen.renderOrder = 1

    monitor.add(housing, border, screen)
    this.group.add(monitor)

    this.camera.layers.set(0)
    this.camera.layers.enable(CONSIST_RENDER_LAYER)
  }

  /** Platform-side camera beside the cab, looking backward along the consist. */
  updateCamera(cabRoot: Object3D, trainRearOffsetZ: number): void {
    cabRoot.updateMatrixWorld(true)

    // +X is the platform side; camera looks at the door face from outside.
    this.camLocalPos.set(1.95, 1.8, 4.8)
    this.camLocalLook.set(1.42, 1.55, trainRearOffsetZ * 0.88)

    this.camera.position.copy(this.camLocalPos).applyMatrix4(cabRoot.matrixWorld)
    this.worldLook.copy(this.camLocalLook).applyMatrix4(cabRoot.matrixWorld)
    this.camera.lookAt(this.worldLook)
  }

  render(scene: Scene, cabRoot: Object3D, interior: Object3D, trainRearOffsetZ: number): void {
    this.updateCamera(cabRoot, trainRearOffsetZ)

    const interiorVisible = interior.visible
    interior.visible = false

    if (scene.background instanceof Color) {
      this.monitorGl.setClearColor(scene.background, 1)
    } else {
      this.monitorGl.setClearColor(0x88aacc, 1)
    }

    scene.add(this.monitorFill)
    this.monitorGl.render(scene, this.camera)
    scene.remove(this.monitorFill)
    interior.visible = interiorVisible
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.monitorGl.dispose()
    this.texture.dispose()
    this.screenMat.dispose()
  }
}

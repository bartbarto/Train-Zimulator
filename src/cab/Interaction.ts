import {
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  Raycaster,
  Vector2,
} from 'three'
import type { CabControlHandle } from './types'

/**
 * Raycasts the cursor against interactive cab controls to determine which one
 * is under the pointer, applying a subtle emissive highlight to the hovered
 * control. Control activation itself is handled by the cab controller; this
 * class is purely about hit-testing and feedback.
 */
export class Interaction {
  hovered: CabControlHandle | null = null

  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly handles: CabControlHandle[]
  private readonly byObject = new Map<Object3D, CabControlHandle>()
  private readonly originalEmissive = new Map<Object3D, number>()

  constructor(handles: CabControlHandle[]) {
    this.handles = handles
    for (const h of handles) {
      this.byObject.set(h.object, h)
      const mat = (h.object as Mesh).material as MeshStandardMaterial | undefined
      if (mat?.emissive) this.originalEmissive.set(h.object, mat.emissiveIntensity)
    }
  }

  /** Update hover state from the camera and normalised cursor coordinates. */
  update(camera: PerspectiveCamera, ndcX: number, ndcY: number): void {
    this.pointer.set(ndcX, ndcY)
    this.raycaster.setFromCamera(this.pointer, camera)
    const targets = this.handles.map((h) => h.object)
    const hits = this.raycaster.intersectObjects(targets, false)
    const next = hits.length > 0 ? this.byObject.get(hits[0].object) ?? null : null

    if (next !== this.hovered) {
      if (this.hovered) this.setHighlight(this.hovered, false)
      if (next) this.setHighlight(next, true)
      this.hovered = next
    }
  }

  private setHighlight(handle: CabControlHandle, on: boolean): void {
    const mat = (handle.object as Mesh).material as MeshStandardMaterial | undefined
    if (!mat?.emissive) return
    const base = this.originalEmissive.get(handle.object) ?? 0
    mat.emissiveIntensity = on ? base + 0.6 : base
  }
}

import type { AxisAction } from './actions'

const STICK_LOOK_SCALE = 2.5
const TAP_MOVE_THRESHOLD_PX = 14
const LEVER_DRAG_RANGE_PX = 130

export interface CabPointerState {
  active: boolean
  ndcX: number
  ndcY: number
  pointerDown: boolean
  justDown: boolean
  justUp: boolean
  dragDeltaY: number
  totalMovement: number
}

/**
 * Touch input for mobile play: an on-screen look stick feeds camera axes, and
 * direct canvas pointers drive 3D cab controls (tap buttons, drag the lever).
 */
export class TouchDevice {
  readonly cabPointer: CabPointerState = {
    active: false,
    ndcX: 0,
    ndcY: 0,
    pointerDown: false,
    justDown: false,
    justUp: false,
    dragDeltaY: 0,
    totalMovement: 0,
  }

  private canvas: HTMLCanvasElement | null = null
  private lookX = 0
  private lookY = 0
  private pointerId: number | null = null
  private startClientY = 0
  private startClientX = 0
  private startClientYForDrag = 0
  private totalMovement = 0
  private justDown = false
  private justUp = false

  /** True on phones/tablets where touch is the primary input (not touch-screen laptops). */
  get isMobilePrimary(): boolean {
    if (typeof window === 'undefined') return false
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const noHover = window.matchMedia('(hover: none)').matches
    return coarse && noHover
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
  }

  detach(): void {
    if (!this.canvas) return
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas = null
    this.resetCabPointer()
  }

  /** Normalised look stick output from the on-screen joystick (−1..1). */
  setLook(x: number, y: number): void {
    this.lookX = x
    this.lookY = y
  }

  /** Map vertical drag distance to a power-lever delta. */
  leverDeltaFromDrag(dragDeltaY: number): number {
    return -dragDeltaY / LEVER_DRAG_RANGE_PX
  }

  isTap(totalMovement: number): boolean {
    return totalMovement < TAP_MOVE_THRESHOLD_PX
  }

  poll(axes: Record<AxisAction, number>, enabled: boolean): void {
    const cp = this.cabPointer
    cp.justDown = this.justDown
    cp.justUp = this.justUp
    cp.pointerDown = this.pointerId !== null
    cp.active = cp.pointerDown
    cp.totalMovement = this.totalMovement
    this.justDown = false
    this.justUp = false

    if (!enabled) {
      this.lookX = 0
      this.lookY = 0
      return
    }

    axes.lookX += this.lookX * STICK_LOOK_SCALE
    axes.lookY += this.lookY * STICK_LOOK_SCALE
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (this.pointerId !== null) return

    this.pointerId = e.pointerId
    this.startClientX = e.clientX
    this.startClientY = e.clientY
    this.startClientYForDrag = e.clientY
    this.totalMovement = 0
    this.justDown = true

    const ndc = this.clientToNdc(e.clientX, e.clientY)
    const cp = this.cabPointer
    cp.ndcX = ndc.x
    cp.ndcY = ndc.y
    cp.dragDeltaY = 0
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return

    this.totalMovement = Math.max(
      this.totalMovement,
      Math.hypot(e.clientX - this.startClientX, e.clientY - this.startClientY),
    )

    const ndc = this.clientToNdc(e.clientX, e.clientY)
    const cp = this.cabPointer
    cp.ndcX = ndc.x
    cp.ndcY = ndc.y
    cp.dragDeltaY = e.clientY - this.startClientYForDrag
  }

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    this.justUp = true
    this.resetCabPointer()
  }

  private resetCabPointer(): void {
    this.pointerId = null
    this.cabPointer.dragDeltaY = 0
  }

  private clientToNdc(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.canvas!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    }
  }
}

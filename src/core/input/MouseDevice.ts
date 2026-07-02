import type { AxisAction, ButtonAction } from './actions'

/**
 * Mouse input for cab look and clickable interaction. When pointer-lock is
 * active, movement drives the look axes; left click raises `interact` and the
 * normalised cursor position is exposed for raycasting against the cab.
 */
export class MouseDevice {
  /** Normalised device coordinates of the cursor (-1..1). */
  readonly ndc = { x: 0, y: 0 }
  private accumX = 0
  private accumY = 0
  private accumZoom = 0
  private interactQueued = false
  private locked = false
  private element: HTMLElement | null = null

  attach(element: HTMLElement): void {
    this.element = element
    element.addEventListener('mousemove', this.onMove)
    element.addEventListener('mousedown', this.onDown)
    element.addEventListener('wheel', this.onWheel, { passive: false })
    document.addEventListener('pointerlockchange', this.onLockChange)
  }

  detach(): void {
    const element = this.element
    if (!element) return
    element.removeEventListener('mousemove', this.onMove)
    element.removeEventListener('mousedown', this.onDown)
    element.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('pointerlockchange', this.onLockChange)
    this.element = null
  }

  requestLook(): void {
    this.element?.requestPointerLock?.()
  }

  releaseLook(): void {
    if (this.locked) document.exitPointerLock?.()
  }

  get isLooking(): boolean {
    return this.locked
  }

  collectAxes(axes: Record<AxisAction, number>): void {
    axes.lookX += this.accumX
    axes.lookY += this.accumY
    axes.zoom += this.accumZoom
    axes.cursorX = this.ndc.x
    axes.cursorY = this.ndc.y
    this.accumX = 0
    this.accumY = 0
    this.accumZoom = 0
  }

  collectEdges(pressed: Set<ButtonAction>): void {
    if (this.interactQueued) {
      pressed.add('interact')
      this.interactQueued = false
    }
  }

  private readonly onMove = (e: MouseEvent): void => {
    if (this.locked) {
      this.accumX += e.movementX
      this.accumY += e.movementY
    }
    const el = this.element
    if (el) {
      const rect = el.getBoundingClientRect()
      this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }
  }

  private readonly onDown = (e: MouseEvent): void => {
    if (e.button === 0) this.interactQueued = true
  }

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    this.accumZoom += Math.sign(e.deltaY)
  }

  private readonly onLockChange = (): void => {
    this.locked = document.pointerLockElement === this.element
  }
}

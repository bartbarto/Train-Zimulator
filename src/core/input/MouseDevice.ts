import type { AxisAction, ButtonAction } from './actions'

/** Mouse is not used for cab look or interaction; kept for API compatibility. */
export class MouseDevice {
  attach(_element: HTMLElement): void {}

  detach(): void {}

  requestLook(): void {}

  releaseLook(): void {}

  get isLooking(): boolean {
    return false
  }

  collectAxes(_axes: Record<AxisAction, number>): void {}

  collectEdges(_pressed: Set<ButtonAction>): void {}
}

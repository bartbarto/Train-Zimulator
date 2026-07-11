/**
 * Abstract, device-independent input actions.
 */

export type AxisAction =
  | 'throttleAxis'
  | 'trainBrakeAxis'
  | 'lookX'
  | 'lookY'
  | 'cursorX'
  | 'cursorY'
  | 'zoom'

export type ButtonAction =
  | 'powerUp'
  | 'powerDown'
  | 'interact'
  | 'horn'
  | 'reverse'
  | 'doors'
  | 'resetCamera'
  | 'toggleHud'
  | 'pause'
  | 'toggleDebug'

export const ALL_AXIS_ACTIONS: readonly AxisAction[] = [
  'throttleAxis',
  'trainBrakeAxis',
  'lookX',
  'lookY',
  'cursorX',
  'cursorY',
  'zoom',
]

export const ALL_BUTTON_ACTIONS: readonly ButtonAction[] = [
  'powerUp',
  'powerDown',
  'interact',
  'horn',
  'reverse',
  'doors',
  'resetCamera',
  'toggleHud',
  'pause',
  'toggleDebug',
]

export interface InputSnapshot {
  axes: Record<AxisAction, number>
  pressed: Set<ButtonAction>
  released: Set<ButtonAction>
  held: Set<ButtonAction>
}

export function createEmptyAxes(): Record<AxisAction, number> {
  return {
    throttleAxis: 0,
    trainBrakeAxis: 0,
    lookX: 0,
    lookY: 0,
    cursorX: 0,
    cursorY: 0,
    zoom: 0,
  }
}

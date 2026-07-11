import type { Object3D } from 'three'

/** Identifiers for the simplified cab controls. */
export type ControlId = 'power' | 'horn' | 'reverse' | 'doors'

export type ControlKind = 'lever' | 'button' | 'toggle'

/**
 * A handle to one interactive cab control: the raycast/animated object, its
 * pivot (for levers) and the rotation range used to visualise its value.
 */
export interface CabControlHandle {
  id: ControlId
  kind: ControlKind
  /** The object hit by raycasting (carries `userData.controlId`). */
  object: Object3D
  /** For levers: the node that rotates. */
  pivot: Object3D
  /** Lever rotation (radians) at value 0. */
  restRotation: number
  /** Additional lever rotation (radians) at full throttle (+1). */
  rangeRotation: number
  /** Lever rotation (radians) at full brake (−1). Defaults to −rangeRotation. */
  rangeRotationBack?: number
  /** Human-readable label for tooltips. */
  label: string
  /** Rest Y for push buttons (cap position when not pressed). */
  restY?: number
}

import type { Vector3 } from 'three'

/** Orientation and position of a point on the track centre-line. */
export interface TrackPose {
  position: Vector3
  /** Unit tangent (direction of increasing distance). */
  tangent: Vector3
  /** Track roll (superelevation/cant) in radians. */
  cant: number
}

/**
 * Abstraction over the track geometry consumed by the simulation and cab.
 * Implemented by the spline-based {@link Track}; keeping it behind an interface
 * lets the physics and camera work with any future track representation.
 */
export interface ITrackProvider {
  /** Total centre-line length in metres. */
  readonly length: number
  /** Gradient in radians at a given distance (positive = uphill). */
  getGradient(distance: number): number
  /** Fill `out`-style pose at a distance, reusing vectors to avoid allocation. */
  getPose(distance: number, pose: TrackPose): TrackPose
  /** Local horizontal curvature (1/radius) at a distance; 0 on straights. */
  getCurvature(distance: number): number
}

import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp } from '@/engine/math'
import type { RouteSpec } from '@/data/types'
import type { ITrackProvider, TrackPose } from '@/simulation/ITrackProvider'

const MAX_CANT_RAD = 0.12 // ~7 degrees of superelevation at tight curves

/**
 * Spline-based track. The route's control points define a Catmull-Rom centre
 * line; arc-length parameterisation maps a distance in metres to a position,
 * tangent, gradient and cant. All queries reuse scratch vectors so per-frame
 * sampling does not allocate.
 */
export class Track implements ITrackProvider {
  readonly curve: CatmullRomCurve3
  readonly length: number

  private readonly scratchTangent = new Vector3()
  private readonly aheadTangent = new Vector3()

  constructor(route: RouteSpec) {
    const points = route.points.map((p) => new Vector3(p.x, p.y, p.z))
    this.curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    this.length = this.curve.getLength()
  }

  private u(distance: number): number {
    return clamp(distance / this.length, 0, 1)
  }

  getGradient(distance: number): number {
    this.curve.getTangentAt(this.u(distance), this.scratchTangent)
    return Math.asin(clamp(this.scratchTangent.y, -1, 1))
  }

  getCurvature(distance: number): number {
    const ahead = 5 // metres
    this.curve.getTangentAt(this.u(distance), this.scratchTangent)
    this.curve.getTangentAt(this.u(distance + ahead), this.aheadTangent)
    // Horizontal heading change over the sample distance approximates 1/R.
    const h1 = Math.atan2(this.scratchTangent.x, this.scratchTangent.z)
    const h2 = Math.atan2(this.aheadTangent.x, this.aheadTangent.z)
    let dH = h2 - h1
    if (dH > Math.PI) dH -= Math.PI * 2
    if (dH < -Math.PI) dH += Math.PI * 2
    return dH / ahead
  }

  getPose(distance: number, pose: TrackPose): TrackPose {
    const u = this.u(distance)
    this.curve.getPointAt(u, pose.position)
    this.curve.getTangentAt(u, pose.tangent)
    // Cant scales with curvature so curves visibly bank the cab.
    pose.cant = clamp(this.getCurvature(distance) * 30, -MAX_CANT_RAD, MAX_CANT_RAD)
    return pose
  }
}

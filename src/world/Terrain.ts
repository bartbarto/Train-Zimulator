import { BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { clamp01, lerp } from '@/engine/math'
import type { Track } from './Track'

export interface TerrainBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface TrackSample {
  x: number
  y: number
  z: number
}

const TRACK_BLEND_INNER_M = 22
const TRACK_BLEND_OUTER_M = 95
const TRACK_BED_OFFSET_M = 1.0

/**
 * Procedural ground that follows the track elevation in the corridor and blends
 * into rolling hills further away, so embankments sit on ground that matches
 * the line's gradient.
 */
export class Terrain {
  readonly mesh: Mesh
  private readonly samples: TrackSample[]

  constructor(bounds: TerrainBounds, track: Track) {
    this.samples = sampleTrack(track, Math.max(240, Math.floor(track.length / 10)))

    const width = bounds.maxX - bounds.minX
    const depth = bounds.maxZ - bounds.minZ
    const segX = Math.min(160, Math.floor(width / 24))
    const segZ = Math.min(320, Math.floor(depth / 24))
    const geo = new PlaneGeometry(width, depth, segX, segZ)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position as BufferAttribute
    const centreX = (bounds.minX + bounds.maxX) / 2
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + centreX
      const z = pos.getZ(i) + (bounds.minZ + bounds.maxZ) / 2
      pos.setY(i, this.heightAt(x, z))
    }
    geo.computeVertexNormals()

    const mat = new MeshStandardMaterial({ color: 0x4f6b39, roughness: 1, metalness: 0 })
    this.mesh = new Mesh(geo, mat)
    this.mesh.position.set(centreX, 0, (bounds.minZ + bounds.maxZ) / 2)
    this.mesh.receiveShadow = true
  }

  heightAt(x: number, z: number): number {
    const { height: trackY, lateralDist } = this.trackInfluence(x, z)
    const wild = this.proceduralHeight(x, z)
    const t = clamp01((lateralDist - TRACK_BLEND_INNER_M) / (TRACK_BLEND_OUTER_M - TRACK_BLEND_INNER_M))
    const blend = t * t * (3 - 2 * t)
    return lerp(trackY - TRACK_BED_OFFSET_M, wild, blend)
  }

  /** Nearest point on the sampled centre line (XZ), with interpolated elevation. */
  private trackInfluence(x: number, z: number): { height: number; lateralDist: number } {
    let bestDist2 = Infinity
    let bestY = 0

    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i]!
      const b = this.samples[i + 1]!
      const t = closestPointOnSegmentXZ(x, z, a, b)
      const px = lerp(a.x, b.x, t)
      const pz = lerp(a.z, b.z, t)
      const py = lerp(a.y, b.y, t)
      const dx = x - px
      const dz = z - pz
      const d2 = dx * dx + dz * dz
      if (d2 < bestDist2) {
        bestDist2 = d2
        bestY = py
      }
    }

    return { height: bestY, lateralDist: Math.sqrt(bestDist2) }
  }

  /** Rolling hills away from the corridor. */
  private proceduralHeight(x: number, z: number): number {
    const base = -4 + 2.0 * Math.sin(x * 0.011) * Math.cos(z * 0.008)
    const hills = 42 * (0.5 + 0.5 * Math.sin(x * 0.0035 + 1.3) * Math.cos(z * 0.0026))
    return base + hills
  }
}

function sampleTrack(track: Track, count: number): TrackSample[] {
  const out: TrackSample[] = []
  const point = new Vector3()
  for (let i = 0; i <= count; i++) {
    track.curve.getPointAt(i / count, point)
    out.push({ x: point.x, y: point.y, z: point.z })
  }
  return out
}

function closestPointOnSegmentXZ(x: number, z: number, a: TrackSample, b: TrackSample): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len2 = dx * dx + dz * dz
  if (len2 < 1e-6) return 0
  return clamp01(((x - a.x) * dx + (z - a.z) * dz) / len2)
}

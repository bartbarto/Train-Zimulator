import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { Track } from './Track'

const GAUGE_HALF = 0.7175
const RAIL_WIDTH = 0.08
const RAIL_HEIGHT = 0.16
const SLEEPER_SPACING = 0.65
const BALLAST_HALF_WIDTH = 2.6
const EMBANKMENT_DROP = 60

const UP = new Vector3(0, 1, 0)

interface Frame {
  pos: Vector3
  right: Vector3
}

/**
 * Builds static track geometry from the spline: two steel rails, instanced
 * concrete sleepers, a ballast shoulder and an embankment skirt so the line is
 * supported above the terrain. Generated once at load; nothing per-frame.
 */
export class TrackMesh {
  readonly group = new Group()

  constructor(track: Track) {
    const frames = this.sampleFrames(track, 2)
    this.group.add(this.buildRail(frames, GAUGE_HALF))
    this.group.add(this.buildRail(frames, -GAUGE_HALF))
    this.group.add(this.buildRibbon(frames, BALLAST_HALF_WIDTH, -0.25, 0x6b5d4f))
    this.group.add(this.buildEmbankment(frames))
    this.group.add(this.buildSleepers(track))
    this.group.traverse((o) => {
      o.castShadow = false
      o.receiveShadow = true
    })
  }

  private sampleFrames(track: Track, spacing: number): Frame[] {
    const count = Math.max(2, Math.floor(track.length / spacing))
    const frames: Frame[] = []
    const tangent = new Vector3()
    for (let i = 0; i <= count; i++) {
      const d = (i / count) * track.length
      const pos = new Vector3()
      track.curve.getPointAt(d / track.length, pos)
      track.curve.getTangentAt(d / track.length, tangent)
      const right = new Vector3().crossVectors(tangent, UP).normalize()
      frames.push({ pos: pos.clone(), right: right.clone() })
    }
    return frames
  }

  /** A raised rail box-section strip following the offset spline. */
  private buildRail(frames: Frame[], offset: number): Mesh {
    const positions: number[] = []
    const top = RAIL_HEIGHT
    const hw = RAIL_WIDTH / 2
    const ring = (f: Frame, y: number, w: number) =>
      new Vector3().copy(f.pos).addScaledVector(f.right, offset + w).setY(f.pos.y + y)

    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i]
      const b = frames[i + 1]
      const quads: [Vector3, Vector3][] = [
        [ring(a, top, -hw), ring(a, top, hw)], // top
        [ring(a, 0, hw), ring(a, top, hw)], // right side
        [ring(a, 0, -hw), ring(a, 0, hw)], // bottom
        [ring(a, top, -hw), ring(a, 0, -hw)], // left side
      ]
      const quadsB: [Vector3, Vector3][] = [
        [ring(b, top, -hw), ring(b, top, hw)],
        [ring(b, 0, hw), ring(b, top, hw)],
        [ring(b, 0, -hw), ring(b, 0, hw)],
        [ring(b, top, -hw), ring(b, 0, -hw)],
      ]
      for (let s = 0; s < 4; s++) {
        pushQuad(positions, quads[s][0], quads[s][1], quadsB[s][1], quadsB[s][0])
      }
    }
    return new Mesh(buildGeometry(positions), new MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.9, roughness: 0.35 }))
  }

  /** A flat ribbon (ballast/road bed) following the spline. */
  private buildRibbon(frames: Frame[], halfWidth: number, yOffset: number, color: number): Mesh {
    const positions: number[] = []
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i]
      const b = frames[i + 1]
      const al = new Vector3().copy(a.pos).addScaledVector(a.right, -halfWidth).setY(a.pos.y + yOffset)
      const ar = new Vector3().copy(a.pos).addScaledVector(a.right, halfWidth).setY(a.pos.y + yOffset)
      const bl = new Vector3().copy(b.pos).addScaledVector(b.right, -halfWidth).setY(b.pos.y + yOffset)
      const br = new Vector3().copy(b.pos).addScaledVector(b.right, halfWidth).setY(b.pos.y + yOffset)
      pushQuad(positions, al, ar, br, bl)
    }
    return new Mesh(buildGeometry(positions), new MeshStandardMaterial({ color, roughness: 1, side: DoubleSide }))
  }

  /** Sloped sides dropping from the ballast shoulder down below the terrain. */
  private buildEmbankment(frames: Frame[]): Mesh {
    const positions: number[] = []
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i]
      const b = frames[i + 1]
      for (const sign of [-1, 1]) {
        const top = (f: Frame) => new Vector3().copy(f.pos).addScaledVector(f.right, sign * BALLAST_HALF_WIDTH).setY(f.pos.y - 0.25)
        const bottom = (f: Frame) =>
          new Vector3().copy(f.pos).addScaledVector(f.right, sign * (BALLAST_HALF_WIDTH + 6)).setY(f.pos.y - EMBANKMENT_DROP)
        pushQuad(positions, top(a), bottom(a), bottom(b), top(b))
      }
    }
    return new Mesh(buildGeometry(positions), new MeshStandardMaterial({ color: 0x5c6b43, roughness: 1, side: DoubleSide }))
  }

  private buildSleepers(track: Track): InstancedMesh {
    const count = Math.max(2, Math.floor(track.length / SLEEPER_SPACING))
    const geo = new BoxGeometry(2.6, 0.16, 0.26)
    const mat = new MeshStandardMaterial({ color: 0x4b4640, roughness: 0.95 })
    const mesh = new InstancedMesh(geo, mat, count)
    mesh.receiveShadow = true

    const pos = new Vector3()
    const tangent = new Vector3()
    const right = new Vector3()
    const quat = new Quaternion()
    const matrix = new Matrix4()
    const scale = new Vector3(1, 1, 1)
    const lookM = new Matrix4()
    for (let i = 0; i < count; i++) {
      const u = i / count
      track.curve.getPointAt(u, pos)
      track.curve.getTangentAt(u, tangent)
      right.crossVectors(tangent, UP).normalize()
      pos.y -= 0.12
      lookM.makeBasis(right, UP, tangent.clone().negate())
      quat.setFromRotationMatrix(lookM)
      matrix.compose(pos, quat, scale)
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }
}

function pushQuad(out: number[], a: Vector3, b: Vector3, c: Vector3, d: Vector3): void {
  out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  out.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
}

function buildGeometry(positions: number[]): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

export const TRACK_COLOR = new Color(0x8a8f96)

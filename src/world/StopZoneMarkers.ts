import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { StationSpec } from '@/data/types'
import { getStopZoneEnd, getStopZoneStart } from '@/simulation/stationZone'
import type { Track } from './Track'

const UP = new Vector3(0, 1, 0)
const BALLAST_HALF_WIDTH = 2.35
const RIBBON_Y_OFFSET = -0.16
const RIBBON_SPACING = 1.4

function trackU(track: Track, distance: number): number {
  return Math.min(Math.max(distance / track.length, 0), 1)
}

/**
 * Marks each station's stop zone on the track with a coloured ballast ribbon and
 * boundary posts so the driver can see exactly where to stop.
 */
export class StopZoneMarkers {
  readonly group = new Group()

  constructor(stations: StationSpec[], track: Track) {
    const ribbonMat = new MeshStandardMaterial({
      color: 0xf0c820,
      emissive: 0xc89610,
      emissiveIntensity: 0.35,
      roughness: 0.9,
      transparent: true,
      opacity: 0.72,
      side: DoubleSide,
      depthWrite: false,
    })
    const postMat = new MeshStandardMaterial({
      color: 0xffe566,
      emissive: 0xffcc22,
      emissiveIntensity: 0.8,
      roughness: 0.5,
      metalness: 0.1,
    })
    const endMat = postMat.clone()
    endMat.color.setHex(0xff8844)
    endMat.emissive.setHex(0xee6622)

    for (const station of stations) {
      const start = getStopZoneStart(station)
      const end = getStopZoneEnd(station)
      this.group.add(this.buildRibbon(track, start, end, ribbonMat))
      this.group.add(this.buildBoundaryPost(track, start, postMat))
      this.group.add(this.buildBoundaryPost(track, end, endMat))
      this.group.add(this.buildCentreMarker(track, station.distance, postMat))
    }
  }

  private buildRibbon(track: Track, start: number, end: number, material: MeshStandardMaterial): Mesh {
    const positions: number[] = []
    const pos = new Vector3()
    const tangent = new Vector3()
    const right = new Vector3()

    for (let d = start; d < end; d += RIBBON_SPACING) {
      const d2 = Math.min(d + RIBBON_SPACING, end)
      const corners = (distance: number) => {
        track.curve.getPointAt(trackU(track, distance), pos)
        track.curve.getTangentAt(trackU(track, distance), tangent)
        right.crossVectors(tangent, UP).normalize()
        const y = pos.y + RIBBON_Y_OFFSET
        return {
          left: new Vector3().copy(pos).addScaledVector(right, -BALLAST_HALF_WIDTH).setY(y),
          right: new Vector3().copy(pos).addScaledVector(right, BALLAST_HALF_WIDTH).setY(y),
        }
      }
      const a = corners(d)
      const b = corners(d2)
      pushQuad(positions, a.left, a.right, b.right, b.left)
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.computeVertexNormals()
    return new Mesh(geo, material)
  }

  private buildBoundaryPost(track: Track, distance: number, material: MeshStandardMaterial): Group {
    const group = new Group()
    const pos = track.curve.getPointAt(trackU(track, distance), new Vector3())
    const tangent = track.curve.getTangentAt(trackU(track, distance), new Vector3())
    const right = new Vector3().crossVectors(tangent, UP).normalize()

    for (const sign of [-1, 1]) {
      const post = new Mesh(new BoxGeometry(0.14, 0.9, 0.08), material)
      post.position.copy(pos).addScaledVector(right, sign * (BALLAST_HALF_WIDTH + 0.35))
      post.position.y += 0.45
      post.lookAt(post.position.clone().add(tangent))
      group.add(post)

      const board = new Mesh(new BoxGeometry(0.5, 0.28, 0.04), material)
      board.position.copy(post.position)
      board.position.y += 0.55
      board.lookAt(board.position.clone().add(tangent))
      group.add(board)
    }
    return group
  }

  private buildCentreMarker(track: Track, distance: number, material: MeshStandardMaterial): Mesh {
    const pos = track.curve.getPointAt(trackU(track, distance), new Vector3())
    const tangent = track.curve.getTangentAt(trackU(track, distance), new Vector3())
    const marker = new Mesh(new BoxGeometry(0.7, 0.06, 0.12), material)
    marker.position.copy(pos)
    marker.position.y += RIBBON_Y_OFFSET + 0.04
    marker.lookAt(pos.clone().add(tangent))
    return marker
  }
}

function pushQuad(out: number[], a: Vector3, b: Vector3, c: Vector3, d: Vector3): void {
  out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  out.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
}

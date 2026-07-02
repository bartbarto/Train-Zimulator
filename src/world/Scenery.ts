import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import type { Track } from './Track'
import type { Terrain } from './Terrain'
import type { TerrainBounds } from './Terrain'

const CORRIDOR_CLEARANCE = 22
type FoliageKind = 'conifer' | 'broadleaf' | 'shrub'

interface Placement {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  kind: FoliageKind
}

/**
 * Scatters varied instanced vegetation across the terrain, avoiding the track
 * corridor. Uses a handful of InstancedMeshes grouped by species so the forest
 * looks less repetitive while staying cheap to render.
 */
export class Scenery {
  readonly group = new Group()

  constructor(track: Track, terrain: Terrain, bounds: TerrainBounds, count = 900) {
    const corridor = this.sampleCorridor(track, 140)
    const placements = this.generatePlacements(terrain, bounds, corridor, count)

    this.addConifers(placements.filter((p) => p.kind === 'conifer'))
    this.addBroadleafTrees(placements.filter((p) => p.kind === 'broadleaf'))
    this.addShrubs(placements.filter((p) => p.kind === 'shrub'))
  }

  private sampleCorridor(track: Track, n: number): Vector3[] {
    const pts: Vector3[] = []
    for (let i = 0; i <= n; i++) {
      pts.push(track.curve.getPointAt(i / n, new Vector3()))
    }
    return pts
  }

  private generatePlacements(
    terrain: Terrain,
    bounds: TerrainBounds,
    corridor: Vector3[],
    count: number,
  ): Placement[] {
    const out: Placement[] = []
    let seed = 1337
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + rand() * (bounds.maxX - bounds.minX)
      const z = bounds.minZ + rand() * (bounds.maxZ - bounds.minZ)
      if (this.nearCorridor(x, z, corridor)) continue
      const y = terrain.heightAt(x, z)
      if (y > 30) continue // bare hilltops
      const roll = rand()
      const kind: FoliageKind = roll < 0.46 ? 'conifer' : roll < 0.78 ? 'broadleaf' : 'shrub'
      const scale = kind === 'shrub' ? 0.45 + rand() * 0.45 : 0.75 + rand() * 1.05
      out.push({ x, y, z, scale, rotation: rand() * Math.PI * 2, kind })
    }
    return out
  }

  private addConifers(placements: Placement[]): void {
    if (placements.length === 0) return
    const trunks = new InstancedMesh(
      new CylinderGeometry(0.16, 0.28, 2.3, 5),
      new MeshStandardMaterial({ color: 0x59442e, roughness: 1 }),
      placements.length,
    )
    const crowns = new InstancedMesh(
      new ConeGeometry(1.45, 4.4, 7),
      new MeshStandardMaterial({ color: 0x2f552a, roughness: 1 }),
      placements.length,
    )
    this.placeTreeParts(placements, trunks, 1.15, crowns, 4.15)
    this.group.add(trunks, crowns)
  }

  private addBroadleafTrees(placements: Placement[]): void {
    if (placements.length === 0) return
    const trunks = new InstancedMesh(
      new CylinderGeometry(0.2, 0.32, 2.0, 6),
      new MeshStandardMaterial({ color: 0x6a4b32, roughness: 1 }),
      placements.length,
    )
    const crowns = new InstancedMesh(
      new SphereGeometry(1.65, 10, 8),
      new MeshStandardMaterial({ color: 0x446d35, roughness: 1 }),
      placements.length,
    )
    this.placeTreeParts(placements, trunks, 1.0, crowns, 3.05)
    this.group.add(trunks, crowns)
  }

  private addShrubs(placements: Placement[]): void {
    if (placements.length === 0) return
    const shrubs = new InstancedMesh(
      new SphereGeometry(1.0, 8, 6),
      new MeshStandardMaterial({ color: 0x597a38, roughness: 1 }),
      placements.length,
    )
    const matrix = new Matrix4()
    const quat = new Quaternion()
    const scale = new Vector3()
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i]
      quat.setFromAxisAngle(UP, p.rotation)
      scale.set(p.scale * 1.3, p.scale * 0.65, p.scale)
      matrix.compose(new Vector3(p.x, p.y + 0.5 * p.scale, p.z), quat, scale)
      shrubs.setMatrixAt(i, matrix)
    }
    shrubs.instanceMatrix.needsUpdate = true
    shrubs.castShadow = true
    shrubs.receiveShadow = true
    this.group.add(shrubs)
  }

  private placeTreeParts(
    placements: Placement[],
    trunks: InstancedMesh,
    trunkY: number,
    crowns: InstancedMesh,
    crownY: number,
  ): void {
    const matrix = new Matrix4()
    const quat = new Quaternion()
    const scale = new Vector3()
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i]
      quat.setFromAxisAngle(UP, p.rotation)
      scale.setScalar(p.scale)
      matrix.compose(new Vector3(p.x, p.y + trunkY * p.scale, p.z), quat, scale)
      trunks.setMatrixAt(i, matrix)
      matrix.compose(new Vector3(p.x, p.y + crownY * p.scale, p.z), quat, scale)
      crowns.setMatrixAt(i, matrix)
    }
    trunks.instanceMatrix.needsUpdate = true
    crowns.instanceMatrix.needsUpdate = true
    trunks.receiveShadow = true
    crowns.castShadow = true
    crowns.receiveShadow = true
  }

  private nearCorridor(x: number, z: number, corridor: Vector3[]): boolean {
    for (const p of corridor) {
      const dx = p.x - x
      const dz = p.z - z
      if (dx * dx + dz * dz < CORRIDOR_CLEARANCE * CORRIDOR_CLEARANCE) return true
    }
    return false
  }
}

const UP = new Vector3(0, 1, 0)

/** Shared capsule used by simple street furniture; exported for reuse. */
export function makePost(height: number, color: number): Group {
  const group = new Group()
  const geo = new CapsuleGeometry(0.08, height, 3, 6)
  const mat = new MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.3 })
  const mesh = new InstancedMesh(geo, mat, 1)
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, height / 2, 0))
  group.add(mesh)
  return group
}

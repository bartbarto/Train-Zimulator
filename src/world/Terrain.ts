import { BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three'

export interface TerrainBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * Procedural ground. A subdivided plane is displaced by layered trigonometric
 * noise: a gentle valley floor near the line and larger hills further out, so
 * the track corridor stays clear while the horizon has relief. Generated once.
 */
export class Terrain {
  readonly mesh: Mesh

  constructor(bounds: TerrainBounds) {
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

  /** Valley floor near the corridor, rising into hills away from the line. */
  heightAt(x: number, z: number): number {
    const base = -3 + 2.2 * Math.sin(x * 0.011) * Math.cos(z * 0.008)
    const corridorDist = Math.max(0, Math.abs(x - 475) - 480)
    const hills = (1 - Math.exp(-corridorDist * 0.004)) * 46
    const hillShape = 0.5 + 0.5 * Math.sin(x * 0.0035 + 1.3) * Math.cos(z * 0.0026)
    return base + hills * hillShape
  }
}

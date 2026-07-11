import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { SignalState, SignalSystem, SignalAspect } from '@/simulation/SignalSystem'
import type { Track } from './Track'

const UP = new Vector3(0, 1, 0)
const SIGNAL_OFFSET = 4.0

interface LampSet {
  red: MeshStandardMaterial
  yellow: MeshStandardMaterial
  green: MeshStandardMaterial
}

/**
 * Three-lamp colour-light signal masts placed along the track. Lamp emissive
 * intensity is updated each frame from the {@link SignalSystem} so the visible
 * aspect always matches the simulation state.
 */
export class SignalMast {
  readonly group = new Group()
  private readonly lamps = new Map<string, LampSet>()
  private readonly signals: SignalSystem

  constructor(signals: SignalSystem, track: Track) {
    this.signals = signals
    for (const signal of signals.all) {
      this.group.add(this.buildMast(signal, track))
    }
  }

  private buildMast(signal: SignalState, track: Track): Group {
    const mast = new Group()
    const postMat = new MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.4, roughness: 0.7 })
    const baseMat = new MeshStandardMaterial({ color: 0x4a4a48, roughness: 0.95 })

    const slab = new Mesh(new BoxGeometry(1.4, 0.14, 1.1), baseMat)
    slab.position.y = 0.07
    slab.receiveShadow = true
    mast.add(slab)

    const footing = new Mesh(new CylinderGeometry(0.42, 0.52, 0.28, 8), baseMat)
    footing.position.y = 0.21
    footing.receiveShadow = true
    mast.add(footing)

    const post = new Mesh(new CylinderGeometry(0.12, 0.14, 5, 8), postMat)
    post.position.y = 2.85
    post.castShadow = true
    mast.add(post)

    const headMat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })
    const head = new Mesh(new CylinderGeometry(0.4, 0.4, 1.7, 10), headMat)
    head.position.y = 5.75
    mast.add(head)

    const red = lampMaterial(0xff2222)
    const yellow = lampMaterial(0xffcc00)
    const green = lampMaterial(0x22ff44)
    this.lamps.set(signal.id, { red, yellow, green })

    mast.add(makeLamp(green, 5.25))
    mast.add(makeLamp(yellow, 5.75))
    mast.add(makeLamp(red, 6.25))

    this.place(mast, signal.distance, track)
    return mast
  }

  private place(group: Group, distance: number, track: Track): void {
    const u = distance / track.length
    const trackCenter = track.curve.getPointAt(u, new Vector3())
    const tangent = track.curve.getTangentAt(u, new Vector3())
    const right = new Vector3().crossVectors(tangent, UP).normalize()
    group.position.copy(trackCenter).addScaledVector(right, SIGNAL_OFFSET)
    group.lookAt(trackCenter)
  }

  /** Refresh lamp emissive levels from current aspects. */
  update(): void {
    for (const signal of this.signals.all) {
      const set = this.lamps.get(signal.id)
      if (set) applyAspect(set, signal.aspect)
    }
  }
}

function lampMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.4 })
}

function makeLamp(material: MeshStandardMaterial, y: number): Mesh {
  const mesh = new Mesh(new SphereGeometry(0.18, 12, 8), material)
  mesh.position.set(0, y, 0.42)
  return mesh
}

function applyAspect(set: LampSet, aspect: SignalAspect): void {
  set.red.emissiveIntensity = aspect === 'danger' ? 4 : 0
  set.yellow.emissiveIntensity = aspect === 'caution' || aspect === 'preliminaryCaution' ? 4 : 0
  set.green.emissiveIntensity = aspect === 'clear' ? 4 : 0
}

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three'
import { DEG_TO_RAD } from '@/engine/math'
import type { CabControlHandle, ControlId, ControlKind } from './types'

const METAL = new MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.6, roughness: 0.5 })
const PANEL = new MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.2, roughness: 0.8 })
const DARK = new MeshStandardMaterial({ color: 0x121316, metalness: 0.3, roughness: 0.7 })

/**
 * Minimal cab with three controls: a combined power/brake lever, horn, and doors.
 */
export class CabModel {
  readonly group = new Group()
  readonly handles: CabControlHandle[] = []

  constructor() {
    this.buildShell()
    this.buildConsole()
    this.buildPowerLever()
    this.buildButtons()
  }

  private buildShell(): void {
    const shell = new Group()
    shell.add(plate(2.6, 0.1, 2.6, 0, 0, 0.3, PANEL))
    shell.add(plate(2.6, 0.1, 2.6, 0, 2.3, 0.3, DARK))
    shell.add(plate(2.6, 2.3, 0.1, 0, 1.15, 1.95, PANEL))
    for (const x of [-1.3, 1.3]) {
      shell.add(plate(0.1, 0.9, 2.6, x, 0.5, 0.3, PANEL))
      shell.add(plate(0.1, 0.5, 2.6, x, 2.05, 0.3, PANEL))
    }
    // shell.add(plate(2.6, 0.18, 0.1, 0, 2.0, -1.0, METAL))
    shell.add(plate(0.14, 1.2, 0.1, -1.2, 1.3, -1.0, METAL))
    shell.add(plate(0.14, 1.2, 0.1, 1.2, 1.3, -1.0, METAL))
    shell.add(plate(2.6, 0.2, 0.1, 0, 0.75, -1.0, METAL))
    const seat = new Group()
    seat.add(plate(0.5, 0.1, 0.5, 0, 0.5, 0, METAL))
    seat.add(plate(0.5, 0.6, 0.1, 0, 0.8, 0.22, METAL))
    seat.position.set(-0.55, 0, 1.55)
    shell.add(seat)
    this.group.add(shell)
  }

  private buildConsole(): void {
    const desk = new Group()
    desk.add(plate(2.2, 0.6, 0.7, 0, 0.95, -0.55, PANEL))
    desk.add(plate(2.2, 0.4, 0.1, 0, 1.25, -0.9, DARK))
    this.group.add(desk)
  }

  /** One lever: forward = power, backward = brake. */
  private buildPowerLever(): void {
    const pivot = new Object3D()
    pivot.position.set(0.15, 1.28, -0.55)
    const base = new Mesh(new CylinderGeometry(0.06, 0.07, 0.05, 10), METAL)
    const shaft = new Mesh(
      new CylinderGeometry(0.028, 0.035, 0.42, 8),
      new MeshStandardMaterial({ color: 0x4a6b4a, metalness: 0.5, roughness: 0.5 }),
    )
    shaft.position.y = 0.21
    const knob = new Mesh(
      new SphereGeometry(0.055, 12, 8),
      new MeshStandardMaterial({ color: 0x5a8a5a, metalness: 0.4, roughness: 0.4 }),
    )
    knob.position.y = 0.44
    knob.userData.controlId = 'power'
    pivot.add(base, shaft, knob)
    this.group.add(pivot)
    this.handles.push({
      id: 'power',
      kind: 'lever',
      object: knob,
      pivot,
      restRotation: 0,
      rangeRotation: -42 * DEG_TO_RAD,
      rangeRotationBack: 42 * DEG_TO_RAD,
      label: 'Power / Brake',
    })
  }

  private buildButtons(): void {
    this.addButton('horn', 'Horn', 0.45, 1.22, -0.78, 0x2255cc, 'button')
    this.addButton('doors', 'Doors', -0.45, 1.22, -0.78, 0x99bb55, 'toggle')
  }

  private addButton(
    id: ControlId,
    label: string,
    x: number,
    y: number,
    z: number,
    color: number,
    kind: ControlKind,
  ): void {
    const cap = new Mesh(
      new CylinderGeometry(0.06, 0.06, 0.05, 12),
      new MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5, emissive: color, emissiveIntensity: 0 }),
    )
    cap.rotation.x = Math.PI / 2
    cap.position.set(x, y, z)
    cap.userData.controlId = id
    this.group.add(cap)
    this.handles.push({ id, kind, object: cap, pivot: cap, restRotation: 0, rangeRotation: 0, label })
  }
}

function plate(w: number, h: number, d: number, x: number, y: number, z: number, mat: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  return mesh
}

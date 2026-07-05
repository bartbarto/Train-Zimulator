import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three'
import { DEG_TO_RAD } from '@/engine/math'
import type { CabControlHandle, ControlId, ControlKind } from './types'

const DEFAULT_METAL = 0x2a2e33
const DEFAULT_PANEL = 0x1b1d20
const DEFAULT_DARK = 0x121316

const METAL_METALNESS = 0.6
const METAL_ROUGHNESS = 0.5
const PANEL_METALNESS = 0.2
const PANEL_ROUGHNESS = 0.8
const DARK_METALNESS = 0.3
const DARK_ROUGHNESS = 0.7
const ACCENT_METALNESS = 0.1
const ACCENT_ROUGHNESS = 0.35
const ACCENT_EMISSIVE_INTENSITY = 0.08
const ACCENT_MIN_LIGHTNESS = 0.42

/** Relative lightness multipliers derived from the default neutral gray palette. */
const METAL_LIGHTNESS = 1.586
const DARK_LIGHTNESS = 0.655

interface CabTones {
  metal: number
  panel: number
  dark: number
}

const DEFAULT_TONES: CabTones = {
  metal: DEFAULT_METAL,
  panel: DEFAULT_PANEL,
  dark: DEFAULT_DARK,
}

export interface CabColorOptions {
  cabColor?: string | number
  cabColorAccent?: string | number
}

function parseHexColor(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 0xffffff) return null
    return value | 0
  }

  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  const hex = normalized.startsWith('0x') ? normalized.slice(2) : normalized.replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/.test(hex)) return null
  return parseInt(hex, 16)
}

function deriveCabTones(cabColor: string | number): CabTones | null {
  const hex = parseHexColor(cabColor)
  if (hex === null) return null

  const panel = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  panel.getHSL(hsl)

  return {
    metal: new Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l * METAL_LIGHTNESS)).getHex(),
    panel: hex,
    dark: new Color().setHSL(hsl.h, hsl.s, hsl.l * DARK_LIGHTNESS).getHex(),
  }
}

function resolveCabTones(cabColor?: string | number): CabTones {
  if (cabColor === undefined || cabColor === null) return DEFAULT_TONES
  return deriveCabTones(cabColor) ?? DEFAULT_TONES
}

function resolveAccentColor(cabColorAccent?: string | number): number | null {
  const hex = parseHexColor(cabColorAccent)
  if (hex === null) return null

  const color = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  return new Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l, ACCENT_MIN_LIGHTNESS)).getHex()
}

function createCabMaterial(color: number, metalness: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, metalness, roughness })
}

function createAccentMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    metalness: ACCENT_METALNESS,
    roughness: ACCENT_ROUGHNESS,
    emissive: color,
    emissiveIntensity: ACCENT_EMISSIVE_INTENSITY,
  })
}

/**
 * Minimal cab with three controls: a combined power/brake lever, horn, and doors.
 */
export class CabModel {
  readonly group = new Group()
  readonly handles: CabControlHandle[] = []

  private readonly metal: MeshStandardMaterial
  private readonly panel: MeshStandardMaterial
  private readonly dark: MeshStandardMaterial
  private readonly accent: MeshStandardMaterial
  private readonly topPlate: Mesh
  private readonly sidePlates: Mesh[] = []

  constructor(colors: CabColorOptions = {}) {
    const tones = resolveCabTones(colors.cabColor)
    this.metal = createCabMaterial(tones.metal, METAL_METALNESS, METAL_ROUGHNESS)
    this.panel = createCabMaterial(tones.panel, PANEL_METALNESS, PANEL_ROUGHNESS)
    this.dark = createCabMaterial(tones.dark, DARK_METALNESS, DARK_ROUGHNESS)
    this.accent = createAccentMaterial(DEFAULT_PANEL)

    this.topPlate = plate(2.6, 0.1, 2.6, 0, 2.3, 0.3, this.dark)
    this.buildShell()
    this.buildConsole()
    this.buildPowerLever()
    this.buildButtons()
    this.applyAccent(resolveAccentColor(colors.cabColorAccent))
  }

  setCabColors(colors: CabColorOptions = {}): void {
    const tones = resolveCabTones(colors.cabColor)
    this.metal.color.setHex(tones.metal)
    this.panel.color.setHex(tones.panel)
    this.dark.color.setHex(tones.dark)
    this.applyAccent(resolveAccentColor(colors.cabColorAccent))
  }

  private applyAccent(accentHex: number | null): void {
    if (accentHex !== null) {
      this.accent.color.setHex(accentHex)
      this.accent.emissive.setHex(accentHex)
      this.topPlate.material = this.accent
      for (const side of this.sidePlates) side.material = this.accent
      return
    }

    this.topPlate.material = this.dark
    for (const side of this.sidePlates) side.material = this.panel
  }

  private buildShell(): void {
    const shell = new Group()
    shell.add(plate(2.6, 0.1, 2.6, 0, 0, 0.3, this.panel))
    shell.add(this.topPlate)
    shell.add(plate(2.6, 2.3, 0.1, 0, 1.15, 1.95, this.panel))
    for (const x of [-1.3, 1.3]) {
      const lower = plate(0.1, 0.9, 2.6, x, 0.5, 0.3, this.panel)
      const upper = plate(0.1, 2, 2.6, x, 1.7, 0.2, this.panel)
      this.sidePlates.push(lower, upper)
      shell.add(lower, upper)
    }
    // shell.add(plate(2.6, 0.18, 0.1, 0, 2.0, -1.0, this.metal))
    // shell.add(plate(0.14, 1.2, 0.1, -1.2, 1.3, -1.0, this.metal))
    // shell.add(plate(0.14, 1.2, 0.1, 1.2, 1.3, -1.0, this.metal))
    shell.add(plate(2.6, 0.2, 0.1, 0, 0.75, -1.0, this.metal))
    const seat = new Group()
    seat.add(plate(0.5, 0.1, 0.5, 0, 0.5, 0, this.metal))
    seat.add(plate(0.5, 0.6, 0.1, 0, 0.8, 0.22, this.metal))
    seat.position.set(-0.55, 0, 1.55)
    shell.add(seat)
    this.group.add(shell)
  }

  private buildConsole(): void {
    const desk = new Group()
    desk.add(plate(2.2, 0.6, 0.7, 0, 0.95, -0.55, this.panel))
    desk.add(plate(2.4, 0.4, 0.1, 0, 1.25, -1, this.dark))
    this.group.add(desk)
  }

  /** One lever: forward = power, backward = brake. */
  private buildPowerLever(): void {
    const pivot = new Object3D()
    pivot.position.set(0.15, 1.28, -0.55)
    const base = new Mesh(new CylinderGeometry(0.06, 0.07, 0.05, 10), this.metal)
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
    this.addButton('horn', 'Horn', 0.45, 1.26, -0.6, 0x2255cc, 'button')
    this.addButton('doors', 'Doors', -0.45, 1.26, -0.6, 0x99bb55, 'toggle')
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
      new CylinderGeometry(0.06, 0.06, 0.05, 24),
      new MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5, emissive: color, emissiveIntensity: 0 }),
    )
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

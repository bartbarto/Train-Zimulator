import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
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
  /** Carriage body tint; falls back to `cabColor` when omitted. */
  carriageColor?: string | number
  /** Carriage stripe/accent; falls back to `cabColorAccent` when omitted. */
  carriageAccentColor?: string | number
  /** Carriage door tint; falls back to `carriageColor` when omitted. */
  carriageDoorColor?: string | number
  /** Roof tint for cab ceiling and carriage roofs; falls back to `carriageColor` then `cabColor`. */
  roofColor?: string | number
  /** Carriage window frame tint; falls back to `carriageColor` then `cabColor`. */
  windowFrameColor?: string | number
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

export function resolveCabTones(cabColor?: string | number): CabTones {
  if (cabColor === undefined || cabColor === null) return DEFAULT_TONES
  return deriveCabTones(cabColor) ?? DEFAULT_TONES
}

export function resolveAccentColor(cabColorAccent?: string | number): number | null {
  const hex = parseHexColor(cabColorAccent)
  if (hex === null) return null

  const color = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  return new Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l, ACCENT_MIN_LIGHTNESS)).getHex()
}

/** Raw carriage body colour from JSON (no tone derivation). */
export function resolveCarriageColor(color?: string | number, fallback?: string | number): number {
  return parseHexColor(color) ?? parseHexColor(fallback) ?? DEFAULT_PANEL
}

/** Raw carriage stripe colour from JSON (no tone derivation). */
export function resolveCarriageAccentColor(color?: string | number, fallback?: string | number): number {
  return parseHexColor(color) ?? parseHexColor(fallback) ?? DEFAULT_DARK
}

/** Raw carriage door colour from JSON (no tone derivation). */
export function resolveCarriageDoorColor(
  color?: string | number,
  fallback?: string | number,
  secondFallback?: string | number,
): number {
  return parseHexColor(color) ?? parseHexColor(fallback) ?? parseHexColor(secondFallback) ?? DEFAULT_DARK
}

/** Raw roof colour from JSON (no tone derivation). */
export function resolveRoofColor(
  color?: string | number,
  fallback?: string | number,
  secondFallback?: string | number,
): number {
  return parseHexColor(color) ?? parseHexColor(fallback) ?? parseHexColor(secondFallback) ?? DEFAULT_DARK
}

/** Raw window frame colour from JSON (no tone derivation). */
export function resolveWindowFrameColor(
  color?: string | number,
  fallback?: string | number,
  secondFallback?: string | number,
): number {
  return parseHexColor(color) ?? parseHexColor(fallback) ?? parseHexColor(secondFallback) ?? DEFAULT_DARK
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
  private readonly roof: MeshStandardMaterial
  private readonly topPlate: Mesh
  private readonly sidePlates: Mesh[] = []

  constructor(colors: CabColorOptions = {}) {
    const tones = resolveCabTones(colors.cabColor)
    this.metal = createCabMaterial(tones.metal, METAL_METALNESS, METAL_ROUGHNESS)
    this.panel = createCabMaterial(tones.panel, PANEL_METALNESS, PANEL_ROUGHNESS)
    this.dark = createCabMaterial(tones.dark, DARK_METALNESS, DARK_ROUGHNESS)
    this.accent = createAccentMaterial(DEFAULT_PANEL)
    this.roof = createCabMaterial(
      resolveRoofColor(colors.roofColor, colors.carriageColor, colors.cabColor),
      PANEL_METALNESS,
      PANEL_ROUGHNESS,
    )

    this.topPlate = plate(2.6, 0.1, 2.6, 0, 2.3, 0.3, this.roof)
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
    this.roof.color.setHex(resolveRoofColor(colors.roofColor, colors.carriageColor, colors.cabColor))
    this.applyAccent(resolveAccentColor(colors.cabColorAccent))
  }

  private applyAccent(accentHex: number | null): void {
    if (accentHex !== null) {
      this.accent.color.setHex(accentHex)
      this.accent.emissive.setHex(accentHex)
      for (const side of this.sidePlates) side.material = this.accent
      return
    }

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
    const leverX = 0.05
    const leverY = 1.278
    const leverZ = -0.52
    const slotMat = new MeshStandardMaterial({ color: 0x080808, metalness: 0.05, roughness: 0.98 })
    const slot = plate(0.09, 0.01, 0.195, leverX, leverY, leverZ, slotMat)
    this.group.add(slot)

    const pivot = new Object3D()
    pivot.position.set(leverX, leverY - 0.03, leverZ)
    const leverMat = new MeshStandardMaterial({ color: 0x4a6b4a, metalness: 0.5, roughness: 0.5 })
    const gripMat = new MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.8 })

    const shaftHeight = 0.22
    const shaft = new Mesh(new CylinderGeometry(0.028, 0.028, shaftHeight, 8), leverMat)
    shaft.position.y = shaftHeight / 2

    const grip = new Mesh(new CylinderGeometry(0.03, 0.03, 0.18, 10), gripMat)
    grip.rotation.z = Math.PI / 2
    grip.position.y = shaftHeight + 0.0
    grip.userData.controlId = 'power'

    pivot.add(shaft, grip)
    this.group.add(pivot)
    this.handles.push({
      id: 'power',
      kind: 'lever',
      object: grip,
      pivot,
      restRotation: 0,
      rangeRotation: -42 * DEG_TO_RAD,
      rangeRotationBack: 42 * DEG_TO_RAD,
      label: 'Power / Brake',
    })
  }

  private buildButtons(): void {
    this.addButton('horn', 'Horn', -0.45, 1.26, -0.6, 0x2255cc, 'button')
    this.addButton('doors', 'Doors', 0.45, 1.26, -0.6, 0x99bb55, 'toggle')
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
    this.handles.push({ id, kind, object: cap, pivot: cap, restRotation: 0, rangeRotation: 0, label, restY: y })
  }
}

function plate(w: number, h: number, d: number, x: number, y: number, z: number, mat: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  return mesh
}

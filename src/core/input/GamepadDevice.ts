import { clamp } from '@/engine/math'
import type { AxisAction, ButtonAction } from './actions'

export type ControllerType = 'xbox' | 'playstation' | 'switch' | 'steamdeck' | 'generic'

export interface GamepadConfig {
  deadzone: number
  lookSensitivity: number
  cursorSensitivity: number
  invertLookY: boolean
  triggerThreshold: number
  vibration: boolean
}

export const DEFAULT_GAMEPAD_CONFIG: GamepadConfig = {
  deadzone: 0.12,
  lookSensitivity: 2.5,
  cursorSensitivity: 1.5,
  invertLookY: false,
  triggerThreshold: 0.05,
  vibration: true,
}

const STANDARD_BUTTON_MAP: Partial<Record<number, ButtonAction>> = {
  0: 'interact', // A / Cross
  2: 'horn', // X / Square
  3: 'doors', // Y / Triangle
  8: 'toggleHud', // View / Select
  9: 'pause', // Menu / Start
  11: 'resetCamera', // R3
  12: 'powerUp', // D-Pad Up
  13: 'powerDown', // D-Pad Down
}

/**
 * Reads the Web Gamepad API with the documented default layout. Supports
 * hot-plugging, automatic type detection, configurable deadzones, axis
 * inversion, sensitivity and rumble.
 */
export class GamepadDevice {
  config: GamepadConfig
  private index: number | null = null
  private type: ControllerType = 'generic'
  private prevButtons: boolean[] = []

  constructor(config: GamepadConfig = DEFAULT_GAMEPAD_CONFIG) {
    this.config = config
  }

  attach(): void {
    window.addEventListener('gamepadconnected', this.onConnect)
    window.addEventListener('gamepaddisconnected', this.onDisconnect)
  }

  detach(): void {
    window.removeEventListener('gamepadconnected', this.onConnect)
    window.removeEventListener('gamepaddisconnected', this.onDisconnect)
  }

  get connected(): boolean {
    return this.index !== null
  }

  get controllerType(): ControllerType {
    return this.type
  }

  private pad(): Gamepad | null {
    if (this.index === null) return null
    return navigator.getGamepads?.()[this.index] ?? null
  }

  private applyDeadzone(value: number): number {
    const dz = this.config.deadzone
    if (Math.abs(value) < dz) return 0
    return Math.sign(value) * ((Math.abs(value) - dz) / (1 - dz))
  }

  /** Read the live pad, accumulating into axes and resolving button edges. */
  poll(axes: Record<AxisAction, number>, pressed: Set<ButtonAction>, held: Set<ButtonAction>, dt: number): void {
    const pad = this.pad()
    if (!pad) return

    const lx = this.applyDeadzone(pad.axes[0] ?? 0)
    const ly = this.applyDeadzone(pad.axes[1] ?? 0)
    const rx = this.applyDeadzone(pad.axes[2] ?? 0)
    const ry = this.applyDeadzone(pad.axes[3] ?? 0)

    axes.cursorX = clamp(axes.cursorX + lx * this.config.cursorSensitivity * dt, -1, 1)
    axes.cursorY = clamp(axes.cursorY - ly * this.config.cursorSensitivity * dt, -1, 1)
    axes.lookX += rx * this.config.lookSensitivity
    axes.lookY += (this.config.invertLookY ? -ry : ry) * this.config.lookSensitivity

    const rt = pad.buttons[7]?.value ?? 0
    const lt = pad.buttons[6]?.value ?? 0
    if (rt > this.config.triggerThreshold) axes.throttleAxis = rt
    if (lt > this.config.triggerThreshold) axes.trainBrakeAxis = lt

    if (pad.buttons[10]?.pressed) axes.zoom -= 1 // L3 zoom in

    for (let i = 0; i < pad.buttons.length; i++) {
      const action = STANDARD_BUTTON_MAP[i]
      if (!action) continue
      const isDown = pad.buttons[i]?.pressed ?? false
      if (isDown) held.add(action)
      if (isDown && !this.prevButtons[i]) pressed.add(action)
      this.prevButtons[i] = isDown
    }
  }

  vibrate(strong: number, weak: number, durationMs: number): void {
    if (!this.config.vibration) return
    const pad = this.pad()
    const actuator = (pad as unknown as { vibrationActuator?: GamepadHapticActuator })?.vibrationActuator
    actuator?.playEffect?.('dual-rumble', {
      duration: durationMs,
      strongMagnitude: clamp(strong, 0, 1),
      weakMagnitude: clamp(weak, 0, 1),
    })
  }

  private readonly onConnect = (e: GamepadEvent): void => {
    this.index = e.gamepad.index
    this.type = detectControllerType(e.gamepad.id)
  }

  private readonly onDisconnect = (e: GamepadEvent): void => {
    if (e.gamepad.index === this.index) {
      this.index = null
      this.prevButtons = []
    }
  }
}

export function detectControllerType(id: string): ControllerType {
  const lower = id.toLowerCase()
  if (lower.includes('xbox') || lower.includes('xinput')) return 'xbox'
  if (lower.includes('dualshock') || lower.includes('dualsense') || lower.includes('playstation') || lower.includes('054c')) return 'playstation'
  if (lower.includes('switch') || lower.includes('pro controller') || lower.includes('057e')) return 'switch'
  if (lower.includes('steam') || lower.includes('valve')) return 'steamdeck'
  return 'generic'
}

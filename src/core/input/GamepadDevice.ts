import { clamp } from '@/engine/math'
import type { AxisAction, ButtonAction } from './actions'

export type ControllerType = 'xbox' | 'playstation' | 'switch' | 'steamdeck' | 'generic'

export interface GamepadConfig {
  deadzone: number
  triggerThreshold: number
  vibration: boolean
}

export const DEFAULT_GAMEPAD_CONFIG: GamepadConfig = {
  deadzone: 0.12,
  triggerThreshold: 0.05,
  vibration: true,
}

const STICK_LOOK_SCALE = 2.5
const CURSOR_SPEED = 1.4
const LEVER_DEADZONE = 0.01

const STANDARD_BUTTON_MAP: Partial<Record<number, ButtonAction>> = {
  0: 'interact', // A / Cross
  7: 'reverse',
  8: 'toggleHud', // View / Select
  9: 'pause', // Menu / Start
  10: 'horn',
  11: 'doors',
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
  private cursorX = 0
  private cursorY = 0

  constructor(config: GamepadConfig = DEFAULT_GAMEPAD_CONFIG) {
    this.config = config
  }

  attach(): void {
    window.addEventListener('gamepadconnected', this.onConnect)
    window.addEventListener('gamepaddisconnected', this.onDisconnect)
    this.syncIndex()
  }

  detach(): void {
    window.removeEventListener('gamepadconnected', this.onConnect)
    window.removeEventListener('gamepaddisconnected', this.onDisconnect)
  }

  get connected(): boolean {
    return this.findPadIndex() !== null
  }

  /** True when any slot in navigator.getGamepads() is populated. */
  anyConnected(): boolean {
    return this.findPadIndex() !== null
  }

  get controllerType(): ControllerType {
    return this.type
  }

  private pad(): Gamepad | null {
    if (this.index === null) return null
    return navigator.getGamepads?.()[this.index] ?? null
  }

  /** Pick up pads that were connected before attach or missed the connect event. */
  private syncIndex(): void {
    const idx = this.findPadIndex()
    if (idx === null) {
      if (this.index !== null) {
        this.index = null
        this.prevButtons = []
        this.cursorX = 0
        this.cursorY = 0
      }
      return
    }
    if (this.index === idx) return
    const pad = navigator.getGamepads?.()[idx]
    if (!pad) return
    this.index = idx
    this.type = detectControllerType(pad.id)
    this.prevButtons = []
  }

  private findPadIndex(): number | null {
    const pads = navigator.getGamepads?.()
    if (!pads) return null
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) return i
    }
    return null
  }

  private applyDeadzone(value: number): number {
    const dz = this.config.deadzone
    if (Math.abs(value) < dz) return 0
    return Math.sign(value) * ((Math.abs(value) - dz) / (1 - dz))
  }

  /** USB throttles / HOTAS levers use axis 2; standard pads use it for the right stick. */
  private usesAxis2Lever(pad: Gamepad): boolean {
    if (this.type === 'generic') return true
    return pad.axes.length <= 4
  }

  private applyAxis2Lever(axes: Record<AxisAction, number>, pad: Gamepad): void {
    const forwardBack = -this.applyDeadzone(pad.axes[2] ?? 0)
    if (forwardBack > LEVER_DEADZONE) axes.throttleAxis = forwardBack
    else if (forwardBack < -LEVER_DEADZONE) axes.trainBrakeAxis = -forwardBack
  }

  /** Read the live pad, accumulating into axes and resolving button edges. */
  poll(axes: Record<AxisAction, number>, pressed: Set<ButtonAction>, held: Set<ButtonAction>, dt: number): void {
    this.syncIndex()
    const pad = this.pad()
    if (!pad) return

    const lookX = this.applyDeadzone(pad.axes[0] ?? 0)
    const lookY = this.applyDeadzone(pad.axes[1] ?? 0)
    const brake = pad.axes[4] ?? 0
    const throttle = pad.axes[5] ?? 0

    axes.lookX += lookX * STICK_LOOK_SCALE
    axes.lookY += lookY * STICK_LOOK_SCALE

    if (this.usesAxis2Lever(pad)) {
      this.applyAxis2Lever(axes, pad)
    } else {
      const cursorStickX = this.applyDeadzone(pad.axes[2] ?? 0)
      const cursorStickY = -this.applyDeadzone(pad.axes[3] ?? 0)
      this.cursorX = clamp(this.cursorX + cursorStickX * CURSOR_SPEED * dt, -1, 1)
      this.cursorY = clamp(this.cursorY + cursorStickY * CURSOR_SPEED * dt, -1, 1)
      axes.cursorX = this.cursorX
      axes.cursorY = this.cursorY

      if (throttle > this.config.triggerThreshold) axes.throttleAxis = throttle
      if (brake > this.config.triggerThreshold) axes.trainBrakeAxis = brake
    }

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
    this.prevButtons = []
  }

  private readonly onDisconnect = (e: GamepadEvent): void => {
    if (e.gamepad.index !== this.index) return
    this.syncIndex()
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

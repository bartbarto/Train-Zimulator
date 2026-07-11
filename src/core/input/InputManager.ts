import {
  createEmptyAxes,
  type AxisAction,
  type ButtonAction,
  type InputSnapshot,
} from './actions'
import { KeyboardDevice, type KeyBindings } from './KeyboardDevice'
import { MouseDevice } from './MouseDevice'
import { GamepadDevice, type GamepadConfig } from './GamepadDevice'

/**
 * Aggregates all input devices into a single per-frame {@link InputSnapshot}.
 * Performs edge detection (pressed/released) by diffing the held set against
 * the previous frame, so consumers can react to discrete presses cleanly.
 */
export class InputManager {
  readonly keyboard = new KeyboardDevice()
  readonly mouse = new MouseDevice()
  readonly gamepad = new GamepadDevice()

  private readonly axes: Record<AxisAction, number> = createEmptyAxes()
  private prevHeld = new Set<ButtonAction>()
  private currentHeld = new Set<ButtonAction>()
  private readonly pressed = new Set<ButtonAction>()
  private readonly released = new Set<ButtonAction>()

  private readonly snapshot: InputSnapshot = {
    axes: this.axes,
    pressed: this.pressed,
    released: this.released,
    held: this.currentHeld,
  }

  attach(element: HTMLElement): void {
    this.keyboard.attach()
    this.gamepad.attach()
    element.addEventListener('contextmenu', this.preventContext)
  }

  detach(element: HTMLElement): void {
    this.keyboard.detach()
    this.gamepad.detach()
    element.removeEventListener('contextmenu', this.preventContext)
  }

  setKeyBindings(bindings: KeyBindings): void {
    this.keyboard.setBindings(bindings)
  }

  setGamepadConfig(config: Partial<GamepadConfig>): void {
    Object.assign(this.gamepad.config, config)
  }

  /** Build the snapshot for this frame. Must be called once per frame. */
  update(dt: number): InputSnapshot {
    // Reset axes (look/zoom are deltas; throttle/brake default to no-input).
    for (const key in this.axes) this.axes[key as AxisAction] = 0

    // Collect held buttons fresh each frame.
    const held = this.currentHeld
    held.clear()
    this.keyboard.collectHeld(held)

    // Collect axes from continuous devices.
    this.keyboard.collectAxes(this.axes)

    this.pressed.clear()
    this.released.clear()

    this.gamepad.poll(this.axes, this.pressed, held, dt)

    // Keyboard / generic edge detection by diffing held sets.
    for (const action of held) {
      if (!this.prevHeld.has(action)) this.pressed.add(action)
    }
    for (const action of this.prevHeld) {
      if (!held.has(action)) this.released.add(action)
    }

    // Swap held buffers for next frame.
    const tmp = this.prevHeld
    this.prevHeld = held
    this.currentHeld = tmp
    this.snapshot.held = held

    return this.snapshot
  }

  private readonly preventContext = (e: Event): void => e.preventDefault()
}

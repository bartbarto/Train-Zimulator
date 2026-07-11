import type { AxisAction, ButtonAction } from './actions'

export type KeyBindings = Partial<Record<string, ButtonAction>>

/** Default keyboard layout for the simplified cab. */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  KeyW: 'powerUp',
  KeyS: 'powerDown',
  Space: 'horn',
  KeyR: 'reverse',
  KeyO: 'doors',
  KeyF: 'interact',
  Escape: 'pause',
  KeyG: 'toggleHud',
  Backquote: 'toggleDebug',
}

const RECENT_USE_MS = 4000

export class KeyboardDevice {
  private readonly down = new Set<string>()
  private bindings: KeyBindings
  private lastActivityAt = 0

  constructor(bindings: KeyBindings = DEFAULT_KEY_BINDINGS) {
    this.bindings = bindings
  }

  /** True while any bound key is held or was used within the last few seconds. */
  get recentlyUsed(): boolean {
    if (this.down.size > 0) return true
    return performance.now() - this.lastActivityAt < RECENT_USE_MS
  }

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('blur', this.onBlur)
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDown)
    target.removeEventListener('keyup', this.onKeyUp)
    target.removeEventListener('blur', this.onBlur)
  }

  setBindings(bindings: KeyBindings): void {
    this.bindings = bindings
  }

  collectHeld(held: Set<ButtonAction>): void {
    for (const code of this.down) {
      const action = this.bindings[code]
      if (action) held.add(action)
    }
  }

  collectAxes(_axes: Record<AxisAction, number>): void {}

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.bindings[e.code]) e.preventDefault()
    this.down.add(e.code)
    this.lastActivityAt = performance.now()
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code)
    this.lastActivityAt = performance.now()
  }

  private readonly onBlur = (): void => {
    this.down.clear()
  }
}

import gsap from 'gsap'
import type { InputManager } from '@/core/input/InputManager'
import type { InputSnapshot, ButtonAction } from '@/core/input/actions'
import type { Controls } from '@/simulation/Controls'
import type { Cab } from './Cab'
import type { CabControlHandle } from './types'

export interface CabControllerCallbacks {
  onPause: () => void
  onToggleHud: () => void
  onToggleDebug: () => void
  onToggleDoors: () => void
  onHorn: (on: boolean) => void
}

const POWER_RATE = 0.85
const TRIGGER_THRESHOLD = 0.01

/**
 * Maps input to cab controls: power lever, horn, reverse, and doors.
 */
export class CabController {
  private readonly input: InputManager
  private readonly cab: Cab
  private controls: Controls
  private readonly callbacks: CabControllerCallbacks
  private hornPulse = false

  constructor(input: InputManager, cab: Cab, controls: Controls, callbacks: CabControllerCallbacks) {
    this.input = input
    this.cab = cab
    this.controls = controls
    this.callbacks = callbacks
  }

  setControls(controls: Controls): void {
    this.controls = controls
  }

  update(snapshot: InputSnapshot, dt: number): void {
    this.updateLook(snapshot)
    this.updateInteraction(snapshot)
    this.updatePower(snapshot, dt)
    this.updateHorn(snapshot)
    this.updateEdges(snapshot)
  }

  private updateLook(s: InputSnapshot): void {
    this.cab.camera.look(s.axes.lookX, s.axes.lookY)
    this.cab.camera.setZoom(s.axes.zoom < -0.01)
  }

  private updateInteraction(s: InputSnapshot): void {
    const looking = this.input.mouse.isLooking
    const usingPad = this.input.gamepad.connected
    let ndcX = 0
    let ndcY = 0
    if (usingPad) {
      ndcX = s.axes.cursorX
      ndcY = s.axes.cursorY
    } else if (!looking) {
      ndcX = this.input.mouse.ndc.x
      ndcY = this.input.mouse.ndc.y
    }
    this.cab.interaction.update(this.cab.camera.camera, ndcX, ndcY)
  }

  private updatePower(s: InputSnapshot, dt: number): void {
    if (s.held.has('powerUp')) this.controls.adjustPowerLever(POWER_RATE * dt)
    if (s.held.has('powerDown')) this.controls.adjustPowerLever(-POWER_RATE * dt)

    const analog = s.axes.throttleAxis - s.axes.trainBrakeAxis
    if (Math.abs(analog) > TRIGGER_THRESHOLD) {
      this.controls.setPowerLever(analog)
    } else if (
      this.input.gamepad.connected &&
      !s.held.has('powerUp') &&
      !s.held.has('powerDown')
    ) {
      this.controls.setPowerLever(0)
    }
  }

  private updateHorn(s: InputSnapshot): void {
    const hornHeld = s.held.has('horn') || this.hornPulse
    if (this.controls.state.horn !== hornHeld) {
      this.controls.state.horn = hornHeld
      this.callbacks.onHorn(hornHeld)
    }
  }

  private updateEdges(s: InputSnapshot): void {
    for (const action of s.pressed) this.handlePress(action)
  }

  private handlePress(action: ButtonAction): void {
    switch (action) {
      case 'powerUp':
        return this.controls.adjustPowerLever(0.08)
      case 'powerDown':
        return this.controls.adjustPowerLever(-0.08)
      case 'horn':
        return this.pulseHorn()
      case 'reverse':
        return this.toggleReverse()
      case 'doors':
        this.cab.triggerButtonPress('doors')
        return this.callbacks.onToggleDoors()
      case 'resetCamera':
        return this.cab.camera.reset()
      case 'pause':
        return this.callbacks.onPause()
      case 'toggleHud':
        return this.callbacks.onToggleHud()
      case 'toggleDebug':
        return this.callbacks.onToggleDebug()
      case 'interact':
        return this.activateHovered()
      default:
        return
    }
  }

  private activateHovered(): void {
    const handle = this.cab.interaction.hovered
    if (!handle) {
      if (!this.input.gamepad.connected) this.input.mouse.requestLook()
      return
    }
    this.applyActivation(handle)
    this.pressFeedback(handle)
  }

  private applyActivation(h: CabControlHandle): void {
    switch (h.id) {
      case 'power':
        return this.controls.adjustPowerLever(0.08)
      case 'horn':
        return this.pulseHorn()
      case 'reverse':
        return this.toggleReverse()
      case 'doors':
        return this.callbacks.onToggleDoors()
    }
  }

  private pulseHorn(): void {
    this.hornPulse = true
    gsap.delayedCall(0.8, () => (this.hornPulse = false))
  }

  private toggleReverse(): void {
    if (!this.controls.toggleReverser()) return
    this.cab.triggerButtonPress('reverse')
  }

  private pressFeedback(h: CabControlHandle): void {
    if (h.kind === 'lever') return
    if (h.id !== 'horn') this.cab.triggerButtonPress(h.id)
  }
}

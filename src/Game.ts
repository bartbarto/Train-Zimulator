import { Vector3 } from 'three'
import { MS_TO_KMH } from '@/engine/constants'
import { Renderer } from '@/core/Renderer'
import { SceneManager } from '@/core/SceneManager'
import { AssetManager } from '@/core/AssetManager'
import { ContentLoader } from '@/core/ContentLoader'
import {
  locomotiveToOption,
  routeToOption,
  type LocomotiveOption,
  type RouteOption,
} from '@/core/ContentCatalog'
import { loadPreferredLocomotive, savePreferredLocomotive } from '@/core/LocomotivePreference'
import { loadPreferredRoute, savePreferredRoute } from '@/core/RoutePreference'
import { InputManager } from '@/core/input/InputManager'
import { GameLoop } from '@/core/GameLoop'
import type { SettingsManager } from '@/core/SettingsManager'
import { SaveManager } from '@/core/SaveManager'
import { Simulation } from '@/simulation/Simulation'
import { createDefaultControlState } from '@/simulation/Controls'
import type { LocomotiveSpec, RouteSpec } from '@/data/types'
import type { WeatherKind } from '@/simulation/Environment'
import { World } from '@/world/World'
import { Cab } from '@/cab/Cab'
import { CabController } from '@/cab/CabController'
import { SoundController } from '@/audio/SoundController'
import { buildSnapshot } from '@/ui/snapshot'
import type { UiSnapshot } from '@/ui/types'
import type { SessionResult } from '@/simulation/SessionStats'

export interface GameCallbacks {
  onProgress: (value: number) => void
  onSnapshot: (snapshot: UiSnapshot) => void
  onPauseChanged: (paused: boolean) => void
  onHudChanged: (visible: boolean) => void
  onDebugChanged: (visible: boolean) => void
  onSessionComplete: (result: SessionResult, locomotiveId: string, routeId: string) => void
  onContentReady: (locomotives: LocomotiveOption[], routes: RouteOption[], locomotiveId: string, routeId: string) => void
  onLocomotivesReady: (options: LocomotiveOption[], currentId: string) => void
  onLocomotiveChanged: (id: string) => void
}

const SNAPSHOT_INTERVAL = 1 / 15

/**
 * Top-level orchestrator. Owns and connects every subsystem, runs the fixed-
 * timestep loop (simulation) plus per-frame rendering, and bridges telemetry to
 * the UI. This is the only place subsystems are wired together.
 */
export class Game {
  private readonly renderer: Renderer
  private readonly scene = new SceneManager()
  private readonly assets = new AssetManager()
  private readonly input = new InputManager()
  private readonly settings: SettingsManager
  readonly saves = new SaveManager()

  private sim!: Simulation
  private world!: World
  private cab!: Cab
  private cabController!: CabController
  private sound!: SoundController
  private loop!: GameLoop

  private readonly callbacks: GameCallbacks
  private readonly canvas: HTMLCanvasElement
  private readonly cameraWorldPos = new Vector3()
  private paused = false
  private hudVisible = true
  private debugVisible = false
  private snapshotTimer = 0
  private locomotiveId = 'br218'
  private routeId = 'valley'
  private locomotiveSpec!: LocomotiveSpec
  private content!: ContentLoader
  private routeSpec!: RouteSpec
  private locomotiveOptions: LocomotiveOption[] = []
  private routeOptions: RouteOption[] = []
  private switching = false
  private sessionReady = false
  private finished = false

  constructor(canvas: HTMLCanvasElement, settings: SettingsManager, callbacks: GameCallbacks) {
    this.canvas = canvas
    this.settings = settings
    this.callbacks = callbacks
    this.renderer = new Renderer(canvas, settings.settings.graphics)
  }

  /** Load content catalog and core engine shell; session starts via {@link startSession}. */
  async prepare(): Promise<void> {
    this.assets.onProgress = (loaded, total) => this.callbacks.onProgress(total ? loaded / total : 1)

    this.content = new ContentLoader(this.assets)
    const manifest = await this.content.loadManifest()
    this.locomotiveOptions = await this.loadLocomotiveCatalog(manifest.locomotives)
    this.routeOptions = await this.loadRouteCatalog(manifest.routes)

    this.locomotiveId = this.resolveStartLocomotive(manifest.defaults.locomotive)
    this.routeId = this.resolveStartRoute(manifest.defaults.route)

    this.input.attach(this.canvas)
    this.input.setGamepadConfig(this.settings.settings.gamepad)
    this.input.setKeyBindings(this.settings.settings.keyBindings)

    this.settings.onChange(() => this.applySettings())
    window.addEventListener('resize', this.onResize)
    window.addEventListener('pointerdown', this.resumeAudioOnce, { once: true })

    this.loop = new GameLoop({
      fixedUpdate: (dt) => this.fixedUpdate(dt),
      render: (frameDt) => this.render(frameDt),
    })

    this.callbacks.onContentReady(this.locomotiveOptions, this.routeOptions, this.locomotiveId, this.routeId)
    this.callbacks.onProgress(1)
  }

  /** Build the world and begin driving with the chosen consist and route. */
  async startSession(locomotiveId: string, routeId: string): Promise<void> {
    if (!this.locomotiveOptions.some((o) => o.id === locomotiveId)) {
      throw new Error(`Unknown locomotive: ${locomotiveId}`)
    }
    if (!this.routeOptions.some((o) => o.id === routeId)) {
      throw new Error(`Unknown route: ${routeId}`)
    }

    this.teardownSession()

    this.routeId = routeId
    this.routeSpec = await this.content.loadRoute(routeId)
    await this.applyLocomotive(locomotiveId)

    this.world = new World(this.sim.route, this.routeSpec)
    this.scene.scene.add(this.world.group)
    this.sim.setAllPassengersBoardedCheck((stationId) => this.world.areAllPassengersBoarded(stationId))

    this.cab = new Cab(this.sim.route.track, this.settings.settings.camera, this.renderer.aspect, {
      cabColor: this.locomotiveSpec.cabColor,
      cabColorAccent: this.locomotiveSpec.cabColorAccent,
      carriageColor: this.locomotiveSpec.carriageColor,
      carriageAccentColor: this.locomotiveSpec.carriageAccentColor,
      carriageDoorColor: this.locomotiveSpec.carriageDoorColor,
      roofColor: this.locomotiveSpec.roofColor,
      windowFrameColor: this.locomotiveSpec.windowFrameColor,
    })
    this.scene.scene.add(this.cab.root)

    this.cabController = new CabController(this.input, this.cab, this.sim.train.controls, {
      onPause: () => this.togglePause(),
      onToggleHud: () => this.setHudVisible(!this.hudVisible),
      onToggleDebug: () => this.setDebugVisible(!this.debugVisible),
      onToggleDoors: () => this.sim.toggleDoors(),
      onHorn: () => {},
    })

    this.sound = new SoundController(this.settings.settings.audio)
    this.renderer.setupPostProcessing(this.scene.scene, this.cab.camera.camera)
    this.applySettings()

    savePreferredLocomotive(locomotiveId)
    savePreferredRoute(routeId)
    this.sessionReady = true
    this.finished = false
    this.callbacks.onLocomotivesReady(this.locomotiveOptions, this.locomotiveId)
  }

  private teardownSession(): void {
    if (this.world) {
      this.scene.scene.remove(this.world.group)
      this.world = undefined!
    }
    if (this.cab) {
      this.scene.scene.remove(this.cab.root)
      this.cab.platformMonitor.dispose()
      this.cab = undefined!
    }
    this.sound?.dispose()
    this.sound = undefined!
    this.cabController = undefined!
    this.sim = undefined!
    this.sessionReady = false
    this.paused = false
    this.finished = false
  }

  resolveStartLocomotive(defaultId: string, override?: string | null): string {
    const preferred = override ?? loadPreferredLocomotive(defaultId)
    return this.locomotiveOptions.some((o) => o.id === preferred) ? preferred : defaultId
  }

  resolveStartRoute(defaultId: string, override?: string | null): string {
    const preferred = override ?? loadPreferredRoute(defaultId)
    return this.routeOptions.some((o) => o.id === preferred) ? preferred : defaultId
  }

  private async loadLocomotiveCatalog(ids: string[]): Promise<LocomotiveOption[]> {
    const specs = await Promise.all(ids.map((id) => this.content.loadLocomotive(id)))
    return specs.map(locomotiveToOption)
  }

  private async loadRouteCatalog(ids: string[]): Promise<RouteOption[]> {
    const specs = await Promise.all(ids.map((id) => this.content.loadRoute(id)))
    return specs.map(routeToOption)
  }

  private async applyLocomotive(id: string): Promise<void> {
    const loco = await this.content.loadLocomotive(id)
    this.locomotiveSpec = loco
    this.locomotiveId = loco.id
    this.sim = new Simulation(loco, this.routeSpec)
    this.prepareTrain(loco)
    this.cab?.setCabColors({
      cabColor: loco.cabColor,
      cabColorAccent: loco.cabColorAccent,
      carriageColor: loco.carriageColor,
      carriageAccentColor: loco.carriageAccentColor,
      carriageDoorColor: loco.carriageDoorColor,
      roofColor: loco.roofColor,
      windowFrameColor: loco.windowFrameColor,
    })
  }

  /** Swap locomotive at the start of the route. Must be called while paused. */
  async switchLocomotive(id: string): Promise<boolean> {
    if (!this.sessionReady || this.switching || id === this.locomotiveId) return false
    if (!this.locomotiveOptions.some((o) => o.id === id)) return false

    this.switching = true
    try {
      await this.applyLocomotive(id)
      this.cabController.setControls(this.sim.train.controls)
      savePreferredLocomotive(id)
      this.callbacks.onLocomotiveChanged(id)
      return true
    } finally {
      this.switching = false
    }
  }

  getLocomotiveId(): string {
    return this.locomotiveId
  }

  getRouteId(): string {
    return this.routeId
  }

  getLocomotiveOptions(): readonly LocomotiveOption[] {
    return this.locomotiveOptions
  }

  getRouteOptions(): readonly RouteOption[] {
    return this.routeOptions
  }

  /** Train starts ready to drive — only the power lever is needed. */
  private prepareTrain(loco: LocomotiveSpec): void {
    const c = this.sim.train.controls.state
    Object.assign(c, createDefaultControlState())
    c.masterKey = true
    c.engineRunning = true
    c.reverser = 1
    c.pantograph = loco.type === 'electric'
  }

  start(): void {
    this.loop.start()
  }

  private fixedUpdate(dt: number): void {
    if (!this.sessionReady || this.paused || this.finished) return
    this.sim.update(dt)
    if (this.sim.isRouteComplete()) {
      this.finishSession()
    }
  }

  private finishSession(): void {
    if (this.finished) return
    this.finished = true
    this.paused = true
    this.sound.silence()
    const passengers = this.world.getBoardedPassengerCount()
    const result = this.sim.getSessionResult(this.routeSpec.name, passengers)
    this.callbacks.onSessionComplete(result, this.locomotiveId, this.routeId)
  }

  returnToMenu(): void {
    this.teardownSession()
  }

  private render(frameDt: number): void {
    if (!this.sessionReady) return

    const snapshot = this.input.update(frameDt)
    if (this.paused && !this.finished && snapshot.pressed.has('pause')) {
      this.togglePause()
    } else if (!this.paused && !this.finished) {
      this.cabController.update(snapshot, frameDt)
    }

    const train = this.sim.train
    this.cab.ride(train.physics.distance)
    this.cab.syncControls(frameDt, train.controls)
    this.cab.update(frameDt)

    const tel = this.sim.getTelemetry()
    this.cab.updateGauges(frameDt, tel.speedKmh, 160, tel.brakes.brakePipeBar, 6)
    this.cab.updateHeadlight(this.sim.environment.daylight, train.controls.state.headlights)

    this.cab.camera.camera.getWorldPosition(this.cameraWorldPos)
    this.scene.update(this.sim.environment, this.cab.root.position)
    const stationState = this.sim.getStationService()
    this.world.update(this.paused || this.finished ? 0 : frameDt, this.sim.environment, this.cameraWorldPos, {
      trainDistance: train.physics.distance,
      trainSpeedMs: train.physics.speed,
      doorsOpen: train.controls.state.doorsOpen,
      stationId: stationState.station?.id ?? null,
      stopZoneStart: stationState.stopZoneStart,
      stopZoneEnd: stationState.stopZoneEnd,
      trainLengthMetres: this.cab.consist.rearOffsetZ,
      carriageDoorOffsetsZ: this.cab.consist.doorOffsetsZ,
    })
    if (!this.paused && !this.finished) {
      this.sound.update(frameDt, tel, train.controls.state, train.brakeEffort, this.sim.environment.preset.rain)
    }

    this.cab.updatePlatformMonitor(this.scene.scene)

    this.renderer.render(this.scene.scene, this.cab.camera.camera)
    this.pushSnapshot(frameDt, tel)
  }

  private pushSnapshot(frameDt: number, tel: ReturnType<Simulation['getTelemetry']>): void {
    this.snapshotTimer += frameDt
    if (this.snapshotTimer < SNAPSHOT_INTERVAL) return
    this.snapshotTimer = 0
    const stationService = this.sim.getStationService()
    const snapshot = buildSnapshot({
      telemetry: tel,
      progress: this.sim.getProgress(),
      controls: this.sim.train.controls,
      stationService,
      environment: this.sim.environment,
      hoveredControlId: this.cab.interaction.hovered?.id ?? '',
      fps: this.loop.fps,
      info: this.renderer.gl.info,
      aiSpeedKmh: (this.sim.aiTrains[0]?.speedMs ?? 0) * MS_TO_KMH,
      platformWaiting: this.world.getPlatformWaitingCount(stationService.station?.id ?? null),
    })
    this.callbacks.onSnapshot(snapshot)
  }

  togglePause(): void {
    this.setPaused(!this.paused)
  }

  setPaused(value: boolean): void {
    if (!this.sessionReady) return
    this.paused = value
    if (value) {
      this.sound.silence()
    }
    this.callbacks.onPauseChanged(value)
  }

  private setHudVisible(value: boolean): void {
    this.hudVisible = value
    this.callbacks.onHudChanged(value)
  }

  private setDebugVisible(value: boolean): void {
    this.debugVisible = value
    this.callbacks.onDebugChanged(value)
  }

  get isPaused(): boolean {
    return this.paused
  }

  get isHudVisible(): boolean {
    return this.hudVisible
  }

  get isDebugVisible(): boolean {
    return this.debugVisible
  }

  setWeather(kind: WeatherKind): void {
    if (!this.sessionReady) return
    this.sim.environment.setWeather(kind)
  }

  setTimeOfDay(seconds: number): void {
    if (!this.sessionReady) return
    this.sim.environment.setTimeOfDay(seconds)
  }

  applySettings(): void {
    const s = this.settings.settings
    this.renderer.setBloom(s.graphics.bloom)
    this.renderer.setShadows(s.graphics.shadows)
    this.renderer.setExposure(s.graphics.exposure)
    this.cab?.camera.setConfig(s.camera)
    this.input.setGamepadConfig(s.gamepad)
    this.input.setKeyBindings(s.keyBindings)
    this.sound?.applySettings(s.audio)
  }

  save(slot: string): void {
    if (!this.sessionReady) return
    const env = this.sim.environment
    this.saves.save(slot, {
      locomotiveId: this.locomotiveId,
      routeId: this.sim.route.spec.id,
      distance: this.sim.train.physics.distance,
      speedMs: this.sim.train.physics.speed,
      controls: { ...this.sim.train.controls.state },
      timeOfDay: env.timeOfDay,
      weather: env.weather,
    })
  }

  load(slot: string): boolean {
    if (!this.sessionReady) return false
    const state = this.saves.load(slot)
    if (!state) return false
    this.sim.train.restore(state.distance, state.speedMs)
    Object.assign(this.sim.train.controls.state, state.controls)
    this.sim.environment.restore(state.timeOfDay, state.weather)
    return true
  }

  private readonly onResize = (): void => {
    this.renderer.resize()
    this.cab?.camera.setAspect(this.renderer.aspect)
  }

  private readonly resumeAudioOnce = (): void => {
    void this.sound?.resume()
  }

  dispose(): void {
    this.loop?.stop()
    window.removeEventListener('resize', this.onResize)
    this.input.detach(this.canvas)
    this.teardownSession()
    this.renderer.dispose()
  }
}

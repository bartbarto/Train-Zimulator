import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { createEmptySnapshot, type UiSnapshot } from '@/ui/types'
import type { LocomotiveOption, RouteOption } from '@/core/ContentCatalog'
import type { SessionResult } from '@/simulation/SessionStats'

export type GamePhase = 'loading' | 'menu' | 'playing' | 'paused' | 'finished'

export const useSimStore = defineStore('sim', () => {
  const snapshot = shallowRef<UiSnapshot>(createEmptySnapshot())
  const phase = shallowRef<GamePhase>('loading')
  const loadProgress = shallowRef(0)
  const showHud = shallowRef(true)
  const showDebug = shallowRef(false)
  const locomotiveId = shallowRef('')
  const routeId = shallowRef('')
  const locomotiveOptions = shallowRef<LocomotiveOption[]>([])
  const routeOptions = shallowRef<RouteOption[]>([])
  const locomotiveSwitching = shallowRef(false)
  const sessionResult = shallowRef<SessionResult | null>(null)

  function setSnapshot(next: UiSnapshot): void {
    snapshot.value = next
  }

  function setPhase(next: GamePhase): void {
    phase.value = next
  }

  function setLoadProgress(value: number): void {
    loadProgress.value = value
  }

  function setContent(
    locomotives: LocomotiveOption[],
    routes: RouteOption[],
    selectedLocoId: string,
    selectedRouteId: string,
  ): void {
    locomotiveOptions.value = locomotives
    routeOptions.value = routes
    locomotiveId.value = selectedLocoId
    routeId.value = selectedRouteId
  }

  function setLocomotives(options: LocomotiveOption[], currentId: string): void {
    locomotiveOptions.value = options
    locomotiveId.value = currentId
  }

  function setLocomotiveId(id: string): void {
    locomotiveId.value = id
  }

  function setRouteId(id: string): void {
    routeId.value = id
  }

  function setLocomotiveSwitching(value: boolean): void {
    locomotiveSwitching.value = value
  }

  function setSessionResult(result: SessionResult | null): void {
    sessionResult.value = result
  }

  return {
    snapshot,
    phase,
    loadProgress,
    showHud,
    showDebug,
    locomotiveId,
    routeId,
    locomotiveOptions,
    routeOptions,
    locomotiveSwitching,
    sessionResult,
    setSnapshot,
    setPhase,
    setLoadProgress,
    setContent,
    setLocomotives,
    setLocomotiveId,
    setRouteId,
    setLocomotiveSwitching,
    setSessionResult,
  }
})

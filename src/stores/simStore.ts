import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { createEmptySnapshot, type UiSnapshot } from '@/ui/types'
import type { LocomotiveOption } from '@/core/LocomotivePreference'

export type GamePhase = 'loading' | 'menu' | 'playing' | 'paused'

export const useSimStore = defineStore('sim', () => {
  const snapshot = shallowRef<UiSnapshot>(createEmptySnapshot())
  const phase = shallowRef<GamePhase>('loading')
  const loadProgress = shallowRef(0)
  const showHud = shallowRef(true)
  const showDebug = shallowRef(false)
  const locomotiveId = shallowRef('')
  const locomotiveOptions = shallowRef<LocomotiveOption[]>([])
  const locomotiveSwitching = shallowRef(false)

  function setSnapshot(next: UiSnapshot): void {
    snapshot.value = next
  }

  function setPhase(next: GamePhase): void {
    phase.value = next
  }

  function setLoadProgress(value: number): void {
    loadProgress.value = value
  }

  function setLocomotives(options: LocomotiveOption[], currentId: string): void {
    locomotiveOptions.value = options
    locomotiveId.value = currentId
  }

  function setLocomotiveId(id: string): void {
    locomotiveId.value = id
  }

  function setLocomotiveSwitching(value: boolean): void {
    locomotiveSwitching.value = value
  }

  return {
    snapshot,
    phase,
    loadProgress,
    showHud,
    showDebug,
    locomotiveId,
    locomotiveOptions,
    locomotiveSwitching,
    setSnapshot,
    setPhase,
    setLoadProgress,
    setLocomotives,
    setLocomotiveId,
    setLocomotiveSwitching,
  }
})

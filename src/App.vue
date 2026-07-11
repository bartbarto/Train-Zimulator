<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import { SettingsManager } from '@/core/SettingsManager'
import { parseLaunchParams } from '@/core/LaunchParams'
import { Game } from '@/Game'
import LoadingScreen from '@/ui/components/LoadingScreen.vue'
import MainMenu from '@/ui/components/MainMenu.vue'
import HUD from '@/ui/components/HUD.vue'
import Crosshair from '@/ui/components/Crosshair.vue'
import DebugOverlay from '@/ui/components/DebugOverlay.vue'
import PauseMenu from '@/ui/components/PauseMenu.vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const store = useSimStore()
const { snapshot, phase, loadProgress, showHud, showDebug } = storeToRefs(store)

const settings = markRaw(new SettingsManager())
const game = shallowRef<Game | null>(null)
const starting = ref(false)

onMounted(async () => {
  if (!canvas.value) return

  const launch = parseLaunchParams()
  const instance = markRaw(
    new Game(canvas.value, settings, {
      onProgress: (v) => store.setLoadProgress(v),
      onSnapshot: (s) => store.setSnapshot(s),
      onPauseChanged: (paused) => store.setPhase(paused ? 'paused' : 'playing'),
      onHudChanged: (v) => (store.showHud = v),
      onDebugChanged: (v) => (store.showDebug = v),
      onContentReady: (locomotives, routes, locoId, routeId) => {
        const resolvedLoco = instance.resolveStartLocomotive(locoId, launch.locomotiveId)
        const resolvedRoute = instance.resolveStartRoute(routeId, launch.routeId)
        store.setContent(locomotives, routes, resolvedLoco, resolvedRoute)
      },
      onLocomotivesReady: (options, currentId) => store.setLocomotives(options, currentId),
      onLocomotiveChanged: (id) => store.setLocomotiveId(id),
    }),
  )
  game.value = instance

  await instance.prepare()
  instance.start()

  if (launch.skipMenu) {
    await beginSession(store.locomotiveId, store.routeId)
  } else {
    store.setPhase('menu')
  }
})

onBeforeUnmount(() => game.value?.dispose())

async function beginSession(locomotiveId: string, routeId: string): Promise<void> {
  if (!game.value || starting.value) return
  starting.value = true
  store.setPhase('loading')
  store.setLoadProgress(0)
  try {
    await game.value.startSession(locomotiveId, routeId)
    store.setLocomotiveId(locomotiveId)
    store.setRouteId(routeId)
    store.setPhase('playing')
  } finally {
    starting.value = false
    store.setLoadProgress(1)
  }
}

function resume(): void {
  game.value?.setPaused(false)
}
</script>

<template>
  <canvas ref="canvas" />
  <div class="overlay">
    <LoadingScreen v-if="phase === 'loading'" :progress="loadProgress" />
    <MainMenu
      v-else-if="phase === 'menu' && game"
      :settings="settings"
      @start="beginSession"
    />
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <HUD v-if="showHud" :snapshot="snapshot" />
      <Crosshair v-if="showHud && phase === 'playing'" :label="snapshot.hoveredControl" />
      <DebugOverlay v-if="showDebug" :snapshot="snapshot" />
      <PauseMenu v-if="phase === 'paused' && game" :game="game" :settings="settings" @resume="resume" />
    </template>
  </div>
</template>

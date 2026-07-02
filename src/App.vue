<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import { SettingsManager } from '@/core/SettingsManager'
import { Game } from '@/Game'
import LoadingScreen from '@/ui/components/LoadingScreen.vue'
import HUD from '@/ui/components/HUD.vue'
import Crosshair from '@/ui/components/Crosshair.vue'
import DebugOverlay from '@/ui/components/DebugOverlay.vue'
import PauseMenu from '@/ui/components/PauseMenu.vue'
import LocomotiveSelector from '@/ui/components/LocomotiveSelector.vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const store = useSimStore()
const { snapshot, phase, loadProgress, showHud, showDebug } = storeToRefs(store)

const settings = markRaw(new SettingsManager())
const game = shallowRef<Game | null>(null)

onMounted(async () => {
  if (!canvas.value) return
  const instance = markRaw(
    new Game(canvas.value, settings, {
      onProgress: (v) => store.setLoadProgress(v),
      onSnapshot: (s) => store.setSnapshot(s),
      onPauseChanged: (paused) => store.setPhase(paused ? 'paused' : 'playing'),
      onHudChanged: (v) => (store.showHud = v),
      onDebugChanged: (v) => (store.showDebug = v),
      onLocomotivesReady: (options, currentId) => store.setLocomotives(options, currentId),
      onLocomotiveChanged: (id) => store.setLocomotiveId(id),
    }),
  )
  game.value = instance
  await instance.init()
  store.setPhase('playing')
  instance.start()
})

onBeforeUnmount(() => game.value?.dispose())

function resume() {
  game.value?.setPaused(false)
}
</script>

<template>
  <canvas ref="canvas" />
  <div class="overlay">
    <LoadingScreen v-if="phase === 'loading'" :progress="loadProgress" />
    <template v-else>
      <LocomotiveSelector v-if="game" :game="game" />
      <HUD v-if="showHud" :snapshot="snapshot" />
      <Crosshair v-if="showHud && phase === 'playing'" :label="snapshot.hoveredControl" />
      <DebugOverlay v-if="showDebug" :snapshot="snapshot" />
      <PauseMenu v-if="phase === 'paused' && game" :game="game" :settings="settings" @resume="resume" />
    </template>
  </div>
</template>

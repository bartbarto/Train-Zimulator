<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import type { Game } from '@/Game'
import type { SettingsManager } from '@/core/SettingsManager'
import type { WeatherKind } from '@/simulation/Environment'

const props = defineProps<{ game: Game; settings: SettingsManager }>()
const emit = defineEmits<{ resume: [] }>()

const store = useSimStore()
const { locomotiveId, locomotiveOptions, locomotiveSwitching } = storeToRefs(store)

const form = reactive({ ...structuredClone(props.settings.settings) })
const timeHours = ref(12)
const weathers: WeatherKind[] = ['clear', 'cloudy', 'rain', 'fog']
const activeWeather = ref<WeatherKind>('clear')
const savedFlash = ref('')

function apply() {
  props.settings.patch((s) => {
    s.graphics = { ...form.graphics }
    s.camera = { ...form.camera }
    s.audio = { ...form.audio }
    s.gamepad = { ...form.gamepad }
  })
  props.game.applySettings()
}
function setWeather(w: WeatherKind) {
  activeWeather.value = w
  props.game.setWeather(w)
}
function setTime() {
  props.game.setTimeOfDay(timeHours.value * 3600)
}
function quickSave() {
  props.game.save('quicksave')
  savedFlash.value = 'Saved'
  setTimeout(() => (savedFlash.value = ''), 1500)
}
function quickLoad() {
  savedFlash.value = props.game.load('quicksave') ? 'Loaded' : 'No save'
  setTimeout(() => (savedFlash.value = ''), 1500)
}
async function switchLoco(id: string) {
  if (id === locomotiveId.value || locomotiveSwitching.value) return
  store.setLocomotiveSwitching(true)
  await props.game.switchLocomotive(id)
  store.setLocomotiveSwitching(false)
}
</script>

<template>
  <div class="scrim">
    <div class="menu panel">
      <header>
        <h2>Paused</h2>
        <button class="primary" @click="emit('resume')">Resume</button>
      </header>

      <div class="cols">
        <section>
          <h3>Graphics</h3>
          <label class="check"><input type="checkbox" v-model="form.graphics.bloom" @change="apply" /> Bloom</label>
          <label class="check"><input type="checkbox" v-model="form.graphics.shadows" @change="apply" /> Shadows</label>
          <label class="slider">Exposure <input type="range" min="0.4" max="2" step="0.05" v-model.number="form.graphics.exposure" @input="apply" /> {{ form.graphics.exposure.toFixed(2) }}</label>
        </section>

        <section>
          <h3>Camera</h3>
          <label class="slider">FOV <input type="range" min="50" max="100" step="1" v-model.number="form.camera.fov" @input="apply" /> {{ form.camera.fov }}</label>
          <label class="slider">Look Speed <input type="range" min="0.2" max="6" step="0.1" v-model.number="form.camera.lookSensitivity" @input="apply" /> {{ form.camera.lookSensitivity.toFixed(1) }}</label>
          <label class="check"><input type="checkbox" v-model="form.camera.invertY" @change="apply" /> Invert Y</label>
        </section>

        <section>
          <h3>Audio</h3>
          <label class="slider">Master <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.master" @input="apply" /></label>
          <label class="slider">Engine <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.engine" @input="apply" /></label>
          <label class="slider">Ambient <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.ambient" @input="apply" /></label>
        </section>

        <section>
          <h3>Controller</h3>
          <label class="slider">Deadzone <input type="range" min="0" max="0.4" step="0.02" v-model.number="form.gamepad.deadzone" @input="apply" /></label>
          <label class="check"><input type="checkbox" v-model="form.gamepad.vibration" @change="apply" /> Vibration</label>
        </section>

        <section>
          <h3>Environment</h3>
          <div class="weather">
            <button v-for="w in weathers" :key="w" :class="{ primary: activeWeather === w }" @click="setWeather(w)">{{ w }}</button>
          </div>
          <label class="slider">Time {{ timeHours }}h <input type="range" min="0" max="23.9" step="0.1" v-model.number="timeHours" @input="setTime" /></label>
        </section>

        <section>
          <h3>Locomotive</h3>
          <p class="hint">Switch locomotive while paused.</p>
          <div class="loco-list">
            <button
              v-for="loco in locomotiveOptions"
              :key="loco.id"
              :class="{ primary: locomotiveId === loco.id }"
              :disabled="locomotiveSwitching"
              @click="switchLoco(loco.id)"
            >
              {{ loco.name }}
            </button>
          </div>
        </section>

        <section>
          <h3>Session</h3>
          <div class="row">
            <button @click="quickSave">Quick Save</button>
            <button @click="quickLoad">Quick Load</button>
          </div>
          <span class="flash">{{ savedFlash }}</span>
        </section>
      </div>

      <footer class="mono">W/S power &amp; brake · Space horn · O doors · Esc resume · ` debug</footer>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  background: rgba(2, 4, 8, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu {
  width: min(820px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: 1.4rem 1.6rem;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
h2 { letter-spacing: 0.1rem; }
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
}
section h3 {
  color: var(--accent);
  font-size: 0.85rem;
  letter-spacing: 0.1rem;
  margin-bottom: 0.6rem;
}
label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  color: var(--text);
}
.slider { flex-wrap: wrap; }
input[type='range'] { flex: 1; accent-color: var(--accent); }
.weather { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
.weather button { text-transform: capitalize; padding: 0.3rem 0.6rem; }
.loco-list { display: flex; flex-direction: column; gap: 0.35rem; }
.loco-list button { text-align: left; font-size: 0.82rem; }
.hint { color: var(--muted); font-size: 0.75rem; margin-bottom: 0.5rem; }
.row { display: flex; gap: 0.5rem; }
.flash { color: var(--ok); font-size: 0.8rem; }
footer { margin-top: 1.2rem; color: var(--muted); font-size: 0.75rem; }
</style>

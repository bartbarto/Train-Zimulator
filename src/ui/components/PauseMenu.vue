<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimStore } from '@/stores/simStore'
import { useI18n } from '@/stores/i18nStore'
import type { Game } from '@/Game'
import type { SettingsManager } from '@/core/SettingsManager'
import type { WeatherKind } from '@/simulation/Environment'

const props = defineProps<{ game: Game; settings: SettingsManager }>()
const emit = defineEmits<{ resume: [] }>()

const store = useSimStore()
const { locomotiveId, locomotiveOptions, locomotiveSwitching } = storeToRefs(store)
const { t } = useI18n()

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
  savedFlash.value = t('pause.saved')
  setTimeout(() => (savedFlash.value = ''), 1500)
}
function quickLoad() {
  savedFlash.value = props.game.load('quicksave') ? t('pause.loaded') : t('pause.noSave')
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
    <div class="menu menu-surface">
      <header class="menu-header">
        <h2>{{ t('pause.title') }}</h2>
        <button class="primary" @click="emit('resume')">{{ t('pause.resume') }}</button>
      </header>

      <div class="cols">
        <section>
          <h3>{{ t('pause.graphics') }}</h3>
          <label class="check"><input type="checkbox" v-model="form.graphics.bloom" @change="apply" /> {{ t('pause.bloom') }}</label>
          <label class="check"><input type="checkbox" v-model="form.graphics.shadows" @change="apply" /> {{ t('pause.shadows') }}</label>
          <label class="slider">{{ t('pause.exposure') }} <input type="range" min="0.4" max="2" step="0.05" v-model.number="form.graphics.exposure" @input="apply" /> {{ form.graphics.exposure.toFixed(2) }}</label>
        </section>

        <section>
          <h3>{{ t('pause.camera') }}</h3>
          <label class="slider">{{ t('pause.fov') }} <input type="range" min="50" max="100" step="1" v-model.number="form.camera.fov" @input="apply" /> {{ form.camera.fov }}</label>
          <label class="slider">{{ t('pause.lookSpeed') }} <input type="range" min="0.2" max="6" step="0.1" v-model.number="form.camera.lookSensitivity" @input="apply" /> {{ form.camera.lookSensitivity.toFixed(1) }}</label>
          <label class="check"><input type="checkbox" v-model="form.camera.invertY" @change="apply" /> {{ t('pause.invertY') }}</label>
        </section>

        <section>
          <h3>{{ t('pause.audio') }}</h3>
          <label class="slider">{{ t('pause.master') }} <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.master" @input="apply" /></label>
          <label class="slider">{{ t('pause.engine') }} <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.engine" @input="apply" /></label>
          <label class="slider">{{ t('pause.ambient') }} <input type="range" min="0" max="1" step="0.05" v-model.number="form.audio.ambient" @input="apply" /></label>
        </section>

        <section>
          <h3>{{ t('pause.controller') }}</h3>
          <label class="slider">{{ t('pause.deadzone') }} <input type="range" min="0" max="0.4" step="0.02" v-model.number="form.gamepad.deadzone" @input="apply" /></label>
          <label class="check"><input type="checkbox" v-model="form.gamepad.vibration" @change="apply" /> {{ t('pause.vibration') }}</label>
        </section>

        <section>
          <h3>{{ t('pause.environment') }}</h3>
          <div class="weather">
            <button v-for="w in weathers" :key="w" :class="{ primary: activeWeather === w }" @click="setWeather(w)">{{ t(`weather.${w}`) }}</button>
          </div>
          <label class="slider">{{ t('pause.time', { hours: timeHours }) }} <input type="range" min="0" max="23.9" step="0.1" v-model.number="timeHours" @input="setTime" /></label>
        </section>

        <section>
          <h3>{{ t('pause.locomotive') }}</h3>
          <p class="hint">{{ t('pause.switchHint') }}</p>
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
          <h3>{{ t('pause.session') }}</h3>
          <div class="row">
            <button @click="quickSave">{{ t('pause.quickSave') }}</button>
            <button @click="quickLoad">{{ t('pause.quickLoad') }}</button>
          </div>
          <span class="flash">{{ savedFlash }}</span>
        </section>
      </div>

      <footer class="mono">{{ t('pause.footer') }}</footer>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.menu {
  width: min(820px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: 0;
  color: var(--text);
}
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0;
  padding: 0.25rem 0;
}
section {
  padding: 1.15rem 1.35rem;
  border-bottom: 1px solid var(--divider);
}
section h3 {
  color: var(--nmbs-blue-dark);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
}
label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.875rem;
  margin-bottom: 0.6rem;
  color: var(--text);
  font-weight: 500;
}
.slider { flex-wrap: wrap; }
.slider input[type='range'] { flex: 1; min-width: 120px; }
.weather { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
.weather button { text-transform: capitalize; padding: 0.35rem 0.75rem; font-size: 0.82rem; }
.loco-list { display: flex; flex-direction: column; gap: 0.4rem; }
.loco-list button {
  text-align: left;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  border-radius: var(--radius-md);
}
.hint {
  color: var(--muted);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.flash { color: var(--brand-blue); font-size: 0.8rem; font-weight: 600; }
footer {
  margin: 0;
  padding: 0.9rem 1.35rem;
  border-top: 1px solid var(--divider);
  background: var(--surface-muted);
  color: var(--muted);
  font-size: 0.75rem;
}
</style>

<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from '@/stores/i18nStore'
import type { SettingsManager } from '@/core/SettingsManager'

const props = defineProps<{
  settings: SettingsManager
  showEnvironment?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const form = reactive({ ...structuredClone(props.settings.settings) })

function apply(): void {
  props.settings.patch((s) => {
    s.graphics = { ...form.graphics }
    s.camera = { ...form.camera }
    s.audio = { ...form.audio }
    s.gamepad = { ...form.gamepad }
  })
}
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div class="menu-surface settings">
      <header class="menu-header">
        <h2>{{ t('settings.title') }}</h2>
        <button @click="emit('close')">{{ t('settings.close') }}</button>
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

        <section v-if="showEnvironment">
          <h3>{{ t('pause.environment') }}</h3>
          <p class="hint">{{ t('settings.envHint') }}</p>
        </section>
      </div>
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
  z-index: 20;
  backdrop-filter: blur(4px);
}
.settings {
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
section:last-child {
  border-bottom: none;
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
.hint {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.5;
}
</style>

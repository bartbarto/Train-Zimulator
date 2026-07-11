<script setup lang="ts">
import { reactive } from 'vue'
import type { SettingsManager } from '@/core/SettingsManager'

const props = defineProps<{
  settings: SettingsManager
  showEnvironment?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

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
    <div class="panel settings">
      <header>
        <h2>Settings</h2>
        <button @click="emit('close')">Close</button>
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

        <section v-if="showEnvironment">
          <h3>Environment</h3>
          <p class="hint">Weather and time of day are available from the pause menu during a session.</p>
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
}
.settings {
  width: min(820px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: 0;
  color: var(--text);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.4rem;
  border-bottom: 3px solid var(--border);
  background: var(--nmbs-blue-dark);
  color: var(--text-light);
}
header button {
  background: var(--nmbs-white);
  color: var(--text);
  font-size: 0.85rem;
}
h2 {
  letter-spacing: 0.2rem;
  font-size: 1.4rem;
}
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0;
  padding: 0;
}
section {
  padding: 1rem 1.2rem;
  border-right: 2px solid var(--border);
  border-bottom: 2px solid var(--border);
}
section h3 {
  color: var(--brand-blue);
  font-size: 0.95rem;
  letter-spacing: 0.16rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px solid var(--border);
}
label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  margin-bottom: 0.55rem;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.slider { flex-wrap: wrap; }
.hint {
  font-family: 'Space Mono', monospace;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.5;
}
</style>

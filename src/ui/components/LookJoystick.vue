<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@/stores/i18nStore'

const emit = defineEmits<{ look: [x: number, y: number] }>()
const { t } = useI18n()

const baseRef = ref<HTMLElement | null>(null)
const knobOffset = ref({ x: 0, y: 0 })
const active = ref(false)

const BASE_RADIUS = 56
const KNOB_RADIUS = 22
const MAX_TRAVEL = BASE_RADIUS - KNOB_RADIUS - 4

let pointerId: number | null = null
let centerX = 0
let centerY = 0

function emitLook(x: number, y: number): void {
  emit('look', x, y)
}

function reset(): void {
  pointerId = null
  active.value = false
  knobOffset.value = { x: 0, y: 0 }
  emitLook(0, 0)
}

function onPointerDown(e: PointerEvent): void {
  if (pointerId !== null) return
  const base = baseRef.value
  if (!base) return

  pointerId = e.pointerId
  active.value = true
  base.setPointerCapture(e.pointerId)

  const rect = base.getBoundingClientRect()
  centerX = rect.left + rect.width / 2
  centerY = rect.top + rect.height / 2
  updateKnob(e.clientX, e.clientY)
}

function onPointerMove(e: PointerEvent): void {
  if (e.pointerId !== pointerId) return
  updateKnob(e.clientX, e.clientY)
}

function onPointerUp(e: PointerEvent): void {
  if (e.pointerId !== pointerId) return
  baseRef.value?.releasePointerCapture(e.pointerId)
  reset()
}

function updateKnob(clientX: number, clientY: number): void {
  let dx = clientX - centerX
  let dy = clientY - centerY
  const dist = Math.hypot(dx, dy)
  if (dist > MAX_TRAVEL) {
    const scale = MAX_TRAVEL / dist
    dx *= scale
    dy *= scale
  }
  knobOffset.value = { x: dx, y: dy }
  emitLook(dx / MAX_TRAVEL, dy / MAX_TRAVEL)
}

onBeforeUnmount(reset)
</script>

<template>
  <div class="look-joystick" aria-hidden="true">
    <div
      ref="baseRef"
      class="base"
      :class="{ active }"
      @pointerdown.stop.prevent="onPointerDown"
      @pointermove.stop="onPointerMove"
      @pointerup.stop="onPointerUp"
      @pointercancel.stop="onPointerUp"
    >
      <div class="ring" />
      <div class="knob" :style="{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }" />
    </div>
    <span class="label">{{ t('hud.touchLook') }}</span>
  </div>
</template>

<style scoped>
.look-joystick {
  position: absolute;
  left: 1.25rem;
  bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  touch-action: none;
}

.base {
  position: relative;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: rgba(0, 56, 117, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(6px);
  cursor: grab;
}

.base.active {
  border-color: rgba(142, 202, 232, 0.75);
  background: rgba(0, 56, 117, 0.48);
  cursor: grabbing;
}

.ring {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  pointer-events: none;
}

.knob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid var(--brand-blue);
  box-shadow: 0 2px 10px rgba(0, 56, 117, 0.35);
  pointer-events: none;
  will-change: transform;
}

.label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
</style>

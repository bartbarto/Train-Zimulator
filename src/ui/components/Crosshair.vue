<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="crosshair">
    <div class="dot" :class="{ active: label }" />
    <transition name="fade">
      <div v-if="label" class="tooltip">{{ label }} · LMB / A</div>
    </transition>
  </div>
</template>

<style scoped>
.crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  transition: all 0.15s ease;
}
.dot.active {
  width: 14px;
  height: 14px;
  border-color: var(--brand-blue);
  box-shadow: 0 0 10px rgba(0, 90, 171, 0.45);
}
.tooltip {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--divider);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-card);
  color: var(--text);
  backdrop-filter: blur(8px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

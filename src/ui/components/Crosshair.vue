<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="crosshair">
    <div class="dot" :class="{ active: label }" />
    <transition name="fade">
      <div v-if="label" class="tooltip panel mono">{{ label }} · LMB / A</div>
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
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}
.tooltip {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  white-space: nowrap;
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

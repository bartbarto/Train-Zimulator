<script setup lang="ts">
defineProps<{ progress: number }>()
</script>

<template>
  <div class="loading">
    <div class="brand">
      <div class="logo">▮▮▮</div>
      <h1>TRAIN ZIMULATOR</h1>
    </div>
    <div class="bar">
      <div class="fill" :style="{ width: `${Math.round(progress * 100)}%` }" />
    </div>
    <div class="pct mono">{{ Math.round(progress * 100) }}%</div>
    <div class="hint">W / S — power &amp; brake · Space — horn · O — doors · Click controls to interact</div>
  </div>
</template>

<style scoped>
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  background: radial-gradient(circle at 50% 50%, #122950 30%, #ffffff 30.15%);
}
.brand {
  text-align: center;
}
.logo {
  font-size: 2rem;
  letter-spacing: 0.4rem;
  color: var(--accent);
}
h1 {
  font-size: 2.6rem;
  letter-spacing: 0.5rem;
  margin-top: 0.4rem;
}
p {
  color: var(--muted);
  letter-spacing: 0.2rem;
  margin-top: 0.3rem;
}
.bar {
  width: min(420px, 70vw);
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #7cf);
  transition: width 0.2s ease;
}
.pct {
  color: var(--muted);
}
.hint {
  position: absolute;
  bottom: 2rem;
  color: var(--muted);
  font-size: 0.85rem;
}
</style>

<script setup lang="ts">
defineProps<{ progress: number }>()
</script>

<template>
  <div class="loading">
    <div class="brand">
      <div class="logo" aria-hidden="true">
        <img src="/logo_clean.svg" alt="Train Zimulator" />
      </div>
      <h1>Train Zimulator</h1>
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
  gap: 1.25rem;
  background: linear-gradient(160deg, var(--nmbs-blue-tint) 0%, var(--surface-muted) 45%, var(--surface) 100%);
  color: var(--text);
}
.brand {
  text-align: center;
}
.logo {
  width: 100%;
  height: auto;
}
h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 0.85rem;
  line-height: 1.2;
  color: var(--nmbs-blue-dark);
}
.bar {
  width: min(360px, 70vw);
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--divider);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--brand-blue);
  border-radius: var(--radius-pill);
  transition: width 0.2s ease;
}
.pct {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.hint {
  position: absolute;
  bottom: 2rem;
  color: var(--muted);
  font-size: 0.8rem;
  max-width: 90vw;
  text-align: center;
  line-height: 1.5;
}
</style>

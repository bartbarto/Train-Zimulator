<script setup lang="ts">
defineProps<{ progress: number }>()
</script>

<template>
  <div class="loading">
    <div class="brand">
      <div class="logo"><span /><span /><span /></div>
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
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 39px,
      rgba(0, 56, 117, 0.07) 39px,
      rgba(0, 56, 117, 0.07) 40px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 39px,
      rgba(0, 56, 117, 0.07) 39px,
      rgba(0, 56, 117, 0.07) 40px
    ),
    var(--bg-warm);
  color: var(--text);
}
.brand {
  text-align: center;
}
.logo {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.35rem;
}
.logo span {
  display: block;
  width: 1.1rem;
  border: 3px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.logo span:nth-child(1) { height: 2.4rem; background: var(--nmbs-red); }
.logo span:nth-child(2) { height: 1.8rem; background: var(--nmbs-blue-dark); }
.logo span:nth-child(3) { height: 2.2rem; background: var(--nmbs-blue-light); }
h1 {
  font-size: 3.2rem;
  letter-spacing: 0.35rem;
  margin-top: 0.5rem;
  line-height: 1;
}
.bar {
  width: min(420px, 70vw);
  height: 12px;
  border-radius: 0;
  background: var(--bg-warm);
  border: 3px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--nmbs-red);
  transition: width 0.2s ease;
}
.pct {
  font-family: 'Space Mono', monospace;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
}
.hint {
  position: absolute;
  bottom: 2rem;
  font-family: 'Space Mono', monospace;
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  text-transform: none;
}
</style>

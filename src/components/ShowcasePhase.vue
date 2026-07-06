<template>
  <section class="phase-showcase">
    <div class="showcase-core">
      <div class="mini-core"></div>
      <div class="core-rings">
        <div class="core-ring"></div>
        <div class="core-ring"></div>
        <div class="core-ring"></div>
      </div>
    </div>

    <div v-if="!ready" class="showcase-loading">
      <div class="loading-spinner"></div>
      <p>正在集结高人气作品…</p>
    </div>

    <div v-else class="showcase-orbit">
      <div
        v-for="(work, i) in topWorks"
        :key="work.id"
        class="holo-card"
        :class="`genre-${(work.genres?.[0] || 'Sci-Fi').replace(/\s+/g, '-')}`"
        :style="cardStyle(i)"
      >
        <div class="card-glow" :style="glowStyle(work)"></div>
        <div class="card-glitch card-glitch-cyan"></div>
        <div class="card-glitch card-glitch-magenta"></div>
        <div class="card-frame"></div>
        <img :src="work.coverFallback || work.coverImage || (baseUrl + 'images/generated/nebula-bg.jpg')" :alt="work.titleRomaji">
        <div class="card-scanlines"></div>
        <div class="card-shimmer"></div>
        <div class="holo-card-title">{{ work.titleRomaji }}</div>
      </div>
    </div>

    <div class="showcase-hint">旋转展示中 · 点击跳过</div>
    <button class="skip-btn" @click="emit('skip')">
      <span class="skip-text" data-text="跳过">跳过</span>
    </button>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';

const emit = defineEmits(['skip']);
const baseUrl = import.meta.env.BASE_URL;
const ready = ref(false);

const topWorks = computed(() => DataEngine.topWorks(8));
const genres = computed(() => DataEngine.genres.value);

const glowStyle = (work) => {
  const genre = work.genres?.[0] || 'Sci-Fi';
  const color = genres.value[genre]?.color || '#00f3ff';
  return {
    boxShadow: `0 0 28px ${color}66, 0 0 60px ${color}33, inset 0 0 24px ${color}22`
  };
};

const cardStyle = (i) => {
  const count = topWorks.value.length || 1;
  const angle = (i / count) * Math.PI * 2;
  const radius = 260;
  const floatDelay = i * 0.4;
  return {
    transform: `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px) translateY(0)`,
    animationDelay: `${floatDelay}s`
  };
};

onMounted(async () => {
  await DataEngine.load();
  ready.value = true;
  setTimeout(() => emit('skip'), 8000);
});
</script>

<style scoped>
.phase-showcase {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(0, 243, 255, 0.08) 0%, transparent 55%),
    #02040a;
  perspective: 1200px;
  color: #fff;
}

.showcase-core {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
}

.mini-core {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95), rgba(0, 243, 255, 0.65) 35%, rgba(184, 146, 255, 0.35) 70%, transparent);
  box-shadow: 0 0 60px rgba(0, 243, 255, 0.45), 0 0 120px rgba(184, 146, 255, 0.25);
  animation: coreRotate 12s linear infinite, coreBreath 4s ease-in-out infinite;
}

.core-rings {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.core-ring {
  position: absolute;
  top: -60px;
  left: -60px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 1px solid rgba(0, 243, 255, 0.35);
  animation: ringSpin 8s linear infinite;
}

.core-ring:nth-child(2) {
  top: -80px;
  left: -80px;
  width: 160px;
  height: 160px;
  border-color: rgba(184, 146, 255, 0.3);
  animation-duration: 12s;
  animation-direction: reverse;
}

.core-ring:nth-child(3) {
  top: -100px;
  left: -100px;
  width: 200px;
  height: 200px;
  border-color: rgba(255, 42, 109, 0.2);
  animation-duration: 16s;
}

.showcase-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  letter-spacing: 2px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(0, 243, 255, 0.2);
  border-top-color: #00f3ff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.showcase-orbit {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: orbitRotate 24s linear infinite;
}

.holo-card {
  position: absolute;
  width: 150px;
  height: 215px;
  left: -75px;
  top: -107px;
  border-radius: 14px;
  background: rgba(5, 10, 28, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  transform-style: preserve-3d;
  overflow: hidden;
  animation: cardFloat 4s ease-in-out infinite;
  transition: filter 0.2s ease;
}

.holo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.08) 100%);
  pointer-events: none;
  z-index: 3;
}

.card-glow {
  position: absolute;
  inset: -2px;
  border-radius: 16px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.85;
  transition: opacity 0.3s ease;
}

.card-frame {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 16px rgba(0, 243, 255, 0.1);
}

.holo-card img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 70%;
  object-fit: cover;
  opacity: 0.95;
  filter: contrast(1.08) saturate(1.1);
}

.card-scanlines {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.18) 2px,
    rgba(0, 0, 0, 0.18) 4px
  );
  opacity: 0.45;
  mix-blend-mode: multiply;
}

.card-shimmer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.35) 50%, transparent 65%);
  transform: translateX(-120%);
  animation: holoShimmer 4s ease-in-out infinite;
}

.card-glitch {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: glitchFlicker 5s infinite;
}

.card-glitch-cyan {
  background: inherit;
  box-shadow: inset 4px 0 0 rgba(0, 243, 255, 0.45);
  transform: translateX(-3px);
}

.card-glitch-magenta {
  box-shadow: inset -4px 0 0 rgba(255, 42, 109, 0.45);
  transform: translateX(3px);
  animation-delay: 0.1s;
}

.holo-card-title {
  position: relative;
  z-index: 4;
  padding: 10px;
  font-size: 12px;
  text-align: center;
  color: #fff;
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
}

.showcase-hint {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 2px;
  pointer-events: none;
}

.skip-btn {
  position: absolute;
  bottom: 42px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 36px;
  background: rgba(5, 10, 28, 0.6);
  border: 1px solid rgba(0, 243, 255, 0.6);
  color: #00f3ff;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 16px rgba(0, 243, 255, 0.2), inset 0 0 12px rgba(0, 243, 255, 0.08);
  transition: all 0.2s ease;
  overflow: hidden;
}

.skip-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.25), transparent);
  transition: left 0.4s ease;
}

.skip-btn:hover {
  background: rgba(0, 243, 255, 0.12);
  box-shadow: 0 0 28px rgba(0, 243, 255, 0.45), inset 0 0 16px rgba(0, 243, 255, 0.15);
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.8);
}

.skip-btn:hover::before {
  left: 100%;
}

.skip-text {
  position: relative;
  display: inline-block;
}

.skip-text::before,
.skip-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.skip-text::before {
  color: rgba(0, 243, 255, 0.8);
  transform: translateX(-2px);
}

.skip-text::after {
  color: rgba(255, 42, 109, 0.8);
  transform: translateX(2px);
}

.skip-btn:hover .skip-text::before,
.skip-btn:hover .skip-text::after {
  opacity: 0.6;
  animation: textGlitch 0.3s ease infinite;
}

@keyframes coreRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes coreBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes ringSpin {
  from { transform: rotateX(70deg) rotateZ(0deg); }
  to { transform: rotateX(70deg) rotateZ(360deg); }
}

@keyframes orbitRotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-18px); }
}

@keyframes holoShimmer {
  0%, 70% { transform: translateX(-120%); }
  85% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

@keyframes glitchFlicker {
  0%, 90%, 100% { opacity: 0; }
  91% { opacity: 0.4; }
  92% { opacity: 0; }
  93% { opacity: 0.35; transform: translateX(-2px); }
  94% { opacity: 0; }
  95% { opacity: 0.3; transform: translateX(2px); }
  96% { opacity: 0; }
}

@keyframes textGlitch {
  0% { clip-path: inset(40% 0 30% 0); }
  25% { clip-path: inset(10% 0 60% 0); }
  50% { clip-path: inset(70% 0 10% 0); }
  75% { clip-path: inset(20% 0 50% 0); }
  100% { clip-path: inset(50% 0 20% 0); }
}
</style>

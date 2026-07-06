<template>
  <section class="phase-landing" @mousemove="onMouseMove">
    <canvas ref="starfield" class="starfield"></canvas>

    <div
      class="nebula-bg"
      :style="[nebulaStyle, { backgroundImage: `url(${baseUrl}images/generated/nebula-bg.jpg)` }]"
    ></div>
    <div class="vignette"></div>

    <div class="cursor-glow" :style="cursorGlowStyle"></div>

    <div class="entrance-content">
      <div class="brand-en">AI INTERACTIVE ANIME UNIVERSE</div>
      <h1 class="brand-title" data-text="AnimeVerse">AnimeVerse</h1>
      <div class="title-scanline"></div>
      <p class="brand-sub">AI 沉浸式动漫宇宙 · 探索动漫历史、文化演变与作品联系</p>

      <button class="journey-btn" :disabled="isTransitioning" @click="enter">
        <span class="btn-text">开始旅程</span>
        <span class="btn-shine"></span>
        <span class="btn-particles">
          <i v-for="n in 6" :key="n" :style="{ '--i': n }"></i>
        </span>
      </button>
    </div>

    <div class="corner-hud top-left">
      <span class="hud-line"></span>
      <span class="hud-text">SYSTEM ONLINE</span>
    </div>
    <div class="corner-hud top-right">
      <span class="hud-line"></span>
      <span class="hud-text">VER 2.0</span>
    </div>
    <div class="corner-hud bottom-left">
      <span class="hud-line"></span>
      <span class="hud-text">GALAXY READY</span>
    </div>
    <div class="corner-hud bottom-right">
      <span class="hud-line"></span>
      <span class="hud-text">AWAITING INPUT</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['start']);

const baseUrl = import.meta.env.BASE_URL;
const isTransitioning = ref(false);
const parallax = ref({ x: 0, y: 0 });

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const nebulaStyle = computed(() => ({
  transform: `translate(${parallax.value.x * -20}px, ${parallax.value.y * -20}px) scale(1.05)`
}));

const cursorGlowStyle = computed(() => ({
  transform: `translate(${parallax.value.x * 50}%, ${parallax.value.y * 50}%)`
}));

function onMouseMove(e) {
  parallax.value = {
    x: (e.clientX / window.innerWidth - 0.5) * 2,
    y: (e.clientY / window.innerHeight - 0.5) * 2
  };
}

function enter() {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  setTimeout(() => emit('start'), 700);
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.4 + 0.3,
    alpha: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.02 + 0.005,
    depth: Math.random() * 0.6 + 0.4
  }));

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  starResizeHandler = resize;
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      star.alpha += star.speed;
      const opacity = (Math.sin(star.alpha) + 1) / 2 * 0.7 + 0.15;
      const px = star.x + parallax.value.x * 20 * star.depth;
      const py = star.y + parallax.value.y * 20 * star.depth;
      ctx.beginPath();
      ctx.arc(px, py, star.radius * star.depth, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
      ctx.fill();
    }
    starRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(() => {
  initStarfield();
});

onUnmounted(() => {
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
});
</script>

<style scoped>
.phase-landing {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #02040a;
  color: #fff;
  cursor: default;
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.nebula-bg {
  position: absolute;
  inset: -5%;
  z-index: 1;
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.45;
  transition: transform 0.1s ease-out;
  filter: saturate(1.2) contrast(1.1);
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 0%, rgba(2, 4, 10, 0.4) 60%, rgba(2, 4, 10, 0.85) 100%),
    linear-gradient(180deg, rgba(2, 4, 10, 0.3) 0%, transparent 30%, transparent 70%, rgba(2, 4, 10, 0.5) 100%);
}

.cursor-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 600px;
  height: 600px;
  margin: -300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.12) 0%, rgba(124, 77, 255, 0.06) 40%, transparent 70%);
  filter: blur(40px);
  z-index: 3;
  pointer-events: none;
  transition: transform 0.15s ease-out;
}

.entrance-content {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  pointer-events: none;
  padding: 0 20px;
}

.brand-en {
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  animation: fade-in-down 1s ease-out both;
}

.brand-title {
  position: relative;
  font-size: 78px;
  font-weight: 900;
  letter-spacing: 12px;
  margin: 0;
  background: linear-gradient(180deg, #fff 0%, #00f3ff 45%, #b892ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 40px rgba(0, 243, 255, 0.35), 0 0 90px rgba(184, 146, 255, 0.2);
  animation: title-scale 1s ease-out 0.2s both;
}

.brand-title::before,
.brand-title::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #fff 0%, #00f3ff 45%, #b892ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0;
}

.brand-title::before {
  animation: glitch-cyan 3s infinite;
  clip-path: inset(0 0 55% 0);
}

.brand-title::after {
  animation: glitch-magenta 3s infinite;
  clip-path: inset(45% 0 0 0);
}

.title-scanline {
  width: 280px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f3ff, #b892ff, transparent);
  opacity: 0.7;
  filter: blur(1px);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
  animation: scan-pulse 2.5s ease-in-out infinite;
}

.brand-sub {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 3px;
  margin: 0;
  animation: fade-in-up 1s ease-out 0.4s both;
}

.journey-btn {
  position: relative;
  pointer-events: auto;
  padding: 18px 64px;
  border-radius: 999px;
  border: 1px solid rgba(0, 243, 255, 0.5);
  background: linear-gradient(135deg, rgba(0, 243, 255, 0.12), rgba(124, 77, 255, 0.12));
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  overflow: hidden;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.18), inset 0 0 16px rgba(0, 243, 255, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  animation: fade-in-up 1s ease-out 0.6s both;
}

.journey-btn:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.04);
  background: linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(124, 77, 255, 0.22));
  box-shadow: 0 0 50px rgba(0, 243, 255, 0.4), inset 0 0 24px rgba(0, 243, 255, 0.18);
}

.journey-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: shine 3s ease-in-out infinite;
}

.btn-particles i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #00f3ff;
  opacity: 0;
}

.journey-btn:hover .btn-particles i {
  animation: particle-burst 1s ease-out infinite;
  animation-delay: calc(var(--i) * 0.12s);
}

.corner-hud {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(0, 243, 255, 0.45);
  text-transform: uppercase;
  opacity: 0.7;
}

.corner-hud.top-left { top: 5%; left: 5%; }
.corner-hud.top-right { top: 5%; right: 5%; flex-direction: row-reverse; }
.corner-hud.bottom-left { bottom: 5%; left: 5%; }
.corner-hud.bottom-right { bottom: 5%; right: 5%; flex-direction: row-reverse; }

.hud-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, #00f3ff, transparent);
}

.corner-hud.top-right .hud-line,
.corner-hud.bottom-right .hud-line {
  background: linear-gradient(270deg, #00f3ff, transparent);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes title-scale {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes glitch-cyan {
  0%, 90%, 100% { opacity: 0; transform: translate(0); }
  91% { opacity: 0.6; transform: translate(-3px, 1px); }
  92% { opacity: 0; transform: translate(0); }
  93% { opacity: 0.5; transform: translate(2px, -1px); }
  94% { opacity: 0; }
}

@keyframes glitch-magenta {
  0%, 90%, 100% { opacity: 0; transform: translate(0); }
  91% { opacity: 0.6; transform: translate(3px, -1px); }
  92% { opacity: 0; transform: translate(0); }
  93% { opacity: 0.5; transform: translate(-2px, 1px); }
  94% { opacity: 0; }
}

@keyframes scan-pulse {
  0%, 100% { opacity: 0.4; transform: scaleX(0.85); }
  50% { opacity: 1; transform: scaleX(1.05); }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}

@keyframes particle-burst {
  0% { opacity: 1; transform: translate(-50%, -50%) rotate(calc(var(--i) * 60deg)) translateX(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(calc(var(--i) * 60deg)) translateX(60px); }
}

@media (max-width: 768px) {
  .brand-title {
    font-size: 46px;
    letter-spacing: 6px;
  }

  .brand-sub {
    font-size: 13px;
    letter-spacing: 2px;
    padding: 0 30px;
  }

  .journey-btn {
    padding: 15px 48px;
    font-size: 16px;
  }

  .corner-hud {
    font-size: 9px;
    letter-spacing: 1px;
  }

  .hud-line {
    width: 24px;
  }
}
</style>

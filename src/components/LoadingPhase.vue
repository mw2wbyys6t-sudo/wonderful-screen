<template>
  <section class="phase-loading" :class="{ 'is-complete': isComplete }">
    <canvas ref="starfield" class="starfield"></canvas>

    <div v-if="shouldUseVideo && videoLoaded !== false" class="energy-core-wrap">
      <video
        ref="loadingVideo"
        class="energy-core-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/nebula-trailer-frame.jpg'"
        :src="baseUrl + 'images/generated/nebula-trailer-v3-b.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="energy-core-mask"></div>
      <div class="energy-core-ring"></div>
    </div>

    <div class="magic-circle-bg">
      <div
        class="magic-circle-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/magic-circle.jpg)` }"
      ></div>
      <div class="magic-circle-overlay"></div>
    </div>

    <svg class="svg-magic-circle" viewBox="0 0 600 600">
      <defs>
        <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#d4a853" stop-opacity="0.8"/>
          <stop offset="60%" stop-color="#7b2fbe" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#0a0515" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle class="draw-circle outer" cx="300" cy="300" r="270" />
      <circle class="draw-circle mid" cx="300" cy="300" r="220" />
      <circle class="draw-circle inner" cx="300" cy="300" r="170" />
      <polygon class="draw-poly" points="300,30 570,300 300,570 30,300" />
      <polygon class="draw-poly star" points="300,80 360,230 520,230 390,320 430,480 300,400 170,480 210,320 80,230 240,230" />
      <g class="rune-ring">
        <text v-for="(rune, i) in 12" :key="i"
          :transform="`rotate(${i * 30} 300 300) translate(0, -250)`"
          text-anchor="middle"
          class="rune-char"
          :class="{ lit: progress >= i * 8 }"
          x="300" y="300"
        >{{ runeSymbols[i % runeSymbols.length] }}</text>
      </g>
    </svg>

    <div class="summoning-stars">
      <div
        v-for="i in 8"
        :key="i"
        class="summon-star"
        :class="{ lit: progress >= 25 + i * 9, 'fully-lit': progress >= 100 }"
        :style="starStyle(i - 1)"
      >
        <div class="star-glow"></div>
        <div class="star-dot"></div>
      </div>
    </div>

    <svg class="constellation-lines" viewBox="0 0 600 600" :style="constellationOpacity">
      <polyline :points="starPointsPolyline(8, 260)" />
      <polyline :points="starPointsPolyline(8, 200)" />
    </svg>

    <div class="summoning-text">
      <div class="summon-title">{{ tip }}</div>
      <div class="summon-sub">{{ progressText }}</div>
    </div>

    <div class="burst-overlay"></div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['done']);
const baseUrl = import.meta.env.BASE_URL;

const runeSymbols = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'];

const progress = ref(0);
const tip = ref('正在召唤守护星座…');
const progressText = ref('');
const isComplete = ref(false);
const videoLoaded = ref(null);
const loadingVideo = ref(null);

const { shouldUseVideo } = useVideoBackground();

function onVideoLoaded() {
  videoLoaded.value = true;
}

function onVideoError(e) {
  console.warn('[LoadingPhase] 视频加载失败，降级:', e);
  videoLoaded.value = false;
}

const tips = [
  { at: 0, title: '正在召唤守护星座…', sub: 'SUMMONING GUARDIAN CONSTELLATIONS' },
  { at: 35, title: '星辰连线中…', sub: 'STARS ALIGNING' },
  { at: 65, title: '次元能量汇聚…', sub: 'DIMENSIONAL ENERGY CHARGING' },
  { at: 90, title: '门即将开启…', sub: 'THE GATE AWAKENS' },
  { at: 100, title: '次元之门已开启', sub: 'GATE OPENED' }
];

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const constellationOpacity = computed(() => ({
  opacity: progress.value >= 50 ? Math.min((progress.value - 50) / 40, 1) : 0
}));

function starStyle(i) {
  const angle = (i / 8) * 360 - 90;
  return {
    '--angle': `${angle}deg`,
    '--light-delay': `${i * 0.15}s`
  };
}

function starPointsPolyline(count, radius) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const angle = ((i % count) / count) * Math.PI * 2 - Math.PI / 2;
    const x = 300 + Math.cos(angle) * radius;
    const y = 300 + Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

function updateTip() {
  let current = tips[0];
  for (const t of tips) {
    if (progress.value >= t.at) current = t;
  }
  tip.value = current.title;
  progressText.value = current.sub;
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 180 }, () => {
    const shapes = ['diamond', 'hex', 'dot'];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.003,
      drift: (Math.random() - 0.5) * 0.15,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: Math.random() > 0.6
        ? (Math.random() > 0.5 ? '#d4a853' : '#c8e0ff')
        : 'rgba(212,168,83,0.4)',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.01
    };
  });

  function drawDiamond(x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHex(x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * s;
      const py = Math.sin(a) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  starResizeHandler = resize;
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.alpha += p.speed;
      p.rot += p.rotSpeed;
      p.x += p.drift;
      p.y += p.drift * 0.3;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      const opacity = (Math.sin(p.alpha) + 1) / 2 * 0.7 + 0.1;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.8;
      if (p.shape === 'diamond') drawDiamond(p.x, p.y, p.size, p.rot);
      else if (p.shape === 'hex') drawHex(p.x, p.y, p.size, p.rot);
      else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    starRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(async () => {
  initStarfield();
  updateTip();

  await DataEngine.load();
  progress.value = 45;
  updateTip();
  await new Promise(r => setTimeout(r, 500));
  progress.value = 75;
  updateTip();
  await new Promise(r => setTimeout(r, 500));
  progress.value = 100;
  updateTip();

  setTimeout(() => {
    isComplete.value = true;
    setTimeout(() => emit('done'), 900);
  }, 600);
});

onUnmounted(() => {
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
  if (loadingVideo.value) {
    loadingVideo.value.pause?.();
    loadingVideo.value.src = '';
  }
});
</script>

<style scoped>
.phase-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0515 0%, #1a0b2e 50%, #0d0618 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.energy-core-wrap {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(260px, 40vw);
  height: min(260px, 40vw);
  transform: translate(-50%, -50%);
  z-index: 2;
  border-radius: 50%;
  overflow: hidden;
  animation: core-enter 1.5s ease-out 0.5s both;
}

.energy-core-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: hue-rotate(280deg) saturate(0.7) brightness(0.5);
  border-radius: 50%;
}

.energy-core-video.is-loaded {
  opacity: 0.8;
  animation: core-swirl 20s linear infinite;
}

.energy-core-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 30%, rgba(10, 5, 21, 0.6) 70%, rgba(10, 5, 21, 0.95) 100%);
  pointer-events: none;
}

.energy-core-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 83, 0.4);
  box-shadow: 0 0 40px rgba(212, 168, 83, 0.2), inset 0 0 30px rgba(123, 47, 190, 0.3);
  animation: ring-glow 3s ease-in-out infinite;
}

.magic-circle-bg {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(720px, 105vw);
  height: min(720px, 105vw);
  transform: translate(-50%, -50%);
  z-index: 1;
  opacity: 0;
  animation: fade-in 1.5s ease-out forwards;
}

.magic-circle-image {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.25;
  filter: hue-rotate(260deg) saturate(1.4) brightness(1.1) sepia(0.3);
  mix-blend-mode: screen;
  animation: magic-spin 80s linear infinite;
}

.magic-circle-overlay {
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123, 47, 190, 0.12) 0%, rgba(212, 168, 83, 0.06) 40%, transparent 70%);
  filter: blur(30px);
  animation: glow-pulse 5s ease-in-out infinite;
}

.svg-magic-circle {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  overflow: visible;
  animation: svg-spin-reverse 55s linear infinite;
}

.svg-magic-circle .draw-circle,
.svg-magic-circle .draw-poly {
  fill: none;
  stroke: rgba(212, 168, 83, 0.7);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: url(#goldGlow);
  stroke-dasharray: 1800;
  stroke-dashoffset: 1800;
  animation: draw-line 4s ease-out forwards;
}

.svg-magic-circle .draw-circle.mid {
  stroke: rgba(123, 47, 190, 0.6);
  stroke-width: 0.9;
  animation-delay: 0.5s;
}

.svg-magic-circle .draw-circle.inner {
  stroke: rgba(200, 224, 255, 0.5);
  stroke-width: 0.7;
  animation-delay: 1s;
}

.svg-magic-circle .draw-poly {
  stroke: rgba(212, 168, 83, 0.5);
  stroke-width: 0.8;
  animation-delay: 1.5s;
}

.svg-magic-circle .draw-poly.star {
  stroke: rgba(212, 168, 83, 0.6);
  stroke-width: 1;
  animation-delay: 2s;
}

.rune-ring {
  animation: rune-spin 90s linear infinite;
}

.rune-char {
  font-size: 14px;
  fill: rgba(212, 168, 83, 0.25);
  font-family: serif;
  transition: fill 0.6s ease, text-shadow 0.6s ease;
  text-anchor: middle;
  dominant-baseline: middle;
}

.rune-char.lit {
  fill: #d4a853;
  text-shadow: 0 0 8px rgba(212, 168, 83, 0.8);
  filter: drop-shadow(0 0 4px rgba(212, 168, 83, 0.6));
}

.summoning-stars {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}

.summon-star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 24px;
  transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1));
  opacity: 0.2;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.summon-star.lit {
  opacity: 1;
  transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3);
}

.summon-star.fully-lit {
  animation: star-burst 0.8s ease-out forwards;
  animation-delay: var(--light-delay);
}

.star-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, #d4a853 0%, #c8e0ff 30%, transparent 70%);
  opacity: 0;
  filter: blur(6px);
  transition: opacity 0.5s ease;
}

.summon-star.lit .star-glow {
  opacity: 0.7;
  animation: halo-pulse 2.5s ease-in-out infinite;
}

.star-dot {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff8e0 0%, #d4a853 60%, transparent 100%);
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.8);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.summon-star.lit .star-dot {
  opacity: 1;
}

.constellation-lines {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  transition: opacity 1s ease;
}

.constellation-lines polyline {
  fill: none;
  stroke: rgba(212, 168, 83, 0.5);
  stroke-width: 0.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(212, 168, 83, 0.5));
  stroke-dasharray: 300;
  stroke-dashoffset: 0;
  animation: line-draw 2s ease-out forwards, line-shimmer 3s ease-in-out 2s infinite;
}

.summoning-text {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  animation: text-enter 1s ease-out 1.2s both;
}

.summon-title {
  font-size: 16px;
  color: rgba(212, 168, 83, 0.9);
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(212, 168, 83, 0.4);
  margin-bottom: 6px;
}

.summon-sub {
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  color: rgba(200, 224, 255, 0.4);
  letter-spacing: 3px;
}

.burst-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 248, 224, 0.95) 0%, rgba(212, 168, 83, 0.6) 25%, rgba(123, 47, 190, 0.3) 55%, transparent 80%);
  opacity: 0;
  pointer-events: none;
  z-index: 20;
}

.phase-loading.is-complete .burst-overlay {
  animation: burst-out 0.9s ease-out forwards;
}

.phase-loading.is-complete .magic-circle-bg,
.phase-loading.is-complete .svg-magic-circle,
.phase-loading.is-complete .energy-core-wrap,
.phase-loading.is-complete .summoning-stars,
.phase-loading.is-complete .constellation-lines,
.phase-loading.is-complete .summoning-text {
  animation: shrink-in 0.9s ease-in forwards;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes core-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes core-swirl {
  from { transform: scale(1.1) rotate(0deg); }
  to { transform: scale(1.1) rotate(360deg); }
}

@keyframes ring-glow {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 30px rgba(212, 168, 83, 0.15), inset 0 0 20px rgba(123, 47, 190, 0.2); }
  50% { opacity: 1; box-shadow: 0 0 50px rgba(212, 168, 83, 0.35), inset 0 0 35px rgba(123, 47, 190, 0.4); }
}

@keyframes magic-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes svg-spin-reverse {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}

@keyframes rune-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes line-draw {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}

@keyframes halo-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

@keyframes star-burst {
  0% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3); }
  50% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.6); }
  100% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3); }
}

@keyframes line-shimmer {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

@keyframes text-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes burst-out {
  0% { opacity: 0; transform: scale(0.15); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: scale(3); }
}

@keyframes shrink-in {
  to { opacity: 0; transform: scale(0.05); filter: blur(25px); }
}

@media (max-width: 768px) {
  .energy-core-wrap {
    width: min(200px, 50vw);
    height: min(200px, 50vw);
  }
  .svg-magic-circle {
    width: min(420px, 90vw);
    height: min(420px, 90vw);
  }
  .summoning-stars,
  .constellation-lines {
    width: min(420px, 90vw);
    height: min(420px, 90vw);
  }
  .summon-star {
    transform: rotate(var(--angle)) translateX(calc(min(420px, 90vw) / 2 - 24px)) rotate(calc(var(--angle) * -1));
    width: 18px;
    height: 18px;
  }
  .summon-star.lit {
    transform: rotate(var(--angle)) translateX(calc(min(420px, 90vw) / 2 - 24px)) rotate(calc(var(--angle) * -1)) scale(1.2);
  }
  .rune-char { font-size: 10px; }
  .summon-title { font-size: 13px; letter-spacing: 2px; }
  .summon-sub { font-size: 8px; letter-spacing: 2px; }
}
</style>

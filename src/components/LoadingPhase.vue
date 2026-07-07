<template>
  <section class="phase-loading" :class="{ 'is-complete': isComplete }">
    <canvas ref="starfield" class="starfield"></canvas>

    <!-- 魔法阵背景 -->
    <div class="magic-circle-bg">
      <div
        class="magic-circle-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/magic-circle.jpg)` }"
      ></div>
      <div class="magic-circle-overlay"></div>
    </div>

    <!-- SVG 手绘感魔法阵 -->
    <svg class="svg-magic-circle" viewBox="0 0 400 400">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle class="draw-circle outer" cx="200" cy="200" r="180" />
      <circle class="draw-circle mid" cx="200" cy="200" r="140" />
      <circle class="draw-circle inner" cx="200" cy="200" r="100" />
      <polygon class="draw-poly" points="200,20 380,200 200,380 20,200" />
      <polygon class="draw-poly star" points="200,60 240,160 350,160 260,220 290,330 200,270 110,330 140,220 50,160 160,160" />
    </svg>

    <!-- 中央玻璃圆盘 -->
    <div class="glass-disc-wrap">
      <div
        class="glass-disc"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/title-glass-disc.jpg)` }"
      ></div>
      <div class="glass-disc-glow"></div>
      <div class="glass-disc-light"></div>
    </div>

    <!-- 角色守护环 -->
    <div class="guardian-ring">
      <div class="ring-track"></div>
      <div
        v-for="(char, i) in characters"
        :key="char.file"
        class="guardian-node"
        :class="{ lit: progress >= 30 + i * 6 && progress < 100, 'fully-lit': progress >= 100 }"
        :style="nodeStyle(i)"
      >
        <div class="node-halo"></div>
        <div class="node-portal">
          <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" />
        </div>
        <div class="node-label">{{ char.name }}</div>
      </div>
    </div>

    <!-- 星座连线 -->
    <svg class="constellation-lines" viewBox="0 0 100 100" :style="constellationOpacity">
      <polyline points="50,50 80,20 85,70 50,85 20,75 15,30 50,50" />
      <polyline points="50,50 70,45 75,60 55,75 35,65 30,45 50,50" />
    </svg>

    <!-- 加载 HUD -->
    <div class="loading-hud">
      <div class="progress-gem">
        <svg class="progress-ring" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="gem-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff69b4" />
              <stop offset="50%" stop-color="#b026ff" />
              <stop offset="100%" stop-color="#00f3ff" />
            </linearGradient>
          </defs>
          <circle class="progress-bg" cx="60" cy="60" r="54" />
          <circle class="progress-fill" cx="60" cy="60" r="54" />
        </svg>
        <div class="progress-text">{{ progress }}%</div>
      </div>
      <div class="loading-tip">{{ tip }}</div>
    </div>

    <!-- 完成爆发 -->
    <div class="burst-overlay"></div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';

const emit = defineEmits(['done']);
const baseUrl = import.meta.env.BASE_URL;

const characters = [
  { name: '御坂美琴', file: 'misaka-mikoto.jpg', color: '#ffcc00' },
  { name: '夏娜', file: 'shana.jpg', color: '#ff4444' },
  { name: '立华奏', file: 'tachibana-kanade.jpg', color: '#88ddff' },
  { name: '雷姆', file: 'rem.jpg', color: '#66aaff' },
  { name: '薇尔莉特', file: 'violet-evergarden.png', color: '#b892ff' },
  { name: '秋山澪', file: 'akiyama-mio.jpg', color: '#4466aa' },
  { name: '伊蕾娜', file: 'elaina.jpg', color: '#aa88ff' },
  { name: '加藤惠', file: 'kato-megumi.jpg', color: '#ff88bb' }
];

const progress = ref(0);
const tip = ref('正在召唤守护星座…');
const isComplete = ref(false);

const tips = [
  '正在召唤守护星座…',
  '星辰连线中…',
  '次元之门即将开启…',
  '正在校准魔法阵…',
  '守护星座回应中…'
];

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const circumference = 2 * Math.PI * 54;
const strokeOffset = computed(() => circumference * (1 - progress.value / 100));
const constellationOpacity = computed(() => ({
  opacity: progress.value >= 70 ? (progress.value - 70) / 30 : 0
}));

function nodeStyle(i) {
  const angle = (i / characters.length) * 360;
  const char = characters[i];
  return {
    '--angle': `${angle}deg`,
    '--node-color': char.color,
    '--float-delay': `${i * 0.3}s`
  };
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
    radius: Math.random() * 1.6 + 0.3,
    alpha: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.012 + 0.004,
    color: Math.random() > 0.7 ? '#ff69b4' : Math.random() > 0.5 ? '#b026ff' : '#fff5f8'
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
      const opacity = (Math.sin(star.alpha) + 1) / 2 * 0.8 + 0.1;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = opacity;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    starRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(async () => {
  initStarfield();

  const tipInterval = setInterval(() => {
    tip.value = tips[Math.floor(Math.random() * tips.length)];
  }, 1200);

  await DataEngine.load();
  progress.value = 45;
  await new Promise(r => setTimeout(r, 600));
  progress.value = 75;
  await new Promise(r => setTimeout(r, 600));
  progress.value = 100;

  clearInterval(tipInterval);
  tip.value = '次元之门已开启';

  setTimeout(() => {
    isComplete.value = true;
    setTimeout(() => emit('done'), 900);
  }, 500);
});

onUnmounted(() => {
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
});
</script>

<style scoped>
.phase-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #1a0b2e 0%, #0d0618 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  --ring-size: min(420px, 72vw);
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* 魔法阵背景 */
.magic-circle-bg {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(800px, 110vw);
  height: min(800px, 110vw);
  transform: translate(-50%, -50%);
  z-index: 1;
  opacity: 0;
  animation: fade-in 1.2s ease-out forwards;
}

.magic-circle-image {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.35;
  filter: hue-rotate(280deg) saturate(1.8) brightness(1.2);
  mix-blend-mode: screen;
  animation: magic-spin 60s linear infinite;
}

.magic-circle-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(176, 38, 255, 0.15) 0%, rgba(255, 105, 180, 0.08) 40%, transparent 70%);
  filter: blur(20px);
  animation: glow-pulse 4s ease-in-out infinite;
}

/* SVG 魔法阵 */
.svg-magic-circle {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(520px, 78vw);
  height: min(520px, 78vw);
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

.svg-magic-circle .draw-circle,
.svg-magic-circle .draw-poly {
  fill: none;
  stroke: rgba(255, 105, 180, 0.8);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: url(#glow);
  stroke-dasharray: 1200;
  stroke-dashoffset: 1200;
  animation: draw-line 3s ease-out forwards;
}

.svg-magic-circle .draw-circle.mid {
  stroke: rgba(176, 38, 255, 0.7);
  animation-delay: 0.4s;
}

.svg-magic-circle .draw-circle.inner {
  stroke: rgba(0, 243, 255, 0.7);
  animation-delay: 0.8s;
}

.svg-magic-circle .draw-poly {
  stroke: rgba(255, 214, 232, 0.6);
  stroke-width: 1;
  animation-delay: 1.2s;
}

.svg-magic-circle .draw-poly.star {
  stroke: rgba(255, 105, 180, 0.7);
  animation-delay: 1.6s;
}

/* 玻璃圆盘 */
.glass-disc-wrap {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(220px, 38vw);
  height: min(220px, 38vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  animation: disc-enter 1.2s ease-out 0.3s both;
}

.glass-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 60px rgba(255, 105, 180, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.1);
  animation: disc-spin 20s linear infinite, disc-breathe 4s ease-in-out infinite;
}

.glass-disc-glow {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 105, 180, 0.2) 0%, rgba(176, 38, 255, 0.1) 40%, transparent 70%);
  filter: blur(25px);
  animation: glow-pulse 3s ease-in-out infinite;
}

.glass-disc-light {
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.3) 60deg, transparent 120deg);
  animation: light-sweep 4s linear infinite;
}

/* 守护环 */
.guardian-ring {
  position: absolute;
  left: 50%;
  top: 45%;
  width: var(--ring-size);
  height: var(--ring-size);
  transform: translate(-50%, -50%);
  z-index: 4;
  animation: ring-spin 50s linear infinite;
}

.ring-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(255, 105, 180, 0.2);
  box-shadow: 0 0 30px rgba(255, 105, 180, 0.08), inset 0 0 30px rgba(176, 38, 255, 0.05);
}

.guardian-node {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: rotate(var(--angle)) translateX(calc(var(--ring-size) / 2 - 44px)) rotate(calc(var(--angle) * -1));
  opacity: 0.25;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.guardian-node.lit {
  opacity: 1;
  transform: rotate(var(--angle)) translateX(calc(var(--ring-size) / 2 - 44px)) rotate(calc(var(--angle) * -1)) scale(1.15);
}

.guardian-node.fully-lit {
  opacity: 1;
  animation: node-burst 0.8s ease-out forwards;
}

.node-halo {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--node-color) 0%, transparent 70%);
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.4s ease;
}

.guardian-node.lit .node-halo,
.guardian-node.fully-lit .node-halo {
  opacity: 0.6;
  animation: halo-pulse 2s ease-in-out infinite;
}

.node-portal {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 20px rgba(255, 105, 180, 0.2), inset 0 0 14px rgba(0, 0, 0, 0.4);
  animation: node-float 3s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.node-portal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.node-label {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(255, 245, 248, 0.85);
  white-space: nowrap;
  text-shadow: 0 0 8px var(--node-color);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.guardian-node.lit .node-label,
.guardian-node.fully-lit .node-label {
  opacity: 1;
}

/* 星座连线 */
.constellation-lines {
  position: absolute;
  left: 50%;
  top: 45%;
  width: var(--ring-size);
  height: var(--ring-size);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  transition: opacity 0.8s ease;
}

.constellation-lines polyline {
  fill: none;
  stroke: rgba(255, 105, 180, 0.6);
  stroke-width: 0.4;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px rgba(255, 105, 180, 0.6));
  stroke-dasharray: 200;
  stroke-dashoffset: 0;
  animation: line-shimmer 2s ease-in-out infinite;
}

/* 加载 HUD */
.loading-hud {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.progress-gem {
  position: relative;
  width: 100px;
  height: 100px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 6px rgba(255, 105, 180, 0.5));
}

.progress-ring circle {
  fill: none;
  stroke-width: 5;
}

.progress-bg {
  stroke: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  stroke: url(#gem-gradient);
  stroke-linecap: round;
  stroke-dasharray: 339.292;
  stroke-dashoffset: v-bind(strokeOffset);
  transition: stroke-dashoffset 0.3s ease;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 15px;
  color: #fff5f8;
  text-shadow: 0 0 10px rgba(255, 105, 180, 0.6);
}

.loading-tip {
  margin-top: 14px;
  font-size: 13px;
  color: rgba(255, 245, 248, 0.75);
  letter-spacing: 2px;
  min-height: 20px;
  text-align: center;
  animation: tip-flicker 2s ease-in-out infinite;
}

/* 完成爆发 */
.burst-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 105, 180, 0.6) 30%, rgba(176, 38, 255, 0.3) 60%, transparent 80%);
  opacity: 0;
  pointer-events: none;
  z-index: 20;
}

.phase-loading.is-complete .burst-overlay {
  animation: burst-out 0.9s ease-out forwards;
}

.phase-loading.is-complete .magic-circle-bg,
.phase-loading.is-complete .svg-magic-circle,
.phase-loading.is-complete .glass-disc-wrap,
.phase-loading.is-complete .guardian-ring,
.phase-loading.is-complete .constellation-lines,
.phase-loading.is-complete .loading-hud {
  animation: shrink-in 0.9s ease-in forwards;
}


@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes magic-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ring-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes disc-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@keyframes disc-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.96); }
  50% { opacity: 0.9; transform: scale(1.08); }
}

@keyframes light-sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes node-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes halo-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

@keyframes node-burst {
  0% { transform: rotate(var(--angle)) translateX(calc(var(--ring-size) / 2 - 44px)) rotate(calc(var(--angle) * -1)) scale(1.15); }
  50% { transform: rotate(var(--angle)) translateX(calc(var(--ring-size) / 2 - 44px)) rotate(calc(var(--angle) * -1)) scale(1.4); }
  100% { transform: rotate(var(--angle)) translateX(calc(var(--ring-size) / 2 - 44px)) rotate(calc(var(--angle) * -1)) scale(1.2); }
}

@keyframes line-shimmer {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

@keyframes tip-flicker {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

@keyframes burst-out {
  0% { opacity: 0; transform: scale(0.2); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: scale(2.5); }
}

@keyframes shrink-in {
  to { opacity: 0; transform: scale(0.1); filter: blur(20px); }
}

@media (max-width: 768px) {
  .phase-loading {
    --ring-size: min(300px, 82vw);
  }

  .node-portal {
    width: 48px;
    height: 48px;
  }

  .node-label {
    font-size: 9px;
  }

  .glass-disc-wrap {
    width: min(160px, 42vw);
    height: min(160px, 42vw);
  }

  .progress-gem {
    width: 80px;
    height: 80px;
  }

  .progress-text {
    font-size: 13px;
  }

  .loading-tip {
    font-size: 11px;
  }

  .svg-magic-circle {
    width: min(360px, 86vw);
    height: min(360px, 86vw);
  }
}
</style>

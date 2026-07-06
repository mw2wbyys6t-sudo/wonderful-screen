<template>
  <section class="phase-loading">
    <canvas ref="starfield" class="starfield"></canvas>

    <!-- 旋转魔法阵 -->
    <div class="magic-circle-wrap">
      <div
        class="magic-circle-layer"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/magic-circle.jpg)` }"
      ></div>
      <div class="magic-circle-glow"></div>
    </div>

    <!-- 八位女主角头像轨道 -->
    <div class="hero-orbits">
      <div class="orbit-track"></div>
      <div
        v-for="(char, i) in characters"
        :key="char.file"
        class="orbit-node"
        :style="nodeStyle(i)"
      >
        <div class="rotating-portal" :style="{ animationDelay: `${i * 0.4}s` }">
          <div class="portal-glow"></div>
          <div class="portal-ring ring-outer"></div>
          <div class="portal-ring ring-mid"></div>
          <div class="portal-ring ring-inner"></div>
          <div class="portal-core">
            <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载 HUD -->
    <div class="loading-hud">
      <div class="loading-progress">
        <svg class="progress-ring" viewBox="0 0 120 120">
          <circle class="progress-bg" cx="60" cy="60" r="54" />
          <circle class="progress-fill" cx="60" cy="60" r="54" />
        </svg>
        <div class="progress-text">{{ progress }}%</div>
      </div>
      <div class="loading-tip">{{ tip }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useData } from '../composables/useData.js';

const emit = defineEmits(['done']);
const { load } = useData();
const baseUrl = import.meta.env.BASE_URL;

const characters = [
  { name: '御坂美琴', file: 'misaka-mikoto.jpg' },
  { name: '夏娜', file: 'shana.jpg' },
  { name: '立华奏', file: 'tachibana-kanade.jpg' },
  { name: '雷姆', file: 'rem.jpg' },
  { name: '薇尔莉特', file: 'violet-evergarden.png' },
  { name: '秋山澪', file: 'akiyama-mio.jpg' },
  { name: '伊蕾娜', file: 'elaina.jpg' },
  { name: '加藤惠', file: 'kato-megumi.jpg' }
];

const progress = ref(0);
const tip = ref('正在连接星云数据库…');
const tips = [
  '正在连接星云数据库…',
  '正在点亮恒星…',
  '正在绘制星云图谱…',
  '正在校准次元核心…',
  '正在加载全息投影…'
];

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const circumference = 2 * Math.PI * 54;
const strokeOffset = computed(() => circumference * (1 - progress.value / 100));

function nodeStyle(i) {
  const angle = (i / characters.length) * 360;
  return { '--angle': `${angle}deg` };
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.4 + 0.3,
    alpha: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.015 + 0.005
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
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
      ctx.fill();
    }
    starRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(async () => {
  initStarfield();

  const tipInterval = setInterval(() => {
    tip.value = tips[Math.floor(Math.random() * tips.length)];
  }, 1500);

  await load();
  progress.value = 50;
  await new Promise(r => setTimeout(r, 800));
  progress.value = 100;

  clearInterval(tipInterval);
  setTimeout(() => emit('done'), 600);
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
  background: radial-gradient(ellipse at 50% 50%, rgba(124, 77, 255, 0.12) 0%, transparent 55%), #02040a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  --orbit-size: min(420px, 64vw);
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.magic-circle-wrap {
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(720px, 95vw);
  height: min(720px, 95vw);
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
}

.magic-circle-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.28;
  filter: hue-rotate(20deg) saturate(1.4);
  mix-blend-mode: screen;
  animation: magic-spin 50s linear infinite;
}

.magic-circle-glow {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.12) 0%, rgba(124, 77, 255, 0.06) 40%, transparent 70%);
  filter: blur(20px);
  animation: glow-pulse 4s ease-in-out infinite;
}

.hero-orbits {
  position: absolute;
  left: 50%;
  top: 46%;
  width: var(--orbit-size);
  height: var(--orbit-size);
  transform: translate(-50%, -50%);
  z-index: 2;
  animation: orbit-spin 40s linear infinite;
}

.orbit-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(0, 243, 255, 0.18);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.06), inset 0 0 30px rgba(184, 146, 255, 0.04);
}

.orbit-node {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: rotate(var(--angle)) translateX(calc(var(--orbit-size) / 2 - 38px)) rotate(calc(var(--angle) * -1));
}

.rotating-portal {
  position: relative;
  width: 70px;
  height: 70px;
  transform: translate(-50%, -50%);
  animation: portal-float 4s ease-in-out infinite;
}

.portal-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.2), transparent 70%);
  filter: blur(8px);
  animation: glow-pulse 3s ease-in-out infinite;
}

.portal-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.ring-outer {
  inset: -8px;
  border: 2px solid rgba(0, 243, 255, 0.55);
  border-top-color: rgba(0, 243, 255, 0.9);
  border-right-color: rgba(184, 146, 255, 0.4);
  box-shadow: 0 0 16px rgba(0, 243, 255, 0.22), inset 0 0 16px rgba(0, 243, 255, 0.08);
  animation: ring-spin 4s linear infinite;
}

.ring-mid {
  inset: -4px;
  border: 1.5px solid rgba(184, 146, 255, 0.45);
  border-bottom-color: rgba(255, 42, 109, 0.6);
  animation: ring-spin 2.5s linear infinite reverse;
}

.ring-inner {
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  animation: ring-spin 1.8s linear infinite;
}

.portal-core {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.35);
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.5), 0 0 14px rgba(0, 243, 255, 0.2);
}

.portal-core img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading-hud {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.loading-progress {
  position: relative;
  width: 110px;
  height: 110px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring circle {
  fill: none;
  stroke-width: 5;
}

.progress-bg {
  stroke: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  stroke: #00f3ff;
  stroke-linecap: round;
  stroke-dasharray: 339.292;
  stroke-dashoffset: v-bind(strokeOffset);
  transition: stroke-dashoffset 0.3s ease;
  filter: drop-shadow(0 0 4px rgba(0, 243, 255, 0.6));
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 16px;
  color: #fff;
}

.loading-tip {
  margin-top: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 1px;
  min-height: 20px;
  text-align: center;
}

@keyframes magic-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes orbit-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes portal-float {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-10px); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.96); }
  50% { opacity: 0.85; transform: scale(1.06); }
}

@media (max-width: 768px) {
  .phase-loading {
    --orbit-size: min(300px, 76vw);
  }

  .rotating-portal {
    width: 52px;
    height: 52px;
  }

  .loading-progress {
    width: 90px;
    height: 90px;
  }

  .progress-text {
    font-size: 14px;
  }

  .loading-hud {
    bottom: 10%;
  }
}
</style>

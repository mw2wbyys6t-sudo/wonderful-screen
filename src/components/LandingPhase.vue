<template>
  <section class="phase-landing" @mousemove="onMouseMove">
    <!-- 星云背景 -->
    <div class="nebula-bg">
      <div
        class="nebula-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/minimax-nebula-bg.png)` }"
      ></div>
      <div class="nebula-overlay"></div>
    </div>

    <!-- 可选视频背景（带兼容性降级） -->
    <div v-if="shouldUseVideo && videoLoaded !== false" class="video-bg">
      <video
        ref="bgVideo"
        class="bg-video"
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
      <div class="video-overlay"></div>
    </div>

    <!-- 粒子画布 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 光芒入场 -->
    <div class="entrance-glow"></div>

    <!-- 主内容 -->
    <div class="landing-content">
      <div class="brand-en">NEBULA CHRONICLE</div>
      <h1 class="brand-title">
        <span
          v-for="(char, i) in titleChars"
          :key="i"
          class="title-char"
          :style="{ animationDelay: `${0.8 + i * 0.1}s` }"
        >{{ char }}</span>
      </h1>
      <div class="title-line"></div>
      <p class="brand-sub">手势次元 · 守护星座已集结</p>

      <button
        class="portal-btn"
        :disabled="isTransitioning"
        :class="{ transitioning: isTransitioning }"
        @click="enter"
      >
        <span class="btn-core">
          <span class="btn-text">开启次元之门</span>
          <span class="btn-shine"></span>
        </span>
        <span class="btn-sparkles">
          <i v-for="n in 8" :key="n" :style="{ '--i': n }"></i>
        </span>
      </button>
    </div>

    <!-- 中央法阵 -->
    <div class="central-disc">
      <div
        class="disc-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/title-glass-disc.jpg)` }"
      ></div>
      <div class="disc-glow"></div>
      <div class="disc-light"></div>
      <div class="disc-runes">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" />
          <circle cx="100" cy="100" r="70" />
          <polygon points="100,10 190,100 100,190 10,100" />
        </svg>
      </div>
    </div>

    <!-- 守护环 -->
    <div class="guardian-orbit">
      <div class="orbit-glow"></div>
      <div
        v-for="(char, i) in characters"
        :key="char.file"
        class="orbit-node"
        :style="orbitStyle(i)"
        @mouseenter="hoveredNode = i"
        @mouseleave="hoveredNode = null"
      >
        <div class="orbit-aura" :class="{ active: hoveredNode === i }"></div>
        <div class="orbit-portal">
          <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" />
        </div>
        <div class="orbit-name">{{ char.name }}</div>
      </div>
    </div>

    <!-- 四角 HUD -->
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
      <span class="hud-text">GUARDIANS READY</span>
    </div>
    <div class="corner-hud bottom-right">
      <span class="hud-line"></span>
      <span class="hud-text">AWAITING SUMMON</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAudio } from '../composables/useAudio.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['start']);
const baseUrl = import.meta.env.BASE_URL;

const isTransitioning = ref(false);
const hoveredNode = ref(null);
const parallax = ref({ x: 0, y: 0 });
const videoLoaded = ref(null); // null=加载中, true=成功, false=失败
const bgVideo = ref(null);

const { init: initAudio } = useAudio();
const { shouldUseVideo } = useVideoBackground();

let videoObserver = null;

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

const titleChars = computed(() => '星云编年史'.split(''));

function orbitStyle(i) {
  const angle = (i / characters.length) * 360;
  return {
    '--angle': `${angle}deg`,
    '--float-delay': `${i * 0.4}s`
  };
}

function onMouseMove(e) {
  parallax.value = {
    x: (e.clientX / window.innerWidth - 0.5) * 2,
    y: (e.clientY / window.innerHeight - 0.5) * 2
  };
}

function enter() {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  initAudio().catch(() => {});
  setTimeout(() => emit('start'), 900);
}

// 粒子系统
const particleCanvas = ref(null);
let particleRaf = null;
let resizeHandler = null;

function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.5 + 0.5,
    speedY: Math.random() * 0.4 + 0.1,
    speedX: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.6 + 0.2,
    color: Math.random() > 0.6 ? '#ff69b4' : Math.random() > 0.3 ? '#b026ff' : '#fff5f8',
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02
  }));

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resizeHandler = resize;
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.y += p.speedY;
      p.x += p.speedX + parallax.value.x * 0.3;
      p.rotation += p.rotationSpeed;

      if (p.y > height + 10) {
        p.y = -10;
        p.x = Math.random() * width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // 绘制十字星尘
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.2, -p.size * 0.2, p.size, 0);
      ctx.quadraticCurveTo(p.size * 0.2, p.size * 0.2, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.2, p.size * 0.2, -p.size, 0);
      ctx.quadraticCurveTo(-p.size * 0.2, -p.size * 0.2, 0, -p.size);
      ctx.fill();

      ctx.restore();
    }

    particleRaf = requestAnimationFrame(draw);
  }
  draw();
}

function onVideoLoaded() {
  videoLoaded.value = true;
}

function onVideoError(e) {
  console.warn('[LandingPhase] 背景视频加载失败，降级到静态星云:', e);
  videoLoaded.value = false;
}

function setupVideoObserver() {
  if (!bgVideo.value || !('IntersectionObserver' in window)) return;
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = bgVideo.value;
      if (!video) return;
      if (entry.isIntersecting) {
        video.play?.().catch(() => {});
      } else {
        video.pause?.();
      }
    });
  }, { threshold: 0.05 });
  videoObserver.observe(bgVideo.value);
}

onMounted(() => {
  initParticles();
  setupVideoObserver();
});

onUnmounted(() => {
  if (particleRaf) cancelAnimationFrame(particleRaf);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (videoObserver) videoObserver.disconnect();
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
  background: linear-gradient(180deg, #1a0b2e 0%, #0d0618 100%);
  color: #fff5f8;
  cursor: default;
  --orbit-size: min(440px, 76vw);
}

/* 星云背景 */
.nebula-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  animation: bg-breathe 20s ease-in-out infinite;
}

.nebula-image {
  position: absolute;
  inset: -5%;
  background-position: center;
  background-size: cover;
  opacity: 0.45;
  filter: hue-rotate(280deg) saturate(1.4);
}

.nebula-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 0%, rgba(13, 6, 24, 0.6) 50%, rgba(13, 6, 24, 0.95) 100%),
    linear-gradient(180deg, rgba(26, 11, 46, 0.5) 0%, transparent 40%, transparent 60%, rgba(13, 6, 24, 0.8) 100%);
}

/* 视频背景 */
.video-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.2s ease;
  filter: hue-rotate(280deg) saturate(1.5);
}

.bg-video.is-loaded {
  opacity: 0.55;
}

.video-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 0%, rgba(13, 6, 24, 0.5) 55%, rgba(13, 6, 24, 0.92) 100%),
    linear-gradient(180deg, rgba(26, 11, 46, 0.4) 0%, transparent 40%, transparent 60%, rgba(13, 6, 24, 0.7) 100%);
  mix-blend-mode: multiply;
}

/* 粒子画布 */
.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

/* 入场光芒 */
.entrance-glow {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 200vmax;
  height: 200vmax;
  transform: translate(-50%, -50%) scale(0);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 105, 180, 0.4) 20%, rgba(176, 38, 255, 0.2) 40%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  animation: entrance-burst 1.2s ease-out forwards;
}

/* 主内容 */
.landing-content {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
  padding: 0 20px;
  margin-top: -12vh;
}

.brand-en {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  letter-spacing: 10px;
  color: rgba(255, 105, 180, 0.7);
  text-transform: uppercase;
  opacity: 0;
  animation: fade-in-down 0.8s ease-out 0.3s forwards;
}

.brand-title {
  position: relative;
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 16px;
  margin: 0;
  color: #fff5f8;
  text-shadow:
    0 0 30px rgba(255, 105, 180, 0.5),
    0 0 60px rgba(176, 38, 255, 0.3),
    0 0 100px rgba(0, 243, 255, 0.15);
}

.title-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px) scale(0.8);
  animation: char-appear 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.title-line {
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff69b4, #b026ff, #00f3ff, transparent);
  opacity: 0;
  filter: blur(1px);
  box-shadow: 0 0 20px rgba(255, 105, 180, 0.5);
  animation: line-appear 1s ease-out 1.6s forwards;
}

.brand-sub {
  font-size: 15px;
  color: rgba(255, 245, 248, 0.75);
  letter-spacing: 4px;
  margin: 0;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 1.8s forwards;
}

/* 次元之门按钮 */
.portal-btn {
  position: relative;
  pointer-events: auto;
  margin-top: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 2s forwards;
}

.btn-core {
  position: relative;
  display: block;
  padding: 18px 56px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 105, 180, 0.25), rgba(176, 38, 255, 0.25));
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow:
    0 0 30px rgba(255, 105, 180, 0.25),
    inset 0 0 20px rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.portal-btn:hover .btn-core:not(:disabled) {
  transform: translateY(-2px) scale(1.03);
  background: linear-gradient(135deg, rgba(255, 105, 180, 0.4), rgba(176, 38, 255, 0.4));
  box-shadow:
    0 0 50px rgba(255, 105, 180, 0.5),
    inset 0 0 30px rgba(255, 255, 255, 0.15);
}

.portal-btn:disabled .btn-core {
  opacity: 0.7;
  cursor: wait;
}

.btn-text {
  position: relative;
  z-index: 2;
  color: #fff5f8;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
}

.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: shine 3s ease-in-out infinite;
}

.btn-sparkles i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff5f8;
  opacity: 0;
  box-shadow: 0 0 10px #ff69b4;
}

.portal-btn:hover .btn-sparkles i {
  animation: sparkle-burst 1.2s ease-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
}

.portal-btn.transitioning .btn-core {
  animation: btn-summon 0.9s ease-out forwards;
}

/* 中央法阵 */
.central-disc {
  position: absolute;
  left: 50%;
  top: 52%;
  width: min(260px, 44vw);
  height: min(260px, 44vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  opacity: 0;
  animation: disc-fade-in 1s ease-out 0.5s forwards;
}

.disc-image {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 0 80px rgba(255, 105, 180, 0.35),
    inset 0 0 40px rgba(255, 255, 255, 0.1);
  animation: disc-spin 30s linear infinite;
}

.disc-glow {
  position: absolute;
  inset: -25%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 105, 180, 0.2) 0%, rgba(176, 38, 255, 0.1) 40%, transparent 70%);
  filter: blur(30px);
  animation: glow-pulse 4s ease-in-out infinite;
}

.disc-light {
  position: absolute;
  inset: -15%;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.25) 80deg, transparent 160deg);
  animation: light-sweep 5s linear infinite;
}

.disc-runes {
  position: absolute;
  inset: -30%;
  opacity: 0.5;
  animation: rune-spin 40s linear infinite reverse;
}

.disc-runes svg {
  width: 100%;
  height: 100%;
}

.disc-runes circle,
.disc-runes polygon {
  fill: none;
  stroke: rgba(255, 214, 232, 0.4);
  stroke-width: 1;
  stroke-dasharray: 8 4;
}

/* 守护环 */
.guardian-orbit {
  position: absolute;
  left: 50%;
  top: 52%;
  width: var(--orbit-size);
  height: var(--orbit-size);
  transform: translate(-50%, -50%);
  z-index: 5;
  opacity: 0;
  animation: fade-in 1s ease-out 1s forwards;
}

.orbit-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(255, 105, 180, 0.18);
  box-shadow:
    0 0 40px rgba(255, 105, 180, 0.08),
    inset 0 0 40px rgba(176, 38, 255, 0.05);
}

.orbit-node {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: rotate(var(--angle)) translateX(calc(var(--orbit-size) / 2 - 42px)) rotate(calc(var(--angle) * -1));
  cursor: pointer;
  transition: transform 0.3s ease;
}

.orbit-node:hover {
  transform: rotate(var(--angle)) translateX(calc(var(--orbit-size) / 2 - 42px)) rotate(calc(var(--angle) * -1)) scale(1.15);
}

.orbit-aura {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 105, 180, 0.4) 0%, transparent 70%);
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.orbit-aura.active {
  opacity: 1;
  animation: aura-pulse 2s ease-in-out infinite;
}

.orbit-portal {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow:
    0 0 20px rgba(255, 105, 180, 0.25),
    inset 0 0 14px rgba(0, 0, 0, 0.4);
  animation: orbit-float 3s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.orbit-portal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.orbit-name {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgba(255, 245, 248, 0.8);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  text-shadow: 0 0 8px rgba(255, 105, 180, 0.6);
}

.orbit-node:hover .orbit-name {
  opacity: 1;
}

/* 四角 HUD */
.corner-hud {
  position: absolute;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(255, 105, 180, 0.4);
  text-transform: uppercase;
  opacity: 0;
  animation: fade-in 1s ease-out 2.2s forwards;
}

.corner-hud.top-left { top: 5%; left: 5%; }
.corner-hud.top-right { top: 5%; right: 5%; flex-direction: row-reverse; }
.corner-hud.bottom-left { bottom: 5%; left: 5%; }
.corner-hud.bottom-right { bottom: 5%; right: 5%; flex-direction: row-reverse; }

.hud-line {
  width: 36px;
  height: 1px;
  background: linear-gradient(90deg, #ff69b4, transparent);
}

.corner-hud.top-right .hud-line,
.corner-hud.bottom-right .hud-line {
  background: linear-gradient(270deg, #ff69b4, transparent);
}

/* 动画定义 */
@keyframes bg-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes entrance-burst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes char-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(8px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes line-appear {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 0.8; transform: scaleX(1); }
}

@keyframes disc-fade-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rune-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.96); }
  50% { opacity: 0.9; transform: scale(1.08); }
}

@keyframes light-sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes orbit-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes aura-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}

@keyframes sparkle-burst {
  0% { opacity: 1; transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translateX(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translateX(70px); }
}

@keyframes btn-summon {
  0% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.1); filter: brightness(1.5); box-shadow: 0 0 80px rgba(255, 105, 180, 0.8); }
  100% { transform: scale(0); opacity: 0; filter: brightness(2); }
}

@media (max-width: 768px) {
  .phase-landing {
    --orbit-size: min(300px, 84vw);
  }

  .brand-title {
    font-size: 42px;
    letter-spacing: 8px;
  }

  .brand-sub {
    font-size: 12px;
    letter-spacing: 2px;
  }

  .btn-core {
    padding: 14px 40px;
  }

  .btn-text {
    font-size: 15px;
  }

  .central-disc {
    width: min(180px, 48vw);
    height: min(180px, 48vw);
  }

  .orbit-portal {
    width: 46px;
    height: 46px;
  }

  .orbit-name {
    font-size: 9px;
  }

  .corner-hud {
    font-size: 8px;
    letter-spacing: 1px;
  }

  .hud-line {
    width: 20px;
  }
}
</style>

<template>
  <section class="phase-landing" @mousemove="onMouseMove">
    <div class="distant-nebula">
      <div
        class="nebula-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/minimax-nebula-bg.png)` }"
      ></div>
      <div class="nebula-veil"></div>
    </div>

    <div v-if="shouldUseVideo && videoLoaded !== false" class="gate-video-wrap">
      <video
        ref="bgVideo"
        class="gate-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/nebula-trailer-frame.jpg'"
        :src="baseUrl + 'images/generated/nebula-trailer-v3-a.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="gate-video-mask"></div>
    </div>

    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <div class="entrance-glow"></div>

    <div class="gate-scene">
      <div class="gate-arch">
        <div class="arch-frame">
          <svg class="arch-svg" viewBox="0 0 400 560" preserveAspectRatio="none">
            <defs>
              <linearGradient id="archGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff69b4"/>
                <stop offset="50%" stop-color="#d4a853"/>
                <stop offset="100%" stop-color="#b892ff"/>
              </linearGradient>
              <filter id="archGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path class="arch-path" d="M60,540 L60,200 Q60,60 200,60 Q340,60 340,200 L340,540" fill="none" stroke="url(#archGrad)" stroke-width="3" filter="url(#archGlow)"/>
            <path class="arch-path inner" d="M80,540 L80,210 Q80,90 200,90 Q320,90 320,210 L320,540" fill="none" stroke="url(#archGrad)" stroke-width="1.5" opacity="0.6"/>
            <path class="arch-deco top" d="M140,100 Q200,40 260,100" fill="none" stroke="#d4a853" stroke-width="1" opacity="0.7"/>
            <circle cx="200" cy="75" r="8" fill="#d4a853" opacity="0.8" filter="url(#archGlow)"/>
            <circle cx="75" cy="220" r="4" fill="#ff69b4" opacity="0.7"/>
            <circle cx="325" cy="220" r="4" fill="#ff69b4" opacity="0.7"/>
            <circle cx="90" cy="380" r="4" fill="#b892ff" opacity="0.7"/>
            <circle cx="310" cy="380" r="4" fill="#b892ff" opacity="0.7"/>
            <path class="arch-deco runes" d="M70,530 L330,530" stroke="#d4a853" stroke-width="1" opacity="0.5" stroke-dasharray="8 6"/>
          </svg>
        </div>

        <div class="gate-inner">
          <div
            v-if="causticLoaded"
            class="gate-caustic"
            :style="{ backgroundImage: `url(${baseUrl}images/generated/glass-caustic.jpg)` }"
          ></div>
          <div class="gate-energy-ring"></div>
          <div class="gate-energy-ring delay1"></div>

          <div class="gate-crystal-wrap">
            <div
              class="gate-crystal"
              :style="{ backgroundImage: `url(${baseUrl}images/generated/title-glass-disc.jpg)` }"
            ></div>
            <div class="crystal-glow"></div>
            <div class="crystal-rays"></div>
          </div>
        </div>
      </div>

      <div class="gate-title-area">
        <div class="title-ornament"
          :style="{ backgroundImage: `url(${baseUrl}images/generated/title-ornament.png)` }"
        ></div>
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
        <p class="brand-sub">8位守护者已集结 · 次元航路已开通</p>
      </div>

      <div class="guardians-left">
        <div
          v-for="(char, i) in leftGuardians"
          :key="char.file"
          class="guardian-col-node"
          :style="colNodeStyle(i, 'left')"
          @mouseenter="hoveredNode = `l${i}`"
          @mouseleave="hoveredNode = null"
        >
          <div class="g-rune" :class="{ active: hoveredNode === `l${i}` }"></div>
          <div class="g-aura" :class="{ active: hoveredNode === `l${i}` }"></div>
          <div class="g-portal">
            <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" />
          </div>
          <div class="g-name">{{ char.name }}</div>
        </div>
      </div>

      <div class="guardians-right">
        <div
          v-for="(char, i) in rightGuardians"
          :key="char.file"
          class="guardian-col-node"
          :style="colNodeStyle(i, 'right')"
          @mouseenter="hoveredNode = `r${i}`"
          @mouseleave="hoveredNode = null"
        >
          <div class="g-rune" :class="{ active: hoveredNode === `r${i}` }"></div>
          <div class="g-aura" :class="{ active: hoveredNode === `r${i}` }"></div>
          <div class="g-portal">
            <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" />
          </div>
          <div class="g-name">{{ char.name }}</div>
        </div>
      </div>

      <button
        class="enter-btn"
        :disabled="isTransitioning"
        :class="{ transitioning: isTransitioning }"
        @click="enter"
      >
        <span class="enter-core">
          <span class="enter-text">开启次元之门</span>
          <span class="enter-shine"></span>
        </span>
        <span class="enter-sparkles">
          <i v-for="n in 10" :key="n" :style="{ '--i': n }"></i>
        </span>
      </button>
    </div>

    <div class="corner-hud top-left">
      <span class="hud-line"></span>
      <span class="hud-text">次元坐标：已锁定</span>
    </div>
    <div class="corner-hud top-right">
      <span class="hud-text">守护者：8/8 集结完毕</span>
      <span class="hud-line"></span>
    </div>
    <div class="corner-hud bottom-left">
      <span class="hud-line v"></span>
      <span class="hud-text">次元能量：满溢</span>
    </div>
    <div class="corner-hud bottom-right">
      <span class="hud-text">等待召唤师指令</span>
      <span class="hud-line v"></span>
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
const videoLoaded = ref(null);
const bgVideo = ref(null);
const causticLoaded = ref(true);

const { init: initAudio } = useAudio();
const { shouldUseVideo } = useVideoBackground();

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

const leftGuardians = computed(() => characters.slice(0, 4));
const rightGuardians = computed(() => characters.slice(4, 8));
const titleChars = computed(() => '星云编年史'.split(''));

function colNodeStyle(i, side) {
  return {
    '--float-delay': `${i * 0.25}s`,
    '--side': side === 'left' ? '1' : '-1'
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

const particleCanvas = ref(null);
let particleRaf = null;
let resizeHandler = null;

function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 100 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.4,
    speedY: Math.random() * -0.3 - 0.1,
    speedX: (Math.random() - 0.5) * 0.2,
    alpha: Math.random() * 0.5 + 0.15,
    color: Math.random() > 0.7
      ? (Math.random() > 0.5 ? '#d4a853' : '#c8e0ff')
      : 'rgba(255,105,180,0.4)',
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
      p.x += p.speedX + parallax.value.x * 0.2;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.002 + p.x));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    particleRaf = requestAnimationFrame(draw);
  }
  draw();
}

function onVideoLoaded() { videoLoaded.value = true; }
function onVideoError(e) {
  console.warn('[LandingPhase] 视频加载失败:', e);
  videoLoaded.value = false;
}

let videoObserver = null;
function setupVideoObserver() {
  if (!bgVideo.value || !('IntersectionObserver' in window)) return;
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = bgVideo.value;
      if (!video) return;
      if (entry.isIntersecting) video.play?.().catch(() => {});
      else video.pause?.();
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
  background: linear-gradient(180deg, #0d0618 0%, #130820 50%, #0a0515 100%);
  color: #fff;
  cursor: default;
}

.distant-nebula {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.nebula-image {
  position: absolute;
  inset: -10%;
  background-position: center;
  background-size: cover;
  opacity: 0.3;
  filter: blur(8px) brightness(0.5) saturate(0.8);
  animation: nebula-drift 30s ease-in-out infinite;
}

.nebula-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 55%, transparent 0%, rgba(13,6,24,0.4) 45%, rgba(13,6,24,0.92) 80%),
    linear-gradient(180deg, rgba(13,6,24,0.6) 0%, transparent 25%, transparent 50%, rgba(13,6,24,0.6) 100%);
}

.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.gate-video-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(340px, 52vw);
  height: min(460px, 70vh);
  transform: translate(-50%, -45%);
  z-index: 2;
  border-radius: 50% 50% 10px 10px / 60% 60% 5px 5px;
  overflow: hidden;
  opacity: 0;
  animation: gate-fade-in 1.2s ease-out 0.3s forwards;
}

.gate-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: saturate(1.2) brightness(0.7);
}

.gate-video.is-loaded {
  opacity: 0.85;
}

.gate-video-mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 40%, rgba(13,6,24,0.5) 75%, rgba(13,6,24,0.95) 100%);
  pointer-events: none;
}

.entrance-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150vmax;
  height: 150vmax;
  transform: translate(-50%, -50%) scale(0);
  background: radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,105,180,0.3) 20%, rgba(184,146,255,0.15) 40%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  animation: entrance-burst 1.2s ease-out forwards;
}

.gate-scene {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.gate-arch {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -45%);
  width: min(400px, 62vw);
  height: min(560px, 82vh);
  pointer-events: none;
  opacity: 0;
  animation: gate-fade-in 1.5s ease-out 0.2s forwards;
}

.arch-frame {
  position: absolute;
  inset: 0;
  z-index: 5;
}

.arch-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 20px rgba(255,105,180,0.4)) drop-shadow(0 0 40px rgba(212,168,83,0.2));
}

.arch-path {
  stroke-dasharray: 1600;
  stroke-dashoffset: 1600;
  animation: arch-draw 2s ease-out 0.5s forwards;
}

.arch-path.inner {
  stroke-dasharray: 1400;
  stroke-dashoffset: 1400;
  animation-delay: 0.8s;
}

.gate-inner {
  position: absolute;
  left: 50%;
  top: 15%;
  transform: translateX(-50%);
  width: 75%;
  height: 72%;
  border-radius: 50% 50% 5% 5% / 40% 40% 2% 2%;
  overflow: hidden;
  z-index: 3;
}

.gate-caustic {
  position: absolute;
  inset: -20%;
  background-position: center;
  background-size: cover;
  opacity: 0.25;
  mix-blend-mode: screen;
  animation: caustic-shift 8s ease-in-out infinite;
}

.gate-energy-ring {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  border: 1px solid rgba(255,105,180,0.3);
  animation: ring-expand 3s ease-out infinite;
}

.gate-energy-ring.delay1 {
  animation-delay: 1s;
  border-color: rgba(184,146,255,0.25);
}

.gate-crystal-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(110px, 18vw);
  height: min(110px, 18vw);
  z-index: 6;
}

.gate-crystal {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  border: 2px solid rgba(212,168,83,0.6);
  box-shadow:
    0 0 40px rgba(255,105,180,0.5),
    0 0 80px rgba(184,146,255,0.3),
    inset 0 0 30px rgba(255,255,255,0.1);
  animation: crystal-breathe 3s ease-in-out infinite, crystal-spin 20s linear infinite;
}

.crystal-glow {
  position: absolute;
  inset: -40%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,105,180,0.25) 0%, rgba(184,146,255,0.15) 40%, transparent 70%);
  filter: blur(25px);
  animation: crystal-glow-pulse 3s ease-in-out infinite;
}

.crystal-rays {
  position: absolute;
  inset: -60%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg, rgba(255,255,255,0.08) 5deg, transparent 15deg,
    transparent 90deg, rgba(212,168,83,0.06) 95deg, transparent 105deg,
    transparent 180deg, rgba(255,105,180,0.08) 185deg, transparent 195deg,
    transparent 270deg, rgba(0,243,255,0.05) 275deg, transparent 285deg
  );
  animation: rays-rotate 12s linear infinite;
  opacity: 0.6;
}

.gate-title-area {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
  z-index: 12;
}

.title-ornament {
  width: 120px;
  height: 16px;
  margin: 0 auto 8px;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0;
  filter: drop-shadow(0 0 8px rgba(212,168,83,0.5));
  animation: fade-in-down 0.8s ease-out 0.3s forwards;
}

.brand-en {
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  letter-spacing: 8px;
  color: rgba(212,168,83,0.7);
  text-transform: uppercase;
  opacity: 0;
  animation: fade-in-down 0.8s ease-out 0.4s forwards;
}

.brand-title {
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 900;
  letter-spacing: clamp(6px, 1.5vw, 14px);
  margin: 4px 0;
  color: #fff;
  text-shadow:
    0 0 30px rgba(255,105,180,0.5),
    0 0 60px rgba(184,146,255,0.3),
    0 0 100px rgba(212,168,83,0.15);
  background: linear-gradient(180deg, #fff 0%, #ffe0f0 50%, #d4a853 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px) scale(0.8);
  animation: char-appear 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
}

.title-line {
  width: 180px;
  height: 1px;
  margin: 8px auto;
  background: linear-gradient(90deg, transparent, #d4a853, #ff69b4, #b892ff, transparent);
  opacity: 0;
  filter: blur(0.5px);
  box-shadow: 0 0 15px rgba(212,168,83,0.4);
  animation: line-appear 1s ease-out 1.5s forwards;
}

.brand-sub {
  font-size: 13px;
  color: rgba(255,224,240,0.6);
  letter-spacing: 3px;
  margin: 0;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 1.7s forwards;
}

.guardians-left,
.guardians-right {
  position: absolute;
  top: 50%;
  transform: translateY(-45%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 11;
  pointer-events: auto;
  opacity: 0;
  animation: guardians-in 1s ease-out 0.6s forwards;
}

.guardians-left {
  left: max(4%, 20px);
  align-items: flex-end;
}

.guardians-right {
  right: max(4%, 20px);
  align-items: flex-start;
}

.guardian-col-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease;
  animation: col-float 4s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.guardian-col-node:hover {
  transform: translateX(calc(var(--side) * 6px)) scale(1.1);
}

.g-rune {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(212,168,83,0.25);
  opacity: 0.4;
  transition: all 0.3s ease;
}

.g-rune::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px solid rgba(184,146,255,0.2);
}

.g-rune.active {
  opacity: 1;
  border-color: rgba(212,168,83,0.7);
  box-shadow: 0 0 12px rgba(212,168,83,0.4);
  animation: rune-pulse 2s ease-in-out infinite;
}

.g-aura {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,105,180,0.4) 0%, transparent 70%);
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.g-aura.active {
  opacity: 1;
  animation: aura-pulse 2s ease-in-out infinite;
}

.g-portal {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.3);
  box-shadow:
    0 0 15px rgba(255,105,180,0.2),
    inset 0 0 10px rgba(0,0,0,0.4);
}

.g-portal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1);
}

.g-name {
  position: absolute;
  top: calc(100% + 14px);
  font-size: 10px;
  color: rgba(255,224,240,0.7);
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(255,105,180,0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  letter-spacing: 1px;
}

.guardian-col-node:hover .g-name {
  opacity: 1;
}

.enter-btn {
  position: absolute;
  left: 50%;
  bottom: 10%;
  transform: translateX(-50%);
  pointer-events: auto;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 2s forwards;
  z-index: 15;
}

.enter-core {
  position: relative;
  display: block;
  padding: 16px 52px;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(255,105,180,0.2), rgba(184,146,255,0.2));
  border: 1px solid rgba(212,168,83,0.5);
  box-shadow:
    0 0 30px rgba(255,105,180,0.25),
    inset 0 0 20px rgba(255,255,255,0.06),
    0 0 60px rgba(212,168,83,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.enter-btn:hover .enter-core:not(:disabled) {
  transform: translateY(-2px) scale(1.03);
  background: linear-gradient(135deg, rgba(255,105,180,0.35), rgba(184,146,255,0.35));
  border-color: rgba(212,168,83,0.8);
  box-shadow:
    0 0 50px rgba(255,105,180,0.5),
    inset 0 0 25px rgba(255,255,255,0.12),
    0 0 80px rgba(212,168,83,0.2);
}

.enter-btn:disabled .enter-core { opacity: 0.7; cursor: wait; }

.enter-text {
  position: relative;
  z-index: 2;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 5px;
  text-shadow: 0 0 12px rgba(255,105,180,0.6);
}

.enter-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%);
  transform: translateX(-100%);
  animation: shine 3s ease-in-out infinite;
}

.enter-sparkles i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  box-shadow: 0 0 8px #d4a853;
}

.enter-btn:hover .enter-sparkles i {
  animation: sparkle-burst 1.2s ease-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
}

.enter-btn.transitioning .enter-core {
  animation: btn-warp 0.9s ease-out forwards;
}

.corner-hud {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(212,168,83,0.5);
  text-transform: uppercase;
  opacity: 0;
  animation: fade-in 1s ease-out 2.3s forwards;
}

.corner-hud.top-left { top: 4%; left: 4%; }
.corner-hud.top-right { top: 4%; right: 4%; flex-direction: row-reverse; }
.corner-hud.bottom-left { bottom: 4%; left: 4%; align-items: flex-end; }
.corner-hud.bottom-right { bottom: 4%; right: 4%; flex-direction: row-reverse; align-items: flex-end; }

.hud-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, #d4a853, transparent);
}

.corner-hud.top-right .hud-line { background: linear-gradient(270deg, #d4a853, transparent); }
.corner-hud.bottom-right .hud-line { background: linear-gradient(270deg, #d4a853, transparent); }

.hud-line.v {
  width: 1px;
  height: 30px;
  background: linear-gradient(180deg, #d4a853, transparent);
}

.corner-hud.bottom-right .hud-line.v { background: linear-gradient(0deg, #d4a853, transparent); }
.corner-hud.bottom-left .hud-line.v { background: linear-gradient(180deg, #d4a853, transparent); }

@keyframes nebula-drift {
  0%, 100% { transform: scale(1) translate(0,0); }
  50% { transform: scale(1.08) translate(-2%, 1%); }
}

@keyframes entrance-burst {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(0); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.5); }
}

@keyframes gate-fade-in {
  from { opacity: 0; transform: translate(-50%,-45%) scale(0.8); }
  to { opacity: 1; transform: translate(-50%,-45%) scale(1); }
}

@keyframes arch-draw { to { stroke-dashoffset: 0; } }

@keyframes caustic-shift {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; }
  50% { transform: scale(1.1) rotate(5deg); opacity: 0.35; }
}

@keyframes ring-expand {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes crystal-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@keyframes crystal-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes crystal-glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.95); }
  50% { opacity: 0.9; transform: scale(1.15); }
}

@keyframes rays-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
@keyframes fade-in-down { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }

@keyframes char-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(8px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes line-appear {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 0.8; transform: scaleX(1); }
}

@keyframes guardians-in {
  from { opacity: 0; transform: translateY(-45%) translateX(calc(var(--side,1)*-20px)); }
  to { opacity: 1; transform: translateY(-45%) translateX(0); }
}

.guardians-left { --side: 1; }
.guardians-right { --side: -1; }

@keyframes col-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes rune-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.15); }
}

@keyframes aura-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}

@keyframes sparkle-burst {
  0% { opacity: 1; transform: translate(-50%,-50%) rotate(calc(var(--i)*36deg)) translateX(0); }
  100% { opacity: 0; transform: translate(-50%,-50%) rotate(calc(var(--i)*36deg)) translateX(60px); }
}

@keyframes btn-warp {
  0% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.15); filter: brightness(1.8); box-shadow: 0 0 100px rgba(255,255,255,0.8); }
  100% { transform: scale(3); opacity: 0; filter: brightness(3); }
}

@media (max-width: 768px) {
  .guardians-left { left: 8px; gap: 10px; }
  .guardians-right { right: 8px; gap: 10px; }
  .g-portal { width: 38px; height: 38px; }
  .g-rune { width: 30px; height: 30px; top: calc(100% + 4px); }
  .g-name { font-size: 8px; top: calc(100% + 10px); }
  .gate-arch { width: min(320px, 80vw); height: min(480px, 75vh); }
  .gate-crystal-wrap { width: min(80px, 20vw); height: min(80px, 20vw); }
  .enter-core { padding: 12px 36px; }
  .enter-text { font-size: 13px; letter-spacing: 3px; }
  .corner-hud { font-size: 8px; letter-spacing: 1px; }
  .hud-line { width: 20px; }
  .brand-sub { font-size: 11px; letter-spacing: 2px; }
}
</style>

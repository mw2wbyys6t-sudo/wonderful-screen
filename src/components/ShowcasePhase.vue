<template>
  <section class="phase-showcase">
    <canvas ref="gridCanvas" class="hologrid-canvas"></canvas>

    <div v-if="shouldUseVideo && videoLoaded !== false" class="data-stream-bg">
      <video
        ref="dataVideo"
        class="data-stream-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/nebula-trailer-frame.jpg'"
        :src="baseUrl + 'images/generated/nebula-trailer-v3-c.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="data-stream-overlay"></div>
    </div>

    <div class="showcase-core">
      <div class="core-energy">
        <div class="core-inner"></div>
        <div class="core-pulse"></div>
      </div>
      <div class="core-rings">
        <div class="core-ring"></div>
        <div class="core-ring"></div>
        <div class="core-ring"></div>
      </div>
      <div class="core-label">CHRONICLE CORE</div>
    </div>

    <div v-if="!ready" class="showcase-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">ARCHIVING DATA...</p>
      <p class="loading-sub">正在集结历代高人气作品</p>
    </div>

    <div v-else class="showcase-orbit">
      <div
        v-for="(work, i) in topWorks"
        :key="work.id"
        class="holo-card-wrapper"
        :class="`genre-${(work.genres?.[0] || 'Sci-Fi').replace(/\s+/g, '-')}`"
        :style="wrapperStyle(i)"
      >
        <div class="holo-card" :style="cardFloatStyle(i)">
          <div class="card-corners">
            <span class="corner tl"></span><span class="corner tr"></span>
            <span class="corner bl"></span><span class="corner br"></span>
          </div>
          <div class="card-glow" :style="glowStyle(work)"></div>
          <div class="card-glitch card-glitch-cyan"></div>
          <div class="card-glitch card-glitch-magenta"></div>
          <div class="card-frame"></div>
          <img :src="work.coverFallback || work.coverImage || (baseUrl + 'images/generated/nebula-bg.jpg')" :alt="work.titleRomaji">
          <div class="card-scanlines"></div>
          <div class="card-shimmer"></div>
          <div class="card-data-bar">
            <span class="data-dot"></span>
            <span class="data-text">ID:{{ String(work.id).slice(-4) }}</span>
          </div>
          <div class="holo-card-title">{{ work.titleRomaji }}</div>
          <div class="holo-card-meta">
            <span>{{ work.year }}</span>
            <span class="divider">|</span>
            <span>{{ work.score ? work.score.toFixed(1) : '—' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="showcase-hud-top">
      <div class="hud-corner tl">
        <div class="hud-line"></div>
        <div class="hud-text">NEBULA CHRONICLES</div>
      </div>
      <div class="hud-corner tr">
        <div class="hud-text">HALL OF LEGENDS</div>
        <div class="hud-line"></div>
      </div>
    </div>

    <div class="showcase-hud-bottom">
      <div class="hud-corner bl">
        <div class="hud-line v"></div>
        <div class="hud-text">SIGNAL: STABLE</div>
      </div>
      <div class="hud-corner br">
        <div class="hud-text">SCANNING ARCHIVE...</div>
        <div class="hud-line v"></div>
      </div>
    </div>

    <div class="showcase-hint">
      <span class="hint-bracket">[</span>
      ROTATING DISPLAY · CLICK TO SKIP
      <span class="hint-bracket">]</span>
    </div>
    <button class="skip-btn" @click="emit('skip')">
      <span class="skip-text" data-text="进入大门">进入大门</span>
    </button>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['skip']);
const baseUrl = import.meta.env.BASE_URL;
const ready = ref(false);
const videoLoaded = ref(null);
const dataVideo = ref(null);
const gridCanvas = ref(null);
const { shouldUseVideo } = useVideoBackground();

let gridRafId = null;
let gridResizeHandler = null;

const topWorks = computed(() => DataEngine.topWorks(8));
const genres = computed(() => DataEngine.genres.value);

function onVideoLoaded() {
  videoLoaded.value = true;
}

function onVideoError(e) {
  console.warn('[ShowcasePhase] 视频加载失败:', e);
  videoLoaded.value = false;
}

const glowStyle = (work) => {
  const genre = work.genres?.[0] || 'Sci-Fi';
  const color = genres.value.genres?.[genre]?.color || genres.value[genre]?.color || '#00f3ff';
  return {
    boxShadow: `0 0 24px ${color}55, 0 0 50px ${color}22, inset 0 0 20px ${color}18`
  };
};

const wrapperStyle = (i) => {
  const count = topWorks.value.length || 1;
  const angle = (i / count) * Math.PI * 2;
  const radius = 280;
  return {
    transform: `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px)`,
  };
};

const cardFloatStyle = (i) => {
  return { animationDelay: `${i * 0.35}s` };
};

function initGrid() {
  const canvas = gridCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  let t = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  gridResizeHandler = resize;
  window.addEventListener('resize', resize);

  function draw() {
    t += 0.008;
    ctx.clearRect(0, 0, w, h);
    const horizonY = h * 0.65;
    const vanishX = w / 2;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;

    // 横线（透视向远处汇聚）
    for (let i = 0; i < 20; i++) {
      const p = i / 20;
      const y = horizonY + Math.pow(p, 2) * (h - horizonY) * 1.2;
      if (y > h) continue;
      const spread = (y - horizonY) / (h - horizonY);
      const leftX = vanishX - spread * w * 0.8;
      const rightX = vanishX + spread * w * 0.8;
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    }

    // 竖线（汇聚到消失点）
    for (let i = -10; i <= 10; i++) {
      const spread = 1;
      const bottomX = vanishX + i * (w / 18);
      ctx.beginPath();
      ctx.moveTo(vanishX, horizonY);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // 移动的数据光点
    ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
    for (let i = 0; i < 30; i++) {
      const seed = i * 137.5;
      const lane = ((seed % 20) - 10) / 10;
      const speed = 0.3 + (i % 5) * 0.15;
      const progress = ((t * speed + seed * 0.01) % 1);
      const p = Math.pow(progress, 2);
      const y = horizonY + p * (h - horizonY);
      const spread = p;
      const x = vanishX + lane * spread * w * 0.8;
      const size = 1 + p * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    gridRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(async () => {
  initGrid();
  await DataEngine.load();
  ready.value = true;
  setTimeout(() => emit('skip'), 15000);
});

onUnmounted(() => {
  if (gridRafId) cancelAnimationFrame(gridRafId);
  if (gridResizeHandler) window.removeEventListener('resize', gridResizeHandler);
  if (dataVideo.value) {
    dataVideo.value.pause?.();
    dataVideo.value.src = '';
  }
});
</script>

<style scoped>
.phase-showcase {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(0, 243, 255, 0.08) 0%, transparent 50%),
    linear-gradient(180deg, #02040a 0%, #030814 50%, #02040a 100%);
  perspective: 1200px;
  color: #fff;
  overflow: hidden;
}

.hologrid-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.data-stream-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.data-stream-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: hue-rotate(180deg) saturate(1.3) brightness(0.35) contrast(1.1);
}

.data-stream-video.is-loaded {
  opacity: 0.4;
}

.data-stream-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 30%, rgba(2, 4, 10, 0.7) 70%),
    linear-gradient(180deg, rgba(2, 4, 10, 0.5) 0%, transparent 30%, transparent 50%, rgba(2, 4, 10, 0.6) 100%);
  pointer-events: none;
}

.showcase-core {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.core-energy {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.core-inner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #00f3ff 25%, rgba(0, 100, 140, 0.8) 55%, transparent 75%);
  box-shadow: 0 0 40px rgba(0, 243, 255, 0.6), 0 0 80px rgba(0, 243, 255, 0.3), 0 0 120px rgba(0, 243, 255, 0.15);
  animation: coreBreath 3s ease-in-out infinite;
}

.core-pulse {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  border: 1px solid rgba(0, 243, 255, 0.3);
  animation: corePulse 2s ease-out infinite;
}

.core-pulse::before,
.core-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(0, 243, 255, 0.2);
  animation: corePulse 2s ease-out infinite;
}

.core-pulse::before { animation-delay: 0.6s; }
.core-pulse::after { animation-delay: 1.2s; }

.core-label {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  letter-spacing: 4px;
  color: rgba(0, 243, 255, 0.5);
  white-space: nowrap;
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
  top: -55px;
  left: -55px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 1px solid rgba(0, 243, 255, 0.25);
  animation: ringSpin 7s linear infinite;
}

.core-ring:nth-child(2) {
  top: -75px;
  left: -75px;
  width: 150px;
  height: 150px;
  border-color: rgba(0, 243, 255, 0.15);
  animation-duration: 11s;
  animation-direction: reverse;
}

.core-ring:nth-child(3) {
  top: -95px;
  left: -95px;
  width: 190px;
  height: 190px;
  border-color: rgba(0, 243, 255, 0.1);
  animation-duration: 15s;
}

.showcase-loading {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 5;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0, 243, 255, 0.15);
  border-top-color: #00f3ff;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  color: rgba(0, 243, 255, 0.7);
  letter-spacing: 3px;
  margin: 0;
}

.loading-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
  margin: 0;
}

.showcase-orbit {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: orbitRotate 28s linear infinite;
  z-index: 3;
}

.holo-card-wrapper {
  position: absolute;
  width: 140px;
  height: 200px;
  left: -70px;
  top: -100px;
  transform-style: preserve-3d;
}

.holo-card {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: rgba(2, 6, 18, 0.75);
  border: 1px solid rgba(0, 243, 255, 0.2);
  transform-style: preserve-3d;
  overflow: hidden;
  animation: cardFloat 5s ease-in-out infinite;
  transition: filter 0.2s ease, transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
}

.holo-card:hover {
  filter: brightness(1.25);
  transform: scale(1.1) translateZ(30px);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.4);
  border-color: rgba(0, 243, 255, 0.5);
}

.card-corners .corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: rgba(0, 243, 255, 0.6);
  z-index: 5;
}
.corner.tl { top: 4px; left: 4px; border-top: 1px solid; border-left: 1px solid; }
.corner.tr { top: 4px; right: 4px; border-top: 1px solid; border-right: 1px solid; }
.corner.bl { bottom: 4px; left: 4px; border-bottom: 1px solid; border-left: 1px solid; }
.corner.br { bottom: 4px; right: 4px; border-bottom: 1px solid; border-right: 1px solid; }

.card-glow {
  position: absolute;
  inset: -2px;
  border-radius: 8px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

.card-frame {
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  border: 1px solid rgba(0, 243, 255, 0.12);
  pointer-events: none;
  z-index: 4;
}

.holo-card img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 65%;
  object-fit: cover;
  opacity: 0.9;
  filter: contrast(1.05) saturate(1.15) brightness(0.9);
}

.card-scanlines {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 243, 255, 0.03) 3px,
    rgba(0, 243, 255, 0.03) 4px
  );
  opacity: 1;
}

.card-shimmer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 40%, rgba(0, 243, 255, 0.12) 50%, transparent 60%);
  transform: translateX(-120%);
  animation: holoShimmer 5s ease-in-out infinite;
}

.card-data-bar {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 5px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 2px;
}

.data-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #00f3ff;
  box-shadow: 0 0 4px #00f3ff;
  animation: dataBlink 1.5s ease-in-out infinite;
}

.data-text {
  font-family: 'Orbitron', monospace;
  font-size: 7px;
  color: rgba(0, 243, 255, 0.7);
  letter-spacing: 0.5px;
}

.card-glitch {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: screen;
  animation: glitchFlicker 6s infinite;
}

.card-glitch-cyan {
  box-shadow: inset 3px 0 0 rgba(0, 243, 255, 0.4);
  transform: translateX(-2px);
}

.card-glitch-magenta {
  box-shadow: inset -3px 0 0 rgba(255, 42, 109, 0.35);
  transform: translateX(2px);
  animation-delay: 0.15s;
}

.holo-card-title {
  position: relative;
  z-index: 4;
  padding: 8px 8px 2px;
  font-size: 11px;
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 0 6px rgba(0, 243, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.holo-card-meta {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  color: rgba(0, 243, 255, 0.6);
  letter-spacing: 1px;
}

.divider { color: rgba(0, 243, 255, 0.25); }

.showcase-hud-top,
.showcase-hud-bottom {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  padding: 24px 32px;
}

.showcase-hud-top { top: 0; }
.showcase-hud-bottom { bottom: 0; }

.hud-corner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud-corner.tl { flex-direction: row; }
.hud-corner.tr { flex-direction: row-reverse; }
.hud-corner.bl { flex-direction: row; align-items: flex-end; }
.hud-corner.br { flex-direction: row-reverse; align-items: flex-end; }

.hud-line {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, rgba(0, 243, 255, 0.4), transparent);
}

.hud-corner.tr .hud-line {
  background: linear-gradient(270deg, rgba(0, 243, 255, 0.4), transparent);
}

.hud-line.v {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(0, 243, 255, 0.4), transparent);
}

.hud-corner.br .hud-line.v {
  background: linear-gradient(0deg, rgba(0, 243, 255, 0.4), transparent);
}

.hud-text {
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  letter-spacing: 3px;
  color: rgba(0, 243, 255, 0.45);
}

.showcase-hint {
  position: absolute;
  bottom: 95px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Orbitron', monospace;
  font-size: 10px;
  color: rgba(0, 243, 255, 0.35);
  letter-spacing: 2px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint-bracket {
  color: rgba(0, 243, 255, 0.5);
  animation: bracketBlink 2s ease-in-out infinite;
}

.skip-btn {
  position: absolute;
  bottom: 44px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 32px;
  background: rgba(2, 8, 20, 0.7);
  border: 1px solid rgba(0, 243, 255, 0.4);
  color: #00f3ff;
  border-radius: 2px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  letter-spacing: 3px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 12px rgba(0, 243, 255, 0.15), inset 0 0 10px rgba(0, 243, 255, 0.05);
  transition: all 0.2s ease;
  overflow: hidden;
  z-index: 10;
}

.skip-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.15), transparent);
  transition: left 0.4s ease;
}

.skip-btn:hover {
  background: rgba(0, 243, 255, 0.1);
  border-color: rgba(0, 243, 255, 0.7);
  box-shadow: 0 0 24px rgba(0, 243, 255, 0.35), inset 0 0 14px rgba(0, 243, 255, 0.1);
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.7);
}

.skip-btn:hover::before { left: 100%; }

.skip-text { position: relative; display: inline-block; }

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
  color: rgba(0, 243, 255, 0.7);
  transform: translateX(-2px);
}

.skip-text::after {
  color: rgba(255, 42, 109, 0.6);
  transform: translateX(2px);
}

.skip-btn:hover .skip-text::before,
.skip-btn:hover .skip-text::after {
  opacity: 0.5;
  animation: textGlitch 0.3s ease infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes coreBreath {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes corePulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes ringSpin {
  from { transform: rotateX(72deg) rotateZ(0deg); }
  to { transform: rotateX(72deg) rotateZ(360deg); }
}

@keyframes orbitRotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0) translateZ(0); }
  50% { transform: translateY(-14px) translateZ(10px); }
}

@keyframes holoShimmer {
  0%, 70% { transform: translateX(-120%); }
  85% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

@keyframes dataBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes glitchFlicker {
  0%, 92%, 100% { opacity: 0; }
  93% { opacity: 0.3; }
  94% { opacity: 0; }
  95% { opacity: 0.25; transform: translateX(-2px); }
  96% { opacity: 0; }
}

@keyframes textGlitch {
  0% { clip-path: inset(40% 0 30% 0); }
  25% { clip-path: inset(10% 0 60% 0); }
  50% { clip-path: inset(70% 0 10% 0); }
  75% { clip-path: inset(20% 0 50% 0); }
  100% { clip-path: inset(50% 0 20% 0); }
}

@keyframes bracketBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@media (max-width: 768px) {
  .hud-text { font-size: 8px; letter-spacing: 1px; }
  .hud-line { width: 30px; }
  .showcase-hud-top, .showcase-hud-bottom { padding: 16px; }
  .holo-card-wrapper { width: 110px; height: 160px; left: -55px; top: -80px; }
  .skip-btn { font-size: 11px; padding: 8px 24px; letter-spacing: 2px; }
}
</style>

<template>
  <section class="phase-landing" @mousemove="onMouseMove">
    <!-- 视频轮播背景 -->
    <div class="video-carousel">
      <video
        v-for="(video, i) in bgVideos"
        :key="video"
        ref="videoEls"
        class="bg-video"
        :class="{ active: activeVideoIndex === i }"
        autoplay
        muted
        loop
        playsinline
        :preload="i === 0 ? 'auto' : 'none'"
        :poster="baseUrl + 'images/generated/nebula-bg.jpg'"
        :src="i === 0 ? (baseUrl + video) : null"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="video-vignette"></div>
    </div>

    <!-- 星空粒子 -->
    <canvas ref="starfield" class="starfield"></canvas>

    <!-- 中央内容 -->
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

    <!-- 八位女主角轮播 -->
    <div class="heroines-carousel">
      <div class="heroines-track" :style="heroinesTrackStyle">
        <div
          v-for="(girl, i) in heroines"
          :key="girl.name"
          class="heroine-card"
          :class="{ active: activeHeroineIndex === i }"
          @mouseenter="activeHeroineIndex = i"
        >
          <div class="heroine-glow"></div>
          <img :src="baseUrl + girl.img" :alt="girl.name" />
          <div class="heroine-info">
            <div class="heroine-name">{{ girl.name }}</div>
            <div class="heroine-work">{{ girl.work }}</div>
          </div>
        </div>
      </div>
      <div class="heroines-dots">
        <span
          v-for="(_, i) in heroines"
          :key="i"
          :class="{ active: activeHeroineIndex === i }"
          @click="activeHeroineIndex = i"
        ></span>
      </div>
    </div>

    <!-- 视频短播入口 -->
    <div class="short-video-panel" :class="{ expanded: showShortVideos }">
      <button class="short-video-toggle" @click="showShortVideos = !showShortVideos">
        <span class="toggle-icon">▶</span>
        <span class="toggle-text">视频短播</span>
      </button>
      <div class="short-video-list">
        <div
          v-for="(video, i) in shortVideos"
          :key="i"
          class="short-video-item"
          @click="playVideo(video)"
        >
          <img :src="baseUrl + video.thumb" :alt="video.title" />
          <div class="short-video-play">▶</div>
          <div class="short-video-title">{{ video.title }}</div>
        </div>
      </div>
    </div>

    <!-- 视频播放器弹窗 -->
    <div v-if="playingVideo" class="video-modal" @click.self="closeVideo">
      <div class="video-modal-content">
        <button class="video-modal-close" @click="closeVideo">×</button>
        <video :src="baseUrl + playingVideo.src" autoplay controls></video>
        <div class="video-modal-title">{{ playingVideo.title }}</div>
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
      <span class="hud-text">GALAXY READY</span>
    </div>
    <div class="corner-hud bottom-right">
      <span class="hud-line"></span>
      <span class="hud-text">AWAITING INPUT</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAudio } from '../composables/useAudio.js';

const emit = defineEmits(['start']);

const baseUrl = import.meta.env.BASE_URL;
const isTransitioning = ref(false);
const parallax = ref({ x: 0, y: 0 });

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const bgVideos = [
  'images/generated/nebula-trailer-v3-a.mp4',
  'images/generated/nebula-trailer-v3-b.mp4',
  'images/generated/nebula-trailer-v3-c.mp4'
];
const activeVideoIndex = ref(0);
let videoCarouselTimer = null;
const videoEls = ref([]);
const loadedVideos = ref(0);

const heroines = [
  { name: 'Elaina', img: 'images/login/elaina.jpg', work: '魔女之旅' },
  { name: 'Violet', img: 'images/login/violet-evergarden.png', work: '紫罗兰永恒花园' },
  { name: 'Kanade', img: 'images/login/tachibana-kanade.jpg', work: 'Angel Beats!' },
  { name: 'Megumi', img: 'images/login/kato-megumi.jpg', work: '路人女主的养成方法' },
  { name: 'Mio', img: 'images/login/akiyama-mio.jpg', work: '轻音少女' },
  { name: 'Mikoto', img: 'images/login/misaka-mikoto.jpg', work: '某科学的超电磁炮' },
  { name: 'Rem', img: 'images/login/rem.jpg', work: 'Re:从零开始' },
  { name: 'Shana', img: 'images/login/shana.jpg', work: '灼眼的夏娜' }
];
const activeHeroineIndex = ref(0);
let heroineCarouselTimer = null;

const shortVideos = [
  { title: '星云预告 A', src: 'images/generated/nebula-trailer-v3-a.mp4', thumb: 'images/generated/nebula-trailer-frame.jpg' },
  { title: '星云预告 B', src: 'images/generated/nebula-trailer-v3-b.mp4', thumb: 'images/generated/nebula-bg.jpg' },
  { title: '星云预告 C', src: 'images/generated/nebula-trailer-v3-c.mp4', thumb: 'images/generated/magic-circle.jpg' },
  { title: '星云预告 V2', src: 'images/generated/nebula-trailer-v2.mp4', thumb: 'images/generated/title-glass-disc.jpg' }
];
const showShortVideos = ref(false);
const playingVideo = ref(null);

const heroinesTrackStyle = computed(() => ({
  transform: `translateX(calc(50% - ${activeHeroineIndex.value * 120}px - 60px))`
}));

function onMouseMove(e) {
  parallax.value = {
    x: (e.clientX / window.innerWidth - 0.5) * 2,
    y: (e.clientY / window.innerHeight - 0.5) * 2
  };
}

function onVideoLoaded() {
  loadedVideos.value++;
}

const { init: initAudio } = useAudio();

function enter() {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  initAudio().catch(() => {});
  setTimeout(() => emit('start'), 700);
}

function playVideo(video) {
  playingVideo.value = video;
}

function closeVideo() {
  playingVideo.value = null;
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
    radius: Math.random() * 1.2 + 0.2,
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
      const opacity = (Math.sin(star.alpha) + 1) / 2 * 0.6 + 0.1;
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

function loadBackgroundVideo(index) {
  const el = videoEls.value?.[index];
  if (!el || el.dataset.loaded === 'true') return;
  el.src = baseUrl + bgVideos[index];
  el.dataset.loaded = 'true';
}

function scheduleNextPreload() {
  const next = (activeVideoIndex.value + 1) % bgVideos.length;
  if (next === 0) return; // 首个视频已加载
  setTimeout(() => loadBackgroundVideo(next), 6000);
}

function startCarousels() {
  // 首屏只加载第一个背景视频，在切换前 2 秒再预加载下一个
  scheduleNextPreload();

  videoCarouselTimer = setInterval(() => {
    activeVideoIndex.value = (activeVideoIndex.value + 1) % bgVideos.length;
    loadBackgroundVideo(activeVideoIndex.value);
    scheduleNextPreload();
  }, 8000);

  heroineCarouselTimer = setInterval(() => {
    activeHeroineIndex.value = (activeHeroineIndex.value + 1) % heroines.length;
  }, 3500);
}

onMounted(() => {
  initStarfield();
  startCarousels();
});

onUnmounted(() => {
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
  clearInterval(videoCarouselTimer);
  clearInterval(heroineCarouselTimer);
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

.video-carousel {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #000;
}

.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.6s ease-in-out;
}

.bg-video.active {
  opacity: 1;
}

.video-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 0%, rgba(2, 4, 10, 0.5) 60%, rgba(2, 4, 10, 0.9) 100%),
    linear-gradient(180deg, rgba(2, 4, 10, 0.4) 0%, transparent 30%, transparent 70%, rgba(2, 4, 10, 0.7) 100%);
  pointer-events: none;
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.entrance-content {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: none;
  padding: 0 20px;
}

.brand-en {
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.5);
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
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 3px;
  margin: 0;
  animation: fade-in-up 1s ease-out 0.4s both;
  max-width: 600px;
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

/* 八位女主角轮播 */
.heroines-carousel {
  position: absolute;
  bottom: 8%;
  left: 0;
  right: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
}

.heroines-track {
  display: flex;
  gap: 24px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.heroine-card {
  position: relative;
  width: 100px;
  height: 140px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: all 0.4s ease;
  cursor: pointer;
  opacity: 0.55;
  transform: scale(0.92);
}

.heroine-card.active {
  opacity: 1;
  transform: scale(1.08);
  border-color: rgba(0, 243, 255, 0.6);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.25), 0 12px 40px rgba(0, 0, 0, 0.5);
}

.heroine-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.heroine-card:hover img {
  transform: scale(1.1);
}

.heroine-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0, 243, 255, 0.15) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.heroine-card.active .heroine-glow {
  opacity: 1;
}

.heroine-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 8px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.85));
  z-index: 2;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.heroine-card:hover .heroine-info,
.heroine-card.active .heroine-info {
  transform: translateY(0);
}

.heroine-name {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.heroine-work {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}

.heroines-dots {
  display: flex;
  gap: 8px;
}

.heroines-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.3s ease;
}

.heroines-dots span.active {
  background: #00f3ff;
  box-shadow: 0 0 10px rgba(0, 243, 255, 0.6);
  width: 24px;
  border-radius: 4px;
}

/* 视频短播入口 */
.short-video-panel {
  position: absolute;
  top: 8%;
  right: 4%;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: auto;
}

.short-video-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(0, 243, 255, 0.4);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.short-video-toggle:hover {
  background: rgba(0, 243, 255, 0.12);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.2);
}

.toggle-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 243, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.short-video-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  transition: all 0.3s ease;
}

.short-video-panel.expanded .short-video-list {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.short-video-item {
  position: relative;
  width: 160px;
  height: 90px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.short-video-item:hover {
  transform: translateX(-6px);
  border-color: rgba(0, 243, 255, 0.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.short-video-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.short-video-play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(0, 243, 255, 0.85);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: transform 0.3s ease;
}

.short-video-item:hover .short-video-play {
  transform: translate(-50%, -50%) scale(1.15);
}

.short-video-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 10px;
  font-size: 11px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8));
  color: rgba(255, 255, 255, 0.9);
}

/* 视频弹窗 */
.video-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.3s ease;
}

.video-modal-content {
  position: relative;
  width: 90%;
  max-width: 900px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 243, 255, 0.3);
  box-shadow: 0 0 60px rgba(0, 243, 255, 0.2);
}

.video-modal-content video {
  width: 100%;
  display: block;
}

.video-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  z-index: 2;
  transition: background 0.2s ease;
}

.video-modal-close:hover {
  background: rgba(255, 50, 100, 0.8);
}

.video-modal-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.9));
  color: #fff;
  font-size: 16px;
  letter-spacing: 2px;
}

/* 四角 HUD */
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
  pointer-events: none;
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

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
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
    font-size: 42px;
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

  .heroine-card {
    width: 70px;
    height: 100px;
  }

  .heroines-track {
    gap: 14px;
  }

  .heroines-carousel {
    bottom: 6%;
  }

  .short-video-panel {
    top: 6%;
    right: 3%;
  }

  .short-video-item {
    width: 130px;
    height: 74px;
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

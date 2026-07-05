<template>
  <section class="phase-landing">
    <canvas ref="starfield" class="starfield"></canvas>

    <div class="bg-videos">
      <video
        v-for="(src, idx) in bgVideos"
        :key="src"
        ref="videoRefs"
        class="bg-video"
        :class="{ active: currentVideoIdx === idx }"
        :src="src"
        muted
        loop
        playsinline
        @error="onVideoError"
      ></video>
      <div v-if="videoFailed" class="bg-fallback"></div>
    </div>

    <div class="vignette"></div>

    <div class="entrance-stage">
      <div class="orbit-ring" aria-hidden="true">
        <div
          v-for="(char, idx) in characters"
          :key="char.file"
          class="orbit-portrait"
          :style="orbitStyle(idx)"
        >
          <div class="portrait-glow"></div>
          <div
            class="portrait-img"
            :style="{ backgroundImage: `url(./images/login/${char.file})` }"
          ></div>
        </div>
      </div>

      <div class="brand-center">
        <div class="brand-en">NEBULA CHRONICLE</div>
        <h1 class="brand-title">星云编年史</h1>
        <p class="brand-sub">穿越六十载动漫星河，唤醒每一次感动</p>

        <button class="journey-btn" :disabled="isTransitioning" @click="enter">
          <span class="btn-text">开始旅程</span>
          <span class="btn-shine"></span>
        </button>
      </div>
    </div>

    <div class="character-names">
      <transition name="fade-name" mode="out-in">
        <div :key="currentCharacterIdx" class="name-bubble">
          <span class="name-main">{{ currentCharacter.name }}</span>
          <span class="name-source">{{ currentCharacter.source }}</span>
          <span class="name-quote">{{ currentCharacter.quote }}</span>
        </div>
      </transition>
    </div>

    <div class="thumbs">
      <div
        v-for="(char, idx) in characters"
        :key="char.file"
        class="thumb"
        :class="{ active: currentCharacterIdx === idx }"
        :style="{ backgroundImage: `url(./images/login/${char.file})` }"
        @click="setCharacter(idx)"
      ></div>
    </div>

    <div v-if="isLoading" class="landing-loader">
      <div class="loading-spinner"></div>
      <p>正在穿越星云…</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const emit = defineEmits(['start']);

const characters = [
  { name: '御坂美琴', source: '《某科学的超电磁炮》', quote: '你指尖跃动的电光，是我此生不灭的信仰。', file: 'misaka-mikoto.jpg' },
  { name: '夏娜', source: '《灼眼的夏娜》', quote: '我是天壤劫火·亚拉斯特尔的火雾战士。', file: 'shana.jpg' },
  { name: '立华奏', source: '《Angel Beats!》', quote: '请让我在此留宿。', file: 'tachibana-kanade.jpg' },
  { name: '雷姆', source: '《Re:从零开始》', quote: '因为昴，是雷姆的英雄啊。', file: 'rem.jpg' },
  { name: '薇尔莉特', source: '《紫罗兰永恒花园》', quote: '我想知道「爱」是什么意思。', file: 'violet-evergarden.png' },
  { name: '秋山澪', source: '《轻音少女》', quote: '请不要这么盯着我看…', file: 'akiyama-mio.jpg' },
  { name: '伊蕾娜', source: '《魔女之旅》', quote: '这位可爱的美少女究竟是谁呢？', file: 'elaina.jpg' },
  { name: '加藤惠', source: '《路人女主》', quote: '我可是你的女主角哦？', file: 'kato-megumi.jpg' }
];

const bgVideos = [
  './videos/character_showcase.mp4',
  './videos/video_9a65c1f1-49cc-4510-9ec2-b1706f552fef_m1hc-u0-zs7i-4j7.mp4',
  './videos/video_b515da33-e0fa-41af-a102-d105e2bfbe92_m1hc-u0-ws74-4j7.mp4',
  './videos/video_b810dc79-f5f9-404c-b893-e6d320c3e2d9_m1hc-u0-wfid-4j7 (1).mp4'
];

const videoRefs = ref([]);
const starfield = ref(null);
const currentCharacterIdx = ref(0);
const currentVideoIdx = ref(0);
const isLoading = ref(true);
const videoFailed = ref(false);
const isTransitioning = ref(false);

let slideInterval = null;
let videoInterval = null;
let starRafId = null;
let starResizeHandler = null;

const currentCharacter = computed(() => characters[currentCharacterIdx.value]);

function orbitStyle(idx) {
  const count = characters.length;
  const angle = (idx / count) * 360;
  const delay = idx * -1.6;
  return {
    '--orbit-angle': `${angle}deg`,
    '--float-delay': `${delay}s`
  };
}

function setCharacter(idx) {
  currentCharacterIdx.value = idx;
}

function startAutoPlay() {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(() => {
    currentCharacterIdx.value = (currentCharacterIdx.value + 1) % characters.length;
  }, 5000);
}

function onVideoError() {
  videoFailed.value = true;
  clearInterval(videoInterval);
}

function startVideoCarousel() {
  if (videoFailed.value || !videoRefs.value.length) return;
  const validVideos = videoRefs.value.filter(v => v?.readyState >= HTMLMediaElement.HAVE_METADATA);
  if (!validVideos.length) return;

  const playCurrent = () => {
    const v = videoRefs.value[currentVideoIdx.value];
    if (v && v.readyState >= HTMLMediaElement.HAVE_METADATA) {
      v.play().catch(() => {});
    }
  };

  playCurrent();

  videoInterval = setInterval(() => {
    const prev = videoRefs.value[currentVideoIdx.value];
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
    }
    currentVideoIdx.value = (currentVideoIdx.value + 1) % bgVideos.length;
    playCurrent();
  }, 8000);
}

function enter() {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  setTimeout(() => {
    emit('start');
  }, 600);
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const stars = Array.from({ length: 160 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.3 + 0.3,
    alpha: Math.random(),
    speed: Math.random() * 0.02 + 0.005
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
      const opacity = (Math.sin(star.alpha) + 1) / 2 * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
      ctx.fill();
    }
    starRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(() => {
  const preloadImages = characters.map(char =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `./images/login/${char.file}`;
    })
  );

  const finishLoad = () => {
    nextTick(() => {
      isLoading.value = false;
      initStarfield();
      startAutoPlay();
      startVideoCarousel();
    });
  };

  Promise.all(preloadImages).finally(finishLoad);

  setTimeout(() => {
    if (isLoading.value) finishLoad();
  }, 5000);
});

onUnmounted(() => {
  clearInterval(slideInterval);
  clearInterval(videoInterval);
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
  videoRefs.value.forEach(v => {
    if (!v) return;
    try {
      v.pause();
      v.src = '';
      v.load();
    } catch (e) {}
  });
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
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.bg-videos {
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
  transition: opacity 1.6s ease-in-out;
}

.bg-video.active {
  opacity: 0.5;
}

.bg-fallback {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, #0a1020 0%, #02040a 100%);
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(2, 4, 10, 0.6) 80%, rgba(2, 4, 10, 0.9) 100%);
}

.entrance-stage {
  position: relative;
  z-index: 5;
  width: 100%;
  max-width: 900px;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbit-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: orbit-spin 60s linear infinite;
}

.orbit-portrait {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 110px;
  height: 110px;
  margin: -55px;
  border-radius: 50%;
  transform: rotate(var(--orbit-angle)) translateX(min(42vw, 360px)) rotate(calc(var(--orbit-angle) * -1));
  animation: portrait-float 4s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.orbit-portrait::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #00f3ff, #ff2a6d, #b892ff, #00f3ff);
  opacity: 0.7;
  filter: blur(4px);
  animation: ring-rotate 3s linear infinite;
}

.portrait-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.25), transparent 70%);
  opacity: 0.6;
  animation: glow-pulse 3s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.portrait-img {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.brand-center {
  position: relative;
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.brand-en {
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  animation: fade-in-down 1s ease-out both;
}

.brand-title {
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 8px;
  margin: 0;
  background: linear-gradient(180deg, #fff 0%, #00f3ff 50%, #b892ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 40px rgba(0, 243, 255, 0.35), 0 0 80px rgba(184, 146, 255, 0.2);
  animation: title-scale 1s ease-out 0.2s both;
}

.brand-sub {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  margin: 0 0 16px;
  animation: fade-in-up 1s ease-out 0.4s both;
}

.journey-btn {
  position: relative;
  pointer-events: auto;
  padding: 16px 56px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(90deg, #00f3ff, #0066ff);
  color: #02040a;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.35), inset 0 0 12px rgba(255, 255, 255, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: fade-in-up 1s ease-out 0.6s both;
}

.journey-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 0 50px rgba(0, 243, 255, 0.55), inset 0 0 16px rgba(255, 255, 255, 0.4);
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

.character-names {
  position: absolute;
  left: 6%;
  bottom: 10%;
  z-index: 5;
  max-width: 320px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8);
}

.name-bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 22px;
  border-radius: 16px;
  background: rgba(5, 7, 20, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.name-main {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(90deg, #00f3ff, #ff2a6d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.name-source {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.name-quote {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  font-style: italic;
}

.thumbs {
  position: absolute;
  right: 4%;
  bottom: 8%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thumb {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.55;
}

.thumb.active,
.thumb:hover {
  opacity: 1;
  border-color: #00f3ff;
  box-shadow: 0 0 14px rgba(0, 243, 255, 0.45);
  transform: scale(1.12);
}

.landing-loader {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #02040a;
  color: rgba(255, 255, 255, 0.7);
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(0, 243, 255, 0.2);
  border-top-color: #00f3ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.fade-name-enter-active,
.fade-name-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-name-enter-from,
.fade-name-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes orbit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes portrait-float {
  0%, 100% { transform: rotate(var(--orbit-angle)) translateX(min(42vw, 360px)) rotate(calc(var(--orbit-angle) * -1)) translateY(0); }
  50% { transform: rotate(var(--orbit-angle)) translateX(min(42vw, 360px)) rotate(calc(var(--orbit-angle) * -1)) translateY(-16px); }
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 0.75; transform: scale(1.05); }
}

@keyframes title-scale {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}

@media (max-width: 768px) {
  .entrance-stage {
    aspect-ratio: auto;
    height: 70vh;
  }

  .orbit-portrait {
    width: 64px;
    height: 64px;
    margin: -32px;
    transform: rotate(var(--orbit-angle)) translateX(min(38vw, 150px)) rotate(calc(var(--orbit-angle) * -1));
  }

  @keyframes portrait-float {
    0%, 100% { transform: rotate(var(--orbit-angle)) translateX(min(38vw, 150px)) rotate(calc(var(--orbit-angle) * -1)) translateY(0); }
    50% { transform: rotate(var(--orbit-angle)) translateX(min(38vw, 150px)) rotate(calc(var(--orbit-angle) * -1)) translateY(-10px); }
  }

  .brand-title {
    font-size: 44px;
    letter-spacing: 4px;
  }

  .brand-sub {
    font-size: 13px;
    padding: 0 20px;
  }

  .journey-btn {
    padding: 14px 44px;
    font-size: 16px;
  }

  .character-names {
    left: 5%;
    right: 5%;
    bottom: 16%;
    max-width: none;
  }

  .name-bubble {
    padding: 14px 18px;
  }

  .name-main {
    font-size: 20px;
  }

  .thumbs {
    flex-direction: row;
    right: auto;
    left: 50%;
    bottom: 4%;
    transform: translateX(-50%);
    gap: 8px;
  }

  .thumb {
    width: 34px;
    height: 34px;
  }
}
</style>

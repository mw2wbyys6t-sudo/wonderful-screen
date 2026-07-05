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

    <div class="character-showcase">
      <div class="character-name">{{ currentCharacter.name }}</div>
      <div class="character-source">{{ currentCharacter.source }}</div>
      <div class="character-quote">{{ currentCharacter.quote }}</div>
    </div>

    <div class="character-slider">
      <div
        v-for="(char, idx) in characters"
        :key="char.file"
        class="character-thumb"
        :class="{ active: currentCharacterIdx === idx }"
        :style="{ backgroundImage: `url(./images/login/${char.file})` }"
        @click="setCharacter(idx)"
      ></div>
    </div>

    <div
      ref="glassCard"
      class="glass-card"
      :style="cardTiltStyle"
      @pointermove="onCardMove"
      @pointerleave="onCardLeave"
      @pointerenter="onCardEnter"
    >
      <div class="light-flow"></div>
      <div class="sheen" :style="sheenStyle"></div>

      <h1 class="brand">星云编年史</h1>
      <p class="tagline">穿越六十载动漫星河，唤醒每一次感动</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            v-model="form.username"
            type="text"
            placeholder="用户名"
            maxlength="20"
            :class="{ error: errors.username }"
          />
          <span v-if="errors.username" class="error-msg">{{ errors.username }}</span>
        </div>
        <div class="form-group">
          <input
            v-model="form.password"
            type="password"
            placeholder="密码"
            maxlength="32"
            :class="{ error: errors.password }"
          />
          <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>
        </div>
        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? '校验中…' : '进入星河' }}
        </button>
      </form>

      <p class="hint">首次登录将自动注册，账号仅保存在本地浏览器</p>
      <p v-if="loginError" class="login-error">{{ loginError }}</p>
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

const STORAGE_KEY = 'nebula-users';

const videoRefs = ref([]);
const starfield = ref(null);
const glassCard = ref(null);
const currentCharacterIdx = ref(0);
const currentVideoIdx = ref(0);
const isLoading = ref(true);
const videoFailed = ref(false);
const form = ref({ username: '', password: '' });
const errors = ref({ username: '', password: '' });
const loginError = ref('');
const isSubmitting = ref(false);

let slideInterval = null;
let videoInterval = null;
let starRafId = null;
let sheenRafId = null;
let starResizeHandler = null;

const currentCharacter = computed(() => characters[currentCharacterIdx.value]);

const cardPointer = ref({ x: 0.5, y: 0.5, active: false });
const sheenPos = ref({ x: 0, y: 0 });

const cardTiltStyle = computed(() => {
  if (!cardPointer.value.active) {
    return { transform: 'rotateY(0deg) rotateX(0deg)' };
  }
  const x = cardPointer.value.x - 0.5;
  const y = cardPointer.value.y - 0.5;
  return { transform: `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)` };
});

const sheenStyle = computed(() => ({
  left: `${sheenPos.value.x}px`,
  top: `${sheenPos.value.y}px`,
  opacity: cardPointer.value.active ? 1 : 0
}));

function animateSheen() {
  const targetX = cardPointer.value.x * (glassCard.value?.offsetWidth || 0);
  const targetY = cardPointer.value.y * (glassCard.value?.offsetHeight || 0);
  sheenPos.value = {
    x: sheenPos.value.x + (targetX - sheenPos.value.x) * 0.1,
    y: sheenPos.value.y + (targetY - sheenPos.value.y) * 0.1
  };
  sheenRafId = requestAnimationFrame(animateSheen);
}

function onCardMove(e) {
  if (!glassCard.value) return;
  const rect = glassCard.value.getBoundingClientRect();
  cardPointer.value = {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
    active: true
  };
}

function onCardLeave() {
  cardPointer.value = { x: 0.5, y: 0.5, active: false };
  if (sheenRafId) {
    cancelAnimationFrame(sheenRafId);
    sheenRafId = null;
  }
}

function onCardEnter() {
  cardPointer.value.active = true;
  if (!sheenRafId) animateSheen();
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

function validateForm() {
  errors.value = { username: '', password: '' };
  loginError.value = '';
  let valid = true;

  const username = form.value.username.trim();
  if (!username) {
    errors.value.username = '请输入用户名';
    valid = false;
  } else if (username.length < 2 || username.length > 20) {
    errors.value.username = '用户名长度 2-20 位';
    valid = false;
  }

  const password = form.value.password;
  if (!password) {
    errors.value.password = '请输入密码';
    valid = false;
  } else if (password.length < 4 || password.length > 32) {
    errors.value.password = '密码长度 4-32 位';
    valid = false;
  }

  return valid;
}

function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function handleLogin() {
  if (!validateForm()) return;
  isSubmitting.value = true;

  setTimeout(() => {
    const username = form.value.username.trim();
    const password = form.value.password;
    const users = getUsers();

    if (users[username]) {
      if (users[username].password === password) {
        emit('start');
      } else {
        loginError.value = '密码错误，请重试';
      }
    } else {
      users[username] = { password, createdAt: Date.now() };
      saveUsers(users);
      emit('start');
    }

    isSubmitting.value = false;
  }, 400);
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.2 + 0.3,
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
  if (sheenRafId) cancelAnimationFrame(sheenRafId);
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
  transition: opacity 1.2s ease-in-out;
}

.bg-video.active {
  opacity: 0.45;
}

.bg-fallback {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, #0a1020 0%, #02040a 100%);
}

.character-showcase {
  position: absolute;
  left: 8%;
  bottom: 12%;
  z-index: 5;
  max-width: 420px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8);
}

.character-name {
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(90deg, #00f3ff, #ff2a6d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 8px;
}

.character-source {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 16px;
}

.character-quote {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  font-style: italic;
}

.character-slider {
  position: absolute;
  left: 8%;
  bottom: 5%;
  z-index: 5;
  display: flex;
  gap: 10px;
}

.character-thumb {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.character-thumb.active,
.character-thumb:hover {
  opacity: 1;
  border-color: #00f3ff;
  box-shadow: 0 0 16px rgba(0, 243, 255, 0.4);
  transform: scale(1.1);
}

.glass-card {
  position: relative;
  z-index: 10;
  width: 360px;
  padding: 40px 32px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out;
  overflow: hidden;
}

.light-flow {
  position: absolute;
  inset: -50%;
  background: conic-gradient(from 0deg, transparent 0%, rgba(0, 243, 255, 0.1) 40%, transparent 80%);
  animation: rotate 8s linear infinite;
  pointer-events: none;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.sheen {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25), transparent 70%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.brand {
  position: relative;
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 8px;
  letter-spacing: 2px;
  color: #fff;
  text-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
}

.tagline {
  position: relative;
  font-size: 13px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 28px;
}

.login-form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:focus {
  border-color: #00f3ff;
  box-shadow: 0 0 12px rgba(0, 243, 255, 0.2);
}

.form-group input.error {
  border-color: #ff2a6d;
}

.error-msg {
  font-size: 12px;
  color: #ff7aa3;
}

.submit-btn {
  margin-top: 8px;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg, #00f3ff, #0066ff);
  color: #02040a;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  box-shadow: 0 0 24px rgba(0, 243, 255, 0.4);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.hint {
  position: relative;
  margin-top: 16px;
  font-size: 11px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.login-error {
  position: relative;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
  color: #ff7aa3;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .phase-landing {
    flex-direction: column;
    padding: 20px;
  }
  .character-showcase {
    position: relative;
    left: auto;
    bottom: auto;
    margin-bottom: 24px;
    text-align: center;
  }
  .character-name {
    font-size: 28px;
  }
  .character-slider {
    position: relative;
    left: auto;
    bottom: auto;
    margin-bottom: 20px;
  }
  .glass-card {
    width: 100%;
    max-width: 360px;
  }
}
</style>

<template>
  <section class="phase-galaxy">
    <canvas ref="galaxyCanvas" id="galaxy-canvas"></canvas>
    <div v-if="(galaxyLoading || dataLoading) && !webglError" class="galaxy-loading">
      <div class="loading-spinner"></div>
      <p>{{ dataLoading ? '正在加载星云数据库…' : '正在构建星系…' }}</p>
    </div>
    <div v-if="webglError" class="webgl-fallback">
      <div class="fallback-icon">✦</div>
      <p>当前环境不支持 WebGL，无法显示 3D 星系。</p>
      <p>请在支持 WebGL 的浏览器（如 Chrome、Edge、Safari）中打开。</p>
    </div>

    <HUD
      v-if="hudReady"
      ref="hudRef"
      :count="data.length"
      :voice-active="voice.isListening.value"
      :voice-supported="voice.isSupported.value"
      @filter-genre="onFilterGenre"
      @search="onSearch"
      @reset-camera="onResetCamera"
      @focus-nebula="onFocusNebula"
      @toggle-fullscreen="onToggleFullscreen"
      @toggle-voice="onToggleVoice"
    />
    <DetailPanel
      v-if="hudReady"
      :anime="selectedAnime"
      :visible="!!selectedAnime"
      @close="selectedAnime = null"
      @locate="onLocateStar"
    />
    <div v-if="hoveredAnime" class="star-tooltip" :style="tooltipStyle">
      <div class="tooltip-title">{{ hoveredAnime.titleRomaji }}</div>
      <div class="tooltip-meta">{{ hoveredAnime.year }} · {{ hoveredAnime.genres?.[0] }} · Score: {{ hoveredAnime.averageScore }}</div>
    </div>

    <!-- 手势摄像头区域 -->
    <div class="camera-section" :class="{ minimized: cameraMinimized }">
      <div v-if="!gestureReady && !gestureError" class="gesture-start" @click="startGesture">
        <span>🖐</span>
        <div>开启手势</div>
      </div>

      <template v-else>
        <div class="camera-container">
          <video ref="gestureVideo" class="gesture-video" autoplay playsinline muted></video>
          <canvas ref="gestureCanvas" class="gesture-canvas"></canvas>
          <div class="camera-controls">
            <button class="camera-btn" :title="cameraMinimized ? '展开' : '最小化'" @click="cameraMinimized = !cameraMinimized">
              {{ cameraMinimized ? '+' : '−' }}
            </button>
            <button class="camera-btn" title="关闭" @click="stopGesture">×</button>
          </div>
        </div>
        <div v-if="!gestureError" class="gesture-badge">{{ gesture.gestureText.value }}</div>
        <div v-if="gestureError" class="gesture-error">
          {{ gestureError }}
          <button class="retry-btn" @click="startGesture">重试</button>
        </div>
      </template>
    </div>

    <!-- 手势光标 -->
    <div
      v-if="gestureReady"
      class="hand-cursor"
      :class="{ active: gesture.gestureText.value.includes('点击') }"
      :style="cursorStyle"
    ></div>

    <!-- 语音反馈 -->
    <div v-if="voice.feedback.value" class="voice-feedback">{{ voice.feedback.value }}</div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineAsyncComponent, computed, watch } from 'vue';
import { useData } from '../composables/useData.js';
import { useGesture } from '../composables/useGesture.js';
import { useVoice } from '../composables/useVoice.js';

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const DetailPanel = defineAsyncComponent(() => import('./DetailPanel.vue'));

const galaxyCanvas = ref(null);
const gestureVideo = ref(null);
const gestureCanvas = ref(null);
const hudRef = ref(null);
const hudReady = ref(false);
const webglError = ref('');
const galaxyLoading = ref(true);
const selectedAnime = ref(null);
const hoveredAnime = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const activeGenre = ref(null);
const cameraMinimized = ref(false);

const { data, genres, load: loadData, loading: dataLoading } = useData();
const gesture = useGesture();
const voice = useVoice({ onResult: handleVoiceCommand });

let galaxyApi = null;
let cleanupFns = [];
let handActiveTimer = null;

const gestureReady = computed(() => gesture.isReady.value);
const gestureError = computed(() => gesture.error.value);

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

const cursorStyle = computed(() => ({
  transform: `translate(${gesture.handX.value - 20}px, ${gesture.handY.value - 20}px)`
}));

watch([gesture.handX, gesture.handY], ([x, y]) => {
  if (gesture.isReady.value && x > 0 && y > 0) {
    tooltipPos.value = { x, y };
  }
});

onMounted(async () => {
  try {
    await loadData();

    const mod = await import('../composables/useGalaxy.js');
    const { useGalaxy } = mod;
    const api = useGalaxy(galaxyCanvas, data, genres, {
      onSelect: (anime) => {
        selectedAnime.value = anime;
      },
      onError: (msg) => {
        webglError.value = msg;
        galaxyLoading.value = false;
      },
      onSearchResult: (result) => {
        if (!result.found && hudRef.value) {
          hudRef.value.showNoResult();
        }
      },
      onReady: () => {
        galaxyLoading.value = false;
      }
    });
    api.init();
    galaxyApi = api;

    if (api.hoveredAnime) {
      watch(api.hoveredAnime, (val) => {
        hoveredAnime.value = val;
      }, { immediate: true });
    }

    if (galaxyApi) {
      gesture.setHandlers({
        onMove: (x, y) => {
          galaxyApi.setInputMode('hand');
          galaxyApi.setPointerFromScreen(x, y);
          if (handActiveTimer) clearTimeout(handActiveTimer);
          handActiveTimer = setTimeout(() => {
            galaxyApi.setInputMode('mouse');
          }, 800);
        },
        onPinch: () => {
          galaxyApi.selectHovered();
        },
        onOpen: () => {
          galaxyApi.selectHovered();
        },
        onSwipe: (dx) => {
          galaxyApi.rotateCameraByVelocity(dx);
        }
      });
    }

    setTimeout(() => {
      gesture.start(gestureVideo, gestureCanvas);
    }, 1200);

    const onPointerMove = (e) => {
      if (!gesture.isReady.value) {
        tooltipPos.value = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', onPointerMove);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        selectedAnime.value = null;
        if (hudRef.value) hudRef.value.showHelp = false;
      } else if (e.key === 'r' || e.key === 'R') {
        galaxyApi?.resetCamera();
      } else if (e.key === 'f' || e.key === 'F') {
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    cleanupFns.push(
      () => window.removeEventListener('pointermove', onPointerMove),
      () => window.removeEventListener('keydown', onKeyDown)
    );

    hudReady.value = true;
  } catch (err) {
    console.error('星系初始化失败:', err);
    webglError.value = '星系初始化失败，请刷新重试';
    galaxyLoading.value = false;
  }
});

onUnmounted(() => {
  cleanupFns.forEach(fn => fn());
  gesture.setHandlers({});
  voice.stop();
  gesture.stop();
  if (handActiveTimer) clearTimeout(handActiveTimer);
});

function startGesture() {
  gesture.start(gestureVideo, gestureCanvas);
}

function stopGesture() {
  gesture.stop();
  galaxyApi?.setInputMode('mouse');
}

function onToggleVoice() {
  voice.toggle();
}

function handleVoiceCommand(text) {
  const lower = text.toLowerCase().replace(/[，。？！]/g, ' ').trim();

  if (lower.includes('关闭') || lower.includes('退出')) {
    selectedAnime.value = null;
    return;
  }

  const playMatch = lower.match(/(?:播放|看|打开|找)\s*(.+)/);
  if (playMatch) {
    const keyword = playMatch[1].trim();
    const found = findAnimeByKeyword(keyword);
    if (found) {
      selectedAnime.value = found;
      galaxyApi?.highlightStar(found.id);
      voice.showFeedback(`已定位到「${found.titleRomaji || found.titleNative}」`);
    } else {
      voice.showFeedback(`未找到「${keyword}」`);
    }
    return;
  }

  if (lower.includes('上一部') || lower.includes('上一个')) {
    navigateSelected(-1);
    return;
  }
  if (lower.includes('下一部') || lower.includes('下一个')) {
    navigateSelected(1);
    return;
  }

  voice.showFeedback(`收到：${text}`);
}

function findAnimeByKeyword(keyword) {
  if (!data.value || !keyword) return null;
  const q = keyword.toLowerCase();
  return data.value.find(anime => {
    const fields = [
      anime.titleRomaji,
      anime.titleNative,
      anime.titleEnglish,
      ...(anime.synonyms || [])
    ].filter(Boolean).join(' ').toLowerCase();
    return fields.includes(q);
  });
}

function navigateSelected(dir) {
  if (!data.value.length) return;
  const current = selectedAnime.value;
  let idx = current ? data.value.findIndex(a => a.id === current.id) : -1;
  if (idx < 0) idx = 0;
  idx = (idx + dir + data.value.length) % data.value.length;
  const next = data.value[idx];
  selectedAnime.value = next;
  galaxyApi?.highlightStar(next.id);
}

function onFilterGenre(genre) {
  activeGenre.value = genre;
  galaxyApi?.filterByGenre(genre);
}

function onSearch(query) {
  galaxyApi?.search(query);
}

function onResetCamera() {
  galaxyApi?.resetCamera();
}

function onFocusNebula(genre) {
  galaxyApi?.focusOnGenre(genre);
}

function onToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function onLocateStar(anime) {
  if (!anime || !galaxyApi) return;
  selectedAnime.value = null;
  galaxyApi.highlightStar(anime.id);
}
</script>

<style scoped>
.phase-galaxy {
  position: absolute;
  inset: 0;
  background: var(--bg-darker);
}

#galaxy-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  cursor: grab;
}

#galaxy-canvas:active {
  cursor: grabbing;
}

.star-tooltip {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  background: rgba(5, 7, 20, 0.85);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 10px 14px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
  max-width: 240px;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tooltip-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.galaxy-loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  pointer-events: none;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 2px solid rgba(0, 243, 255, 0.2);
  border-top-color: var(--neon-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.webgl-fallback {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  pointer-events: none;
}

.webgl-fallback .fallback-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--neon-cyan);
  text-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
}

.webgl-fallback p {
  margin-bottom: 8px;
  max-width: 400px;
}

/* 手势摄像头 */
.camera-section {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  transition: all 0.3s ease;
}

.camera-container {
  position: relative;
  width: 200px;
  height: 150px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 243, 255, 0.25);
  background: rgba(5, 7, 20, 0.7);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.5);
}

.camera-section.minimized .camera-container {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.gesture-video,
.gesture-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-section.minimized .gesture-video,
.camera-section.minimized .gesture-canvas {
  opacity: 0;
}

.camera-controls {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.camera-container:hover .camera-controls,
.camera-controls:focus-within {
  opacity: 1;
}

.camera-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gesture-start {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(5, 7, 20, 0.8);
  border: 1px solid rgba(0, 243, 255, 0.3);
  color: var(--neon-cyan);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  gap: 4px;
  transition: all 0.2s ease;
}

.gesture-start:hover {
  background: rgba(0, 243, 255, 0.15);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
}

.gesture-start span {
  font-size: 24px;
}

.gesture-badge {
  padding: 6px 12px;
  border-radius: 100px;
  background: rgba(5, 7, 20, 0.85);
  border: 1px solid rgba(0, 243, 255, 0.25);
  color: var(--neon-cyan);
  font-size: 12px;
  backdrop-filter: blur(8px);
}

.gesture-error {
  max-width: 180px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 42, 109, 0.15);
  border: 1px solid rgba(255, 42, 109, 0.3);
  color: #ff7aa3;
  font-size: 12px;
}

.retry-btn {
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 42, 109, 0.4);
  background: rgba(255, 42, 109, 0.15);
  color: #ff7aa3;
  cursor: pointer;
  font-size: 11px;
}

.hand-cursor {
  position: fixed;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(0, 243, 255, 0.8);
  background: radial-gradient(circle, rgba(0, 243, 255, 0.25), transparent 70%);
  pointer-events: none;
  z-index: 40;
  opacity: 0.85;
  transition: transform 0.05s linear, border-color 0.2s ease, background 0.2s ease;
}

.hand-cursor.active {
  border-color: rgba(255, 42, 109, 0.9);
  background: radial-gradient(circle, rgba(255, 42, 109, 0.3), transparent 70%);
}

.voice-feedback {
  position: fixed;
  bottom: 190px;
  right: 20px;
  z-index: 25;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(5, 7, 20, 0.9);
  border: 1px solid rgba(0, 243, 255, 0.25);
  color: var(--neon-cyan);
  font-size: 13px;
  backdrop-filter: blur(8px);
  max-width: 240px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .camera-section {
    bottom: 12px;
    right: 12px;
  }
  .camera-container {
    width: 140px;
    height: 105px;
  }
  .voice-feedback {
    bottom: 150px;
    right: 12px;
  }
}
</style>

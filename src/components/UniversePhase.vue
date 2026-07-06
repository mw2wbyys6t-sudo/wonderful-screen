<template>
  <section class="phase-universe">
    <div class="universe-bg" :style="{ backgroundImage: `url(${baseUrl}images/generated/nebula-bg.jpg)` }"></div>
    <canvas ref="universeCanvas" id="universe-canvas"></canvas>

    <div v-if="loading && !webglError" class="universe-loading">
      <div class="loading-spinner"></div>
      <p>{{ dataLoading ? '正在加载星云数据库…' : '正在构建动漫宇宙…' }}</p>
    </div>

    <div v-if="webglError" class="webgl-fallback">
      <div class="fallback-icon">✦</div>
      <p>当前环境不支持 WebGL，无法显示 3D 宇宙。</p>
      <p>请在支持 WebGL 的浏览器（如 Chrome、Edge、Safari）中打开。</p>
    </div>

    <HUD
      v-if="hudReady"
      ref="hudRef"
      :count="dataCount"
      :voice-active="voiceActive"
      :voice-supported="voiceSupported"
      @filter-genre="onFilterGenre"
      @search="onSearch"
      @reset-camera="onResetCamera"
      @focus-nebula="onFocusNebula"
      @toggle-fullscreen="onToggleFullscreen"
      @toggle-voice="onToggleVoice"
    />

    <NodePanel
      v-if="hudReady"
      :anime="selectedAnime"
      :relations="selectedRelations"
      :visible="!!selectedAnime"
      @close="onClosePanel"
      @locate="onLocateStar"
      @focus-related="onFocusRelated"
    />

    <div v-if="hoveredAnime" class="star-tooltip" :style="tooltipStyle">
      <div class="tooltip-title">{{ hoveredAnime.titleRomaji }}</div>
      <div class="tooltip-meta">
        {{ hoveredAnime.year }} · {{ hoveredAnime.genres?.[0] }} · Score: {{ hoveredAnime.score || hoveredAnime.averageScore || 'N/A' }}
      </div>
    </div>

    <!-- 手势摄像头 -->
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
        <div v-if="!gestureError" class="gesture-badge">{{ gestureText }}</div>
        <div v-if="gestureError" class="gesture-error">
          {{ gestureError }}
          <button class="retry-btn" @click="startGesture">重试</button>
        </div>
      </template>
    </div>

    <!-- 手势光标 -->
    <div v-if="gestureReady" class="hand-cursor" :class="{ active: gestureText.includes('选择') }" :style="cursorStyle"></div>

    <!-- AI / 语音反馈 -->
    <div v-if="aiFeedback" class="ai-feedback">{{ aiFeedback }}</div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { KnowledgeEngine } from '../engines/data/KnowledgeEngine.js';
import { GalaxyEngine } from '../engines/universe/GalaxyEngine.js';
import { TimelineEngine } from '../engines/universe/TimelineEngine.js';
import { InteractionEngine } from '../engines/interaction/InteractionEngine.js';
import { GestureEngine } from '../engines/interaction/GestureEngine.js';
import { VoiceEngine } from '../engines/interaction/VoiceEngine.js';
import { AIEngine } from '../engines/ai/AIEngine.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { bus } from '../engines/core/EventBus.js';

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const NodePanel = defineAsyncComponent(() => import('./NodePanel.vue'));

const baseUrl = import.meta.env.BASE_URL;
const universeCanvas = ref(null);
const gestureVideo = ref(null);
const gestureCanvas = ref(null);
const hudRef = ref(null);

const hudReady = ref(false);
const webglError = ref('');
const loading = ref(true);
const dataLoading = ref(true);
const dataCount = ref(0);

const selectedAnime = ref(null);
const selectedRelations = ref([]);
const hoveredAnime = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const cameraMinimized = ref(false);

const gestureReady = computed(() => GestureEngine.isReady.value && GestureEngine.isRunning.value);
const gestureError = computed(() => GestureEngine.error.value);
const gestureText = computed(() => GestureEngine.gestureText.value);
const voiceActive = computed(() => VoiceEngine.isListening.value);
const voiceSupported = computed(() => VoiceEngine.isSupported.value);

const aiFeedback = ref('');
let aiFeedbackTimer = null;

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

const cursorStyle = computed(() => ({
  transform: `translate(${GestureEngine.handX.value * window.innerWidth - 20}px, ${GestureEngine.handY.value * window.innerHeight - 20}px)`
}));

let galaxyApi = null;
let cleanupFns = [];
let hoveredId = null;

onMounted(async () => {
  try {
    // 1. 加载数据
    dataLoading.value = true;
    await DataEngine.load();
    dataLoading.value = false;
    dataCount.value = DataEngine.data.value.length;

    // 2. 初始化 3D 宇宙
    galaxyApi = GalaxyEngine(universeCanvas, {
      onError: (msg) => {
        webglError.value = msg;
        loading.value = false;
      },
      onReady: () => {
        loading.value = false;
      }
    });
    const ok = galaxyApi.init();
    if (!ok) {
      webglError.value = 'WebGL 初始化失败';
      loading.value = false;
      return;
    }

    // 3. 绑定交互引擎
    InteractionEngine.init({
      canvas: universeCanvas.value,
      onPointerMove: (payload) => {
        galaxyApi.setPointerFromScreen(payload.x, payload.y);
        const id = galaxyApi.raycast();
        updateHover(id);
      },
      onSelect: () => {
        const id = galaxyApi.raycast();
        if (id) {
          galaxyApi.select(id);
        }
      },
      onZoom: (delta) => {
        galaxyApi.zoom(delta * 0.25);
      },
      onBack: () => {
        if (selectedAnime.value) {
          StateEngine.select(null);
        } else if (StateEngine.state.activeGenre) {
          StateEngine.clearFilter();
        }
      }
    });

    // 4. 全局事件监听
    cleanupFns.push(
      bus.on('input:rotate', ({ dx, dy }) => {
        galaxyApi.rotateCameraByVelocity(dx, dy);
      }),
      bus.on('input:zoom', (delta) => {
        galaxyApi.zoom(delta * 0.25);
      }),
      bus.on('input:fullscreen', () => {
        onToggleFullscreen();
      }),
      bus.on('input:select', () => {
        const id = galaxyApi.raycast();
        if (id) galaxyApi.select(id);
      }),
      bus.on('input:back', () => {
        if (selectedAnime.value) StateEngine.select(null);
        else if (StateEngine.state.activeGenre) StateEngine.clearFilter();
      }),
      bus.on('input:pointer', (payload) => {
        galaxyApi.setPointerFromScreen(payload.x, payload.y);
        const id = galaxyApi.raycast();
        updateHover(id);
      }),
      bus.on('anime:selected', (id) => {
        selectedAnime.value = id ? DataEngine.byId(id) : null;
        selectedRelations.value = id ? KnowledgeEngine.neighbors(id, null, 8) : [];
      }),
      bus.on('state:selectedId', ({ value }) => {
        selectedAnime.value = value ? DataEngine.byId(value) : null;
        selectedRelations.value = value ? KnowledgeEngine.neighbors(value, null, 8) : [];
      }),
      bus.on('state:hoveredId', ({ value }) => {
        hoveredAnime.value = value ? DataEngine.byId(value) : null;
      }),
      bus.on('state:year', ({ value }) => {
        if (value) galaxyApi.focusOnYear(value);
      }),
      bus.on('state:activeGenre', ({ value }) => {
        galaxyApi.highlightGenre(value);
      }),
      bus.on('ai:narrate', (text) => {
        showAiFeedback(text);
      }),
      bus.on('voice:text', (text) => {
        AIEngine.process(text);
      })
    );

    // 5. 绑定手势
    watch([GestureEngine.handX, GestureEngine.handY], ([x, y]) => {
      if (gestureReady.value) {
        galaxyApi.setInputMode?.('hand') || StateEngine.set('inputMode', 'hand');
        galaxyApi.setPointerFromScreen(x * window.innerWidth, y * window.innerHeight);
        const id = galaxyApi.raycast();
        updateHover(id);
      }
    });

    cleanupFns.push(
      bus.on('gesture:select', () => {
        const id = galaxyApi.raycast();
        if (id) galaxyApi.select(id);
      }),
      bus.on('gesture:back', () => {
        if (selectedAnime.value) StateEngine.select(null);
        else if (StateEngine.state.activeGenre) StateEngine.clearFilter();
      }),
      bus.on('gesture:swipe', (dir) => {
        const years = DataEngine.years.value;
        const current = StateEngine.state.year;
        if (!current) {
          StateEngine.focusYear(dir > 0 ? years[0] : years[years.length - 1]);
          return;
        }
        const idx = years.indexOf(current);
        const next = years[Math.max(0, Math.min(years.length - 1, idx + dir))];
        if (next) StateEngine.focusYear(next);
      })
    );

    // 6. 初始化语音与手势能力（不自动请求摄像头/麦克风，等用户点击按钮后再启动）
    try {
      VoiceEngine.init();
      await GestureEngine.init();
    } catch (e) {
      console.warn('[UniversePhase] 交互引擎预初始化失败:', e);
    }

    // 7. 鼠标 tooltip 备用
    const onPointerMove = (e) => {
      if (!gestureReady.value) {
        tooltipPos.value = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    cleanupFns.push(() => window.removeEventListener('pointermove', onPointerMove));

    hudReady.value = true;
  } catch (err) {
    console.error('[UniversePhase] 初始化失败:', err);
    webglError.value = '宇宙初始化失败，请刷新重试';
    loading.value = false;
  }
});

onUnmounted(() => {
  cleanupFns.forEach(fn => typeof fn === 'function' && fn());
  VoiceEngine.stop();
  GestureEngine.stop();
  galaxyApi?.dispose();
});

function updateHover(id) {
  if (hoveredId === id) return;
  hoveredId = id;
  StateEngine.hover(id);
  galaxyApi.highlightHovered(id);
}

function startGesture() {
  GestureEngine.init().then(() => {
    GestureEngine.start(gestureVideo.value, gestureCanvas.value);
  });
}

function stopGesture() {
  GestureEngine.stop();
}

function onToggleVoice() {
  VoiceEngine.toggle();
}

function onClosePanel() {
  StateEngine.select(null);
}

function onLocateStar(anime) {
  if (!anime || !galaxyApi) return;
  StateEngine.select(null);
  galaxyApi.focusOnAnime(anime.id);
}

function onFocusRelated(anime) {
  if (!anime) return;
  StateEngine.select(anime.id);
}

function onFilterGenre(genre) {
  StateEngine.filterGenre(genre);
}

function onSearch(query) {
  const results = DataEngine.search(query);
  if (results.length) {
    const first = results[0];
    StateEngine.select(first.id);
    galaxyApi.focusOnAnime(first.id);
  } else if (hudRef.value) {
    hudRef.value.showNoResult();
  }
}

function onResetCamera() {
  galaxyApi?.animateCamera?.({
    target: { x: 0, y: 0, z: 0 },
    radius: 260,
    theta: 0,
    phi: Math.PI / 2.5
  });
}

function onFocusNebula(genre) {
  StateEngine.filterGenre(genre);
}

function onToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function showAiFeedback(text) {
  aiFeedback.value = text;
  if (aiFeedbackTimer) clearTimeout(aiFeedbackTimer);
  aiFeedbackTimer = setTimeout(() => {
    aiFeedback.value = '';
  }, 3500);
}
</script>

<style scoped>
.phase-universe {
  position: absolute;
  inset: 0;
  background: var(--bg-darker);
}

.universe-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.55;
  pointer-events: none;
}

#universe-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  cursor: grab;
}

#universe-canvas:active {
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

.universe-loading {
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
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgba(240, 240, 255, 0.95);
  background: rgba(3, 3, 10, 0.72);
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.webgl-fallback .fallback-icon {
  font-size: 56px;
  margin-bottom: 20px;
  color: #00f3ff;
  text-shadow: 0 0 30px rgba(0, 243, 255, 0.6);
}

.webgl-fallback p {
  margin-bottom: 12px;
  max-width: 460px;
  font-size: 18px;
  line-height: 1.6;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}

.webgl-fallback p:last-child {
  font-size: 14px;
  color: rgba(240, 240, 255, 0.6);
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

.ai-feedback {
  position: fixed;
  bottom: 190px;
  right: 20px;
  z-index: 25;
  padding: 12px 18px;
  border-radius: 12px;
  background: rgba(5, 7, 20, 0.92);
  border: 1px solid rgba(0, 243, 255, 0.25);
  color: var(--neon-cyan);
  font-size: 13px;
  backdrop-filter: blur(8px);
  max-width: 260px;
  pointer-events: none;
  line-height: 1.5;
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
  .ai-feedback {
    bottom: 150px;
    right: 12px;
  }
}
</style>

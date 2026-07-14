<template>
  <section class="phase-universe">
    <div class="universe-bg" :style="{ backgroundImage: `url(${baseUrl}images/generated/nebula-bg.jpg)` }"></div>
    <canvas ref="universeCanvas" id="universe-canvas"></canvas>

    <div v-if="loading" class="universe-loading">
      <div class="loading-spinner"></div>
      <p>{{ dataLoading ? '正在加载星云数据库…' : '正在构建动漫宇宙…' }}</p>
    </div>

    <HUD
      v-if="hudReady"
      ref="hudRef"
      :count="dataCount"
      :voice-active="voiceActive"
      :voice-supported="voiceSupported"
      :narrator-enabled="narratorEnabled"
      :narrator-supported="narratorSupported"
      :active-year="activeYear"
      @filter-genre="onFilterGenre"
      @search="onSearch"
      @reset-camera="onResetCamera"
      @focus-nebula="onFocusNebula"
      @focus-year="onFocusYear"
      @toggle-fullscreen="onToggleFullscreen"
      @toggle-voice="onToggleVoice"
      @toggle-narrator="onToggleNarrator"
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

    <!-- 手势热区提示 -->
    <div v-if="gestureReady && !handDetected" class="gesture-hint">
      <span class="hint-icon">✋</span>
      <span>请将手移入摄像头画面</span>
    </div>

    <!-- 手势新手引导 -->
    <div v-if="showGestureGuide" class="gesture-guide" @click="closeGestureGuide">
      <div class="guide-card" @click.stop>
        <h3>手势导航指南</h3>
        <div class="guide-grid">
          <div class="guide-item">
            <div class="guide-icon">☝️</div>
            <div class="guide-title">食指移动</div>
            <div class="guide-desc">移动光标探索恒星</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">👌</div>
            <div class="guide-title">捏合手指</div>
            <div class="guide-desc">选中当前恒星</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">✊</div>
            <div class="guide-title">握拳</div>
            <div class="guide-desc">返回 / 关闭面板</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">👋</div>
            <div class="guide-title">左右挥手</div>
            <div class="guide-desc">切换年份</div>
          </div>
        </div>
        <div class="guide-tip">提示：将光标停在恒星上，会自动选中</div>
        <button class="guide-close" @click="closeGestureGuide">明白了</button>
      </div>
    </div>

    <!-- 手势光标层 -->
    <canvas v-show="gestureReady" ref="cursorCanvas" class="cursor-layer"></canvas>

    <!-- AI / 语音反馈 -->
    <div v-if="aiFeedback" class="ai-feedback">{{ aiFeedback }}</div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { KnowledgeEngine } from '../engines/data/KnowledgeEngine.js';
import { GalaxyEngine } from '../engines/universe/GalaxyEngine.js';
import { SpiralUniverse } from '../engines/universe/SpiralUniverse.js';
import { TimelineEngine } from '../engines/universe/TimelineEngine.js';
import { InteractionEngine } from '../engines/interaction/InteractionEngine.js';
import { GestureEngine } from '../engines/interaction/GestureEngine.js';
import { VoiceEngine } from '../engines/interaction/VoiceEngine.js';
import { AIEngine } from '../engines/ai/AIEngine.js';
import { VoiceNarrator } from '../engines/ai/VoiceNarrator.js';
import { VoicePlayer } from '../composables/useVoice.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { bus } from '../engines/core/EventBus.js';
import { FeedbackEngine } from '../engines/feedback/FeedbackEngine.js';
import { GestureActionEngine } from '../engines/interaction/GestureActionEngine.js';

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const NodePanel = defineAsyncComponent(() => import('./NodePanel.vue'));

const baseUrl = import.meta.env.BASE_URL;
const universeCanvas = ref(null);
const gestureVideo = ref(null);
const gestureCanvas = ref(null);
const cursorCanvas = ref(null);
const hudRef = ref(null);

const hudReady = ref(false);
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
const handDetected = computed(() => GestureEngine.handDetected.value);
const voiceActive = computed(() => VoiceEngine.isListening.value);
const voiceSupported = computed(() => VoiceEngine.isSupported.value);
const narratorEnabled = computed(() => !VoiceNarrator.muted);
const narratorSupported = computed(() => VoicePlayer.isSupported.value);
const activeYear = computed(() => StateEngine.state.year);
const showGestureGuide = ref(false);
const GUIDE_STORAGE_KEY = 'animeverse-gesture-guide-seen';

const aiFeedback = ref('');
let aiFeedbackTimer = null;

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

let galaxyApi = null;
let spiralApi = null;
let cleanupFns = [];
let hoveredId = null;
let lastDwellId = null;
let hoverStartTime = 0;
let dwellTimer = null;
let dwellProgress = 0;
const DWELL_SELECT_MS = 900; // 手势悬停停留选择阈值
const isFallback2D = ref(false);

onMounted(async () => {
  try {
    // 1. 加载数据
    dataLoading.value = true;
    await DataEngine.load();
    dataLoading.value = false;
    dataCount.value = DataEngine.data.value.length;

    // 1.5 初始化 AI 引擎与语音导游（数据未完全加载也可先绑定事件）
    AIEngine.init();
    VoiceNarrator.init();
    VoiceNarrator.muted = StateEngine.state.narratorMuted;

    // 2. 初始化 3D 宇宙；若失败则自动降级到 2D 螺旋宇宙
    let webglOk = false;
    try {
      galaxyApi = GalaxyEngine(universeCanvas, {
        onError: (msg) => {
          console.warn('[UniversePhase] WebGL 错误:', msg);
        },
        onReady: () => {
          loading.value = false;
        }
      });
      webglOk = galaxyApi.init();
      if (!webglOk) throw new Error('WebGL init returned false');
    } catch (err) {
      console.warn('[UniversePhase] WebGL 不可用，自动降级到 2D 螺旋宇宙:', err);
      webglOk = false;
      // 彻底丢弃失败的 galaxyApi，避免后续统一接口误调用
      if (galaxyApi) {
        try { galaxyApi.dispose?.(); } catch (e) {}
        galaxyApi = null;
      }
    }

    if (!webglOk) {
      isFallback2D.value = true;
      spiralApi = new SpiralUniverse(universeCanvas.value);
      await spiralApi.init();
      spiralApi.start();
      spiralApi.onNodeHover = (node) => {
        updateHover(node ? node.id : null);
      };
      spiralApi.onNodeClick = (node) => {
        if (node) StateEngine.select(node.id);
      };
      loading.value = false;
    }

    // 3. 绑定交互引擎
    // 注：鼠标/手势/键盘动作统一走 bus 事件，避免回调与 bus 监听重复执行
    InteractionEngine.init({
      canvas: universeCanvas.value
    });

    // 4. 全局事件监听
    cleanupFns.push(
      bus.on('input:rotate', ({ dx, dy }) => {
        apiRotate(dx, dy);
      }),
      bus.on('input:zoom', (delta) => {
        apiZoom(delta);
      }),
      bus.on('input:fullscreen', () => {
        onToggleFullscreen();
      }),
      bus.on('input:select', () => {
        const id = apiRaycast();
        if (id) apiSelect(id);
      }),
      bus.on('input:back', () => {
        if (selectedAnime.value) StateEngine.select(null);
        else if (StateEngine.state.activeGenre) StateEngine.clearFilter();
      }),
      bus.on('input:pointer', (payload) => {
        apiSetPointer(payload.x, payload.y);
        const id = apiRaycast();
        updateHover(id);

        // 手势模式下：光标跟随手部，并触发悬停停留选择
        if (StateEngine.state.inputMode === 'hand') {
          tooltipPos.value = { x: payload.x, y: payload.y };
          updateDwellSelection(id);
        }
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
        if (value) apiFocusYear(value);
      }),
      bus.on('state:activeGenre', ({ value }) => {
        apiHighlightGenre(value);
      }),
      bus.on('ai:narrate', (text) => {
        showAiFeedback(text);
      }),
      bus.on('voice:text', (text) => {
        AIEngine.process(text);
      }),
      bus.on('action:search', (query) => {
        onSearch(query);
      }),
      bus.on('action:reset-camera', () => {
        onResetCamera();
      })
    );

    // 5. 知识图谱后台加载完成后，若已选中恒星则刷新关系
    watch(DataEngine.graphLoaded, (ready) => {
      if (ready && selectedAnime.value) {
        selectedRelations.value = KnowledgeEngine.neighbors(selectedAnime.value.id, null, 8);
      }
    });

    // 6. 绑定手势就绪状态
    watch(gestureReady, (ready) => {
      apiSetHandControl(ready);
    });

    // 初始化语音与手势能力（不自动请求摄像头/麦克风，等用户点击按钮后再启动）
    try {
      VoiceEngine.init();
      await GestureEngine.init();
      if (cursorCanvas.value) {
        FeedbackEngine.init(cursorCanvas.value);
      }
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
    // 即使整体初始化失败，也尝试降级到 2D 宇宙
    try {
      isFallback2D.value = true;
      spiralApi = new SpiralUniverse(universeCanvas.value);
      await spiralApi.init();
      spiralApi.start();
      spiralApi.onNodeHover = (node) => updateHover(node ? node.id : null);
      spiralApi.onNodeClick = (node) => { if (node) StateEngine.select(node.id); };
    } catch (e2) {
      console.error('[UniversePhase] 2D 降级也失败了:', e2);
    }
    loading.value = false;
  }
});

// ===== 统一操作接口（兼容3D和2D降级模式） =====
function apiAvailable() {
  return galaxyApi || spiralApi;
}

function apiSetPointer(x, y) {
  if (galaxyApi) galaxyApi.setPointerFromScreen?.(x, y);
  else if (spiralApi) spiralApi.setPointerFromScreen(x, y);
}

function apiRaycast() {
  if (galaxyApi) return galaxyApi.raycast?.();
  return spiralApi?.hoveredNode?.id || null;
}

function apiSelect(id) {
  if (galaxyApi) galaxyApi.select?.(id);
  else if (spiralApi && id) spiralApi.focusOnNode(id);
}

function apiZoom(delta) {
  if (galaxyApi) galaxyApi.zoom?.(delta * 0.25);
  else if (spiralApi) {
    const factor = delta > 0 ? 0.9 : 1.1;
    spiralApi.gestureZoom(factor, window.innerWidth / 2, window.innerHeight / 2);
  }
}

function apiRotate(dx, dy) {
  if (galaxyApi) galaxyApi.rotateCameraByVelocity?.(dx, dy);
  else if (spiralApi) spiralApi.gestureMove(dx, dy);
}

function apiHighlightHovered(id) {
  if (galaxyApi) galaxyApi.highlightHovered?.(id);
  // 2D模式下hover由内部事件驱动
}

function apiFocusAnime(id) {
  if (galaxyApi) galaxyApi.focusOnAnime?.(id);
  else if (spiralApi) spiralApi.focusOnNode(id);
}

function apiHighlightGenre(genre) {
  if (galaxyApi) galaxyApi.highlightGenre?.(genre);
  else if (spiralApi) spiralApi.focusOnGenre(genre);
}

function apiFocusYear(year) {
  if (galaxyApi) galaxyApi.focusOnYear?.(year);
  // 2D模式下暂时不支持按年份聚焦
}

function apiSetHandControl(ready) {
  if (galaxyApi) galaxyApi.setHandControl?.(ready);
  // 2D模式下手势控制由gestureMove/gestureZoom处理
}

function apiSetInputMode(mode) {
  if (galaxyApi) galaxyApi.setInputMode?.(mode);
  StateEngine.set('inputMode', mode);
}

function apiAnimateCamera(config) {
  if (galaxyApi) galaxyApi.animateCamera?.(config);
  else if (spiralApi) spiralApi.resetView();
}

function apiDispose() {
  if (galaxyApi) galaxyApi.dispose?.();
  if (spiralApi) spiralApi.destroy?.();
}

onUnmounted(() => {
  cleanupFns.forEach(fn => typeof fn === 'function' && fn());
  if (dwellTimer) clearInterval(dwellTimer);
  VoiceEngine.stop();
  GestureEngine.stop();
  FeedbackEngine.dispose();
  apiDispose();
});

function updateHover(id) {
  if (hoveredId === id) return;
  hoveredId = id;
  StateEngine.hover(id);
  apiHighlightHovered(id);
}

function updateDwellSelection(id) {
  // 仅在无详情面板、有真实悬停目标、且处于手势模式时启用停留选择
  if (selectedAnime.value || !id) {
    if (dwellTimer) {
      clearInterval(dwellTimer);
      dwellTimer = null;
    }
    lastDwellId = null;
    dwellProgress = 0;
    bus.emit('gesture:dwell-progress', 0);
    return;
  }

  if (lastDwellId !== id) {
    lastDwellId = id;
    hoverStartTime = performance.now();
    dwellProgress = 0;
    bus.emit('gesture:dwell-progress', 0);
  }

  if (!dwellTimer) {
    dwellTimer = setInterval(() => {
      const elapsed = performance.now() - hoverStartTime;
      dwellProgress = Math.min(1, elapsed / DWELL_SELECT_MS);
      bus.emit('gesture:dwell-progress', dwellProgress);
      if (dwellProgress >= 1) {
        clearInterval(dwellTimer);
        dwellTimer = null;
        apiSelect(lastDwellId);
        bus.emit('gesture:dwell-complete');
      }
    }, 50);
  }
}

function startGesture() {
  GestureEngine.init().then(() => {
    GestureEngine.start(gestureVideo.value, gestureCanvas.value);
    // 首次开启手势时显示新手引导
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(GUIDE_STORAGE_KEY)) {
      showGestureGuide.value = true;
    }
  });
}

function stopGesture() {
  GestureEngine.stop();
  showGestureGuide.value = false;
}

function closeGestureGuide() {
  showGestureGuide.value = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(GUIDE_STORAGE_KEY, '1');
  }
}

function onToggleVoice() {
  VoiceEngine.toggle();
}

function onToggleNarrator() {
  const muted = VoiceNarrator.toggleMute();
  StateEngine.set('narratorMuted', muted);
}

function onClosePanel() {
  StateEngine.select(null);
}

function onLocateStar(anime) {
  if (!anime || !apiAvailable()) return;
  StateEngine.select(null);
  apiFocusAnime(anime.id);
}

function onFocusRelated(anime) {
  if (!anime) return;
  StateEngine.select(anime.id);
}

function onFilterGenre(genre) {
  StateEngine.filterGenre(genre);
}

function onFocusYear(year) {
  if (year) StateEngine.focusYear(year);
  else StateEngine.set('year', null);
}

function onSearch(query) {
  const results = DataEngine.search(query);
  if (results.length) {
    // 搜索反馈：通知 HUD 显示结果数量
    if (hudRef.value) hudRef.value.showSearchResult(query, results.length);

    // 多结果模式：聚焦第一个并高亮所有命中
    if (results.length > 1 && spiralApi) {
      spiralApi.focusOnSearchResults(results);
      StateEngine.select(results[0].id);
    } else {
      const first = results[0];
      StateEngine.select(first.id);
      apiFocusAnime(first.id);
    }
  } else if (hudRef.value) {
    hudRef.value.showNoResult();
  }
}

function onResetCamera() {
  apiAnimateCamera({
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

.cursor-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 40;
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

/* 手势热区提示 */
.gesture-hint {
  position: fixed;
  bottom: 180px;
  right: 20px;
  z-index: 26;
  padding: 10px 16px;
  border-radius: 100px;
  background: rgba(5, 7, 20, 0.9);
  border: 1px solid rgba(0, 243, 255, 0.35);
  color: var(--neon-cyan);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.15);
  animation: hintPulse 2s ease-in-out infinite;
  pointer-events: none;
}

.hint-icon {
  font-size: 16px;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.85; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}

/* 手势新手引导 */
.gesture-guide {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  animation: guideFadeIn 0.3s ease;
}

@keyframes guideFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.guide-card {
  width: min(520px, 90vw);
  padding: 28px 32px;
  border-radius: 20px;
  background: rgba(5, 7, 20, 0.95);
  border: 1px solid rgba(0, 243, 255, 0.25);
  box-shadow: 0 0 40px rgba(0, 243, 255, 0.15), inset 0 0 20px rgba(0, 243, 255, 0.05);
  color: #fff;
  text-align: center;
}

.guide-card h3 {
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 700;
  color: var(--neon-cyan);
  letter-spacing: 2px;
  text-shadow: 0 0 12px rgba(0, 243, 255, 0.4);
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.guide-item {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.guide-item:hover {
  background: rgba(0, 243, 255, 0.08);
  border-color: rgba(0, 243, 255, 0.25);
}

.guide-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.guide-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--neon-cyan);
  margin-bottom: 4px;
}

.guide-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.guide-tip {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(255, 253, 117, 0.08);
  border: 1px solid rgba(255, 253, 117, 0.2);
}

.guide-close {
  padding: 12px 40px;
  border-radius: 8px;
  border: 1px solid rgba(0, 243, 255, 0.5);
  background: rgba(0, 243, 255, 0.1);
  color: var(--neon-cyan);
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-close:hover {
  background: rgba(0, 243, 255, 0.2);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.25);
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
  .gesture-hint {
    bottom: 140px;
    right: 12px;
    font-size: 11px;
    padding: 8px 12px;
  }
  .guide-card {
    padding: 20px 18px;
  }
  .guide-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .guide-card h3 {
    font-size: 18px;
  }
}
</style>

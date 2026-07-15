<template>
  <div class="hud" :class="{ 'panel-open': !!anime }">
    <div class="hud-top">
      <div class="hud-brand">
        <span class="logo-mark">AV</span>
        <span class="brand-text">动漫宇宙 <em>AnimeVerse</em></span>
      </div>
      <div class="hud-controls">
        <button class="ctrl-btn" :class="{ active: voiceActive }" @click="$emit('toggle-voice')" :title="voiceActive ? '关闭语音' : '开启语音'">
          <span class="ctrl-ico">🎤</span>
        </button>
        <button class="ctrl-btn" :class="{ active: !narratorEnabled }" @click="$emit('toggle-narrator')" :title="narratorEnabled ? '静音解说' : '开启解说'">
          <span class="ctrl-ico">{{ narratorEnabled ? '🔊' : '🔇' }}</span>
        </button>
        <button class="ctrl-btn" @click="$emit('toggle-fullscreen')" title="全屏">
          <span class="ctrl-ico">⛶</span>
        </button>
        <button class="ctrl-btn help-btn" @click="showHelp = true" title="帮助">?</button>
      </div>
    </div>

    <div class="hud-genres" v-if="!anime">
      <button 
        class="genre-chip" 
        :class="{ active: !activeGenre }"
        @click="$emit('filter-genre', null)"
      >全部</button>
      <button 
        v-for="g in visibleGenres" 
        :key="g"
        class="genre-chip"
        :class="{ active: activeGenre === g }"
        :style="{ '--chip-color': genreColors[g] || '#c9b1ff' }"
        @click="$emit('filter-genre', g)"
      >{{ g }}</button>
      <button class="genre-chip year-chip" v-if="activeYear" @click="$emit('focus-year', null)">
        {{ activeYear }}年代 <span class="chip-clear">×</span>
      </button>
    </div>

    <div class="hud-bottom">
      <div class="hud-gesture-hint" v-if="inputMode === 'hand' && !anime">
        <span class="hint-icon">✋</span>
        <span class="hint-text">{{ currentHint }}</span>
        <span class="dwell-bar" v-if="dwellProgress > 0">
          <span class="dwell-fill" :style="{ width: dwellProgress * 100 + '%' }"></span>
        </span>
      </div>
      <div class="hud-gesture-hint" v-else-if="inputMode === 'voice'">
        <span class="hint-icon">🎙️</span>
        <span class="hint-text">说出指令，如「下一年」「龙珠」「返回」</span>
      </div>

      <div class="hud-status" v-if="!anime">
        <span class="stat-badge"><em>{{ count }}</em> 颗恒星</span>
      </div>
    </div>

    <div class="gesture-indicator" v-if="inputMode === 'hand' && currentGesture">
      <span class="indicator-icon">{{ gestureIcons[currentGesture] || '✋' }}</span>
      <span class="indicator-text">{{ gestureNames[currentGesture] || currentGesture }}</span>
    </div>

    <transition name="toast">
      <div class="action-toast" v-if="toastMessage">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { bus } from '../engines/core/EventBus.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';

const props = defineProps({
  count: { type: Number, default: 0 },
  voiceActive: { type: Boolean, default: false },
  voiceSupported: { type: Boolean, default: true },
  narratorEnabled: { type: Boolean, default: true },
  narratorSupported: { type: Boolean, default: true },
  activeYear: { type: Number, default: null }
});

defineEmits([
  'filter-genre', 'search', 'reset-camera', 'focus-nebula',
  'focus-year', 'toggle-fullscreen', 'toggle-voice', 'toggle-narrator'
]);

const showHelp = ref(false);
const currentGesture = ref(null);
const dwellProgress = ref(0);
const toastMessage = ref('');
let toastTimer = null;
let idleTimer = null;

const inputMode = computed(() => StateEngine.state.inputMode);
const activeGenre = computed(() => StateEngine.state.activeGenre);
const anime = computed(() => StateEngine.state.selectedId ? DataEngine.byId(StateEngine.state.selectedId) : null);

const allGenres = computed(() => {
  const g = new Set();
  DataEngine.data.value?.forEach(a => a.genres?.forEach(x => g.add(x)));
  return [...g].slice(0, 10);
});

const visibleGenres = computed(() => allGenres.value.slice(0, 8));

const genreColors = {
  'Action': '#ef4444',
  'Adventure': '#f59e0b',
  'Comedy': '#eab308',
  'Drama': '#8b5cf6',
  'Fantasy': '#06b6d4',
  'Romance': '#ec4899',
  'Sci-Fi': '#3b82f6',
  'Slice of Life': '#10b981',
  'Sports': '#f97316',
  'Supernatural': '#a855f7',
  'Mystery': '#6366f1',
  'Thriller': '#dc2626'
};

const gestureIcons = {
  pinch: '🤏',
  fist: '✊',
  open: '🖐️',
  point: '☝️',
  wave: '👋',
  swipe: '👉',
  pinching: '🤏',
  swiping: '👋'
};

const gestureNames = {
  pinch: '捏合选择',
  pinching: '准备选择',
  fist: '握拳返回',
  open: '张开返回',
  point: '指向探索',
  wave: '挥手切换',
  swipe: '挥手切换',
  swiping: '挥手切换',
  pointing: '指向探索'
};

const currentHint = computed(() => {
  if (anime.value) return '握拳返回列表';
  if (activeGenre.value) return `筛选「${activeGenre.value}」· 捏合选择 · 握拳返回`;
  if (activeYear.value) return `${activeYear.value}年代 · 左右挥手切换年份`;
  return '捏合选择恒星 · 挥手切换年份 · 握拳返回';
});

function showToast(msg) {
  toastMessage.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastMessage.value = '', 2000);
}

function onGestureRecognized(g) {
  currentGesture.value = g;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    currentGesture.value = null;
  }, 800);
}

const handlers = {
  'gesture:recognized': onGestureRecognized,
  'gesture:idle': () => { currentGesture.value = null; },
  'gesture:dwell-progress': (p) => { dwellProgress.value = p; },
  'toast': (msg) => showToast(msg),
  'state:selectedId': () => {}
};

onMounted(() => {
  Object.entries(handlers).forEach(([e, fn]) => bus.on(e, fn));
});

onUnmounted(() => {
  Object.entries(handlers).forEach(([e, fn]) => bus.off(e, fn));
  if (toastTimer) clearTimeout(toastTimer);
  if (idleTimer) clearTimeout(idleTimer);
});

function showSearchResult() {}
function showNoResult() {}

defineExpose({ showSearchResult, showNoResult });
</script>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  padding: 16px 24px 20px;
  transition: padding-right 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.hud.panel-open {
  padding-right: 480px;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.hud-brand {
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff9ec4 0%, #c9b1ff 100%);
  color: #140a28;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: -0.5px;
  box-shadow: 0 4px 16px rgba(255, 158, 196, 0.4);
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #ffe4ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.brand-text em {
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  display: block;
  background: linear-gradient(135deg, #ff9ec4 0%, #c9b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 2px;
}

.hud-controls {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.ctrl-btn {
  pointer-events: auto;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 158, 196, 0.2);
  color: #ffb7d0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.25s;
}

.ctrl-btn:hover {
  background: rgba(255, 158, 196, 0.15);
  border-color: rgba(255, 158, 196, 0.4);
  transform: translateY(-2px);
  color: #fff;
}

.ctrl-btn.active {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.3) 0%, rgba(201, 177, 255, 0.3) 100%);
  border-color: rgba(255, 158, 196, 0.5);
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.3);
  color: #fff;
}

.ctrl-btn.help-btn {
  font-family: Georgia, serif;
  font-weight: 700;
  font-size: 17px;
}

.hud-genres {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: auto;
}

.genre-chip {
  padding: 7px 16px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 158, 196, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  pointer-events: auto;
}

.genre-chip:hover {
  background: rgba(255, 158, 196, 0.12);
  color: #fff;
  transform: translateY(-1px);
}

.genre-chip.active {
  background: var(--chip-color, linear-gradient(135deg, #ff9ec4, #c9b1ff));
  color: #140a28;
  border-color: transparent;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--chip-color, #ff9ec4) 40%, transparent);
  font-weight: 600;
}

.year-chip {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 158, 196, 0.2));
  border-color: rgba(255, 215, 0, 0.4);
  color: #ffd700;
}

.chip-clear {
  margin-left: 4px;
  opacity: 0.7;
}

.hud-bottom {
  position: absolute;
  bottom: 20px;
  left: 24px;
  right: 240px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.hud-gesture-hint {
  pointer-events: none;
  background: rgba(20, 10, 40, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 158, 196, 0.25);
  padding: 10px 18px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  min-width: 240px;
  max-width: 380px;
  position: relative;
  overflow: hidden;
}

.hint-icon {
  font-size: 22px;
  animation: pulse 2s ease-in-out infinite;
}

.hint-text {
  flex: 1;
  line-height: 1.4;
}

.dwell-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 14px 14px;
  overflow: hidden;
}

.dwell-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff);
  transition: width 0.1s linear;
}

.hud-status {
  display: flex;
  gap: 10px;
  align-items: center;
  pointer-events: none;
}

.stat-badge {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  padding: 9px 16px;
  border-radius: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 158, 196, 0.15);
}

.stat-badge em {
  font-style: normal;
  font-weight: 700;
  font-size: 17px;
  color: #ff9ec4;
  margin-right: 4px;
}

.gesture-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(20, 10, 40, 0.85);
  backdrop-filter: blur(16px);
  border: 2px solid rgba(255, 158, 196, 0.5);
  padding: 14px 24px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  animation: gesturePop 0.3s ease-out;
  z-index: 150;
}

.indicator-icon {
  font-size: 32px;
}

.indicator-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.action-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.92), rgba(201, 177, 255, 0.92));
  backdrop-filter: blur(16px);
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #140a28;
  box-shadow: 0 8px 32px rgba(255, 158, 196, 0.5);
  pointer-events: none;
  z-index: 200;
}

.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastOut 0.3s ease-in forwards;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@keyframes gesturePop {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes toastIn {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
}

@keyframes toastOut {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(-10px); }
}

@media (max-width: 768px) {
  .hud {
    padding: 12px 16px 16px;
  }
  
  .hud.panel-open {
    padding-right: 16px;
  }
  
  .brand-text {
    font-size: 16px;
  }
  
  .brand-text em {
    display: none;
  }
  
  .hud-controls {
    gap: 6px;
  }
  
  .ctrl-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .hud-genres {
    margin-top: 10px;
    gap: 6px;
  }
  
  .genre-chip {
    padding: 5px 12px;
    font-size: 11px;
  }
  
  .hud-bottom {
    left: 16px;
    right: 16px;
    bottom: 16px;
    flex-direction: column;
    align-items: stretch;
  }
  
  .hud-gesture-hint {
    min-width: auto;
    max-width: none;
    padding: 9px 14px;
    font-size: 12px;
  }
}
</style>

<template>
  <div class="hud">
    <div class="hud-top">
      <div class="hud-logo">AnimeVerse</div>
      <input
        type="text"
        class="hud-search"
        placeholder="搜索作品 / 流派 / 标签 / 工作室…"
        v-model="searchText"
        @keydown.enter="emitSearch"
      >
      <div class="hud-chips">
        <div
          v-for="(info, genre) in genres"
          :key="genre"
          class="hud-chip"
          :class="{ active: activeGenre === genre }"
          :style="chipStyle(genre, info.color)"
          @click="toggleGenre(genre)"
        >
          <span class="chip-dot" :style="{ background: info.color }"></span>
          {{ genre }}
        </div>
      </div>
    </div>
    <div class="hud-actions">
      <div class="hud-action-group">
        <button title="重置视角 (R)" @click="emit('reset-camera')">⟲</button>
        <button title="星云定位" @click="showNebula = !showNebula" :class="{ active: showNebula }">◎</button>
        <div v-if="showNebula" class="nebula-popover" @click.stop>
          <div class="nebula-title">定位星云</div>
          <div class="nebula-chips">
            <div
              v-for="(info, genre) in genres"
              :key="genre"
              class="nebula-chip"
              :style="{ borderColor: info.color, color: info.color }"
              @click="focusNebula(genre)"
            >
              {{ genre }}
            </div>
          </div>
        </div>
      </div>

      <div class="hud-action-group year-nav">
        <button title="上一年" :disabled="!activeYear && !years.length" @click="stepYear(-1)">‹</button>
        <button
          title="年份导航"
          class="year-btn"
          :class="{ active: showYearPicker || activeYear }"
          @click="showYearPicker = !showYearPicker"
        >
          {{ activeYear || '年份' }}
        </button>
        <button title="下一年" :disabled="!activeYear && !years.length" @click="stepYear(1)">›</button>
        <div v-if="showYearPicker" class="year-popover" @click.stop>
          <div class="year-title">穿越到</div>
          <div class="year-list">
            <div
              v-for="year in years"
              :key="year"
              class="year-chip"
              :class="{ active: activeYear === year }"
              @click="focusYear(year)"
            >
              {{ year }}
            </div>
          </div>
        </div>
      </div>
      <button title="音乐" @click="toggleMusic">♪</button>
      <button
        v-if="voiceSupported"
        title="语音"
        class="voice-btn"
        :class="{ active: voiceActive }"
        :aria-pressed="voiceActive"
        @click="emit('toggle-voice')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>
      <button
        v-if="narratorSupported"
        title="语音播报"
        class="narrator-btn"
        :class="{ active: narratorEnabled, muted: !narratorEnabled }"
        :aria-pressed="narratorEnabled"
        @click="emit('toggle-narrator')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>
      <button title="帮助" @click="showHelp = !showHelp">?</button>
    </div>
    <div class="hud-counter">{{ count }} 颗恒星已点亮</div>
    <div v-if="gestureState" class="gesture-status">
      <div class="gesture-status-title">🖐 手势控制中</div>
      <div
        v-for="item in gestureItems"
        :key="item.state"
        class="gesture-status-item"
        :class="{ active: gestureState === item.state }"
        :style="gestureState === item.state ? { color: item.color, borderColor: item.color } : {}"
      >
        <span class="gesture-dot" :style="{ background: item.color }"></span>
        {{ item.label }}
      </div>
    </div>
    <transition name="fade">
      <div v-if="noResult" class="hud-toast">未找到结果</div>
    </transition>
    <transition name="fade">
      <div v-if="searchResultText" class="hud-toast hud-toast--success">{{ searchResultText }}</div>
    </transition>
    <div v-if="showHelp" class="help-panel" @click="showHelp = false">
      <div class="help-content" @click.stop>
        <h3>操作指南</h3>
        <p>拖拽：旋转宇宙视角</p>
        <p>滚轮：缩放</p>
        <p>点击恒星：查看作品详情</p>
        <p>顶部芯片：按流派筛选</p>
        <p>搜索框：Enter 或停顿 300ms 自动搜索</p>
        <p>ESC：关闭详情 · R：重置视角 · F：全屏</p>
        <p>手势：右下角开启摄像头，食指移动光标，捏合选择，握拳返回，挥手切换年份</p>
        <p>语音：点击麦克风按钮，说「带我去2008年」「推荐治愈番」「看进击的巨人」「返回」</p>
        <button @click="showHelp = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useData } from '../composables/useData.js';
import { useAudio } from '../composables/useAudio.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';
import { bus } from '../engines/core/EventBus.js';

const props = defineProps({
  count: { type: Number, default: 0 },
  voiceActive: { type: Boolean, default: false },
  voiceSupported: { type: Boolean, default: false },
  narratorEnabled: { type: Boolean, default: true },
  narratorSupported: { type: Boolean, default: false },
  activeYear: { type: Number, default: null }
});
const emit = defineEmits(['filter-genre', 'search', 'reset-camera', 'focus-nebula', 'focus-year', 'toggle-fullscreen', 'toggle-voice', 'toggle-narrator']);

const { genres } = useData();
const { toggle: toggleMusic } = useAudio();

const searchText = ref('');
const activeGenre = ref(StateEngine.state.activeGenre);
const showHelp = ref(false);
const showNebula = ref(false);
const showYearPicker = ref(false);
const noResult = ref(false);
const searchResultText = ref('');
const gestureState = ref('');
const years = computed(() => DataEngine.years.value);

const gestureItems = [
  { state: 'pointing', label: '指向', color: '#00f3ff' },
  { state: 'pinching', label: '捏合 · 选择', color: '#fffd75' },
  { state: 'fist', label: '握拳 · 返回', color: '#ff2a6d' },
  { state: 'open', label: '张开 · 返回', color: '#b892ff' },
  { state: 'swiping', label: '挥手 · 切年份', color: '#00f3ff' }
];

let noResultTimeout = null;
let searchResultTimeout = null;
let searchDebounce = null;
let unsubscribe = null;
let gestureUnsubscribe = null;

onMounted(() => {
  unsubscribe = bus.on('state:activeGenre', ({ value }) => {
    activeGenre.value = value;
  });
  gestureUnsubscribe = bus.on('gesture:state', ({ state }) => {
    gestureState.value = state || '';
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  if (gestureUnsubscribe) gestureUnsubscribe();
});

function chipStyle(genre, color) {
  const isActive = activeGenre.value === genre;
  return {
    borderColor: color,
    background: isActive ? `${color}33` : undefined,
    color: isActive ? color : undefined,
    boxShadow: isActive ? `0 0 12px ${color}66, inset 0 0 8px ${color}22` : undefined
  };
}

function toggleGenre(genre) {
  activeGenre.value = activeGenre.value === genre ? null : genre;
  emit('filter-genre', activeGenre.value);
}

function emitSearch() {
  emit('search', searchText.value);
}

function focusNebula(genre) {
  showNebula.value = false;
  emit('focus-nebula', genre);
}

function focusYear(year) {
  showYearPicker.value = false;
  emit('focus-year', year);
}

function stepYear(dir) {
  if (!years.value.length) return;
  const current = props.activeYear;
  if (!current) {
    emit('focus-year', dir > 0 ? years.value[0] : years.value[years.value.length - 1]);
    return;
  }
  const idx = years.value.indexOf(current);
  const next = years.value[Math.max(0, Math.min(years.value.length - 1, idx + dir))];
  if (next && next !== current) emit('focus-year', next);
}

function showNoResult() {
  noResult.value = true;
  searchResultText.value = '';
  if (noResultTimeout) clearTimeout(noResultTimeout);
  noResultTimeout = setTimeout(() => {
    noResult.value = false;
  }, 2000);
}

function showSearchResult(query, count) {
  noResult.value = false;
  searchResultText.value = `找到 ${count} 颗恒星`;
  if (searchResultTimeout) clearTimeout(searchResultTimeout);
  searchResultTimeout = setTimeout(() => {
    searchResultText.value = '';
  }, 2500);
}

watch(searchText, (val) => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    emit('search', val);
  }, 300);
});

defineExpose({ showNoResult, showSearchResult });
</script>

<style scoped>
@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes pastelPulse {
  0%, 100% { box-shadow: 0 0 12px rgba(255, 158, 196, 0.3), 0 0 24px rgba(201, 177, 255, 0.2); }
  50% { box-shadow: 0 0 20px rgba(255, 158, 196, 0.5), 0 0 36px rgba(201, 177, 255, 0.35); }
}

.hud {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.hud > * {
  pointer-events: auto;
}

.hud-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 40px;
  display: flex;
  align-items: center;
  gap: 20px;
  background: linear-gradient(180deg, rgba(20, 10, 40, 0.6) 0%, transparent 100%);
}

.hud-logo {
  font-family: 'Orbitron', sans-serif;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff9ec4, #c9b1ff, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 8px rgba(255, 158, 196, 0.6)) drop-shadow(0 0 16px rgba(201, 177, 255, 0.4));
  white-space: nowrap;
  position: relative;
  animation: float 3s ease-in-out infinite;
}

.hud-logo::before {
  content: '✦';
  position: absolute;
  left: -18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #ffd700;
  -webkit-text-fill-color: #ffd700;
  animation: sparkle 2s ease-in-out infinite;
}

.hud-logo::after {
  content: '✧';
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #ff9ec4;
  -webkit-text-fill-color: #ff9ec4;
  animation: sparkle 2.5s ease-in-out infinite 0.5s;
}

.hud-search {
  flex: 1;
  max-width: 320px;
  padding: 10px 18px;
  border-radius: 24px;
  border: 2px solid rgba(255, 158, 196, 0.4);
  background: rgba(20, 10, 40, 0.6);
  color: var(--text-primary);
  outline: none;
  font-size: 13px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.hud-search::placeholder {
  color: rgba(255, 182, 216, 0.6);
}

.hud-search:focus {
  border-color: #ff9ec4;
  background: rgba(30, 15, 60, 0.8);
  box-shadow: 0 0 16px rgba(255, 158, 196, 0.35), 0 0 32px rgba(201, 177, 255, 0.2), inset 0 0 12px rgba(255, 158, 196, 0.1);
}

.hud-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hud-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 2px solid rgba(255, 158, 196, 0.3);
  background: rgba(20, 10, 40, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: rgba(255, 240, 255, 0.85);
  backdrop-filter: blur(6px);
}

.hud-chip:hover {
  border-color: rgba(255, 158, 196, 0.6);
  background: rgba(255, 158, 196, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 158, 196, 0.25);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.hud-actions {
  position: absolute;
  top: 20px;
  right: 40px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.hud-action-group {
  position: relative;
  display: flex;
  gap: 10px;
}

.hud-action-group.year-nav {
  gap: 6px;
}

.hud-action-group.year-nav button:first-child,
.hud-action-group.year-nav button:last-child {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 20px;
  border-radius: 50%;
}

.hud-actions button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(201, 177, 255, 0.35);
  background: rgba(20, 10, 40, 0.6);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  backdrop-filter: blur(8px);
}

.hud-actions button:hover {
  border-color: #ff9ec4;
  background: rgba(255, 158, 196, 0.15);
  box-shadow: 0 0 16px rgba(255, 158, 196, 0.4), 0 0 32px rgba(201, 177, 255, 0.2);
  transform: scale(1.08);
}

.hud-actions button.active {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.25), rgba(201, 177, 255, 0.25));
  border-color: #ff9ec4;
  box-shadow: 0 0 16px rgba(255, 158, 196, 0.5), 0 0 32px rgba(201, 177, 255, 0.3);
  color: #fff;
}

.hud-actions .voice-btn {
  position: relative;
}

.hud-actions .voice-btn::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec4, #c9b1ff);
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.hud-actions .voice-btn.active {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.3), rgba(255, 100, 150, 0.2));
  border-color: #ff9ec4;
  color: #fff;
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.5), 0 0 40px rgba(201, 177, 255, 0.3);
  animation: pastelPulse 1.6s ease-in-out infinite;
}

.hud-actions .voice-btn.active::before {
  opacity: 0.4;
  animation: sparkle 1s ease-in-out infinite;
}

.hud-actions .narrator-btn {
  color: #c9b1ff;
}

.hud-actions .narrator-btn.muted {
  opacity: 0.4;
  color: rgba(255, 240, 255, 0.4);
}

.hud-actions .narrator-btn.active {
  background: linear-gradient(135deg, rgba(201, 177, 255, 0.25), rgba(255, 158, 196, 0.15));
  border-color: #c9b1ff;
  box-shadow: 0 0 16px rgba(201, 177, 255, 0.4), 0 0 32px rgba(255, 158, 196, 0.2);
  color: #fff;
}

.hud-actions .year-btn {
  width: auto;
  min-width: 72px;
  padding: 0 16px;
  border-radius: 20px;
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 600;
}

.hud-actions .year-btn.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 158, 196, 0.25));
  border-color: #ffd700;
  color: #ffd700;
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.4), 0 0 32px rgba(255, 158, 196, 0.2);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.year-popover {
  position: absolute;
  top: 52px;
  right: 0;
  width: 240px;
  max-height: 340px;
  overflow-y: auto;
  background: rgba(20, 10, 40, 0.95);
  border: 2px solid rgba(201, 177, 255, 0.3);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 8px 40px rgba(20, 10, 40, 0.6), 0 0 32px rgba(255, 158, 196, 0.15), 0 0 64px rgba(201, 177, 255, 0.1);
  backdrop-filter: blur(16px);
  z-index: 30;
}

.year-title {
  font-size: 13px;
  color: #ff9ec4;
  margin-bottom: 12px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(255, 158, 196, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;
}

.year-title::before {
  content: '✦';
  color: #ffd700;
  font-size: 10px;
}

.year-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.year-chip {
  padding: 7px 14px;
  border-radius: 16px;
  border: 2px solid rgba(201, 177, 255, 0.3);
  background: rgba(30, 15, 60, 0.5);
  font-size: 12px;
  font-family: 'Orbitron', sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
  color: rgba(255, 240, 255, 0.8);
}

.year-chip:hover {
  border-color: rgba(255, 158, 196, 0.5);
  background: rgba(255, 158, 196, 0.12);
  transform: translateY(-1px);
}

.year-chip.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 158, 196, 0.2));
  border-color: #ffd700;
  color: #ffd700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
}

@keyframes voicePulse {
  0%, 100% { box-shadow: 0 0 14px rgba(255, 158, 196, 0.3), 0 0 28px rgba(201, 177, 255, 0.2); }
  50% { box-shadow: 0 0 24px rgba(255, 158, 196, 0.5), 0 0 48px rgba(201, 177, 255, 0.35); }
}

.nebula-popover {
  position: absolute;
  top: 52px;
  right: 0;
  width: 200px;
  background: rgba(20, 10, 40, 0.95);
  border: 2px solid rgba(201, 177, 255, 0.3);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 8px 40px rgba(20, 10, 40, 0.6), 0 0 32px rgba(255, 158, 196, 0.15), 0 0 64px rgba(201, 177, 255, 0.1);
  backdrop-filter: blur(16px);
}

.nebula-title {
  font-size: 13px;
  color: #c9b1ff;
  margin-bottom: 12px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(201, 177, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;
}

.nebula-title::before {
  content: '✧';
  color: #ff9ec4;
  font-size: 10px;
}

.nebula-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nebula-chip {
  padding: 6px 12px;
  border-radius: 14px;
  border: 2px solid;
  background: rgba(30, 15, 60, 0.4);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.nebula-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
  box-shadow: 0 0 12px currentColor;
}

.hud-counter {
  position: absolute;
  bottom: 20px;
  left: 40px;
  font-size: 12px;
  color: rgba(255, 182, 216, 0.8);
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(255, 158, 196, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-counter::before {
  content: '✨';
  font-size: 14px;
  animation: sparkle 2s ease-in-out infinite;
}

.gesture-status {
  position: absolute;
  bottom: 52px;
  left: 40px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(20, 10, 40, 0.85);
  border: 2px solid rgba(255, 158, 196, 0.3);
  backdrop-filter: blur(12px);
  font-size: 11px;
  color: rgba(255, 240, 255, 0.7);
  min-width: 140px;
  pointer-events: none;
  animation: gestureStatusIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 24px rgba(20, 10, 40, 0.5), 0 0 20px rgba(201, 177, 255, 0.15);
}

@keyframes gestureStatusIn {
  from { opacity: 0; transform: translateY(12px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.gesture-status-title {
  margin-bottom: 6px;
  color: #ff9ec4;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(255, 158, 196, 0.5);
  font-size: 12px;
}

.gesture-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  opacity: 0.5;
}

.gesture-status-item.active {
  opacity: 1;
  background: rgba(255, 158, 196, 0.1);
  border-color: rgba(255, 158, 196, 0.3);
}

.gesture-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}

.hud-toast {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 24px;
  background: rgba(20, 10, 40, 0.92);
  border: 2px solid rgba(201, 177, 255, 0.35);
  color: rgba(255, 240, 255, 0.85);
  font-size: 13px;
  pointer-events: none;
  z-index: 20;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(20, 10, 40, 0.5);
}

.hud-toast--success {
  border-color: rgba(255, 215, 0, 0.5);
  color: #ffd700;
  background: linear-gradient(135deg, rgba(20, 10, 40, 0.92), rgba(40, 20, 60, 0.92));
  box-shadow: 0 4px 24px rgba(20, 10, 40, 0.5), 0 0 24px rgba(255, 215, 0, 0.3), 0 0 48px rgba(255, 158, 196, 0.15);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: toastPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes toastPulse {
  0% { transform: translateX(-50%) scale(0.85); opacity: 0; }
  50% { transform: translateX(-50%) scale(1.08); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px) scale(0.95);
}

.help-panel {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: radial-gradient(ellipse at center, rgba(20, 10, 40, 0.7) 0%, rgba(10, 5, 20, 0.85) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  backdrop-filter: blur(4px);
}

.help-content {
  background: linear-gradient(180deg, rgba(30, 15, 60, 0.98) 0%, rgba(20, 10, 40, 0.98) 100%);
  border: 2px solid rgba(255, 158, 196, 0.4);
  border-radius: 24px;
  padding: 32px 36px;
  max-width: 400px;
  box-shadow: 0 12px 60px rgba(20, 10, 40, 0.7), 0 0 40px rgba(255, 158, 196, 0.2), 0 0 80px rgba(201, 177, 255, 0.15);
  position: relative;
  overflow: hidden;
}

.help-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #ffd700, #ff9ec4);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.help-content::after {
  content: '✦ ✧ ✦';
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 10px;
  color: rgba(255, 215, 0, 0.4);
  letter-spacing: 4px;
}

.help-content h3 {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ff9ec4, #c9b1ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  filter: drop-shadow(0 0 8px rgba(255, 158, 196, 0.4));
}

.help-content p {
  margin-bottom: 12px;
  color: rgba(255, 240, 255, 0.8);
  font-size: 13px;
  line-height: 1.6;
  padding-left: 12px;
  border-left: 2px solid rgba(255, 158, 196, 0.3);
}

.help-content button {
  margin-top: 20px;
  padding: 10px 28px;
  border: 2px solid #ff9ec4;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.2), rgba(201, 177, 255, 0.15));
  color: #ff9ec4;
  border-radius: 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  text-shadow: 0 0 8px rgba(255, 158, 196, 0.4);
}

.help-content button:hover {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.35), rgba(201, 177, 255, 0.25));
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.4), 0 0 40px rgba(201, 177, 255, 0.2);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .hud-top {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px;
    gap: 14px;
  }
  .hud-search {
    max-width: 100%;
    width: 100%;
  }
  .hud-chips {
    max-height: 100px;
    overflow-y: auto;
  }
  .hud-actions {
    top: 14px;
    right: 14px;
    gap: 8px;
  }
  .hud-actions button {
    width: 36px;
    height: 36px;
  }
  .hud-counter {
    left: 14px;
    bottom: 14px;
  }
  .gesture-status {
    left: 14px;
    bottom: 46px;
  }
  .hud-toast {
    top: 170px;
  }
  .help-content {
    margin: 20px;
    padding: 24px;
  }
}
</style>

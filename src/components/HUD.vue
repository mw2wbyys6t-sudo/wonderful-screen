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
      <button title="帮助" @click="showHelp = !showHelp">?</button>
    </div>
    <div class="hud-counter">{{ count }} 颗恒星已点亮</div>
    <transition name="fade">
      <div v-if="noResult" class="hud-toast">未找到结果</div>
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useData } from '../composables/useData.js';
import { useAudio } from '../composables/useAudio.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { bus } from '../engines/core/EventBus.js';

const props = defineProps({
  count: { type: Number, default: 0 },
  voiceActive: { type: Boolean, default: false },
  voiceSupported: { type: Boolean, default: false }
});
const emit = defineEmits(['filter-genre', 'search', 'reset-camera', 'focus-nebula', 'toggle-fullscreen', 'toggle-voice']);

const { genres } = useData();
const { toggle: toggleMusic } = useAudio();

const searchText = ref('');
const activeGenre = ref(StateEngine.state.activeGenre);
const showHelp = ref(false);
const showNebula = ref(false);
const noResult = ref(false);
let noResultTimeout = null;
let searchDebounce = null;
let unsubscribe = null;

onMounted(() => {
  unsubscribe = bus.on('state:activeGenre', ({ value }) => {
    activeGenre.value = value;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
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

function showNoResult() {
  noResult.value = true;
  if (noResultTimeout) clearTimeout(noResultTimeout);
  noResultTimeout = setTimeout(() => {
    noResult.value = false;
  }, 2000);
}

watch(searchText, (val) => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    emit('search', val);
  }, 300);
});

defineExpose({ showNoResult });
</script>

<style scoped>
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
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, transparent 100%);
}

.hud-logo {
  font-family: 'Orbitron', sans-serif;
  font-size: 18px;
  color: var(--neon-cyan);
  text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
  white-space: nowrap;
}

.hud-search {
  flex: 1;
  max-width: 300px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  outline: none;
}

.hud-search:focus {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 10px rgba(0, 243, 255, 0.25);
}

.hud-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hud-chip {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hud-actions {
  position: absolute;
  top: 20px;
  right: 40px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.hud-action-group {
  position: relative;
  display: flex;
  gap: 12px;
}

.hud-actions button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.hud-actions button:hover,
.hud-actions button.active {
  background: rgba(0, 243, 255, 0.15);
  box-shadow: 0 0 12px rgba(0, 243, 255, 0.25);
}

.hud-actions .voice-btn.active {
  background: rgba(255, 42, 109, 0.2);
  border-color: rgba(255, 42, 109, 0.45);
  color: #ff7aa3;
  box-shadow: 0 0 14px rgba(255, 42, 109, 0.35);
  animation: voicePulse 1.6s ease-in-out infinite;
}

@keyframes voicePulse {
  0%, 100% { box-shadow: 0 0 12px rgba(255, 42, 109, 0.2); }
  50% { box-shadow: 0 0 22px rgba(255, 42, 109, 0.45); }
}

.nebula-popover {
  position: absolute;
  top: 48px;
  right: 0;
  width: 180px;
  background: rgba(5, 7, 20, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.nebula-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.nebula-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.nebula-chip {
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid;
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nebula-chip:hover {
  background: rgba(255, 255, 255, 0.12);
}

.hud-counter {
  position: absolute;
  bottom: 20px;
  left: 40px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
}

.hud-toast {
  position: absolute;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 20px;
  background: rgba(5, 7, 20, 0.9);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 13px;
  pointer-events: none;
  z-index: 20;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.help-panel {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.help-content {
  background: rgba(5, 7, 20, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 28px 32px;
  max-width: 360px;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
}

.help-content h3 {
  margin-bottom: 16px;
  color: var(--neon-cyan);
}

.help-content p {
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 14px;
}

.help-content button {
  margin-top: 16px;
  padding: 8px 20px;
  border: 1px solid var(--neon-cyan);
  background: transparent;
  color: var(--neon-cyan);
  border-radius: 20px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .hud-top {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    gap: 12px;
  }
  .hud-search {
    max-width: 100%;
    width: 100%;
  }
  .hud-chips {
    max-height: 84px;
    overflow-y: auto;
  }
  .hud-actions {
    top: 12px;
    right: 12px;
  }
  .hud-counter {
    left: 12px;
    bottom: 12px;
  }
  .hud-toast {
    top: 150px;
  }
}
</style>

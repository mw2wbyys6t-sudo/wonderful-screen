<template>
  <div class="hud">
    <div class="hud-top">
      <div class="hud-logo">星云编年史</div>
      <input type="text" class="hud-search" placeholder="搜索作品 / 流派…" v-model="searchText">
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
      <button title="音乐" @click="toggleMusic">♪</button>
      <button title="帮助" @click="showHelp = !showHelp">?</button>
    </div>
    <div class="hud-counter">{{ count }} 颗恒星已点亮</div>
    <div v-if="showHelp" class="help-panel" @click="showHelp = false">
      <div class="help-content" @click.stop>
        <h3>操作指南</h3>
        <p>拖拽：旋转星系视角</p>
        <p>滚轮：缩放</p>
        <p>点击恒星：查看作品详情</p>
        <p>顶部芯片：按流派筛选</p>
        <button @click="showHelp = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useData } from '../composables/useData.js';
import { useAudio } from '../composables/useAudio.js';

const props = defineProps({ count: { type: Number, default: 0 } });
const emit = defineEmits(['filter-genre']);

const { genres } = useData();
const { toggle: toggleMusic } = useAudio();

const searchText = ref('');
const activeGenre = ref(null);
const showHelp = ref(false);

function chipStyle(genre, color) {
  const isActive = activeGenre.value === genre;
  return {
    borderColor: color,
    background: isActive ? `${color}33` : undefined,
    color: isActive ? color : undefined
  };
}

function toggleGenre(genre) {
  activeGenre.value = activeGenre.value === genre ? null : genre;
  emit('filter-genre', activeGenre.value);
}
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
}

.hud-actions {
  position: absolute;
  top: 20px;
  right: 40px;
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
}

.hud-actions button:hover {
  background: rgba(0, 243, 255, 0.15);
  box-shadow: 0 0 12px rgba(0, 243, 255, 0.25);
}

.hud-chip.active {
  box-shadow: 0 0 10px currentColor;
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
  }
  .hud-search {
    max-width: 100%;
    width: 100%;
  }
  .hud-counter {
    left: 12px;
    bottom: 12px;
  }
}
</style>

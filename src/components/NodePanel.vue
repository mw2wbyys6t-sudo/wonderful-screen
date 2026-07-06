<template>
  <div class="node-panel" :class="{ open: visible }">
    <button class="node-close" @click="close">×</button>

    <div v-if="anime" class="node-content">
      <div class="node-cover-wrap">
        <img :src="coverImage" :alt="anime.titleRomaji">
        <div class="node-score" v-if="anime.score || anime.averageScore">
          {{ anime.score || anime.averageScore }}
        </div>
      </div>

      <h2 class="node-title">{{ anime.titleRomaji }}</h2>
      <p v-if="anime.titleEnglish || anime.titleJa" class="node-subtitle">
        {{ anime.titleEnglish || anime.titleJa }}
      </p>

      <div class="node-meta">
        <span class="node-year">{{ anime.year }}</span>
        <span v-for="g in displayedGenres" :key="g" class="node-genre">{{ g }}</span>
      </div>

      <div v-if="anime.studios?.length" class="node-row">
        <span class="node-label">制作</span>
        <span class="node-value">{{ anime.studios.slice(0, 3).join(' / ') }}</span>
      </div>

      <div v-if="anime.authors?.length" class="node-row">
        <span class="node-label">作者 / 导演</span>
        <span class="node-value">{{ anime.authors.slice(0, 3).join(' / ') }}</span>
      </div>

      <p class="node-desc">{{ anime.description || '暂无简介。' }}</p>

      <div v-if="relations.length" class="node-relations">
        <div class="node-section-title">知识图谱连接</div>
        <div class="relation-list">
          <div
            v-for="item in relations"
            :key="item.anime.id"
            class="relation-card"
            @click="focusRelated(item.anime)"
          >
            <div class="relation-color" :style="{ background: relationColor(item.relation) }"></div>
            <div class="relation-info">
              <div class="relation-title">{{ item.anime.titleRomaji }}</div>
              <div class="relation-type">{{ relationLabel(item.relation) }} · {{ item.anime.year }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="node-actions">
        <button class="locate-btn" @click="locate">在宇宙中定位</button>
        <a class="watch-btn" :href="watchLink" target="_blank" rel="noopener">进入放映厅</a>
      </div>
    </div>

    <div v-else class="node-empty">
      <p>选择一颗恒星，探索它的故事。</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  anime: { type: Object, default: null },
  relations: { type: Array, default: () => [] },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'locate', 'focus-related']);

const displayedGenres = computed(() => props.anime?.genres?.slice(0, 3) || []);

const coverImage = computed(() => {
  return props.anime?.coverImage || './images/generated/nebula-bg.jpg';
});

const watchLink = computed(() => {
  if (!props.anime) return '#';
  return `watch.html?title=${encodeURIComponent(props.anime.titleRomaji)}`;
});

const RELATION_COLORS = {
  sequel: '#ff2a6d',
  prequel: '#ff2a6d',
  'same-studio': '#00f3ff',
  'same-author': '#b892ff',
  'same-genre': '#66ffaa',
  'same-music': '#ffcc00',
  'same-era': '#aaaaaa'
};

const RELATION_LABELS = {
  sequel: '续作',
  prequel: '前传',
  'same-studio': '同制作',
  'same-author': '同作者',
  'same-genre': '同流派',
  'same-music': '同音乐',
  'same-era': '同年代'
};

function relationColor(type) {
  return RELATION_COLORS[type] || '#ffffff';
}

function relationLabel(type) {
  return RELATION_LABELS[type] || type;
}

function close() {
  emit('close');
}

function locate() {
  if (props.anime) emit('locate', props.anime);
}

function focusRelated(anime) {
  emit('focus-related', anime);
}
</script>

<style scoped>
.node-panel {
  position: fixed;
  right: -460px;
  top: 0;
  width: 440px;
  height: 100%;
  z-index: 20;
  background: rgba(5, 7, 20, 0.94);
  border-left: 1px solid var(--glass-border);
  padding: 28px;
  transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  backdrop-filter: blur(20px);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.4);
}

.node-panel.open {
  right: 0;
}

.node-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  z-index: 2;
}

.node-cover-wrap {
  position: relative;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 20px;
}

.node-cover-wrap img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
}

.node-score {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 243, 255, 0.18);
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.node-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.3;
}

.node-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.node-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.node-year {
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  color: var(--neon-pink);
}

.node-genre {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  color: var(--text-secondary);
}

.node-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
}

.node-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.node-value {
  color: var(--text-primary);
  text-align: right;
}

.node-desc {
  margin: 18px 0;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(220, 230, 255, 0.8);
}

.node-section-title {
  font-size: 13px;
  color: var(--neon-cyan);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.node-relations {
  margin-bottom: 24px;
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

.relation-card:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: var(--neon-cyan);
}

.relation-color {
  width: 6px;
  height: 36px;
  border-radius: 3px;
  flex-shrink: 0;
}

.relation-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
}

.relation-type {
  font-size: 11px;
  color: var(--text-secondary);
}

.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.watch-btn,
.locate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  flex: 1;
}

.watch-btn {
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple));
  color: var(--bg-darker);
}

.watch-btn:hover {
  box-shadow: 0 0 16px rgba(0, 243, 255, 0.35);
}

.locate-btn {
  background: transparent;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
}

.locate-btn:hover {
  background: rgba(0, 243, 255, 0.12);
  box-shadow: 0 0 12px rgba(0, 243, 255, 0.25);
}

.node-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .node-panel {
    width: 100%;
    right: -100%;
    padding: 20px;
  }
}
</style>

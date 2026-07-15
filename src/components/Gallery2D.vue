<template>
  <div class="gallery-2d" v-if="viewMode === '2d'">
    <div class="gallery-container">
      <div class="gallery-header">
        <h2 class="gallery-title">
          <span class="title-glow">✨</span>
          {{ year ? `${year}年代` : '全部作品' }}
          <span class="title-count">{{ filteredWorks.length }} 部</span>
        </h2>
      </div>

      <div class="gallery-grid" ref="gridRef">
        <div
          v-for="work in filteredWorks"
          :key="work.id"
          class="gallery-card"
          :class="{ selected: selectedId === work.id, searched: isSearchResult(work.id) }"
          @click="selectWork(work.id)"
          @mouseenter="hoverWork(work.id)"
        >
          <div class="card-cover">
            <img
              :src="work.coverImage"
              :alt="work.titleRomaji"
              loading="lazy"
              @error="handleImgError($event, work)"
            />
            <div class="card-overlay">
              <div class="card-year">{{ work.year }}</div>
              <div class="card-score" v-if="work.score">
                <span class="score-star">★</span>
                {{ work.score.toFixed(1) }}
              </div>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ work.titleRomaji }}</h3>
            <div class="card-meta">
              <span class="card-genre" v-for="g in (work.genres || []).slice(0, 2)" :key="g" :style="{ '--c': genreColors[g] || '#c9b1ff' }">{{ g }}</span>
            </div>
          </div>
          <div class="card-glow"></div>
        </div>
      </div>

      <div class="gallery-empty" v-if="!filteredWorks.length">
        <span class="empty-icon">🌌</span>
        <p>这个区域还没有作品</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { StateEngine } from '../engines/core/StateEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';
import { bus } from '../engines/core/EventBus.js';

const gridRef = ref(null);

const viewMode = computed(() => StateEngine.state.viewMode);
const year = computed(() => StateEngine.state.year);
const activeGenre = computed(() => StateEngine.state.activeGenre);
const selectedId = computed(() => StateEngine.state.selectedId);
const searchQuery = computed(() => StateEngine.state.searchQuery);
const searchResults = computed(() => StateEngine.state.searchResults);

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

const filteredWorks = computed(() => {
  let works = DataEngine.data.value || [];
  if (year.value) {
    works = works.filter(w => Math.floor(w.year / 10) * 10 === year.value);
  }
  if (activeGenre.value) {
    works = works.filter(w => w.genres?.includes(activeGenre.value));
  }
  if (searchQuery.value && searchResults.value.length) {
    const resultSet = new Set(searchResults.value);
    works = works.filter(w => resultSet.has(w.id));
  }
  return works.sort((a, b) => b.year - a.year);
});

function isSearchResult(id) {
  return searchQuery.value && searchResults.value.includes(id);
}

function selectWork(id) {
  StateEngine.select(id);
}

function hoverWork(id) {
  StateEngine.hover(id);
}

function handleImgError(e, work) {
  e.target.src = work.coverFallback || '';
}

let handler = null;
onMounted(() => {
  handler = () => {
    if (gridRef.value) {
      gridRef.value.scrollTop = 0;
    }
  };
  bus.on('view:changed', handler);
});

onUnmounted(() => {
  if (handler) bus.off('view:changed', handler);
});
</script>

<style scoped>
.gallery-2d {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  background: radial-gradient(ellipse at top, #1a0f3a 0%, #0a0518 100%);
}

.gallery-container {
  width: 100%;
  height: 100%;
  padding: 100px 32px 40px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.gallery-header {
  margin-bottom: 28px;
}

.gallery-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.title-glow {
  font-size: 32px;
  animation: glow 2s ease-in-out infinite;
}

.title-count {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 12px;
  border-radius: 100px;
  margin-left: 8px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  padding-bottom: 40px;
}

.gallery-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 158, 196, 0.15);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.gallery-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: rgba(255, 158, 196, 0.5);
  box-shadow: 0 20px 40px rgba(255, 158, 196, 0.2), 0 0 0 1px rgba(255, 158, 196, 0.3);
}

.gallery-card.selected {
  border-color: #ff9ec4;
  box-shadow: 0 0 30px rgba(255, 158, 196, 0.5);
}

.gallery-card.searched {
  border-color: #ffd700;
  animation: searchPulse 1.5s ease-in-out infinite;
}

.card-cover {
  position: relative;
  aspect-ratio: 2/3;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.gallery-card:hover .card-cover img {
  transform: scale(1.1);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(20, 10, 40, 0.9) 100%);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px;
}

.card-year {
  font-size: 13px;
  font-weight: 700;
  color: #ff9ec4;
  background: rgba(20, 10, 40, 0.8);
  padding: 4px 10px;
  border-radius: 8px;
}

.card-score {
  font-size: 13px;
  font-weight: 700;
  color: #ffd700;
  display: flex;
  align-items: center;
  gap: 4px;
}

.score-star {
  color: #ffd700;
}

.card-info {
  padding: 12px 14px 14px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-genre {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 100px;
  background: color-mix(in srgb, var(--c) 25%, transparent);
  color: var(--c);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
}

.card-glow {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at center, rgba(255, 158, 196, 0.15), transparent 70%);
  transition: opacity 0.35s;
}

.gallery-card:hover .card-glow {
  opacity: 1;
}

.gallery-empty {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.6;
}

@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)); }
}

@keyframes searchPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
}

@media (max-width: 768px) {
  .gallery-container {
    padding: 90px 16px 30px;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }

  .gallery-title {
    font-size: 22px;
  }

  .card-info {
    padding: 10px 10px 12px;
  }

  .card-title {
    font-size: 13px;
  }
}
</style>

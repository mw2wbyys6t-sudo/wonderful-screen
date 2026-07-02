<template>
  <div class="detail-panel" :class="{ open: visible }">
    <button class="detail-close" @click="close">×</button>
    <img :src="anime?.coverImage || '/images/generated/nebula-bg.jpg'" :alt="anime?.titleRomaji">
    <h2>{{ anime?.titleRomaji }}</h2>
    <p class="detail-meta">{{ metaText }}</p>
    <p class="detail-desc">{{ anime?.description }}</p>
    <a class="watch-btn" :href="watchLink">看动漫</a>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  anime: { type: Object, default: null },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const metaText = computed(() => {
  if (!props.anime) return '';
  const year = props.anime.year || 'N/A';
  const genres = props.anime.genres?.join(' / ') || '';
  const score = props.anime.averageScore || 'N/A';
  return `${year} · ${genres} · Score: ${score}`;
});

const watchLink = computed(() => {
  if (!props.anime) return '#';
  return `watch.html?title=${encodeURIComponent(props.anime.titleRomaji)}`;
});

function close() {
  emit('close');
}
</script>

<style scoped>
.detail-panel {
  position: fixed;
  right: -420px;
  top: 0;
  width: 400px;
  height: 100%;
  z-index: 20;
  background: rgba(5, 7, 20, 0.92);
  border-left: 1px solid var(--glass-border);
  padding: 32px;
  transition: right 0.4s ease;
  overflow-y: auto;
}

.detail-panel.open {
  right: 0;
}

.detail-panel img {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 20px;
}

.detail-panel h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.detail-meta,
.detail-desc {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.watch-btn {
  display: inline-block;
  padding: 12px 32px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple));
  color: var(--bg-darker);
  border-radius: 24px;
  text-decoration: none;
  font-weight: 700;
}

.detail-close {
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
}

@media (max-width: 768px) {
  .detail-panel {
    width: 100%;
    right: -100%;
  }
}
</style>

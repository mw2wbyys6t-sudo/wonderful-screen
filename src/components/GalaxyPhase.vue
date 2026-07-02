<template>
  <section class="phase-galaxy">
    <canvas ref="galaxyCanvas" id="galaxy-canvas"></canvas>
    <div v-if="webglError" class="webgl-fallback">
      <div class="fallback-icon">✦</div>
      <p>当前环境不支持 WebGL，无法显示 3D 星系。</p>
      <p>请在支持 WebGL 的浏览器（如 Chrome、Edge、Safari）中打开。</p>
    </div>
    <HUD v-if="hudReady" :count="data.length" @filter-genre="onFilterGenre" />
    <DetailPanel v-if="hudReady" :anime="selectedAnime" :visible="!!selectedAnime" @close="selectedAnime = null" />
    <div v-if="hoveredAnime" class="star-tooltip" :style="tooltipStyle">
      <div class="tooltip-title">{{ hoveredAnime.titleRomaji }}</div>
      <div class="tooltip-meta">{{ hoveredAnime.year }} · {{ hoveredAnime.genres?.[0] }} · {{ hoveredAnime.averageScore }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent, computed } from 'vue';
import { useData } from '../composables/useData.js';

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const DetailPanel = defineAsyncComponent(() => import('./DetailPanel.vue'));

const galaxyCanvas = ref(null);
const hudReady = ref(false);
const webglError = ref('');
const selectedAnime = ref(null);
const hoveredAnime = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const activeGenre = ref(null);

const { data, genres } = useData();

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

onMounted(async () => {
  const mod = await import('../composables/useGalaxy.js');
  const { useGalaxy } = mod;
  const { init, hoveredAnime: galaxyHoveredAnime } = useGalaxy(galaxyCanvas, data, genres, {
    onSelect: (anime) => {
      selectedAnime.value = anime;
    },
    onError: (msg) => {
      webglError.value = msg;
    }
  });
  init();

  window.addEventListener('pointermove', (e) => {
    tooltipPos.value = { x: e.clientX, y: e.clientY };
  });

  hoveredAnime.value = galaxyHoveredAnime;
  hudReady.value = true;
});

function onFilterGenre(genre) {
  activeGenre.value = activeGenre.value === genre ? null : genre;
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
</style>

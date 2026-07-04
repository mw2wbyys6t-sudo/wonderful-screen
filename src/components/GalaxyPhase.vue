<template>
  <section class="phase-galaxy">
    <canvas ref="galaxyCanvas" id="galaxy-canvas"></canvas>
    <div v-if="galaxyLoading && !webglError" class="galaxy-loading">
      <div class="loading-spinner"></div>
      <p>正在构建星系…</p>
    </div>
    <div v-if="webglError" class="webgl-fallback">
      <div class="fallback-icon">✦</div>
      <p>当前环境不支持 WebGL，无法显示 3D 星系。</p>
      <p>请在支持 WebGL 的浏览器（如 Chrome、Edge、Safari）中打开。</p>
    </div>
    <HUD
      v-if="hudReady"
      ref="hudRef"
      :count="data.length"
      @filter-genre="onFilterGenre"
      @search="onSearch"
      @reset-camera="onResetCamera"
      @focus-nebula="onFocusNebula"
      @toggle-fullscreen="onToggleFullscreen"
    />
    <DetailPanel
      v-if="hudReady"
      :anime="selectedAnime"
      :visible="!!selectedAnime"
      @close="selectedAnime = null"
      @locate="onLocateStar"
    />
    <div v-if="hoveredAnime" class="star-tooltip" :style="tooltipStyle">
      <div class="tooltip-title">{{ hoveredAnime.titleRomaji }}</div>
      <div class="tooltip-meta">{{ hoveredAnime.year }} · {{ hoveredAnime.genres?.[0] }} · Score: {{ hoveredAnime.averageScore }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineAsyncComponent, computed, watch } from 'vue';
import { useData } from '../composables/useData.js';

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const DetailPanel = defineAsyncComponent(() => import('./DetailPanel.vue'));

const galaxyCanvas = ref(null);
const hudRef = ref(null);
const hudReady = ref(false);
const webglError = ref('');
const galaxyLoading = ref(true);
const selectedAnime = ref(null);
const hoveredAnime = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const activeGenre = ref(null);

const { data, genres } = useData();

let galaxyApi = null;
let cleanupFns = [];

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

onMounted(async () => {
  try {
    const mod = await import('../composables/useGalaxy.js');
    const { useGalaxy } = mod;
    const api = useGalaxy(galaxyCanvas, data, genres, {
      onSelect: (anime) => {
        selectedAnime.value = anime;
      },
      onError: (msg) => {
        webglError.value = msg;
        galaxyLoading.value = false;
      },
      onSearchResult: (result) => {
        if (!result.found && hudRef.value) {
          hudRef.value.showNoResult();
        }
      },
      onReady: () => {
        galaxyLoading.value = false;
      }
    });
    api.init();
    galaxyApi = api;

    if (api.hoveredAnime) {
      watch(api.hoveredAnime, (val) => {
        hoveredAnime.value = val;
      }, { immediate: true });
    }

    const onPointerMove = (e) => {
      tooltipPos.value = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onPointerMove);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        selectedAnime.value = null;
        if (hudRef.value) hudRef.value.showHelp = false;
      } else if (e.key === 'r' || e.key === 'R') {
        galaxyApi?.resetCamera();
      } else if (e.key === 'f' || e.key === 'F') {
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    cleanupFns.push(
      () => window.removeEventListener('pointermove', onPointerMove),
      () => window.removeEventListener('keydown', onKeyDown)
    );

    hudReady.value = true;
  } catch (err) {
    console.error('星系初始化失败:', err);
    webglError.value = '星系初始化失败，请刷新重试';
    galaxyLoading.value = false;
  }
});

onUnmounted(() => {
  cleanupFns.forEach(fn => fn());
});

function onFilterGenre(genre) {
  activeGenre.value = genre;
  galaxyApi?.filterByGenre(genre);
}

function onSearch(query) {
  galaxyApi?.search(query);
}

function onResetCamera() {
  galaxyApi?.resetCamera();
}

function onFocusNebula(genre) {
  galaxyApi?.focusOnGenre(genre);
}

function onToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function onLocateStar(anime) {
  if (!anime || !galaxyApi) return;
  selectedAnime.value = null;
  galaxyApi.highlightStar(anime.id);
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

.galaxy-loading {
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

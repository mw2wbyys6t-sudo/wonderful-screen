// src/engines/data/DataEngine.js
// 动漫数据加载、索引与查询引擎

import { ref, computed } from 'vue';

const base = import.meta.env.BASE_URL;

const data = ref([]);
const genres = ref({});
const graph = ref({ nodes: [], edges: [] });
const loaded = ref(false);
const loading = ref(false);
const error = ref(null);

const years = computed(() =>
  [...new Set(data.value.map(a => a.year).filter(Boolean))].sort((a, b) => a - b)
);

const yearGroups = computed(() => {
  const map = new Map();
  for (const anime of data.value) {
    if (!map.has(anime.year)) map.set(anime.year, []);
    map.get(anime.year).push(anime);
  }
  return map;
});

export const DataEngine = {
  data,
  genres,
  graph,
  loaded,
  loading,
  error,
  years,
  yearGroups,

  async load() {
    if (loaded.value) return;
    loading.value = true;
    error.value = null;
    try {
      const [corpusRes, genreRes, graphRes] = await Promise.all([
        fetch(`${base}data/anime-corpus.json`),
        fetch(`${base}data/genre-manifest.json`),
        fetch(`${base}data/knowledge-graph.json`)
      ]);

      if (!corpusRes.ok) throw new Error(`corpus: ${corpusRes.status}`);
      if (!genreRes.ok) throw new Error(`genres: ${genreRes.status}`);
      if (!graphRes.ok) throw new Error(`graph: ${graphRes.status}`);

      const rawData = await corpusRes.json();
      genres.value = await genreRes.json();
      graph.value = await graphRes.json();

      // 本地封面兜底：沙箱/无头环境外部 CDN 常被拦截，用本地图库循环兜底
      const localCovers = Array.from({ length: 42 }, (_, i) => `${base}images/${i}.jpg`);
      data.value = rawData.map((anime, i) => ({
        ...anime,
        coverImage: anime.coverImage || localCovers[i % localCovers.length],
        coverFallback: localCovers[i % localCovers.length]
      }));
      loaded.value = true;
    } catch (err) {
      error.value = err.message;
      console.error('[DataEngine] 加载失败:', err);
    } finally {
      loading.value = false;
    }
  },

  byId(id) {
    return data.value.find(a => String(a.id) === String(id));
  },

  byYear(year) {
    return data.value.filter(a => a.year === year);
  },

  byGenre(genre) {
    return data.value.filter(a => a.genres?.includes(genre));
  },

  search(q) {
    const term = String(q || '').toLowerCase().trim();
    if (!term) return [];
    return data.value.filter(a =>
      a.titleRomaji?.toLowerCase().includes(term) ||
      a.titleJa?.toLowerCase().includes(term) ||
      a.titleEnglish?.toLowerCase().includes(term) ||
      a.tags?.some(t => String(t).toLowerCase().includes(term)) ||
      a.studios?.some(s => String(s).toLowerCase().includes(term)) ||
      a.authors?.some(s => String(s).toLowerCase().includes(term)) ||
      a.directors?.some(s => String(s).toLowerCase().includes(term))
    );
  },

  fuzzyFindByTitle(title) {
    const term = String(title).toLowerCase().trim();
    if (!term) return null;
    return data.value.find(a =>
      a.titleRomaji?.toLowerCase().includes(term) ||
      a.titleJa?.toLowerCase().includes(term) ||
      a.titleEnglish?.toLowerCase().includes(term)
    );
  },

  topWorks(limit = 8) {
    return [...data.value]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
};

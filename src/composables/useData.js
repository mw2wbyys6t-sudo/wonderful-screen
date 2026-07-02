import { ref, computed } from 'vue';

const data = ref([]);
const genres = ref({});
const loading = ref(false);
const error = ref(null);

export function useData() {
  const load = async () => {
    loading.value = true;
    error.value = null;
    try {
      const [corpusRes, manifestRes] = await Promise.all([
        fetch('/data/anime-corpus.json'),
        fetch('/data/genre-manifest.json')
      ]);
      if (!corpusRes.ok) throw new Error(`Failed to load anime corpus: ${corpusRes.status}`);
      if (!manifestRes.ok) throw new Error(`Failed to load genre manifest: ${manifestRes.status}`);
      data.value = await corpusRes.json();
      const manifest = await manifestRes.json();
      genres.value = manifest.genres || {};
    } catch (err) {
      error.value = err;
      console.error('Failed to load data:', err);
    } finally {
      loading.value = false;
    }
  };

  const topWorks = computed(() =>
    [...data.value].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8)
  );

  return { data, genres, loading, error, load, topWorks };
}

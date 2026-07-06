import { ref, computed } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';

const data = ref([]);
const genres = ref({});
const loading = ref(false);
const error = ref(null);

export function useData() {
  const load = async () => {
    loading.value = true;
    error.value = null;
    try {
      await DataEngine.load();
      data.value = DataEngine.data.value;
      genres.value = DataEngine.genres.value.genres || {};
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

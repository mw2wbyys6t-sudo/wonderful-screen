// src/engines/core/StateEngine.js
// AnimeVerse 统一状态中枢：所有 Engine 读取/写入的唯一事实来源

import { reactive, readonly } from 'vue';
import { bus } from './EventBus.js';

const state = reactive({
  phase: 'loading',          // loading | landing | universe
  viewMode: '3d',            // 2d | 3d
  year: null,                // 当前聚焦年份
  selectedId: null,          // 选中作品 id
  hoveredId: null,           // 悬停作品 id
  activeGenre: null,         // 当前流派筛选
  searchQuery: null,         // 搜索关键词
  searchResults: [],         // 搜索结果 id 列表
  camera: {
    theta: 0,
    phi: Math.PI / 2.5,
    radius: 260
  },
  cameraTarget: null,        // 相机目标位置 { theta, phi, radius, x, y, z }
  voiceIntent: null,         // 最近一次语音意图
  gesture: null,             // 最近一次手势
  aiMessage: null,           // AI 导航提示文本
  loading: false,            // 全局加载状态
  inputMode: 'mouse',        // mouse | hand | voice
  narratorMuted: false       // AI 语音导游是否静音
});

export const StateEngine = {
  state: readonly(state),

  set(key, value) {
    if (!(key in state)) {
      console.warn(`[StateEngine] 未知状态键: ${key}`);
      return;
    }
    const prev = state[key];
    state[key] = value;
    bus.emit(`state:${key}`, { value, prev });
    bus.emit('state:changed', { key, value, prev });
  },

  get(key) {
    return state[key];
  },

  patch(obj) {
    const changes = {};
    for (const key of Object.keys(obj)) {
      if (key in state) {
        changes[key] = { prev: state[key], value: obj[key] };
        state[key] = obj[key];
      }
    }
    bus.emit('state:patched', changes);
    bus.emit('state:changed', changes);
  },

  select(id) {
    this.set('selectedId', id);
    if (id) {
      bus.emit('anime:selected', id);
    }
  },

  hover(id) {
    if (state.hoveredId === id) return;
    this.set('hoveredId', id);
    bus.emit('anime:hovered', id);
  },

  focusYear(year) {
    this.set('year', year);
    this.set('activeGenre', null);
    bus.emit('timeline:focus-year', year);
  },

  filterGenre(genre) {
    this.set('activeGenre', genre);
    this.set('year', null);
    bus.emit('timeline:filter-genre', genre);
  },

  clearFilter() {
    this.set('activeGenre', null);
    this.set('year', null);
    bus.emit('timeline:clear-filter');
  },

  navigate(phase) {
    this.set('phase', phase);
    bus.emit('phase:changed', phase);
  },

  toggleViewMode() {
    const next = state.viewMode === '3d' ? '2d' : '3d';
    this.set('viewMode', next);
    bus.emit('view:changed', next);
  },

  setViewMode(mode) {
    if (mode !== '2d' && mode !== '3d') return;
    this.set('viewMode', mode);
    bus.emit('view:changed', mode);
  },

  setSearch(query, results = []) {
    state.searchQuery = query;
    state.searchResults = results;
    bus.emit('search:changed', { query, results });
  },

  clearSearch() {
    state.searchQuery = null;
    state.searchResults = [];
    bus.emit('search:cleared');
  },

  setCameraTarget(target, animate = true) {
    state.cameraTarget = target;
    bus.emit('camera:target', { target, animate });
  },

  resetCamera() {
    state.cameraTarget = null;
    bus.emit('camera:reset');
  }
};

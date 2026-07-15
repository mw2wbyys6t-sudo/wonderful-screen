import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';
import { DataEngine } from '../data/DataEngine.js';

export const GestureActionEngine = {
  init() {},

  select() {
    const hovered = StateEngine.state.hoveredId;
    if (hovered) {
      StateEngine.select(hovered);
      bus.emit('toast', '已打开详情');
    }
  },

  back() {
    if (StateEngine.state.selectedId) {
      StateEngine.select(null);
      bus.emit('toast', '返回列表');
    } else if (StateEngine.state.activeGenre) {
      StateEngine.clearFilter();
      bus.emit('toast', '已清除流派筛选');
    } else if (StateEngine.state.year) {
      StateEngine.set('year', null);
      bus.emit('toast', '已清除年份筛选');
    } else {
      bus.emit('toast', '返回入口');
      setTimeout(() => bus.emit('input:back'), 300);
    }
  },

  nextYear() {
    this._stepYear(1);
  },

  prevYear() {
    this._stepYear(-1);
  },

  _stepYear(step) {
    const data = DataEngine.data.value || [];
    const years = [...new Set(data.map(a => Math.floor((a.year || 2000) / 10) * 10))].filter(y => y >= 1960 && y <= 2030).sort((a, b) => a - b);
    if (!years.length) return;
    
    let cur = StateEngine.state.year;
    let idx = cur ? years.indexOf(cur) : (step > 0 ? -1 : years.length - 1);
    idx = Math.max(0, Math.min(years.length - 1, idx + step));
    const next = years[idx];
    if (next !== cur) {
      StateEngine.set('year', next);
      bus.emit('toast', `${next}年代`);
    }
  },

  resetFilters() {
    StateEngine.clearFilter();
    StateEngine.set('year', null);
    StateEngine.select(null);
    bus.emit('toast', '已重置');
  }
};

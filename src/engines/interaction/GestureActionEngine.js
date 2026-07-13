// src/engines/interaction/GestureActionEngine.js
// 语义动作中枢：把「手势/语音/键盘/鼠标」输入统一映射到业务动作
// 后续纯手势/语音观看只需扩展输入源，无需改动业务逻辑

import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';
import { DataEngine } from '../data/DataEngine.js';

export const GestureActionEngine = {
  // 当前上下文：universe-main | detail-panel | search | filter | year-focus
  context: 'universe-main',

  init() {
    this._bindContextEvents();
    return this;
  },

  _bindContextEvents() {
    bus.on('state:selectedId', ({ value }) => {
      this.context = value ? 'detail-panel' : (StateEngine.state.activeGenre || StateEngine.state.year ? 'filter' : 'universe-main');
    });
    bus.on('state:activeGenre', ({ value }) => {
      if (!value && !StateEngine.state.selectedId) this.context = 'universe-main';
      else if (value && !StateEngine.state.selectedId) this.context = 'filter';
    });
    bus.on('state:year', ({ value }) => {
      if (!value && !StateEngine.state.selectedId) this.context = 'universe-main';
      else if (value && !StateEngine.state.selectedId) this.context = 'year-focus';
    });
  },

  // ===== 语义动作接口 =====

  // 移动光标（归一化坐标）
  move(x, y) {
    bus.emit('input:pointer', { x: x * window.innerWidth, y: y * window.innerHeight, normalized: { x, y } });
  },

  // 拖拽/旋转宇宙
  rotate(dx, dy) {
    bus.emit('input:rotate', { dx, dy });
  },

  // 缩放
  zoom(delta) {
    bus.emit('input:zoom', delta);
  },

  // 选择当前悬停的恒星 / 确认操作
  select() {
    bus.emit('input:select');
  },

  // 返回/取消，根据上下文智能处理
  back() {
    if (StateEngine.state.selectedId) {
      StateEngine.select(null);
    } else if (StateEngine.state.activeGenre) {
      StateEngine.clearFilter();
    } else if (StateEngine.state.year) {
      StateEngine.set('year', null);
    } else {
      bus.emit('input:back');
    }
  },

  // 切换年份
  nextYear() {
    this._stepYear(1);
  },

  prevYear() {
    this._stepYear(-1);
  },

  _stepYear(dir) {
    const years = DataEngine.years.value;
    if (!years.length) return;
    const current = StateEngine.state.year;
    if (!current) {
      StateEngine.focusYear(dir > 0 ? years[0] : years[years.length - 1]);
      return;
    }
    const idx = years.indexOf(current);
    const next = years[Math.max(0, Math.min(years.length - 1, idx + dir))];
    if (next) StateEngine.focusYear(next);
  },

  // 聚焦指定流派
  focusGenre(genre) {
    if (!genre) return;
    StateEngine.filterGenre(genre);
  },

  // 聚焦指定年份
  focusYear(year) {
    if (!year) return;
    StateEngine.focusYear(year);
  },

  // 聚焦指定作品
  focusAnime(id) {
    if (!id) return;
    StateEngine.select(id);
  },

  // 搜索
  search(query) {
    bus.emit('input:search', query);
  },

  // 重置视角
  resetCamera() {
    bus.emit('input:reset-camera');
  },

  // 切换全屏
  toggleFullscreen() {
    bus.emit('input:fullscreen');
  },

  // 返回当前可执行动作列表（供 UI 提示用）
  availableActions() {
    const actions = ['move', 'rotate', 'zoom'];
    if (this.context === 'universe-main') {
      actions.push('select', 'back', 'nextYear', 'prevYear', 'search', 'resetCamera');
    } else if (this.context === 'detail-panel') {
      actions.push('back', 'select');
    } else if (this.context === 'filter' || this.context === 'year-focus') {
      actions.push('select', 'back', 'nextYear', 'prevYear');
    }
    return actions;
  }
};

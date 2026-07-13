// src/engines/interaction/InteractionEngine.js
// 统一输入路由引擎：鼠标 / 键盘 / 手势 / 语音 → GestureActionEngine → 业务逻辑

import { bus } from '../core/EventBus.js';
import { StateEngine } from '../core/StateEngine.js';
import { GestureActionEngine } from './GestureActionEngine.js';

export const InteractionEngine = {
  isDragging: false,
  lastPointer: { x: 0, y: 0 },
  keyboardEnabled: true,
  mouseEnabled: true,
  gestureAction: null,

  init({ canvas, onPointerMove, onSelect, onZoom, onBack }) {
    this.canvas = canvas;
    this.gestureAction = GestureActionEngine.init();
    this.bindMouse(canvas, onPointerMove, onSelect, onZoom);
    this.bindKeyboard(canvas, onBack);
    this.bindGlobal();
  },

  bindMouse(canvas, onPointerMove, onSelect, onZoom) {
    if (!this.mouseEnabled) return;

    canvas.addEventListener('pointermove', (e) => {
      StateEngine.set('inputMode', 'mouse');
      const payload = { x: e.clientX, y: e.clientY, normalized: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } };
      bus.emit('input:pointer', payload);
      if (onPointerMove) onPointerMove(payload);

      if (this.isDragging) {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        bus.emit('input:rotate', { dx: dx * 0.008, dy: dy * 0.005 });
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    });

    canvas.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    });

    canvas.addEventListener('click', () => {
      bus.emit('input:select');
      if (onSelect) onSelect();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      bus.emit('input:zoom', e.deltaY);
      if (onZoom) onZoom(e.deltaY);
    }, { passive: false });
  },

  bindKeyboard(canvas, onBack) {
    if (!this.keyboardEnabled) return;

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          bus.emit('input:back');
          if (onBack) onBack();
          break;
        case 'ArrowLeft':
          bus.emit('input:swipe', -1);
          break;
        case 'ArrowRight':
          bus.emit('input:swipe', 1);
          break;
        case 'ArrowUp':
          bus.emit('input:zoom', -80);
          break;
        case 'ArrowDown':
          bus.emit('input:zoom', 80);
          break;
        case 'f':
          if (e.target === document.body) bus.emit('input:fullscreen');
          break;
      }
    });
  },

  bindGlobal() {
    // 手势/语音事件二次分发到语义动作
    bus.on('gesture:move', (pos) => {
      StateEngine.set('inputMode', 'hand');
      this.gestureAction.move(pos.x, pos.y);
    });

    bus.on('gesture:select', () => this.gestureAction.select());
    bus.on('gesture:back', () => this.gestureAction.back());
    bus.on('gesture:swipe', (dir) => {
      if (dir > 0) this.gestureAction.nextYear();
      else this.gestureAction.prevYear();
    });
    bus.on('gesture:zoom', (delta) => this.gestureAction.zoom(delta));

    bus.on('voice:intent', (intent) => {
      StateEngine.set('inputMode', 'voice');
      StateEngine.set('voiceIntent', intent);
      this.dispatchVoiceIntent(intent);
    });

    // 新的语义动作事件统一处理
    bus.on('input:search', (query) => {
      bus.emit('action:search', query);
    });
    bus.on('input:reset-camera', () => {
      bus.emit('action:reset-camera');
    });
  },

  dispatchVoiceIntent(intent) {
    switch (intent.action) {
      case 'focus-year':
        this.gestureAction.focusYear(intent.year);
        break;
      case 'focus-anime':
        this.gestureAction.focusAnime(intent.id);
        break;
      case 'recommend':
        this.gestureAction.focusGenre(intent.genre);
        break;
      case 'back':
        this.gestureAction.back();
        break;
      case 'home':
        StateEngine.navigate('landing');
        break;
      case 'clear':
        StateEngine.clearFilter();
        break;
      case 'search':
        this.gestureAction.search(intent.query);
        break;
    }
  }
};

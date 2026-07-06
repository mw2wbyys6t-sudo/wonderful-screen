// src/engines/interaction/InteractionEngine.js
// 统一输入路由引擎：鼠标 / 键盘 / 手势 / 语音 → 事件总线

import { bus } from '../core/EventBus.js';
import { StateEngine } from '../core/StateEngine.js';

export const InteractionEngine = {
  isDragging: false,
  lastPointer: { x: 0, y: 0 },
  keyboardEnabled: true,
  mouseEnabled: true,

  init({ canvas, onPointerMove, onSelect, onZoom, onBack }) {
    this.canvas = canvas;
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
    // 手势/语音事件二次分发到语义事件
    bus.on('gesture:move', (pos) => {
      StateEngine.set('inputMode', 'hand');
      bus.emit('input:pointer', { x: pos.x * window.innerWidth, y: pos.y * window.innerHeight, normalized: pos });
    });

    bus.on('gesture:select', () => bus.emit('input:select'));
    bus.on('gesture:back', () => bus.emit('input:back'));
    bus.on('gesture:swipe', (dir) => bus.emit('input:swipe', dir));
    bus.on('gesture:zoom', (delta) => bus.emit('input:zoom', delta));

    bus.on('voice:intent', (intent) => {
      StateEngine.set('inputMode', 'voice');
      StateEngine.set('voiceIntent', intent);
      this.dispatchVoiceIntent(intent);
    });
  },

  dispatchVoiceIntent(intent) {
    switch (intent.action) {
      case 'focus-year':
        StateEngine.focusYear(intent.year);
        break;
      case 'focus-anime':
        StateEngine.select(intent.id);
        break;
      case 'recommend':
        StateEngine.filterGenre(intent.genre);
        break;
      case 'back':
        bus.emit('input:back');
        break;
      case 'home':
        StateEngine.navigate('landing');
        break;
      case 'clear':
        StateEngine.clearFilter();
        break;
    }
  }
};

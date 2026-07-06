// src/engines/interaction/GestureEngine.js
// 手势识别引擎：基于 MediaPipe Hands，支持 pointing / pinch / open / fist / swipe

import { ref } from 'vue';
import { bus } from '../core/EventBus.js';

const CONFIG = {
  CAMERA_WIDTH: 320,
  CAMERA_HEIGHT: 240,
  PINCH_THRESHOLD: 0.06,
  PINCH_COOLDOWN_MS: 700,
  OPEN_HOLD_MS: 600,
  FIST_HOLD_MS: 500,
  SWIPE_THRESHOLD: 0.18,
  SWIPE_COOLDOWN_MS: 800,
  CURSOR_LERP: 0.22,
  HAND_DEAD_ZONE_PX: 5,
  ZOOM_THRESHOLD: 0.12,
  CAMERA_TIMEOUT_MS: 10000
};

let mediaPipeLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`加载失败: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadMediaPipe() {
  if (mediaPipeLoaded) return;
  await Promise.all([
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
  ]);
  mediaPipeLoaded = true;
}

export const GestureEngine = {
  config: CONFIG,
  isReady: ref(false),
  isRunning: ref(false),
  error: ref(null),
  gestureText: ref(''),
  handX: ref(0.5),
  handY: ref(0.5),

  hands: null,
  camera: null,
  videoRef: null,
  canvasRef: null,
  cameraTimer: null,

  cursor: { x: 0.5, y: 0.5 },
  lastCursor: { x: 0.5, y: 0.5 },
  lastPinchTime: 0,
  lastSwipeTime: 0,
  openStartTime: 0,
  fistStartTime: 0,
  lastHandX: 0,
  swipeHistory: [],

  async init() {
    if (this.hands) return;
    try {
      await loadMediaPipe();
      if (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
        throw new Error('MediaPipe 库未正确加载');
      }
      this.isReady.value = true;
    } catch (err) {
      this.error.value = err.message;
      this.isReady.value = false;
      console.error('[GestureEngine] 初始化失败:', err);
    }
  },

  async start(videoRef, canvasRef) {
    if (!this.isReady.value) await this.init();
    if (!this.isReady.value || !window.Hands || !window.Camera) return false;

    this.videoRef = videoRef;
    this.canvasRef = canvasRef;
    this.isRunning.value = true;
    this.error.value = null;

    try {
      this.canvasRef.width = CONFIG.CAMERA_WIDTH;
      this.canvasRef.height = CONFIG.CAMERA_HEIGHT;

      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      this.hands.onResults(this.onResults.bind(this));

      this.camera = new window.Camera(videoRef, {
        onFrame: async () => {
          if (this.isRunning.value && this.hands) {
            await this.hands.send({ image: videoRef });
          }
        },
        width: CONFIG.CAMERA_WIDTH,
        height: CONFIG.CAMERA_HEIGHT
      });

      await Promise.race([
        this.camera.start(),
        new Promise((_, reject) => {
          this.cameraTimer = setTimeout(() => reject(new Error('摄像头启动超时')), CONFIG.CAMERA_TIMEOUT_MS);
        })
      ]);

      clearTimeout(this.cameraTimer);
      return true;
    } catch (err) {
      let message = err.message || '摄像头初始化失败';
      if (err.name === 'NotAllowedError' || /permission|denied|allow/i.test(message)) {
        message = '摄像头权限被拒绝，请在浏览器地址栏允许摄像头访问后重试';
      } else if (/notfound|not found|in use/i.test(message)) {
        message = '未检测到可用摄像头，请检查设备连接';
      }
      this.error.value = message;
      this.isRunning.value = false;
      console.error('[GestureEngine] 启动失败:', err);
      return false;
    }
  },

  stop() {
    this.isRunning.value = false;
    if (this.camera) {
      try {
        this.camera.stop?.();
      } catch (e) {}
      this.camera = null;
    }
    if (this.hands) {
      try {
        this.hands.close?.();
      } catch (e) {}
      this.hands = null;
    }
    if (this.videoRef && this.videoRef.srcObject) {
      try {
        this.videoRef.srcObject.getTracks?.().forEach(track => track.stop());
        this.videoRef.srcObject = null;
      } catch (e) {}
    }
    clearTimeout(this.cameraTimer);
    this.cursor = { x: 0.5, y: 0.5 };
    this.lastCursor = { x: 0.5, y: 0.5 };
    this.handX.value = 0.5;
    this.handY.value = 0.5;
    this.gestureText.value = '';
  },

  onResults(results) {
    const ctx = this.canvasRef?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-this.canvasRef.width, 0);
      ctx.drawImage(this.videoRef, 0, 0, this.canvasRef.width, this.canvasRef.height);
      ctx.restore();
    }

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      this.gestureText.value = '';
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    this.detectGesture(landmarks);

    if (ctx) {
      this.drawSkeleton(ctx, landmarks);
    }
  },

  detectGesture(landmarks) {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const middleMCP = landmarks[9];

    // 食指光标位置（镜像）
    const rawX = 1 - indexTip.x;
    const rawY = indexTip.y;
    this.cursor.x += (rawX - this.cursor.x) * CONFIG.CURSOR_LERP;
    this.cursor.y += (rawY - this.cursor.y) * CONFIG.CURSOR_LERP;

    const dx = Math.abs(this.cursor.x - this.lastCursor.x) * window.innerWidth;
    const dy = Math.abs(this.cursor.y - this.lastCursor.y) * window.innerHeight;
    if (dx > CONFIG.HAND_DEAD_ZONE_PX || dy > CONFIG.HAND_DEAD_ZONE_PX) {
      this.handX.value = this.cursor.x;
      this.handY.value = this.cursor.y;
      bus.emit('gesture:move', { x: this.cursor.x, y: this.cursor.y });
      this.lastCursor = { x: this.cursor.x, y: this.cursor.y };
    }

    // 捏合：食指拇指距离
    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const now = performance.now();

    // 手指是否伸直
    const isIndexExtended = indexTip.y < middleMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isRingExtended = ringTip.y < middleMCP.y;
    const isPinkyExtended = pinkyTip.y < middleMCP.y;

    // 握拳检测：所有指尖靠近掌心
    const isFist = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;

    // 张开手掌
    const isOpen = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    // 捏合选择
    if (pinchDist < CONFIG.PINCH_THRESHOLD && now - this.lastPinchTime > CONFIG.PINCH_COOLDOWN_MS) {
      this.lastPinchTime = now;
      this.gestureText.value = '捏合 · 选择';
      bus.emit('gesture:select');
      return;
    }

    // 握拳持续触发返回
    if (isFist) {
      if (!this.fistStartTime) this.fistStartTime = now;
      if (now - this.fistStartTime > CONFIG.FIST_HOLD_MS) {
        this.gestureText.value = '握拳 · 返回';
        bus.emit('gesture:back');
        this.fistStartTime = now + 1000; // 冷却
      }
    } else {
      this.fistStartTime = 0;
    }

    // 张开手掌持续触发返回/打开
    if (isOpen) {
      if (!this.openStartTime) this.openStartTime = now;
      if (now - this.openStartTime > CONFIG.OPEN_HOLD_MS) {
        this.gestureText.value = '张开 · 返回';
        bus.emit('gesture:back');
        this.openStartTime = now + 1000;
      }
    } else {
      this.openStartTime = 0;
    }

    // 挥手切换年份
    this.swipeHistory.push({ x: wrist.x, t: now });
    this.swipeHistory = this.swipeHistory.filter(p => now - p.t < 400);
    if (this.swipeHistory.length >= 2 && now - this.lastSwipeTime > CONFIG.SWIPE_COOLDOWN_MS) {
      const first = this.swipeHistory[0].x;
      const last = this.swipeHistory[this.swipeHistory.length - 1].x;
      const delta = first - last; // 镜像后，左挥手为负，右挥手为正
      if (Math.abs(delta) > CONFIG.SWIPE_THRESHOLD) {
        this.lastSwipeTime = now;
        const dir = delta > 0 ? -1 : 1; // 左挥手 = 上一年，右挥手 = 下一年
        this.gestureText.value = dir > 0 ? '右挥 · 下一年' : '左挥 · 上一年';
        bus.emit('gesture:swipe', dir);
      }
    }

    if (!this.gestureText.value) {
      this.gestureText.value = isOpen ? '张开手掌' : (isFist ? '握拳' : '指向');
    }
  },

  drawSkeleton(ctx, landmarks) {
    ctx.fillStyle = '#00f3ff';
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
    ctx.lineWidth = 1.5;

    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

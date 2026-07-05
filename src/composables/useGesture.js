import { ref } from 'vue';

const CONFIG = {
  CAMERA_WIDTH: 320,
  CAMERA_HEIGHT: 240,
  PINCH_THRESHOLD: 0.05,
  PINCH_COOLDOWN_MS: 600,
  PINCH_HOLD_MS: 150,
  OPEN_HAND_HOLD_MS: 250,
  CAMERA_TIMEOUT_MS: 10000,
  CURSOR_LERP: 0.18,
  HAND_DEAD_ZONE_PX: 6
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

function getGestureText(gesture) {
  const map = {
    none: '等待手势…',
    point: '指向 ✋',
    pinch: '捏合 👌',
    open: '张开 🖐',
    swipe: '滑动 👋',
    fist: '握拳 ✊'
  };
  return map[gesture] || gesture;
}

export function useGesture() {
  const handX = ref(0);
  const handY = ref(0);
  const gestureText = ref(getGestureText('none'));
  const isReady = ref(false);
  const error = ref('');
  const mode = ref('mouse');

  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;
  let hands = null;
  let camera = null;
  let cameraTimer = null;

  let handlers = {
    onMove: null,
    onPinch: null,
    onOpen: null,
    onSwipe: null,
    onActive: null
  };

  let smoothedHandX = 0;
  let smoothedHandY = 0;
  let isPinching = false;
  let lastPinchTime = 0;
  let pinchStartTime = 0;
  let openHandStartTime = 0;
  let openHandTriggered = false;
  let lastGestureTime = 0;
  let velocityX = 0;

  function setHandlers(newHandlers) {
    handlers = { ...handlers, ...newHandlers };
  }

  function isFingersExtended(landmarks) {
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    const extended = {};
    tips.forEach((tip, i) => {
      const pip = pips[i];
      extended[['index', 'middle', 'ring', 'pinky'][i]] = landmarks[tip].y < landmarks[pip].y;
    });
    return extended;
  }

  function detectGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const fingers = isFingersExtended(landmarks);
    const now = performance.now();

    let gesture = 'point';

    if (pinchDist < CONFIG.PINCH_THRESHOLD) {
      gesture = 'pinch';
      if (!isPinching) {
        isPinching = true;
        pinchStartTime = now;
      }
      if (now - pinchStartTime > CONFIG.PINCH_HOLD_MS && now - lastPinchTime > CONFIG.PINCH_COOLDOWN_MS) {
        lastPinchTime = now;
        if (handlers.onPinch) handlers.onPinch();
      }
    } else {
      isPinching = false;
      if (fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
        gesture = 'open';
        if (openHandStartTime === 0) openHandStartTime = now;
        if (now - openHandStartTime > CONFIG.OPEN_HAND_HOLD_MS && !openHandTriggered) {
          openHandTriggered = true;
          if (handlers.onOpen) handlers.onOpen();
        }
      } else if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        gesture = 'fist';
        openHandStartTime = 0;
        openHandTriggered = false;
      } else {
        openHandStartTime = 0;
        openHandTriggered = false;
      }
    }

    const targetX = (1 - landmarks[9].x) * window.innerWidth;
    const targetY = landmarks[9].y * window.innerHeight;
    smoothedHandX += (targetX - smoothedHandX) * CONFIG.CURSOR_LERP;
    smoothedHandY += (targetY - smoothedHandY) * CONFIG.CURSOR_LERP;

    const dx = smoothedHandX - handX.value;
    const now2 = performance.now();
    const dt = Math.max(1, now2 - lastGestureTime);
    velocityX = velocityX * 0.8 + (dx / dt) * 0.2;
    lastGestureTime = now2;

    if (Math.abs(smoothedHandX - handX.value) > CONFIG.HAND_DEAD_ZONE_PX ||
        Math.abs(smoothedHandY - handY.value) > CONFIG.HAND_DEAD_ZONE_PX) {
      handX.value = smoothedHandX;
      handY.value = smoothedHandY;
      if (handlers.onMove) handlers.onMove(handX.value, handY.value);
      if (handlers.onActive) handlers.onActive(true);
    }

    if (Math.abs(velocityX) > 0.8 && now - lastPinchTime > CONFIG.PINCH_COOLDOWN_MS) {
      gesture = 'swipe';
      if (handlers.onSwipe) handlers.onSwipe(velocityX * 0.02);
      velocityX = 0;
    }

    gestureText.value = getGestureText(gesture);
  }

  function onHandResults(results) {
    if (!canvasCtx || !canvasEl) return;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasCtx.translate(canvasEl.width, 0);
    canvasCtx.scale(-1, 1);
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
            color: '#00f3ff',
            lineWidth: 1.5
          });
          window.drawLandmarks(canvasCtx, landmarks, {
            color: '#ff2a6d',
            lineWidth: 1,
            radius: 2
          });
        }
        detectGesture(landmarks);
      }
    }
    canvasCtx.restore();
  }

  async function start(videoRef, canvasRef) {
    if (camera) return;
    if (!videoRef?.value || !canvasRef?.value) {
      error.value = '缺少摄像头或画布元素';
      return;
    }
    videoEl = videoRef.value;
    canvasEl = canvasRef.value;
    canvasCtx = canvasEl.getContext('2d');
    error.value = '';

    try {
      await loadMediaPipe();
      if (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
        throw new Error('MediaPipe 库未正确加载');
      }

      canvasEl.width = CONFIG.CAMERA_WIDTH;
      canvasEl.height = CONFIG.CAMERA_HEIGHT;

      hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      hands.onResults(onHandResults);

      camera = new window.Camera(videoEl, {
        onFrame: async () => {
          await hands.send({ image: videoEl });
        },
        width: CONFIG.CAMERA_WIDTH,
        height: CONFIG.CAMERA_HEIGHT
      });

      await Promise.race([
        camera.start(),
        new Promise((_, reject) => {
          cameraTimer = setTimeout(() => reject(new Error('摄像头启动超时')), CONFIG.CAMERA_TIMEOUT_MS);
        })
      ]);

      clearTimeout(cameraTimer);
      isReady.value = true;
      mode.value = 'camera';
    } catch (err) {
      console.warn('手势摄像头初始化失败:', err);
      let message = err.message || '摄像头初始化失败';
      if (err.name === 'NotAllowedError' || /permission|denied|allow/i.test(message)) {
        message = '摄像头权限被拒绝，请在浏览器地址栏允许摄像头访问后重试';
      } else if (/notfound|not found|in use/i.test(message)) {
        message = '未检测到可用摄像头，请检查设备连接';
      }
      error.value = message;
      mode.value = 'mouse';
      stop();
    }
  }

  function stop() {
    if (camera) {
      try {
        camera.stop?.();
      } catch (e) {}
      camera = null;
    }
    if (hands) {
      try {
        hands.close?.();
      } catch (e) {}
      hands = null;
    }
    if (videoEl && videoEl.srcObject) {
      try {
        videoEl.srcObject.getTracks?.().forEach(track => track.stop());
        videoEl.srcObject = null;
      } catch (e) {}
    }
    if (canvasCtx && canvasEl) {
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    clearTimeout(cameraTimer);
    isReady.value = false;
    mode.value = 'mouse';
    smoothedHandX = 0;
    smoothedHandY = 0;
    handX.value = 0;
    handY.value = 0;
    gestureText.value = getGestureText('none');
    velocityX = 0;
    openHandStartTime = 0;
    openHandTriggered = false;
    isPinching = false;
  }

  return {
    handX,
    handY,
    gestureText,
    isReady,
    error,
    mode,
    start,
    stop,
    setHandlers
  };
}

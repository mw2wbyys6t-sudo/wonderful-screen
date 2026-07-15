// src/engines/universe/GalaxyEngine.js
// AnimeVerse 3D 星系渲染引擎：年份银河 + 知识图谱连线

import * as THREE from 'three';
import { DataEngine } from '../data/DataEngine.js';
import { KnowledgeEngine } from '../data/KnowledgeEngine.js';
import { TimelineEngine } from './TimelineEngine.js';
import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';

function createGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getDeviceTier() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (memory <= 4 || cores <= 4 || isMobile) return 'low';
  if (memory >= 8 && cores >= 8 && dpr <= 2) return 'high';
  return 'medium';
}

export function GalaxyEngine(canvasRef, options = {}) {
  let renderer, scene, camera, galaxyGroup;
  let starPoints, ringLines, relationLines, coreMesh;
  let glowTexture;
  let animationId;
  let resizeHandler;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const INITIAL_CAMERA = {
    theta: 0,
    phi: Math.PI / 2.5,
    radius: 260,
    target: new THREE.Vector3(0, 0, 0)
  };

  const cameraState = {
    theta: INITIAL_CAMERA.theta,
    phi: INITIAL_CAMERA.phi,
    radius: INITIAL_CAMERA.radius,
    target: INITIAL_CAMERA.target.clone(),
    animating: false
  };

  // 手势控制状态
  const handControl = {
    enabled: false,
    pos: { x: 0.5, y: 0.5 },
    lastPos: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    lastMoveTime: 0,
    zoomVelocity: 0,
    firstMove: true,
    sensitivity: 2.4,      // 手势移动转相机旋转的灵敏度
    edgeSensitivity: 0.35, // 边缘持续旋转强度
    deadZone: 0.08,        // 中心死区（避免手轻微抖动引起旋转）
    smooth: 0.18,          // 速度平滑系数
    inputMode: 'mouse'     // mouse | hand
  };

  let isVisible = true;
  let isPaused = false;
  let visibilityHandler = null;
  let lastFrameTime = performance.now();

  const hoveredId = { value: null };
  const selectedId = { value: null };
  const idToIndex = new Map();
  const indexToId = new Map();
  let starPositions = new Float32Array(0);
  let starColors = new Float32Array(0);
  let starSizes = new Float32Array(0);
  let starOriginalColors = new Float32Array(0);

  // 缓存 year/genre -> index[]，避免高亮时 O(n) 查表
  const indicesByYear = new Map();
  const indicesByGenre = new Map();
  let currentSearchIds = new Set();

  const tier = getDeviceTier();
  const MAX_RELATION_LINES = tier === 'low' ? 80 : tier === 'medium' ? 150 : 300;

  function init() {
    if (!canvasRef.value) return false;

    // 严格预检 WebGL：部分浏览器虽能创建 WebGLRenderer，但上下文异常会导致黑屏
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      if (options.onError) options.onError('当前环境不支持 WebGL');
      return false;
    }

    try {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x03030a, 0.0018);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
      updateCamera();

      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: tier !== 'low', alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1 : 2));
      renderer.setClearColor(0x000000, 0);

      galaxyGroup = new THREE.Group();
      scene.add(galaxyGroup);

      glowTexture = createGlowTexture(128);

      buildCore();
      buildStars();
      buildYearRings();

      resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeHandler);

      visibilityHandler = () => {
        isVisible = document.visibilityState !== 'hidden';
        if (isVisible) lastFrameTime = performance.now();
      };
      document.addEventListener('visibilitychange', visibilityHandler);

      bindEvents();
      animate();
      if (options.onReady) options.onReady();
      return true;
    } catch (err) {
      console.error('[GalaxyEngine] 初始化失败:', err);
      if (options.onError) options.onError('当前环境不支持 WebGL');
      return false;
    }
  }

  function buildCore() {
    const geometry = new THREE.SphereGeometry(6, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.9
    });
    coreMesh = new THREE.Mesh(geometry, material);

    const glowGeo = new THREE.SphereGeometry(18, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.12
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    coreMesh.add(glow);

    galaxyGroup.add(coreMesh);
  }

  function buildStars() {
    const data = DataEngine.data.value;
    const count = data.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const color = new THREE.Color();
    const positionsMap = TimelineEngine.positionsForAll();

    data.forEach((anime, i) => {
      const pos = positionsMap.get(String(anime.id)) || { x: 0, y: 0, z: 0 };
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const yearColor = typeof pos.color === 'string'
        ? new THREE.Color(pos.color)
        : (pos.color || new THREE.Color(0x00f3ff));
      colors[i * 3] = yearColor.r;
      colors[i * 3 + 1] = yearColor.g;
      colors[i * 3 + 2] = yearColor.b;

      const score = anime.score || 70;
      sizes[i] = 2 + (score / 100) * 4;

      idToIndex.set(String(anime.id), i);
      indexToId.set(i, String(anime.id));

      // 构建 year/genre 索引缓存
      const year = anime.year;
      if (year != null) {
        if (!indicesByYear.has(year)) indicesByYear.set(year, []);
        indicesByYear.get(year).push(i);
      }
      (anime.genres || []).forEach(g => {
        if (!indicesByGenre.has(g)) indicesByGenre.set(g, []);
        indicesByGenre.get(g).push(i);
      });
    });

    starPositions = positions;
    starColors = colors;
    starSizes = sizes;
    starOriginalColors = new Float32Array(colors);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    if (starPoints) {
      galaxyGroup.remove(starPoints);
      starPoints.geometry.dispose();
    }

    starPoints = new THREE.Points(geometry, material);
    galaxyGroup.add(starPoints);
  }

  function buildYearRings() {
    const years = TimelineEngine.buildYears();
    const points = [];

    years.forEach(y => {
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + y.angleOffset;
        const x = Math.cos(angle) * y.radius;
        const z = Math.sin(angle) * y.radius;
        points.push(x, y.y, z);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08
    });

    ringLines = new THREE.LineSegments(geometry, material);
    galaxyGroup.add(ringLines);
  }

  function buildRelations(seedId) {
    if (relationLines) {
      galaxyGroup.remove(relationLines);
      relationLines.geometry.dispose();
      relationLines = null;
    }
    if (!seedId) return;

    const related = KnowledgeEngine.related(seedId)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_RELATION_LINES);

    if (!related.length) return;

    const idx = idToIndex.get(String(seedId));
    if (idx === undefined) return;

    const positions = [];
    const colors = [];
    const sx = starPositions[idx * 3];
    const sy = starPositions[idx * 3 + 1];
    const sz = starPositions[idx * 3 + 2];
    const c = new THREE.Color();

    related.forEach(r => {
      const tIdx = idToIndex.get(String(r.neighbor));
      if (tIdx === undefined) return;

      positions.push(sx, sy, sz);
      positions.push(starPositions[tIdx * 3], starPositions[tIdx * 3 + 1], starPositions[tIdx * 3 + 2]);

      const typeColor = {
        'sequel': 0xff2a6d,
        'prequel': 0xff2a6d,
        'same-studio': 0x00f3ff,
        'same-author': 0xb892ff,
        'same-genre': 0x66ffaa,
        'same-music': 0xffcc00,
        'same-era': 0xaaaaaa
      }[r.type] || 0xffffff;

      c.setHex(typeColor);
      colors.push(c.r, c.g, c.b);
      colors.push(c.r, c.g, c.b);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    relationLines = new THREE.LineSegments(geometry, material);
    galaxyGroup.add(relationLines);
  }

  function updateCamera() {
    const x = cameraState.target.x + cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
    const y = cameraState.target.y + cameraState.radius * Math.cos(cameraState.phi);
    const z = cameraState.target.z + cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
    camera.position.set(x, y, z);
    camera.lookAt(cameraState.target);
  }

  function setPointerFromScreen(x, y) {
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
  }

  function raycast() {
    if (!starPoints) return null;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(starPoints);
    if (intersects.length) {
      const idx = intersects[0].index;
      return indexToId.get(idx) || null;
    }
    return null;
  }

  function highlightHovered(id) {
    if (hoveredId.value === id) return;
    hoveredId.value = id;

    const colors = starPoints.geometry.attributes.color.array;
    const count = colors.length / 3;

    // 快速路径：无悬停且未选中时直接恢复原始颜色
    if (!id && !selectedId.value) {
      if (colors.length === starOriginalColors.length) {
        colors.set(starOriginalColors);
      } else {
        for (let i = 0; i < colors.length; i++) colors[i] = starOriginalColors[i];
      }
      starPoints.geometry.attributes.color.needsUpdate = true;
      return;
    }

    for (let i = 0; i < count; i++) {
      const idStr = indexToId.get(i);
      const isHovered = idStr === id;
      const isSelected = idStr === selectedId.value;
      const isDimmed = (id || selectedId.value) && !isHovered && !isSelected;

      if (isHovered || isSelected) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (isDimmed) {
        colors[i * 3] = starOriginalColors[i * 3] * 0.35;
        colors[i * 3 + 1] = starOriginalColors[i * 3 + 1] * 0.35;
        colors[i * 3 + 2] = starOriginalColors[i * 3 + 2] * 0.35;
      } else {
        colors[i * 3] = starOriginalColors[i * 3];
        colors[i * 3 + 1] = starOriginalColors[i * 3 + 1];
        colors[i * 3 + 2] = starOriginalColors[i * 3 + 2];
      }
    }

    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function select(id) {
    selectedId.value = id;
    StateEngine.select(id);
    buildRelations(id);
    highlightHovered(hoveredId.value);
  }

  function highlightYear(year) {
    if (!year) {
      resetHighlight();
      return;
    }
    const colors = starPoints.geometry.attributes.color.array;
    const matchSet = new Set(indicesByYear.get(year) || []);

    // 先全部按暗色铺底
    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.25;
    }
    // 仅点亮命中
    matchSet.forEach(idx => {
      colors[idx * 3] = 1;
      colors[idx * 3 + 1] = 1;
      colors[idx * 3 + 2] = 1;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function highlightGenre(genre) {
    if (!genre) {
      resetHighlight();
      return;
    }
    const colors = starPoints.geometry.attributes.color.array;
    const matchSet = new Set(indicesByGenre.get(genre) || []);
    const genreColor = DataEngine.genres.value.genres?.[genre]?.color || '#00f3ff';
    const c = new THREE.Color(genreColor);

    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.2;
    }
    matchSet.forEach(idx => {
      colors[idx * 3] = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function highlightSearchResults(ids) {
    if (!ids || ids.length === 0) {
      resetHighlight();
      return;
    }
    currentSearchIds = new Set(ids.map(String));
    const colors = starPoints.geometry.attributes.color.array;
    const matchIdx = new Set();
    currentSearchIds.forEach(id => {
      const idx = idToIndex.get(String(id));
      if (idx !== undefined) matchIdx.add(idx);
    });

    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.25;
    }
    matchIdx.forEach(idx => {
      colors[idx * 3] = 1;
      colors[idx * 3 + 1] = 0.35;
      colors[idx * 3 + 2] = 0.75;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function resetHighlight() {
    currentSearchIds.clear();
    const colors = starPoints.geometry.attributes.color.array;
    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i];
    }
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function focusOnYear(year) {
    const target = TimelineEngine.cameraTargetForYear(year);
    if (!target) return;
    animateCamera({
      target: { x: target.x, y: target.y, z: target.z },
      radius: target.radius,
      theta: target.theta,
      phi: target.phi
    });
  }

  function focusOnAnime(id) {
    const idx = idToIndex.get(String(id));
    if (idx === undefined) return;
    const x = starPositions[idx * 3];
    const y = starPositions[idx * 3 + 1];
    const z = starPositions[idx * 3 + 2];

    animateCamera({
      target: { x, y, z },
      radius: 60,
      theta: cameraState.theta + Math.PI * 0.3,
      phi: Math.PI / 2.3
    });
  }

  function focusOnSearchResults(results) {
    if (!results || results.length === 0) return;
    const matched = [];
    results.forEach(r => {
      const id = r.id || r;
      const idx = idToIndex.get(String(id));
      if (idx !== undefined) matched.push(idx);
    });
    if (matched.length === 0) return;

    highlightSearchResults(results.map(r => r.id || r));

    // 计算命中作品的质心并聚焦
    const cx = matched.reduce((s, i) => s + starPositions[i * 3], 0) / matched.length;
    const cy = matched.reduce((s, i) => s + starPositions[i * 3 + 1], 0) / matched.length;
    const cz = matched.reduce((s, i) => s + starPositions[i * 3 + 2], 0) / matched.length;

    // 估算包围半径
    let maxDist = 0;
    matched.forEach(i => {
      const dx = starPositions[i * 3] - cx;
      const dy = starPositions[i * 3 + 1] - cy;
      const dz = starPositions[i * 3 + 2] - cz;
      maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy + dz * dz));
    });
    const radius = Math.max(60, Math.min(260, maxDist * 1.8 + 40));

    animateCamera({
      target: { x: cx, y: cy, z: cz },
      radius,
      theta: cameraState.theta + Math.PI * 0.25,
      phi: Math.PI / 2.4
    });
  }

  function animateCamera(targetConfig) {
    cameraState.animating = true;
    const startTarget = cameraState.target.clone();
    const endTarget = new THREE.Vector3(targetConfig.target?.x || 0, targetConfig.target?.y || 0, targetConfig.target?.z || 0);
    const startRadius = cameraState.radius;
    const endRadius = targetConfig.radius ?? cameraState.radius;
    const startTheta = cameraState.theta;
    const endTheta = targetConfig.theta ?? cameraState.theta;
    const startPhi = cameraState.phi;
    const endPhi = targetConfig.phi ?? cameraState.phi;

    const duration = 1500;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      cameraState.target.lerpVectors(startTarget, endTarget, ease);
      cameraState.radius = startRadius + (endRadius - startRadius) * ease;
      cameraState.theta = startTheta + (endTheta - startTheta) * ease;
      cameraState.phi = startPhi + (endPhi - startPhi) * ease;
      updateCamera();

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        cameraState.animating = false;
      }
    }
    requestAnimationFrame(step);
  }

  function rotateCameraByVelocity(dTheta, dPhi = 0) {
    if (cameraState.animating) return;
    cameraState.theta += dTheta;
    cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15, cameraState.phi + dPhi));
    updateCamera();
  }

  function zoom(delta) {
    if (cameraState.animating) return;
    cameraState.radius = Math.max(40, Math.min(900, cameraState.radius + delta));
    updateCamera();
  }

  function bindEvents() {
    bus.on('timeline:focus-year', (year) => {
      highlightYear(year);
      focusOnYear(year);
    });

    bus.on('timeline:filter-genre', (genre) => {
      highlightGenre(genre);
    });

    bus.on('timeline:clear-filter', () => {
      resetHighlight();
    });

    bus.on('anime:selected', (id) => {
      selectedId.value = id;
      buildRelations(id);
      highlightHovered(hoveredId.value);
      focusOnAnime(id);
    });

    // ---- 手势控制 3D 相机 ----
    bus.on('gesture:move', ({ x, y }) => {
      if (!handControl.enabled) return;
      handControl.pos = { x, y };
      handControl.lastMoveTime = performance.now();
      // 首次移动只记录位置，避免从 (0.5,0.5) 跳变导致相机猛转
      if (handControl.firstMove) {
        handControl.lastPos = { x, y };
        handControl.firstMove = false;
      }
    });

    bus.on('gesture:pinch:start', () => {
      if (!handControl.enabled) return;
      // 捏合 = 放大聚焦
      handControl.zoomVelocity -= 2.2;
    });

    bus.on('gesture:open:progress', (progress) => {
      if (!handControl.enabled) return;
      // 张开手掌持续 = 缩小拉远
      if (progress > 0.85) {
        handControl.zoomVelocity += 0.08;
      }
    });

    bus.on('gesture:fist:progress', (progress) => {
      if (!handControl.enabled) return;
      // 握拳持续 = 进一步放大
      if (progress > 0.85) {
        handControl.zoomVelocity -= 0.08;
      }
    });
  }

  function updateHandControl(dt) {
    if (!handControl.enabled || cameraState.animating) return;

    const now = performance.now();
    const inactive = now - handControl.lastMoveTime > 250;

    // 计算手势移动 delta
    const dx = handControl.pos.x - handControl.lastPos.x;
    const dy = handControl.pos.y - handControl.lastPos.y;
    handControl.lastPos = { ...handControl.pos };

    // 平滑速度
    const targetVx = inactive ? 0 : dx;
    const targetVy = inactive ? 0 : dy;
    handControl.velocity.x += (targetVx - handControl.velocity.x) * handControl.smooth;
    handControl.velocity.y += (targetVy - handControl.velocity.y) * handControl.smooth;

    // 基于移动速度旋转相机（dt 归一化到 60fps）
    const dtFactor = Math.min(dt / 16.67, 3);
    if (!inactive) {
      cameraState.theta -= handControl.velocity.x * handControl.sensitivity * dtFactor;
      cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15,
        cameraState.phi - handControl.velocity.y * handControl.sensitivity * dtFactor));
    }

    // 边缘持续旋转（手停在边缘时缓慢环顾）
    const cx = handControl.pos.x - 0.5;
    const cy = handControl.pos.y - 0.5;
    const edgeX = Math.max(0, Math.abs(cx) - 0.35) * Math.sign(cx);
    const edgeY = Math.max(0, Math.abs(cy) - 0.35) * Math.sign(cy);
    if (!inactive && (Math.abs(edgeX) > 0.001 || Math.abs(edgeY) > 0.001)) {
      cameraState.theta -= edgeX * handControl.edgeSensitivity * dt * 0.001;
      cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15,
        cameraState.phi - edgeY * handControl.edgeSensitivity * dt * 0.001));
    }

    // 缩放速度应用与衰减
    if (Math.abs(handControl.zoomVelocity) > 0.001) {
      cameraState.radius = Math.max(40, Math.min(900,
        cameraState.radius + handControl.zoomVelocity * dtFactor));
      handControl.zoomVelocity *= Math.pow(0.88, dtFactor);
    }

    updateCamera();
  }

  function setHandControl(enabled) {
    handControl.enabled = enabled;
    if (enabled) {
      handControl.pos = { x: 0.5, y: 0.5 };
      handControl.lastPos = { x: 0.5, y: 0.5 };
      handControl.velocity = { x: 0, y: 0 };
      handControl.zoomVelocity = 0;
      handControl.lastMoveTime = performance.now();
      handControl.firstMove = true;
      handControl.inputMode = 'hand';
    } else {
      handControl.inputMode = 'mouse';
    }
  }

  function setInputMode(mode) {
    handControl.inputMode = mode;
    if (mode === 'hand') {
      setHandControl(true);
    } else {
      setHandControl(false);
    }
  }

  function resetCameraState() {
    cameraState.theta = INITIAL_CAMERA.theta;
    cameraState.phi = INITIAL_CAMERA.phi;
    cameraState.radius = INITIAL_CAMERA.radius;
    cameraState.target.copy(INITIAL_CAMERA.target);
    updateCamera();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // 后台/不可见时暂停渲染，节省性能
    if (!isVisible || isPaused) {
      lastFrameTime = performance.now();
      return;
    }

    const now = performance.now();
    const dt = Math.min(now - lastFrameTime, 50);
    lastFrameTime = now;

    if (coreMesh) coreMesh.rotation.y += 0.002 * (dt / 16.67);
    // 手势控制时暂停自动旋转，避免与手控冲突
    if (galaxyGroup && !cameraState.animating && !handControl.enabled) {
      galaxyGroup.rotation.y += 0.0003 * (dt / 16.67);
    }
    updateHandControl(dt);
    renderer.render(scene, camera);
  }

  function dispose() {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resizeHandler);
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    if (renderer) renderer.dispose();
    if (starPoints) starPoints.geometry.dispose();
    if (ringLines) ringLines.geometry.dispose();
    if (relationLines) relationLines.geometry.dispose();
    if (glowTexture) glowTexture.dispose();
  }

  function pause() {
    isPaused = true;
  }

  function resume() {
    isPaused = false;
    lastFrameTime = performance.now();
  }

  return {
    init,
    dispose,
    pause,
    resume,
    setPointerFromScreen,
    raycast,
    highlightHovered,
    select,
    highlightYear,
    highlightGenre,
    highlightSearchResults,
    resetHighlight,
    focusOnYear,
    focusOnAnime,
    focusOnSearchResults,
    rotateCameraByVelocity,
    zoom,
    setHandControl,
    setInputMode,
    resetCameraState,
    animateCamera,
    get hoveredId() { return hoveredId.value; },
    get selectedId() { return selectedId.value; }
  };
}

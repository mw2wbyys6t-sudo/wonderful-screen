import { ref, onUnmounted } from 'vue';
import * as THREE from 'three';

// 模块级共享状态（buildXxx 函数定义在模块级，需在此声明）
let renderer, scene, camera, galaxyGroup, starsMesh, nebulaGroup, linesMesh, highlightLinesMesh, searchRingsMesh;
let raycaster, pointer;
let starData = [];
let originalColors = [];
let originalScales = [];
let lineConnections = [];
let glowTexture = null;
let coreTexture = null;
let symbolTexture = null;
let streakTexture = null;

export function useGalaxy(canvasRef, dataRef, genresRef, options = {}) {
  const selectedId = ref(null);
  const hoveredId = ref(null);
  const hoveredAnime = ref(null);
  const cameraInfo = ref({ distance: 180, azimuth: 0, polar: 0.3 });

  let animationId;
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let cameraState = { theta: 0, phi: Math.PI / 3, radius: 180 };
  const initialCameraState = { theta: 0, phi: Math.PI / 3, radius: 180 };
  let cameraAnimation = null;
  let searchTimeout = null;
  let searchMatchedIds = [];

  const init = () => {
    if (!canvasRef.value) return;

    // 不要先用 getContext 探测：Three.js 会自己创建 WebGL context，
    // 提前 getContext 会造成 "Canvas has an existing context of a different type"。
    try {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x03030a, 0.0025);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
      updateCameraPosition();

      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (err) {
      console.warn('WebGL 初始化失败:', err);
      if (options.onError) options.onError('当前环境不支持 WebGL，无法显示 3D 星系');
      return;
    }

    // 预生成纹理
    glowTexture = createGlowTexture(128);
    coreTexture = createCoreTexture(256);
    symbolTexture = createSymbolTexture(64);
    streakTexture = createStreakTexture();

    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);

    buildCore(galaxyGroup);
    buildNebulae(galaxyGroup, genresRef.value);
    buildStars(galaxyGroup, dataRef.value, genresRef.value);
    buildConstellations(galaxyGroup, dataRef.value, genresRef.value);
    buildDust(scene);
    buildSearchRings(galaxyGroup);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const onPointerDown = (e) => {
      isDragging = true;
      lastPointer = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        cameraState.theta -= dx * 0.005;
        cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.phi - dy * 0.005));
        lastPointer = { x: e.clientX, y: e.clientY };
        updateCameraPosition();
      }
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e) => {
      cameraState.radius = Math.max(60, Math.min(600, cameraState.radius + e.deltaY * 0.2));
      updateCameraPosition();
    };
    const onClick = () => {
      if (hoveredId.value != null) {
        selectedId.value = hoveredId.value;
        if (options.onSelect) options.onSelect(starData[hoveredId.value]?.anime);
      }
    };

    canvasRef.value.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasRef.value.addEventListener('wheel', onWheel, { passive: true });
    canvasRef.value.addEventListener('click', onClick);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      galaxyGroup.rotation.y += 0.0004;
      if (nebulaGroup) nebulaGroup.rotation.y += 0.00015;
      pulseCore();
      billboardStars();
      updateHover();
      updateCameraAnimation();
      pulseSearchRings();
      renderer.render(scene, camera);
    };
    animate();

    if (options.onReady) options.onReady();

    onUnmounted(() => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      canvasRef.value?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasRef.value?.removeEventListener('wheel', onWheel);
      canvasRef.value?.removeEventListener('click', onClick);
      renderer?.dispose();
      glowTexture?.dispose();
      coreTexture?.dispose();
      symbolTexture?.dispose();
      streakTexture?.dispose();
    });
  };

  function updateCameraPosition() {
    if (!camera) return;
    const r = cameraState.radius;
    const t = cameraState.theta;
    const p = cameraState.phi;
    camera.position.set(
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t)
    );
    camera.lookAt(0, 0, 0);
    cameraInfo.value = { distance: r, azimuth: t, polar: p };
  }

  function animateCameraTo(targetTheta, targetPhi, targetRadius, duration = 1200) {
    const start = { ...cameraState };
    let dTheta = targetTheta - start.theta;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    cameraAnimation = {
      start,
      delta: { theta: dTheta, phi: targetPhi - start.phi, radius: targetRadius - start.radius },
      startTime: performance.now(),
      duration
    };
  }

  function updateCameraAnimation() {
    if (!cameraAnimation) return;
    const elapsed = performance.now() - cameraAnimation.startTime;
    const t = Math.min(1, elapsed / cameraAnimation.duration);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    cameraState.theta = cameraAnimation.start.theta + cameraAnimation.delta.theta * ease;
    cameraState.phi = cameraAnimation.start.phi + cameraAnimation.delta.phi * ease;
    cameraState.radius = cameraAnimation.start.radius + cameraAnimation.delta.radius * ease;
    updateCameraPosition();
    if (t >= 1) cameraAnimation = null;
  }

  function resetCamera() {
    animateCameraTo(initialCameraState.theta, initialCameraState.phi, initialCameraState.radius);
  }

  function focusOnGenre(genre) {
    if (!starsMesh || !genresRef.value) return;
    const genreNames = Object.keys(genresRef.value);
    const gi = genreNames.indexOf(genre);
    if (gi < 0) return;
    const angle = (gi / Math.max(1, genreNames.length)) * Math.PI * 2;
    const radius = 70 + (gi % 3) * 35;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = 0;
    const targetTheta = Math.atan2(x, z);
    const dist = Math.hypot(x, y, z) || 1;
    const targetPhi = Math.acos(Math.max(-1, Math.min(1, y / dist)));
    animateCameraTo(targetTheta, targetPhi, Math.max(120, dist * 1.6));
  }

  function focusOnPosition(x, y, z, radius = null) {
    const targetTheta = Math.atan2(x, z);
    const dist = Math.hypot(x, y, z) || 1;
    const targetPhi = Math.acos(Math.max(-1, Math.min(1, y / dist)));
    animateCameraTo(targetTheta, targetPhi, radius ?? Math.max(120, dist * 1.4));
  }

  function filterByGenre(genre) {
    if (!starsMesh) return;
    const color = new THREE.Color();
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starData.length; i++) {
      const item = starData[i];
      const isMatch = !genre || item.anime.genres?.includes(genre);
      if (isMatch) {
        starsMesh.setColorAt(i, originalColors[i]);
        dummy.position.set(item.x, item.y, item.z);
        dummy.scale.set(originalScales[i], originalScales[i], originalScales[i]);
      } else {
        color.setHex(0x222233);
        starsMesh.setColorAt(i, color);
        dummy.position.set(item.x, item.y, item.z);
        dummy.scale.set(originalScales[i] * 0.35, originalScales[i] * 0.35, originalScales[i] * 0.35);
      }
      dummy.updateMatrix();
      starsMesh.setMatrixAt(i, dummy.matrix);
    }
    starsMesh.instanceColor.needsUpdate = true;
    starsMesh.instanceMatrix.needsUpdate = true;
  }

  function search(query) {
    if (searchTimeout) clearTimeout(searchTimeout);
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      clearSearchHighlight();
      return [];
    }
    const matches = [];
    for (let i = 0; i < starData.length; i++) {
      const anime = starData[i].anime;
      const fields = [
        anime.titleRomaji,
        anime.titleNative,
        anime.titleEnglish,
        ...(anime.genres || []),
        ...(anime.tags || []),
        ...(anime.studios || []),
        anime.director
      ].filter(Boolean).join(' ').toLowerCase();
      if (fields.includes(q)) matches.push(i);
    }
    if (matches.length > 0) {
      focusOnPosition(starData[matches[0]].x, starData[matches[0]].y, starData[matches[0]].z, Math.max(100, cameraState.radius * 0.6));
      showSearchRings(matches);
      if (options.onSearchResult) options.onSearchResult({ found: true, count: matches.length });
    } else {
      clearSearchHighlight();
      if (options.onSearchResult) options.onSearchResult({ found: false, count: 0 });
    }
    return matches.map(id => starData[id].anime);
  }

  function highlightStar(animeIdOrIndex, animate = true) {
    const index = typeof animeIdOrIndex === 'number' ? animeIdOrIndex : starData.findIndex(s => s.anime.id === animeIdOrIndex);
    if (index < 0 || index >= starData.length) return;
    const item = starData[index];
    showSearchRings([index]);
    if (animate) focusOnPosition(item.x, item.y, item.z, Math.max(100, cameraState.radius * 0.6));
  }

  function showSearchRings(ids) {
    if (!searchRingsMesh) return;
    searchMatchedIds = [...ids];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let visibleCount = 0;
    const maxCount = searchRingsMesh.count;
    for (let i = 0; i < starData.length && visibleCount < maxCount; i++) {
      if (!searchMatchedIds.includes(i)) continue;
      const item = starData[i];
      dummy.position.set(item.x, item.y, item.z);
      const scale = originalScales[i] * 2.4;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      searchRingsMesh.setMatrixAt(visibleCount, dummy.matrix);
      color.set(0xfff7aa);
      searchRingsMesh.setColorAt(visibleCount, color);
      visibleCount++;
    }
    for (let i = visibleCount; i < maxCount; i++) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      searchRingsMesh.setMatrixAt(i, dummy.matrix);
    }
    searchRingsMesh.count = Math.max(1, visibleCount);
    searchRingsMesh.instanceMatrix.needsUpdate = true;
    if (searchRingsMesh.instanceColor) searchRingsMesh.instanceColor.needsUpdate = true;
    searchRingsMesh.visible = visibleCount > 0;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(clearSearchHighlight, 5000);
  }

  function clearSearchHighlight() {
    searchMatchedIds = [];
    if (searchRingsMesh) {
      searchRingsMesh.visible = false;
    }
  }

  function pulseSearchRings() {
    if (!searchRingsMesh || !searchRingsMesh.visible) return;
    const time = performance.now() * 0.003;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < searchRingsMesh.count; i++) {
      const starIndex = searchMatchedIds[i];
      if (starIndex == null) continue;
      const item = starData[starIndex];
      if (!item) continue;
      dummy.position.set(item.x, item.y, item.z);
      const scaleBase = originalScales[starIndex] * (2.2 + Math.sin(time + i) * 0.35);
      dummy.scale.set(scaleBase, scaleBase, scaleBase);
      dummy.updateMatrix();
      searchRingsMesh.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.12, 1, 0.65 + Math.sin(time + i) * 0.15);
      searchRingsMesh.setColorAt(i, color);
    }
    searchRingsMesh.instanceMatrix.needsUpdate = true;
    if (searchRingsMesh.instanceColor) searchRingsMesh.instanceColor.needsUpdate = true;
  }

  function pulseCore() {
    if (!galaxyGroup) return;
    const time = Date.now() * 0.001;
    const core = galaxyGroup.getObjectByName('coreInner');
    if (core) {
      const s = 1 + Math.sin(time * 1.5) * 0.03;
      core.scale.set(s, s, s);
    }
    const rings = galaxyGroup.getObjectByName('coreRings');
    if (rings) {
      rings.children.forEach((ring, i) => {
        ring.rotation.x += 0.001 * (i + 1);
        ring.rotation.y += 0.002 * (i + 1);
      });
    }
    const glow = galaxyGroup.getObjectByName('coreGlow');
    if (glow) {
      const scale = 1 + Math.sin(time * 1.2) * 0.04;
      glow.scale.set(scale, scale, scale);
    }
    const symbols = galaxyGroup.getObjectByName('coreSymbols');
    if (symbols) {
      symbols.rotation.y += 0.003;
      symbols.rotation.z += 0.001;
    }
  }

  function billboardStars() {
    if (!starsMesh || !camera) return;
    const dummy = new THREE.Object3D();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const camPos = camera.position;
    let changed = false;

    for (let i = 0; i < starData.length; i++) {
      starsMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(pos, quat, scale);
      if (scale.x < 0.01) continue;
      dummy.position.copy(pos);
      dummy.scale.copy(scale);
      dummy.lookAt(camPos);
      dummy.updateMatrix();
      starsMesh.setMatrixAt(i, dummy.matrix);
      changed = true;
    }
    if (changed) starsMesh.instanceMatrix.needsUpdate = true;
  }

  function updateHover() {
    if (!raycaster || !camera || !starsMesh || isDragging) {
      hoveredId.value = null;
      hoveredAnime.value = null;
      updateHighlightLines(-1);
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(starsMesh);
    if (intersects.length > 0) {
      hoveredId.value = intersects[0].instanceId;
      hoveredAnime.value = starData[hoveredId.value]?.anime || null;
      document.body.style.cursor = 'pointer';
      updateHighlightLines(hoveredId.value);
    } else {
      hoveredId.value = null;
      hoveredAnime.value = null;
      document.body.style.cursor = 'default';
      updateHighlightLines(-1);
    }
  }

  function updateHighlightLines(starIndex) {
    if (!linesMesh || !galaxyGroup) return;
    if (starIndex < 0) {
      if (highlightLinesMesh) highlightLinesMesh.visible = false;
      linesMesh.material.opacity = 0.55;
      return;
    }
    const positions = [];
    lineConnections.forEach(([a, b]) => {
      if (a === starIndex || b === starIndex) {
        const sa = starData[a];
        const sb = starData[b];
        if (sa && sb) {
          positions.push(sa.x, sa.y, sa.z, sb.x, sb.y, sb.z);
        }
      }
    });
    if (positions.length === 0) {
      if (highlightLinesMesh) highlightLinesMesh.visible = false;
      return;
    }
    if (!highlightLinesMesh) {
      const geo = new THREE.BufferGeometry();
      const mat = new THREE.LineBasicMaterial({
        color: 0xfff7aa,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });
      highlightLinesMesh = new THREE.LineSegments(geo, mat);
      galaxyGroup.add(highlightLinesMesh);
    }
    highlightLinesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    highlightLinesMesh.visible = true;
    linesMesh.material.opacity = 0.25;
  }

  return {
    init,
    selectedId,
    hoveredId,
    hoveredAnime,
    cameraInfo,
    filterByGenre,
    search,
    resetCamera,
    focusOnGenre,
    highlightStar
  };
}

function createGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCoreTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.12, 'rgba(0,243,255,0.85)');
  g.addColorStop(0.4, 'rgba(184,146,255,0.45)');
  g.addColorStop(0.75, 'rgba(0,243,255,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,243,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = size * 0.28;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSymbolTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  g.addColorStop(0, 'rgba(0,243,255,0.9)');
  g.addColorStop(0.5, 'rgba(184,146,255,0.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.18, cy + size * 0.12);
  ctx.lineTo(cx - size * 0.18, cy + size * 0.12);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStreakTexture() {
  const loader = new THREE.TextureLoader();
  const tex = loader.load('/images/effects/light-streak.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function buildCore(group) {
  const coreGroup = new THREE.Group();
  coreGroup.name = 'coreRings';

  // 外层弥散光晕
  const glowGeo = new THREE.PlaneGeometry(120, 120);
  const glowMat = new THREE.MeshBasicMaterial({
    map: coreTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = 'coreGlow';
  glow.lookAt(0, 0, 1);
  group.add(glow);

  // 内核纹理贴图
  const coreSpriteMat = new THREE.SpriteMaterial({
    map: coreTexture,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreSprite = new THREE.Sprite(coreSpriteMat);
  coreSprite.scale.set(32, 32, 1);
  group.add(coreSprite);

  // 内核心球面
  const innerGeo = new THREE.SphereGeometry(5, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.name = 'coreInner';
  group.add(inner);

  const ringColors = [0x00f3ff, 0xb892ff, 0xff2a6d];
  ringColors.forEach((color, i) => {
    const ringGeo = new THREE.TorusGeometry(12 + i * 6, 0.3 + i * 0.12, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 - i * 0.08 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + i * 0.4;
    ring.rotation.y = i * 0.5;
    coreGroup.add(ring);
  });

  group.add(coreGroup);

  // 漂浮符文
  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'coreSymbols';
  const symbolMat = new THREE.SpriteMaterial({
    map: symbolTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 12; i++) {
    const sprite = new THREE.Sprite(symbolMat);
    const a = (i / 12) * Math.PI * 2;
    const r = 24 + (i % 3) * 7;
    sprite.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 10, Math.sin(a) * r);
    sprite.scale.set(3.5, 3.5, 1);
    symbolGroup.add(sprite);
  }
  group.add(symbolGroup);
}

function buildNebulae(group, genres) {
  nebulaGroup = new THREE.Group();
  const genreNames = Object.keys(genres || {});
  const particleCount = 3000;
  const positions = [];
  const colors = [];
  const sizes = [];
  const color = new THREE.Color();

  const arms = Math.max(3, genreNames.length);

  for (let i = 0; i < particleCount; i++) {
    const armIndex = i % arms;
    const genre = genreNames[armIndex] || 'Sci-Fi';
    const genreColor = genres[genre]?.color || '#00f3ff';

    // 对数螺旋臂
    const t = Math.random() * 2.6 + 0.2;
    const armAngle = (armIndex / arms) * Math.PI * 2 + t * 0.55;
    const spread = (Math.random() - 0.5) * 1.3;
    const r = 50 + t * 55 + (Math.random() - 0.5) * 25;
    const a = armAngle + spread;

    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    const y = (Math.random() - 0.5) * 18 * Math.exp(-t * 0.3);

    positions.push(x, y, z);

    // 颜色按半径做轻微渐变
    color.set(genreColor);
    const fade = Math.min(1, r / 180);
    color.lerp(new THREE.Color(0x4a3fff), fade * 0.35);
    colors.push(color.r, color.g, color.b);

    sizes.push(Math.random() * 2.2 + 0.6);
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 2.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(particleGeo, material);
  nebulaGroup.add(points);
  group.add(nebulaGroup);
}

function buildStars(group, data, genres) {
  const budget = Math.min(data.length, 800);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: glowTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  starsMesh = new THREE.InstancedMesh(geometry, material, budget);
  starsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  starData = [];
  originalColors = [];
  originalScales = [];

  const genreNames = Object.keys(genres || {});

  data.slice(0, budget).forEach((anime, i) => {
    const primaryGenre = anime.genres?.[0] || 'Sci-Fi';
    const genreIndex = Math.max(0, genreNames.indexOf(primaryGenre));
    const genreCount = Math.max(1, genreNames.length);

    // 螺旋分布 + 随机扩散
    const t = Math.random() * 2.8 + 0.3;
    const armAngle = (genreIndex / genreCount) * Math.PI * 2 + t * 0.5;
    const spread = (Math.random() - 0.5) * 1.1;
    const radius = 55 + t * 55 + (Math.random() - 0.5) * 30;
    const a = armAngle + spread;
    const y = (Math.random() - 0.5) * 20 + (anime.year - 1990) * 0.03;

    const x = radius * Math.cos(a);
    const z = radius * Math.sin(a);

    const score = anime.averageScore || 50;
    const popularity = anime.popularity || 0;
    const s = 2 + Math.min(3.5, score / 35) * 1.2 + Math.min(1.2, popularity / 300000) * 0.8;

    dummy.position.set(x, y, z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    starsMesh.setMatrixAt(i, dummy.matrix);
    const c = color.set(genres[primaryGenre]?.color || '#00f3ff');
    starsMesh.setColorAt(i, c);

    starData[i] = { anime, originalScale: s, x, y, z };
    originalColors[i] = c.clone();
    originalScales[i] = s;
  });

  starsMesh.userData = { starData };
  group.add(starsMesh);
}

function buildConstellations(group, data, genres) {
  const budget = Math.min(data.length, 600);
  lineConnections = [];
  const connections = [];

  for (let i = 0; i < budget; i++) {
    const a = starData[i];
    if (!a) continue;
    for (let j = i + 1; j < budget; j++) {
      const b = starData[j];
      if (!b) continue;
      const sameGenre = a.anime.genres?.some(g => b.anime.genres?.includes(g));
      const sameStudio = a.anime.studios?.some(s => b.anime.studios?.includes(s));
      const sameDirector = a.anime.director && a.anime.director === b.anime.director;
      const shareTag = a.anime.tags?.some(t => b.anime.tags?.includes(t));

      if ((sameGenre && sameStudio) || sameDirector || (shareTag && Math.random() > 0.65)) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (dist < 42) {
          connections.push({ a, b, dist });
          lineConnections.push([i, j]);
        }
      }
    }
  }

  if (connections.length === 0) return;

  // 使用合并的 Plane 几何体作为发光连线
  const mergedGeos = [];
  const color = new THREE.Color();

  connections.forEach(({ a, b, dist }) => {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const midZ = (a.z + b.z) / 2;

    const geo = new THREE.PlaneGeometry(dist, 0.45, 1, 1);

    // 将平面宽度（X 轴）对齐到连线方向
    geo.rotateY(-Math.PI / 2);
    geo.lookAt(b.x, b.y, b.z);
    geo.translate(midX, midY, midZ);

    const genre = a.anime.genres?.[0] || 'Sci-Fi';
    color.set(genres[genre]?.color || '#00f3ff');
    const count = geo.attributes.position.count;
    const c = [];
    for (let i = 0; i < count; i++) c.push(color.r, color.g, color.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));

    mergedGeos.push(geo);
  });

  const mergedGeo = mergeBufferGeometries(mergedGeos);
  const lineMat = new THREE.MeshBasicMaterial({
    map: streakTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  linesMesh = new THREE.Mesh(mergedGeo, lineMat);
  group.add(linesMesh);
}

function mergeBufferGeometries(geometries) {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0];

  const merged = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  let indexOffset = 0;

  geometries.forEach(geo => {
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color?.array;
    const uv = geo.attributes.uv?.array;
    const idx = geo.index ? geo.index.array : null;

    for (let i = 0; i < pos.length; i++) positions.push(pos[i]);
    if (col) for (let i = 0; i < col.length; i++) colors.push(col[i]);
    if (uv) for (let i = 0; i < uv.length; i++) uvs.push(uv[i]);

    if (idx) {
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + indexOffset);
      indexOffset += pos.length / 3;
    } else {
      for (let i = 0; i < pos.length / 3; i++) indices.push(i + indexOffset);
      indexOffset += pos.length / 3;
    }
  });

  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors.length) merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (uvs.length) merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

function buildDust(scene) {
  const count = 3000;
  const positions = [];
  for (let i = 0; i < count; i++) {
    const r = 200 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x8899ff,
    size: 0.8,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dust = new THREE.Points(geo, mat);
  scene.add(dust);
}

function buildSearchRings(group) {
  const geometry = new THREE.TorusGeometry(1.6, 0.18, 8, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  searchRingsMesh = new THREE.InstancedMesh(geometry, material, 600);
  searchRingsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  searchRingsMesh.visible = false;
  group.add(searchRingsMesh);
}

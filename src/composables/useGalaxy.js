import { ref, onUnmounted } from 'vue';
import * as THREE from 'three';

export function useGalaxy(canvasRef, dataRef, genresRef, options = {}) {
  const selectedId = ref(null);
  const hoveredId = ref(null);
  const hoveredAnime = ref(null);
  const cameraInfo = ref({ distance: 180, azimuth: 0, polar: 0.3 });

  let renderer, scene, camera, galaxyGroup, starsMesh, nebulaGroup, linesMesh;
  let animationId;
  let raycaster, pointer;
  let starData = [];
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let cameraState = { theta: 0, phi: Math.PI / 3, radius: 180 };

  const init = () => {
    if (!canvasRef.value) return;

    const gl = canvasRef.value.getContext('webgl') || canvasRef.value.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported in this environment.');
      if (options.onError) options.onError('WebGL not supported');
      return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03030a, 0.0025);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);

    buildCore(galaxyGroup);
    buildNebulae(galaxyGroup, genresRef.value);
    buildStars(galaxyGroup, dataRef.value, genresRef.value);
    buildConstellations(galaxyGroup, dataRef.value, genresRef.value);
    buildDust(scene);

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
      pulseCore();
      updateHover();
      renderer.render(scene, camera);
    };
    animate();

    onUnmounted(() => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      canvasRef.value?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasRef.value?.removeEventListener('wheel', onWheel);
      canvasRef.value?.removeEventListener('click', onClick);
      renderer?.dispose();
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
  }

  function updateHover() {
    if (!raycaster || !camera || !starsMesh || isDragging) {
      hoveredId.value = null;
      hoveredAnime.value = null;
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(starsMesh);
    if (intersects.length > 0) {
      hoveredId.value = intersects[0].instanceId;
      hoveredAnime.value = starData[hoveredId.value]?.anime || null;
      document.body.style.cursor = 'pointer';
    } else {
      hoveredId.value = null;
      hoveredAnime.value = null;
      document.body.style.cursor = 'default';
    }
  }

  return { init, selectedId, hoveredId, hoveredAnime, cameraInfo };
}

function buildCore(group) {
  const coreGroup = new THREE.Group();
  coreGroup.name = 'coreRings';

  const glowGeo = new THREE.SphereGeometry(16, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.08 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  const ringColors = [0x00f3ff, 0xb892ff, 0xff2a6d];
  ringColors.forEach((color, i) => {
    const ringGeo = new THREE.TorusGeometry(8 + i * 5, 0.25 + i * 0.1, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - i * 0.1 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + i * 0.4;
    ring.rotation.y = i * 0.5;
    coreGroup.add(ring);
  });

  const innerGeo = new THREE.SphereGeometry(4, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.name = 'coreInner';
  group.add(inner);

  group.add(coreGroup);
}

function buildNebulae(group, genres) {
  nebulaGroup = new THREE.Group();
  const genreNames = Object.keys(genres || {});
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 1200;
  const positions = [];
  const colors = [];
  const sizes = [];
  const color = new THREE.Color();

  genreNames.forEach((genre, gi) => {
    const genreColor = genres[genre]?.color || '#00f3ff';
    const angle = (gi / Math.max(1, genreNames.length)) * Math.PI * 2;
    const armOffset = gi * 0.7;
    const baseRadius = 70 + (gi % 3) * 35;

    for (let i = 0; i < 70; i++) {
      const r = baseRadius + (Math.random() - 0.5) * 45;
      const a = angle + armOffset + (Math.random() - 0.5) * 0.8;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      const y = (Math.random() - 0.5) * 25;
      positions.push(x, y, z);
      color.set(genreColor);
      colors.push(color.r, color.g, color.b);
      sizes.push(Math.random() * 2 + 0.5);
    }
  });

  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(particleGeo, material);
  nebulaGroup.add(points);
  group.add(nebulaGroup);
}

function buildStars(group, data, genres) {
  const budget = Math.min(data.length, 600);
  const geometry = new THREE.SphereGeometry(1, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  starsMesh = new THREE.InstancedMesh(geometry, material, budget);
  starsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  starData = [];

  const genreNames = Object.keys(genres || {});

  data.slice(0, budget).forEach((anime, i) => {
    const primaryGenre = anime.genres?.[0] || 'Sci-Fi';
    const genreIndex = Math.max(0, genreNames.indexOf(primaryGenre));
    const angle = (genreIndex / Math.max(1, genreNames.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const radius = 70 + (genreIndex % 3) * 35 + (Math.random() - 0.5) * 30;
    const y = (Math.random() - 0.5) * 25 + (anime.year - 1990) * 0.03;

    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const score = anime.averageScore || 50;
    const popularity = anime.popularity || 0;
    const s = 0.6 + Math.min(2.5, score / 40) * 0.5 + Math.min(0.8, popularity / 300000) * 0.4;

    dummy.position.set(x, y, z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    starsMesh.setMatrixAt(i, dummy.matrix);
    starsMesh.setColorAt(i, color.set(genres[primaryGenre]?.color || '#00f3ff'));

    starData[i] = { anime, originalScale: s, x, y, z };
  });

  starsMesh.userData = { starData };
  group.add(starsMesh);
}

function buildConstellations(group, data, genres) {
  const budget = Math.min(data.length, 600);
  const positions = [];
  const color = new THREE.Color();

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

      if ((sameGenre && sameStudio) || sameDirector || (shareTag && Math.random() > 0.7)) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (dist < 40) {
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
  }

  if (positions.length === 0) return;

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending
  });
  linesMesh = new THREE.LineSegments(lineGeo, lineMat);
  group.add(linesMesh);
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

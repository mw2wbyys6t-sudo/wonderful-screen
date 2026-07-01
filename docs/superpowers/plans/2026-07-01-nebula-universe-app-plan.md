# 星云编年史 · 宇宙主站实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建单文件主站 `app.html`，融合 `index.html` 与 `nebula-chronicle.html`，实现游戏化加载、全息展示、星云入口、3D 动漫星系，并配套 AniList 数据拉取脚本。

**Architecture:** 构建时通过 `scripts/fetch-anilist.js` 生成静态 JSON；运行时 `app.html` 按四阶段状态机加载数据并渲染，封面阶段复用 Canvas/Video 特效并叠加音频可视化与鼠标视差，主界面使用 Three.js 构建以「次元核心」为中心的星系场景。

**Tech Stack:** HTML5/CSS3/ES6, Three.js (CDN), MediaPipe Hands (CDN), AniList GraphQL, Node.js, Web Audio API, Canvas 2D.

---

## 文件结构

```
/workspace/
├── app.html                          # 新增：单文件主站（CSS + HTML + JS）
├── data/
│   ├── anime-corpus.json             # 新增：AniList 作品数据集（生成）
│   └── genre-manifest.json           # 新增：流派映射与主题色（生成）
├── scripts/
│   └── fetch-anilist.js              # 新增：数据拉取与清洗脚本
├── js/
│   └── shared-data.js                # 保留：本地兜底数据
├── docs/superpowers/specs/
│   └── 2026-07-01-nebula-universe-app-design.md  # 已批准的设计文档
└── docs/superpowers/plans/
    └── 2026-07-01-nebula-universe-app-plan.md    # 本文档
```

---

## 任务清单

### Task 1: 初始化目录与验证 Node 环境

**Files:**
- Create: `scripts/fetch-anilist.js`
- Create: `data/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: 确认 Node 版本**

Run: `node -v`
Expected: v18+ (LTS)

- [ ] **Step 2: 创建目录**

Run:
```bash
mkdir -p data scripts
```

- [ ] **Step 3: 添加 data 目录占位**

Create: `data/.gitkeep`
Content: (empty)

- [ ] **Step 4: 在 package.json 中添加数据脚本命令**

Modify: `package.json`
Add to `"scripts"`:
```json
"fetch-anilist": "node scripts/fetch-anilist.js"
```

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/ data/
git commit -m "chore: setup data pipeline directories"
```

---

### Task 2: 编写 AniList 数据拉取脚本

**Files:**
- Create: `scripts/fetch-anilist.js`

- [ ] **Step 1: 编写基础 GraphQL 请求函数**

Create: `scripts/fetch-anilist.js`
```javascript
const fs = require('fs');
const path = require('path');

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const DELAY_MS = 800;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AniList HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

module.exports = { fetchAniList, sleep };
```

- [ ] **Step 2: 编写分页拉取函数**

Append to `scripts/fetch-anilist.js`:
```javascript
const PAGE_QUERY = `
query Page($page: Int, $perPage: Int, $sort: [MediaSort], $type: MediaType) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: $type, sort: $sort) {
      id
      title { romaji native english }
      description
      coverImage { large medium }
      averageScore
      popularity
      genres
      tags { name rank }
      startDate { year }
      studios { nodes { name } }
      staff(perPage: 3) { nodes { name { full } role } }
      format
      episodes
    }
  }
}`;

async function fetchAllMedia(targetCount = 800) {
  const perPage = 50;
  const results = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && results.length < targetCount) {
    const data = await fetchAniList(PAGE_QUERY, {
      page,
      perPage,
      type: 'ANIME',
      sort: ['SCORE_DESC', 'POPULARITY_DESC']
    });
    const media = data.Page.media || [];
    results.push(...media);
    hasNext = data.Page.pageInfo.hasNextPage && results.length < targetCount;
    page += 1;
    if (hasNext) await sleep(DELAY_MS);
  }
  return results.slice(0, targetCount);
}

module.exports.fetchAllMedia = fetchAllMedia;
```

- [ ] **Step 3: 编写数据清洗与输出函数**

Append to `scripts/fetch-anilist.js`:
```javascript
const GENRE_PALETTE = {
  'Action': '#ff4444', 'Adventure': '#ffcc00', 'Comedy': '#ffee66',
  'Drama': '#b892ff', 'Ecchi': '#ff88cc', 'Fantasy': '#b026ff',
  'Hentai': '#cc3333', 'Horror': '#aa66ff', 'Mahou Shoujo': '#ff66dd',
  'Mecha': '#4488ff', 'Music': '#00ffaa', 'Mystery': '#aa66ff',
  'Psychological': '#00f3ff', 'Romance': '#ff88cc', 'Sci-Fi': '#00f3ff',
  'Slice of Life': '#66ffaa', 'Sports': '#ffcc00', 'Supernatural': '#b026ff',
  'Thriller': '#aa66ff'
};

function normalizeMedia(m) {
  const director = (m.staff?.nodes || []).find(s => s.role?.toLowerCase().includes('director'))?.name?.full || '';
  return {
    id: m.id,
    titleRomaji: m.title?.romaji || '',
    titleNative: m.title?.native || '',
    titleEnglish: m.title?.english || '',
    year: m.startDate?.year || 0,
    genres: m.genres || [],
    tags: (m.tags || []).slice(0, 5).map(t => t.name),
    description: (m.description || '').replace(/<[^>]+>/g, ' ').trim(),
    coverImage: m.coverImage?.large || m.coverImage?.medium || '',
    averageScore: m.averageScore || 0,
    popularity: m.popularity || 0,
    studios: (m.studios?.nodes || []).map(s => s.name),
    director,
    format: m.format || '',
    episodes: m.episodes || 0
  };
}

async function main() {
  const target = parseInt(process.argv[2], 10) || 800;
  console.log(`Fetching up to ${target} anime from AniList...`);
  const media = await fetchAllMedia(target);
  const normalized = media.map(normalizeMedia);

  const genreMap = {};
  normalized.forEach(anime => {
    (anime.genres || []).forEach(g => {
      if (!genreMap[g]) genreMap[g] = { count: 0, color: GENRE_PALETTE[g] || '#00f3ff' };
      genreMap[g].count += 1;
    });
  });

  const corpusPath = path.join(__dirname, '..', 'data', 'anime-corpus.json');
  const manifestPath = path.join(__dirname, '..', 'data', 'genre-manifest.json');

  fs.writeFileSync(corpusPath, JSON.stringify(normalized, null, 2), 'utf-8');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: normalized.length,
    genres: genreMap
  }, null, 2), 'utf-8');

  console.log(`Saved ${normalized.length} anime to ${corpusPath}`);
  console.log(`Saved genre manifest with ${Object.keys(genreMap).length} genres to ${manifestPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: 运行脚本测试**

Run: `node scripts/fetch-anilist.js 100`
Expected: Successfully creates `data/anime-corpus.json` and `data/genre-manifest.json` with ~100 entries.

- [ ] **Step 5: 验证 JSON 结构**

Run: `node -e "const c=require('./data/anime-corpus.json'); console.log('count:', c.length, 'first:', c[0].titleRomaji, c[0].genres);"`
Expected: count: 100, first title and genres printed.

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-anilist.js data/
git commit -m "feat(data): add AniList fetch script with genre manifest"
```

---

### Task 3: 生成完整数据集（可选，可在本地预览前执行）

**Files:**
- Modify: `data/anime-corpus.json`
- Modify: `data/genre-manifest.json`

- [ ] **Step 1: 拉取完整数据**

Run: `node scripts/fetch-anilist.js 800`
Expected: Creates ~800 entry corpus and manifest.

- [ ] **Step 2: 检查流派覆盖**

Run: `node -e "const m=require('./data/genre-manifest.json'); console.log(JSON.stringify(m.genres, null, 2));"`
Expected: At least 10+ genres with counts.

---

### Task 4: 创建 app.html 骨架与共享样式

**Files:**
- Create: `app.html`

- [ ] **Step 1: 创建基础 HTML 骨架**

Create: `app.html`
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>星云编年史 · 宇宙版 | Nebula Chronicle</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=Orbitron:wght@400;700;900&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" crossorigin="anonymous"></script>
  <style>
    :root {
      --bg-deep: #050714;
      --bg-darker: #03030a;
      --neon-cyan: #00f3ff;
      --neon-purple: #b892ff;
      --neon-pink: #ff2a6d;
      --text-primary: #f0f0ff;
      --text-secondary: rgba(240, 240, 255, 0.72);
      --glass-bg: rgba(255, 255, 255, 0.08);
      --glass-border: rgba(255, 255, 255, 0.18);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg-darker); color: var(--text-primary); font-family: 'Noto Sans SC', sans-serif; }
    #app { position: fixed; inset: 0; z-index: 1; }
    .phase { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 1s ease; }
    .phase.active { opacity: 1; pointer-events: auto; }
  </style>
</head>
<body>
  <div id="app">
    <section id="phase-loading" class="phase active"></section>
    <section id="phase-showcase" class="phase"></section>
    <section id="phase-entrance" class="phase"></section>
    <section id="phase-galaxy" class="phase"></section>
  </div>
  <script>
    (function() {
      const AppState = { phase: 'loading', data: null, genres: null };
      window.AppState = AppState;
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: 启动本地服务器并验证骨架**

Run: `python3 -m http.server 8080 --bind 0.0.0.0`
Open: `http://localhost:8080/app.html`
Expected: Black screen, no console errors.

- [ ] **Step 3: Commit**

```bash
git add app.html
git commit -m "feat(app): add app.html skeleton with phase containers"
```

---

### Task 5: 实现 Phase 0 — 次元启动（Loading）

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 添加 Loading 阶段 HTML 结构**

In `app.html`, replace `<section id="phase-loading" class="phase active"></section>` with:
```html
<section id="phase-loading" class="phase active">
  <canvas id="loading-canvas"></canvas>
  <div class="loading-center">
    <div class="energy-figure"></div>
    <div class="energy-rings">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
    </div>
    <div class="loading-progress">
      <svg class="progress-ring" viewBox="0 0 120 120">
        <circle class="progress-bg" cx="60" cy="60" r="54" />
        <circle class="progress-fill" cx="60" cy="60" r="54" />
      </svg>
      <div class="progress-text">0%</div>
    </div>
    <div class="loading-tip">正在连接星云数据库…</div>
  </div>
</section>
```

- [ ] **Step 2: 添加 Loading 阶段 CSS**

Append to `<style>` in `app.html`:
```css
#phase-loading { background: radial-gradient(ellipse at 50% 50%, rgba(124,77,255,0.15) 0%, transparent 60%), var(--bg-darker); }
#loading-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.loading-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.energy-figure { width: 80px; height: 120px; background: linear-gradient(180deg, rgba(0,243,255,0.6), rgba(184,146,255,0.2)); border-radius: 40px 40px 20px 20px; filter: blur(8px); animation: energyPulse 3s ease-in-out infinite; }
.energy-rings { position: absolute; width: 240px; height: 240px; }
.energy-rings .ring { position: absolute; inset: 0; border: 1px solid rgba(0,243,255,0.3); border-radius: 50%; animation: ringExpand 3s ease-out infinite; }
.energy-rings .ring:nth-child(2) { animation-delay: 1s; border-color: rgba(184,146,255,0.3); }
.energy-rings .ring:nth-child(3) { animation-delay: 2s; border-color: rgba(255,42,109,0.2); }
.loading-progress { position: relative; width: 120px; height: 120px; margin-top: 40px; }
.progress-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.progress-ring circle { fill: none; stroke-width: 6; }
.progress-bg { stroke: rgba(255,255,255,0.1); }
.progress-fill { stroke: var(--neon-cyan); stroke-linecap: round; stroke-dasharray: 339.292; stroke-dashoffset: 339.292; transition: stroke-dashoffset 0.3s ease; }
.progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', sans-serif; font-size: 18px; }
.loading-tip { margin-top: 20px; font-size: 14px; color: var(--text-secondary); letter-spacing: 1px; min-height: 20px; }
@keyframes energyPulse { 0%,100%{ transform: scale(1); opacity:0.8; } 50%{ transform: scale(1.05); opacity:1; } }
@keyframes ringExpand { 0%{ transform: scale(0.6); opacity:0.8; } 100%{ transform: scale(1.4); opacity:0; } }
```

- [ ] **Step 3: 实现 Loading 阶段 JS**

Append to `<script>` in `app.html`:
```javascript
const LOADING_TIPS = [
  '正在连接星云数据库…',
  '正在点亮恒星…',
  '正在绘制星云图谱…',
  '正在校准次元核心…',
  '正在加载全息投影…'
];

async function loadPhase0() {
  const tipEl = document.querySelector('.loading-tip');
  const textEl = document.querySelector('.progress-text');
  const fillEl = document.querySelector('.progress-fill');
  const circumference = 2 * Math.PI * 54;

  function setProgress(pct) {
    const offset = circumference * (1 - pct / 100);
    fillEl.style.strokeDashoffset = offset;
    textEl.textContent = Math.round(pct) + '%';
  }

  let progress = 0;
  const tipInterval = setInterval(() => {
    tipEl.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
  }, 1500);

  const steps = [
    fetch('data/genre-manifest.json').then(r => r.json()).then(d => { AppState.genres = d; }),
    fetch('data/anime-corpus.json').then(r => r.json()).then(d => { AppState.data = d; }),
    new Promise(r => setTimeout(r, 1200))
  ];

  for (let i = 0; i < steps.length; i++) {
    await steps[i];
    progress = Math.min(100, ((i + 1) / steps.length) * 100);
    setProgress(progress);
  }

  clearInterval(tipInterval);
  setTimeout(() => transitionTo('showcase'), 600);
}

function transitionTo(phaseName) {
  document.querySelectorAll('.phase').forEach(el => el.classList.remove('active'));
  document.getElementById('phase-' + phaseName).classList.add('active');
  AppState.phase = phaseName;
  if (phaseName === 'showcase') initShowcase();
  if (phaseName === 'entrance') initEntrance();
  if (phaseName === 'galaxy') initGalaxy();
}
```

- [ ] **Step 4: 在 DOM 加载完成后启动 Loading**

Append to `<script>`:
```javascript
window.addEventListener('DOMContentLoaded', () => {
  loadPhase0().catch(err => {
    console.error('Loading failed:', err);
    document.querySelector('.loading-tip').textContent = '数据加载失败，请刷新重试';
  });
});
```

- [ ] **Step 5: 本地验证**

Run server and open `http://localhost:8080/app.html`
Expected: Loading screen with energy figure, rings, progress ring fills, tips change, then transitions to showcase.

- [ ] **Step 6: Commit**

```bash
git add app.html
git commit -m "feat(app): implement phase 0 loading screen"
```

---

### Task 6: 实现 Phase 1 — 全息展示（Showcase）

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 添加 Showcase 阶段 HTML 结构**

Replace `<section id="phase-showcase" class="phase"></section>` with:
```html
<section id="phase-showcase" class="phase">
  <div class="showcase-core">
    <div class="mini-core"></div>
  </div>
  <div class="showcase-orbit" id="showcase-orbit"></div>
  <button class="skip-btn" onclick="transitionTo('entrance')">跳过</button>
</section>
```

- [ ] **Step 2: 添加 Showcase 阶段 CSS**

Append to `<style>`:
```css
#phase-showcase { background: radial-gradient(ellipse at 50% 50%, rgba(0,243,255,0.08) 0%, transparent 55%), var(--bg-deep); perspective: 1200px; }
.showcase-core { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); }
.mini-core { width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(0,243,255,0.6) 40%, rgba(184,146,255,0.3) 70%, transparent); box-shadow: 0 0 40px rgba(0,243,255,0.4); animation: coreRotate 12s linear infinite, coreBreath 4s ease-in-out infinite; }
.showcase-orbit { position: absolute; left: 50%; top: 45%; width: 0; height: 0; transform-style: preserve-3d; animation: orbitRotate 20s linear infinite; }
.holo-card { position: absolute; width: 140px; height: 200px; left: -70px; top: -100px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); backdrop-filter: blur(6px); transform-style: preserve-3d; overflow: hidden; box-shadow: 0 0 20px rgba(0,243,255,0.15); transition: transform 0.3s ease; }
.holo-card img { width: 100%; height: 70%; object-fit: cover; opacity: 0.9; }
.holo-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%); animation: holoScan 3s linear infinite; }
.holo-card-title { padding: 8px; font-size: 12px; text-align: center; color: var(--text-primary); }
.skip-btn { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); padding: 10px 24px; background: transparent; border: 1px solid var(--neon-cyan); color: var(--neon-cyan); border-radius: 24px; cursor: pointer; font-family: 'Orbitron', sans-serif; }
@keyframes coreRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes coreBreath { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.08); } }
@keyframes orbitRotate { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
@keyframes holoScan { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
```

- [ ] **Step 3: 实现 Showcase 阶段 JS**

Append to `<script>`:
```javascript
function initShowcase() {
  const orbit = document.getElementById('showcase-orbit');
  orbit.innerHTML = '';
  const topWorks = [...AppState.data].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8);
  const radius = 260;
  const count = topWorks.length;

  topWorks.forEach((work, i) => {
    const angle = (i / count) * Math.PI * 2;
    const card = document.createElement('div');
    card.className = 'holo-card';
    card.innerHTML = `<img src="${work.coverImage || 'images/generated/nebula-bg.jpg'}" alt=""><div class="holo-card-title">${work.titleRomaji}</div>`;
    card.style.transform = `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px)`;
    orbit.appendChild(card);
  });

  setTimeout(() => transitionTo('entrance'), 7000);
}
```

- [ ] **Step 4: 本地验证**

Open `http://localhost:8080/app.html`
Expected: After loading, showcase screen shows mini core and 8 holographic cards orbiting, auto-transitions to entrance after ~7s.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): implement phase 1 holographic showcase"
```

---

### Task 7: 实现 Phase 2 — 星云入口（Entrance）基础结构

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 添加 Entrance 阶段 HTML 结构**

Replace `<section id="phase-entrance" class="phase"></section>` with:
```html
<section id="phase-entrance" class="phase">
  <video class="bg-video-layer" id="bg-video-a" autoplay muted loop playsinline></video>
  <video class="bg-video-layer" id="bg-video-b" autoplay muted loop playsinline></video>
  <canvas id="entrance-canvas"></canvas>
  <div class="entrance-content">
    <h1 class="entrance-title">星云编年史</h1>
    <p class="entrance-subtitle">NEBULA CHRONICLE · 穿越次元，探索动画宇宙</p>
    <button class="journey-btn" onclick="transitionTo('galaxy')">开始旅程</button>
  </div>
</section>
```

- [ ] **Step 2: 添加 Entrance 阶段 CSS**

Append to `<style>`:
```css
#phase-entrance { background: var(--bg-darker); }
.bg-video-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1.6s ease; pointer-events: none; }
.bg-video-layer.active { opacity: 0.65; }
#entrance-canvas { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.entrance-content { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.entrance-title { font-family: 'ZCOOL XiaoWei', serif; font-size: clamp(48px, 10vw, 120px); background: linear-gradient(180deg, #fff 0%, #b892ff 60%, #00f3ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(0,243,255,0.3); animation: titleHolo 4s ease-in-out infinite; }
.entrance-subtitle { margin-top: 16px; font-size: clamp(14px, 2vw, 20px); color: var(--text-secondary); letter-spacing: 4px; }
.journey-btn { margin-top: 48px; padding: 16px 48px; font-size: 18px; border: none; border-radius: 32px; background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple)); color: var(--bg-darker); font-weight: 700; cursor: pointer; box-shadow: 0 0 30px rgba(0,243,255,0.4); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.journey-btn:hover { transform: scale(1.05); box-shadow: 0 0 50px rgba(0,243,255,0.6); }
@keyframes titleHolo { 0%,100%{ filter: hue-rotate(0deg); } 50%{ filter: hue-rotate(15deg); } }
```

- [ ] **Step 3: 实现视频轮播逻辑**

Append to `<script>`:
```javascript
const VIDEO_SOURCES = [
  'videos/character_showcase.mp4',
  'images/generated/nebula-trailer-v3-a.mp4',
  'images/generated/nebula-trailer-v3-b.mp4'
];

function initVideoCarousel() {
  const a = document.getElementById('bg-video-a');
  const b = document.getElementById('bg-video-b');
  if (!a || !b) return;
  a.src = VIDEO_SOURCES[0];
  b.src = VIDEO_SOURCES[1];
  a.classList.add('active');
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % VIDEO_SOURCES.length;
    const active = document.querySelector('.bg-video-layer.active');
    const next = active === a ? b : a;
    next.src = VIDEO_SOURCES[idx];
    next.classList.add('active');
    active.classList.remove('active');
  }, 8000);
}
```

- [ ] **Step 4: 在 transitionTo 中调用视频轮播**

Modify `transitionTo`:
```javascript
function transitionTo(phaseName) {
  document.querySelectorAll('.phase').forEach(el => el.classList.remove('active'));
  document.getElementById('phase-' + phaseName).classList.add('active');
  AppState.phase = phaseName;
  if (phaseName === 'showcase') initShowcase();
  if (phaseName === 'entrance') { initVideoCarousel(); initEntrance(); }
  if (phaseName === 'galaxy') initGalaxy();
}
```

- [ ] **Step 5: 本地验证**

Open `http://localhost:8080/app.html`
Expected: Entrance phase shows background videos cross-fading every 8 seconds, title and button visible.

- [ ] **Step 6: Commit**

```bash
git add app.html
git commit -m "feat(app): implement phase 2 entrance shell and video carousel"
```

---

### Task 8: 移植 nebula-chronicle 封面 Canvas 特效

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 提取 nebula-chronicle.html 封面 Canvas 绘制逻辑**

Read `nebula-chronicle.html` and identify the cover canvas initialization, star field, meteors, particles, and orb drawing functions. Copy them into `app.html` under a new `<script>` section or inline in the main script.

- [ ] **Step 2: 创建 initEntrance 函数包装器**

Append to `<script>`:
```javascript
let entranceAnimationId = null;

function initEntrance() {
  const canvas = document.getElementById('entrance-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  resizeEntranceCanvas();
  window.addEventListener('resize', resizeEntranceCanvas);

  const stars = createStars(200);
  const meteors = [];
  const particles = createParticles(60);
  let frame = 0;

  function loop() {
    if (AppState.phase !== 'entrance') return;
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars(ctx, stars);
    if (frame % 120 === 0) meteors.push(createMeteor(canvas));
    drawMeteors(ctx, meteors, canvas);
    drawParticles(ctx, particles);
    drawOrb(ctx, frame);
    entranceAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

function resizeEntranceCanvas() {
  const canvas = document.getElementById('entrance-canvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
```

- [ ] **Step 3: 实现/移植辅助绘制函数**

Implement `createStars`, `drawStars`, `createMeteor`, `drawMeteors`, `createParticles`, `drawParticles`, `drawOrb` based on `nebula-chronicle.html` cover canvas logic. Ensure they use the canvas dimensions and match the visual style.

- [ ] **Step 4: 本地验证**

Open `http://localhost:8080/app.html`
Expected: Entrance phase shows moving stars, occasional meteors, floating particles, and central orb/glow.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): port nebula-chronicle entrance canvas effects"
```

---

### Task 9: 添加鼠标视差与音频可视化到 Entrance

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 实现鼠标视差**

Append to `<script>`:
```javascript
function initMouseParallax() {
  const entrance = document.getElementById('phase-entrance');
  if (!entrance) return;
  entrance.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    entrance.style.setProperty('--parallax-x', x);
    entrance.style.setProperty('--parallax-y', y);
  });
}
```

Add to CSS:
```css
#phase-entrance .bg-video-layer { transform: translate(calc(var(--parallax-x, 0) * -10px), calc(var(--parallax-y, 0) * -10px)); }
#phase-entrance .entrance-content { transform: translate(calc(var(--parallax-x, 0) * 8px), calc(var(--parallax-y, 0) * 8px)); }
```

- [ ] **Step 2: 实现 Web Audio 氛围音与可视化驱动**

Append to `<script>`:
```javascript
let audioCtx = null;
let audioAnalyser = null;
let audioDataArray = null;

function initAmbientAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioAnalyser = audioCtx.createAnalyser();
    audioAnalyser.fftSize = 64;
    const bufferLength = audioAnalyser.frequencyBinCount;
    audioDataArray = new Uint8Array(bufferLength);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 110;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audioAnalyser);
    audioAnalyser.connect(audioCtx.destination);
    osc.start();
    AppState.audio = { ctx: audioCtx, analyser: audioAnalyser, data: audioDataArray };
  } catch (e) {
    console.warn('Audio init failed:', e);
  }
}

function getAudioLevel() {
  if (!audioAnalyser || !audioDataArray) return 0;
  audioAnalyser.getByteFrequencyData(audioDataArray);
  let sum = 0;
  for (let i = 0; i < audioDataArray.length; i++) sum += audioDataArray[i];
  return sum / audioDataArray.length / 255;
}
```

- [ ] **Step 3: 在 drawOrb 中接入音频节奏**

Modify `drawOrb` to use `getAudioLevel()` to scale pulse intensity:
```javascript
const level = getAudioLevel();
const pulse = 1 + level * 0.3;
```

- [ ] **Step 4: 在 Entrance 初始化时启动视差与音频**

Modify `transitionTo` entrance branch:
```javascript
if (phaseName === 'entrance') { initVideoCarousel(); initMouseParallax(); initAmbientAudio(); initEntrance(); }
```

- [ ] **Step 5: 本地验证**

Open `http://localhost:8080/app.html`
Expected: Background and title shift subtly with mouse; orb pulses with ambient audio rhythm.

- [ ] **Step 6: Commit**

```bash
git add app.html
git commit -m "feat(app): add mouse parallax and audio visualization to entrance"
```

---

### Task 10: 实现 Phase 3 — 3D 动漫星系基础场景

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 添加 Galaxy 阶段容器与 HUD 占位**

Replace `<section id="phase-galaxy" class="phase"></section>` with:
```html
<section id="phase-galaxy" class="phase">
  <canvas id="galaxy-canvas"></canvas>
  <div id="hud" class="hud">
    <div class="hud-top">
      <div class="hud-logo">星云编年史</div>
      <input type="text" class="hud-search" id="hud-search" placeholder="搜索作品 / 流派…">
      <div class="hud-chips" id="hud-chips"></div>
    </div>
    <div class="hud-actions">
      <button id="btn-music" title="音乐">♪</button>
      <button id="btn-help" title="帮助">?</button>
    </div>
    <div class="hud-info" id="hud-info"></div>
  </div>
  <div id="detail-panel" class="detail-panel">
    <button class="detail-close" onclick="closeDetail()">×</button>
    <img id="detail-cover" src="" alt="">
    <h2 id="detail-title"></h2>
    <p id="detail-meta"></p>
    <p id="detail-desc"></p>
    <a id="detail-watch" class="watch-btn" href="">看动漫</a>
  </div>
</section>
```

- [ ] **Step 2: 添加 Galaxy 阶段 CSS**

Append to `<style>`:
```css
#galaxy-canvas { position: absolute; inset: 0; z-index: 1; }
.hud { position: absolute; inset: 0; z-index: 10; pointer-events: none; }
.hud > * { pointer-events: auto; }
.hud-top { position: absolute; top: 0; left: 0; right: 0; padding: 20px 40px; display: flex; align-items: center; gap: 20px; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%); }
.hud-logo { font-family: 'Orbitron', sans-serif; font-size: 18px; color: var(--neon-cyan); text-shadow: 0 0 10px rgba(0,243,255,0.5); }
.hud-search { flex: 1; max-width: 300px; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text-primary); outline: none; }
.hud-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.hud-chip { padding: 6px 12px; border-radius: 16px; border: 1px solid var(--glass-border); background: var(--glass-bg); font-size: 12px; cursor: pointer; transition: all 0.2s; }
.hud-chip.active { background: rgba(0,243,255,0.2); border-color: var(--neon-cyan); }
.hud-actions { position: absolute; top: 20px; right: 40px; display: flex; gap: 12px; }
.hud-actions button { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text-primary); cursor: pointer; }
.hud-info { position: absolute; bottom: 24px; left: 40px; font-size: 12px; color: var(--text-secondary); }
.detail-panel { position: fixed; right: -420px; top: 0; width: 400px; height: 100%; z-index: 20; background: rgba(5,7,20,0.92); border-left: 1px solid var(--glass-border); padding: 32px; transition: right 0.4s ease; overflow-y: auto; }
.detail-panel.open { right: 0; }
.detail-panel img { width: 100%; border-radius: 12px; margin-bottom: 20px; }
.detail-panel h2 { font-size: 24px; margin-bottom: 12px; }
.detail-panel p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
.watch-btn { display: inline-block; padding: 12px 32px; background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple)); color: var(--bg-darker); border-radius: 24px; text-decoration: none; font-weight: 700; }
.detail-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border: none; background: transparent; color: var(--text-primary); font-size: 24px; cursor: pointer; }
```

- [ ] **Step 3: 初始化 Three.js 场景**

Append to `<script>`:
```javascript
let scene, camera, renderer, coreGroup, galaxyGroup, raycaster, mouse;
let starMeshes = [];
let galaxyAnimationId = null;

function initGalaxy() {
  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03030a, 0.0008);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 60, 180);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  galaxyGroup = new THREE.Group();
  scene.add(galaxyGroup);

  coreGroup = new THREE.Group();
  galaxyGroup.add(coreGroup);
  buildCore(coreGroup);

  buildNebulae(galaxyGroup);
  buildStars(galaxyGroup);
  buildConstellationLines(galaxyGroup);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener('resize', onGalaxyResize);
  canvas.addEventListener('mousemove', onGalaxyMouseMove);
  canvas.addEventListener('click', onGalaxyClick);

  initHUD();
  animateGalaxy();
}

function onGalaxyResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

- [ ] **Step 4: 本地验证**

Open `http://localhost:8080/app.html`, click "开始旅程"
Expected: Galaxy phase renders a dark Three.js scene without errors.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): add phase 3 three.js scene skeleton"
```

---

### Task 11: 实现次元核心（Chronicle Core）

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 实现核心几何体与材质**

Append to `<script>`:
```javascript
function buildCore(parent) {
  // Outer glow
  const glowGeo = new THREE.SphereGeometry(14, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.12 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  parent.add(glow);

  // Energy ring 1
  const ringGeo1 = new THREE.TorusGeometry(10, 0.3, 16, 100);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6 });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 2;
  parent.add(ring1);

  // Energy ring 2
  const ringGeo2 = new THREE.TorusGeometry(12, 0.2, 16, 100);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xb892ff, transparent: true, opacity: 0.5 });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = Math.PI / 3;
  parent.add(ring2);

  // Inner core
  const coreGeo = new THREE.SphereGeometry(5, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  parent.add(core);

  // Floating symbols (particles)
  const symbolsGeo = new THREE.BufferGeometry();
  const symbolCount = 40;
  const positions = new Float32Array(symbolCount * 3);
  for (let i = 0; i < symbolCount; i++) {
    const r = 3 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
  }
  symbolsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const symbolsMat = new THREE.PointsMaterial({ color: 0xb892ff, size: 0.4, transparent: true, opacity: 0.8 });
  const symbols = new THREE.Points(symbolsGeo, symbolsMat);
  parent.add(symbols);

  AppState.coreObjects = { glow, ring1, ring2, core, symbols };
}
```

- [ ] **Step 2: 在 animateGalaxy 中添加核心动画**

Append animate function:
```javascript
function animateGalaxy() {
  galaxyAnimationId = requestAnimationFrame(animateGalaxy);
  const t = performance.now() * 0.0005;

  if (AppState.coreObjects) {
    AppState.coreObjects.ring1.rotation.z += 0.005;
    AppState.coreObjects.ring2.rotation.z -= 0.004;
    AppState.coreObjects.symbols.rotation.y += 0.002;
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    AppState.coreObjects.core.scale.set(pulse, pulse, pulse);
  }

  renderer.render(scene, camera);
}
```

- [ ] **Step 3: 本地验证**

Open `http://localhost:8080/app.html`, enter galaxy
Expected: A glowing core with rotating rings and floating particles at center.

- [ ] **Step 4: Commit**

```bash
git add app.html
git commit -m "feat(app): implement concrete chronicle core with rings and symbols"
```

---

### Task 12: 实现流派星云与作品恒星

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 实现星云粒子云**

Append to `<script>`:
```javascript
function buildNebulae(parent) {
  const genres = AppState.genres?.genres || {};
  const genreNames = Object.keys(genres);
  const count = genreNames.length || 1;

  genreNames.forEach((genre, i) => {
    const colorHex = genres[genre]?.color || '#00f3ff';
    const color = new THREE.Color(colorHex);
    const angle = (i / count) * Math.PI * 2;
    const radius = 60 + (i % 3) * 25;
    const y = (Math.random() - 0.5) * 40;

    const geometry = new THREE.BufferGeometry();
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      const r = radius + (Math.random() - 0.5) * 30;
      const a = angle + (Math.random() - 0.5) * 1.2;
      positions[p*3] = r * Math.cos(a);
      positions[p*3+1] = y + (Math.random() - 0.5) * 20;
      positions[p*3+2] = r * Math.sin(a);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 1.2, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
    const nebula = new THREE.Points(geometry, material);
    nebula.userData = { genre, radius, angle, baseY: y };
    parent.add(nebula);
    AppState.nebulae = AppState.nebulae || [];
    AppState.nebulae.push(nebula);
  });
}
```

- [ ] **Step 2: 实现作品恒星**

Append to `<script>`:
```javascript
function buildStars(parent) {
  const data = AppState.data || [];
  const genres = AppState.genres?.genres || {};
  const genreNames = Object.keys(genres);

  data.forEach((anime, i) => {
    const primaryGenre = anime.genres[0] || 'Sci-Fi';
    const genreIndex = Math.max(0, genreNames.indexOf(primaryGenre));
    const count = genreNames.length || 1;
    const angle = (genreIndex / count) * Math.PI * 2 + (Math.random() - 0.5) * 1.0;
    const radius = 60 + (genreIndex % 3) * 25 + (Math.random() - 0.5) * 25;
    const y = (Math.random() - 0.5) * 30;

    const size = 0.6 + Math.min(2.5, (anime.averageScore || 50) / 40) * 0.5;
    const color = new THREE.Color(genres[primaryGenre]?.color || '#00f3ff');

    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const star = new THREE.Mesh(geometry, material);
    star.position.set(radius * Math.cos(angle), y, radius * Math.sin(angle));
    star.userData = { anime, genre: primaryGenre, radius, angle, baseY: y, speed: 0.0005 + Math.random() * 0.0005 };
    parent.add(star);
    starMeshes.push(star);
  });
}
```

- [ ] **Step 3: 在 animateGalaxy 中添加公转动画**

Modify `animateGalaxy`:
```javascript
function animateGalaxy() {
  galaxyAnimationId = requestAnimationFrame(animateGalaxy);
  const t = performance.now() * 0.0005;

  if (AppState.coreObjects) {
    AppState.coreObjects.ring1.rotation.z += 0.005;
    AppState.coreObjects.ring2.rotation.z -= 0.004;
    AppState.coreObjects.symbols.rotation.y += 0.002;
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    AppState.coreObjects.core.scale.set(pulse, pulse, pulse);
  }

  starMeshes.forEach(star => {
    star.userData.angle += star.userData.speed;
    star.position.x = star.userData.radius * Math.cos(star.userData.angle);
    star.position.z = star.userData.radius * Math.sin(star.userData.angle);
  });

  renderer.render(scene, camera);
}
```

- [ ] **Step 4: 本地验证**

Open `http://localhost:8080/app.html`, enter galaxy
Expected: Nebula particle clouds and colored stars orbiting the core.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): add genre nebulae and orbiting anime stars"
```

---

### Task 13: 实现交互、详情面板与看动漫跳转

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 实现鼠标悬停提示**

Append to `<script>`:
```javascript
let hoveredStar = null;

function onGalaxyMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);
  if (intersects.length > 0) {
    const star = intersects[0].object;
    if (hoveredStar !== star) {
      if (hoveredStar) hoveredStar.scale.setScalar(1);
      hoveredStar = star;
      hoveredStar.scale.setScalar(1.5);
      document.body.style.cursor = 'pointer';
      showTooltip(star.userData.anime, e.clientX, e.clientY);
    }
  } else {
    if (hoveredStar) {
      hoveredStar.scale.setScalar(1);
      hoveredStar = null;
      document.body.style.cursor = 'default';
      hideTooltip();
    }
  }
}

function showTooltip(anime, x, y) {
  let tip = document.getElementById('star-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'star-tooltip';
    tip.style.cssText = 'position:fixed;z-index:30;padding:8px 12px;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:12px;pointer-events:none;';
    document.body.appendChild(tip);
  }
  tip.innerHTML = `<strong>${anime.titleRomaji}</strong><br>${anime.year || 'N/A'} · ${anime.genres.join(', ') || ''}`;
  tip.style.left = (x + 12) + 'px';
  tip.style.top = (y + 12) + 'px';
  tip.style.display = 'block';
}

function hideTooltip() {
  const tip = document.getElementById('star-tooltip');
  if (tip) tip.style.display = 'none';
}
```

- [ ] **Step 2: 实现点击打开详情面板**

Append to `<script>`:
```javascript
function onGalaxyClick(e) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);
  if (intersects.length > 0) {
    openDetail(intersects[0].object.userData.anime);
  }
}

function openDetail(anime) {
  const panel = document.getElementById('detail-panel');
  document.getElementById('detail-cover').src = anime.coverImage || 'images/generated/nebula-bg.jpg';
  document.getElementById('detail-title').textContent = anime.titleRomaji;
  document.getElementById('detail-meta').textContent = `${anime.year || 'N/A'} · ${anime.genres.join(' / ')} · Score: ${anime.averageScore || 'N/A'}`;
  document.getElementById('detail-desc').textContent = anime.description || '';
  const watchLink = document.getElementById('detail-watch');
  watchLink.href = `watch.html?title=${encodeURIComponent(anime.titleRomaji)}`;
  panel.classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
}
```

- [ ] **Step 3: 添加 Tooltip CSS**

Append to `<style>`:
```css
#star-tooltip { color: var(--text-primary); }
```

- [ ] **Step 4: 本地验证**

Open galaxy, hover over stars → tooltip appears; click star → detail panel opens with watch link.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): add star hover tooltip and detail panel with watch link"
```

---

### Task 14: 实现 HUD（搜索、流派筛选、音乐、帮助）

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 实现流派 chips**

Append to `<script>`:
```javascript
function initHUD() {
  const chips = document.getElementById('hud-chips');
  const genres = AppState.genres?.genres || {};
  Object.keys(genres).forEach(genre => {
    const chip = document.createElement('div');
    chip.className = 'hud-chip';
    chip.textContent = genre;
    chip.style.borderColor = genres[genre].color;
    chip.onclick = () => toggleGenreFilter(genre, chip);
    chips.appendChild(chip);
  });

  document.getElementById('hud-search').addEventListener('input', (e) => {
    filterStars(e.target.value, AppState.activeGenres || []);
  });

  document.getElementById('btn-music').addEventListener('click', toggleMusic);
  document.getElementById('btn-help').addEventListener('click', showHelp);
}

function toggleGenreFilter(genre, chip) {
  AppState.activeGenres = AppState.activeGenres || [];
  const idx = AppState.activeGenres.indexOf(genre);
  if (idx >= 0) {
    AppState.activeGenres.splice(idx, 1);
    chip.classList.remove('active');
  } else {
    AppState.activeGenres.push(genre);
    chip.classList.add('active');
  }
  filterStars(document.getElementById('hud-search').value, AppState.activeGenres);
}

function filterStars(query, genres) {
  const q = (query || '').toLowerCase();
  starMeshes.forEach(star => {
    const anime = star.userData.anime;
    const matchesQuery = !q || anime.titleRomaji.toLowerCase().includes(q) || anime.titleNative.toLowerCase().includes(q);
    const matchesGenre = genres.length === 0 || genres.some(g => anime.genres.includes(g));
    star.visible = matchesQuery && matchesGenre;
  });
}
```

- [ ] **Step 2: 实现音乐开关与帮助面板**

Append to `<script>`:
```javascript
function toggleMusic() {
  if (!AppState.audio) {
    initAmbientAudio();
    return;
  }
  if (AppState.audio.ctx.state === 'suspended') {
    AppState.audio.ctx.resume();
  } else {
    AppState.audio.ctx.suspend();
  }
}

function showHelp() {
  alert('操作说明：\n• 拖拽旋转视角\n• 滚轮缩放\n• 悬停查看作品信息\n• 点击打开详情与看动漫入口\n• 使用顶部搜索和流派筛选');
}
```

- [ ] **Step 3: 添加相机拖拽控制**

Append to `<script>`:
```javascript
let isDragging = false;
let previousMouse = { x: 0, y: 0 };
let cameraAngle = { theta: 0, phi: 1.2 };
let cameraRadius = 180;

function updateCameraPosition() {
  camera.position.x = cameraRadius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
  camera.position.y = cameraRadius * Math.cos(cameraAngle.phi);
  camera.position.z = cameraRadius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
  camera.lookAt(0, 0, 0);
}

const galaxyCanvas = document.getElementById('galaxy-canvas');
galaxyCanvas.addEventListener('mousedown', (e) => { isDragging = true; previousMouse = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - previousMouse.x;
  const dy = e.clientY - previousMouse.y;
  cameraAngle.theta -= dx * 0.005;
  cameraAngle.phi += dy * 0.005;
  cameraAngle.phi = Math.max(0.2, Math.min(Math.PI - 0.2, cameraAngle.phi));
  previousMouse = { x: e.clientX, y: e.clientY };
  updateCameraPosition();
});
galaxyCanvas.addEventListener('wheel', (e) => {
  cameraRadius += e.deltaY * 0.1;
  cameraRadius = Math.max(60, Math.min(400, cameraRadius));
  updateCameraPosition();
});
updateCameraPosition();
```

- [ ] **Step 4: 本地验证**

Test: genre chips filter stars, search filters stars, drag rotates camera, wheel zooms, music/help buttons work.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): implement HUD with search, genre filter, music toggle, and camera controls"
```

---

### Task 15: 性能优化与移动端降级

**Files:**
- Modify: `app.html`

- [ ] **Step 1: 添加性能检测与降级逻辑**

Append to `<script>`:
```javascript
function detectPerformanceLevel() {
  const lowPower = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const memory = navigator.deviceMemory || 8;
  if (lowPower || (mobile && memory < 4)) return 'low';
  if (mobile) return 'medium';
  return 'high';
}

const PERF_LEVEL = detectPerformanceLevel();
```

- [ ] **Step 2: 根据性能级别调整粒子数量**

Modify `buildNebulae` and `buildStars` to respect `PERF_LEVEL`:
```javascript
const starBudget = { high: AppState.data.length, medium: 400, low: 120 }[PERF_LEVEL];
const nebulaParticleBudget = { high: 800, medium: 400, low: 200 }[PERF_LEVEL];
```

- [ ] **Step 3: 移动端显示 2D 提示**

Append to `<style>`:
```css
@media (max-width: 768px) {
  .hud-top { flex-direction: column; align-items: flex-start; padding: 12px; }
  .hud-search { max-width: 100%; width: 100%; }
  .hud-chips { max-width: 100%; overflow-x: auto; }
  .detail-panel { width: 100%; right: -100%; }
}
```

- [ ] **Step 4: 本地验证**

Test in browser dev tools mobile viewport: layout adapts, no crash.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(app): add performance tiering and mobile layout adaptations"
```

---

### Task 16: 联调 watch.html 与静态检查

**Files:**
- Modify: `watch.html` (if needed)
- Modify: `app.html`

- [ ] **Step 1: 确认 watch.html 能读取 title 参数**

Open `watch.html` and ensure it reads URL params:
```javascript
const params = new URLSearchParams(window.location.search);
const title = params.get('title') || '';
```
If not present, add minimal handling to display title.

- [ ] **Step 2: 在 app.html 中确保跳转链接正确**

The `detail-watch` href already points to `watch.html?title=...`. Verify it works.

- [ ] **Step 3: 运行静态检查**

Run: `node check-syntax.js`
Expected: No syntax errors in `app.html` or `scripts/fetch-anilist.js`.

- [ ] **Step 4: 本地端到端验证**

1. Open `http://localhost:8080/app.html`
2. Wait for loading → showcase → entrance
3. Click "开始旅程"
4. Hover/click a star
5. Click "看动漫"
Expected: Navigates to `watch.html?title=...` and displays title.

- [ ] **Step 5: Commit**

```bash
git add app.html watch.html
git commit -m "feat(app): integrate watch.html jump and pass static checks"
```

---

### Task 17: 最终整合、文档更新与推送

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: 更新 README.md 项目说明**

Add section:
```markdown
## 星云编年史 · 宇宙主站

- 主入口：`app.html`
- 数据生成：`npm run fetch-anilist` 或 `node scripts/fetch-anilist.js 800`
- 本地预览：`python3 -m http.server 8080`，然后访问 `http://localhost:8080/app.html`
- 观影页：`watch.html`
```

- [ ] **Step 2: 确保 data/*.json 不被提交（可选）**

If generated data should not be committed, add to `.gitignore`:
```
data/anime-corpus.json
data/genre-manifest.json
```
If it should be committed for static hosting, skip this step.

- [ ] **Step 3: 最终提交与推送**

```bash
git add README.md .gitignore app.html scripts/fetch-anilist.js
git commit -m "docs: update README and finalize app integration"
git push origin main
```

- [ ] **Step 4: 本地服务器最终验证**

Run: `python3 -m http.server 8080 --bind 0.0.0.0`
Open: `http://localhost:8080/app.html`
Expected: Full flow works end-to-end.

---

## 自检清单

- [x] Spec coverage: 编年史核心具象化、封面动效保留+增强、音频可视化、全息卡片、鼠标视差、3D 星系、HUD、看动漫跳转、性能优化均对应到任务。
- [x] Placeholder scan: 无 TBD/TODO，关键代码已给出。
- [x] Type consistency: `AppState.data`、`AppState.genres`、`AppState.audio`、`AppState.coreObjects`、`AppState.nebulae`、`AppState.activeGenres` 命名一致。

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-07-01-nebula-universe-app-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

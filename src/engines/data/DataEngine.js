// src/engines/data/DataEngine.js
// 动漫数据加载、索引与查询引擎

import { ref, computed } from 'vue';

const base = import.meta.env.BASE_URL;

const data = ref([]);
const genres = ref({});
const graph = ref({ nodes: [], edges: [] });
const loaded = ref(false);
const loading = ref(false);
const error = ref(null);
const graphLoaded = ref(false);
const graphLoading = ref(false);
let loadPromise = null;

// 搜索索引（数据加载后构建，将 O(n) 扫描降为 O(k) 查找）
let indexById = new Map();
let indexByYear = new Map();
let indexByGenre = new Map();
let indexByTitleToken = new Map(); // 分词倒排索引
let indexBuilt = false;

const years = computed(() =>
  [...new Set(data.value.map(a => a.year).filter(Boolean))].sort((a, b) => a - b)
);

const yearGroups = computed(() => {
  const map = new Map();
  for (const anime of data.value) {
    if (!map.has(anime.year)) map.set(anime.year, []);
    map.get(anime.year).push(anime);
  }
  return map;
});

function fetchWithTimeout(url, ms = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

// 简繁/日中常用汉字归一化，提升中文搜索命中率
const SC_TO_TC_MAP = {
  '进': '進', '击': '撃', '国': '國', '龙': '龍', '门': '門', '来': '來', '过': '過',
  '说': '說', '对': '對', '开': '開', '关': '關', '电': '電', '话': '話', '丽': '麗',
  '战': '戰', '场': '場', '热': '熱', '爱': '愛', '梦': '夢', '学': '學', '园': '園',
  '强': '強', '义': '義', '间': '間', '问': '問', '闻': '聞', '觉': '覚', '灵': '霊',
  '异': '異', '转': '転', '让': '譲', '东': '東', '风': '風', '书': '書', '见': '見',
  '贝': '貝', '从': '従', '动': '動', '会': '會', '个': '個', '伦': '倫', '优': '優',
  '伪': '偽', '伞': '傘', '伟': '偉', '创': '創', '剑': '劍', '剧': '劇', '务': '務',
  '单': '單', '卫': '衛', '发': '發', '变': '變', '员': '員', '响': '響', '团': '團',
  '圣': '聖', '复': '復', '夺': '奪', '奴': '奴', '妙': '妙', '姐': '姐', '姬': '姫',
  '嫁': '嫁', '字': '字', '宅': '宅', '实': '実', '客': '客', '宫': '宮', '家': '家',
  '密': '密', '将': '將', '尸': '屍', '属': '屬', '岭': '嶺', '巫': '巫', '带': '帶',
  '库': '庫', '废': '廃', '异': '異', '张': '張', '强': '強', '影': '影', '征': '征',
  '御': '御', '忍': '忍', '怪': '怪', '恋': '恋', '恐': '恐', '惠': '恵', '惨': '惨',
  '惩': '懲', '戏': '戯', '战': '戦', '拂': '払', '拜': '拝', '拟': '擬', '挥': '揮',
  '敌': '敵', '斩': '斬', '断': '断', '时': '時', '晓': '暁', '晚': '晩', '普': '普',
  '曲': '曲', '最': '最', '杀': '殺', '极': '極', '枪': '槍', '樱': '桜', '歌': '歌',
  '武': '武', '残': '残', '气': '気', '求': '求', '汉': '漢', '测': '測', '海': '海',
  '涂': '塗', '灭': '滅', '灵': '霊', '灾': '災', '点': '点', '烧': '焼', '爱': '愛',
  '狱': '獄', '王': '王', '现': '現', '电': '電', '画': '画', '疗': '療', '盗': '盗',
  '码': '碼', '离': '離', '种': '種', '空': '空', '站': '駅', '笔': '筆', '第': '第',
  '等': '等', '算': '算', '紫': '紫', '红': '紅', '终': '終', '经': '経', '结': '結',
  '给': '給', '绝': '絶', '绣': '綉', '网': '網', '罪': '罪', '美': '美', '职': '職',
  '脑': '脳', '脚': '脚', '腾': '騰', '舞': '舞', '航': '航', '舰': '艦', '花': '花',
  '苍': '蒼', '蓝': '藍', '藏': '蔵', '虏': '虜', '虫': '虫', '血': '血', '补': '補',
  '装': '装', '裤': '褲', '见': '見', '观': '観', '视': '視', '解': '解', '言': '言',
  '计': '計', '记': '記', '设': '設', '诈': '詐', '诗': '詩', '话': '話', '语': '語',
  '误': '誤', '请': '請', '课': '課', '调': '調', '谎': '謊', '象': '象', '责': '責',
  '财': '財', '贤': '賢', '赛': '賽', '赞': '賛', '赠': '贈', '赢': '贏', '走': '走',
  '超': '超', '路': '路', '车': '車', '转': '転', '轻': '軽', '辉': '輝', '辞': '辞',
  '边': '辺', '达': '達', '过': '過', '运': '運', '进': '進', '远': '遠', '连': '連',
  '选': '選', '遗': '遺', '邮': '郵', '都': '都', '酱': '醤', '里': '里', '钟': '鐘',
  '银': '銀', '铁': '鉄', '锁': '鎖', '镇': '鎮', '长': '長', '门': '門', '间': '間',
  '闻': '聞', '阳': '陽', '阴': '陰', '阵': '陣', '阶': '階', '隐': '隠', '隶': '隷',
  '难': '難', '雨': '雨', '雾': '霧', '霭': '靄', '静': '静', '面': '面', '音': '音',
  '顶': '頂', '项': '項', '顺': '順', '须': '須', '领': '領', '频': '頻', '题': '題',
  '颜': '顔', '风': '風', '飞': '飛', '饭': '飯', '饮': '飲', '馆': '館', '马': '馬',
  '驱': '駆', '验': '験', '骑': '騎', '鬼': '鬼', '魔': '魔', '鱼': '魚', '鲜': '鮮',
  '鸟': '鳥', '鸡': '鶏', '黑': '黒', '龙': '龍'
};

function normalizeCJK(text) {
  return String(text).split('').map(ch => SC_TO_TC_MAP[ch] || ch).join('');
}

/** 构建搜索索引：id/年份/流派/标题分词倒排 */
function buildIndex() {
  if (indexBuilt) return;
  indexById = new Map();
  indexByYear = new Map();
  indexByGenre = new Map();
  indexByTitleToken = new Map();

  for (const anime of data.value) {
    // id 索引
    indexById.set(String(anime.id), anime);

    // 年份索引
    if (anime.year) {
      if (!indexByYear.has(anime.year)) indexByYear.set(anime.year, []);
      indexByYear.get(anime.year).push(anime);
    }

    // 流派索引
    if (anime.genres) {
      for (const g of anime.genres) {
        if (!indexByGenre.has(g)) indexByGenre.set(g, []);
        indexByGenre.get(g).push(anime);
      }
    }

    // 标题分词倒排索引（按字符 bigram + 完整词）
    const titles = [anime.titleRomaji, anime.titleJa, anime.titleEnglish]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    const tokens = new Set();
    for (const title of titles) {
      // 完整标题作为一个 token
      tokens.add(title);
      // 字符 bigram
      for (let i = 0; i < title.length - 1; i++) {
        tokens.add(title.slice(i, i + 2));
      }
      // 单字符
      for (const ch of title) {
        tokens.add(ch);
      }
    }
    // 标签和工作室也加入索引
    if (anime.tags) {
      for (const tag of anime.tags) {
        tokens.add(String(tag).toLowerCase());
      }
    }
    if (anime.studios) {
      for (const s of anime.studios) {
        tokens.add(String(s).toLowerCase());
      }
    }

    for (const token of tokens) {
      if (!indexByTitleToken.has(token)) indexByTitleToken.set(token, new Set());
      indexByTitleToken.get(token).add(anime);
    }
  }

  indexBuilt = true;
  console.log(`[DataEngine] 索引构建完成: ${indexById.size} id, ${indexByYear.size} 年份, ${indexByGenre.size} 流派, ${indexByTitleToken.size} 标题token`);
}

/** 基于索引的快速搜索 */
function searchByIndex(term) {
  const lower = term.toLowerCase();
  const results = new Set();

  // 精确匹配标题
  const exact = indexByTitleToken.get(lower);
  if (exact) exact.forEach(a => results.add(a));

  // 前缀匹配
  for (const [token, animes] of indexByTitleToken) {
    if (token.startsWith(lower) || token.includes(lower)) {
      animes.forEach(a => results.add(a));
    }
  }

  return [...results];
}

export const DataEngine = {
  data,
  genres,
  graph,
  loaded,
  loading,
  error,
  graphLoaded,
  graphLoading,
  years,
  yearGroups,

  load() {
    if (loaded.value) return Promise.resolve();
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      loading.value = true;
      error.value = null;
      try {
        // 1. 先加载核心数据：作品语料 + 流派配置（较小，必须）
        const [corpusRes, genreRes] = await Promise.all([
          fetchWithTimeout(`${base}data/anime-corpus.json`, 20000),
          fetchWithTimeout(`${base}data/genre-manifest.json`, 10000)
        ]);

        if (!corpusRes.ok) throw new Error(`corpus: ${corpusRes.status}`);
        if (!genreRes.ok) throw new Error(`genres: ${genreRes.status}`);

        const rawData = await corpusRes.json();
        genres.value = await genreRes.json();

        // 本地封面兜底：沙箱/无头环境外部 CDN 常被拦截，用本地图库循环兜底
        const localCovers = Array.from({ length: 42 }, (_, i) => `${base}images/${i}.jpg`);
        data.value = rawData.map((anime, i) => ({
          ...anime,
          coverImage: anime.coverImage || localCovers[i % localCovers.length],
          coverFallback: localCovers[i % localCovers.length]
        }));

        loaded.value = true;
        loading.value = false;

        // 构建搜索索引（同步，1711 条约 < 20ms）
        buildIndex();

        // 2. 后台懒加载知识图谱（6MB+），不阻塞 3D 宇宙渲染
        this.loadGraphInBackground();
      } catch (err) {
        error.value = err.message;
        console.error('[DataEngine] 加载失败:', err);
        loading.value = false;
        throw err;
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  },

  async loadGraphInBackground() {
    if (graphLoaded.value || graphLoading.value) return;
    graphLoading.value = true;
    try {
      const graphRes = await fetchWithTimeout(`${base}data/knowledge-graph.json`, 30000);
      if (!graphRes.ok) throw new Error(`graph: ${graphRes.status}`);
      graph.value = await graphRes.json();
      graphLoaded.value = true;
      console.log('[DataEngine] 知识图谱加载完成');
    } catch (err) {
      console.warn('[DataEngine] 知识图谱加载失败，将使用空图谱继续运行:', err);
      graph.value = { nodes: [], edges: [] };
    } finally {
      graphLoading.value = false;
    }
  },

  byId(id) {
    if (indexBuilt) return indexById.get(String(id));
    return data.value.find(a => String(a.id) === String(id));
  },

  byYear(year) {
    if (indexBuilt && indexByYear.has(year)) return indexByYear.get(year);
    return data.value.filter(a => a.year === year);
  },

  byGenre(genre) {
    if (indexBuilt && indexByGenre.has(genre)) return indexByGenre.get(genre);
    return data.value.filter(a => a.genres?.includes(genre));
  },

  search(q) {
    const term = String(q || '').toLowerCase().trim();
    if (!term) return [];

    // 对中文/日文搜索词做归一化
    const variants = new Set([term, normalizeCJK(term)]);
    if (term.includes('的')) variants.add(term.replace(/的/g, 'の'));
    if (term.includes('の')) variants.add(term.replace(/の/g, '的'));

    // 使用索引加速（多变体合并去重）
    if (indexBuilt) {
      const results = new Set();
      for (const v of variants) {
        const hits = searchByIndex(v);
        hits.forEach(a => results.add(a));
      }
      // 保持原始排序
      const idOrder = new Map(data.value.map((a, i) => [a, i]));
      return [...results].sort((a, b) => (idOrder.get(a) ?? 0) - (idOrder.get(b) ?? 0));
    }

    // 索引未就绪时回退到线性扫描
    return data.value.filter(a =>
      [...variants].some(t =>
        a.titleRomaji?.toLowerCase().includes(t) ||
        a.titleJa?.toLowerCase().includes(t) ||
        a.titleEnglish?.toLowerCase().includes(t) ||
        a.aliases?.some(alias => String(alias).toLowerCase().includes(t)) ||
        a.tags?.some(tag => String(tag).toLowerCase().includes(t)) ||
        a.studios?.some(s => String(s).toLowerCase().includes(t)) ||
        a.authors?.some(s => String(s).toLowerCase().includes(t)) ||
        a.directors?.some(s => String(s).toLowerCase().includes(t))
      )
    );
  },

  fuzzyFindByTitle(title) {
    const term = String(title).toLowerCase().trim();
    if (!term) return null;

    // 优先用索引精确匹配
    if (indexBuilt) {
      const exact = indexByTitleToken.get(term);
      if (exact && exact.size === 1) return [...exact][0];
    }

    return data.value.find(a =>
      a.titleRomaji?.toLowerCase().includes(term) ||
      a.titleJa?.toLowerCase().includes(term) ||
      a.titleEnglish?.toLowerCase().includes(term)
    );
  },

  topWorks(limit = 8) {
    return [...data.value]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
};

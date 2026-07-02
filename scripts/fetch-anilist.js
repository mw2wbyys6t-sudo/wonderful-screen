import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const DELAY_MS = 800;

const GENRE_PALETTE = {
  'Action': '#ff4444',
  'Adventure': '#ffcc00',
  'Comedy': '#ffee66',
  'Drama': '#b892ff',
  'Fantasy': '#b026ff',
  'Horror': '#aa66ff',
  'Mahou Shoujo': '#ff66dd',
  'Mecha': '#4488ff',
  'Music': '#00ffaa',
  'Mystery': '#aa66ff',
  'Psychological': '#00f3ff',
  'Romance': '#ff88cc',
  'Sci-Fi': '#00f3ff',
  'Slice of Life': '#66ffaa',
  'Sports': '#ffcc00',
  'Supernatural': '#b026ff',
  'Thriller': '#aa66ff'
};

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
      staff(perPage: 3) { edges { role node { name { full } } } }
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

function normalizeMedia(m) {
  const director = (m.staff?.edges || []).find(e =>
    e.role?.toLowerCase().includes('director')
  )?.node?.name?.full || '';
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
      if (!genreMap[g]) {
        genreMap[g] = { count: 0, color: GENRE_PALETTE[g] || '#00f3ff' };
      }
      genreMap[g].count += 1;
    });
  });

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const corpusPath = path.join(dataDir, 'anime-corpus.json');
  const manifestPath = path.join(dataDir, 'genre-manifest.json');

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

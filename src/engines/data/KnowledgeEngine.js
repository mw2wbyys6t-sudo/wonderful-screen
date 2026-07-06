// src/engines/data/KnowledgeEngine.js
// 知识图谱引擎：关系查询、路径发现、推荐

import { DataEngine } from './DataEngine.js';

export const KnowledgeEngine = {
  related(id, type = null) {
    const edges = DataEngine.graph.value.edges.filter(
      e => String(e.source) === String(id) || String(e.target) === String(id)
    );
    const filtered = type ? edges.filter(e => e.type === type) : edges;
    return filtered.map(e => ({
      ...e,
      neighbor: String(e.source) === String(id) ? e.target : e.source
    }));
  },

  neighbors(id, type = null, limit = 12) {
    const list = this.related(id, type)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map(e => ({
        anime: DataEngine.byId(e.neighbor),
        relation: e.type,
        weight: e.weight
      }))
      .filter(item => item.anime);
    return list;
  },

  path(fromId, toId, maxHops = 4) {
    const visited = new Set();
    const queue = [[String(fromId)]];

    while (queue.length) {
      const path = queue.shift();
      const nodeId = path[path.length - 1];
      if (nodeId === String(toId)) return path;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const neighbors = this.related(nodeId).map(r => String(r.neighbor));
      for (const n of neighbors) {
        if (path.length < maxHops + 1) {
          queue.push([...path, n]);
        }
      }
    }
    return null;
  },

  recommend(seedId, limit = 6) {
    const related = this.related(seedId);
    related.sort((a, b) => b.weight - a.weight);
    return related
      .slice(0, limit)
      .map(r => DataEngine.byId(r.neighbor))
      .filter(Boolean);
  },

  recommendByGenre(genre, limit = 8) {
    return DataEngine.byGenre(genre)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  },

  recommendByYear(year, limit = 8) {
    return DataEngine.byYear(year)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }
};

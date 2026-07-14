// src/engines/ai/AIEngine.js
// AI 导航引擎：解析语音/文本意图，生成导航建议与解说

import { parseIntent } from './intent-parser.js';
import { DataEngine } from '../data/DataEngine.js';
import { KnowledgeEngine } from '../data/KnowledgeEngine.js';
import { bus } from '../core/EventBus.js';

export const AIEngine = {
  mode: 'local', // local | llm
  llmConfig: null,

  init() {
    bus.on('ai:explain', (animeId) => this.explainAndNarrate(animeId));
    return this;
  },

  setMode(mode) {
    this.mode = mode;
  },

  async understand(text) {
    if (this.mode === 'llm' && this.llmConfig) {
      try {
        return await this.askLLM(text);
      } catch (err) {
        console.warn('[AIEngine] LLM 失败，回退到本地解析:', err);
      }
    }
    return parseIntent(text);
  },

  async askLLM(text) {
    // 预留 LLM 调用接口，默认未实现
    throw new Error('LLM 模式尚未配置');
  },

  // 生成 AI 导航提示语
  narrate(intent, result) {
    switch (intent.action) {
      case 'focus-year':
        return `正在前往 ${intent.year} 年的动漫银河。`;
      case 'focus-anime':
        return result
          ? `已定位到 ${result.titleRomaji}（${result.year}）。`
          : `未找到 ${intent.title}，请尝试其他名称。`;
      case 'recommend':
        return intent.genre
          ? `为你点亮所有${intent.genre}作品。`
          : '正在推荐高评分动漫。';
      case 'back':
        return '返回上一级。';
      case 'clear':
        return '宇宙视图已重置。';
      default:
        return '我没有理解，请尝试说"带我去2008年"或"推荐治愈番"。';
    }
  },

  // 对外接口：处理文本并广播意图
  async process(text) {
    const intent = await this.understand(text);
    const result = intent.id ? DataEngine.byId(intent.id) : null;
    const narration = this.narrate(intent, result);

    bus.emit('voice:intent', intent);
    bus.emit('ai:narrate', narration);

    return { intent, narration };
  },

  // 处理作品解说请求
  explainAndNarrate(animeId) {
    const explanation = this.explain(animeId);
    if (explanation) {
      bus.emit('ai:narrate', explanation);
    }
    return explanation;
  },

  // 获取某部作品的 AI 解说
  explain(animeId) {
    const anime = DataEngine.byId(animeId);
    if (!anime) return '';

    const related = KnowledgeEngine.neighbors(animeId, null, 3);
    const lines = [
      `${anime.titleRomaji} 是 ${anime.year} 年的 ${anime.genres?.join('、') || '动画'}作品。`,
      anime.studios?.length ? `由 ${anime.studios.slice(0, 2).join('、')} 制作。` : '',
      anime.score ? `评分 ${anime.score} 分。` : '',
      related.length ? `与它相关的作品有：${related.map(r => r.anime.titleRomaji).join('、')}。` : ''
    ];
    return lines.filter(Boolean).join('');
  }
};

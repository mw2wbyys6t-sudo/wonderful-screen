// src/engines/interaction/VoiceEngine.js
// 语音识别引擎：基于 Web Speech API，把文本交给 AIEngine 解析

import { ref } from 'vue';
import { bus } from '../core/EventBus.js';

export const VoiceEngine = {
  isListening: ref(false),
  isSupported: ref(false),
  feedback: ref(''),
  transcript: ref(''),

  recognition: null,
  restartCount: 0,
  maxRestarts: 5,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.isSupported.value = false;
      this.feedback.value = '浏览器不支持语音识别';
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.isSupported.value = true;

    this.recognition.onstart = () => {
      this.isListening.value = true;
      this.feedback.value = '正在聆听…';
      bus.emit('voice:status', 'listening');
    };

    this.recognition.onend = () => {
      this.isListening.value = false;
      bus.emit('voice:status', 'stopped');
      if (this.restartCount < this.maxRestarts) {
        this.restartCount++;
        setTimeout(() => this.start(), 300);
      }
    };

    this.recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      this.transcript.value = text;
      this.feedback.value = `听到：${text}`;
      bus.emit('voice:text', text);
    };

    this.recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'audio-capture') return;
      this.feedback.value = `语音错误：${e.error}`;
      console.warn('[VoiceEngine] 识别错误:', e.error);
    };

    return true;
  },

  start() {
    if (!this.recognition) this.init();
    if (!this.isSupported.value) return false;
    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('[VoiceEngine] 启动失败:', err);
      return false;
    }
  },

  stop() {
    this.restartCount = this.maxRestarts; // 阻止自动重启
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
    }
    this.isListening.value = false;
  },

  toggle() {
    if (this.isListening.value) {
      this.stop();
    } else {
      this.restartCount = 0;
      this.start();
    }
  },

  showFeedback(text, duration = 2500) {
    this.feedback.value = text;
    if (duration > 0) {
      setTimeout(() => {
        if (this.feedback.value === text) this.feedback.value = '';
      }, duration);
    }
  }
};

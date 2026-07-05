import { ref } from 'vue';

export function useVoice(options = {}) {
  const isListening = ref(false);
  const isSupported = ref(false);
  const feedback = ref('');

  let recognition = null;
  let feedbackTimer = null;
  let restartCount = 0;
  const MAX_RESTARTS = 5;

  function checkSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    isSupported.value = !!SpeechRecognition;
    return isSupported.value;
  }

  function init() {
    if (recognition) return true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      isSupported.value = false;
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening.value = true;
      showFeedback('语音识别已开启');
    };

    recognition.onend = () => {
      if (isListening.value) {
        if (restartCount >= MAX_RESTARTS) {
          showFeedback('语音识别已自动停止，请手动重新开启');
          isListening.value = false;
          restartCount = 0;
          return;
        }
        restartCount++;
        try {
          recognition.start();
        } catch (e) {
          isListening.value = false;
          restartCount = 0;
        }
      }
    };

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        showFeedback(`识别：${text}`);
        if (options.onResult) options.onResult(text);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('语音识别错误:', event.error);
      if (event.error === 'not-allowed') {
        showFeedback('麦克风权限被拒绝，请允许麦克风访问后重试');
        isListening.value = false;
        restartCount = 0;
        return;
      }
      if (options.onError) options.onError(event.error);
    };

    isSupported.value = true;
    return true;
  }

  function start() {
    if (!recognition && !init()) return false;
    if (isListening.value) return true;
    try {
      recognition.start();
      isListening.value = true;
      restartCount = 0;
      return true;
    } catch (e) {
      console.warn('语音启动失败:', e);
      return false;
    }
  }

  function stop() {
    isListening.value = false;
    restartCount = 0;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  function toggle() {
    if (isListening.value) {
      stop();
      showFeedback('语音识别已关闭');
    } else {
      start();
    }
  }

  function showFeedback(message) {
    feedback.value = message;
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedback.value = '';
    }, 2500);
  }

  checkSupport();

  return {
    isListening,
    isSupported,
    feedback,
    start,
    stop,
    toggle,
    showFeedback
  };
}

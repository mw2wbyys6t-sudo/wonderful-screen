import { ref } from 'vue';

let audioCtx = null;
let analyser = null;
let dataArray = null;
let oscillator = null;
let gainNode = null;
let isPlaying = ref(false);

export function useAudio() {
  const init = () => {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      oscillator = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 110;
      gainNode.gain.value = 0.03;
      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);
      oscillator.start();
      isPlaying.value = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  };

  const toggle = () => {
    if (!audioCtx) {
      init();
      return;
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      isPlaying.value = true;
    } else if (audioCtx.state === 'running') {
      audioCtx.suspend();
      isPlaying.value = false;
    }
  };

  const getLevel = () => {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255;
  };

  const getFreqBands = () => {
    if (!analyser || !dataArray) return { low: 0, mid: 0, high: 0 };
    analyser.getByteFrequencyData(dataArray);
    const len = dataArray.length;
    const lowEnd = Math.floor(len * 0.25);
    const midEnd = Math.floor(len * 0.6);
    const low = dataArray.slice(0, lowEnd).reduce((a, b) => a + b, 0) / lowEnd / 255;
    const mid = dataArray.slice(lowEnd, midEnd).reduce((a, b) => a + b, 0) / (midEnd - lowEnd) / 255;
    const high = dataArray.slice(midEnd).reduce((a, b) => a + b, 0) / (len - midEnd) / 255;
    return { low, mid, high };
  };

  return { init, toggle, getLevel, getFreqBands, isPlaying };
}

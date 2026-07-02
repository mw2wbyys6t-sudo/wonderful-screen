<template>
  <section class="phase-loading">
    <div class="loading-center">
      <div class="character-silhouette">
        <div class="silhouette-aura"></div>
        <div class="silhouette-body">
          <div class="silhouette-head"></div>
          <div class="silhouette-hair hair-left"></div>
          <div class="silhouette-hair hair-right"></div>
          <div class="silhouette-cloak"></div>
          <div class="silhouette-core"></div>
        </div>
      </div>
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
        <div class="progress-text">{{ progress }}%</div>
      </div>
      <div class="loading-tip">{{ tip }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useData } from '../composables/useData.js';

const emit = defineEmits(['done']);
const { load } = useData();
const progress = ref(0);
const tip = ref('正在连接星云数据库…');
const tips = [
  '正在连接星云数据库…',
  '正在点亮恒星…',
  '正在绘制星云图谱…',
  '正在校准次元核心…',
  '正在加载全息投影…'
];

const circumference = 2 * Math.PI * 54;
const strokeOffset = computed(() => circumference * (1 - progress.value / 100));

onMounted(async () => {
  const tipInterval = setInterval(() => {
    tip.value = tips[Math.floor(Math.random() * tips.length)];
  }, 1500);

  await load();
  progress.value = 50;
  await new Promise(r => setTimeout(r, 800));
  progress.value = 100;

  clearInterval(tipInterval);
  setTimeout(() => emit('done'), 600);
});
</script>

<style scoped>
.phase-loading {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(124, 77, 255, 0.15) 0%, transparent 60%), var(--bg-darker);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.character-silhouette {
  position: relative;
  width: 120px;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.silhouette-aura {
  position: absolute;
  inset: -40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.25) 0%, rgba(184, 146, 255, 0.12) 40%, transparent 70%);
  filter: blur(16px);
  animation: auraPulse 3.5s ease-in-out infinite;
}

.silhouette-body {
  position: relative;
  width: 80px;
  height: 130px;
  filter: drop-shadow(0 0 18px rgba(0, 243, 255, 0.45));
  animation: figureFloat 4s ease-in-out infinite;
}

.silhouette-head {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 38px;
  background: linear-gradient(180deg, rgba(224, 240, 255, 0.95), rgba(0, 243, 255, 0.75));
  border-radius: 50% 50% 45% 45%;
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
}

.silhouette-hair {
  position: absolute;
  top: 2px;
  width: 28px;
  height: 56px;
  background: linear-gradient(180deg, rgba(184, 146, 255, 0.9), rgba(0, 243, 255, 0.5));
  border-radius: 50% 50% 30% 70%;
  filter: blur(1px);
}

.silhouette-hair.hair-left {
  left: -6px;
  --base-rot: -12deg;
  animation: hairSway 3s ease-in-out infinite;
}

.silhouette-hair.hair-right {
  right: -6px;
  --base-rot: 12deg;
  animation: hairSway 3.5s ease-in-out infinite reverse;
}

.silhouette-cloak {
  position: absolute;
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 96px;
  background: linear-gradient(180deg, rgba(0, 243, 255, 0.55) 0%, rgba(124, 77, 255, 0.25) 60%, transparent 100%);
  clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 50% 88%, 0% 100%);
  border-radius: 30% 30% 10% 10%;
  box-shadow: inset 0 0 30px rgba(0, 243, 255, 0.2);
}

.silhouette-core {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(0, 243, 255, 0.7));
  box-shadow: 0 0 24px rgba(0, 243, 255, 0.7), 0 0 48px rgba(184, 146, 255, 0.4);
  animation: corePulse 2s ease-in-out infinite;
}

.energy-rings {
  position: absolute;
  width: 260px;
  height: 260px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
}

.energy-rings .ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(0, 243, 255, 0.3);
  border-radius: 50%;
  animation: ringExpand 3s ease-out infinite;
}

.energy-rings .ring:nth-child(2) {
  animation-delay: 1s;
  border-color: rgba(184, 146, 255, 0.3);
}

.energy-rings .ring:nth-child(3) {
  animation-delay: 2s;
  border-color: rgba(255, 42, 109, 0.2);
}

.loading-progress {
  position: relative;
  width: 120px;
  height: 120px;
  margin-top: 24px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring circle {
  fill: none;
  stroke-width: 6;
}

.progress-bg {
  stroke: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  stroke: var(--neon-cyan);
  stroke-linecap: round;
  stroke-dasharray: 339.292;
  stroke-dashoffset: v-bind(strokeOffset);
  transition: stroke-dashoffset 0.3s ease;
  filter: drop-shadow(0 0 4px rgba(0, 243, 255, 0.6));
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 18px;
}

.loading-tip {
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  min-height: 20px;
}

@keyframes auraPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.12); opacity: 1; }
}

@keyframes figureFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes hairSway {
  0%, 100% { transform: rotate(var(--base-rot, 0deg)) translateX(0); }
  50% { transform: rotate(var(--base-rot, 0deg)) translateX(3px); }
}

@keyframes corePulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.9; }
  50% { transform: translateX(-50%) scale(1.2); opacity: 1; }
}

@keyframes ringExpand {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}
</style>

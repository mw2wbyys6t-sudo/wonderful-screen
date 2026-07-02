<template>
  <section class="phase-loading">
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

.energy-figure {
  width: 80px;
  height: 120px;
  background: linear-gradient(180deg, rgba(0, 243, 255, 0.6), rgba(184, 146, 255, 0.2));
  border-radius: 40px 40px 20px 20px;
  filter: blur(8px);
  animation: energyPulse 3s ease-in-out infinite;
}

.energy-rings {
  position: absolute;
  width: 240px;
  height: 240px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
  margin-top: 40px;
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

@keyframes energyPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

@keyframes ringExpand {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}
</style>

<template>
  <section class="phase-showcase">
    <div class="showcase-core">
      <div class="mini-core"></div>
    </div>
    <div class="showcase-orbit">
      <div v-for="(work, i) in topWorks" :key="work.id" class="holo-card" :style="cardStyle(i)">
        <img :src="work.coverImage || '/images/generated/nebula-bg.jpg'" :alt="work.titleRomaji">
        <div class="holo-card-title">{{ work.titleRomaji }}</div>
      </div>
    </div>
    <button class="skip-btn" @click="$emit('skip')">跳过</button>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { useData } from '../composables/useData.js';

const emit = defineEmits(['skip']);
const { topWorks } = useData();

const cardStyle = (i) => {
  const count = topWorks.value.length || 1;
  const angle = (i / count) * Math.PI * 2;
  const radius = 260;
  return {
    transform: `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px)`
  };
};

onMounted(() => {
  setTimeout(() => emit('skip'), 7000);
});
</script>

<style scoped>
.phase-showcase {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 243, 255, 0.08) 0%, transparent 55%), var(--bg-deep);
  perspective: 1200px;
}

.showcase-core {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
}

.mini-core {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.9), rgba(0, 243, 255, 0.6) 40%, rgba(184, 146, 255, 0.3) 70%, transparent);
  box-shadow: 0 0 40px rgba(0, 243, 255, 0.4);
  animation: coreRotate 12s linear infinite, coreBreath 4s ease-in-out infinite;
}

.showcase-orbit {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: orbitRotate 20s linear infinite;
}

.holo-card {
  position: absolute;
  width: 140px;
  height: 200px;
  left: -70px;
  top: -100px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(6px);
  transform-style: preserve-3d;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.15);
}

.holo-card img {
  width: 100%;
  height: 70%;
  object-fit: cover;
  opacity: 0.9;
}

.holo-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.25) 50%, transparent 60%);
  animation: holoScan 3s linear infinite;
}

.holo-card-title {
  padding: 8px;
  font-size: 12px;
  text-align: center;
  color: var(--text-primary);
}

.skip-btn {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: transparent;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  border-radius: 24px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
}

@keyframes coreRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes coreBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@keyframes orbitRotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}

@keyframes holoScan {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
</style>

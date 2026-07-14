<template>
  <div id="universe">
    <div class="cg-overlay"></div>
    <div class="cg-film-grain"></div>
    <Transition name="phase" mode="out-in" @before-leave="onBeforeLeave" @after-enter="onAfterEnter">
      <LoadingPhase v-if="phase === 'loading'" @done="goTo('showcase')" />
      <ShowcasePhase v-else-if="phase === 'showcase'" @skip="goTo('landing')" @done="goTo('landing')" />
      <LandingPhase v-else-if="phase === 'landing'" @start="goTo('universe')" />
      <UniversePhase v-else-if="phase === 'universe'" />
    </Transition>

    <div class="phase-flash" :class="{ active: flashActive }"></div>
    <div class="phase-rainbow" :class="{ active: flashActive }"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingPhase from './components/LoadingPhase.vue';
import LandingPhase from './components/LandingPhase.vue';
import ShowcasePhase from './components/ShowcasePhase.vue';
import UniversePhase from './components/UniversePhase.vue';

const phase = ref('loading');
const flashActive = ref(false);

function goTo(next) {
  flashActive.value = true;
  const delay = next === 'universe' ? 180 : 320;
  setTimeout(() => {
    phase.value = next;
  }, delay);
  setTimeout(() => {
    flashActive.value = false;
  }, next === 'universe' ? 900 : 700);
}

function onBeforeLeave() {
  document.body.classList.add('phase-switching');
}

function onAfterEnter() {
  document.body.classList.remove('phase-switching');
}
</script>

<style>
.cg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10, 4, 24, 0.55) 100%);
  mix-blend-mode: multiply;
}

.cg-film-grain {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  animation: grainShift 0.5s steps(4) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2%, 1%); }
  50% { transform: translate(1%, -2%); }
  75% { transform: translate(-1%, -1%); }
}

.phase-enter-active,
.phase-leave-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), filter 0.55s ease-out;
}

.phase-enter-from {
  opacity: 0;
  transform: scale(1.04);
  filter: blur(8px) saturate(1.5) brightness(1.3);
}

.phase-leave-to {
  opacity: 0;
  transform: scale(0.98);
  filter: blur(4px) brightness(0.8);
}

.phase-flash {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 1) 0%, rgba(255, 200, 230, 0.85) 20%, rgba(201, 177, 255, 0.5) 45%, rgba(184, 224, 255, 0.25) 65%, transparent 85%);
  opacity: 0;
  transition: opacity 0.15s ease-out;
}

.phase-flash.active {
  opacity: 1;
  animation: flashFade 0.9s ease-out forwards;
}

.phase-rainbow {
  position: fixed;
  inset: 0;
  z-index: 99;
  pointer-events: none;
  background: conic-gradient(from 0deg at 50% 50%,
    rgba(255, 158, 196, 0.6),
    rgba(201, 177, 255, 0.6),
    rgba(184, 224, 255, 0.6),
    rgba(255, 215, 0, 0.4),
    rgba(255, 158, 196, 0.6));
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(60px);
}

.phase-rainbow.active {
  animation: rainbowBurst 1.1s ease-out forwards;
}

@keyframes flashFade {
  0% { opacity: 0; transform: scale(0.6); }
  20% { opacity: 1; transform: scale(1.0); }
  100% { opacity: 0; transform: scale(1.4); }
}

@keyframes rainbowBurst {
  0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  30% { opacity: 0.7; transform: scale(1.2) rotate(60deg); }
  100% { opacity: 0; transform: scale(2) rotate(180deg); }
}
</style>

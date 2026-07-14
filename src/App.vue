<template>
  <div id="universe">
    <div class="cg-vignette-overlay"></div>
    <div class="cg-film-grain"></div>
    <div class="cg-light-leak"></div>
    <Transition name="phase" mode="out-in" @before-leave="onBeforeLeave" @after-enter="onAfterEnter">
      <LoadingPhase v-if="phase === 'loading'" @done="goTo('showcase')" />
      <ShowcasePhase v-else-if="phase === 'showcase'" @skip="goTo('landing')" @done="goTo('landing')" />
      <LandingPhase v-else-if="phase === 'landing'" @start="goTo('universe')" />
      <UniversePhase v-else-if="phase === 'universe'" />
    </Transition>

    <div class="phase-flash" :class="{ active: flashActive }"></div>
    <div class="phase-rainbow" :class="{ active: flashActive }"></div>
    <div class="phase-chromatic" :class="{ active: flashActive }"></div>
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
.cg-vignette-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(10, 4, 24, 0.6) 100%);
  mix-blend-mode: multiply;
}

.cg-film-grain {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  animation: grainShift 0.4s steps(4) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-1%, 1%); }
  50% { transform: translate(1%, -1%); }
  75% { transform: translate(-1%, -1%); }
}

.cg-light-leak {
  position: fixed;
  inset: 0;
  z-index: 9996;
  pointer-events: none;
  background:
    radial-gradient(ellipse 600px 400px at 15% 20%, rgba(255, 158, 196, 0.04), transparent 70%),
    radial-gradient(ellipse 500px 350px at 85% 80%, rgba(201, 177, 255, 0.035), transparent 70%),
    radial-gradient(ellipse 300px 200px at 80% 15%, rgba(255, 215, 0, 0.02), transparent 70%);
  mix-blend-mode: screen;
  animation: lightLeakDrift 12s ease-in-out infinite alternate;
}

@keyframes lightLeakDrift {
  0% { opacity: 0.6; transform: translate(0, 0); }
  50% { opacity: 1; transform: translate(10px, -5px); }
  100% { opacity: 0.7; transform: translate(-5px, 8px); }
}

.phase-enter-active,
.phase-leave-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), filter 0.55s ease-out;
}

.phase-enter-from {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(10px) saturate(1.6) brightness(1.4);
}

.phase-leave-to {
  opacity: 0;
  transform: scale(0.97);
  filter: blur(6px) brightness(0.7);
}

.phase-flash {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 1) 0%, rgba(255, 200, 230, 0.9) 18%, rgba(201, 177, 255, 0.55) 40%, rgba(184, 224, 255, 0.3) 60%, transparent 82%);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}

.phase-flash.active {
  opacity: 1;
  animation: flashFade 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.phase-rainbow {
  position: fixed;
  inset: 0;
  z-index: 99;
  pointer-events: none;
  background: conic-gradient(from 0deg at 50% 50%,
    rgba(255, 158, 196, 0.5),
    rgba(201, 177, 255, 0.5),
    rgba(184, 224, 255, 0.5),
    rgba(255, 215, 0, 0.35),
    rgba(255, 158, 196, 0.5));
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(70px);
}

.phase-rainbow.active {
  animation: rainbowBurst 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.phase-chromatic {
  position: fixed;
  inset: 0;
  z-index: 101;
  pointer-events: none;
  opacity: 0;
}

.phase-chromatic.active {
  animation: chromaticAberration 0.6s ease-out forwards;
}

.phase-chromatic::before,
.phase-chromatic::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 100, 150, 0.0), transparent 40%);
}

.phase-chromatic::before {
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 2px,
    rgba(255, 100, 150, 0.0) 2px,
    rgba(255, 100, 150, 0.0) 4px
  );
  mix-blend-mode: screen;
}

@keyframes flashFade {
  0% { opacity: 0; transform: scale(0.5); }
  15% { opacity: 1; transform: scale(1.0); }
  100% { opacity: 0; transform: scale(1.5); }
}

@keyframes rainbowBurst {
  0% { opacity: 0; transform: scale(0.25) rotate(0deg); }
  25% { opacity: 0.8; transform: scale(1.15) rotate(45deg); }
  100% { opacity: 0; transform: scale(2.2) rotate(180deg); }
}

@keyframes chromaticAberration {
  0% { opacity: 0; }
  15% { opacity: 0.15; }
  100% { opacity: 0; }
}
</style>

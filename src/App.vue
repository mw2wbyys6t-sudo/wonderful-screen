<template>
  <div id="universe">
    <Transition name="phase" mode="out-in" @before-leave="onBeforeLeave" @after-enter="onAfterEnter">
      <LoadingPhase v-if="phase === 'loading'" @done="goTo('landing')" />
      <LandingPhase v-else-if="phase === 'landing'" @start="goTo('galaxy')" />
      <GalaxyPhase v-else-if="phase === 'galaxy'" />
    </Transition>

    <div class="phase-flash" :class="{ active: flashActive }"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingPhase from './components/LoadingPhase.vue';
import LandingPhase from './components/LandingPhase.vue';
import GalaxyPhase from './components/GalaxyPhase.vue';

const phase = ref('loading');
const flashActive = ref(false);

function goTo(next) {
  flashActive.value = true;
  setTimeout(() => {
    phase.value = next;
  }, next === 'galaxy' ? 180 : 320);
  setTimeout(() => {
    flashActive.value = false;
  }, next === 'galaxy' ? 900 : 700);
}

function onBeforeLeave() {
  document.body.classList.add('phase-switching');
}

function onAfterEnter() {
  document.body.classList.remove('phase-switching');
}
</script>

<style>
.phase-enter-active,
.phase-leave-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.phase-enter-from {
  opacity: 0;
  transform: scale(1.04);
}

.phase-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.phase-flash {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background: white;
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.phase-flash.active {
  opacity: 0.85;
  animation: flashFade 0.7s ease-out forwards;
}

@keyframes flashFade {
  0% { opacity: 0; }
  30% { opacity: 0.85; }
  100% { opacity: 0; }
}
</style>

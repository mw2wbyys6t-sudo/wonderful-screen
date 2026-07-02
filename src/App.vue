<template>
  <div id="universe">
    <LoadingPhase v-if="phase === 'loading'" @done="phase = 'showcase'" />
    <ShowcasePhase v-else-if="phase === 'showcase'" @skip="phase = 'entrance'" />
    <EntrancePhase v-else-if="phase === 'entrance'" @start="phase = 'galaxy'" />
    <GalaxyPhase v-else-if="phase === 'galaxy'" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingPhase from './components/LoadingPhase.vue';
import ShowcasePhase from './components/ShowcasePhase.vue';
import EntrancePhase from './components/EntrancePhase.vue';
import GalaxyPhase from './components/GalaxyPhase.vue';

const phase = ref('loading');
</script>

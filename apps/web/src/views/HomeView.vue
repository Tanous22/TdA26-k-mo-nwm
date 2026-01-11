<template>
  <div class="grid md:grid-cols-2 gap-12 items-center min-h-[70vh]">
    <div class="space-y-8 slide-in-left">
      <h1 class="text-6xl md:text-7xl font-extrabold leading-tight">
        Objev svůj <span class="highlight-text">potenciál</span>
      </h1>
      <p class="text-xl text-gray-600 max-w-lg font-semibold">
        Žádná nuda, jen čistá praxe. Učení, které tě bude bavit a posune tě dál.
      </p>
      <div class="flex gap-4">
        <router-link to="/courses" class="organic-btn !bg-[#1A1A1A] !text-white text-xl px-8 py-3">
          Chci studovat
        </router-link>
      </div>
    </div>
    
    <div class="relative">
      <div class="organic-box with-tape p-8 bg-white rotate-2 hover:rotate-0 transition-transform duration-500">
        <div class="bg-gray-100 rounded border-2 border-[#1A1A1A] h-64 flex items-center justify-center overflow-hidden relative">
          <div class="absolute inset-0 bg-[#91F5AD] opacity-20"></div>
          <span class="text-6xl">🚀</span>
        </div>
        <div class="mt-4 flex justify-between items-center">
          <span class="font-bold text-xl">Začni hned teď!</span>
        </div>
        <div class="hand-note" style="background-color: var(--brand-yellow);">Nový semestr!</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
</style>

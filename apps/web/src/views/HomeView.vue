<template>
  <div class="grid md:grid-cols-2 gap-12 items-center min-h-[70vh]">
    <div class="space-y-8 slide-in-left">
      <div class="inline-block px-4 py-2 bg-[#91F5AD]/20 border-2 border-[#91F5AD] rounded-full mb-4">
        <span class="text-sm font-bold text-[#0257A5] uppercase tracking-wide">🚀 Moderní vzdělávání</span>
      </div>
      <h1 class="text-5xl md:text-7xl font-extrabold leading-tight">
        Uč se <span class="highlight-text">jinak</span>,
        <br />uč se <span class="text-[#0070BB]">lépe</span>
      </h1>
      <p class="text-xl text-gray-600 max-w-lg font-semibold leading-relaxed">
        Zapomeň na nudné přednášky. Moderní způsoby učení, které tě skutečně posunou kupředu. Prakticky, zábavně a efektivně.
      </p>
      <div class="flex flex-col sm:flex-row gap-4">
        <router-link
          to="/courses"
          class="organic-btn !bg-[#0070BB] !text-white text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          🎯 Prozkoumat kurzy
        </router-link>
        <a
          href="#jak-to-funguje"
          class="organic-btn secondary text-lg px-8 py-4 !bg-white !text-[#0070BB] !border-[#0070BB]"
        >
          Jak to funguje?
        </a>
      </div>
    </div>
    <div class="relative">
      <div
        class="organic-box with-tape p-8 bg-white rotate-2 hover:rotate-0 transition-transform duration-500"
      >
        <div
          class="bg-gray-100 rounded border-2 border-[#1A1A1A] h-64 flex items-center justify-center overflow-hidden relative"
        >
          <div class="absolute inset-0 bg-[#91F5AD] opacity-20"></div>
        </div>
        <div class="mt-4 flex justify-between items-center">
          <span class="font-bold text-xl">Začni hned teď!</span>
        </div>
        <div class="hand-note" style="background-color: var(--brand-yellow)">
          Novinky!
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped></style>

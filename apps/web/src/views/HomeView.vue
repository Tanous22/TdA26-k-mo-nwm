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
      <div class="flex gap-4">
        <router-link
          to="/courses"
          class="organic-btn !bg-[#0070BB] !text-white text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          🎯 Prozkoumat kurzy
        </router-link>
      </div>
    </div>
    <div class="relative">
      <div
        class="organic-box with-tape p-6 md:p-8 bg-white rotate-2 hover:rotate-0 transition-transform duration-500"
      >
        <h3 class="text-2xl font-extrabold mb-6 text-[#0070BB]">Proč právě my?</h3>
        
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-[#91F5AD] flex items-center justify-center flex-shrink-0">
              <span class="text-xl">⚡</span>
            </div>
            <div>
              <h4 class="font-bold text-lg">Praxe na prvním místě</h4>
              <p class="text-sm text-gray-600">Žádná teorie navíc - jenom to, co opravdu použiješ</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-[#FFD93D] flex items-center justify-center flex-shrink-0">
              <span class="text-xl">🎯</span>
            </div>
            <div>
              <h4 class="font-bold text-lg">Interaktivní kvízy</h4>
              <p class="text-sm text-gray-600">Ověř si znalosti hned - žádné čekání na zkoušku</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-[#0070BB] flex items-center justify-center flex-shrink-0">
              <span class="text-xl">🚀</span>
            </div>
            <div>
              <h4 class="font-bold text-lg">Vlastním tempem</h4>
              <p class="text-sm text-gray-600">Uč se kdy chceš, kde chceš - bez stresu</p>
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-6 border-t-2 border-gray-100">
          <div class="text-center">
            <p class="text-3xl font-extrabold text-[#0070BB]">100% online</p>
            <p class="text-sm text-gray-500 font-semibold mt-1">Vše co potřebuješ, na jednom místě</p>
          </div>
        </div>
        
        <div class="hand-note" style="background-color: #91F5AD">
          Nový přístup!
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped></style>

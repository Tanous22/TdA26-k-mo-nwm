<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import HeaderNav from './components/HeaderNav.vue'
import { useAuth } from './composables/useAuth'

const { initializeFromStorage } = useAuth()

onMounted(() => {
  initializeFromStorage()
})
</script>

<template>
  <div id="app" class="relative min-h-screen flex flex-col">
    <!-- Background Blobs -->
    <div class="blob b1"></div>
    <div class="blob b2"></div>

    <!-- Header -->
    <HeaderNav />

    <!-- Main Content -->
    <main class="flex-grow container mx-auto px-4 py-8 max-w-7xl relative z-10">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="text-center py-8 text-gray-400 font-bold text-sm">
      &copy; 2026 Think Different Academy
    </footer>
  </div>
</template>

<style scoped>
/* Empty - inheriting from global styles */
</style>
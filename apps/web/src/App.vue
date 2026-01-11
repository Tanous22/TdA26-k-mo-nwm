<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import HeaderNav from './components/HeaderNav.vue'

interface User {
  name: string
  role: string
}

const router = useRouter()
const user = ref<User | null>(null)

// Initialize user from localStorage
onMounted(() => {
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    user.value = JSON.parse(savedUser)
  }
})

const handleLogin = (loggedInUser: User) => {
  user.value = loggedInUser
  localStorage.setItem('user', JSON.stringify(loggedInUser))
}

const handleLogout = () => {
  user.value = null
  localStorage.removeItem('user')
  router.push('/')
}
</script>

<template>
  <div id="app" class="relative min-h-screen flex flex-col">
    <!-- Pozadí Blobby -->
    <div class="blob b1"></div>
    <div class="blob b2"></div>

    <!-- HEADER -->
    <HeaderNav :user="user" @logout="handleLogout" />

    <!-- MAIN CONTENT -->
    <main class="flex-grow container mx-auto px-4 py-8 max-w-7xl relative z-10">
      <RouterView @login="handleLogin" />
    </main>

    <footer class="text-center py-8 text-gray-400 font-bold text-sm">
      &copy; 2026 Think Different Academy
    </footer>
  </div>
</template>

<style scoped>
</style>


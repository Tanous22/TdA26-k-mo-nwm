<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans py-12">
    <div class="max-w-7xl mx-auto w-full px-4 md:px-6">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <router-link
            to="/dashboard"
            class="inline-flex items-center gap-2 text-[#0070BB] hover:text-[#0257A5] font-bold mb-6"
          >
            <span>←</span> Zpět na dashboard
          </router-link>
          <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">📦 Archiv kurzů</h1>
          <p class="text-lg text-gray-600">Zde najdeš smazané a ukončené kurzy.</p>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-400 font-bold text-xl">
        Načítám archiv...
      </div>
      <div v-else-if="archivedCourses.length === 0" class="text-center py-12 text-gray-400 font-bold text-xl">
        Archiv je prázdný. Žádné smazané ani ukončené kurzy.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in archivedCourses"
          :key="course.uuid"
          class="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-80 grayscale hover:grayscale-0 hover:opacity-100 transition-all flex flex-col h-full"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-800 line-clamp-1">{{ course.name }}</h3>
            <span class="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold">
              {{ course.category }}
            </span>
          </div>
          <p class="text-sm text-gray-600 mb-6 line-clamp-2 flex-grow">{{ course.description }}</p>
          
          <div class="text-xs text-gray-500 font-semibold mb-4 border-t border-gray-100 pt-4 flex flex-col gap-1">
            <span v-if="course.deletedAt" class="text-red-500">Smazáno: {{ formatDateTime(course.deletedAt) }}</span>
            <span v-else class="text-orange-500">Ukončeno: {{ formatDateTime(course.endsAt) }}</span>
          </div>
          
          <button
            @click="restoreCourse(course.uuid)"
            class="w-full organic-btn !bg-gray-200 !text-gray-700 hover:!bg-[#91F5AD] hover:!text-[#1A1A1A] transition-colors text-sm py-2"
          >
            Obnovit kurz
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotifications } from '../composables/useNotifications'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const { success, error: showError } = useNotifications()

interface ArchivedCourse {
  uuid: string
  name: string
  description: string
  category: string
  difficulty: string
  deletedAt: string | null
  endsAt: string | null
}

const archivedCourses = ref<ArchivedCourse[]>([])
const loading = ref(true)

const fetchArchivedCourses = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_URL}/courses/archived/all`)
    if (!response.ok) throw new Error('Nepodařilo se načíst archivované kurzy')
    archivedCourses.value = await response.json()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba serveru')
  } finally {
    loading.value = false
  }
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return 'Neznámé datum'
  return new Date(dateStr).toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const restoreCourse = async (uuid: string) => {
  try {
    const response = await fetch(`${API_URL}/courses/${uuid}/restore`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Nepodařilo se obnovit kurz')
    success('Kurz byl úspěšně obnoven!')
    await fetchArchivedCourses()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Kurz nelze obnovit')
  }
}

onMounted(() => {
  fetchArchivedCourses()
})
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
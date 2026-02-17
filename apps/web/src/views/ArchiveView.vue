<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans py-12">
    <div class="max-w-7xl mx-auto w-full px-4 md:px-6">
      <div class="mb-8">
        <router-link
          to="/courses"
          class="inline-flex items-center gap-2 text-[#0070BB] hover:text-[#0257A5] font-bold mb-6"
        >
          <span>←</span> Zpět
        </router-link>
        <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">📦 Archiv Kvízů</h1>
        <p class="text-lg text-gray-600">Vyřešené a ukončené kvízy</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <!-- Filter by Course -->
        <div class="mb-6">
          <label class="block text-sm font-bold text-gray-700 mb-2">Filtrovat podle kurzu</label>
          <select
            v-model="selectedCourseId"
            class="organic-input w-full md:w-64"
          >
            <option value="">Všechny kurzy</option>
            <option v-for="course in courses" :key="course.uuid" :value="course.uuid">
              {{ course.name }}
            </option>
          </select>
        </div>

        <!-- Archived Quizzes List -->
        <div v-if="loading" class="text-center py-12 text-gray-400">
          Načítám archivované kvízy...
        </div>
        <div v-else-if="filteredArchivedQuizzes.length === 0" class="text-center py-12 text-gray-400">
          Zatím žádné archivované kvízy
        </div>
        <div v-else class="space-y-6">
          <div
            v-for="quiz in filteredArchivedQuizzes"
            :key="quiz.uuid"
            class="p-6 border-2 border-gray-200 rounded-xl hover:border-[#91F5AD] hover:bg-green-50/20 transition-all cursor-pointer"
            @click="openQuiz(quiz)"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-800 mb-2">{{ quiz.title }}</h3>
                <div class="space-y-1 text-sm text-gray-600">
                  <p v-if="getCourseName(quiz.courseId)">
                    <span class="font-semibold">Kurz:</span> {{ getCourseName(quiz.courseId) }}
                  </p>
                  <p v-if="quiz.startedAt">
                    <span class="font-semibold">Zahájeno:</span> {{ formatDateTime(quiz.startedAt) }}
                  </p>
                  <p v-if="quiz.durationMinutes">
                    <span class="font-semibold">Doba trvání:</span> {{ quiz.durationMinutes }} minut
                  </p>
                  <p>
                    <span class="font-semibold">Počet pokusů:</span> {{ quiz.attemptsCount || 0 }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-sm">
                  📦 ARCHIV
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useNotifications } from '../composables/useNotifications'

const router = useRouter()
const { API_URL } = useApi()
const { error: showError } = useNotifications()

interface Course {
  uuid: string
  name: string
  description: string
}

interface Quiz {
  uuid: string
  courseId: string
  title: string
  startedAt?: string
  durationMinutes?: number
  attemptsCount: number
  status: 'ARCHIVED' | 'ACTIVE'
  questions?: any[]
}

const courses = ref<Course[]>([])
const archivedQuizzes = ref<Quiz[]>([])
const selectedCourseId = ref('')
const loading = ref(true)

const filteredArchivedQuizzes = computed(() => {
  return archivedQuizzes.value.filter(quiz => {
    if (selectedCourseId.value === '') {
      return true
    }
    return quiz.courseId === selectedCourseId.value
  })
})

const fetchCourses = async () => {
  try {
    const response = await fetch(`${API_URL}/courses`)
    if (!response.ok) throw new Error('Failed to fetch courses')
    const data = await response.json()
    courses.value = data.map((course: any) => ({
      uuid: course.uuid,
      name: course.name,
      description: course.description,
    }))
  } catch (err) {
    console.error('Error fetching courses:', err)
  }
}

const fetchArchivedQuizzes = async () => {
  try {
    loading.value = true
    const allArchivedQuizzes: Quiz[] = []

    // Fetch archived quizzes from all courses
    for (const course of courses.value) {
      try {
        const response = await fetch(`${API_URL}/courses/${course.uuid}/quizzes`)
        if (response.ok) {
          const quizzes = await response.json()
          // Only collect ARCHIVED quizzes (not deleted, not active)
          const archivedInCourse = quizzes.filter((q: any) => q.status === 'ARCHIVED')
          allArchivedQuizzes.push(
            ...archivedInCourse.map((q: any) => ({
              ...q,
              courseId: course.uuid,
            }))
          )
        }
      } catch (err) {
        console.error(`Error fetching quizzes for course ${course.uuid}:`, err)
      }
    }

    archivedQuizzes.value = allArchivedQuizzes
  } catch (err) {
    showError(
      err instanceof Error ? err.message : 'Nepodařilo se načíst archivované kvízy'
    )
  } finally {
    loading.value = false
  }
}

const getCourseName = (courseId: string): string => {
  const course = courses.value.find(c => c.uuid === courseId)
  return course?.name || 'Neznámý kurz'
}

const formatDateTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('cs-CZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

const openQuiz = (quiz: Quiz) => {
  // Navigate to course detail view and show quiz details
  router.push({
    name: 'course-detail',
    params: { courseId: quiz.courseId },
    query: { viewQuiz: quiz.uuid },
  })
}

onMounted(async () => {
  await fetchCourses()
  await fetchArchivedQuizzes()
})
</script>

<style scoped></style>

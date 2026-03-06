<template>
  <div>
    <div class="flex flex-col md:flex-row gap-8 mb-12">
      <aside class="md:w-1/4 space-y-8 sticky top-24 h-fit">
        <div>
          <input
            v-model="searchQuery"
            type="text"
            class="organic-input"
            placeholder="Co hledáš?"
          />
        </div>
        <div>
          <h3 class="text-2xl font-bold text-[#0257A5] mb-4 uppercase -rotate-2">
            Kategorie
          </h3>
          <div class="space-y-2">
            <div
              v-for="cat in categories"
              :key="cat"
              @click="activeCategory = cat"
              class="cursor-pointer px-4 py-2 font-bold transition-all border-2 border-transparent hover:border-[#91F5AD] rounded-r-full"
              :class="{
                'bg-[#91F5AD]/30 text-[#0257A5] translate-x-2': activeCategory === cat,
              }"
            >
              {{ cat }}
            </div>
          </div>
        </div>
      </aside>
      <div class="md:w-3/4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12">
        <div v-if="loading" class="col-span-full text-center text-gray-500 font-bold">
          Načítání kurzů...
        </div>
        <div
          v-else-if="filteredCourses.length === 0"
          class="col-span-full text-center text-gray-500 font-bold py-12"
        >
          Zatím žádné kurzy
        </div>
        <CourseCard
          v-for="(course, index) in filteredCourses"
          v-else
          :key="course.uuid"
          :course="course"
          :index="index"
          @view-course="viewCourse"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CourseCard from '../components/CourseCard.vue'
import { useNotifications } from '../composables/useNotifications'
import { useApi } from '../composables/useApi'

interface Course {
  uuid: string
  name: string
  description: string
  difficulty?: string
  category?: string
  modules: any[]
  publishedAt?: string | null
  isPaused?: boolean
}

const router = useRouter()
const { API_URL } = useApi()
const { error: showError } = useNotifications()
const searchQuery = ref('')
const activeCategory = ref('Všechny')
const categories = ['Všechny', 'Programování', 'Design & Art', 'Marketing', 'Soft Skills']
const courses = ref<Course[]>([])
const loading = ref(true)

const filteredCourses = computed(() => {
  return courses.value.filter((course) => {
    const matchesSearch = course.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
    const category = course.category || 'Programování'
    const matchesCategory = activeCategory.value === 'Všechny' || category === activeCategory.value
    return matchesSearch && matchesCategory
  })
})

const fetchCourses = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_URL}/courses`)
    if (!response.ok) throw new Error('Failed to fetch courses')
    const data = await response.json()
    
    courses.value = data.map((course: any, index: number) => ({
      uuid: course.uuid,
      name: course.name,
      description: course.description,
      difficulty: course.difficulty || ['Jednoduchý', 'Střední', 'Těžký', 'Extrém'][index % 4],
      category: course.category || categories[1 + (index % 4)],
      materials: course.materials || [],
      quizzes: course.quizzes || [],
      publishedAt: course.publishedAt,
      isPaused: Boolean(course.isPaused)
    }))
  } catch (err) {
    showError(
      err instanceof Error ? err.message : 'Nepodařilo se načíst kurzy'
    )
  } finally {
    loading.value = false
  }
}

const viewCourse = (course: Course) => {
  router.push({
    name: 'course-detail',
    params: { courseId: course.uuid },
  })
}

onMounted(() => {
  fetchCourses()
})
</script>
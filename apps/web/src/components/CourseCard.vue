<template>
  <article
    class="organic-box with-tape course-card-anim p-4 flex flex-col h-full bg-white relative cursor-pointer"
    :class="{ 
      'tape-right': index % 2 !== 0,
      'grayscale opacity-75 pointer-events-none cursor-not-allowed': isLocked 
    }"
    :style="{ transform: `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})` }"
  >
    <div class="hand-note" :style="{ backgroundColor: difficultyColor }">
      {{ course.difficulty || 'Jednoduchý' }}
    </div>
    <div
      class="h-40 bg-gray-100 border-2 border-[#1A1A1A] rounded mb-4 overflow-hidden relative group"
    >
      <div
        class="absolute inset-0 transition-opacity duration-300 opacity-60 group-hover:opacity-80"
        :style="{
          background: `radial-gradient(circle, ${
            difficultyColor || '#91F5AD'
          } 0%, #ffffff 90%)`,
        }"
      ></div>
      
      <div v-if="isPaused" class="absolute inset-0 flex items-center justify-center bg-gray-200/50 z-10">
        <span class="text-xl font-bold text-gray-600 bg-white/80 px-4 py-2 rounded border-2 border-gray-400 rotate-3">
          Pozastaveno
        </span>
      </div>
      
      <div v-else-if="isScheduled" class="absolute inset-0 flex items-center justify-center bg-blue-200/50 z-10">
        <span class="text-xl font-bold text-blue-600 bg-white/80 px-4 py-2 rounded border-2 border-blue-400 -rotate-3">
          Naplánováno
        </span>
      </div>
    </div>
    <h3 class="text-2xl font-bold mb-2 leading-tight">{{ course.name }}</h3>
    <p class="text-gray-600 mb-6 flex-grow leading-snug text-sm">
      {{ course.description }}
    </p>
    <button
      class="organic-btn w-full mt-auto text-sm"
      :class="{ '!bg-gray-300 !text-gray-500 !border-gray-400': isLocked }"
      @click.stop="$emit('view-course', course)"
      :disabled="isLocked"
    >
      {{ buttonText }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDifficultyColor, type Course } from '../composables/useModels'

const props = defineProps<{
  course: Course & { publishedAt?: string | null, isPaused?: boolean }
  index: number
}>()

defineEmits<{
  'view-course': [course: Course]
}>()

const difficultyColor = computed(() =>
  getDifficultyColor(props.course.difficulty || 'Jednoduchý')
)

// Zjištění stavů
const isPaused = computed(() => props.course.isPaused === true)

const isScheduled = computed(() => {
  if (!props.course.publishedAt) return false;
  return new Date(props.course.publishedAt) > new Date();
})

// Pokud je kurz pozastavený nebo v budoucnu, karta je zamčená
const isLocked = computed(() => isPaused.value || isScheduled.value)

// Text na tlačítku podle stavu
const buttonText = computed(() => {
  if (isPaused.value) return 'Kurz je pozastaven'
  if (isScheduled.value) return 'Zatím nezveřejněno'
  return 'Zobrazit kurz'
})
</script>

<style scoped>
</style>
<template>
  <article
    class="organic-box with-tape course-card-anim p-4 flex flex-col h-full bg-white relative cursor-pointer"
    :class="{ 
      'tape-right': index % 2 !== 0,
      'grayscale opacity-75 pointer-events-none cursor-not-allowed': isPaused 
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
    </div>
    <h3 class="text-2xl font-bold mb-2 leading-tight">{{ course.name }}</h3>
    <p class="text-gray-600 mb-6 flex-grow leading-snug text-sm">
      {{ course.description }}
    </p>
    <button
      class="organic-btn w-full mt-auto text-sm"
      :class="{ '!bg-gray-300 !text-gray-500 !border-gray-400': isPaused }"
      @click.stop="$emit('view-course', course)"
      :disabled="isPaused"
    >
      {{ isPaused ? 'Kurz je pozastaven' : 'Zobrazit kurz' }}
    </button>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { getDifficultyColor, type Course } from '../composables/useModels'

// Rozšíření rozhraní Course o publishedAt, pokud tam není
// Poznámka: useModels může mít definici Course, ale zde ji definujeme lokálně pro jistotu nebo spoléháme na import
// Pro jistotu zde přetypujeme prop, pokud importovaná Course nemá publishedAt

const props = defineProps<{
  course: Course & { publishedAt?: string | null }
  index: number
}>()

defineEmits<{
  'view-course': [course: Course]
}>()

const difficultyColor = computed(() =>
  getDifficultyColor(props.course.difficulty || 'Jednoduchý')
)

const isPaused = computed(() => !props.course.publishedAt)
</script>
<style scoped>
</style>

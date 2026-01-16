<template>
  <article
    class="organic-box with-tape course-card-anim p-4 flex flex-col h-full bg-white relative cursor-pointer"
    :class="{ 'tape-right': index % 2 !== 0 }"
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
    </div>

    <h3 class="text-2xl font-bold mb-2 leading-tight">{{ course.name }}</h3>
    <p class="text-gray-600 mb-6 flex-grow leading-snug text-sm">
      {{ course.description }}
    </p>

    <button
      class="organic-btn w-full mt-auto text-sm"
      @click="$emit('view-course', course)"
    >
      Zobrazit kurz
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDifficultyColor, type Course } from '../composables/useModels'

const props = defineProps<{
  course: Course
  index: number
}>()

defineEmits<{
  'view-course': [course: Course]
}>()

const difficultyColor = computed(() =>
  getDifficultyColor(props.course.difficulty || 'Jednoduchý')
)
</script>

<style scoped>
/* Empty - inheriting from parent styles */</style>
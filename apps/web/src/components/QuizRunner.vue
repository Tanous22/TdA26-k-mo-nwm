<template>
  <div class="space-y-6 relative">
    <!-- Pause Overlay -->
    <div
      v-if="isPaused"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl p-12 text-center max-w-md shadow-2xl organic-box animate-bounce-in">
        <div class="text-6xl mb-6">⏸️</div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Kvíz je pozastavený</h2>
        <p class="text-gray-600 text-lg mb-6">
          Lektor pozastavil kvíz. Prosím čekejte na pokyn k pokračování.
        </p>
        <button
          @click="acknowledgesPause"
          class="organic-btn px-8 py-3 w-full"
        >
          Rozumím
        </button>
      </div>
    </div>

    <!-- Time Warning -->
    <div
      v-if="!submitted && timeRemaining !== null && timeRemaining < 300"
      class="sticky top-0 z-40 bg-orange-50 border-2 border-orange-300 rounded-lg p-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">⏱️</span>
        <div>
          <p class="font-bold text-orange-700">Čas se končí!</p>
          <p class="text-sm text-orange-600">Zbývá: {{ formatTime(timeRemaining) }}</p>
        </div>
      </div>
      <button
        @click="submitQuiz"
        class="organic-btn !bg-orange-500 !text-white hover:!bg-orange-600 px-6 py-2 text-sm"
      >
        Odeslat nyní
      </button>
    </div>

    <div class="text-center mb-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ quiz.title }}</h3>
      <div class="flex items-center justify-center gap-4 text-gray-500 text-sm">
        <span>{{ quiz.questions.length }} otázek • Vyplněno {{ quiz.attemptsCount || 0 }}×</span>
        <span v-if="timeRemaining !== null" class="font-bold text-[#0070BB]">
          Zbývá: {{ formatTime(timeRemaining) }}
        </span>
      </div>
    </div>

    <div v-if="!submitted" class="space-y-8" :class="{ 'opacity-50 pointer-events-none': isPaused }">
      <div
        v-for="(question, qIndex) in quiz.questions"
        :key="question.uuid"
        class="bg-gray-50 p-6 rounded-xl border-2 border-gray-200"
      >
        <h4 class="text-lg font-bold text-gray-800 mb-4 flex gap-2">
          <span class="text-[#0070BB]">{{ qIndex + 1 }}.</span>
          {{ question.text }}
          <span v-if="question.type === 'multiple'" class="text-xs text-gray-400 font-normal self-center ml-auto">
            (Více odpovědí)
          </span>
        </h4>
        <div class="space-y-3">
          <div
            v-for="(option, oIndex) in question.options"
            :key="oIndex"
            @click="toggleAnswer(question.uuid, oIndex, question.type)"
            class="p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 relative"
            :class="[
              isSelected(question.uuid, oIndex)
                ? 'bg-[#0070BB] border-[#0070BB] text-white shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
            ]"
            :style="{ opacity: isPaused ? 0.5 : 1 }"
          >
            <div
              class="w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="[
                question.type === 'single' ? 'rounded-full' : 'rounded-md',
                isSelected(question.uuid, oIndex) ? 'border-white bg-white/20' : 'border-gray-300'
              ]"
            >
              <span v-if="isSelected(question.uuid, oIndex)" class="text-white font-bold text-sm">✓</span>
            </div>
            <span class="font-medium">{{ option.text }}</span>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-4 pt-4 border-t border-gray-100">
        <button
          @click="$emit('cancel')"
          :disabled="isPaused"
          class="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zrušit
        </button>
        <button
          @click="submitQuiz"
          :disabled="isPaused"
          class="organic-btn !bg-[#0070BB] !text-white !border-none hover:bg-[#005a96] px-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Vyhodnotit
        </button>
      </div>
    </div>
    <div v-else class="text-center animate-bounce-in">
      <div class="mb-8 p-8 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl text-white shadow-lg organic-box !border-none">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-3xl font-bold mb-2">Hotovo!</h3>
        <p class="text-xl opacity-90">
          Dosáhli jste <strong>{{ score }}/{{ result?.maxScore || quiz.questions.length }}</strong> bodů
        </p>
        <p class="text-lg opacity-85 mt-2">
          <strong>{{ Math.round((score / (result?.maxScore || quiz.questions.length)) * 100) }}%</strong>
        </p>
      </div>
      <button
        @click="$emit('close')"
        class="organic-btn secondary px-8"
      >
        Zavřít
      </button>
    </div>
  </div>
</template>
<script lang="ts">
export interface Option {
  text: string
  isCorrect?: boolean
}
export interface Question {
  uuid: string
  text: string
  type: 'single' | 'multiple'
  options: Option[]
}
export interface Quiz {
  id?: string
  uuid?: string
  title: string
  questions: Question[]
  attempts?: number
  attemptsCount?: number
  isPaused?: boolean
  startedAt?: string | null
  durationMinutes?: number | null
}
</script>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '../composables/useNotifications'
import { useApi } from '../composables/useApi'

const props = defineProps<{
  quiz: Quiz
  courseId: string
}>()

const emit = defineEmits<{
  close: []
  cancel: []
}>()

const { success, error: showError } = useNotifications()
const { API_URL } = useApi()

const answers = ref<Record<string, number[]>>({})
const submitted = ref(false)
const result = ref<{ score: number; maxScore: number } | null>(null)
const timeRemaining = ref<number | null>(null)
const isPaused = ref(false)
const pauseAcknowledged = ref(false)
let pollInterval: any = null
let timerInterval: any = null

const isSelected = (qId: string, oIndex: number) =>
  answers.value[qId]?.includes(oIndex) ?? false

const toggleAnswer = (qId: string, oIndex: number, type: 'single' | 'multiple') => {
  if (submitted.value || isPaused.value) return
  if (!answers.value[qId]) {
    answers.value[qId] = []
  }
  if (type === 'single') {
    answers.value[qId] = [oIndex]
  } else {
    const idx = answers.value[qId].indexOf(oIndex)
    if (idx > -1) {
      answers.value[qId].splice(idx, 1)
    } else {
      answers.value[qId].push(oIndex)
    }
  }
}

const score = computed(() => result.value?.score ?? 0)

const formatTime = (seconds: number | null): string => {
  if (seconds === null) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const acknowledgesPause = () => {
  pauseAcknowledged.value = true
}

/**
 * Polls the quiz status to check if it's been paused or if time has run out
 */
const pollQuizStatus = async () => {
  if (submitted.value) return
  
  try {
    const quizId = props.quiz.uuid || props.quiz.id
    const response = await fetch(
      `${API_URL}/courses/${props.courseId}/quizzes/${quizId}`
    )
    if (response.ok) {
      const quizData = await response.json()
      
      // Check pause status
      const wasPaused = isPaused.value
      isPaused.value = quizData.isPaused || false
      pauseAcknowledged.value = false
      
      // If just paused, show overlay
      if (isPaused.value && !wasPaused) {
        pauseAcknowledged.value = false
      }
    }
  } catch (err) {
    console.error('Error polling quiz status:', err)
  }
}

/**
 * Calculates and updates time remaining
 */
const updateTimeRemaining = () => {
  if (!props.quiz.startedAt || !props.quiz.durationMinutes) {
    timeRemaining.value = null
    return
  }

  const startTime = new Date(props.quiz.startedAt).getTime()
  const now = new Date().getTime()
  const elapsedSeconds = Math.floor((now - startTime) / 1000)
  const totalSeconds = props.quiz.durationMinutes * 60
  const remaining = totalSeconds - elapsedSeconds

  if (remaining <= 0) {
    timeRemaining.value = 0
    // Auto-submit when time runs out
    if (!submitted.value) {
      submitQuiz()
    }
  } else {
    timeRemaining.value = remaining
  }
}

const submitQuiz = async () => {
  try {
    const payload = {
      answers: props.quiz.questions
        .map((q) => {
          const userAns = answers.value[q.uuid]
          if (!userAns || userAns.length === 0) return null
          if (q.type === 'single') {
            return {
              uuid: q.uuid,
              selectedIndex: userAns[0],
            }
          } else {
            return {
              uuid: q.uuid,
              selectedIndices: userAns,
            }
          }
        })
        .filter((a) => a !== null),
    }
    const quizId = props.quiz.uuid || props.quiz.id
    const response = await fetch(
      `${API_URL}/courses/${props.courseId}/quizzes/${quizId}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!response.ok) throw new Error('Failed to submit quiz')
    const data = await response.json()
    result.value = {
      score: data.score,
      maxScore: data.maxScore,
    }
    submitted.value = true
    success('Kvíz byl vyhodnocen!')
  } catch (err) {
    showError(
      err instanceof Error ? err.message : 'Chyba při odesílání kvízu'
    )
  }
}

onMounted(() => {
  // Initial status check
  updateTimeRemaining()
  pollQuizStatus()

  // Set up polling for quiz status (every 2 seconds)
  pollInterval = setInterval(pollQuizStatus, 2000)

  // Set up timer for countdown (every second)
  timerInterval = setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (timerInterval) clearInterval(timerInterval)
})
</script>
<style scoped>
</style>

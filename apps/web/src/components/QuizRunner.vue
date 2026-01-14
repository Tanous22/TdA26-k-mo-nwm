<template>
  <div class="space-y-6">
    <div class="text-center mb-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ quiz.title }}</h3>
      <p class="text-gray-500 text-sm">
        {{ quiz.questions.length }} otázek • Vyplněno {{ quiz.attempts || 0 }}×
      </p>
    </div>

    <div v-if="!submitted" class="space-y-8">
      <div
        v-for="(question, qIndex) in quiz.questions"
        :key="question.id"
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
            :key="option.id"
            @click="toggleAnswer(question.id, oIndex, question.type)"
            class="p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 relative"
            :class="[
              isSelected(question.id, oIndex)
                ? 'bg-[#0070BB] border-[#0070BB] text-white shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
            ]"
          >
            <div
              class="w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="[
                question.type === 'single' ? 'rounded-full' : 'rounded-md',
                isSelected(question.id, oIndex) ? 'border-white bg-white/20' : 'border-gray-300'
              ]"
            >
              <span v-if="isSelected(question.id, oIndex)" class="text-white font-bold text-sm">✓</span>
            </div>
            
            <span class="font-medium">{{ option.text }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-4 pt-4 border-t border-gray-100">
        <button
          @click="$emit('cancel')"
          class="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Zrušit
        </button>
        <button
          @click="submitQuiz"
          class="organic-btn !bg-[#0070BB] !text-white !border-none hover:bg-[#005a96] px-8"
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
          Dosáhli jste <strong>{{ score }}</strong> z {{ quiz.questions.length }} bodů
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
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  options: Option[];
}

export interface Quiz {
  title: string;
  questions: Question[];
  attempts?: number;
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  quiz: Quiz;
}>();

const emit = defineEmits(['close', 'cancel']);

const answers = ref<Record<string, number[]>>({});
const submitted = ref(false);

const isSelected = (qId: string, oIndex: number) => {
  return answers.value[qId]?.includes(oIndex);
};

const toggleAnswer = (qId: string, oIndex: number, type: 'single' | 'multiple') => {
  if (submitted.value) return;

  if (!answers.value[qId]) {
    answers.value[qId] = [];
  }

  if (type === 'single') {
    answers.value[qId] = [oIndex];
  } else {
    const idx = answers.value[qId].indexOf(oIndex);
    if (idx > -1) {
      answers.value[qId].splice(idx, 1);
    } else {
      answers.value[qId].push(oIndex);
    }
  }
};

const score = computed(() => {
  let points = 0;
  props.quiz.questions.forEach((q) => {
    const userAns = answers.value[q.id] || [];
    
    const correctIndices = q.options
      .map((opt, idx) => opt.isCorrect ? idx : -1)
      .filter((idx) => idx !== -1);

    if (
      userAns.length === correctIndices.length &&
      userAns.every((idx) => correctIndices.includes(idx))
    ) {
      points++;
    }
  });
  return points;
});

const submitQuiz = () => {
  submitted.value = true;
};
</script>

<style scoped>
/* Scoped styles if needed */
</style>
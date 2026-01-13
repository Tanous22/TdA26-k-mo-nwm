<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div
        class="organic-box bg-white p-8 max-w-2xl w-full relative animate-bounce-in max-h-[90vh] overflow-y-auto"
      >
        <button
          @click="close"
          class="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl"
        >
          &times;
        </button>

        <h2 class="text-2xl font-extrabold mb-6 text-[#0070BB]">
          Vytvořit nový kvíz
        </h2>

        <form @submit.prevent="saveQuiz" class="space-y-6">
          <!-- Quiz Title -->
          <div>
            <label class="block font-bold mb-1 text-sm">Název kvízu</label>
            <input
              v-model="quizData.title"
              required
              type="text"
              class="organic-input w-full"
              placeholder="Např. Test z CSS Grid"
            />
          </div>

          <!-- Questions List -->
          <div class="space-y-6">
            <div
              v-for="(question, qIndex) in quizData.questions"
              :key="question.id"
              class="border-l-4 border-[#0070BB] pl-4 py-2 bg-gray-50 rounded-r-lg relative"
            >
              <button
                type="button"
                @click="removeQuestion(qIndex)"
                class="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold"
                title="Odstranit otázku"
              >
                &times;
              </button>

              <div class="mb-3">
                <label class="block font-bold mb-1 text-sm"
                  >Otázka {{ qIndex + 1 }}</label
                >
                <input
                  v-model="question.text"
                  required
                  type="text"
                  class="organic-input w-full !py-2"
                  placeholder="Znění otázky..."
                />
              </div>

              <!-- Question Type Selection -->
              <div class="mb-3">
                <span class="block text-sm font-semibold text-gray-600 mb-2">Typ otázky:</span>
                <div class="grid grid-cols-2 gap-4">
                  <label
                    class="cursor-pointer border-2 rounded-lg p-3 flex items-center gap-3 transition-all relative overflow-hidden"
                    :class="[
                      question.type === 'single'
                        ? 'border-[#0070BB] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    ]"
                    style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; box-shadow: 2px 3px 0px rgba(0,0,0,0.1);"
                  >
                    <input
                      type="radio"
                      v-model="question.type"
                      value="single"
                      class="hidden"
                    />
                    <div class="w-8 h-8 rounded-full bg-white border-2 border-[#0070BB] flex items-center justify-center text-[#0070BB] font-bold z-10 relative">
                      1
                    </div>
                    <div class="z-10 relative">
                      <span class="block font-bold text-sm text-gray-800">Jedna odpověď</span>
                      <span class="block text-xs text-gray-500">Uživatel vybere pouze jednu</span>
                    </div>
                  </label>

                  <label
                    class="cursor-pointer border-2 rounded-lg p-3 flex items-center gap-3 transition-all relative overflow-hidden"
                    :class="[
                      question.type === 'multiple'
                        ? 'border-[#0070BB] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    ]"
                    style="border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px; box-shadow: 2px 3px 0px rgba(0,0,0,0.1);"
                  >
                    <input
                      type="radio"
                      v-model="question.type"
                      value="multiple"
                      class="hidden"
                    />
                    <div class="w-8 h-8 rounded-full bg-white border-2 border-[#0070BB] flex items-center justify-center text-[#0070BB] font-bold z-10 relative">
                      N
                    </div>
                    <div class="z-10 relative">
                      <span class="block font-bold text-sm text-gray-800">Více odpovědí</span>
                      <span class="block text-xs text-gray-500">Uživatel může vybrat více</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Options -->
              <div class="space-y-2 pl-2">
                <label class="block text-xs font-bold text-gray-500 uppercase"
                  >Možnosti (označte správné)</label
                >
                <div
                  v-for="(option, oIndex) in question.options"
                  :key="option.id"
                  class="flex items-center gap-3"
                >
                  <!-- Correct Toggle -->
                  <div class="flex-shrink-0" v-if="question.type === 'single'">
                    <input
                      type="radio"
                      :name="'correct-' + qIndex"
                      :checked="option.isCorrect"
                      @change="setCorrectOption(qIndex, oIndex)"
                      class="w-5 h-5 accent-green-500 cursor-pointer"
                    />
                  </div>
                  <div class="flex-shrink-0" v-else>
                    <input
                      type="checkbox"
                      v-model="option.isCorrect"
                      class="w-5 h-5 accent-green-500 cursor-pointer rounded"
                    />
                  </div>

                  <!-- Option Text -->
                  <input
                    v-model="option.text"
                    required
                    type="text"
                    class="organic-input flex-grow !py-1 !px-2 !text-sm"
                    :placeholder="'Možnost ' + (oIndex + 1)"
                  />

                  <button
                    type="button"
                    @click="removeOption(qIndex, oIndex)"
                    class="text-gray-400 hover:text-red-500 font-bold px-2 text-xl"
                  >
                    &times;
                  </button>
                </div>

                <button
                  type="button"
                  @click="addOption(qIndex)"
                  class="text-sm text-[#0070BB] hover:underline font-bold mt-2 flex items-center gap-1"
                >
                  <span class="text-lg">+</span> Přidat další možnost
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="addQuestion"
            class="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:bg-gray-50 hover:border-[#0070BB] hover:text-[#0070BB] transition-colors flex flex-col items-center gap-1"
          >
            <span class="text-2xl">+</span>
            <span>Přidat další otázku</span>
          </button>

          <!-- Error Message Banner -->
          <div v-if="errorMessage" class="bg-red-50 text-red-600 p-4 rounded-lg font-bold text-sm border border-red-200 flex items-center gap-2 animate-pulse">
            <span>⚠️</span>
            {{ errorMessage }}
          </div>

          <div class="pt-4 border-t border-gray-100">
            <button type="submit" class="organic-btn w-full text-lg py-3">
              Uložit kvíz
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  text: string;
  type: "single" | "multiple";
  options: QuizOption[];
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [quiz: Quiz];
}>();

const errorMessage = ref<string | null>(null);

const quizData = reactive<Quiz>({
  title: "",
  questions: [
    {
      id: crypto.randomUUID(),
      text: "",
      type: "single",
      options: [
        { id: crypto.randomUUID(), text: "", isCorrect: true },
        { id: crypto.randomUUID(), text: "", isCorrect: false },
      ],
    },
  ],
});

// Clear error when user makes changes
watch(() => quizData, () => {
  if (errorMessage.value) errorMessage.value = null;
}, { deep: true });

const addQuestion = () => {
  quizData.questions.push({
    id: crypto.randomUUID(),
    text: "",
    type: "single",
    options: [
      { id: crypto.randomUUID(), text: "", isCorrect: true },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
    ],
  });
};

const removeQuestion = (index: number) => {
  if (quizData.questions.length > 1) {
    quizData.questions.splice(index, 1);
  } else {
    errorMessage.value = "Kvíz musí mít alespoň jednu otázku.";
  }
};

const addOption = (qIndex: number) => {
  const question = quizData.questions[qIndex];
  if (question) {
    question.options.push({
      id: crypto.randomUUID(),
      text: "",
      isCorrect: false,
    });
  }
};

const removeOption = (qIndex: number, oIndex: number) => {
  const question = quizData.questions[qIndex];
  if (question && question.options.length > 2) {
    question.options.splice(oIndex, 1);
  } else {
    errorMessage.value = "Otázka musí mít alespoň dvě možnosti.";
  }
};

const setCorrectOption = (qIndex: number, oIndex: number) => {
  const question = quizData.questions[qIndex];
  if (question && question.type === 'single') {
    // For single choice, uncheck others and check this one
    question.options.forEach((opt, idx) => {
      opt.isCorrect = idx === oIndex;
    });
  }
};

const close = () => {
  emit("close");
  errorMessage.value = null;
};

const validateQuiz = (): boolean => {
  if (!quizData.title.trim()) {
    errorMessage.value = "Prosím vyplňte název kvízu.";
    return false;
  }
  for (let i = 0; i < quizData.questions.length; i++) {
    const q = quizData.questions[i];
    if (!q) continue; // Should not happen, but satisfies TS

    if (!q.text.trim()) {
      errorMessage.value = `Otázka č. ${i + 1} nemá vyplněný text.`;
      return false;
    }
    const hasCorrect = q.options.some(o => o.isCorrect);
    if (!hasCorrect) {
      errorMessage.value = `Otázka č. ${i + 1} nemá označenou správnou odpověď.`;
      return false;
    }
    // Check for empty options
    const emptyOptions = q.options.some(o => !o.text.trim());
    if (emptyOptions) {
      errorMessage.value = `U otázky č. ${i + 1} máte nevyplněné možnosti.`;
      return false;
    }
  }
  return true;
};

const saveQuiz = () => {
  if (!validateQuiz()) return;

  // Deep copy to avoid reference issues
  emit("save", JSON.parse(JSON.stringify(quizData)));
  
  // Reset
  quizData.title = "";
  quizData.questions = [
    {
      id: crypto.randomUUID(),
      text: "",
      type: "single",
      options: [
        { id: crypto.randomUUID(), text: "", isCorrect: true },
        { id: crypto.randomUUID(), text: "", isCorrect: false },
      ],
    },
  ];
  errorMessage.value = null;
};
</script>

<style scoped>
/* No extra styles needed, using utility classes */
</style>

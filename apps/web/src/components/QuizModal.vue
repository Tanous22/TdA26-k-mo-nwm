<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div
        class="organic-box bg-white p-4 md:p-8 max-w-2xl w-full mx-4 md:mx-0 relative animate-bounce-in max-h-[90vh] overflow-y-auto"
      >
        <button
          @click="close"
          class="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-6xl"
        >
          &times;
        </button>
        <h2 class="text-2xl font-extrabold mb-6 text-[#0070BB]">
          {{ editMode ? 'Upravit kvíz' : 'Vytvořit nový kvíz' }}
        </h2>
        <div class="space-y-6">
          <div>
            <label class="block font-bold mb-1 text-sm">Název kvízu</label>
            <input
              v-model="quizData.title"
              type="text"
              class="organic-input w-full"
              placeholder="Např. Test z CSS Grid"
            />
          </div>

          <!-- Scheduling Section -->
          <div class="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 space-y-4">
            <h3 class="font-bold text-[#0070BB] flex items-center gap-2">
              ⏰ Naplánování
            </h3>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block font-bold mb-1 text-sm">Zveřejnit kvíz od</label>
                <input
                  v-model="quizData.publishedAt"
                  type="datetime-local"
                  class="organic-input w-full"
                />
                <p class="text-xs text-gray-500 mt-1">Kvíz bude viditelný pro studenty od tohoto času</p>
              </div>
              <div>
                <label class="block font-bold mb-1 text-sm">Spustit kvíz v</label>
                <input
                  v-model="quizData.scheduledAt"
                  type="datetime-local"
                  class="organic-input w-full"
                />
                <p class="text-xs text-gray-500 mt-1">Volitelné - pokud chcete automaticky spustit</p>
              </div>
              <div>
                <label class="block font-bold mb-1 text-sm">Doba trvání (minut)</label>
                <input
                  v-model.number="quizData.durationMinutes"
                  type="number"
                  min="1"
                  class="organic-input w-full"
                  placeholder="Např. 30"
                />
              </div>
              <div>
                <label class="block font-bold mb-1 text-sm">Ukončit kvíz v</label>
                <input
                  v-model="quizData.scheduledEnd"
                  type="datetime-local"
                  class="organic-input w-full"
                />
                <p class="text-xs text-gray-500 mt-1">Volitelné - automatické ukončení kvízu v tomto čase</p>
              </div>
            </div>
          </div>

          <!-- Control Section (only for active quizzes) -->
          <div v-if="editMode && quizData.uuid && isActive" class="bg-green-50 p-6 rounded-lg border-2 border-green-200 space-y-4">
            <h3 class="font-bold text-green-700 flex items-center gap-2">
              🎮 Ovládání kvízu
            </h3>
            <div class="flex flex-wrap gap-3">
              <button
                v-if="!quizStarted"
                type="button"
                @click="controlQuiz('start')"
                class="organic-btn !bg-green-500 !text-white hover:!bg-green-600 px-6 py-2"
              >
                ▶️ SPUSTIT NYNÍ
              </button>
              <button
                v-if="quizStarted && !quizPaused"
                type="button"
                @click="controlQuiz('pause')"
                class="organic-btn !bg-yellow-500 !text-white hover:!bg-yellow-600 px-6 py-2"
              >
                ⏸️ POZASTAVIT
              </button>
              <button
                v-if="quizStarted && quizPaused"
                type="button"
                @click="controlQuiz('resume')"
                class="organic-btn !bg-blue-500 !text-white hover:!bg-blue-600 px-6 py-2"
              >
                ▶️ POKRAČOVAT
              </button>
            </div>
            <p v-if="controlError" class="text-red-600 text-sm font-bold">{{ controlError }}</p>
          </div>
          <div class="space-y-6">
            <div
              v-for="(question, qIndex) in quizData.questions"
              :key="question.id"
              class="border-l-4 border-[#0070BB] pl-4 py-2 bg-gray-50 rounded-r-lg relative"
            >
              <button
                type="button"
                @click="removeQuestion(qIndex)"
                class="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold text-xl"
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
                  type="text"
                  class="organic-input w-full !py-2"
                  placeholder="Znění otázky..."
                />
              </div>
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
                    style="border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;"
                  >
                    <input
                      type="radio"
                      :name="'type-' + qIndex"
                      v-model="question.type"
                      value="single"
                      class="hidden"
                      @change="handleTypeChange(qIndex)"
                    />
                    <div class="w-8 h-8 rounded-full bg-white border-2 border-[#0070BB] flex items-center justify-center text-[#0070BB] font-bold z-10 relative">
                      1
                    </div>
                    <div class="z-10 relative">
                      <span class="block font-bold text-sm text-gray-800">Jedna odpověď</span>
                    </div>
                  </label>
                  <label
                    class="cursor-pointer border-2 rounded-lg p-3 flex items-center gap-3 transition-all relative overflow-hidden"
                    :class="[
                      question.type === 'multiple'
                        ? 'border-[#0070BB] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    ]"
                    style="border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;"
                  >
                    <input
                      type="radio"
                      :name="'type-' + qIndex"
                      v-model="question.type"
                      value="multiple"
                      class="hidden"
                      @change="handleTypeChange(qIndex)"
                    />
                    <div class="w-8 h-8 rounded-full bg-white border-2 border-[#0070BB] flex items-center justify-center text-[#0070BB] font-bold z-10 relative">
                      N
                    </div>
                    <div class="z-10 relative">
                      <span class="block font-bold text-sm text-gray-800">Více odpovědí</span>
                    </div>
                  </label>
                </div>
              </div>
              <div class="space-y-2 pl-2">
                <label class="block text-xs font-bold text-gray-500 uppercase"
                  >Možnosti (označte správné)</label
                >
                <div
                  v-for="(option, oIndex) in question.options"
                  :key="option.id"
                  class="flex items-center gap-3"
                >
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
                  <input
                    v-model="option.text"
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
          <div v-if="errorMessage" class="bg-red-50 text-red-600 p-4 rounded-lg font-bold text-sm border border-red-200 flex items-center gap-2 animate-pulse">
            <span>⚠️</span>
            {{ errorMessage }}
          </div>
          <div class="pt-4 border-t border-gray-100">
            <button type="button" @click="saveQuiz" class="organic-btn w-full text-lg py-3">
              {{ editMode ? 'Uložit změny' : 'Vytvořit kvíz' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useApi } from "../composables/useApi";
import { useNotifications } from "../composables/useNotifications";

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
  uuid?: string;
  title: string;
  questions: QuizQuestion[];
  scheduledAt?: string | null;
  scheduledEnd?: string | null;
  durationMinutes?: number | null;
  publishedAt?: string | null;
  isPaused?: boolean;
  startedAt?: string | null;
}
const props = defineProps<{
  show: boolean;
  editMode?: boolean;
  initialData?: any; 
  courseId?: string;
}>();
const emit = defineEmits<{
  close: [];
  save: [quiz: Quiz];
}>();

const { API_URL } = useApi();
const { error: showError, success } = useNotifications();
const errorMessage = ref<string | null>(null);
const controlError = ref<string | null>(null);
const isActive = ref(false);
const quizStarted = ref(false);
const quizPaused = ref(false);

const quizData = ref<Quiz>({
  title: "",
  questions: [],
  scheduledAt: null,
  scheduledEnd: null,
  durationMinutes: null,
});

const resetForm = () => {
  quizData.value = {
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
    scheduledAt: null,
    durationMinutes: null,
    publishedAt: null,
  };
  isActive.value = false;
  quizStarted.value = false;
  quizPaused.value = false;
};

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    errorMessage.value = null;
    controlError.value = null;
    if (props.editMode && props.initialData) {
      try {
        const sourceData = JSON.parse(JSON.stringify(props.initialData));
        const mappedQuestions = (sourceData.questions || []).map((q: any) => {
          const isMultiple = q.type === 'multipleChoice' || q.type === 'multiple';
          const type = isMultiple ? 'multiple' : 'single';
          const options = Array.isArray(q.options) ? q.options.map((opt: any, idx: number) => {
             const text = typeof opt === 'string' ? opt : opt.text || "";
             let isCorrect = false;
             if (type === 'single') {
                isCorrect = q.correctIndex === idx || opt.isCorrect === true;
             } else {
                isCorrect = (q.correctIndices && q.correctIndices.includes(idx)) || opt.isCorrect === true;
             }
             return {
               id: crypto.randomUUID(),
               text: text,
               isCorrect
             };
          }) : [];
          if (options.length === 0) {
             options.push({ id: crypto.randomUUID(), text: "", isCorrect: true });
             options.push({ id: crypto.randomUUID(), text: "", isCorrect: false });
          }
          return {
            id: crypto.randomUUID(),
            uuid: q.uuid,
            text: q.question || q.text || "",
            type: type,
            options: options
          };
        });
        quizData.value = {
          uuid: sourceData.uuid,
          title: sourceData.title || "",
          questions: mappedQuestions,
            scheduledAt: sourceData.scheduledAt || null,
            scheduledEnd: sourceData.scheduledEnd || null,
            durationMinutes: sourceData.durationMinutes || null,
            publishedAt: sourceData.publishedAt || null,
        };

        // Check if quiz is active and can be controlled
        isActive.value = sourceData.status === 'ACTIVE';
        quizStarted.value = !!sourceData.startedAt;
        quizPaused.value = sourceData.isPaused || false;
      } catch (e) {
        console.error("Chyba při parsování kvízu:", e);
        resetForm();
      }
    } else {
      resetForm();
    }
  }
});

const addQuestion = () => {
  quizData.value.questions.push({
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
  if (quizData.value.questions.length > 1) {
    quizData.value.questions.splice(index, 1);
  } else {
    errorMessage.value = "Kvíz musí mít alespoň jednu otázku.";
  }
};

const addOption = (qIndex: number) => {
  const question = quizData.value.questions[qIndex];
  if (question) {
    question.options.push({
      id: crypto.randomUUID(),
      text: "",
      isCorrect: false,
    });
  }
};

const removeOption = (qIndex: number, oIndex: number) => {
  const question = quizData.value.questions[qIndex];
  if (question && question.options.length > 2) {
    question.options.splice(oIndex, 1);
  } else {
    errorMessage.value = "Otázka musí mít alespoň dvě možnosti.";
  }
};

const handleTypeChange = (qIndex: number) => {
  const question = quizData.value.questions[qIndex];
  if (question && question.type === 'single') {
    question.options.forEach((opt, i) => opt.isCorrect = (i === 0));
  }
};

const setCorrectOption = (qIndex: number, oIndex: number) => {
  const question = quizData.value.questions[qIndex];
  if (question && question.type === 'single') {
    question.options.forEach((opt, idx) => {
      opt.isCorrect = idx === oIndex;
    });
  }
};

const close = () => {
  emit("close");
  errorMessage.value = null;
  controlError.value = null;
};

const validateQuiz = (): boolean => {
  if (!quizData.value.title.trim()) {
    errorMessage.value = "Prosím vyplňte název kvízu.";
    return false;
  }
  for (let i = 0; i < quizData.value.questions.length; i++) {
    const q = quizData.value.questions[i];
    if (!q) continue;
    if (!q.text.trim()) {
      errorMessage.value = `Otázka č. ${i + 1} nemá vyplněný text.`;
      return false;
    }
    const hasCorrect = q.options.some(o => o.isCorrect);
    if (!hasCorrect) {
      errorMessage.value = `Otázka č. ${i + 1} nemá označenou správnou odpověď.`;
      return false;
    }
    const emptyOptions = q.options.some(o => !o.text.trim());
    if (emptyOptions) {
      errorMessage.value = `U otázky č. ${i + 1} máte nevyplněné možnosti.`;
      return false;
    }
  }
  return true;
};

const controlQuiz = async (action: string) => {
  if (!quizData.value.uuid || !props.courseId) return;

  try {
    controlError.value = null;
    const response = await fetch(
      `${API_URL}/courses/${props.courseId}/quizzes/${quizData.value.uuid}/control`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }
    );

    if (!response.ok) throw new Error('Nepodařilo se změnit stav kvízu');
    
    await response.json();

    quizStarted.value = action === 'start' || (quizStarted.value && action !== 'start');
    quizPaused.value = action === 'pause' || (quizPaused.value && action === 'pause');
    
    success(`Kvíz: ${action === 'start' ? 'spuštěn' : action === 'pause' ? 'pozastaven' : 'pokračuje'}`);
  } catch (err) {
    controlError.value = err instanceof Error ? err.message : 'Chyba při kontrole kvízu';
    showError(controlError.value);
  }
};

const saveQuiz = () => {
  if (!validateQuiz()) {
      return;
  }
  emit("save", JSON.parse(JSON.stringify(quizData.value)));
  errorMessage.value = null;
};
</script>
<style scoped>
.organic-btn {
  @apply font-bold rounded-lg shadow-sm transition-transform active:scale-95 border-2 border-transparent bg-[#91F5AD] text-[#1A1A1A] hover:bg-[#0070BB] hover:text-white;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
</style>

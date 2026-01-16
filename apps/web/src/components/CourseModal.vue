<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div
        :key="modalKey"
        class="organic-box bg-white p-8 max-w-2xl w-full relative animate-bounce-in max-h-[90vh] overflow-y-auto pointer-events-auto"
      >
        <button
          @click="close"
          class="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-6xl"
        >
          &times;
        </button>

        <h2 class="text-2xl font-extrabold mb-6 text-[#0070BB]">
          {{ isEditing ? "Upravit kurz" : "Vytvořit nový kurz" }}
        </h2>

        <form @submit.prevent="saveCourse" class="space-y-4">
          <div>
            <label class="block font-bold mb-1 text-sm">Název kurzu</label>
            <input
              v-model="formData.name"
              required
              type="text"
              class="organic-input"
              placeholder="Např. Advanced CSS"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold mb-1 text-sm">Kategorie</label>
              <select
                v-model="formData.category"
                class="organic-select bg-white"
              >
                <option v-for="cat in categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1 text-sm">Obtížnost</label>
              <select
                v-model="formData.difficulty"
                class="organic-select bg-white"
              >
                <option value="Začátečník">Začátečník 🟢</option>
                <option value="Pokročilý">Pokročilý 🟡</option>
                <option value="Expert">Expert 🔴</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1 text-sm">Popis</label>
            <textarea
              v-model="formData.description"
              required
              rows="3"
              class="organic-textarea"
              placeholder="O čem kurz bude..."
            ></textarea>
          </div>

          <div class="border-t-2 border-dashed border-gray-200 pt-4 mt-4">
            <label
              class="block font-bold mb-4 text-xl text-[#0257A5] text-center"
              >Správa materiálů</label
            >

            <div class="flex gap-4 mb-6 text-sm font-bold justify-center">
              <button type="button" @click="materialType = 'url'" 
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{'bg-[#E6F4FF] text-[#0070BB] border border-[#0070BB]': materialType === 'url', 'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'url'}">
                <img src="@/assets/icons/link.svg" class="w-5 h-5" alt="Link" /> Odkaz
              </button>
              <button type="button" @click="materialType = 'file'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{'bg-[#E6F4FF] text-[#0070BB] border border-[#0070BB]': materialType === 'file', 'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'file'}">
                <img src="@/assets/icons/file.svg" class="w-5 h-5" alt="File" /> Soubor
              </button>
              <button type="button" @click="materialType = 'quiz'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{'bg-[#FFF5D1] text-[#B8860B] border border-[#FFD93D]': materialType === 'quiz', 'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'quiz'}">
                <img src="@/assets/icons/quiz.svg" class="w-6 h-6" alt="Quiz" /> Kvízy
              </button>
            </div>

            <div v-if="materialType === 'quiz'">
                <h4 class="font-bold text-gray-700 mb-2">Správa Kvízů:</h4>
                <ul class="space-y-2 mb-3">
                   <template v-for="(mat, index) in formData.materials" :key="index">
                      <li v-if="mat && typeof mat === 'object' && mat.type === 'quiz'" class="flex items-center justify-between bg-yellow-50 p-3 rounded border border-yellow-200">
                         <div class="flex items-center gap-2">
                            <span class="text-2xl">📝</span>
                            <span class="font-bold text-[#b8860b] truncate max-w-[200px]">{{ mat.value }}</span>
                            <span v-if="mat.uuid" class="text-xs bg-yellow-200 px-1 rounded text-yellow-800">Existující</span>
                            <span v-else class="text-xs bg-green-200 px-1 rounded text-green-800">Nový</span>
                         </div>
                         <div class="flex gap-2">
                             <button type="button" @click="openQuizModal(index)" class="text-[#0070BB] hover:underline text-sm font-bold">Upravit</button>
                             <button type="button" @click="removeMaterial(index)" class="text-red-500 hover:text-red-700 text-sm font-bold">Odstranit</button>
                         </div>
                      </li>
                   </template>
                </ul>
                <button type="button" @click="openQuizModal(null)" class="w-full py-2 border-2 border-dashed border-[#FFD93D] rounded bg-[#FFFcF0] text-[#B8860B] font-bold hover:bg-[#FFF5D1] transition-colors">
                   + Vytvořit nový kvíz
                </button>
            </div>

            <div v-else>
                <ul v-if="formData.materials && formData.materials.length > 0" class="space-y-2 mb-3">
                  <template v-for="(mat, index) in formData.materials" :key="index">
                    <li v-if="mat && (typeof mat !== 'object' || mat.type !== 'quiz')" class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                        <div class="flex items-center gap-2 overflow-hidden">
                           <img v-if="typeof mat === 'object' && mat.type === 'file'" src="@/assets/icons/file.svg" class="w-5 h-5" alt="File" />
                           <img v-else src="@/assets/icons/link.svg" class="w-5 h-5" alt="Link" />
                           
                           <a v-if="typeof mat === 'object' && mat.type === 'url'" :href="mat.value" target="_blank" class="text-sm font-semibold truncate hover:underline text-[#0070BB]">
                             {{ mat.value }}
                           </a>
                           <span v-else class="text-sm font-semibold truncate">
                             {{ typeof mat === "object" ? mat.value : mat }}
                           </span>
                        </div>
                        <button type="button" @click="removeMaterial(index)" class="text-red-500 hover:text-red-700 p-1 font-bold text-lg">&times;</button>
                    </li>
                  </template>
                </ul>

                <div v-if="materialType === 'url'" class="flex gap-2 items-start">
                  <div class="flex-grow">
                    <input v-model="newMaterialInput" @keydown.enter.prevent="addMaterial" @input="urlError = null" type="url" class="organic-input !py-2 !text-sm w-full" :class="{ '!border-red-500': urlError }" placeholder="https://..." />
                    <p v-if="urlError" class="text-red-500 text-sm mt-1 font-bold">{{ urlError }}</p>
                  </div>
                  <button type="button" @click="addMaterial" class="organic-btn secondary !py-2 !px-4 h-[38px] flex items-center">+</button>
                </div>

                <div v-else-if="materialType === 'file'" class="relative">
                  <input type="file" @change="handleFileUpload" class="hidden" id="file-upload" />
                  <label for="file-upload" class="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors gap-4">
                    <img src="@/assets/icons/file.svg" class="w-12 h-12 opacity-50" alt="File" />
                    <span class="text-gray-500 font-bold text-lg">Klikněte pro nahrání souboru</span>
                  </label>
                </div>
            </div>
          </div>

          <div class="pt-4">
            <button type="submit" class="organic-btn w-full text-lg py-3">
              {{ isEditing ? "Uložit změny" : "Vytvořit kurz" }}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationModal
        :show="showQuizDeleteModal"
        title="Opravdu chcete smazat tento kvíz?"
        @confirm="confirmQuizDelete"
        @cancel="showQuizDeleteModal = false"
      />

      <QuizModal
        :show="showQuizModal"
        :edit-mode="editingQuizIndex !== null"
        :initial-data="currentQuizData"
        @close="showQuizModal = false"
        @save="handleQuizSave"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import QuizModal from "./QuizModal.vue";
import ConfirmationModal from "./ConfirmationModal.vue";

const apiUrl = import.meta.env.VITE_API_URL || '/api';

interface Material {
  type: "url" | "file" | "quiz";
  value: string;
  file?: File;
  data?: any; 
  uuid?: string; 
}

interface Course {
  uuid?: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  materials?: Material[];
  quizzes?: any[];
}

const props = defineProps<{
  show: boolean;
  course?: Course | null;
  categories: string[];
}>();

const emit = defineEmits<{
  close: [];
  save: [course: Course, isEditing: boolean];
}>();

const isEditing = ref(false);
const materialType = ref<"url" | "file" | "quiz">("url");
const newMaterialInput = ref("");
const urlError = ref<string | null>(null);
const tempFile = ref<File | null>(null);

const showQuizModal = ref(false);
const editingQuizIndex = ref<number | null>(null);
const currentQuizData = ref<any>(null);

const showQuizDeleteModal = ref(false);
const quizIndexToDelete = ref<number | null>(null);
const modalKey = ref(0);

const defaultFormState = (): Course => ({
  name: "",
  description: "",
  category: "Programování",
  difficulty: "Začátečník",
  materials: [],
});

const formData = ref<Course>(defaultFormState());

const initForm = async () => {
  await nextTick();
  
  if (props.course) {
      isEditing.value = true;
      const safeCourse = JSON.parse(JSON.stringify(props.course));
      
      const mergedMaterials = safeCourse.materials || [];
      if (safeCourse.quizzes && safeCourse.quizzes.length > 0) {
          safeCourse.quizzes.forEach((q: any) => {
              const exists = mergedMaterials.some((m: any) => m.type === 'quiz' && (m.uuid === q.uuid || (m.data && m.data.uuid === q.uuid)));
              if (!exists) {
                  mergedMaterials.push({
                      type: 'quiz',
                      value: q.title,
                      data: q,
                      uuid: q.uuid
                  } as Material);
              }
          });
      }

      formData.value = {
        uuid: safeCourse.uuid,
        name: safeCourse.name,
        description: safeCourse.description,
        category: safeCourse.category || "Programování",
        difficulty: safeCourse.difficulty || "Začátečník",
        materials: mergedMaterials
      };
  } else {
      isEditing.value = false;
      formData.value = defaultFormState();
  }
  
  newMaterialInput.value = "";
  urlError.value = null;
  tempFile.value = null;
  materialType.value = "url";
};

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      modalKey.value++;
      initForm();
    } else {
      editingQuizIndex.value = null;
      currentQuizData.value = null;
      showQuizDeleteModal.value = false;
    }
  },
  { immediate: true }
);

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file && formData.value.materials) {
      formData.value.materials.push({
        type: "file",
        value: file.name,
        file: file,
      });
    }
    target.value = "";
  }
};

const addMaterial = () => {
  if (!formData.value.materials) {
      formData.value.materials = [];
  }

  if (materialType.value === "url") {
    const urlValue = newMaterialInput.value.trim();
    if (urlValue) {
      try {
        new URL(urlValue);
      } catch {
        urlError.value = "Neplatná URL";
        return;
      }
      formData.value.materials.push({ type: "url", value: urlValue });
      newMaterialInput.value = "";
      urlError.value = null;
    }
  } else if (materialType.value === "file") {
    if (tempFile.value) {
      formData.value.materials.push({
        type: "file",
        value: tempFile.value.name,
        file: tempFile.value,
      });
      tempFile.value = null;
    }
  }
};

const removeMaterial = (index: number) => {
  if (!formData.value.materials) return;
  
  const material = formData.value.materials[index];
  if (!material) return;
  
  if (material.type === 'quiz') {
    quizIndexToDelete.value = index;
    showQuizDeleteModal.value = true;
  } else {
    formData.value.materials.splice(index, 1);
  }
};

const confirmQuizDelete = async () => {
  if (quizIndexToDelete.value === null || !formData.value.materials) return;
  
  const material = formData.value.materials[quizIndexToDelete.value];
  if (!material) return;
  
  if (material.uuid && isEditing.value && formData.value.uuid) {
    try {
      await fetch(`${apiUrl}/courses/${formData.value.uuid}/quizzes/${material.uuid}`, { method: 'DELETE' });
      alert("✅ Kvíz smazán!");
    } catch (e) {
      console.error(e);
      alert("❌ Chyba mazání kvízu");
      return; 
    }
  }
  
  formData.value.materials.splice(quizIndexToDelete.value, 1);
  showQuizDeleteModal.value = false;
  quizIndexToDelete.value = null;
};

const saveCourse = () => {
  emit("save", { ...formData.value }, isEditing.value);
};

const close = () => {
  emit("close");
};

// --- API PRO KVÍZY (OPRAVENO: PŘEKLAD DAT PRO EDITOR) ---
const openQuizModal = (index: number | null = null) => {
  editingQuizIndex.value = index;
  
  if (index !== null && formData.value.materials) {
      const mat = formData.value.materials[index];
      if (mat && mat.type === 'quiz' && mat.data) {
          // HLAVNÍ OPRAVA: Mapování backend dat na frontend strukturu
          const rawData = JSON.parse(JSON.stringify(mat.data));
          
          if (rawData.questions) {
             rawData.questions = rawData.questions.map((q: any) => {
                // Pokud už to vypadá jako frontend data, nechat být
                if (q.options && typeof q.options[0] === 'object') return q;

                // Jinak přeformátovat
                return {
                    uuid: q.uuid,
                    text: q.question || q.text,
                    type: q.type === 'singleChoice' ? 'single' : 'multiple', 
                    options: (q.options || []).map((opt: string, i: number) => ({
                        text: opt,
                        isCorrect: q.type === 'singleChoice' 
                            ? q.correctIndex === i 
                            : (q.correctIndices || []).includes(i)
                    }))
                };
             });
          }
          currentQuizData.value = rawData;
      } else {
          currentQuizData.value = null;
      }
  } else {
      currentQuizData.value = null;
  }
  
  showQuizModal.value = true;
};

const handleQuizSave = (quiz: any) => {
  if (!formData.value.materials) {
      formData.value.materials = [];
  }

  const quizMaterial: Material = {
    type: "quiz",
    value: quiz.title,
    data: quiz,
    uuid: quiz.uuid
  };

  if (editingQuizIndex.value !== null) {
      formData.value.materials[editingQuizIndex.value] = quizMaterial;
  } else {
      formData.value.materials.push(quizMaterial);
  }
  
  showQuizModal.value = false;
  editingQuizIndex.value = null;
  currentQuizData.value = null;
};
</script>

<style scoped>
/* Případné styly */
</style>
<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div
        class="organic-box bg-white p-8 max-w-lg w-full relative animate-bounce-in max-h-[90vh] overflow-y-auto"
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

          <!-- SPRÁVA MATERIÁLŮ -->
          <div class="border-t-2 border-dashed border-gray-200 pt-4 mt-4">
            <label
              class="block font-bold mb-4 text-xl text-[#0257A5] text-center"
              >Správa materiálů</label
            >

            <!-- Type Selector -->
            <div class="flex gap-4 mb-6 text-sm font-bold justify-center">
              <button
                type="button"
                @click="materialType = 'url'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{
                  'bg-[#E6F4FF] text-[#0070BB] border border-[#0070BB]': materialType === 'url',
                  'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'url',
                }"
              >
                <img src="@/assets/icons/link.svg" class="w-5 h-5" alt="Link" />
                Odkaz
              </button>
              <button
                type="button"
                @click="materialType = 'file'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{
                  'bg-[#E6F4FF] text-[#0070BB] border border-[#0070BB]': materialType === 'file',
                  'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'file',
                }"
              >
                <img src="@/assets/icons/file.svg" class="w-5 h-5" alt="File" />
                Soubor
              </button>
              <button
                type="button"
                @click="materialType = 'quiz'; openQuizModal()"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
                :class="{
                  'bg-[#FFF5D1] text-[#B8860B] border border-[#FFD93D]': materialType === 'quiz',
                  'bg-gray-50 text-gray-500 border border-transparent': materialType !== 'quiz',
                }"
              >
                <img src="@/assets/icons/quiz.svg" class="w-6 h-6" alt="Quiz" />
                Kvíz
              </button>
            </div>

            <!-- Seznam existujících materiálů -->
            <ul
              v-if="formData.materials && formData.materials.length > 0"
              class="space-y-2 mb-3"
            >
              <li
                v-for="(mat, index) in formData.materials"
                :key="index"
                class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
              >
                <div class="flex items-center gap-2 overflow-hidden">
                  <img v-if="typeof mat === 'object' && mat.type === 'quiz'" src="@/assets/icons/quiz.svg" class="w-5 h-5" alt="Quiz" />
                  <img
                    v-else-if="typeof mat === 'object' && mat.type === 'file'"
                    src="@/assets/icons/file.svg"
                    alt="File"
                    class="w-5 h-5"
                  />
                  <img
                    v-else
                    src="@/assets/icons/link.svg"
                    alt="Link"
                    class="w-5 h-5"
                  />

                  <a
                    v-if="typeof mat === 'object' && mat.type === 'url'"
                    :href="mat.value"
                    target="_blank"
                    class="text-sm font-semibold truncate hover:underline text-[#0070BB]"
                  >
                    {{ mat.value }}
                  </a>
                  <span v-else class="text-sm font-semibold truncate">
                    {{ typeof mat === "object" ? mat.value : mat }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="removeMaterial(index)"
                  class="text-red-500 hover:text-red-700 p-1 font-bold text-4xl"
                >
                  &times;
                </button>
              </li>
            </ul>
            <p v-else class="text-sm text-gray-400 italic mb-3 text-center">
              Zatím žádné materiály.
            </p>

            <!-- Inputs -->
            <div v-if="materialType === 'url'" class="flex gap-2 items-start">
              <div class="flex-grow">
                <input
                  v-model="newMaterialInput"
                  @keydown.enter.prevent="addMaterial"
                  @input="urlError = null"
                  type="url"
                  class="organic-input !py-2 !text-sm w-full"
                  :class="{ '!border-red-500': urlError }"
                  placeholder="https://..."
                />
                <p v-if="urlError" class="text-red-500 text-sm mt-1 font-bold">
                  {{ urlError }}
                </p>
              </div>
              <button
                type="button"
                @click="addMaterial"
                class="organic-btn secondary !py-2 !px-4 h-[38px] flex items-center"
              >
                +
              </button>
            </div>

            <div v-else-if="materialType === 'file'" class="relative">
              <input
                type="file"
                @change="handleFileUpload"
                class="hidden"
                id="file-upload"
              />
              <label
                for="file-upload"
                class="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors gap-4"
              >
                <img
                  src="@/assets/icons/file.svg"
                  class="w-12 h-12 opacity-50"
                  alt="File"
                />
                <span class="text-gray-500 font-bold text-lg"
                  >Klikněte pro nahrání souboru</span
                >
              </label>
            </div>

            <div v-else-if="materialType === 'quiz'" class="text-center py-4 bg-yellow-50 rounded-lg border border-yellow-200">
               <span class="block text-sm text-gray-600 mb-2">Editor kvízu je otevřený.</span>
               <button type="button" @click="openQuizModal" class="text-[#B8860B] font-bold text-sm hover:underline">Znovu otevřít editor</button>
            </div>
          </div>

          <div class="pt-4">
            <button type="submit" class="organic-btn w-full text-lg py-3">
              {{ isEditing ? "Uložit změny" : "Vytvořit kurz" }}
            </button>
          </div>
        </form>
      </div>

      <!-- Nested Quiz Modal -->
      <QuizModal
        :show="showQuizModal"
        @close="showQuizModal = false"
        @save="handleQuizSave"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import QuizModal from "./QuizModal.vue";

interface Material {
  type: "url" | "file" | "quiz";
  value: string;
  file?: File;
  data?: any; // Quiz data
}

interface Course {
  uuid?: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  materials?: (string | Material)[];
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

const formData = reactive<Course>({
  name: "",
  description: "",
  category: "Programování",
  difficulty: "Začátečník",
  materials: [],
});

// Define resetForm BEFORE watch so it can be called
const resetForm = () => {
  isEditing.value = false;
  formData.uuid = undefined;
  formData.name = "";
  formData.description = "";
  formData.category = "Programování";
  formData.difficulty = "Začátečník";
  formData.materials = [];
  newMaterialInput.value = "";
  urlError.value = null;
  tempFile.value = null;
  materialType.value = "url";
  showQuizModal.value = false;
};

// Now watch can safely call resetForm
watch(
  () => props.course,
  (newCourse) => {
    if (newCourse) {
      isEditing.value = true;
      formData.uuid = newCourse.uuid;
      formData.name = newCourse.name;
      formData.description = newCourse.description;
      formData.category = newCourse.category || "Programování";
      formData.difficulty = newCourse.difficulty || "Začátečník";
      formData.materials = [...(newCourse.materials || [])];
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file) {
      formData.materials!.push({
        type: "file",
        value: file.name,
        file: file,
      });
    }
    // Reset input so same file can be selected again if needed (though unlikely here)
    target.value = "";
  }
};

const addMaterial = () => {
  if (materialType.value === "url") {
    const urlValue = newMaterialInput.value.trim();
    if (urlValue) {
      try {
        new URL(urlValue);
      } catch {
        urlError.value =
          "Prosím zadejte platnou URL adresu (např. https://example.com)";
        return;
      }

      // Compatibility: wrap in object
      formData.materials!.push({
        type: "url",
        value: urlValue,
      });
      newMaterialInput.value = "";
      urlError.value = null;
    }
  } else if (materialType.value === "file") {
    if (tempFile.value) {
      formData.materials!.push({
        type: "file",
        value: tempFile.value.name,
        file: tempFile.value,
      });
      tempFile.value = null;
    }
  }
};

const removeMaterial = (index: number) => {
  formData.materials!.splice(index, 1);
};

const saveCourse = () => {
  emit("save", { ...formData }, isEditing.value);
  resetForm();
};

const close = () => {
  emit("close");
  resetForm();
};

const openQuizModal = () => {
  showQuizModal.value = true;
};

const handleQuizSave = (quiz: any) => {
  formData.materials!.push({
    type: "quiz",
    value: quiz.title,
    data: quiz,
  });
  showQuizModal.value = false;
};
</script>

<style scoped></style>

<template>
  <div>
    <div
      class="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4"
    >
      <div>
        <h1 class="text-4xl font-extrabold text-[#1A1A1A]">
          Dashboard Lektora
        </h1>
        <p class="text-gray-600 font-semibold mt-2">
          Spravuj své kurzy a materiály na jednom místě.
        </p>
      </div>
      <div class="flex gap-4">
        <button
          @click="openModal()"
          class="organic-btn !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white px-6 py-3 shadow-md transition-all duration-300"
        >
          <span class="text-xl">+</span> Vytvořit kurz
        </button>
      </div>
    </div>
    <h3 class="text-2xl font-bold mb-6 border-b-2 border-gray-200 pb-2">
      Moje Kurzy
    </h3>
    <div v-if="loading" class="text-center text-gray-500 font-bold py-12">
      Načítání kurzů...
    </div>
    <div v-else-if="error" class="text-center text-red-500 font-bold py-12">
      {{ error }}
    </div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="course in courses"
        :key="course.uuid"
        class="organic-box p-5 flex gap-4 items-start hover:shadow-lg transition-shadow bg-white"
      >
        <div
          class="w-24 h-24 rounded-lg flex-shrink-0 border-2 border-[#1A1A1A] bg-gray-100 relative overflow-hidden"
        >
          <div
            class="absolute inset-0 opacity-50"
            :style="{ background: course.color || '#91F5AD' }"
          ></div>
        </div>
        <div class="flex-grow">
          <div class="flex justify-between items-start mb-1">
            <h4 class="text-xl font-bold">{{ course.name }}</h4>
            <span
              class="px-3 py-1 rounded-full text-xs font-bold border border-gray-200 flex items-center gap-1"
              :style="{
                backgroundColor: getDifficultyColor(course.difficulty) + '40',
                color: '#1A1A1A',
              }"
            >
              <img 
                :src="getDifficultyIcon(course.difficulty)" 
                alt="" 
                class="w-4 h-4"
              />
              {{ course.difficulty || "Jednoduchý" }}
            </span>
          </div>
          <p class="text-gray-500 text-sm mb-3 line-clamp-2">
            {{ course.description }}
          </p>
            <div class="flex gap-4 text-sm font-bold text-[#0070BB]">
            <span class="flex items-center gap-1">
              📄 Materiály ({{ course.materials?.length || 0 }})
            </span>
            <button
              @click="toggleCourseStatus(course)"
              class="hover:underline flex items-center gap-1"
              :class="!course.isPaused ? 'text-orange-500' : 'text-green-600'"
            >
              {{ !course.isPaused ? '⏸️ Pozastavit' : '▶️ Spustit' }}
            </button>
            <button
              @click="openModal(course)"
              class="hover:underline flex items-center gap-1"
            >
              ✏️ Upravit
            </button>
            <button
              @click="deleteCourse(course.uuid)"
              class="hover:underline flex items-center gap-1 text-red-500"
            >
              🗑️ Smazat
            </button>
          </div>
        </div>
      </div>
    </div>
    <CourseModal
      :show="showModal"
      :course="editingCourse"
      :categories="categories"
      @close="
        showModal = false;
        editingCourse = null;
      "
      @save="saveCourse"
    />
    <ConfirmationModal
      :show="showDeleteModal"
      title="Chcete kurz smazat?"
      @cancel="showDeleteModal = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import CourseModal from "../components/CourseModal.vue";
import ConfirmationModal from "../components/ConfirmationModal.vue";
import { useNotifications } from "../composables/useNotifications";

interface Course {
  uuid?: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  color?: string;
  materials?: any[];
  publishedAt?: string | null;
  endsAt?: string | null; // ZDE PŘIDÁNO ENDS_AT
  isPaused?: boolean;
}

const apiUrl = import.meta.env.VITE_API_URL || '/api';
const { success: showSuccess, error: showError } = useNotifications();
const categories = ["Programování", "Design & Art", "Marketing", "Soft Skills"];
const courses = ref<Course[]>([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingCourse = ref<Course | null>(null);
const courseToDeleteId = ref<string | null>(null);
const loading = ref(true);
const error = ref("");

const getDifficultyColor = (diff?: string) => {
  if (diff === "Jednoduchý") return "#91F5AD";
  if (diff === "Střední") return "#FFD93D";
  if (diff === "Těžký") return "#FF6B6B";
  if (diff === "Extrém") return "#8B00FF";
  return "#F9F9F9";
};

const getDifficultyIcon = (diff?: string) => {
  if (diff === "Jednoduchý") return new URL('../assets/icons/easy.svg', import.meta.url).href;
  if (diff === "Střední") return new URL('../assets/icons/medium.svg', import.meta.url).href;
  if (diff === "Těžký") return new URL('../assets/icons/hard.svg', import.meta.url).href;
  if (diff === "Extrém") return new URL('../assets/icons/extreme.svg', import.meta.url).href;
  return new URL('../assets/icons/easy.svg', import.meta.url).href;
};

const fetchCourses = async () => {
  try {
    loading.value = true;
    error.value = "";
    const response = await fetch(`${apiUrl}/courses`);
    if (!response.ok) throw new Error("Failed to fetch courses");
    const data = await response.json();
    courses.value = data.map((course: any, index: number) => ({
      ...course,
      difficulty: course.difficulty || ["Jednoduchý", "Střední", "Těžký", "Extrém"][index % 4],
      color: ["#91F5AD", "#0070BB", "#FF6B6B", "#FFD93D"][index % 4],
      category: course.category || "Programování",
      publishedAt: course.publishedAt,
      endsAt: course.endsAt, // ZDE PŘIDÁNO ENDS_AT
      isPaused: Boolean(course.isPaused)
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Nepodařilo se načíst kurzy";
    console.error("Error fetching courses:", err);
  } finally {
    loading.value = false;
  }
};

const toggleCourseStatus = async (course: Course) => {
  if (!course.uuid) return;
  const action = course.isPaused ? "resume" : "pause";

  try {
    const response = await fetch(`${apiUrl}/courses/${course.uuid}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`Chyba ${response.status}: ${errorText || response.statusText}`);
    }

    await fetchCourses();
    showSuccess(`Kurz ${course.isPaused ? "spuštěn" : "pozastaven"}`);

  } catch (err: any) {
    showError(`Nepodařilo se změnit stav kurzu: ${err.message}`);
  }
};

const openModal = (course?: Course) => {
  editingCourse.value = course ? JSON.parse(JSON.stringify(course)) : null;
  showModal.value = true;
};

const saveMaterialSeparately = async (courseId: string, material: any) => {
  try {
    const formData = new FormData();
    formData.append('name', material.value); 
    formData.append('type', material.type);
    formData.append('description', ''); 
    if (material.type === 'file') {
       if (!material.file) return;
       formData.append('file', material.file);
    } else if (material.type === 'url') {
       formData.append('url', material.value);
    }
    const response = await fetch(`${apiUrl}/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Chyba nahrávání (${response.status}): ${errText}`);
    }
  } catch (err) {
    showError(`Nepodařilo se nahrát materiál: ${material.value}`);
  }
};

const saveCourse = async (courseData: Course, isEditing: boolean) => {
  try {
    const quizzesToSave: any[] = [];
    const materialsToSave: any[] = [];
    const cleanMaterials = (courseData.materials || []).filter((mat: any) => {
      if (typeof mat === 'object' && mat.type === 'quiz') {
        if (mat.data) {
           quizzesToSave.push({ ...mat.data, uuid: mat.uuid || mat.data.uuid });
        }
        return false; 
      }
      if (!mat.uuid) {
         materialsToSave.push(mat);
         return false;
      }
      return true;
    });
    
    const payloadCourse = { ...courseData, materials: cleanMaterials };
    const url = isEditing && courseData.uuid ? `${apiUrl}/courses/${courseData.uuid}` : `${apiUrl}/courses`;
    const method = isEditing && courseData.uuid ? "PUT" : "POST";
    
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadCourse),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chyba ${response.status}: ${errorText || response.statusText}`);
    }
    
    const savedCourse = await response.json();
    const finalCourseId = isEditing && courseData.uuid ? courseData.uuid : savedCourse.uuid;
    
    if (finalCourseId) {
       if (materialsToSave.length > 0) {
           for (const mat of materialsToSave) {
               await saveMaterialSeparately(finalCourseId, mat);
           }
       }
       if (quizzesToSave.length > 0) {
           for (const quiz of quizzesToSave) {
              await saveQuizSeparately(finalCourseId, quiz);
           }
       }
    }
    
    showModal.value = false;
    await new Promise(resolve => setTimeout(resolve, 100));
    editingCourse.value = null;
    await fetchCourses();
    await new Promise(resolve => setTimeout(resolve, 50));
    showSuccess(isEditing ? "Kurz uložen" : "Kurz vytvořen");
    await fetchCourses();
  } catch (err: any) {
    const msg = err?.response?.data?.error || err.message || "Neznámá chyba";
    showError(`Chyba při ukládání: ${msg}`);
  }
};

const saveQuizSeparately = async (courseId: string, quizData: any) => {
    try {
        const backendQuestions = quizData.questions.map((q: any, i: number) => {
            let correctIndex = undefined;
            let correctIndices = undefined;
            if (!q.options || !Array.isArray(q.options)) {
                throw new Error(`Otázka č. ${i+1} nemá platné možnosti.`);
            }
            if (q.type === 'single') {
               correctIndex = q.options.findIndex((opt: any) => opt && opt.isCorrect);
               if (correctIndex === -1) correctIndex = 0; 
            } else {
               correctIndices = q.options
                 .map((opt: any, idx: number) => (opt && opt.isCorrect) ? idx : -1)
                 .filter((idx: number) => idx !== -1);
            }
            return {
              uuid: q.uuid, 
              type: q.type === 'single' ? 'singleChoice' : 'multipleChoice',
              question: q.text || "", 
              options: q.options.map((opt: any) => opt ? (opt.text || "") : ""),
              correctIndex,
              correctIndices
            };
        });

        // OPRAVA: Odesílání časování a publikace
        const payload = { 
            title: quizData.title, 
            questions: backendQuestions,
            scheduledAt: quizData.scheduledAt || null,
            scheduledEnd: quizData.scheduledEnd || null,
            durationMinutes: quizData.durationMinutes || null,
            publishedAt: quizData.publishedAt || null
        };

        let quizUrl, method;
        if (quizData.uuid) {
            quizUrl = `${apiUrl}/courses/${courseId}/quizzes/${quizData.uuid}`;
            method = 'PUT';
        } else {
            quizUrl = `${apiUrl}/courses/${courseId}/quizzes`;
            method = 'POST';
        }
        const res = await fetch(quizUrl, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
           const txt = await res.text();
           throw new Error(`Selhalo uložení kvízu: ${txt}`);
        }
    } catch (e: any) {
        throw e; 
    }
};

const deleteCourse = async (uuid?: string) => {
  if (!uuid) return;
  courseToDeleteId.value = uuid;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (courseToDeleteId.value) {
    try {
      const response = await fetch(`${apiUrl}/courses/${courseToDeleteId.value}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete course");
      await fetchCourses(); 
    } catch (err) {
      showError(err instanceof Error ? err.message : "Chyba při mazání kurzu");
    }
  }
  showDeleteModal.value = false;
  courseToDeleteId.value = null;
};

onMounted(() => {
  fetchCourses();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
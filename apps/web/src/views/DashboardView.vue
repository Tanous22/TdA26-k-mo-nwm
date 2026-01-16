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
              class="px-3 py-1 rounded-full text-xs font-bold border border-gray-200"
              :style="{
                backgroundColor: getDifficultyColor(course.difficulty) + '40',
                color: '#1A1A1A',
              }"
            >
              {{ course.difficulty || "Začátečník" }}
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

interface Course {
  uuid?: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  color?: string;
  materials?: any[];
}

const apiUrl = import.meta.env.VITE_API_URL || '/api';

const categories = ["Programování", "Design & Art", "Marketing", "Soft Skills"];
const courses = ref<Course[]>([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingCourse = ref<Course | null>(null);
const courseToDeleteId = ref<string | null>(null);
const loading = ref(true);
const error = ref("");

const getDifficultyColor = (diff?: string) => {
  if (diff === "Začátečník") return "#91F5AD";
  if (diff === "Pokročilý") return "#FFD93D";
  if (diff === "Expert") return "#FF6B6B";
  return "#F9F9F9";
};

const fetchCourses = async () => {
  try {
    loading.value = true;
    error.value = "";
    const response = await fetch(`${apiUrl}/courses`);
    if (!response.ok) throw new Error("Failed to fetch courses");
    const data = await response.json();

    courses.value = data.map((course: Course, index: number) => ({
      ...course,
      difficulty:
        course.difficulty || ["Začátečník", "Pokročilý", "Expert"][index % 3],
      color: ["#91F5AD", "#0070BB", "#FF6B6B", "#FFD93D"][index % 4],
      category: course.category || "Programování",
    }));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Nepodařilo se načíst kurzy";
    console.error("Error fetching courses:", err);
  } finally {
    loading.value = false;
  }
};

const openModal = (course?: Course) => {
  editingCourse.value = course ? JSON.parse(JSON.stringify(course)) : null;
  console.log("[Dashboard] openModal called, course=", course?.name);
  showModal.value = true;
};

// --- NOVÁ FUNKCE: Uložení materiálu zvlášť (POST) ---
const saveMaterialSeparately = async (courseId: string, material: any) => {
  try {
    console.log(`[Dashboard] Nahrávám materiál: ${material.value} (${material.type})`);
    
    const formData = new FormData();
    // API očekává: name, type, description a (file nebo url)
    formData.append('name', material.value); 
    formData.append('type', material.type);
    formData.append('description', ''); 

    if (material.type === 'file') {
       if (!material.file) {
           console.warn(`[Dashboard] Materiál '${material.value}' nemá soubor, přeskakuji.`);
           return;
       }
       formData.append('file', material.file);
    } else if (material.type === 'url') {
       formData.append('url', material.value);
    }

    const response = await fetch(`${apiUrl}/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData, // Browser automaticky nastaví multipart/form-data
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Chyba nahrávání (${response.status}): ${errText}`);
    }
    console.log(`[Dashboard] Materiál '${material.value}' úspěšně nahrán.`);

  } catch (err) {
    console.error(`[Dashboard] Chyba saveMaterialSeparately:`, err);
    alert(`Nepodařilo se nahrát materiál: ${material.value}`);
  }
};

// --- UPRAVENÁ FUNKCE: Uložení kurzu + materiálů + kvízů ---
const saveCourse = async (courseData: Course, isEditing: boolean) => {
  try {
    const quizzesToSave: any[] = [];
    const materialsToSave: any[] = [];

    // 1. TŘÍDĚNÍ MATERIÁLŮ (Co je kvíz? Co je nový soubor? Co už existuje?)
    const cleanMaterials = (courseData.materials || []).filter((mat: any) => {
      // A) Kvíz - dáme stranou
      if (typeof mat === 'object' && mat.type === 'quiz') {
        if (mat.data) {
           quizzesToSave.push({
               ...mat.data,
               uuid: mat.uuid || mat.data.uuid
           });
        }
        return false; 
      }
      
      // B) Nový materiál (nemá UUID) - dáme stranou na POST
      if (!mat.uuid) {
         materialsToSave.push(mat);
         return false; // Neposílat v JSONu kurzu, server by to stejně ignoroval
      }

      // C) Existující materiál - necháme (backend ho ignoruje při PUT, ale nevadí)
      return true;
    });

    // Data pro uložení kurzu (bez nových materiálů a kvízů)
    const payloadCourse = {
      ...courseData,
      materials: cleanMaterials
    };

    // 2. ULOŽENÍ SAMOTNÉHO KURZU
    const url = isEditing && courseData.uuid 
      ? `${apiUrl}/courses/${courseData.uuid}` 
      : `${apiUrl}/courses`;
      
    const method = isEditing && courseData.uuid ? "PUT" : "POST";

    console.log(`[Dashboard] Odesílám kurz na: ${url} (${method})`); 

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

    if (!finalCourseId) {
       console.warn("Nepodařilo se získat ID kurzu, materiály nebudou uloženy.");
    } else {
       // 3. ULOŽENÍ NOVÝCH MATERIÁLŮ (POST)
       if (materialsToSave.length > 0) {
           console.log(`[Dashboard] Zpracovávám ${materialsToSave.length} nových materiálů...`);
           for (const mat of materialsToSave) {
               await saveMaterialSeparately(finalCourseId, mat);
           }
       }

       // 4. ULOŽENÍ KVÍZŮ
       if (quizzesToSave.length > 0) {
           console.log(`[Dashboard] Zpracovávám ${quizzesToSave.length} kvízů...`);
           for (const quiz of quizzesToSave) {
              await saveQuizSeparately(finalCourseId, quiz);
           }
       }
    }

    await fetchCourses(); 
    showModal.value = false;
    editingCourse.value = null;
    
    await new Promise(resolve => setTimeout(resolve, 150));
    alert(isEditing ? "Kurz uložen." : "Kurz vytvořen.");

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Neznámá chyba";
    alert(`Chyba při ukládání: ${msg}`);
    console.error("Error saving course sequence:", err);
  }
};

// apps/web/src/views/DashboardView.vue

const saveQuizSeparately = async (courseId: string, quizData: any) => {
    try {
        const backendQuestions = quizData.questions.map((q: any, i: number) => {
            let correctIndex = undefined;
            let correctIndices = undefined;

            // Kontrola, zda existuje pole možností
            if (!q.options || !Array.isArray(q.options)) {
                throw new Error(`Otázka č. ${i+1} nemá platné možnosti.`);
            }

            if (q.type === 'single') {
               // OPRAVA: Přidána kontrola "opt &&", aby kód nespadl na null
               correctIndex = q.options.findIndex((opt: any) => opt && opt.isCorrect);
               if (correctIndex === -1) correctIndex = 0; 
            } else {
               // OPRAVA: Přidána kontrola "opt &&"
               correctIndices = q.options
                 .map((opt: any, idx: number) => (opt && opt.isCorrect) ? idx : -1)
                 .filter((idx: number) => idx !== -1);
            }

            return {
              uuid: q.uuid, 
              type: q.type === 'single' ? 'singleChoice' : 'multipleChoice',
              question: q.text || "", 
              // OPRAVA: Ošetření null možností i při převodu na text
              options: q.options.map((opt: any) => opt ? (opt.text || "") : ""),
              correctIndex,
              correctIndices
            };
        });

        const payload = {
            title: quizData.title,
            questions: backendQuestions
        };
        
        let quizUrl, method;
        if (quizData.uuid) {
            quizUrl = `${apiUrl}/courses/${courseId}/quizzes/${quizData.uuid}`;
            method = 'PUT';
        } else {
            quizUrl = `${apiUrl}/courses/${courseId}/quizzes`;
            method = 'POST';
        }
        
        console.log(`[Dashboard] Odesílám kvíz:`, payload);

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
        console.error(`Chyba při ukládání kvízu '${quizData.title}':`, e);
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
      alert(err instanceof Error ? err.message : "Chyba při mazání kurzu");
      console.error("Error deleting course:", err);
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
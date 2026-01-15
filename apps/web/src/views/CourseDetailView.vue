<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <div class="bg-gradient-to-r from-[#0070BB] to-[#6DD4B1] text-white p-12 shadow-lg relative overflow-hidden">
      <div class="max-w-7xl mx-auto relative z-10 text-center md:text-left">
        <router-link to="/courses" class="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg mb-6 transition-all backdrop-blur-sm">
          <span>←</span> Zpět na kurzy
        </router-link>
        <div v-if="loading" class="animate-pulse space-y-4">
           <div class="h-12 bg-white/20 rounded w-1/3"></div>
           <div class="h-6 bg-white/20 rounded w-1/2"></div>
        </div>
        <div v-else>
          <h1 class="text-5xl font-bold mb-4">{{ course.name }}</h1>
          <p class="text-xl opacity-90 max-w-2xl">{{ course.description }}</p>
          <p class="mt-4 text-sm opacity-75">Obtížnost: {{ course.difficulty }}</p>
        </div>
      </div>
    </div>

    <div v-if="!loading" class="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 gap-8 -mt-8 relative z-20">
      <div class="space-y-8">
        
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">📚 Studijní materiály</h2>
            <div v-if="isTeacher" class="flex gap-2">
               <button @click="handleAddLink" class="organic-btn text-sm px-4 py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white">+ Odkaz</button>
               <button @click="triggerFileUpload" class="organic-btn text-sm px-4 py-2 !bg-[#0070BB] !text-white hover:!bg-[#005a96]">+ Soubor</button>
               <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload">
            </div>
          </div>

          <div v-if="!course.materials || course.materials.length === 0" class="text-center py-12 text-gray-400">
            Zatím nejsou k dispozici žádné materiály
          </div>

          <div v-else class="space-y-4">
            <div v-for="mat in course.materials" :key="mat.uuid" class="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-[#91F5AD] hover:bg-green-50/30 transition-all cursor-pointer bg-gray-50">
              <div class="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-2xl">
                {{ getMaterialIcon(mat) }}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 truncate">{{ mat.name }}</h4>
                <p class="text-sm text-gray-500 truncate">{{ mat.description }}</p>
              </div>
              <div>
                <a v-if="mat.type === 'link'" :href="mat.url" target="_blank" class="text-[#0070BB] font-semibold text-sm hover:underline">Otevřít →</a>
                <a v-else-if="mat.type === 'file'" :href="`${apiUrl}${mat.fileUrl}`" target="_blank" class="text-[#0070BB] font-semibold text-sm hover:underline">Stáhnout ↓</a>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">✏️ Kvízy</h2>
            <button v-if="isTeacher" @click="openQuizModal" class="organic-btn text-sm px-4 py-2 !bg-[#FFD93D] !text-[#1A1A1A] hover:!bg-[#E6C200]">+ Nový</button>
          </div>

          <div v-if="!course.quizzes || course.quizzes.length === 0" class="text-center py-12 text-gray-400">
             Zatím žádné kvízy
          </div>

          <div v-else class="space-y-4">
            <div v-for="quiz in course.quizzes" :key="quiz.uuid" class="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-lg text-gray-800">{{ quiz.title }}</h4>
                <div class="flex flex-col items-end">
                   <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mb-1">{{ quiz.questions.length }} otázek</span>
                   <span class="text-xs text-gray-400">Pokusů: {{ quiz.attemptsCount || 0 }}</span>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button @click="startQuiz(quiz)" class="flex-1 organic-btn text-sm py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white border-2 border-transparent">Spustit kvíz</button>
                <button v-if="isTeacher" @click="editQuiz(quiz)" class="p-2 text-gray-400 hover:text-[#0070BB] transition-colors">✎</button>
                <button v-if="isTeacher" @click="openDeleteModal(quiz.uuid)" class="p-2 text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeQuiz" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-slide-up">
        <QuizRunner :quiz="activeQuiz" :courseId="courseId" @close="activeQuiz = null" @cancel="activeQuiz = null"/>
      </div>
    </div>
    
    <QuizModal :show="showQuizModal" :edit-mode="!!editingQuiz" :initial-data="editingQuiz" @close="closeQuizModal" @save="handleQuizSave"/>
    
    <ConfirmationModal 
      :show="showDeleteModal" 
      title="Opravdu chcete smazat tento kvíz?" 
      @confirm="confirmDelete" 
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import QuizRunner, { type Quiz } from '../components/QuizRunner.vue';
import QuizModal from '../components/QuizModal.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const { user } = useAuth();
const courseId = (route.params.courseId || route.params.uuid) as string;

// 1. ZÁKLADNÍ NASTAVENÍ API
const apiUrl = import.meta.env.VITE_API_URL || '/api';

const loading = ref(true);
const activeQuiz = ref<Quiz | null>(null);
const showQuizModal = ref(false);
const editingQuiz = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const course = ref<any>({});

// Stav pro mazání
const showDeleteModal = ref(false);
const quizIdToDelete = ref<string | null>(null);

const isTeacher = computed(() => user.value?.name?.toLowerCase().includes('lektor') || user.value?.email === 'lektor@example.com');

const getMaterialIcon = (mat: any) => {
  if (mat.type === 'link') return '🔗'; 
  if (mat.mimeType?.includes('pdf')) return '📄';
  return '📁';
};

// 2. NAČÍTÁNÍ DAT
const fetchData = async () => {
  try {
    loading.value = true;
    console.log(`[CourseDetail] Using Course ID: ${courseId}`); 
    const response = await fetch(`${apiUrl}/courses/${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch course');
    const data = await response.json();
    
    course.value = {
      ...data,
      difficulty: data.difficulty || 'Začátečník', 
      materials: (data.materials || []).map((m: any) => ({
        ...m,
        type: m.type === 'url' ? 'link' : m.type, 
        url: m.url || m.fileUrl
      })),
      quizzes: (data.quizzes || []).map((q: any) => ({
        ...q,
        attemptsCount: q.attemptsCount || 0,
        questions: (q.questions || []).map((kq: any) => ({
          id: kq.uuid,
          text: kq.question,
          type: kq.type === 'singleChoice' ? 'single' : 'multiple',
          options: (kq.options || []).map((optText: string, idx: number) => ({
             id: `opt-${idx}`,
             text: optText,
             isCorrect: kq.type === 'singleChoice' 
                ? kq.correctIndex === idx 
                : (kq.correctIndices || []).includes(idx)
          }))
        }))
      }))
    };
  } catch (e) {
    console.error('Error fetching course:', e);
  } finally {
    loading.value = false;
  }
};

// 3. POMOCNÉ FUNKCE
const handleAddLink = async () => {
  const url = prompt("Zadejte URL odkazu:");
  if (!url) return;
  const name = prompt("Zadejte název odkazu:", "Nový odkaz");
  if (!name) return;

  try {
    const res = await fetch(`${apiUrl}/courses/${courseId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'url', name, url, description: "" })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || res.statusText);
    }

    await fetchData();
  } catch (e: any) { 
    alert(`Chyba: ${e.message}`); 
  }
};

const triggerFileUpload = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'file');
  formData.append('name', file.name);
  formData.append('description', "");

  try {
    const res = await fetch(`${apiUrl}/courses/${courseId}/materials`, { 
        method: 'POST', 
        body: formData 
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || res.statusText);
    }

    await fetchData();
    alert("Soubor byl úspěšně nahrán");
  } catch (e: any) { 
      alert(`Chyba při nahrávání: ${e.message}`); 
  }
};

const openQuizModal = () => { editingQuiz.value = null; showQuizModal.value = true; };
const closeQuizModal = () => { showQuizModal.value = false; editingQuiz.value = null; };
const startQuiz = (quiz: Quiz) => { activeQuiz.value = quiz; };

// ZMĚNA: Použití nextTick pro zajištění reaktivity dat - TOTO OPRAVUJE "NEJDE PSÁT" A "CHYBÍ OTÁZKY"
const editQuiz = async (quiz: Quiz) => {
  try {
    const res = await fetch(`${apiUrl}/courses/${courseId}/quizzes/${quiz.uuid}`);
    if (!res.ok) throw new Error("Nepodařilo se načíst detail kvízu");
    
    const fullQuizData = await res.json();
    console.log("Edit Quiz Data:", fullQuizData);

    // Kontrola, zda jsou data v pořádku
    if (!fullQuizData.questions || fullQuizData.questions.length === 0) {
        console.warn("Kvíz nemá otázky v DB.");
    }

    editingQuiz.value = fullQuizData; 
    
    // Počkáme, až Vue zpracuje změnu proměnné editingQuiz, než otevřeme modál
    await nextTick();
    showQuizModal.value = true;
  } catch (e) {
    console.error(e);
    alert("Chyba při načítání kvízu pro editaci.");
  }
};

const openDeleteModal = (quizUuid: string) => {
  quizIdToDelete.value = quizUuid;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!quizIdToDelete.value) return;
  
  try {
    const res = await fetch(`${apiUrl}/courses/${courseId}/quizzes/${quizIdToDelete.value}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Chyba při mazání");
    await fetchData();
  } catch (e) {
    alert("Chyba při mazání kvízu.");
    console.error(e);
  } finally {
    showDeleteModal.value = false;
    quizIdToDelete.value = null;
  }
};

// 4. HLAVNÍ FUNKCE PRO ULOŽENÍ KVÍZU
const handleQuizSave = async (quizData: any) => {
  let payload;
  try {
      const backendQuestions = quizData.questions.map((q: any, i: number) => {
        let correctIndex = undefined;
        let correctIndices = undefined;

        if (!q.options) throw new Error(`Otázka č. ${i+1} nemá definované možnosti!`);

        if (q.type === 'single') {
           correctIndex = q.options.findIndex((opt: any) => opt.isCorrect);
           if(correctIndex === -1) correctIndex = 0; 
        } else {
           correctIndices = q.options
             .map((opt: any, idx: number) => opt.isCorrect ? idx : -1)
             .filter((idx: number) => idx !== -1);
        }

        return {
          type: q.type === 'single' ? 'singleChoice' : 'multipleChoice',
          question: q.text,
          options: q.options.map((opt: any) => opt.text),
          correctIndex,
          correctIndices
        };
      });

      payload = {
        title: quizData.title,
        questions: backendQuestions
      };
  } catch (err: any) {
      alert("❌ CHYBA PŘI PŘÍPRAVĚ DAT: " + err.message);
      console.error(err);
      return; 
  }

  const url = editingQuiz.value 
    ? `${apiUrl}/courses/${courseId}/quizzes/${editingQuiz.value.uuid}` 
    : `${apiUrl}/courses/${courseId}/quizzes`;

  try {
    const res = await fetch(url, {
      method: editingQuiz.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server vrátil chybu ${res.status}: ${errorText}`);
    }
    
    closeQuizModal();
    await fetchData(); 
    alert("✅ HOTOVO: Kvíz byl úspěšně uložen!");
  } catch (e: any) {
    console.error("Quiz Save Failed:", e);
    alert(`❌ CHYBA PŘI ODESÍLÁNÍ: ${e.message}`);
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.organic-btn {
  @apply font-bold rounded-lg shadow-sm transition-transform active:scale-95 border-2 border-transparent;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
</style>
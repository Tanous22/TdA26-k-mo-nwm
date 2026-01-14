<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <!-- Header -->
    <div
      class="bg-gradient-to-r from-[#0070BB] to-[#6DD4B1] text-white p-12 shadow-lg relative overflow-hidden"
    >
      <div class="max-w-7xl mx-auto relative z-10 text-center md:text-left">
        <router-link
          to="/courses"
          class="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg mb-6 transition-all backdrop-blur-sm"
        >
          <span>←</span> Zpět na kurzy
        </router-link>
        <h1 class="text-5xl font-bold mb-4">{{ course.name }}</h1>
        <p class="text-xl opacity-90 max-w-2xl">{{ course.description }}</p>
        <p class="mt-4 text-sm opacity-75">Vytvořeno: {{ formatDate(course.created) }}</p>
      </div>

      <!-- blob decoration -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 gap-8 -mt-8 relative z-20">
      
      <!-- Left Column: Materials & Feed -->
      <div class="space-y-8">
        
        <!-- Materials Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📚 Studijní materiály
            </h2>
            <button
              v-if="isTeacher"
              @click="addMaterial"
              class="organic-btn text-sm px-4 py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white"
            >
              + Přidat
            </button>
            <input 
              type="file" 
              ref="fileInput" 
              class="hidden" 
              @change="handleFileUpload" 
            />
          </div>

          <div v-if="course.materials.length === 0" class="text-center py-12 text-gray-400">
            Zatím nejsou k dispozici žádné materiály
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="mat in course.materials"
              :key="mat.id"
              class="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-[#91F5AD] hover:bg-green-50/30 transition-all cursor-pointer bg-gray-50"
            >
              <!-- Icon -->
              <div class="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-2xl">
                {{ getMaterialIcon(mat) }}
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 truncate">{{ mat.name }}</h4>
                <p class="text-sm text-gray-500 truncate">{{ mat.description }}</p>
              </div>

              <!-- Action -->
              <div>
                <a
                  v-if="mat.type === 'link'"
                  :href="mat.url"
                  target="_blank"
                  class="text-[#0070BB] font-semibold text-sm hover:underline"
                >
                  Otevřít →
                </a>
                <span v-else class="text-xs text-gray-400 font-mono">{{ mat.size }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quizzes Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
              ✏️ Kvízy
            </h2>
            <button
              v-if="isTeacher"
              @click="openQuizModal"
              class="organic-btn text-sm px-4 py-2 !bg-[#FFD93D] !text-[#1A1A1A] hover:!bg-[#E6C200]"
            >
              + Nový
            </button>
          </div>

          <div v-if="course.quizzes.length === 0" class="text-center py-12 text-gray-400">
             Zatím žádné kvízy
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="quiz in course.quizzes"
              :key="quiz.id"
              class="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-lg text-gray-800">{{ quiz.title }}</h4>
                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {{ quiz.questions.length }} otázek
                </span>
              </div>
              
              <div class="flex gap-2 mt-4">
                <button
                  @click="startQuiz(quiz)"
                  class="flex-1 organic-btn text-sm py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white border-2 border-transparent"
                >
                  Spustit kvíz
                </button>
                <button
                   v-if="isTeacher"
                   @click="editQuiz(quiz)"
                   class="p-2 text-gray-400 hover:text-[#0070BB] transition-colors"
                >
                  ✎
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Feed Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📢 Novinky
          </h2>
          
           <div class="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
             <div v-for="post in course.feed" :key="post.id" class="relative pl-10">
               <!-- Timeline dot -->
               <div class="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                 :class="post.type === 'post' ? 'bg-[#0070BB]' : 'bg-[#91F5AD]'"
               ></div>
               
               <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                 <div class="flex justify-between items-start mb-2">
                   <span class="font-bold text-gray-900">{{ post.author || 'Systém' }}</span>
                   <span class="text-xs text-gray-400">{{ formatDate(post.timestamp) }}</span>
                 </div>
                 <p class="text-gray-600">{{ post.content }}</p>
               </div>
             </div>
             
             <div v-if="course.feed.length === 0" class="text-center py-8 text-gray-400 pl-0">
               Žádné novinky
             </div>
           </div>
           
           <!-- Add Post (Teacher only) -->
           <div v-if="isTeacher" class="mt-6 pt-6 border-t border-gray-100">
             <textarea 
               placeholder="Napište zprávu pro studenty..."
               class="w-full p-3 rounded-lg border border-gray-200 focus:border-[#0070BB] focus:ring-1 focus:ring-[#0070BB] outline-none transition-all resize-none"
               rows="2"
             ></textarea>
             <div class="flex justify-end mt-2">
               <button class="organic-btn text-sm px-4 py-2">Odeslat</button>
             </div>
           </div>
        </div>

      </div>


    </div>

    <!-- Modals -->
    <!-- Quiz Runner Overlay -->
    <div v-if="activeQuiz" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-slide-up">
        <QuizRunner 
          :quiz="activeQuiz" 
          :courseId="courseId"
          @close="activeQuiz = null" 
          @cancel="activeQuiz = null"
        />
      </div>
    </div>
    
    <!-- Quiz Editor Modal (Reusing existing component structure if possible, or simplified placeholder) -->
    <QuizModal 
       :show="showQuizModal"
       @close="showQuizModal = false"
       @save="handleQuizSave"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import QuizRunner, { type Quiz } from '../components/QuizRunner.vue';
import QuizModal from '../components/QuizModal.vue';

const route = useRoute();
const courseId = route.params.uuid as string;

// State
const activeQuiz = ref<Quiz | null>(null);
const showQuizModal = ref(false);

interface Material {
  id: string; // Adjusted to match potential API or frontend usage. API says uuid, UI uses id/uuid mixed maybe? The UI template uses `mat.id`.
  uuid?: string;
  type: string;
  name: string;
  description: string;
  url?: string;
  fileUrl?: string; // API might return this
  format?: string;
  size?: string;
}

interface FeedItem {
  id: string;
  type: 'post' | 'event';
  author?: string;
  content: string;
  timestamp: string | Date;
}

interface Course {
  uuid: string;
  name: string;
  description: string;
  created?: string | Date; // API might not return this, handled in template
  difficulty?: string;
  materials: Material[];
  quizzes: Quiz[];
  feed: FeedItem[];
}

const course = ref<Course>({
  uuid: '',
  name: "Načítání...",
  description: "",
  created: new Date(),
  materials: [],
  quizzes: [],
  feed: []
});

// Computed
const isTeacher = computed(() => {
  // Simple check for now based on local storage or hardcoded for demo
  return localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')!).role === 'lecturer' : false; 
});

// Methods
const formatDate = (date: any) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('cs-CZ').format(new Date(date));
};

const getMaterialIcon = (mat: any) => {
  if (mat.type === 'link') return '🔗';
  if (mat.format === 'pdf') return '📄';
  if (mat.format === 'mp4') return '🎥';
  return '📁';
};

const fileInput = ref<HTMLInputElement | null>(null);

const addMaterial = () => {
  const type = prompt("Chcete přidat odkaz (zadejte 'link') nebo soubor (zadejte 'file')?");
  if (!type) return;

  if (type.toLowerCase() === 'link') {
    const name = prompt("Zadejte název odkazu:");
    const url = prompt("Zadejte URL odkazu:");
    if (name && url) {
      addLink(name, url);
    }
  } else if (type.toLowerCase() === 'file') {
    fileInput.value?.click();
  } else {
    alert("Neplatná volba. Zadejte 'link' nebo 'file'.");
  }
};

const addLink = async (name: string, urlStr: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/${courseId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", name, url: urlStr })
    });
    if (!response.ok) throw new Error("Failed to add link");
    await fetchCourseData();
    alert("Odkaz byl úspěšně přidán.");
  } catch (e) {
    console.error("Error adding link:", e);
    alert("Nepodařilo se přidat odkaz.");
  }
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "file");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/${courseId}/materials`, {
         method: "POST",
         body: formData
      });
      if (!response.ok) throw new Error("Failed to upload file");
      await fetchCourseData();
      alert("Soubor byl úspěšně nahrán.");
    } catch (e) {
      console.error("Error uploading file:", e);
      alert("Nepodařilo se nahrát soubor.");
    } finally {
       if (fileInput.value) fileInput.value.value = "";
    }
  }
};

const openQuizModal = () => {
  showQuizModal.value = true;
};

const startQuiz = (quiz: Quiz) => {
  activeQuiz.value = quiz;
};

const editQuiz = (quiz: Quiz) => {
  // Populate modal with quiz data (requires Update to QuizModal to accept props)
  // For now, just a placeholder
  alert("Úprava kvízu: " + quiz.title);
};

const fetchCourseData = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/${courseId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch course');
    }
    const data = await response.json();
    
    course.value = {
      uuid: data.uuid,
      name: data.name,
      description: data.description,
      created: data.created ? new Date(data.created) : new Date(), 
      materials: data.materials.map((m: any) => ({
        ...m,
        id: m.uuid,
        url: m.url || m.fileUrl
      })),
      quizzes: data.quizzes.map((q: any) => ({
        ...q,
        id: q.uuid,
        attempts: q.attemptsCount || 0
      })),
      feed: [] 
    };
  } catch (e) {
    console.error('Error fetching course:', e);
    course.value.name = "Chyba při načítání kurzu";
    course.value.description = "Nepodařilo se načíst data kurzu.";
  }
};

const handleQuizSave = async (quizData: any) => {
  console.log("Saving quiz...", quizData);
  try {
    // Transform data for backend
    const payload = {
      title: quizData.title,
      questions: quizData.questions.map((q: any) => {
        const optionsText = q.options.map((o: any) => o.text);
        
        // Determine correct indices
        let correctIndex = undefined;
        let correctIndices = undefined;

        if (q.type === 'single') {
          correctIndex = q.options.findIndex((o: any) => o.isCorrect);
        } else {
          correctIndices = q.options
            .map((o: any, index: number) => o.isCorrect ? index : -1)
            .filter((i: number) => i !== -1);
        }

        return {
          type: q.type === 'single' ? 'singleChoice' : 'multipleChoice',
          question: q.text, // Backend expects 'question', frontend has 'text'
          options: optionsText,
          correctIndex,
          correctIndices
        };
      })
    };

    console.log("Transformed payload:", payload);

    const url = quizData.uuid 
      ? `${import.meta.env.VITE_API_URL}/courses/${courseId}/quizzes/${quizData.uuid}`
      : `${import.meta.env.VITE_API_URL}/courses/${courseId}/quizzes`;
      
    const method = quizData.uuid ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save quiz: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Refresh data and close modal
    await fetchCourseData();
    showQuizModal.value = false;
    alert("Kvíz byl úspěšně uložen.");

  } catch (e: any) {
    console.error("Error saving quiz:", e);
    alert(`Nepodařilo se uložit kvíz: ${e.message}`);
  }
};

onMounted(async () => {
  await fetchCourseData();
});
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.organic-btn {
  @apply font-bold rounded-lg shadow-sm transition-transform active:scale-95 border-2 border-transparent;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
</style>

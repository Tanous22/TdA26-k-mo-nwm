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
    <div class="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-8 relative z-20">
      
      <!-- Left Column: Materials & Feed -->
      <div class="lg:col-span-2 space-y-8">
        
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

      <!-- Right Column: Quizzes -->
      <div class="space-y-8">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-8">
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
      </div>
    </div>

    <!-- Modals -->
    <!-- Quiz Runner Overlay -->
    <div v-if="activeQuiz" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-slide-up">
        <QuizRunner 
          :quiz="activeQuiz" 
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
import QuizRunner from '../components/QuizRunner.vue';
import QuizModal from '../components/QuizModal.vue';

const route = useRoute();
const courseId = route.params.uuid;

// State
const activeQuiz = ref<any>(null);
const showQuizModal = ref(false);

// Mock Data
const course = ref<any>({
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
  return new Intl.DateTimeFormat('cs-CZ').format(new Date(date));
};

const getMaterialIcon = (mat: any) => {
  if (mat.type === 'link') return '🔗';
  if (mat.format === 'pdf') return '📄';
  if (mat.format === 'mp4') return '🎥';
  return '📁';
};

const addMaterial = () => {
  alert("Funkce přidání materiálu bude implementována.");
};

const openQuizModal = () => {
  showQuizModal.value = true;
};

const startQuiz = (quiz: any) => {
  activeQuiz.value = quiz;
};

const editQuiz = (quiz: any) => {
  // Populate modal with quiz data (requires Update to QuizModal to accept props)
  // For now, just a placeholder
  alert("Úprava kvízu: " + quiz.title);
};

const handleQuizSave = (quizData: any) => {
  // Mock save
  course.value.quizzes.unshift({
    id: crypto.randomUUID(),
    ...quizData,
    attempts: 0
  });
  
  // Add feed event
  course.value.feed.unshift({
    id: crypto.randomUUID(),
    type: 'event',
    content: `Nový kvíz: ${quizData.title}`,
    timestamp: new Date()
  });
  
  showQuizModal.value = false;
};

onMounted(async () => {
  // Simulator fetch delay
  setTimeout(() => {
    course.value = {
      uuid: courseId,
      name: "Úvod do programování",
      description: "Naučte se základy programování od úplného začátku. Kurz vhodný pro všechny bez předchozích zkušeností.",
      created: new Date('2024-01-15'),
      materials: [
        { id: 'm1', type: 'file', name: 'Základy syntaxe.pdf', description: 'PDF průvodce základními koncepty', format: 'pdf', size: '2.5 MB' },
        { id: 'm2', type: 'link', name: 'Online dokumentace', description: 'Oficiální dokumentace jazyka', url: 'https://docs.python.org' }
      ],
      quizzes: [
        {
          id: 'q1',
          title: 'Základní koncepty',
          questions: [
            { id: '1', text: 'Co je to proměnná?', type: 'single', options: [{ id: 'o1', text: 'Místo v paměti', isCorrect: true }, { id: 'o2', text: 'Funkce', isCorrect: false }] }
          ],
          attempts: 24
        }
      ],
      feed: [
        { id: 'f1', type: 'post', author: 'Lektor', content: 'Vítejte v kurzu! Těším se na společnou práci.', timestamp: new Date('2024-01-15') },
         { id: 'f2', type: 'event', content: 'Nový materiál: Základy syntaxe.pdf', timestamp: new Date('2024-01-16') }
      ]
    };
  }, 500);
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

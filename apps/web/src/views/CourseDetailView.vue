<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <div class="bg-gradient-to-r from-[#0070BB] to-[#6DD4B1] text-white p-12 shadow-lg relative overflow-hidden">
      <div class="max-w-7xl mx-auto relative z-10 text-center md:text-left">
        <router-link
          to="/courses"
          class="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg mb-6 transition-all backdrop-blur-sm"
        >
          <span>←</span> Zpět na kurzy
        </router-link>
        <div v-if="loading" class="animate-pulse space-y-4">
          <div class="h-12 bg-white/20 rounded w-1/3"></div>
          <div class="h-6 bg-white/20 rounded w-1/2"></div>
        </div>
        <div v-else-if="course">
          <h1 class="text-5xl font-bold mb-4">{{ course.name }}</h1>
          <p class="text-xl opacity-90 max-w-2xl">{{ course.description }}</p>
          <p class="mt-4 text-sm opacity-75">Obtížnost: {{ course.difficulty }}</p>
        </div>
      </div>
    </div>
    <div
      v-if="!loading && course"
      class="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 gap-8 -mt-8 relative z-20"
    >
      <div v-if="isTeacher" class="flex justify-end mb-2">
        <button @click="handleAddModule" class="organic-btn px-6 py-3 !bg-[#0070BB] !text-white hover:!bg-[#005a96] shadow-md">
          + Přidat nový modul
        </button>
      </div>

      <div v-if="!course.modules || course.modules.length === 0" class="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
        Zatím zde nejsou žádné moduly.
      </div>

      <div v-for="(module, index) in course.modules" :key="module.uuid" class="mb-12 space-y-8">
        
        <div class="border-b-2 border-gray-200 pb-4 mb-6 flex justify-between items-start">
          <div class="flex-1 mr-6">
            <h2 class="text-3xl font-bold text-gray-800">{{ module.title }}</h2>
            <p v-if="module.description" class="text-gray-500 mt-1 font-semibold">{{ module.description }}</p>
            
            <div class="mt-4">
              <div v-if="module.isEditingContent" class="space-y-3">
                <textarea 
                  v-model="module.editContentText" 
                  class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0070BB] outline-none" 
                  rows="5"
                  placeholder="Zadejte výukový text k tomuto modulu..."
                ></textarea>
                <div class="flex gap-2">
                  <button @click="saveModuleContent(module)" class="bg-[#0070BB] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#005a96]">Uložit text</button>
                  <button @click="module.isEditingContent = false" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">Zrušit</button>
                </div>
              </div>
              <div v-else>
                <p v-if="module.content" class="text-gray-700 whitespace-pre-wrap leading-relaxed">{{ module.content }}</p>
                <button 
                  v-if="isTeacher" 
                  @click="startEditingContent(module)" 
                  class="text-sm text-[#0070BB] hover:underline mt-2 font-semibold"
                >
                  {{ module.content ? '✎ Upravit text modulu' : '+ Přidat textový obsah modulu' }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end gap-3 min-w-[150px]">
            <div v-if="isTeacher" class="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm w-full justify-center">
              <button 
                @click="moveModule(index, -1)" 
                :disabled="index === 0"
                class="p-1 px-3 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Posunout nahoru"
              >
                ⬆️
              </button>
              <button 
                @click="moveModule(index, 1)" 
                :disabled="index === course.modules.length - 1"
                class="p-1 px-3 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Posunout dolů"
              >
                ⬇️
              </button>
            </div>

            <span v-if="!module.is_published && isTeacher" class="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold w-full text-center">
              Skryto
            </span>
            <button 
              v-if="isTeacher" 
              @click="toggleModuleVisibility(module)" 
              class="text-sm px-4 py-2 rounded-lg font-semibold transition-colors w-full text-center"
              :class="module.is_published ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-[#91F5AD] text-[#1A1A1A] hover:bg-green-300'"
            >
              {{ module.is_published ? 'Skrýt modul' : 'Publikovat modul' }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">📚 Studijní materiály</h3>
            <div v-if="isTeacher" class="flex gap-2">
              <button
                @click="handleAddLink(module.uuid)"
                class="organic-btn text-sm px-4 py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white"
              >
                + Odkaz
              </button>
              <button
                @click="triggerFileUpload(module.uuid)"
                :disabled="isUploading"
                class="organic-btn text-sm px-4 py-2 !bg-[#0070BB] !text-white hover:!bg-[#005a96] disabled:opacity-50"
              >
                {{ isUploading ? 'Nahrávám...' : '+ Soubor' }}
              </button>
            </div>
          </div>
          <div
            v-if="!module.materials || module.materials.length === 0"
            class="text-center py-12 text-gray-400"
          >
            Zatím nejsou k dispozici žádné materiály
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="mat in module.materials"
              :key="mat.uuid"
              class="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-[#91F5AD] hover:bg-green-50/30 transition-all cursor-pointer bg-gray-50"
            >
              <div class="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-2xl">
                {{ getMaterialIcon(mat) }}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 truncate">{{ mat.name }}</h4>
                <p class="text-sm text-gray-500 truncate">{{ mat.description }}</p>
              </div>
              <div class="flex items-center gap-4">
                <span v-if="isTeacher" class="text-xs text-gray-400 font-semibold bg-gray-200 px-2 py-1 rounded">
                  Zobrazeno: {{ mat.viewCount || 0 }}x
                </span>
                <button
                  v-if="mat.type === 'url'"
                  @click="openMaterial(mat)"
                  class="text-[#0070BB] font-semibold text-sm hover:underline"
                >
                  Otevřít →
                </button>
                <button
                  v-else-if="mat.type === 'file'"
                  @click="openMaterial(mat)"
                  class="text-[#0070BB] font-semibold text-sm hover:underline"
                >
                  Stáhnout ↓
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">✏️ Kvízy</h3>
            <button
              v-if="isTeacher"
              @click="openQuizModal(module.uuid)"
              class="organic-btn text-sm px-4 py-2 !bg-[#FFD93D] !text-[#1A1A1A] hover:!bg-[#E6C200]"
            >
              + Nový
            </button>
          </div>
          <div
            v-if="!module.quizzes || module.quizzes.length === 0"
            class="text-center py-12 text-gray-400"
          >
            Zatím žádné kvízy
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="quiz in module.quizzes"
              :key="quiz.uuid"
              class="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-lg text-gray-800">{{ quiz.title }}</h4>
                <div class="flex flex-col items-end">
                  <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mb-1">
                    {{ quiz.questions.length }} otázek
                  </span>
                  <span class="text-xs text-gray-400">
                    Pokusů: {{ quiz.attemptsCount || 0 }}
                  </span>
                </div>
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
                <button
                  v-if="isTeacher"
                  @click="openDeleteModal(quiz.uuid)"
                  class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      @change="handleFileUpload"
    />

    <div
      v-if="activeQuiz"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-slide-up">
        <QuizRunner
          :quiz="activeQuiz"
          :courseId="courseId"
          @close="handleQuizClose"
          @cancel="activeQuiz = null"
        />
      </div>
    </div>
    
    <QuizModal
      :show="showQuizModal"
      :edit-mode="!!editingQuiz"
      :initial-data="editingQuiz"
      @close="closeQuizModal"
      @save="handleQuizSave"
    />
    
    <ConfirmationModal
      :show="showDeleteModal"
      title="Opravdu chcete smazat tento kvíz?"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuizRunner, { type Quiz } from '../components/QuizRunner.vue'
import QuizModal from '../components/QuizModal.vue'
import ConfirmationModal from '../components/ConfirmationModal.vue'
import { useAuth } from '../composables/useAuth'
import { useNotifications } from '../composables/useNotifications'
import {
  transformQuestionToFrontend,
  transformQuestionToBackend,
  getMaterialIcon,
  type Course,
} from '../composables/useModels'

const route = useRoute()
const router = useRouter()
const { isTeacher } = useAuth()
const { success, error: showError } = useNotifications()
const courseId = (route.params.courseId || route.params.uuid) as string
const API_URL = import.meta.env.VITE_API_URL || '/api'

const loading = ref(true)
const course = ref<Course | null>(null)
const activeQuiz = ref<Quiz | null>(null)
const showQuizModal = ref(false)
const editingQuiz = ref<any>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const showDeleteModal = ref(false)
const quizIdToDelete = ref<string | null>(null)
const isUploading = ref(false)
const activeModuleId = ref<string | null>(null)

const fetchCourse = async () => {
  try {
    loading.value = true
    const response = await fetch(`${API_URL}/courses/${courseId}`)
    if (!response.ok) throw new Error('Failed to fetch course')
    const data = await response.json()

    if (!isTeacher.value) {
      const isPaused = Boolean(data.isPaused);
      const isScheduled = data.publishedAt && new Date(data.publishedAt) > new Date();
      if (isPaused || isScheduled) {
        showError('Tento kurz momentálně není přístupný.');
        router.push('/courses');
        return;
      }
      data.modules = data.modules.filter((m: any) => m.is_published);
    }
    course.value = data
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Nepodařilo se načíst kurz')
    course.value = null
  } finally {
    loading.value = false
  }
}

const moveModule = async (index: number, direction: number) => {
  if (!course.value || !course.value.modules) return
  
  const newModules = [...course.value.modules]
  const targetIndex = index + direction; // TADY JE ZÁSADNÍ STŘEDNÍK!
  
  // Moderní ES6 prohození prvků pole (s vykřičníky pro TypeScript)
  [newModules[index], newModules[targetIndex]] = [newModules[targetIndex]!, newModules[index]!];
  
  try {
    loading.value = true
    
    const promises = newModules.map((mod, i) => {
      return fetch(`${API_URL}/modules/${mod.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_index: i + 1 })
      })
    })
    
    await Promise.all(promises)
    
    success('Pořadí bylo upraveno')
    await fetchCourse()
  } catch (err) {
    showError('Nepodařilo se změnit pořadí')
  } finally {
    loading.value = false
  }
}

const startEditingContent = (module: any) => {
  module.isEditingContent = true
  module.editContentText = module.content || ''
}

const saveModuleContent = async (module: any) => {
  try {
    const response = await fetch(`${API_URL}/modules/${module.uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: module.editContentText })
    })
    if (!response.ok) throw new Error('Chyba uložení textu')
    module.content = module.editContentText
    module.isEditingContent = false
    success('Text modulu byl úspěšně uložen')
  } catch(e) {
    showError('Nepodařilo se uložit text modulu')
  }
}

const openMaterial = async (mat: any) => {
  if (mat.type === 'url' && mat.url) {
    window.open(mat.url, '_blank')
  } else if (mat.type === 'file' && mat.fileUrl) {
    const link = document.createElement('a')
    link.href = mat.fileUrl
    link.download = mat.name || 'download'
    link.target = '_blank'
    link.click()
  }

  try {
    await fetch(`${API_URL}/courses/${courseId}/materials/${mat.uuid}/view`, { method: 'POST' })
    mat.viewCount = (mat.viewCount || 0) + 1 
  } catch (e) {
    console.error('Nepodařilo se započítat statistiku', e)
  }
}

const handleAddModule = async () => {
  const nextOrder = course.value?.modules ? course.value.modules.length + 1 : 1
  const title = prompt('Zadejte název nového modulu:', `Modul ${nextOrder}`)
  if (!title) return
  const description = prompt('Zadejte krátký popis modulu (volitelné):', '')

  try {
    loading.value = true
    const response = await fetch(`${API_URL}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId,
        title,
        description,
        order_index: nextOrder
      }),
    })
    if (!response.ok) throw new Error('Nepodařilo se vytvořit modul')
    success('Modul byl úspěšně vytvořen')
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při vytváření modulu')
  } finally {
    loading.value = false
  }
}

const toggleModuleVisibility = async (module: any) => {
  try {
    const response = await fetch(`${API_URL}/modules/${module.uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_published: !module.is_published
      }),
    })
    if (!response.ok) throw new Error('Nepodařilo se upravit modul')
    success(module.is_published ? 'Modul byl skryt' : 'Modul byl publikován')
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při úpravě modulu')
  }
}

const handleAddLink = async (moduleId: string) => {
  const url = prompt('Zadejte URL odkazu:')
  if (!url) return
  const name = prompt('Zadejte název odkazu:', 'Nový odkaz')
  if (!name) return
  try {
    loading.value = true
    const response = await fetch(`${API_URL}/courses/${courseId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId,
        type: 'url',
        name,
        url,
        description: '',
      }),
    })
    if (!response.ok) throw new Error('Failed to add material')
    success('Odkaz byl přidán')
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při přidávání odkazu')
  } finally {
    loading.value = false
  }
}

const triggerFileUpload = (moduleId: string) => {
  activeModuleId.value = moduleId
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !activeModuleId.value) return
  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('moduleId', activeModuleId.value)
    formData.append('file', file)
    formData.append('type', 'file')
    formData.append('name', file.name)
    formData.append('description', '')
    
    const response = await fetch(`${API_URL}/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to upload file')
    success('Soubor byl úspěšně nahrán')
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při nahrávání souboru')
  } finally {
    isUploading.value = false
    activeModuleId.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

const openQuizModal = (moduleId: string) => {
  activeModuleId.value = moduleId
  editingQuiz.value = null
  showQuizModal.value = true
}

const closeQuizModal = () => {
  showQuizModal.value = false
  editingQuiz.value = null
  activeModuleId.value = null
}

const startQuiz = (quiz: any) => {
  const formattedQuestions = (quiz.questions || []).map(transformQuestionToFrontend)
  activeQuiz.value = {
    ...quiz,
    questions: formattedQuestions,
  }
}

const editQuiz = async (quiz: any) => {
  try {
    const response = await fetch(`${API_URL}/courses/${courseId}/quizzes/${quiz.uuid}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const backendData = await response.json()
    const formattedQuestions = (backendData.questions || []).map(transformQuestionToFrontend)
    editingQuiz.value = {
      ...backendData,
      questions: formattedQuestions,
    }
    await nextTick()
    showQuizModal.value = true
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při načítání kvízu')
  }
}

const openDeleteModal = (quizUuid: string) => {
  quizIdToDelete.value = quizUuid
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!quizIdToDelete.value) return
  try {
    const response = await fetch(`${API_URL}/courses/${courseId}/quizzes/${quizIdToDelete.value}`, { method: 'DELETE' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    success('Kvíz byl úspěšně smazán')
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při mazání kvízu')
  } finally {
    showDeleteModal.value = false
    quizIdToDelete.value = null
  }
}

const handleQuizSave = async (quizData: any) => {
  try {
    const backendQuestions = quizData.questions.map(transformQuestionToBackend)
    const payload = {
      moduleId: activeModuleId.value,
      title: quizData.title,
      questions: backendQuestions,
      scheduledAt: quizData.scheduledAt || null,
      scheduledEnd: quizData.scheduledEnd || null,
      durationMinutes: quizData.durationMinutes || null,
      publishedAt: quizData.publishedAt || null,
    }
    const url = editingQuiz.value
      ? `${API_URL}/courses/${courseId}/quizzes/${editingQuiz.value.uuid}`
      : `${API_URL}/courses/${courseId}/quizzes`
    const method = editingQuiz.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    success('Kvíz byl úspěšně uložen')
    closeQuizModal()
    await fetchCourse()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Chyba při ukládání kvízu')
  }
}

const handleQuizClose = async () => {
  activeQuiz.value = null
  await fetchCourse() // Načte znovu kurz a obnoví se díky tomu statistiky pokusů!
}

onMounted(() => {
  fetchCourse()
})
</script>
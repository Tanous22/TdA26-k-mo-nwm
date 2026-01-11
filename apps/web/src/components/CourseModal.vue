<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="organic-box bg-white p-8 max-w-lg w-full relative animate-bounce-in max-h-[90vh] overflow-y-auto">
        <button 
          @click="close" 
          class="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl"
        >
          &times;
        </button>
        
        <h2 class="text-2xl font-extrabold mb-6 text-[#0070BB]">
          {{ isEditing ? 'Upravit kurz' : 'Vytvořit nový kurz' }}
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
            >
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold mb-1 text-sm">Kategorie</label>
              <select v-model="formData.category" class="organic-select bg-white">
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1 text-sm">Obtížnost</label>
              <select v-model="formData.difficulty" class="organic-select bg-white">
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
            <label class="block font-bold mb-2 text-sm text-[#0257A5]">Správa materiálů</label>
            
            <!-- Seznam existujících materiálů -->
            <ul v-if="formData.materials && formData.materials.length > 0" class="space-y-2 mb-3">
              <li 
                v-for="(mat, index) in formData.materials" 
                :key="index" 
                class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
              >
                <span class="text-sm font-semibold truncate">{{ mat }}</span>
                <button 
                  type="button" 
                  @click="removeMaterial(index)" 
                  class="text-red-500 hover:text-red-700 p-1"
                >
                  ✕
                </button>
              </li>
            </ul>
            <p v-else class="text-sm text-gray-400 italic mb-3">Žádné materiály.</p>

            <!-- Přidání nového materiálu -->
            <div class="flex gap-2">
              <input 
                v-model="newMaterialInput" 
                @keydown.enter.prevent="addMaterial" 
                type="text" 
                class="organic-input !py-2 !text-sm" 
                placeholder="Název souboru (např. Slides.pdf)"
              >
              <button 
                type="button" 
                @click="addMaterial" 
                class="organic-btn secondary !py-2 !px-3"
              >
                +
              </button>
            </div>
          </div>

          <div class="pt-4">
            <button type="submit" class="organic-btn w-full text-lg py-3">
              {{ isEditing ? 'Uložit změny' : 'Vytvořit kurz' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

interface Course {
  uuid?: string
  name: string
  description: string
  category?: string
  difficulty?: string
  materials?: string[]
}

const props = defineProps<{
  show: boolean
  course?: Course | null
  categories: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [course: Course, isEditing: boolean]
}>()

const isEditing = ref(false)
const newMaterialInput = ref('')

const formData = reactive<Course>({
  name: '',
  description: '',
  category: 'Programování',
  difficulty: 'Začátečník',
  materials: []
})

// Define resetForm BEFORE watch so it can be called
const resetForm = () => {
  isEditing.value = false
  formData.uuid = undefined
  formData.name = ''
  formData.description = ''
  formData.category = 'Programování'
  formData.difficulty = 'Začátečník'
  formData.materials = []
  newMaterialInput.value = ''
}

// Now watch can safely call resetForm
watch(() => props.course, (newCourse) => {
  if (newCourse) {
    isEditing.value = true
    formData.uuid = newCourse.uuid
    formData.name = newCourse.name
    formData.description = newCourse.description
    formData.category = newCourse.category || 'Programování'
    formData.difficulty = newCourse.difficulty || 'Začátečník'
    formData.materials = [...(newCourse.materials || [])]
  } else {
    resetForm()
  }
}, { immediate: true })

const addMaterial = () => {
  if (newMaterialInput.value.trim()) {
    formData.materials!.push(newMaterialInput.value.trim())
    newMaterialInput.value = ''
  }
}

const removeMaterial = (index: number) => {
  formData.materials!.splice(index, 1)
}

const saveCourse = () => {
  emit('save', { ...formData }, isEditing.value)
  resetForm()
}

const close = () => {
  emit('close')
  resetForm()
}
</script>

<style scoped>
</style>

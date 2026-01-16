<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">💬 Feed kurzu</h2>
    <div v-if="isTeacher" class="mb-6 pb-6 border-b-2 border-dashed border-gray-200">
      <div class="flex gap-2">
        <input
          v-model="newMessage"
          @keydown.enter="sendMessage"
          type="text"
          placeholder="Přidej zprávu do feedu..."
          class="organic-input flex-1"
        />
        <button
          @click="sendMessage"
          :disabled="!newMessage.trim() || isSending"
          class="organic-btn px-6 py-2 !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white disabled:opacity-50"
        >
          {{ isSending ? "Odesílám..." : "Poslat" }}
        </button>
      </div>
      <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
    </div>
    <div v-if="loading" class="text-center py-8 text-gray-400">
      Načítám feed...
    </div>
    <div v-else-if="feedMessages.length === 0" class="text-center py-8 text-gray-400">
      Zatím žádné zprávy. Buď první!
    </div>
    <div v-else class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      <div
        v-for="msg in feedMessages"
        :key="msg.uuid"
        class="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-[#91F5AD] transition-colors"
        :class="msg.type === 'system' ? 'bg-blue-50 border-blue-100' : ''"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span v-if="msg.type === 'system'" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                SYSTÉM
              </span>
              <span v-else class="text-sm font-semibold text-gray-700">
                {{ msg.author || "Anonym" }}
              </span>
              <span class="text-xs text-gray-400">
                {{ formatTime(msg.createdAt) }}
              </span>
              <span v-if="msg.edited" class="text-xs text-gray-400 italic">(upraveno)</span>
            </div>
            <p class="text-gray-700">{{ msg.message }}</p>
          </div>
          <button
            v-if="isTeacher || msg.author === currentUserName"
            @click="deleteMessage(msg.uuid)"
            class="text-gray-300 hover:text-red-500 transition-colors"
            title="Smazat"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    <div v-if="isTeacher" class="mt-4 text-xs text-gray-400 text-center">
      {{ isStreamConnected ? "✅ Live" : "⚠️ Odpojeno" }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotifications } from '../composables/useNotifications'
import { useApi } from '../composables/useApi'
const props = defineProps<{
  courseId: string
}>()
const { user, isTeacher } = useAuth()
const { success, error: showError } = useNotifications()
const { API_URL } = useApi()
const feedMessages = ref<any[]>([])
const newMessage = ref('')
const loading = ref(true)
const isSending = ref(false)
const error = ref('')
const isStreamConnected = ref(false)
let eventSource: EventSource | null = null
const currentUserName = computed(() => user.value?.name || '')
const loadFeed = async () => {
  try {
    const response = await fetch(`${API_URL}/courses/${props.courseId}/feed`)
    if (!response.ok) throw new Error('Failed to load feed')
    const data = await response.json()
    feedMessages.value = data
  } catch (err) {
    showError(
      err instanceof Error ? err.message : 'Chyba při načítání feedu'
    )
  } finally {
    loading.value = false
  }
}
const connectStream = () => {
  try {
    eventSource = new EventSource(
      `${API_URL}/courses/${props.courseId}/feed/stream`
    )
    eventSource.onopen = () => {
      isStreamConnected.value = true
    }
    eventSource.onmessage = (event) => {
      try {
        const newMsg = JSON.parse(event.data)
        if (newMsg.type === 'delete') {
          feedMessages.value = feedMessages.value.filter(
            (m) => m.uuid !== newMsg.uuid
          )
        } else {
          const index = feedMessages.value.findIndex(
            (m) => m.uuid === newMsg.uuid
          )
          if (index >= 0) {
            feedMessages.value[index] = newMsg
          } else {
            feedMessages.value.unshift(newMsg)
          }
        }
      } catch (err) {
        console.error('Feed parse error:', err)
      }
    }
    eventSource.onerror = () => {
      isStreamConnected.value = false
      eventSource?.close()
      setTimeout(connectStream, 3000)
    }
  } catch (err) {
    console.error('Stream connection error:', err)
  }
}
const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return
  isSending.value = true
  error.value = ''
  try {
    const response = await fetch(`${API_URL}/courses/${props.courseId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: newMessage.value,
        author: user.value?.name || 'Anonym',
      }),
    })
    if (!response.ok) throw new Error('Failed to send message')
    newMessage.value = ''
    success('Zpráva odeslána')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chyba při odesílání'
    showError(error.value)
  } finally {
    isSending.value = false
  }
}
const deleteMessage = async (uuid: string) => {
  if (!confirm('Opravdu smazat zprávu?')) return
  try {
    const response = await fetch(
      `${API_URL}/courses/${props.courseId}/feed/${uuid}`,
      { method: 'DELETE' }
    )
    if (!response.ok) throw new Error('Failed to delete message')
    feedMessages.value = feedMessages.value.filter((m) => m.uuid !== uuid)
    success('Zpráva smazána')
  } catch (err) {
    showError(
      err instanceof Error ? err.message : 'Chyba při mazání zprávy'
    )
  }
}
const formatTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('cs-CZ', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
onMounted(() => {
  loadFeed()
  connectStream()
})
onUnmounted(() => {
  eventSource?.close()
})
</script>
<style scoped>
</style>

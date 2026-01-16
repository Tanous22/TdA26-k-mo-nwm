<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">💬 Feed kurzu</h2>

    <!-- Formulář pro přidání zprávy (pouze pro lektory) -->
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

    <!-- Výpis zpráv -->
    <div v-if="loading" class="text-center py-8 text-gray-400">
      Načítám feed...
    </div>

    <div v-else-if="feedMessages.length === 0" class="text-center py-8 text-gray-400">
      Zatím žádné zprávy. Buď první!
    </div>

    <div v-else class="space-y-4">
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

          <!-- Smazání (pouze pro autora nebo lektory) -->
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

    <!-- SSE Stream status -->
    <div v-if="isTeacher" class="mt-4 text-xs text-gray-400 text-center">
      {{ isStreamConnected ? "✅ Live" : "⚠️ Odpojeno" }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useAuth } from "../composables/useAuth";

const props = defineProps<{
  courseId: string;
}>();

const { user } = useAuth();
const apiUrl = import.meta.env.VITE_API_URL || "/api";

const feedMessages = ref<any[]>([]);
const newMessage = ref("");
const loading = ref(true);
const isSending = ref(false);
const error = ref("");
const isStreamConnected = ref(false);
let eventSource: EventSource | null = null;

const isTeacher = computed(() => 
  user.value?.name?.toLowerCase().includes("lektor") || user.value?.email === "lektor@example.com"
);

const currentUserName = computed(() => user.value?.name || "");

// Načtení feedu
const loadFeed = async () => {
  try {
    const res = await fetch(`${apiUrl}/courses/${props.courseId}/feed`);
    if (!res.ok) throw new Error("Failed to load feed");
    const data = await res.json();
    feedMessages.value = data;
    loading.value = false;
  } catch (e) {
    console.error("[FeedPanel] Load feed error:", e);
    loading.value = false;
  }
};

// Připojení k SSE streamu
const connectStream = () => {
  try {
    eventSource = new EventSource(
      `${apiUrl}/courses/${props.courseId}/feed/stream`
    );

    eventSource.onopen = () => {
      console.log("[FeedPanel] Stream connected");
      isStreamConnected.value = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const newMsg = JSON.parse(event.data);
        console.log("[FeedPanel] New message from stream:", newMsg);

        // Pokud je to delete event, smazat zprávu
        if (newMsg.type === "delete") {
          feedMessages.value = feedMessages.value.filter(m => m.uuid !== newMsg.uuid);
        } else {
          // Přidat nebo aktualizovat zprávu
          const index = feedMessages.value.findIndex(m => m.uuid === newMsg.uuid);
          if (index >= 0) {
            feedMessages.value[index] = newMsg;
          } else {
            feedMessages.value.unshift(newMsg);
          }
        }
      } catch (e) {
        console.error("[FeedPanel] Parse error:", e);
      }
    };

    eventSource.onerror = () => {
      console.log("[FeedPanel] Stream disconnected");
      isStreamConnected.value = false;
      eventSource?.close();
      // Pokus o znovu připojení za 3 sekundy
      setTimeout(connectStream, 3000);
    };
  } catch (e) {
    console.error("[FeedPanel] Stream error:", e);
  }
};

// Odeslání zprávy
const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return;

  isSending.value = true;
  error.value = "";

  try {
    const res = await fetch(`${apiUrl}/courses/${props.courseId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: newMessage.value,
        author: user.value?.name || "Anonym",
      }),
    });

    if (!res.ok) throw new Error("Failed to send message");

    newMessage.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Chyba při odesílání";
    console.error("[FeedPanel] Send error:", e);
  } finally {
    isSending.value = false;
  }
};

// Smazání zprávy
const deleteMessage = async (uuid: string) => {
  if (!confirm("Opravdu smazat zprávu?")) return;

  try {
    const res = await fetch(`${apiUrl}/courses/${props.courseId}/feed/${uuid}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete message");

    console.log("[FeedPanel] Message deleted");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Chyba při mazání";
    console.error("[FeedPanel] Delete error:", e);
  }
};

// Formátování času
const formatTime = (date: string) => {
  try {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Právě teď";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return d.toLocaleDateString("cs-CZ");
  } catch {
    return new Date(date).toLocaleString("cs-CZ");
  }
};

onMounted(() => {
  loadFeed();
  connectStream();
});

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
  }
});
</script>

<style scoped>
.organic-input {
  @apply border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#0070BB] transition-colors;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

.organic-btn {
  @apply font-bold rounded-lg shadow-sm transition-transform active:scale-95 border-2 border-transparent;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
</style>

<template>
  <div class="flex justify-center items-center min-h-[70vh]">
    <div
      class="organic-box p-10 max-w-md w-full bg-white shadow-xl relative z-10"
    >
      <div class="flex flex-col items-center mb-6">
        <div
          class="w-16 h-16 bg-[#0070BB] rounded-full flex items-center justify-center text-white mb-4 p-3"
        >
          <img
            src="@/assets/PNG/Think-different-Academy_LOGO_bily.png"
            alt="Logo"
            class="w-full h-full object-contain"
          />
        </div>
        <h2 class="text-3xl font-extrabold text-[#1A1A1A]">Vítej zpět</h2>
        <p class="text-gray-500 font-semibold mt-2">Přihlášení pro lektory</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div
          v-if="loginError"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center error-shake"
          role="alert"
        >
          <span class="block sm:inline font-bold">{{ loginError }}</span>
        </div>

        <div>
          <label
            class="block font-bold mb-2 ml-2 text-sm uppercase text-gray-600"
            >Jméno</label
          >
          <input
            v-model="loginForm.username"
            type="text"
            class="organic-input"
            placeholder="Uživatelské jméno"
            required
          />
        </div>
        <div>
          <label
            class="block font-bold mb-2 ml-2 text-sm uppercase text-gray-600"
            >Heslo</label
          >
          <input
            v-model="loginForm.password"
            type="password"
            class="organic-input"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          class="organic-btn w-full text-lg py-3 mt-4 bg-[#0070BB] hover:bg-[#0257A5]"
        >
          Vstoupit do systému
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";

const emit = defineEmits<{
  login: [user: { name: string; role: string }];
}>();

const router = useRouter();
const loginError = ref("");
const loginForm = reactive({
  username: "",
  password: "",
});

const handleLogin = () => {
  loginError.value = "";

  // Demo credentials
  if (
    loginForm.username.trim() === "lecturer" &&
    loginForm.password.trim() === "TdA26!"
  ) {
    const user = { name: "Lektor", role: "admin" };
    emit("login", user);
    router.push("/dashboard");
  } else {
    loginError.value = "Chybné jméno nebo heslo. Zkus to znovu.";
  }
};
</script>

<style scoped></style>

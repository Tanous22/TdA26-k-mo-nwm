<template>
  <header
    class="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b-2 border-transparent shadow-sm"
  >
    <router-link
      to="/"
      class="text-2xl font-extrabold text-[#0257A5] uppercase tracking-wide cursor-pointer flex items-center gap-2"
    >
      <div class="h-10 w-auto flex items-center">
        <img
          src="@/assets/Think-different-Academy_LOGO_erb.png"
          alt="Think Different Academy Logo"
          class="h-full w-auto object-contain"
        />
      </div>
      Think Different Academy
    </router-link>

    <nav class="hidden md:flex gap-8 items-center">
      <router-link to="/" :class="navLinkClass('home')"> Domů </router-link>
      <router-link to="/courses" :class="navLinkClass('courses')">
        Kurzy
      </router-link>
      <router-link
        v-if="user && isTeacher"
        to="/dashboard"
        :class="navLinkClass('dashboard')"
      >
        Dashboard
      </router-link>
    </nav>

    <div class="flex gap-4 items-center">
      <span v-if="user" class="text-sm text-gray-600 font-semibold">
        {{ user.name }}
        <span v-if="isTeacher" class="text-xs bg-[#91F5AD] text-[#1A1A1A] px-2 py-1 rounded-full ml-2">
          Lektor
        </span>
      </span>
      <router-link
        v-if="!user"
        to="/login"
        class="organic-btn text-sm px-6 py-2"
      >
        Přihlásit
      </router-link>
      <button
        v-else
        @click="logout"
        class="organic-btn secondary text-sm px-6 py-2"
      >
        Odhlásit
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";

const route = useRoute();
const router = useRouter();
const { user, isTeacher, logout: authLogout } = useAuth();

const navLinkClass = (viewName: string) => {
  const base =
    "font-bold text-lg uppercase tracking-wide transition-colors decoration-2 underline-offset-4 no-underline";
  const isActive = route.name === viewName;
  if (isActive) return `${base} text-[#0070BB] underline`;
  return `${base} text-[#1A1A1A] hover:text-[#0070BB]`;
};

const logout = async () => {
  await authLogout();
  router.push("/login");
};
</script>

<style scoped>
.router-link-active {
  /* handled by navLinkClass */
}
</style>

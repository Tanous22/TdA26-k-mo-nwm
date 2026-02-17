<template>
  <header
    class="sticky top-0 z-50 px-4 md:px-6 py-4 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b-2 border-transparent shadow-sm"
  >
    <router-link
      to="/"
      class="text-xl md:text-2xl font-extrabold text-[#0257A5] uppercase tracking-wide cursor-pointer flex items-center gap-2"
    >
      <div class="h-8 md:h-10 w-auto flex items-center">
        <img
          src="@/assets/Think-different-Academy_LOGO_erb.png"
          alt="Think Different Academy Logo"
          class="h-full w-auto object-contain"
        />
      </div>
      <span class="hidden sm:inline">Think Different Academy</span>
      <span class="sm:hidden">TDA</span>
    </router-link>
    <nav class="hidden md:flex gap-8 items-center">
      <router-link to="/" :class="navLinkClass('home')"> Domů </router-link>
      <router-link to="/courses" :class="navLinkClass('courses')">
        Kurzy
      </router-link>
      <router-link to="/archive" :class="navLinkClass('archive')">
        Archiv
      </router-link>
      <router-link
        v-if="user && isTeacher"
        to="/dashboard"
        :class="navLinkClass('dashboard')"
      >
        Dashboard
      </router-link>
    </nav>
    
    <button
      @click="mobileMenuOpen = !mobileMenuOpen"
      class="md:hidden p-2 text-[#0257A5]"
    >
      <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>

    <div class="hidden md:flex gap-4 items-center relative">
      <!-- Bell Notification Icon (only on course pages) -->
      <button
        v-if="user && currentCourseId"
        @click="feedPopoverOpen = !feedPopoverOpen"
        class="p-2 text-[#0257A5] hover:bg-gray-100 rounded-lg transition-colors relative"
        title="Feed kurzu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
      </button>

      <!-- Feed Popover -->
      <div
        v-if="feedPopoverOpen && user && currentCourseId"
        class="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
      >
        <FeedPanel :courseId="currentCourseId" />
      </div>

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
  
  <div
    v-if="mobileMenuOpen"
    @click="mobileMenuOpen = false"
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
  ></div>
  
  <div
    :class="[
      'fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 md:hidden',
      mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
    ]"
  >
    <div class="p-6 space-y-6">
      <div v-if="user" class="pb-4 border-b border-gray-200">
        <p class="font-bold text-[#0257A5]">{{ user.name }}</p>
        <span v-if="isTeacher" class="text-xs bg-[#91F5AD] text-[#1A1A1A] px-2 py-1 rounded-full inline-block mt-2">
          Lektor
        </span>
      </div>
      
      <nav class="flex flex-col gap-4">
        <router-link 
          to="/" 
          @click="mobileMenuOpen = false"
          class="font-bold text-lg text-[#1A1A1A] hover:text-[#0070BB]"
        >
          Domů
        </router-link>
        <router-link 
          to="/courses" 
          @click="mobileMenuOpen = false"
          class="font-bold text-lg text-[#1A1A1A] hover:text-[#0070BB]"
        >
          Kurzy
        </router-link>
        <router-link 
          to="/archive" 
          @click="mobileMenuOpen = false"
          class="font-bold text-lg text-[#1A1A1A] hover:text-[#0070BB]"
        >
          Archiv
        </router-link>
        <router-link
          v-if="user && isTeacher"
          to="/dashboard"
          @click="mobileMenuOpen = false"
          class="font-bold text-lg text-[#1A1A1A] hover:text-[#0070BB]"
        >
          Dashboard
        </router-link>
      </nav>
      
      <div class="pt-4 border-t border-gray-200">
        <router-link
          v-if="!user"
          to="/login"
          @click="mobileMenuOpen = false"
          class="organic-btn text-sm px-6 py-2 w-full block text-center"
        >
          Přihlásit
        </router-link>
        <button
          v-else
          @click="logout(); mobileMenuOpen = false"
          class="organic-btn secondary text-sm px-6 py-2 w-full"
        >
          Odhlásit
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import FeedPanel from "./FeedPanel.vue";

const route = useRoute();
const router = useRouter();
const { user, isTeacher, logout: authLogout } = useAuth();
const mobileMenuOpen = ref(false);
const feedPopoverOpen = ref(false);

// Get the current course ID from the route, default to the first available course
const currentCourseId = computed(() => {
  return (route.params.courseId as string) || "";
});

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


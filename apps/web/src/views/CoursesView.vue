<template>
  <div>
    <div class="flex flex-col md:flex-row gap-8 mb-12">
      <aside class="md:w-1/4 space-y-8 sticky top-24 h-fit">
        <div>
          <input
            v-model="searchQuery"
            type="text"
            class="organic-input"
            placeholder="Co hledáš?"
          />
        </div>
        <div>
          <h3
            class="text-2xl font-bold text-[#0257A5] mb-4 uppercase -rotate-2"
          >
            Kategorie
          </h3>
          <div class="space-y-2">
            <div
              v-for="cat in categories"
              :key="cat"
              @click="activeCategory = cat"
              class="cursor-pointer px-4 py-2 font-bold transition-all border-2 border-transparent hover:border-[#91F5AD] rounded-r-full"
              :class="{
                'bg-[#91F5AD]/30 text-[#0257A5] translate-x-2':
                  activeCategory === cat,
              }"
            >
              {{ cat }}
            </div>
          </div>
        </div>
      </aside>

      <div
        class="md:w-3/4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12"
      >
        <div
          v-if="loading"
          class="col-span-full text-center text-gray-500 font-bold"
        >
          Načítání kurzů...
        </div>
        <div
          v-else-if="error"
          class="col-span-full text-center text-red-500 font-bold"
        >
          {{ error }}
        </div>
        <div
          v-else-if="filteredCourses.length === 0"
          class="col-span-full text-center text-gray-500 font-bold py-12"
        >
          Zatím žádné kurzy
        </div>
        <CourseCard
          v-else
          v-for="(course, index) in filteredCourses"
          :key="course.uuid"
          :course="course"
          :index="index"
          @view-course="viewCourse"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import CourseCard from "../components/CourseCard.vue";

interface Course {
  uuid: string;
  name: string;
  description: string;
  difficulty?: string;
  color?: string;
  category?: string;
}

const searchQuery = ref("");
const router = useRouter();
const activeCategory = ref("Všechny");
const categories = [
  "Všechny",
  "Programování",
  "Design & Art",
  "Marketing",
  "Soft Skills",
];
const courses = ref<Course[]>([]);
const loading = ref(true);
const error = ref("");

const filteredCourses = computed(() => {
  return courses.value.filter((c) => {
    const matchesSearch = c.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase());
    const matchesCat =
      activeCategory.value === "Všechny" || c.category === activeCategory.value;
    return matchesSearch && matchesCat;
  });
});

const fetchCourses = async () => {
  try {
    loading.value = true;
    error.value = "";
    const response = await fetch(`${import.meta.env.VITE_API_URL}/courses`);
    if (!response.ok) throw new Error("Failed to fetch courses");
    const data = await response.json();

    // Přidáme defaultní hodnoty pro vizuální zobrazení
    courses.value = data.map((course: any, index: number) => ({
      uuid: course.uuid,
      name: course.name,
      description: course.description,
      difficulty:
        course.difficulty || ["Začátečník", "Pokročilý", "Expert"][index % 3],
      color: ["#91F5AD", "#0070BB", "#FF6B6B", "#FFD93D"][index % 4],
      category: course.category || categories[1 + (index % 4)],
    }));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Nepodařilo se načíst kurzy";
    console.error("Error fetching courses:", err);
  } finally {
    loading.value = false;
  }
};

const viewCourse = (course: Course) => {
  router.push({ name: "course-detail", params: { uuid: course.uuid } });
};

onMounted(() => {
  fetchCourses();
});
</script>

<style scoped></style>

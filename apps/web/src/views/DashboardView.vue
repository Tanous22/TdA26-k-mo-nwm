<template>
  <div>
    <div
      class="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4"
    >
      <div>
        <h1 class="text-4xl font-extrabold text-[#1A1A1A]">
          Dashboard Lektora
        </h1>
        <p class="text-gray-600 font-semibold mt-2">
          Spravuj své kurzy a materiály na jednom místě.
        </p>
      </div>
      <div class="flex gap-4">
        <button
          @click="openModal()"
          class="organic-btn !bg-[#91F5AD] !text-[#1A1A1A] hover:!bg-[#0070BB] hover:!text-white px-6 py-3 shadow-md transition-all duration-300"
        >
          <span class="text-xl">+</span> Vytvořit kurz
        </button>
      </div>
    </div>

    <!-- Statistiky -->

    <h3 class="text-2xl font-bold mb-6 border-b-2 border-gray-200 pb-2">
      Moje Kurzy
    </h3>

    <!-- Loading / Error -->
    <div v-if="loading" class="text-center text-gray-500 font-bold py-12">
      Načítání kurzů...
    </div>
    <div v-else-if="error" class="text-center text-red-500 font-bold py-12">
      {{ error }}
    </div>

    <!-- Seznam kurzů (Grid) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="course in courses"
        :key="course.uuid"
        class="organic-box p-5 flex gap-4 items-start hover:shadow-lg transition-shadow bg-white"
      >
        <div
          class="w-24 h-24 rounded-lg flex-shrink-0 border-2 border-[#1A1A1A] bg-gray-100 relative overflow-hidden"
        >
          <div
            class="absolute inset-0 opacity-50"
            :style="{ background: course.color || '#91F5AD' }"
          ></div>
        </div>
        <div class="flex-grow">
          <div class="flex justify-between items-start mb-1">
            <h4 class="text-xl font-bold">{{ course.name }}</h4>
            <span
              class="px-3 py-1 rounded-full text-xs font-bold border border-gray-200"
              :style="{
                backgroundColor: getDifficultyColor(course.difficulty) + '40',
                color: '#1A1A1A',
              }"
            >
              {{ course.difficulty || "Začátečník" }}
            </span>
          </div>
          <p class="text-gray-500 text-sm mb-3 line-clamp-2">
            {{ course.description }}
          </p>
          <div class="flex gap-4 text-sm font-bold text-[#0070BB]">
            <span class="flex items-center gap-1">
              📄 Materiály ({{ course.materials?.length || 0 }})
            </span>
            <button
              @click="openModal(course)"
              class="hover:underline flex items-center gap-1"
            >
              ✏️ Upravit
            </button>
            <button
              @click="deleteCourse(course.uuid)"
              class="hover:underline flex items-center gap-1 text-red-500"
            >
              🗑️ Smazat
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <CourseModal
      :show="showModal"
      :course="editingCourse"
      :categories="categories"
      @close="showModal = false"
      @save="saveCourse"
    />

    <!-- Modal -->
    <CourseModal
      :show="showModal"
      :course="editingCourse"
      :categories="categories"
      @close="showModal = false"
      @save="saveCourse"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      :show="showDeleteModal"
      title="Chcete kurz zavřít?"
      @cancel="showDeleteModal = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import CourseModal from "../components/CourseModal.vue";
import ConfirmationModal from "../components/ConfirmationModal.vue";

interface Course {
  uuid?: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  color?: string;
  materials?: any[];
}

const categories = ["Programování", "Design & Art", "Marketing", "Soft Skills"];
const courses = ref<Course[]>([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingCourse = ref<Course | null>(null);
const courseToDeleteId = ref<string | null>(null);
const loading = ref(true);
const error = ref("");

const getDifficultyColor = (diff?: string) => {
  if (diff === "Začátečník") return "#91F5AD";
  if (diff === "Pokročilý") return "#FFD93D";
  if (diff === "Expert") return "#FF6B6B";
  return "#F9F9F9";
};

const fetchCourses = async () => {
  try {
    loading.value = true;
    error.value = "";
    const response = await fetch("/api/courses");
    if (!response.ok) throw new Error("Failed to fetch courses");
    const data = await response.json();

    // Přidáme defaultní hodnoty
    courses.value = data.map((course: Course, index: number) => ({
      ...course,
      difficulty:
        course.difficulty || ["Začátečník", "Pokročilý", "Expert"][index % 3],
      color: ["#91F5AD", "#0070BB", "#FF6B6B", "#FFD93D"][index % 4],
      category: course.category || categories[index % 4],
    }));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Nepodařilo se načíst kurzy";
    console.error("Error fetching courses:", err);
  } finally {
    loading.value = false;
  }
};

const openModal = (course?: Course) => {
  editingCourse.value = course || null;
  showModal.value = true;
};

const saveCourse = async (courseData: Course, isEditing: boolean) => {
  try {
    if (isEditing && courseData.uuid) {
      // Update
      const response = await fetch(`/api/courses/${courseData.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });
      if (!response.ok) throw new Error("Failed to update course");
    } else {
      // Create
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });
      if (!response.ok) throw new Error("Failed to create course");
    }

    showModal.value = false;
    editingCourse.value = null;
    await fetchCourses(); // Reload
  } catch (err) {
    alert(err instanceof Error ? err.message : "Chyba při ukládání kurzu");
    console.error("Error saving course:", err);
  }
};

const deleteCourse = async (uuid?: string) => {
  if (!uuid) return;
  courseToDeleteId.value = uuid;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  // "když ano tak to zatim neřeš" -> Intentionally do nothing but close modal
  showDeleteModal.value = false;
  courseToDeleteId.value = null;
};

onMounted(() => {
  fetchCourses();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

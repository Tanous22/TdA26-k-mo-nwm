<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="cancel">
      <div
        class="organic-box bg-white p-8 max-w-sm w-full relative animate-bounce-in text-center"
      >
        <h2 class="text-xl font-extrabold mb-4 text-[#1A1A1A]">
          {{ title }}
        </h2>

        <div class="flex gap-4 justify-center mt-6">
          <button
            @click="confirm"
            class="organic-btn !bg-[#91F5AD] !text-[#1A1A1A] hover:opacity-90 px-6 py-2"
          >
            Ano
          </button>
          <button
            @click="cancel"
            class="organic-btn !bg-[#FF6B6B] !text-white hover:opacity-90 px-6 py-2"
          >
            Ne
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirm = () => {
  emit("confirm");
};

const cancel = () => {
  emit("cancel");
};
</script>

<style scoped>
/* Reuse styles from global css or scoped styles if available */
</style>

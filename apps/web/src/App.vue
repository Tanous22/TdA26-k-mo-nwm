<script setup lang="ts">
import { ref, onMounted } from 'vue'

const users = ref<unknown>(null)

onMounted(async () => {
  const response = await fetch('/api/users')
  users.value = await response.json()
})
</script>

<template>
  <div>
    <pre>
      {{ JSON.stringify(users, null, 2) }}
    </pre>
    <div>
      <section>
        <h2>API Status - vue</h2>
      </section>
    </div>
  </div>
</template>

<style scoped>
</style>

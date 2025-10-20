<template>
  <aside :class="['sidebar', { open: isOpen }]">
    <div class="brand">
      <span class="logo">M2</span>
      <div class="brand-text">
        <strong>Men2 Marketing</strong>
        <!-- <small>Attendance Report</small> -->
      </div>
    </div>
    <nav>
      <button class="nav-item parent" @click="toggleParent" aria-expanded="parentOpen">
        <span>Attendance Report</span>
        <span class="chev" :class="{ rot: parentOpen }">▾</span>
      </button>
      <div v-if="parentOpen" class="children">
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'todays-attendance' }"
          :to="{ name: 'todays-attendance' }"
        >
          <span class="dot"></span> Todays Attendance
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'employees' }"
          :to="{ name: 'employees' }"
        >
          <span class="dot"></span> Employee Reports
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'department-reports' }"
          :to="{ name: 'department-reports' }"
        >
          <span class="dot"></span> Department Reports
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'summary-reports' }"
          :to="{ name: 'summary-reports' }"
        >
          <span class="dot"></span> Summary Reports
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref } from "vue";
defineProps({ isOpen: { type: Boolean, default: false } });
const parentOpen = ref(true);
const toggleParent = () => (parentOpen.value = !parentOpen.value);
</script>

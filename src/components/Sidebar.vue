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
      <!-- Attendance Report Menu -->
      <button
        class="nav-item parent"
        @click="toggleAttendanceReport"
        aria-expanded="attendanceReport"
      >
        <div class="parent-title">
          <span class="parent-icon">📋</span>
          <span>Attendance Report</span>
        </div>
        <span class="chev" :class="{ rot: attendanceReport }">▾</span>
      </button>
      <div v-if="attendanceReport" class="children">
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'todays-attendance' }"
          :to="{ name: 'todays-attendance' }"
        >
          Todays Attendance
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'employee-reports' }"
          :to="{ name: 'employee-reports' }"
        >
          Employee Reports
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'department-reports' }"
          :to="{ name: 'department-reports' }"
        >
          Department Reports
        </router-link>
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'summary-reports' }"
          :to="{ name: 'summary-reports' }"
        >
          Summary Reports
        </router-link>
      </div>

      <!-- Wage Management Menu -->
      <button
        class="nav-item parent"
        @click="toggleWageManagement"
        aria-expanded="wageManagement"
      >
        <div class="parent-title">
          <span class="parent-icon">📋</span>
          <span>Wage Management</span>
        </div>
        <span class="chev" :class="{ rot: wageManagement }">▾</span>
      </button>
      <div v-if="wageManagement" class="children">
        <router-link
          class="nav-item child"
          :class="{ active: $route.name === 'employees' }"
          :to="{ name: 'employees' }"
        >
          Employees
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref } from "vue";
defineProps({ isOpen: { type: Boolean, default: false } });
const attendanceReport = ref(false);
const wageManagement = ref(false);
const toggleAttendanceReport = () => (attendanceReport.value = !attendanceReport.value);
const toggleWageManagement = () => (wageManagement.value = !wageManagement.value);
</script>

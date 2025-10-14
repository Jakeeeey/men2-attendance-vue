<template>
  <div class="layout">
    <Sidebar :isOpen="sidebarOpen" />
    <div class="content">
      <header class="topbar no-print">
        <button class="hamburger" @click="toggleSidebar" aria-label="Toggle menu">☰</button>
        <h1 class="topbar-title">Attendance Report</h1>
        <div></div>
      </header>
      <main class="main"><div class="container"><router-view /></div></main>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
const sidebarOpen = ref(false)
const toggleSidebar = ()=> sidebarOpen.value = !sidebarOpen.value
onMounted(()=>{ if (window.innerWidth >= 960) sidebarOpen.value = true })
</script>

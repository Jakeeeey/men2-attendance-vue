<template>
  <section class="row">
    <div class="card">
      <h3 class="title" style="font-size:18px;margin-bottom:12px">Employee Report — Employees</h3>
      <div class="toolbar no-print">
        <div>
          <label>Department</label>
          <select v-model.number="department">
            <option :value="0">All</option>
            <option v-for="d in departments" :key="d.department_id" :value="d.department_id">{{ d.department_name }}</option>
          </select>
        </div>
        <div>
          <label>Search Employee</label>
          <input placeholder="Search by name or email" v-model="q" />
        </div>
      </div>
      <div class="spacer"></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="u in filteredEmployees" :key="u.user_id">
              <td>{{ u.user_fname }} {{ u.user_lname }}</td>
              <td>{{ deptName(u.user_department) }}</td>
              <td>{{ u.user_position || '—' }}</td>
              <td><button class="primary" @click="$router.push({name:'employee', params:{id: u.user_id}})">View Attendance</button></td>
            </tr>
            <tr v-if="filteredEmployees.length===0"><td colspan="4">No employees found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchUsers, fetchDepartments } from '../services/api'
const users=ref([]), departments=ref([])
const department=ref(0), q=ref('')
const deptMap = computed(()=>{ const m=new Map(); for(const d of departments.value) m.set(d.department_id,d.department_name); return m })
const deptName = (id)=> deptMap.value.get(id) || ''
const filteredEmployees = computed(()=>{
  let rows=[...users.value]
  if(department.value) rows=rows.filter(u=>u.user_department===department.value)
  if(q.value){ const needle=q.value.toLowerCase(); rows=rows.filter(u=>(`${u.user_fname} ${u.user_lname}`.toLowerCase().includes(needle) || String(u.user_id).includes(needle) || (u.user_email||'').toLowerCase().includes(needle))) }
  return rows
})
onMounted(async()=>{ const [u,d]=await Promise.all([fetchUsers(),fetchDepartments()]); users.value=u; departments.value=d })
</script>

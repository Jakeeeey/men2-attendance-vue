<template>
  <section class="row">
    <div class="card">
      <h3 class="title" style="font-size:18px;margin-bottom:12px">Employee Report</h3>

      <div class="toolbar no-print" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
        <div>
          <label>Employee</label>
          <select v-model.number="userId">
            <option v-for="u in users" :key="u.user_id" :value="u.user_id">
              {{ u.user_fname }} {{ u.user_lname }}
            </option>
          </select>
        </div>

        <div>
          <label>From</label>
          <input type="date" v-model="fromStr" />
        </div>
        <div>
          <label>To</label>
          <input type="date" v-model="toStr" />
        </div>

        <div>
          <label>Quick Filter</label>
          <select v-model="quick">
            <option value="">Custom</option>
            <option value="7d">7 Days</option>
            <option value="14d">2 Weeks</option>
            <option value="30d">30 Days</option>
          </select>
        </div>
      </div>

      <div class="table-wrap" style="margin-top:12px">
        <table class="table">
          <thead>
            <tr>
              <th style="min-width:140px">Date</th>
              <th style="min-width:120px">Time In</th>
              <th style="min-width:120px">Time Out</th>
              <th style="min-width:120px">Overtime</th>
              <th style="min-width:100px">Late</th>
              <th style="min-width:120px">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.key">
              <td>{{ r.date_fmt }}</td>
              <td>{{ r.time_in_fmt }}</td>
              <td>{{ r.time_out_fmt }}</td>
              <td>{{ r.overtime_fmt }}</td>
              <td>{{ r.late_fmt }}</td>
              <td><span class="chip" :class="statusChip(r.status)">{{ r.status }}</span></td>
            </tr>
            <tr v-if="rows.length===0">
              <td colspan="2">No records.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { fetchUsers, fetchSchedules, fetchAttendance } from '../services/api'
import { fmtDate, fmtTime, minutesToHHMM, computeStatus, computeDailyLate } from '../utils/time'

const users = ref([])
const schedules = ref([])
const attendance = ref([])

const userId = ref(0)
const fromStr = ref('')
const toStr = ref('')
const quick = ref('')

function statusChip(s){
  if(s==='Late') return 'warning'
  if(s==='Absent') return 'danger'
  if(s==='Present' || s==='On Time' || s==='Overtime') return 'success'
  return ''
}

const schedByDept = computed(()=>{ const m=new Map(); for(const s of schedules.value) m.set(s.department_id,s); return m })
const userById = computed(()=>{ const m=new Map(); for(const u of users.value) m.set(u.user_id,u); return m })

watch(quick,(q)=>{
  const today = dayjs().startOf('day')
  if(q==='7d'){
    fromStr.value = today.subtract(6,'day').format('YYYY-MM-DD')
    toStr.value = today.format('YYYY-MM-DD')
  }else if(q==='14d'){
    fromStr.value = today.subtract(13,'day').format('YYYY-MM-DD')
    toStr.value = today.format('YYYY-MM-DD')
  }else if(q==='30d'){
    fromStr.value = today.subtract(29,'day').format('YYYY-MM-DD')
    toStr.value = today.format('YYYY-MM-DD')
  }
})

function isWorkday(d, sc){
  const dow = d.day()
  const noteRaw = sc && sc.workdays_note ? String(sc.workdays_note).toLowerCase() : ''
  if(noteRaw.includes('mon–sat') || noteRaw.includes('mon-sat')) return dow>=1 && dow<=6
  if(noteRaw.includes('mon–fri') || noteRaw.includes('mon-fri')) return dow>=1 && dow<=5
  const wd = sc?.working_days
  if(wd === 6) return dow>=1 && dow<=6
  if(wd === 5) return dow>=1 && dow<=5
  return dow>=1 && dow<=5
}

const rows = computed(()=>{
  if(!fromStr.value || !toStr.value || !userId.value) return []
  const start = dayjs(String(fromStr.value)).startOf('day')
  const end   = dayjs(String(toStr.value)).startOf('day')
  if(!start.isValid() || !end.isValid() || end.isBefore(start)) return []

  const u = userById.value.get(userId.value)
  if(!u) return []
  const sc = schedByDept.value.get(u.user_department) || {}
  const expectedStart = sc?.work_start || '08:00:00'
  const expectedEnd   = sc?.work_end   || '17:00:00'

  const logs = attendance.value.filter(l=> l.user_id===userId.value)
  const byDate = new Map(); for(const l of logs){ byDate.set(String(l.log_date), l) }

  const out = []
  let d = start.clone()
  while(d.isBefore(end,'day') || d.isSame(end,'day')){
    if(isWorkday(d, sc)){
      const ds = d.format('YYYY-MM-DD')
      const log = byDate.get(ds) || null
      let status = 'Absent'
      if(log){
        const stat = computeStatus({ time_in: log.time_in, time_out: log.time_out, expectedStart, expectedEnd })
        status = stat.lateMinutes>0 ? 'Late' : 'Present'
      }
      out.push({ key:`r-${ds}`, date_fmt: fmtDate(ds), status })
    }
    d = d.add(1,'day')
  }
  out.sort((a,b)=> b.date_fmt.localeCompare(a.date_fmt))
  return out
})

onMounted(async()=>{
  const [u,s,a] = await Promise.all([fetchUsers(), fetchSchedules(), fetchAttendance()])
  users.value = u; schedules.value = s; attendance.value = a
  if(u && u.length){
    userId.value = u[0].user_id
  }
  const today = dayjs().startOf('day')
  fromStr.value = today.format('YYYY-MM-DD')
  toStr.value = today.format('YYYY-MM-DD')
  quick.value = ''
})
</script>

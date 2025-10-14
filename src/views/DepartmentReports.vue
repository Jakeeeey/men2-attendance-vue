<template>
  <section class="row">
    <div class="card">
      <h3 class="title" style="font-size:18px;margin-bottom:12px">Department Reports</h3>

      <div class="toolbar no-print" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
        <div>
          <label>Department</label>
          <select v-model.number="deptId">
            <option v-for="d in departments" :key="d.department_id" :value="d.department_id">{{ d.department_name }}</option>
          </select>
        </div>
        <div>
          <label>Date From</label>
          <input type="date" v-model="startDate" />
        </div>
        <div>
          <label>Date To</label>
          <input type="date" v-model="endDate" />
        </div>
        <div>
          <label>Search by name</label>
          <input v-model="q" placeholder="Type a name..." />
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <div class="date-heading" style="font-weight:600;margin:6px 0 6px;">{{ prettyRange }}</div>
<div class="consistent-wrap" style="margin:0 0 12px;">
  <div style="font-weight:600;">Consistently On Time:</div>
  <div v-if="consistentNames.length"> {{ consistentNames.join(", ") }} </div>
  <div v-else> None </div>
</div>
<template v-for="group in groups" :key="group.ymd">
          <h4 style="margin:12px 0 6px">{{ dayjs(group.ymd).format('MMM D, YYYY') }}</h4>
          <table>
            <thead>
              <tr>
        <th>Name</th>
            <th>Late</th>
            <th>Overtime</th>
            <th>Punctuality</th>
            <th>Status</th>
      </tr>
            </thead>
            <tbody>
              <tr v-for="r in group.rows" :key="r.key" :class="{'row-consistent': r.consistentlyOnTime}">
        <td>{{ r.name || r.empName || r.employee_name || '-' }}</td>
        <td>{{ typeof r.lateMinutes === 'number' ? minutesToHHMM(r.lateMinutes) : '-' }}</td>
        <td>{{ typeof r.overtimeMinutes === 'number' ? minutesToHHMM(r.overtimeMinutes) : '-' }}</td>
        <td>{{ r.punctuality ? r.punctuality : ((Number(r.lateMinutes)||0) > 0 ? 'Late' : 'On Time') }}</td>
        <td>{{ computeRowStatus(r) }}</td>
      </tr>
              <tr v-if="group.rows.length===0"><td colspan="3">No records.</td></tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { fetchUsers, fetchDepartments, fetchSchedules, fetchAttendance } from '../services/api'
import { computeStatus } from '../utils/time'

const users = ref([])
const departments = ref([])
const schedules = ref([])
const attendance = ref([])

const deptId = ref(0)
const startDate = ref(dayjs().format('YYYY-MM-DD'))
const endDate = ref(dayjs().format('YYYY-MM-DD'))
const q = ref('')

function statusChip(s){
  if(s==='Present') return 'success'
  if(s==='Not Present') return 'warning'
  if(s==='Absent') return 'danger'
  return ''
}

const scheduleByDeptId = computed(()=>{
  const m = new Map()
  for(const s of schedules.value) m.set(s.department_id, s)
  return m
})

const employeesInDept = computed(()=> users.value.filter(u => u.user_department === deptId.value))

const dateList = computed(()=>{
  const from = dayjs(startDate.value || dayjs().format('YYYY-MM-DD'))
  const to = dayjs(endDate.value || dayjs().format('YYYY-MM-DD'))
  const days = []
  const start = from.isAfter(to) ? to : from
  const end = from.isAfter(to) ? from : to
  let cur = start
  while(cur.isBefore(end) || cur.isSame(end,'day')){
    days.push(cur.format('YYYY-MM-DD'))
    cur = cur.add(1,'day')
  }
  return days
})

const prettyRange = computed(()=>{
  if(dateList.value.length===1) return dayjs(dateList.value[0]).format('MMM D, YYYY')
  const first = dayjs(dateList.value[0]).format('MMM D, YYYY')
  const last = dayjs(dateList.value[dateList.value.length-1]).format('MMM D, YYYY')
  return `${first} — ${last}`
})

function buildRow(u, ymd){
  const rec = attendance.value.find(a => a.user_id === u.user_id && a.log_date === ymd)
  const deptSched = scheduleByDeptId.value.get(u.user_department) || {}
  let status = 'Not Present'
  let punctuality = '—'
  if (rec){
    const stat = computeStatus({
      time_in: rec.time_in,
      time_out: rec.time_out,
      expectedStart: (deptSched.work_start || '09:00:00'),
      expectedEnd: (deptSched.work_end || '18:00:00')
    })
    if (rec.time_in){
      status = 'Present'
      punctuality = stat.lateMinutes > 0 ? 'Late' : 'On Time'
    }else{
      status = 'Absent'
      punctuality = '—'
    }
  }
  return { status, punctuality }
}

const consistentNames = computed(()=>{
  // Names of employees who are Present and On Time for every day in selected range
  const names = []
  for(const u of employeesInDept.value){
    const name = `${u.user_fname || ''} ${u.user_lname || ''}`.trim()
    if(!name) continue
    const allOnTime = dateList.value.length>0 && dateList.value.every(d => {
      const rec = attendance.value.find(a => a.user_id===u.user_id && a.log_date===d)
      if(!rec || !rec.time_in) return false
      const deptSched = scheduleByDeptId.value.get(u.user_department) || {}
      const st = computeStatus({ time_in: rec.time_in, time_out: rec.time_out, expectedStart: (deptSched.work_start || '09:00:00'), expectedEnd: (deptSched.work_end || '18:00:00') })
      return st.lateMinutes===0
    })
    if(allOnTime) names.push(name)
  }
  // Unique and sorted
  return Array.from(new Set(names)).sort((a,b)=>a.localeCompare(b))
})

const groups = computed(()=>{
  const needle = (q.value || '').toLowerCase()
  const list = []
  for(const ymd of dateList.value){
    const rows = employeesInDept.value
      .map(u => {
        const name = `${u.user_fname || ''} ${u.user_lname || ''}`.trim()
        if(needle && !name.toLowerCase().includes(needle)) return null
        const rp = buildRow(u, ymd)
        // Consistent across whole selected range
        let consistentlyOnTime = false
        try{
          consistentlyOnTime = dateList.value.length>0 && dateList.value.every(d => {
            const rr = buildRow(u, d)
            return rr.status==='Present' && rr.punctuality==='On Time'
          })
        }catch(e){ consistentlyOnTime = false }
        return {
          key: `r-${u.user_id}-${ymd}`,
          empName: name,
          status: rp.status,
          punctuality: rp.punctuality,
          consistentlyOnTime
        }
      })
      .filter(Boolean)
    list.push({ ymd, rows })
  }
  return list
})

onMounted(async()=>{
  const [u,d,s,a] = await Promise.all([fetchUsers(), fetchDepartments(), fetchSchedules(), fetchAttendance()])
  users.value = u; departments.value = d; schedules.value = s; attendance.value = a
  if(d && d.length) deptId.value = d[0].department_id
})


function parseWorkdaysNote(note) {
  // Returns a Set of working day indexes: 0=Sun ... 6=Sat
  if (!note || typeof note !== 'string') return null;
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const set = new Set();
  const parts = note.split(',').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^([A-Za-z]{3})\s*-\s*([A-Za-z]{3})$/);
    if (m) {
      const a = map[m[1]]; const b = map[m[2]];
      if (a==null || b==null) continue;
      // add inclusive range wrapping over week if needed
      let i = a;
      while (true) {
        set.add(i);
        if (i === b) break;
        i = (i + 1) % 7;
      }
      continue;
    }
    // single day like 'Mon'
    const d = map[p];
    if (d != null) set.add(d);
  }
  return set.size ? set : null;
}

function isRestDayByNote(logDate, workdaysNote) {
  try {
    const d = dayjs(String(logDate));
    if (!d.isValid()) return false;
    const dow = d.day(); // 0=Sun .. 6=Sat
    const workset = parseWorkdaysNote(workdaysNote);
    if (!workset) return false; // unknown note -> don't mark as rest by note
    return !workset.has(dow);
  } catch { return false; }
}

function computeRowStatus(r) {
  // Prefer allowed precomputed status
  const allowed = new Set(['Present','Absent','Rest Day']);
  const s = (r.status || '').trim();
  if (allowed.has(s)) return s;

  // Determine rest day by schedule note
  const sched = r.schedule || r.sched || {};
  const workdaysNote = r.workdays || r.work_days || sched.workdays || sched.work_days || sched.workdays_note || sched.work_days_note;
  const restByNote = isRestDayByNote(r.date || r.log_date, workdaysNote);
  if (restByNote || r.isRestDay || r.rest_day || r.workday === 'Rest Day' || sched.is_rest_day || sched.workday === 'Rest Day') {
    return 'Rest Day';
  }

  // Otherwise Present if time in or minutes logged
  const hasIn = !!(r.time_in || r.timeIn || r.clock_in || r.clockIn);
  const hasMinutes = Number(r.totalMinutes || 0) > 0;
  if (hasIn || hasMinutes) return 'Present';

  return 'Absent';
}

</script>

<style scoped>
.row-consistent td { background: rgba(0, 200, 0, 0.08); }
</style>

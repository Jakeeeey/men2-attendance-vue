<template>
  <section class="page">
    <!-- Header / Filters + KPIs -->
    <div class="card header-card">
      <div class="header-top">
        <h3 class="title">Department Reports</h3>

        <!-- Right side: Pretty range + Print -->
        <div class="header-actions">
          <div class="range-wrap">
            <span class="range-icon" aria-hidden="true">🗓️</span>
            <span class="range-badge">{{ prettyRange }}</span>
          </div>

          <button class="btn btn-print no-print" @click="printDetails">
            <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M6 9V2h12v7h1a3 3 0 0 1 3 3v5h-4v4H6v-4H2v-5a3 3 0 0 1 3-3h1Zm2-7h8v7H8V2Zm8 18H8v2h8v-2ZM4 12v3h16v-3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1Zm3-7h8v2H7V5Z"/>
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="field">
          <label>Department</label>
          <select v-model.number="deptId">
            <option
              v-for="d in departments"
              :key="d.department_id"
              :value="d.department_id"
            >
              {{ d.department_name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Date From</label>
          <input
            type="date"
            v-model="startDate"
            :min="minStartStr"
            :max="yesterdayStr"
          />
        </div>

        <div class="field">
          <label>Date To</label>
          <input
            type="date"
            v-model="endDate"
            :min="startDate || minStartStr"
            :max="yesterdayStr"
          />
        </div>

        <div class="field grow">
          <label>Search by name</label>
          <input v-model="q" placeholder="Type a name..." />
        </div>
      </div>

      <!-- KPIs under filters -->
      <div class="kpi-grid no-print">
        <div class="kpi-card">
          <div class="kpi-label">Total Overtime (hrs)</div>
          <div class="kpi-value">{{ totalOvertimeHHMM }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Late (hrs)</div>
          <div class="kpi-value">{{ totalLateHHMM }}</div>
        </div>
      </div>

      <!-- Consistently On Time -->
      <div class="consistent no-print">
        <div class="consistent-head">
          <div class="consistent-title">
            <span class="dot dot-ok"></span> Consistently On Time
          </div>
          <div v-if="consistentNames.length" class="consistent-count">
            {{ consistentNames.length }} employee(s)
          </div>
        </div>

        <div v-if="consistentNames.length" class="chips">
          <span
            v-for="n in consistentNames"
            :key="n"
            class="chip-pill"
            >{{ n }}</span
          >
        </div>
        <div v-else class="muted">None</div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="card">
      <div class="table-wrap" ref="printRef">
        <template v-for="group in groups" :key="group.ymd">
          <h4 class="day-heading">
            {{ dayjs(group.ymd).format('MMM D, YYYY') }}
          </h4>
          <table class="table">
            <thead>
              <tr>
                <th class="col-name">Name</th>
                <th>Overtime</th>
                <th>Late</th>
                <th>Punctuality</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in group.rows"
                :key="r.key"
                :class="{'row-consistent': r.consistentlyOnTime}"
              >
                <td class="col-name">
                  <div class="emp-name">{{ r.empName || r.name || r.employee_name || '-' }}</div>
                </td>
                <td class="mono">{{ typeof r.overtimeMinutes === 'number' ? minutesToHHMM(r.overtimeMinutes) : '-' }}</td>
                <td class="mono">{{ typeof r.lateMinutes === 'number' ? minutesToHHMM(r.lateMinutes) : '-' }}</td>
                <td>
                  <span
                    class="chip"
                    :class="r.punctuality === 'On Time' ? 'chip-ok' : (r.punctuality === 'Late' ? 'chip-warn' : 'chip-muted')"
                    >{{ r.punctuality }}</span
                  >
                </td>
                <td>
                  <span
                    class="chip"
                    :class="computeRowStatus(r) === 'Present' ? 'chip-ok' : (computeRowStatus(r) === 'Absent' ? 'chip-danger' : 'chip-muted')"
                    >{{ computeRowStatus(r) }}</span
                  >
                </td>
              </tr>
              <tr v-if="group.rows.length===0">
                <td colspan="5" class="muted center">No records.</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { fetchUsers, fetchDepartments, fetchSchedules, fetchAttendance } from '../services/api'
import { computeStatus, minutesToHHMM } from '../utils/time'

const users = ref([])
const departments = ref([])
const schedules = ref([])
const attendance = ref([])

const deptId = ref(0)

/* Date constraints */
const minStartStr = computed(() => dayjs('2025-10-10').format('YYYY-MM-DD'))
const yesterdayStr = computed(() => dayjs().subtract(1, 'day').format('YYYY-MM-DD'))

/* Defaults: From = yesterday; To = yesterday */
const startDate = ref(yesterdayStr.value)
const endDate = ref(yesterdayStr.value)

const q = ref('')

const printRef = ref(null)

const scheduleByDeptId = computed(()=>{
  const m = new Map()
  for(const s of schedules.value) m.set(s.department_id, s)
  return m
})

const deptName = computed(()=>{
  const d = departments.value.find(x => x.department_id === deptId.value)
  return d ? d.department_name : ''
})

/* Clamp dates to constraints whenever they change */
watch([startDate, endDate], ([f, t]) => {
  const min = dayjs(minStartStr.value)
  const y = dayjs(yesterdayStr.value)

  let fD = dayjs(String(f || minStartStr.value))
  let tD = dayjs(String(t || yesterdayStr.value))

  if (fD.isBefore(min)) fD = min
  if (fD.isAfter(y)) fD = y

  if (tD.isAfter(y)) tD = y
  if (tD.isBefore(fD)) tD = fD

  const fNew = fD.format('YYYY-MM-DD')
  const tNew = tD.format('YYYY-MM-DD')

  if (fNew !== (startDate.value || '')) startDate.value = fNew
  if (tNew !== (endDate.value || '')) endDate.value = tNew
})

const employeesInDept = computed(()=> users.value.filter(u => u.user_department === deptId.value))

const dateList = computed(()=>{
  const from = dayjs(startDate.value || minStartStr.value)
  const to = dayjs(endDate.value || yesterdayStr.value)
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

/* ---------- Helpers (EN/EM dash normalization) ---------- */
function toWorkingSet(noteRaw){
  // Normalize both EN DASH (U+2013) and EM DASH (U+2014) to hyphen
  const normalize = (txt) => String(txt || '').replace(/[\u2013\u2014]/g, '-').trim()
  const note = normalize(noteRaw) || 'Mon-Fri' // default if missing
  const idx = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }
  const key = (s) => String(s).slice(0,3).toLowerCase()
  const set = new Set()
  note.split(',').map(p=>p.trim()).filter(Boolean).forEach(part => {
    const m = part.match(/^([A-Za-z]{3,})\s*-\s*([A-Za-z]{3,})$/)
    if (m) {
      const a = idx[key(m[1])], b = idx[key(m[2])]
      if (a==null || b==null) return
      let i = a
      while (true) {
        set.add(i)
        if (i === b) break
        i = (i + 1) % 7
      }
    } else {
      const k = idx[key(part)]
      if (k!=null) set.add(k)
    }
  })
  if (set.size === 0) [1,2,3,4,5].forEach(d => set.add(d)) // Mon–Fri fallback
  return set
}

function pickTime(obj, keys) {
  for (const k of keys) if (obj && obj[k]) return obj[k]
  return null
}

function parseHM(baseDate, hm) {
  if (!hm) return null
  const s = String(hm).trim()
  // HH:mm or HH:mm:ss
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const hhmmss = /^\d{1,2}:\d{2}$/.test(s) ? s + ':00' : s
    return dayjs(`${baseDate}T${hhmmss}`)
  }
  // h:mm am/pm
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (m) {
    let hh = parseInt(m[1],10) % 12
    if (/p/i.test(m[3])) hh += 12
    const mm = String(parseInt(m[2],10)).padStart(2,'0')
    return dayjs(`${baseDate}T${String(hh).padStart(2,'0')}:${mm}:00`)
  }
  const dt = dayjs(s)
  return dt.isValid() ? dt : null
}

/* ---------- Build one row per employee per date (EmployeeDetail logic) ---------- */
function buildRow(u, ymd){
  const rec = attendance.value.find(a => a.user_id === u.user_id && a.log_date === ymd)
  const sched = scheduleByDeptId.value.get(u.user_department) || {}

  // Working day check (Rest Day if not included)
  const workingSet = toWorkingSet(
    sched.workdays_note || sched.workdays || sched.work_days || sched.work_days_note
  )
  const dow = dayjs(ymd).day()
  const isWorkingDay = workingSet.has(dow)

  // If not a working day -> Rest Day
  if (!isWorkingDay) {
    return {
      key: `r-${u.user_id}-${ymd}`,
      empName: `${u.user_fname || ''} ${u.user_lname || ''}`.trim(),
      status: 'Rest Day',
      punctuality: '—',
      lateMinutes: undefined,
      overtimeMinutes: undefined,
      date: ymd,
      schedule: sched
    }
  }

  // Working day with no attendance -> Absent
  if (!rec || (!rec.time_in && !rec.time_out)) {
    return {
      key: `r-${u.user_id}-${ymd}`,
      empName: `${u.user_fname || ''} ${u.user_lname || ''}`.trim(),
      status: 'Absent',
      punctuality: '—',
      lateMinutes: undefined,
      overtimeMinutes: undefined,
      date: ymd,
      schedule: sched
    }
  }

  // Working day with attendance -> Present; compute Late/OT like EmployeeDetail.vue
  const expectedStart = sched?.work_start || '08:00:00'
  const expectedEnd   = sched?.work_end   || '17:00:00'

  const stat = computeStatus({
    time_in: rec.time_in,
    time_out: rec.time_out,
    expectedStart,
    expectedEnd,
  })

  // ---- Custom lateness sum (start + lunch_end + break_end) with 5-min grace ----
  const baseDate = String(ymd)
  const schedStart    = parseHM(baseDate, sched?.work_start || '08:00:00')
  const schedLunchEnd = parseHM(baseDate, sched?.lunch_end  || sched?.lunchEnd || null)
  const schedBreakEnd = parseHM(baseDate, sched?.break_end  || sched?.breakEnd || null)

  const graceTime = schedStart ? schedStart.add(5, 'minute') : null

  const lunchEndRaw  = pickTime(rec, ['lunch_end','lunchEnd','lunch_out','lunchOut'])
  const breakEndRaw  = pickTime(rec, ['break_end','breakEnd','break_out','breakOut'])

  const actualIn        = parseHM(baseDate, rec.time_in)
  const actualLunchEnd  = parseHM(baseDate, lunchEndRaw)
  const actualBreakEnd  = parseHM(baseDate, breakEndRaw)

  let lateFromIn = 0
  if (graceTime && actualIn && actualIn.isAfter(graceTime)) {
    lateFromIn = actualIn.diff(graceTime, 'minute')
  }
  let lateFromLunchEnd = 0
  if (schedLunchEnd && actualLunchEnd && actualLunchEnd.isAfter(schedLunchEnd)) {
    lateFromLunchEnd = actualLunchEnd.diff(schedLunchEnd, 'minute')
  }
  let lateFromBreakEnd = 0
  if (schedBreakEnd && actualBreakEnd && actualBreakEnd.isAfter(schedBreakEnd)) {
    lateFromBreakEnd = actualBreakEnd.diff(schedBreakEnd, 'minute')
  }
  const customLateMinutes = lateFromIn + lateFromLunchEnd + lateFromBreakEnd
  // ------------------------------------------------------------

  const status = 'Present' // restrict labels to Present/Absent/Rest Day
  const punctuality = customLateMinutes > 0 ? 'Late' : 'On Time'

  return {
    key: `r-${u.user_id}-${ymd}`,
    empName: `${u.user_fname || ''} ${u.user_lname || ''}`.trim(),
    status,
    punctuality,
    lateMinutes: customLateMinutes,
    overtimeMinutes: stat.overtimeMinutes ?? 0,
    time_in: rec.time_in,
    time_out: rec.time_out,
    date: ymd,
    schedule: sched
  }
}

const consistentNames = computed(()=>{
  // Present and On Time for every day in range (uses the same buildRow logic)
  const names = []
  for (const u of employeesInDept.value) {
    const name = `${u.user_fname || ''} ${u.user_lname || ''}`.trim()
    if (!name) continue
    const allOnTime = dateList.value.length>0 && dateList.value.every(d => {
      const row = buildRow(u, d)
      return row.status === 'Present' && row.punctuality === 'On Time'
    })
    if (allOnTime) names.push(name)
  }
  return Array.from(new Set(names)).sort((a,b)=>a.localeCompare(b))
})

/* DESCENDING dates here */
const groups = computed(()=>{
  const needle = (q.value || '').toLowerCase()
  const list = []
  const orderedDates = [...dateList.value].sort((a,b) => String(b).localeCompare(String(a))) // newest → oldest
  for (const ymd of orderedDates){
    const rows = employeesInDept.value
      .map(u => {
        const name = `${u.user_fname || ''} ${u.user_lname || ''}`.trim()
        if (needle && !name.toLowerCase().includes(needle)) return null
        return buildRow(u, ymd)
      })
      .filter(Boolean)
    list.push({ ymd, rows })
  }
  return list
})

/* ---------- Totals for KPI cards ---------- */
const totalLateMinutes = computed(() =>
  groups.value.reduce((sum, g) =>
    sum + g.rows.reduce((s, r) => s + (typeof r.lateMinutes === 'number' ? r.lateMinutes : 0), 0)
  , 0)
)
const totalOvertimeMinutes = computed(() =>
  groups.value.reduce((sum, g) =>
    sum + g.rows.reduce((s, r) => s + (typeof r.overtimeMinutes === 'number' ? r.overtimeMinutes : 0), 0)
  , 0)
)
const totalLateHHMM = computed(() => minutesToHHMM(totalLateMinutes.value))
const totalOvertimeHHMM = computed(() => minutesToHHMM(totalOvertimeMinutes.value))

onMounted(async()=>{
  const [u,d,s,a] = await Promise.all([fetchUsers(), fetchDepartments(), fetchSchedules(), fetchAttendance()])
  users.value = u; departments.value = d; schedules.value = s; attendance.value = a
  if(d && d.length) deptId.value = d[0].department_id

  // Ensure defaults still respect constraints on initial load
  if (dayjs(startDate.value).isBefore(minStartStr.value)) startDate.value = minStartStr.value
  if (dayjs(endDate.value).isAfter(yesterdayStr.value)) endDate.value = yesterdayStr.value
  if (dayjs(endDate.value).isBefore(startDate.value)) endDate.value = startDate.value
})

/* ---------- Status column returns row.status (restricted set) ---------- */
function computeRowStatus(r) {
  const allowed = new Set(['Present','Absent','Rest Day'])
  const s = (r.status || '').trim()
  if (allowed.has(s)) return s
  const hasAttendance = !!(r.time_in || r.timeIn || r.time_out || r.timeOut || r.clock_in || r.clock_out)
  return hasAttendance ? 'Present' : 'Absent'
}

/* ---------- Print important details ---------- */
function printDetails() {
  try {
    const w = window.open('', '_blank')
    const content = printRef.value ? printRef.value.innerHTML : '<p>No records to print.</p>'
    const title = 'Department Reports'
    const dept = deptName.value || '—'
    const range = prettyRange.value

    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    h1{font-size:18px;margin:0}
    .meta{margin:8px 0 12px;font-size:12px;color:#374151}
    .day-heading{margin:12px 0 6px;font-size:14px;font-weight:700;color:#111827}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
    thead th{background:#f3f4f6}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    @page { size: A4; margin: 16mm; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Department: <strong>${dept}</strong> &middot; Range: ${range}</div>
  ${content}
  <script>window.onload=function(){window.print(); setTimeout(()=>window.close(), 250);}<\/script>
</body>
</html>`)
    w.document.close()
  } catch (e) {
    console.error('Print failed', e)
    window.print()
  }
}
</script>

<style scoped>
/* Page structure */
.page { display: grid; gap: 12px; }

/* Cards */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 2px 5px rgba(17, 24, 39, 0.04);
  padding: 14px;
}

/* Header */
.header-card { padding: 16px; }
.header-top {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  color: #111827;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.range-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  border-radius: 999px;
  color: #374151;
  font-weight: 600;
}
.range-icon { font-size: 12px; line-height: 1; }
.range-badge { font-size: 12px; letter-spacing: .01em; }

/* Button */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(17,24,39,.06);
  transition: transform .06s ease, box-shadow .12s ease, opacity .12s ease;
}
.btn:hover { opacity: .96; transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-icon { display: block; }
.btn-print { padding-inline: 14px; }

/* Filters */
.filters {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.field {
  grid-column: span 3 / span 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field.grow { grid-column: span 6 / span 6; }
@media (max-width: 900px) {
  .header-top { grid-template-columns: 1fr; }
  .header-actions { justify-content: flex-start; }
  .field, .field.grow { grid-column: span 12 / span 12; }
}
label { font-size: 12px; color: #6b7280; font-weight: 600; }
input, select {
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  background: #fff;
}
input:focus, select:focus { border-color: #111827; }

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.kpi-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.kpi-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .02em;
  color: #6b7280;
  text-transform: uppercase;
}
.kpi-value { font-size: 28px; font-weight: 800; line-height: 1; }

/* Consistent section */
.consistent {
  margin-top: 12px;
  border: 1px dashed #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #fafafa;
}
.consistent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.consistent-title {
  font-weight: 700;
  color: #374151;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.consistent-count { font-size: 12px; color: #6b7280; }
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  max-height: 116px;
  overflow: auto;
}
.chip-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #374151;
  box-shadow: 0 1px 1px rgba(0,0,0,0.04);
}

/* Table */
.day-heading {
  margin: 12px 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  overflow: hidden;
  border-radius: 12px;
}
.table thead th {
  text-align: left;
  background: #f8fafc;
  color: #374151;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
}
.table td {
  border-top: 1px solid #f1f5f9;
  padding: 10px;
  vertical-align: middle;
}
.table tbody tr:hover { background: #fafafa; }
.col-name { width: 36%; }
.emp-name { font-weight: 600; color: #111827; }
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* Chips for statuses */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}
.chip-ok {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}
.chip-warn {
  background: #fff7ed;
  color: #9a3412;
  border-color: #fed7aa;
}
.chip-danger {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}
.chip-muted {
  background: #f3f4f6;
  color: #374151;
  border-color: #e5e7eb;
}

/* Small helpers */
.muted { color: #6b7280; }
.center { text-align: center; }
.dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
.dot-ok { background: #10b981; }
.row-consistent td { background: rgba(16, 185, 129, 0.08); }
</style>

<template>
  <section class="row">
    <div class="card">
      <button
        class="no-print back-btn"
        @click="$router.push({ name: 'monitoring' })"
        style="margin-bottom: 8px"
      >
        ← Back
      </button>

      <div
        class="user-card"
        style="display:flex;gap:16px;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.04)"
      >
        <div
          class="avatar"
          style="width:64px;height:64px;border-radius:50%;background:#f3f4f6;overflow:hidden;display:flex;align-items:center;justify-content:center"
        >
          <img
            v-if="empImage"
            :src="empImage"
            alt="User"
            style="width:100%;height:100%;object-fit:cover"
          />
          <span v-else style="font-weight:700;color:#9ca3af">{{ initials }}</span>
        </div>
        <div
          class="info"
          style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 24px;width:100%"
        >
          <div>
            <div style="font-weight:700;font-size:16px;line-height:1.1">
              {{ empName }}
            </div>
            <div v-if="empPosition" style="color:#6b7280;font-size:12px">
              {{ empPosition }}
            </div>
          </div>
          <div style="text-align:right">
            <div v-if="empDeptName" style="font-weight:600">{{ empDeptName }}</div>
            <div v-if="empDeptSchedulePretty" style="color:#6b7280;font-size:12px">
              Work: {{ empDeptSchedulePretty }}
            </div>
          </div>
        </div>
      </div>

      <div
        class="toolbar no-print"
        style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-top:12px"
      >
        <div>
          <label>From</label>
          <input type="date" v-model="fromDate" :min="minStartStr" :max="yesterdayStr" />
        </div>
        <div>
          <label>To</label>
          <input type="date" v-model="toDate" :min="fromDate" :max="yesterdayStr" />
        </div>
        <div>
          <label>Quick Filter</label>
          <select v-model="quickSelect" @change="applyQuickDropdown">
            <option value="">— Select —</option>
            <option value="0">Today</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
        <div>
          <label>Filter by Status</label>
          <select
            v-model="statusFilter"
            style="padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px"
          >
            <option value="All">All</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Rest Day">Rest Day</option>
          </select>
        </div>

        <div style="flex: 1"></div>
        <button
          class="no-print"
          @click="printDetails"
          style="padding:10px 14px;border:1px solid #111827;border-radius:8px;cursor:pointer;background:#111827;color:#fff;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.06);"
        >
          Print
        </button>
      </div>

      <!-- Totals Cards -->
      <div
        class="no-print"
        style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px"
      >
        <div class="card" style="padding:16px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.02em;color:#6b7280;text-transform:uppercase">
            Days Attended
          </div>
          <div style="font-size:28px;font-weight:800;line-height:1">
            {{ totalDaysAttended }}
          </div>
        </div>
        <div class="card" style="padding:16px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.02em;color:#6b7280;text-transform:uppercase">
            Days Absent
          </div>
          <div style="font-size:28px;font-weight:800;line-height:1">
            {{ totalDaysAbsent }}
          </div>
        </div>
        <div class="card" style="padding:16px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.02em;color:#6b7280;text-transform:uppercase">
            Total Late (hrs)
          </div>
          <div style="font-size:28px;font-weight:800;line-height:1">
            {{ totalLateHHMM }}
          </div>
        </div>
        <div class="card" style="padding:16px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.02em;color:#6b7280;text-transform:uppercase">
            Total Overtime (hrs)
          </div>
          <div style="font-size:28px;font-weight:800;line-height:1">
            {{ totalOvertimeHHMM }}
          </div>
        </div>
      </div>

      <div class="no-print" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
        <span class="chip success">Present: {{ presentCount }}</span>
        <span class="chip danger">Absent: {{ absentCount }}</span>
        <span class="chip warning">Rest Day: {{ restCount }}</span>
      </div>

      <div class="table-wrap" style="margin-top:12px">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time In</th>
              <th>Lunch Start</th>
              <th>Lunch End</th>
              <th>Break Start</th>
              <th>Break End</th>
              <th>Time Out</th>
              <th>Overtime</th>
              <th>Late</th>
              <th>Work Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in displayedRows" :key="r.log_id">
              <td>{{ r.date_fmt }}</td>
              <td>{{ r.time_in_fmt || '-' }}</td>
              <td>{{ r.lunch_start_fmt || '-' }}</td>
              <td>{{ r.lunch_end_fmt || '-' }}</td>
              <td>{{ r.break_start_fmt || '-' }}</td>
              <td>{{ r.break_end_fmt || '-' }}</td>
              <td>{{ r.time_out_fmt || '-' }}</td>
              <td>{{ r.overtime_fmt || '-' }}</td>
              <td>{{ r.lateMinutes != null ? minutesToHHMM(r.lateMinutes) : '-' }}</td>
              <td>{{ r.workMinutes != null ? minutesToHHMM(r.workMinutes) : '-' }}</td>
              <td><span class="chip" :class="statusChip(r.status)">{{ r.status }}</span></td>
            </tr>
            <tr v-if="displayedRows.length === 0">
              <td colspan="11">No records in range.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'

import {
  fetchUsers,
  fetchSchedules,
  fetchAttendance,
  fetchDepartments
} from '../services/api'

import {
  fmtDate,
  fmtTime,
  minutesToHHMM,
  minutesPrettyWithTotal,
  computeStatus,
  displayTimeOutWhenMissing
} from '../utils/time'

/* --------------------- Filters / UI --------------------- */
const statusFilter = ref('All')
function normalizeStatus(s) {
  if (!s) return 'Absent'
  const t = String(s).toLowerCase()
  if (t.includes('rest')) return 'Rest Day'
  if (t.includes('absent') || t.includes('no show')) return 'Absent'
  return 'Present'
}

function statusChip(s){
  if(s==='On Time'||s==='Overtime') return 'ok'
  if(s==='Missing Timeout'||s==='Late'||s==='Slightly Late') return 'warn'
  if(s==='Absent') return 'danger'
  return ''
}

/* --------------------- Data --------------------- */
const route = useRoute(), userId = Number(route.params.id)

const users = ref([]), schedules = ref([]), attendance = ref([]), departments = ref([])
const fromDate = ref(''), toDate = ref('')

const emp = computed(()=> users.value.find(u => u.user_id === userId))
const empName = computed(()=> emp.value ? `${emp.value.user_fname} ${emp.value.user_lname}` : `User #${userId}`)
const empPosition = computed(()=> emp.value?.user_position || '')

const schedByDept = computed(()=>{ const m=new Map(); for(const s of schedules.value) m.set(s.department_id,s); return m })

/* --------------------- Helpers --------------------- */
function pickTime(obj, keys){ for(const k of keys){ if(obj && obj[k]) return obj[k] } return null }

function prettyAnyTime(v, logDate){
  if(!v) return ''
  const str=String(v)
  if(/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)){
    const hhmmss = str.length===5 ? str+':00' : str
    return dayjs(`${logDate}T${hhmmss}`).format('h:mma')
  }
  return fmtTime(v)
}

function parseHM(baseDate, hm){
  if(!hm) return null
  const s = String(hm).trim()
  // Accept "HH:mm" or "HH:mm:ss"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const hhmmss = /^\d{1,2}:\d{2}$/.test(s) ? s + ':00' : s
    return dayjs(`${baseDate}T${hhmmss}`)
  }
  // Accept "h:mma/pm"
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (m) {
    let hh = parseInt(m[1], 10) % 12
    if (/p/i.test(m[3])) hh += 12
    const mm = String(parseInt(m[2], 10)).padStart(2, '0')
    const hhmmss = String(hh).padStart(2, '0') + ':' + mm + ':00'
    return dayjs(`${baseDate}T${hhmmss}`)
  }
  // Fallback: ISO or other
  const d = dayjs(s)
  return d.isValid() ? d : null
}

/* --------------------- Rows Build --------------------- */
const rows = computed(()=>{
  if(!fromDate.value || !toDate.value) return []

  const start = dayjs(String(fromDate.value)).startOf('day')
  const end = dayjs(String(toDate.value)).startOf('day')
  if(!start.isValid() || !end.isValid() || end.isBefore(start)) return []

  const logs = attendance.value.filter(l=>{
    if(l.user_id!==userId) return false
    const d = dayjs(String(l.log_date))
    return (d.isAfter(start,'day') || d.isSame(start,'day')) && (d.isBefore(end,'day') || d.isSame(end,'day'))
  })

  const deptId = emp.value ? emp.value.user_department : null

  const merged = logs.map(l=>{
    const scd = schedByDept.value.get(l.department_id || deptId) || {}
    const expectedStart = scd?.work_start || '08:00:00'
    const expectedEnd   = scd?.work_end   || '17:00:00'

    const stat = computeStatus({
      time_in: l.time_in,
      time_out: l.time_out,
      expectedStart,
      expectedEnd
    })

    // pretty fields
    const outPretty = l.time_out ? fmtTime(l.time_out)
                                 : displayTimeOutWhenMissing({ log_date: l.log_date, expectedStart })

    const lunchStartRaw = pickTime(l, ['lunch_start','lunchStart','lunch_in','lunchIn'])
    const lunchEndRaw   = pickTime(l, ['lunch_end','lunchEnd','lunch_out','lunchOut'])
    const breakStartRaw = pickTime(l, ['break_start','breakStart','break_in','breakIn'])
    const breakEndRaw   = pickTime(l, ['break_end','breakEnd','break_out','breakOut'])

    /* ---------------- Work Hours (SPEC) ----------------
       Only if status === 'Present' AND time_out exists:
       WorkMinutes = minutes between max(time_in, work_start) and min(time_out, work_end)
       (never negative).
    ---------------------------------------------------- */
    const baseDate = String(l.log_date)
    const workStart = parseHM(baseDate, scd?.work_start || '08:30:00') // sample default
    const workEnd   = parseHM(baseDate, scd?.work_end   || '17:30:00') // sample default
    const tInParsed  = parseHM(baseDate, l.time_in ? fmtTime(l.time_in) : null) || parseHM(baseDate, l.time_in)
    const tOutParsed = parseHM(baseDate, l.time_out ? fmtTime(l.time_out) : null) || parseHM(baseDate, l.time_out)

    let workMinutesOverride = null
    if (normalizeStatus(stat.status) === 'Present' && tOutParsed && workStart && workEnd) {
      const effectiveStart = (tInParsed && tInParsed.isAfter(workStart)) ? tInParsed : workStart
      const effectiveEnd   = (tOutParsed.isBefore(workEnd) || tOutParsed.isSame(workEnd))
                           ? tOutParsed
                           : workEnd
      const diff = effectiveEnd.diff(effectiveStart, 'minute')
      workMinutesOverride = Math.max(0, diff)
    }

    // Custom "Late" = start late + lunch-end late + break-end late (with 5m start grace)
    const schedStart    = parseHM(baseDate, scd?.work_start || '08:30:00')
    const schedLunchEnd = parseHM(baseDate, scd?.lunch_end  || scd?.lunchEnd || null)
    const schedBreakEnd = parseHM(baseDate, scd?.break_end  || scd?.breakEnd || null)
    const graceMins = 5
    const graceTime = schedStart ? schedStart.add(graceMins, 'minute') : null

    const actualLunchEnd = parseHM(baseDate, lunchEndRaw)
    const actualBreakEnd = parseHM(baseDate, breakEndRaw)

    let lateFromIn = 0
    if(graceTime && tInParsed && tInParsed.isAfter(graceTime)){
      lateFromIn = tInParsed.diff(graceTime, 'minute')
    }
    let lateFromLunchEnd = 0
    if(schedLunchEnd && actualLunchEnd && actualLunchEnd.isAfter(schedLunchEnd)){
      lateFromLunchEnd = actualLunchEnd.diff(schedLunchEnd, 'minute')
    }
    let lateFromBreakEnd = 0
    if(schedBreakEnd && actualBreakEnd && actualBreakEnd.isAfter(schedBreakEnd)){
      lateFromBreakEnd = actualBreakEnd.diff(schedBreakEnd, 'minute')
    }
    const customLateMinutes = lateFromIn + lateFromLunchEnd + lateFromBreakEnd

    const isOff = (normalizeStatus(stat.status)==='Rest Day' || normalizeStatus(stat.status)==='Prehire')

    return {
      ...l,
      date_fmt: fmtDate(l.log_date),
      time_in_fmt: isOff ? '' : fmtTime(l.time_in),
      lunch_start_fmt: isOff ? '' : (lunchStartRaw ? prettyAnyTime(lunchStartRaw, l.log_date) : ''),
      lunch_end_fmt:   isOff ? '' : (lunchEndRaw ? prettyAnyTime(lunchEndRaw, l.log_date) : ''),
      break_start_fmt: isOff ? '' : (breakStartRaw ? prettyAnyTime(breakStartRaw, l.log_date) : ''),
      break_end_fmt:   isOff ? '' : (breakEndRaw ? prettyAnyTime(breakEndRaw, l.log_date) : ''),
      time_out_fmt: isOff ? '' : outPretty,
      workMinutes: isOff ? null : (workMinutesOverride != null ? workMinutesOverride : stat.totalMinutes),
      lateMinutes: isOff ? null : customLateMinutes,
      overtimeMinutes: isOff ? null : stat.overtimeMinutes,
      overtime_fmt: isOff ? '' : ((stat.overtimeMinutes||0) >= 90 ? minutesToHHMM(stat.overtimeMinutes) : '0'),
      status: normalizeStatus(stat.status)
    }
  })

  merged.sort((a,b)=> String(b.log_date).localeCompare(String(a.log_date)))
  return merged
})

/* --------------------- Display / Filters (SINGLE DECLARATION) --------------------- */
const displayedRows = computed(() => {
  const base = rows.value
  if (statusFilter.value === 'All') return base
  return base.filter(r => r.status === statusFilter.value)
})

/* --------------------- Totals / Chips --------------------- */
const presentCount = computed(()=> rows.value.filter(r=> r.status!=='Absent' && r.status!=='Rest Day' && r.status!=='Prehire').length)
const absentCount  = computed(()=> rows.value.filter(r=> r.status==='Absent').length)
const restCount    = computed(()=> rows.value.filter(r => r.status === 'Rest Day').length)

const lateDays = computed(()=> rows.value.filter(r=> (r.lateMinutes||0) > 0 && r.status!=='Absent' && r.status!=='Rest Day' && r.status!=='Prehire').length)
const otDays   = computed(()=> rows.value.filter(r=> (r.overtimeMinutes||0) > 0 && r.status!=='Absent' && r.status!=='Rest Day' && r.status!=='Prehire').length)
const presentPercent = computed(()=> (presentCount.value + absentCount.value) === 0 ? 0 : Math.round((presentCount.value/(presentCount.value+absentCount.value))*100))

const lateTotal = computed(()=> rows.value.reduce((acc,r)=> acc + (r.lateMinutes||0), 0))
const otTotal   = computed(()=> rows.value.reduce((acc,r)=> acc + (r.overtimeMinutes||0), 0))

const latePretty = computed(()=> minutesPrettyWithTotal(lateTotal.value))
const lateHHMM   = computed(()=> minutesToHHMM(lateTotal.value))
const otPretty   = computed(()=> minutesPrettyWithTotal(otTotal.value))
const otHHMM     = computed(()=> minutesToHHMM(otTotal.value))

const totalDaysAttended   = computed(()=> rows.value.filter(r => r.status !== 'Absent' && r.status !== 'Rest Day' && r.status !== 'Prehire').length)
const totalDaysAbsent     = computed(()=> rows.value.filter(r => r.status === 'Absent').length)
const totalLateHHMM       = computed(()=> minutesToHHMM(lateTotal.value))
const totalOvertimeHHMM   = computed(()=> minutesToHHMM(otTotal.value))

/* --------------------- Header meta --------------------- */
const deptMap = computed(()=>{ const m=new Map(); for(const d of departments.value){ m.set(d.department_id, d.department_name) } return m })
const empDeptName = computed(()=> emp.value ? (deptMap.value.get(emp.value.user_department) || '') : '')

const empDeptSchedule = computed(()=> {
  const deptId = emp.value?.user_department
  if(!deptId) return null
  return schedules.value.find(s => s.department_id === deptId) || null
})

function prettyHHMM(hms){
  if(!hms) return ''
  try{ return dayjs(`2000-01-01T${hms}`).format('h:mma') }catch(e){ return hms }
}

const empDeptSchedulePretty = computed(()=> {
  const s = empDeptSchedule.value
  if(!s) return ''
  const start = s.work_start || s.workStart || s.start_time || s.time_in
  const end   = s.work_end   || s.workEnd   || s.end_time   || s.time_out
  if(!start || !end) return ''
  return `${prettyHHMM(start)} - ${prettyHHMM(end)}`
})

/* --------------------- Print --------------------- */
const printDetails = () => {
  try {
    const tbl = document.querySelector('table');
    const clone = tbl ? tbl.cloneNode(true) : null;

    // Remove the "Status" column from the cloned table if it exists
    if (clone) {
      const headers = Array.from(clone.querySelectorAll('thead th'));
      const statusIndex = headers.findIndex(th => th.textContent.trim().toLowerCase() === 'status');
      if (statusIndex >= 0) {
        headers[statusIndex]?.remove();
        clone.querySelectorAll('tbody tr').forEach(tr => {
          const cells = Array.from(tr.children);
          if (cells[statusIndex]) cells[statusIndex].remove();
        });
      }
    }

    const w = window.open('', '_blank');
    const name = (empName?.value ?? '');
    const pos  = (empPosition?.value ?? '');
    const from = (fromDate?.value ?? '');
    const to   = (toDate?.value ?? '');

    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Attendance - ${name}</title>
      <style>
        *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
        h1{font-size:18px;margin:0}
        h2{font-size:14px;margin:4px 0 0;color:#374151}
        .meta{margin:12px 0 16px;font-size:12px;color:#374151}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
        thead th{background:#f3f4f6}
        @page { size: A4; margin: 16mm; }
      </style></head><body>
      <h1>Employee Attendance</h1>
      <h2>${name}${pos ? ' — ' + pos : ''}</h2>
      <div class="meta">Range: ${from || '(start)'} to ${to || '(end)'}</div>
      ${clone ? clone.outerHTML : '<p>No attendance details available to print.</p>'}
      <script>window.onload=function(){window.print(); setTimeout(()=>window.close(), 250);}<\/script>
      </body></html>`);
    w.document.close();
  } catch (e) {
    console.error('Print failed', e);
    window.print();
  }
};

/* --------------------- Ranges / Quick --------------------- */
const minStartStr   = computed(() => dayjs('2025-10-10').format('YYYY-MM-DD'))
const yesterdayStr  = computed(() => dayjs().subtract(1,'day').format('YYYY-MM-DD'))
const quickSelect   = ref('')

function applyQuickDropdown(){
  const v = String(quickSelect.value || '')
  const today = dayjs().startOf('day')
  const min = dayjs(minStartStr.value)
  const y   = dayjs(yesterdayStr.value)
  if(v === '0'){
    let fD = today; if (fD.isBefore(min)) fD = min; if (fD.isAfter(y)) fD = y;
    fromDate.value = fD.format('YYYY-MM-DD')
    toDate.value = fD.format('YYYY-MM-DD')
  } else if(v === '7' || v === '14' || v === '30'){
    const days = parseInt(v, 10)
    let tD = today; if (tD.isAfter(y)) tD = y;
    let fD = tD.subtract(days-1, 'day'); if (fD.isBefore(min)) fD = min;
    fromDate.value = fD.format('YYYY-MM-DD')
    toDate.value = tD.format('YYYY-MM-DD')
  }
  quickSelect.value = ''
}

watch([fromDate, toDate], ([f, t]) => {
  const min = dayjs(minStartStr.value)
  const y   = dayjs(yesterdayStr.value)
  let fD = dayjs(String(f || minStartStr.value))
  let tD = dayjs(String(t || yesterdayStr.value))
  if (fD.isBefore(min)) fD = min
  if (fD.isAfter(y))    fD = y
  if (tD.isBefore(fD))  tD = fD
  if (tD.isAfter(y))    tD = y
  const fNew = fD.format('YYYY-MM-DD')
  const tNew = tD.format('YYYY-MM-DD')
  if (fNew !== (fromDate.value||'')) fromDate.value = fNew
  if (tNew !== (toDate.value||''))   toDate.value = tNew
})

/* --------------------- Identity bits --------------------- */
const initials = computed(()=> {
  const f = (emp.value?.user_fname || '').trim()
  const l = (emp.value?.user_lname || '').trim()
  const fi = f ? f[0].toUpperCase() : ''
  const li = l ? l[0].toUpperCase() : ''
  return (fi + li) || '—'
})
const empImage = computed(()=> emp.value?.user_image || '')

/* --------------------- Load --------------------- */
onMounted(async()=>{
  const [u,s,a,d] = await Promise.all([fetchUsers(), fetchSchedules(), fetchAttendance(), fetchDepartments()])
  users.value = u; schedules.value = s; attendance.value = a; departments.value = d;
  // Default to last 30 days
  if(!fromDate.value){ fromDate.value = dayjs().subtract(29,'day').format('YYYY-MM-DD') }
  if(!toDate.value){   toDate.value   = dayjs().format('YYYY-MM-DD') }
})
</script>

<style scoped>
.table-wrap { margin-top: 12px; }
table { width: 100%; border-collapse: separate; border-spacing: 0; }
thead th {
  text-align: left;
  font-size: 12px;
  color: #667085;
  font-weight: 600;
  padding: 10px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
tbody td {
  padding: 12px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 14px;
}
tbody tr:hover { background: #fafcff; }
.chip {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.chip.success { background: #ecfdf3; color: #027a48; }
.chip.warning { background: #fff6ed; color: #b54708; }
.chip.danger  { background: #fef3f2; color: #b42318; }
</style>

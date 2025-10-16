<template>
  <section class="page">
    <!-- Header / User + Range + Print -->
    <div class="card header-card">
      <div class="header-grid">
        <!-- Left: Back -->
        <div class="left">
          <button class="btn btn-ghost no-print" @click="$router.push({ name: 'monitoring' })">
            ← Back
          </button>
        </div>

        <!-- Center: Title -->
        <div class="center">
          <h3 class="title">Employee Details</h3>
        </div>

        <!-- Right: Range + Print -->
        <div class="right">
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

      <!-- User card -->
      <div class="user-card">
        <div class="avatar">
          <img v-if="empImage" :src="empImage" alt="User" />
          <span v-else class="avatar-initials">{{ initials }}</span>
        </div>

        <div class="info-grid">
          <div>
            <div class="emp-name">{{ empName }}</div>
            <div v-if="empPosition" class="muted small">{{ empPosition }}</div>
          </div>
          <div class="right-align">
            <div v-if="empDeptName" class="emp-dept">{{ empDeptName }}</div>
            <div v-if="empDeptSchedulePretty" class="muted small">Work: {{ empDeptSchedulePretty }}</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters no-print">
        <div class="field">
          <label>From</label>
          <input type="date" v-model="fromDate" :min="minStartStr" :max="yesterdayStr" />
        </div>
        <div class="field">
          <label>To</label>
          <input type="date" v-model="toDate" :min="fromDate" :max="yesterdayStr" />
        </div>
        <div class="field">
          <label>Quick Filter</label>
          <select v-model="quickSelect" @change="applyQuickDropdown">
            <option value="">— Select —</option>
            <option value="0">Yesterday</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
        <div class="field">
          <label>Filter by Status</label>
          <select v-model="statusFilter">
            <option value="All">All</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Rest Day">Rest Day</option>
          </select>
        </div>
        <div class="grow"></div>
      </div>

      <!-- KPI cards (screen only) -->
      <div class="kpi-grid no-print">
        <div class="kpi-card">
          <div class="kpi-label">Days Attended</div>
          <div class="kpi-value">{{ totalDaysAttended }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Days Absent</div>
          <div class="kpi-value">{{ totalDaysAbsent }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Work Hours</div>
          <div class="kpi-value">{{ totalWorkHoursHHMM }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Overtime (hrs)</div>
          <div class="kpi-value">{{ totalOvertimeHHMM }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Late (hrs)</div>
          <div class="kpi-value">{{ totalLateHHMM }}</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time In</th>
              <th>Lunch Start</th>
              <th>Lunch End</th>
              <th>Break Start</th>
              <th>Break End</th>
              <th>Time Out</th>
              <th>Work Hours</th>
              <th>Overtime</th>
              <th>Late</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in displayedRows" :key="r.log_id">
              <td>{{ r.date_fmt }}</td>
              <td>{{ r.time_in_fmt || "-" }}</td>
              <td>{{ r.lunch_start_fmt || "-" }}</td>
              <td>{{ r.lunch_end_fmt || "-" }}</td>
              <td>{{ r.break_start_fmt || "-" }}</td>
              <td>{{ r.break_end_fmt || "-" }}</td>
              <td>{{ r.time_out_fmt || "-" }}</td>
              <td>{{ r.workMinutes != null ? minutesToHHMM(r.workMinutes) : "-" }}</td>
              <td>{{ r.overtime_fmt || "-" }}</td>
              <td>{{ r.lateMinutes != null ? minutesToHHMM(r.lateMinutes) : "-" }}</td>
              <td>
                <span class="chip" :class="statusChip(r.status)">{{ r.status }}</span>
              </td>
            </tr>
            <tr v-if="displayedRows.length === 0">
              <td colspan="11" class="muted center">No records in range.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import dayjs from "dayjs";

import {
  fetchUsers,
  fetchSchedules,
  fetchAttendance,
  fetchDepartments,
} from "../services/api";
import {
  fmtDate,
  fmtTime,
  minutesToHHMM,
  minutesPrettyWithTotal,
  computeStatus,
  displayTimeOutWhenMissing,
} from "../utils/time";

/* ---------- Filters & helpers ---------- */
const statusFilter = ref("All");

function normalizeStatus(s) {
  if (!s) return "Absent";
  const t = String(s).toLowerCase();
  if (t.includes("rest")) return "Rest Day";
  if (t.includes("absent") || t.includes("no show")) return "Absent";
  return "Present";
}

const displayedRows = computed(() => {
  const base = Array.isArray(rows?.value) ? rows.value : rows;
  const mapped = (base || []).map((r) => ({ ...r, status: normalizeStatus(r.status) }));
  if (statusFilter.value === "All") return mapped;
  return mapped.filter((r) => r.status === statusFilter.value);
});

function pickTime(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k]) return obj[k];
  }
  return null;
}
function prettyAnyTime(v, logDate) {
  if (!v) return "";
  const str = String(v);
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const hhmmss = str.length === 5 ? str + ":00" : str;
    return dayjs(`${logDate}T${hhmmss}`).format("h:mma");
  }
  return fmtTime(v);
}

/* ---------- Range pretty text ---------- */
const prettyRange = computed(() => {
  if (!fromDate.value || !toDate.value) return "—";
  const f = dayjs(String(fromDate.value)).format("MMM D, YYYY");
  const t = dayjs(String(toDate.value)).format("MMM D, YYYY");
  return f === t ? f : `${f} — ${t}`;
});

/* ---------- Route & state ---------- */
const route = useRoute();
const userId = Number(route.params.id);

const users = ref([]);
const schedules = ref([]);
const attendance = ref([]);
const departments = ref([]);

const fromDate = ref("");
const toDate = ref("");

const emp = computed(() => users.value.find((u) => u.user_id === userId));
const empName = computed(() =>
  emp.value ? `${emp.value.user_fname} ${emp.value.user_lname}` : `User #${userId}`
);

/* Present badge styling */
function statusChip(s) {
  const v = String(s || "").toLowerCase();
  if (v === "present" || v === "on time" || v === "overtime") return "chip-ok";
  if (v.includes("rest")) return "chip-muted";
  if (v === "absent") return "chip-danger";
  if (v.includes("late") || v.includes("missing")) return "chip-warn";
  return "";
}

const schedByDept = computed(() => {
  const m = new Map();
  for (const s of schedules.value) m.set(s.department_id, s);
  return m;
});

const hire = computed(() => {
  const d = emp.value?.user_dateOfHire ? dayjs(emp.value.user_dateOfHire) : null;
  return d && d.isValid() ? d : null;
});

/* ---------- Row builder ---------- */
const rows = computed(() => {
  if (!fromDate.value || !toDate.value) return [];
  const start = dayjs(String(fromDate.value)).startOf("day");
  const end = dayjs(String(toDate.value)).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return [];

  const logs = attendance.value.filter((l) => {
    if (l.user_id !== userId) return false;
    const d = dayjs(String(l.log_date));
    return (
      (d.isAfter(start, "day") || d.isSame(start, "day")) &&
      (d.isBefore(end, "day") || d.isSame(end, "day"))
    );
  });

  const byDate = new Map();
  for (const l of logs) byDate.set(String(l.log_date), l);

  const deptId = emp.value ? emp.value.user_department : null;
  const sc = deptId ? schedByDept.value.get(deptId) : null;
  const note =
    sc && sc.workdays_note
      ? String(sc.workdays_note).toLowerCase()
      : "mon,tue,wed,thu,fri";

  const dayMap = { sun:0,sunday:0, mon:1,monday:1, tue:2,tuesday:2, wed:3,wednesday:3, thu:4,thursday:4, fri:5,friday:5, sat:6,saturday:6 };
  const working = new Set();
  note.split(/[\s,\/|\-]+/).forEach((tok) => {
    if (Object.prototype.hasOwnProperty.call(dayMap, tok)) working.add(dayMap[tok]);
  });
  if (working.size === 0) [1,2,3,4,5].forEach((d) => working.add(d));

  let d = start.clone();
  const synth = [];
  const hasHire = !!hire.value;
  while (d.isBefore(end) || d.isSame(end, "day")) {
    const ds = d.format("YYYY-MM-DD");
    if (!byDate.has(ds)) {
      if (hasHire && d.isBefore(hire.value, "day")) {
        synth.push({ log_id: "prehire-" + ds, user_id: userId, log_date: ds, department_id: deptId, status: "Prehire", time_in: null, time_out: null, lateMinutes: 0, overtimeMinutes: 0 });
      } else {
        const wd = d.day();
        if (working.has(wd)) {
          synth.push({ log_id: "abs-" + ds, user_id: userId, log_date: ds, department_id: deptId, status: "Absent", time_in: null, time_out: null, lateMinutes: 0, overtimeMinutes: 0 });
        } else {
          synth.push({ log_id: "rest-" + ds, user_id: userId, log_date: ds, department_id: deptId, status: "Rest Day", time_in: null, time_out: null, lateMinutes: 0, overtimeMinutes: 0 });
        }
      }
    }
    d = d.add(1, "day");
  }

  const merged = logs.concat(synth).map((l) => {
    const scd = schedByDept.value.get(l.department_id || deptId) || {};
    const expectedStart = scd?.work_start || "08:00:00";
    const expectedEnd = scd?.work_end || "17:00:00";

    const stat =
      l.status === "Rest Day" || l.status === "Prehire"
        ? { totalMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, status: l.status }
        : computeStatus({
            time_in: l.time_in,
            time_out: l.time_out,
            expectedStart,
            expectedEnd,
          });

    const outPretty = l.time_out
      ? fmtTime(l.time_out)
      : displayTimeOutWhenMissing({ log_date: l.log_date, expectedStart });

    const lunchStartRaw = pickTime(l, ["lunch_start","lunchStart","lunch_in","lunchIn"]);
    const lunchEndRaw   = pickTime(l, ["lunch_end","lunchEnd","lunch_out","lunchOut"]);
    const breakStartRaw = pickTime(l, ["break_start","breakStart","break_in","breakIn"]);
    const breakEndRaw   = pickTime(l, ["break_end","breakEnd","break_out","breakOut"]);

    // parse helper
    const day = String(l.log_date);
    function parseHM(baseDate, hm) {
      if (!hm) return null;
      const s = String(hm).trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
        const hhmmss = /^\d{1,2}:\d{2}$/.test(s) ? s + ":00" : s;
        return dayjs(`${baseDate}T${hhmmss}`);
      }
      const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
      if (m) {
        let hh = parseInt(m[1], 10) % 12;
        if (/p/i.test(m[3])) hh += 12;
        const mm = String(parseInt(m[2], 10)).padStart(2, "0");
        return dayjs(`${baseDate}T${String(hh).padStart(2,"0")}:${mm}:00`);
      }
      const dt = dayjs(s);
      return dt.isValid() ? dt : null;
    }

    // schedule refs
    const schedStart   = parseHM(day, scd?.work_start || "08:00:00");
    const schedEnd     = parseHM(day, scd?.work_end   || "17:00:00");
    const schedLunchEnd= parseHM(day, scd?.lunch_end  || scd?.lunchEnd || null);
    const schedBreakEnd= parseHM(day, scd?.break_end  || scd?.breakEnd || null);

    // 5-min grace
    const graceTime = schedStart ? schedStart.add(5, "minute") : null;

    const actualIn       = parseHM(day, l.time_in ? fmtTime(l.time_in) : null) || parseHM(day, l.time_in);
    const actualLunchEnd = parseHM(day, lunchEndRaw);
    const actualBreakEnd = parseHM(day, breakEndRaw);

    let lateFromIn = 0;
    if (graceTime && actualIn && actualIn.isAfter(graceTime)) lateFromIn = actualIn.diff(graceTime, "minute");

    let lateFromLunchEnd = 0;
    if (schedLunchEnd && actualLunchEnd && actualLunchEnd.isAfter(schedLunchEnd)) lateFromLunchEnd = actualLunchEnd.diff(schedLunchEnd, "minute");

    let lateFromBreakEnd = 0;
    if (schedBreakEnd && actualBreakEnd && actualBreakEnd.isAfter(schedBreakEnd)) lateFromBreakEnd = actualBreakEnd.diff(schedBreakEnd, "minute");

    const customLateMinutes = lateFromIn + lateFromLunchEnd + lateFromBreakEnd;

    const isOff = stat.status === "Rest Day" || stat.status === "Absent";
    const tOutParsed = parseHM(day, l.time_out ? fmtTime(l.time_out) : null) || parseHM(day, l.time_out);

    const hhmmStrToMinutes = (s) => {
      if (!s) return 0;
      const m = String(s).match(/^\s*(\d+)\s*h\s+(\d+)\s*m\s*$/i);
      if (!m) return 0;
      return (parseInt(m[1],10)||0) * 60 + (parseInt(m[2],10)||0);
    };

    let workMinutesOverride = null;
    if (tOutParsed && schedStart && schedEnd && (tOutParsed.isBefore(schedEnd) || tOutParsed.isSame(schedEnd))) {
      workMinutesOverride = Math.max(0, Math.min(tOutParsed.diff(schedStart, "minute") - 60, 480));
    } else if (tOutParsed && schedStart && schedEnd && tOutParsed.isAfter(schedEnd)) {
      workMinutesOverride = Math.max(0, schedEnd.diff(schedStart, "minute") - 60);
    }

    // Work-hours rule (existing)
    let workMinutesFinal;
    if (!isOff && tOutParsed) {
      const lateStr = minutesToHHMM(customLateMinutes);
      const lateFromStrMins = hhmmStrToMinutes(lateStr);

      let undertimeMins = 0;
      if (schedEnd && tOutParsed.isBefore(schedEnd)) undertimeMins = schedEnd.diff(tOutParsed, "minute");
      const undertimeStr = minutesToHHMM(undertimeMins);
      const undertimeFromStrMins = hhmmStrToMinutes(undertimeStr);

      workMinutesFinal = Math.max(0, 480 - lateFromStrMins - undertimeFromStrMins);
    } else {
      const normalizedStatusForRow = normalizeStatus(stat.status);
      const noTimeOut = !l.time_out;
      workMinutesFinal = isOff ? null : (workMinutesOverride != null ? workMinutesOverride : stat.totalMinutes);
      if (!isOff && normalizedStatusForRow === "Present" && noTimeOut) workMinutesFinal = 240;
    }

    return {
      ...l,
      date_fmt: dayjs(String(l.log_date)).format("MMM D, YYYY"),
      time_in_fmt: isOff ? "" : fmtTime(l.time_in),
      lunch_start_fmt: isOff ? "" : (lunchStartRaw ? prettyAnyTime(lunchStartRaw, l.log_date) : ""),
      lunch_end_fmt:   isOff ? "" : (lunchEndRaw   ? prettyAnyTime(lunchEndRaw,   l.log_date) : ""),
      break_start_fmt: isOff ? "" : (breakStartRaw ? prettyAnyTime(breakStartRaw, l.log_date) : ""),
      break_end_fmt:   isOff ? "" : (breakEndRaw   ? prettyAnyTime(breakEndRaw,   l.log_date) : ""),
      time_out_fmt: isOff ? "" : outPretty,
      workMinutes: workMinutesFinal,
      lateMinutes: isOff ? null : customLateMinutes,
      overtimeMinutes: isOff ? null : stat.overtimeMinutes,
      overtime_fmt: isOff ? "" : ((stat.overtimeMinutes || 0) >= 90 ? minutesToHHMM(stat.overtimeMinutes) : "0"),
      status: stat.status,
    };
  });

  merged.sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
  return merged;
});

/* ---------- KPIs ---------- */
const presentCount = computed(() =>
  rows.value.filter((r) => r.status !== "Absent" && r.status !== "Rest Day" && r.status !== "Prehire").length
);
const absentCount = computed(() => rows.value.filter((r) => r.status === "Absent").length);
const restCount = computed(() => rows.value.filter((r) => r.status === "Rest Day").length);

const lateDays = computed(() =>
  rows.value.filter((r) => (r.lateMinutes || 0) > 0 && r.status !== "Absent" && r.status !== "Rest Day" && r.status !== "Prehire").length
);
const otDays = computed(() =>
  rows.value.filter((r) => (r.overtimeMinutes || 0) > 0 && r.status !== "Absent" && r.status !== "Rest Day" && r.status !== "Prehire").length
);

const totalDaysAttended = computed(() =>
  rows.value.filter((r) => r.status !== "Absent" && r.status !== "Rest Day" && r.status !== "Prehire").length
);
const totalDaysAbsent = computed(() => rows.value.filter((r) => r.status === "Absent").length);

const lateTotal = computed(() => rows.value.reduce((acc, r) => acc + (r.lateMinutes || 0), 0));
const otTotal = computed(() => rows.value.reduce((acc, r) => acc + (r.overtimeMinutes || 0), 0));
const totalWorkHoursHHMM = computed(() => minutesToHHMM(rows.value.reduce((sum, r) => sum + (r.workMinutes || 0), 0)));

const latePretty = computed(() => minutesPrettyWithTotal(lateTotal.value));
const lateHHMM = computed(() => minutesToHHMM(lateTotal.value));
const otPretty = computed(() => minutesPrettyWithTotal(otTotal.value));
const otHHMM = computed(() => minutesToHHMM(otTotal.value));
const totalOvertimeHHMM = computed(() => minutesToHHMM(otTotal.value));
const totalLateHHMM = computed(() => minutesToHHMM(lateTotal.value));

/* ---------- Header meta ---------- */
const empPosition = computed(() => emp.value?.user_position || "");

const deptMap = computed(() => {
  const m = new Map();
  for (const d of departments.value) m.set(d.department_id, d.department_name);
  return m;
});
const empDeptName = computed(() => (emp.value ? deptMap.value.get(emp.value.user_department) || "" : ""));

const empDeptSchedule = computed(() => {
  const deptId = emp.value?.user_department;
  if (!deptId) return null;
  return schedules.value.find((s) => s.department_id === deptId) || null;
});
function prettyHHMM(hms) {
  if (!hms) return "";
  try { return dayjs(`2000-01-01T${hms}`).format("h:mma"); } catch { return hms; }
}
const empDeptSchedulePretty = computed(() => {
  const s = empDeptSchedule.value;
  if (!s) return "";
  const start = s.work_start || s.workStart || s.start_time || s.time_in;
  const end   = s.work_end   || s.workEnd   || s.end_time   || s.time_out;
  if (!start || !end) return "";
  return `${prettyHHMM(start)} - ${prettyHHMM(end)}`;
});

/* ---------- Print (KPI as text, not cards) ---------- */
const printDetails = () => {
  try {
    const tbl = document.querySelector(".table");
    const tableHTML = tbl ? tbl.outerHTML : "<p>No attendance details available to print.</p>";

    const empN = empName?.value ?? "";
    const pos = empPosition?.value ?? "";
    const dept = empDeptName?.value ?? "";
    const sched = empDeptSchedulePretty?.value ?? "";
    const range = prettyRange.value;

    const kpiText = `
      <div class="kpi-lines">
        <div><strong>Days Attended:</strong> ${totalDaysAttended.value}</div>
        <div><strong>Days Absent:</strong> ${totalDaysAbsent.value}</div>
        <div><strong>Total Work Hours:</strong> ${totalWorkHoursHHMM.value}</div>
        <div><strong>Total Overtime (hrs):</strong> ${totalOvertimeHHMM.value}</div>
        <div><strong>Total Late (hrs):</strong> ${totalLateHHMM.value}</div>
      </div>`;

    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Attendance - ${empN}</title>
      <style>
        *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
        body{padding:18px;color:#111827}
        h1{font-size:18px;margin:0 0 4px}
        h2{font-size:14px;margin:0;color:#374151}
        .meta{margin:10px 0 12px;font-size:12px;color:#374151}
        .kpi-lines{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;
          font-size:13px;margin:8px 0 16px}
        .kpi-lines div{padding:6px 8px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
        thead th{background:#f3f4f6}
        @page { size: A4; margin: 14mm; }
      </style></head><body>
      <h1>Employee Attendance</h1>
      <h2>${empN}${pos ? " — " + pos : ""}</h2>
      <div class="meta">
        ${dept ? "Department: " + dept + " · " : ""}${sched ? "Schedule: " + sched + " · " : ""}Range: ${range}
      </div>
      ${kpiText}
      ${tableHTML}
      <script>window.onload=function(){window.print(); setTimeout(()=>window.close(), 250);}<\/script>
      </body></html>`);
    w.document.close();
  } catch (e) {
    console.error("Print failed", e);
    window.print();
  }
};

/* ---------- Mount & date controls ---------- */
const quickSelect = ref("");

onMounted(async () => {
  const [u, s, a, d] = await Promise.all([fetchUsers(), fetchSchedules(), fetchAttendance(), fetchDepartments()]);
  users.value = u;
  schedules.value = s;
  attendance.value = a;
  departments.value = d;

  // Defaults:
  // To = yesterday; From = 7 days before yesterday
  const y = dayjs().subtract(1, "day");
  toDate.value = y.format("YYYY-MM-DD");
  fromDate.value = y.subtract(7, "day").format("YYYY-MM-DD"); // 7 days ago from yesterday
});

function applyQuickDropdown() {
  const v = String(quickSelect.value || "");
  const today = dayjs().startOf("day");
  const min = dayjs(minStartStr.value);
  const y = dayjs(yesterdayStr.value);
  if (v === "0") {
    let fD = y;
    fromDate.value = fD.format("YYYY-MM-DD");
    toDate.value = fD.format("YYYY-MM-DD");
  } else if (v === "7" || v === "14" || v === "30") {
    const days = parseInt(v, 10);
    let tD = y;
    let fD = tD.subtract(days - 1, "day");
    if (fD.isBefore(min)) fD = min;
    fromDate.value = fD.format("YYYY-MM-DD");
    toDate.value = tD.format("YYYY-MM-DD");
  }
  quickSelect.value = "";
}

const minStartStr = computed(() => dayjs("2025-10-10").format("YYYY-MM-DD"));
const yesterdayStr = computed(() => dayjs().subtract(1, "day").format("YYYY-MM-DD"));

watch([fromDate, toDate], ([f, t]) => {
  const min = dayjs(minStartStr.value);
  const y = dayjs(yesterdayStr.value);
  let fD = dayjs(String(f || minStartStr.value));
  let tD = dayjs(String(t || yesterdayStr.value));
  if (fD.isBefore(min)) fD = min;
  if (fD.isAfter(y)) fD = y;
  if (tD.isBefore(fD)) tD = fD;
  if (tD.isAfter(y)) tD = y;
  const fNew = fD.format("YYYY-MM-DD");
  const tNew = tD.format("YYYY-MM-DD");
  if (fNew !== (fromDate.value || "")) fromDate.value = fNew;
  if (tNew !== (toDate.value || "")) toDate.value = tNew;
});

/* ---------- UI bits ---------- */
const initials = computed(() => {
  const f = (emp.value?.user_fname || "").trim();
  const l = (emp.value?.user_lname || "").trim();
  const fi = f ? f[0].toUpperCase() : "";
  const li = l ? l[0].toUpperCase() : "";
  return fi + li || "—";
});
const empImage = computed(() => emp.value?.user_image || "");
</script>

<style scoped>
/* Page & cards (jake-ui) */
.page { display: grid; gap: 12px; }
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 2px 5px rgba(17, 24, 39, 0.04);
  padding: 16px;
}

/* Header grid: Back | Title | Range + Print */
.header-card { padding: 16px; }
.header-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.left { justify-self: start; }
.center { justify-self: center; }
.right { justify-self: end; display: inline-flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.title { font-size: 18px; font-weight: 800; margin: 0; color: #111827; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 12px; border: 1px solid #111827;
  background: #111827; color: #fff; font-weight: 700; font-size: 12px; cursor: pointer;
  box-shadow: 0 2px 4px rgba(17,24,39,.06);
}
.btn:hover { opacity: .96; transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-ghost {
  border: 1px solid #e5e7eb; background: #fff; color: #111827; font-weight: 600;
}
.btn-ghost:hover { background: #f9fafb; }
.btn-icon { display: block; }
.btn-print { padding-inline: 14px; }

/* Range badge */
.range-wrap {
  display: inline-flex; align-items: center; gap: 6px;
  background: #f8fafc; border: 1px solid #e5e7eb; padding: 6px 10px;
  border-radius: 999px; color: #374151; font-weight: 600;
}
.range-icon { font-size: 12px; }
.range-badge { font-size: 12px; letter-spacing: .01em; }

/* User card */
.user-card {
  display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center;
  border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; background: #fff;
}
.avatar { width: 64px; height: 64px; border-radius: 50%; background: #f3f4f6; overflow: hidden; display: grid; place-items: center; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-weight: 700; color: #9ca3af; }
.info-grid { display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; width: 100%; }
.emp-name { font-weight: 800; font-size: 16px; line-height: 1.1; color: #111827; }
.emp-dept { font-weight: 700; color: #111827; }
.right-align { text-align: right; }

/* Filters */
.filters {
  display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 10px; margin-top: 12px;
}
.field { grid-column: span 3 / span 3; display: flex; flex-direction: column; gap: 6px; }
.grow { grid-column: span 3 / span 3; }
label { font-size: 12px; color: #6b7280; font-weight: 600; }
input, select {
  padding: 9px 10px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none; font-size: 14px; background: #fff;
}
input:focus, select:focus { border-color: #111827; }
@media (max-width: 900px) {
  .header-grid { grid-template-columns: 1fr; }
  .center { justify-self: start; }
  .right { justify-self: start; }
  .filters { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .field, .grow { grid-column: span 3 / span 3; }
}

/* KPIs (screen) */
.kpi-grid {
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 12px;
}
.kpi-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.kpi-label { font-size: 12px; font-weight: 700; letter-spacing: .02em; color: #6b7280; text-transform: uppercase; }
.kpi-value { font-size: 28px; font-weight: 800; line-height: 1; }

/* Table (uniform font) */
.table { width: 100%; border-collapse: collapse; font-size: 13px; overflow: hidden; border-radius: 12px; }
.table thead th {
  text-align: left; background: #f8fafc; color: #374151; font-weight: 700;
  border-bottom: 1px solid #e5e7eb; padding: 10px;
}
.table td { border-top: 1px solid #f1f5f9; padding: 10px; vertical-align: middle; }
.table tbody tr:hover { background: #fafafa; }

/* Chips */
.chip {
  display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; border: 1px solid transparent;
}
.chip-ok { background: #ecfdf5; color: #0f766e; border-color: #a7f3d0; }
.chip-warn { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
.chip-danger { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
.chip-muted { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }

/* Helpers */
.muted { color: #6b7280; }
.small { font-size: 12px; }
.center { text-align: center; }
</style>

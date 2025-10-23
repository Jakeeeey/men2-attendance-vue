<template>
  <section class="page">
    <!-- Header / Filters (fixed block, never scrolls) -->
    <div class="card header-card">
      <div class="title-row">
        <h3 class="title">Summary Reports</h3>
        <button
          class="btn-print no-print"
          @click="printSummary"
          aria-label="Print Summary"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M6 9V2h12v7h1a3 3 0 0 1 3 3v5h-4v4H6v-4H2v-5a3 3 0 0 0-1-1H5a1 1 0 0 0-1 1Zm3-7h8v7H8V2Zm8 18H8v2h8v-2ZM4 12v3h16v-3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1Zm3-7h8v2H7V5Z"
            />
          </svg>
          <span>Print</span>
        </button>
      </div>
      <div class="filters">
        <div class="field">
          <label>From</label>
          <!-- NEW: Start from Oct 10, 2025 and disable earlier dates -->
          <input type="date" v-model="fromDate" :min="fromMinDate" :max="toDate" />
        </div>
        <div class="field">
          <label>To</label>
          <input type="date" v-model="toDate" :min="fromDate" :max="yesterdayStr" />
        </div>
        <div class="field">
          <label>Department</label>
          <select v-model.number="deptFilter">
            <option :value="0">All</option>
            <option
              v-for="d in departments"
              :key="d.department_id"
              :value="d.department_id"
            >
              {{ d.department_name }}
            </option>
          </select>
        </div>

        <!-- NEW: Search Employee (after Department) -->
        <div class="field">
          <label>Search Employee</label>
          <input type="text" v-model.trim="empSearch" placeholder="Type a name…" />
        </div>

        <div class="grow"></div>
      </div>

      <!-- Columns checkbox group -->
      <div class="columns-row">
        <span class="columns-label">Columns</span>
        <div class="columns-chks">
          <label class="chk">
            <input type="checkbox" v-model="showTotalWorking" />
            <span>Show Total Work</span>
          </label>
          <label class="chk">
            <input type="checkbox" v-model="showLate" />
            <span>Show Late</span>
          </label>
          <label class="chk">
            <input type="checkbox" v-model="showOvertime" />
            <span>Show Overtime</span>
          </label>
          <label class="chk">
            <input type="checkbox" v-model="showUndertime" />
            <span>Show Undertime</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Table (only this scrolls horizontally) -->
    <div class="card" style="overflow: hidden">
      <div
        ref="scrollHost"
        class="table-wrap overflow-x-auto"
        aria-label="Scrollable attendance grid"
        role="region"
        style="
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          overscroll-behavior-y: none;
        "
      >
        <!-- Grow to content width so the wrapper provides the ONLY horizontal scroll -->
        <table
          class="grid-table"
          :style="[{ minWidth: gridMinPx }, { width: 'max-content' }]"
        >
          <thead>
            <!-- Date groups -->
            <tr>
              <th
                class="sticky-col name-col"
                rowspan="2"
                :style="{
                  minWidth: nameMinPx,
                  position: 'sticky',
                  left: '0px',
                  top: '0px',
                  zIndex: 5,
                  background: '#f8fafc',
                }"
              >
                Name
              </th>
              <th
                v-for="d in days"
                :key="'grp-' + d.ymd"
                class="date-group"
                :colspan="perDayCols"
                :style="{ minWidth: groupMinPx }"
              >
                <div class="date-head">
                  <div class="dow">{{ d.dow }}</div>
                  <div class="dmy">{{ d.dmy }}</div>
                </div>
              </th>
              <!-- NEW TOTAL COLUMNS (rowspan to cover both header rows) -->
              <th class="total-head" rowspan="2" :style="{ minWidth: colMinPx }">
                Total Work Hours
              </th>
              <th class="total-head" rowspan="2" :style="{ minWidth: colMinPx }">
                Total Late
              </th>
              <th class="total-head" rowspan="2" :style="{ minWidth: colMinPx }">
                Total Overtime
              </th>
            </tr>
            <!-- T / L / O / U -->
            <tr>
              <template v-for="d in days" :key="'sub-' + d.ymd">
                <th
                  v-if="showTotalWorking"
                  class="sub-col sub-t"
                  :style="{ minWidth: colMinPx }"
                >
                  T
                </th>
                <th v-if="showLate" class="sub-col" :style="{ minWidth: colMinPx }">L</th>
                <th v-if="showOvertime" class="sub-col" :style="{ minWidth: colMinPx }">
                  O
                </th>
                <th v-if="showUndertime" class="sub-col" :style="{ minWidth: colMinPx }">
                  U
                </th>
              </template>
            </tr>
          </thead>

          <tbody>
            <template v-for="u in filteredUsers" :key="u.user_id">
              <tr>
                <td class="sticky-col name-col" :style="{ minWidth: nameMinPx }">
                  <div class="emp-name">{{ u.user_fname }} {{ u.user_lname }}</div>
                  <div class="emp-meta">
                    <span class="dept">{{ deptName(u.user_department) }}</span>
                  </div>
                </td>

                <template v-for="d in days" :key="u.user_id + '-' + d.ymd">
                  <!-- ONE-CELL GROUP for RD or Absent -->
                  <template v-if="dayGroupMode(u.user_id, d.ymd) === 'rd'">
                    <td
                      class="kcell is-rd"
                      :colspan="perDayCols"
                      :style="{ minWidth: groupMinPx }"
                    >
                      <span class="chip rd">RD</span>
                    </td>
                  </template>

                  <template v-else-if="dayGroupMode(u.user_id, d.ymd) === 'absent'">
                    <td
                      class="kcell"
                      :colspan="perDayCols"
                      :style="{ minWidth: groupMinPx }"
                    >
                      <span class="chip chip-absent">Absent</span>
                    </td>
                  </template>

                  <!-- NORMAL CELLS -->
                  <template v-else>
                    <!-- T (Total Working) -->
                    <td
                      v-if="showTotalWorking"
                      class="kcell k-t"
                      :style="{ minWidth: colMinPx }"
                    >
                      {{ cell(u.user_id, d.ymd).workHHMM }}
                    </td>

                    <!-- L -->
                    <td v-if="showLate" class="kcell k-l" :style="{ minWidth: colMinPx }">
                      {{ cell(u.user_id, d.ymd).lateHHMM }}
                    </td>
                    <!-- O -->
                    <td
                      v-if="showOvertime"
                      class="kcell k-o"
                      :style="{ minWidth: colMinPx }"
                    >
                      {{ cell(u.user_id, d.ymd).otHHMM }}
                    </td>
                    <!-- U -->
                    <td
                      v-if="showUndertime"
                      class="kcell k-u"
                      :style="{ minWidth: colMinPx }"
                    >
                      {{ cell(u.user_id, d.ymd).utHHMM }}
                    </td>
                  </template>
                </template>

                <!-- NEW: ROW TOTALS -->
                <td class="kcell total total-work" :style="{ minWidth: colMinPx }">
                  {{ displayHMM(rowTotals(u.user_id).w) }}
                </td>
                <td class="kcell total total-late" :style="{ minWidth: colMinPx }">
                  {{ displayHMM(rowTotals(u.user_id).l) }}
                </td>
                <td class="kcell total total-ot" :style="{ minWidth: colMinPx }">
                  {{ displayHMM(rowTotals(u.user_id).o) }}
                </td>
              </tr>
            </template>

            <tr v-if="filteredUsers.length === 0">
              <td class="center muted" :colspan="days.length * perDayCols + 4">
                No employees for the selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import dayjs from "dayjs";
import {
  fetchUsers,
  fetchDepartments,
  fetchSchedules,
  fetchAttendance,
  fetchOnCallList,
  fetchOnCallSchedules,
} from "../../services/api";
import { computeStatus } from "../../utils/time";

/* ------------ State ------------ */
const users = ref([]);
const departments = ref([]);
const schedules = ref([]);
const attendance = ref([]);

/* --- jake-oncall datasets --- */
const onCallList = ref([]);
const onCallSchedules = ref([]);

const fromDate = ref("");
const toDate = ref("");
const deptFilter = ref(0);
/* NEW: Search Employee text */
const empSearch = ref("");

/* UI-only: checkbox models */
const showTotalWorking = ref(true);
const showLate = ref(true);
const showOvertime = ref(true);
const showUndertime = ref(true);

/* Track available width of the scroll host (for responsiveness) */
const scrollHost = ref(null);
const hostWidth = ref(1280);
let ro;
let windowMeasureHandler = null;

/* ------------ Helpers ------------ */
const yesterdayStr = computed(() => dayjs().subtract(1, "day").format("YYYY-MM-DD"));

/* NEW: hard minimum for "From" */
const FROM_MIN = dayjs("2025-10-10");
const fromMinDate = computed(() => FROM_MIN.format("YYYY-MM-DD"));

const deptMap = computed(() => {
  const m = new Map();
  for (const d of departments.value) m.set(d.department_id, d);
  return m;
});
const deptName = (id) => deptMap.value.get(id)?.department_name || "";

const deptLabel = computed(() =>
  deptFilter.value ? deptName(deptFilter.value) || "—" : "All"
);

/* Build days from range */
const days = computed(() => {
  if (!fromDate.value || !toDate.value) return [];
  let d = dayjs(String(fromDate.value));
  const end = dayjs(String(toDate.value));
  const arr = [];
  while (d.isBefore(end) || d.isSame(end, "day")) {
    arr.push({
      ymd: d.format("YYYY-MM-DD"),
      dow: d.format("ddd"),
      dmy: d.format("MMM D"),
    });
    d = d.add(1, "day");
  }
  return arr;
});

/* ===== Responsive sizing ===== */
const colMin = computed(() => {
  const w = hostWidth.value;
  if (w < 360) return 54;
  if (w < 420) return 60;
  if (w < 520) return 70;
  if (w < 640) return 78;
  if (w < 840) return 88;
  if (w < 1100) return 96;
  return 110;
});
const nameMin = computed(() => {
  const w = hostWidth.value;
  if (w < 360) return 120;
  if (w < 420) return 130;
  if (w < 520) return 150;
  if (w < 640) return 170;
  if (w < 840) return 190;
  if (w < 1100) return 210;
  return 240;
});
const colMinPx = computed(() => `${colMin.value}px`);
const nameMinPx = computed(() => `${nameMin.value}px`);

/* dynamic columns per day from all toggles */
const perDayCols = computed(() => {
  let n = 0;
  if (showTotalWorking.value) n++;
  if (showLate.value) n++;
  if (showOvertime.value) n++;
  if (showUndertime.value) n++;
  return n; // can be 0..4
});
const groupMinPx = computed(() => `${colMin.value * perDayCols.value}px`);
const gridMinPx = computed(() => {
  // +3 for the three total columns at the far right
  const cols =
    days.value.length * perDayCols.value * colMin.value +
    nameMin.value +
    3 * colMin.value;
  return `${cols}px`;
});

/* Attendance index */
const logsByUserDate = computed(() => {
  const m = new Map();
  for (const l of attendance.value) {
    m.set(`${l.user_id}|${String(l.log_date)}`, l);
  }
  return m;
});

/* Workdays parsing */
const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ALIASES = {
  sunday: "Sun",
  sun: "Sun",
  monday: "Mon",
  mon: "Mon",
  tuesday: "Tue",
  tue: "Tue",
  tues: "Tue",
  wednesday: "Wed",
  wed: "Wed",
  thursday: "Thu",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  friday: "Fri",
  fri: "Fri",
  saturday: "Sat",
  sat: "Sat",
};
function normDayToken(token) {
  if (!token) return "";
  const t = String(token).replace(/\./g, "").trim().toLowerCase();
  if (DAY_ALIASES[t]) return DAY_ALIASES[t];
  const short = t.slice(0, 3);
  return DAY_ALIASES[short] || "";
}
function parseWorkdaysNote(note) {
  if (!note || typeof note !== "string") return null;
  const days = new Set();
  const rangeRe = new RegExp(
    "(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\\s*(?:-|–|—|to)\\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)",
    "gi"
  );
  note.replace(rangeRe, (_, a, b) => {
    const A = normDayToken(a),
      B = normDayToken(b);
    if (!A || !B) return "";
    const ai = DAY_ORDER.indexOf(A);
    const bi = DAY_ORDER.indexOf(B);
    if (ai < 0 || bi < 0) return "";
    let j = ai;
    while (true) {
      days.add(DAY_ORDER[j]);
      if (j === bi) break;
      j = (j + 1) % 7;
    }
    return "";
  });
  const singles = note
    .split(/[,/&\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const tok of singles) {
    if (/(?:-|–|—|\bto\b)/i.test(tok)) continue;
    const d = normDayToken(tok);
    if (DAY_ORDER.includes(d)) days.add(d);
  }
  return days.size ? days : null;
}

const schedByDept = computed(() => {
  const m = new Map();
  for (const s of schedules.value) m.set(s.department_id, s);
  return m;
});

/* --- jake-oncall lookups --- */
const onCallRowsByUserId = computed(() => {
  const m = new Map();
  for (const row of onCallList.value) {
    const uid = Number(row.user_id ?? row.user ?? row.employee_id);
    if (!uid) continue;
    if (!m.has(uid)) m.set(uid, []);
    m.get(uid).push(row);
  }
  return m;
});
const onCallScheduleById = computed(() => {
  const m = new Map();
  for (const s of onCallSchedules.value) m.set(Number(s.id), s);
  return m;
});

/* Effective schedule for a specific user/date (jake-oncall) */
function getEffectiveScheduleForDate(userId, ymd) {
  const user = users.value.find((u) => u.user_id === userId);
  const deptSched = user ? schedByDept.value.get(user.user_department) || null : null;

  const rows = onCallRowsByUserId.value.get(Number(userId)) || [];
  const day = dayjs(ymd, "YYYY-MM-DD");

  for (const oc of rows) {
    const schedId = Number(oc.dept_sched_id ?? oc.dept_schedule_id ?? oc.schedule_id);
    if (!schedId) continue;
    const ocSched = onCallScheduleById.value.get(schedId);
    if (!ocSched) continue;

    const startStr = String(ocSched.schedule_date ?? ocSched.date ?? "");
    if (!startStr) continue;
    const start = dayjs(startStr, "YYYY-MM-DD");
    if (!start.isValid()) continue;

    // Span uses ocSched.working_days; fallback to department's if missing
    const spanDays = Number(ocSched.working_days ?? deptSched?.working_days ?? 1);
    const end = start.add(Math.max(1, spanDays) - 1, "day"); // inclusive

    if (
      (day.isAfter(start, "day") || day.isSame(start, "day")) &&
      (day.isBefore(end, "day") || day.isSame(end, "day"))
    ) {
      return { sched: ocSched, source: "oncall", deptSched };
    }
  }

  return { sched: deptSched, source: "dept", deptSched };
}

/* ---- helper: robust parse to a same-day time ---- */
function parseAnyTimeToDay(hmsOrIso, anchor = "2000-01-01") {
  if (!hmsOrIso) return null;
  const s = String(hmsOrIso).trim();
  // HH:mm or HH:mm:ss
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const hhmmss = /^\d{1,2}:\d{2}$/.test(s) ? `${s}:00` : s;
    return dayjs(`${anchor}T${hhmmss}`);
  }
  const dt = dayjs(s);
  if (dt.isValid()) {
    // Normalize to anchor date but keep time component
    return dayjs(`${anchor}T${dt.format("HH:mm:ss")}`);
  }
  return null;
}

/* ---- helper: local display formatter (no leading zero on minutes) ---- */
function displayHMM(totalMinutes) {
  const m = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

/* Determine how to render a day group (normal / rd / absent) */
function dayGroupMode(userId, ymd) {
  const c = cell(userId, ymd);
  if (c.isRestDay) return "rd";
  if (c.isAbsent) return "absent";
  return "normal";
}

/* Per-cell calculation with jake-oncall + Rest Day override */
function cell(userId, ymd) {
  const user = users.value.find((u) => u.user_id === userId);
  if (!user) return blankCell();

  const log = logsByUserDate.value.get(`${userId}|${ymd}`);

  // Determine effective schedule for this date
  const { sched: effectiveSched, source, deptSched } = getEffectiveScheduleForDate(
    userId,
    ymd
  );

  // Rest Day rule:
  // - If source is 'oncall', never Rest Day.
  // - Else (dept) decide via department workdays_note.
  if (source === "dept") {
    const allowed =
      parseWorkdaysNote(deptSched?.workdays_note ?? "Mon–Fri") ||
      new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const dow = DAY_ORDER[dayjs(ymd).day()];
    if (!allowed.has(dow)) {
      return { ...blankCell(), isRestDay: true, isAbsent: false };
    }
  }

  const expectedStart = effectiveSched?.work_start || "08:00:00";
  const expectedEnd = effectiveSched?.work_end || "17:00:00";

  // If working day but no log -> Absent
  if (!log) {
    return {
      isRestDay: false,
      isAbsent: true,
      workHHMM: "Absent",
      lateHHMM: "Absent",
      otHHMM: "Absent",
      utHHMM: "Absent",
      workMins: 0,
      lateMins: 0,
      overtimeMins: 0,
    };
  }

  // Overtime via computeStatus with EFFECTIVE schedule
  const stat = computeStatus({
    time_in: log.time_in,
    time_out: log.time_out,
    expectedStart,
    expectedEnd,
  });

  const startDJ = parseAnyTimeToDay(expectedStart);
  const endDJ = parseAnyTimeToDay(expectedEnd);
  const outDJ = parseAnyTimeToDay(log.time_out);

  /* ====== "T" (Work Hours) ======
     Base 8h (480m). If out < end => T = 480 - (end - out).
     If out ≥ end => T = 480. If no out (but has log) => 240.
  */
  let workMins = 0;
  if (startDJ && endDJ) {
    if (!outDJ && log.time_in) {
      workMins = 240;
    } else if (outDJ && outDJ.isBefore(endDJ)) {
      const utMins = Math.max(0, Math.ceil(endDJ.diff(outDJ, "second") / 60));
      workMins = Math.max(0, 480 - utMins);
    } else {
      workMins = 480;
    }
  }

  /* === LATE (L) — floor minutes (no overcount) === */
  const inDJ = parseAnyTimeToDay(log.time_in);
  const grace = startDJ ? startDJ.add(5, "minute") : null;
  let lateFromIn = 0;
  if (inDJ && grace && inDJ.isAfter(grace)) {
    lateFromIn = Math.max(0, Math.floor(inDJ.diff(grace, "second") / 60));
  }

  const lunchStartDJ = parseAnyTimeToDay(
    log.lunch_start || log.lunchStart || log.lunch_in || log.lunchIn
  );
  const lunchEndDJ = parseAnyTimeToDay(
    log.lunch_end || log.lunchEnd || log.lunch_out || log.lunchOut
  );
  let lunchExtra = 0;
  if (lunchStartDJ && lunchEndDJ && lunchEndDJ.isAfter(lunchStartDJ)) {
    const lunchDur = Math.floor(lunchEndDJ.diff(lunchStartDJ, "second") / 60);
    lunchExtra = Math.max(0, lunchDur - 60);
  }

  const breakStartDJ = parseAnyTimeToDay(
    log.break_start || log.breakStart || log.break_in || log.breakIn
  );
  const breakEndDJ = parseAnyTimeToDay(
    log.break_end || log.breakEnd || log.break_out || log.breakOut
  );
  let breakExtra = 0;
  if (breakStartDJ && breakEndDJ && breakEndDJ.isAfter(breakStartDJ)) {
    const breakDur = Math.floor(breakEndDJ.diff(breakStartDJ, "second") / 60);
    breakExtra = Math.max(0, breakDur - 30);
  }

  const lateMins = Math.max(0, lateFromIn + lunchExtra + breakExtra);

  /* === UNDERTIME === */
  let undertimeMins = 0;
  if (endDJ && outDJ && outDJ.isBefore(endDJ)) {
    const secs = endDJ.diff(outDJ, "second");
    undertimeMins = Math.max(0, Math.ceil(secs / 60));
  }

  const overtimeMins = Math.max(stat.overtimeMinutes || 0, 0);

  return {
    isRestDay: false,
    isAbsent: false,
    workHHMM: displayHMM(workMins),
    lateHHMM: displayHMM(lateMins),
    otHHMM: displayHMM(overtimeMins),
    utHHMM: displayHMM(undertimeMins),
    workMins,
    lateMins,
    overtimeMins,
  };
}

function blankCell() {
  return {
    isRestDay: false,
    isAbsent: false,
    workHHMM: "—",
    lateHHMM: "—",
    otHHMM: "—",
    utHHMM: "—",
    workMins: 0,
    lateMins: 0,
    overtimeMins: 0,
  };
}

/* Sum totals per user across the visible day range */
function rowTotals(userId) {
  let w = 0,
    l = 0,
    o = 0;
  for (const d of days.value) {
    const c = cell(userId, d.ymd);
    // Count only numeric minutes (RD/Absent contribute 0)
    w += Number(c.workMins || 0);
    l += Number(c.lateMins || 0);
    o += Number(c.overtimeMins || 0);
  }
  return { w, l, o };
}

/* Filters */
const filteredUsers = computed(() => {
  let list = [...users.value];
  if (deptFilter.value) {
    list = list.filter((u) => u.user_department === deptFilter.value);
  }
  if (empSearch.value) {
    const q = empSearch.value.toLowerCase();
    list = list.filter((u) => {
      const name = `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }
  return list;
});

/* ---------- PRINT: Important details + current table ---------- */
function printSummary() {
  try {
    const table = document.querySelector(".grid-table");
    const tableHTML = table ? table.outerHTML : "<p>No data.</p>";

    const rangeStr =
      fromDate.value && toDate.value
        ? `${dayjs(fromDate.value).format("MMM D, YYYY")} — ${dayjs(toDate.value).format(
            "MMM D, YYYY"
          )}`
        : "—";

    const cols =
      [
        showTotalWorking.value ? "Total Working (T)" : null,
        showLate.value ? "Late (L)" : null,
        showOvertime.value ? "Overtime (O)" : null,
        showUndertime.value ? "Undertime (U)" : null,
      ]
        .filter(Boolean)
        .join(", ") || "—";

    const metaHTML = `
      <div class="meta">
        <div><strong>Range:</strong> ${rangeStr}</div>
        <div><strong>Department:</strong> ${deptLabel.value}</div>
        <div><strong>Search:</strong> ${empSearch.value || "—"}</div>
        <div><strong>Columns:</strong> ${cols}</div>
        <div class="printed-on">Printed: ${dayjs().format("MMM D, YYYY h:mm A")}</div>
      </div>
    `;

    const w = window.open("", "_blank");
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Summary Reports</title>
  <style>
    *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827}
    body{padding:18px;}
    h1{margin:0 0 6px;font-size:18px}
    .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;margin:6px 0 14px;font-size:12.5px}
    .printed-on{grid-column:1/-1;color:#6b7280}
    table{border-collapse:collapse;width:100%;font-size:12.5px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:center;white-space:nowrap}
    thead th{background:#f3f4f6}
    .name-col{position:static!important;background:#fff!important}
    @page { size: A4 landscape; margin: 12mm; }
  </style>
</head>
<body>
  <h1>Summary Reports</h1>
  ${metaHTML}
  ${tableHTML}
  <script>window.onload=function(){window.print(); setTimeout(()=>window.close(), 250);}<\/script>
</body>
</html>`);
    w.document.close();
  } catch (e) {
    console.error("Print failed", e);
    window.print();
  }
}

/* Mount */
onMounted(async () => {
  const [u, d, s, a, ocList, ocScheds] = await Promise.all([
    fetchUsers(),
    fetchDepartments(),
    fetchSchedules(),
    fetchAttendance(),
    fetchOnCallList(),
    fetchOnCallSchedules(),
  ]);
  users.value = u;
  departments.value = d;
  schedules.value = s;
  attendance.value = a;
  onCallList.value = ocList;
  onCallSchedules.value = ocScheds;

  const y = dayjs().subtract(1, "day");
  toDate.value = y.format("YYYY-MM-DD");
  // Ensure initial fromDate respects the new minimum
  let fInit = y.subtract(7, "day");
  if (fInit.isBefore(FROM_MIN)) fInit = FROM_MIN;
  fromDate.value = fInit.format("YYYY-MM-DD");

  // Measure the scroll host width and keep it in sync
  if (scrollHost.value) {
    const measure = () => (hostWidth.value = scrollHost.value.clientWidth || 1280);
    measure();
    ro = new ResizeObserver(measure);
    ro.observe(scrollHost.value);

    // Also listen to window resize/orientation changes
    windowMeasureHandler = () => measure();
    window.addEventListener("resize", windowMeasureHandler, { passive: true });
    window.addEventListener("orientationchange", windowMeasureHandler, { passive: true });
  }
});

onUnmounted(() => {
  if (ro && scrollHost.value) ro.unobserve(scrollHost.value);
  if (windowMeasureHandler) {
    window.removeEventListener("resize", windowMeasureHandler);
    window.removeEventListener("orientationchange", windowMeasureHandler);
    windowMeasureHandler = null;
  }
});

watch([fromDate, toDate], ([f, t]) => {
  const y = dayjs(yesterdayStr.value);
  let fD = dayjs(String(f || yesterdayStr.value)).startOf("day");
  let tD = dayjs(String(t || yesterdayStr.value)).startOf("day");
  if (tD.isAfter(y)) tD = y;
  // NEW: enforce "From" >= Oct 10, 2025
  if (fD.isBefore(FROM_MIN)) fD = FROM_MIN;
  if (fD.isAfter(tD)) fD = tD;
  fromDate.value = fD.format("YYYY-MM-DD");
  toDate.value = tD.format("YYYY-MM-DD");
});
</script>

<style scoped>
/* Page & cards */
.page {
  display: grid;
  gap: 12px;
}
.card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 14px;
  box-shadow: var(--shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
  padding: 16px;
}
.header-card {
  overflow: visible;
}
.title {
  margin: 0 0 10px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

/* --- FIXED: keep the button compact, right-aligned, non-stretching --- */
.title-row .btn-print {
  margin-left: auto;
  flex: 0 0 auto !important;
  width: auto !important;
  max-width: max-content;
  white-space: nowrap;
}

.btn-print {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(17, 24, 39, 0.06);
}
.btn-print:hover {
  opacity: 0.96;
  transform: translateY(-1px);
}
.btn-print:active {
  transform: translateY(0);
}

/* Filters */
.filters {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.field {
  grid-column: span 3 / span 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.grow {
  grid-column: span 3 / span 3;
}
label {
  font-size: 12px;
  color: var(--text-dim, #6b7280);
  font-weight: 600;
}
input,
select {
  height: 42px;
  padding: 8px 12px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font-size: 14px;
}

/* Horizontal Columns filter row */
.columns-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.columns-label {
  font-size: 12px;
  color: var(--text-dim, #6b7280);
  font-weight: 600;
}
.columns-chks {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.columns-chks .chk {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #0f172a;
  user-select: none;
}
.columns-chks input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #111827; /* modern browsers */
}

@media (max-width: 900px) {
  .filters {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .field,
  .grow {
    grid-column: span 3 / span 3;
  }
}
@media (max-width: 560px) {
  .card {
    padding: 12px;
  }
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field,
  .grow {
    grid-column: span 2 / span 2;
  }
}

/* Scroll area (ONLY this scrolls horizontally) */
.table-wrap {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  background: #fff;
  -webkit-overflow-scrolling: touch;
  contain: paint;
}

/* nicer scrollbar */
.table-wrap::-webkit-scrollbar {
  height: 10px;
}
.table-wrap::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 8px;
}
.table-wrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 8px;
}
.table-wrap:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}

/* Table */
.grid-table {
  width: max-content; /* grow to content — enables smooth horizontal scrolling */
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13.5px;
}
.grid-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
  border-bottom: 1px solid var(--border, #e5e7eb);
  color: #0f172a;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.03);
}
.grid-table thead tr:first-child th {
  font-size: 12px;
  font-weight: 800;
  padding: 10px 8px;
  text-align: center;
}
.grid-table thead tr:nth-child(2) th {
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  padding: 6px 4px;
  border-right: 1px solid var(--border, #e5e7eb);
  background: #f3f4f6;
}
.total-head {
  background: #e8f0ff;
  border-left: 2px solid #c7d2fe;
}

/* Body */
.grid-table tbody tr:nth-child(odd) td:not(.sticky-col) {
  background: #fcfcfd;
}
.grid-table td {
  border-top: 1px solid var(--border, #e5e7eb);
  padding: 8px 6px;
  white-space: nowrap;
  vertical-align: middle;
  background: #fff;
  transition: background-color 0.15s ease;
}

/* Sticky left column (names) */
.name-col {
  min-width: 140px; /* floor; real min set via :style binding */
  text-align: left;
  background: #fff;
  font-size: 14px;
  z-index: 3;
  white-space: normal; /* allow wrap on very small screens */
  line-height: 1.24;
  box-shadow: 2px 0 0 rgba(0, 0, 0, 0.03); /* subtle divider */
}
.sticky-col {
  position: sticky;
  left: 0;
  border-right: 1px solid var(--border, #e5e7eb);
}

/* Name/meta */
.emp-name {
  font-weight: 700;
}
.emp-meta {
  font-size: 12px;
  color: #6b7280;
}
.emp-meta .dept {
  font-weight: 600;
}

/* Date columns */
.date-group {
  text-align: center;
  border-right: 2px solid #e2e8f0;
}
.date-head {
  display: grid;
  gap: 2px;
}
.date-head .dow {
  font-weight: 800;
  color: #111827;
  letter-spacing: 0.2px;
}
.date-head .dmy {
  color: #6b7280;
  font-size: 12px;
}

/* Sub header */
.sub-col {
  background: #f3f4f6;
}
.sub-t {
  border-left: 1px solid var(--border, #e5e7eb);
}

/* Metric cells */
.kcell {
  border-right: 1px solid var(--border, #e5e7eb);
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  line-height: 1.2;
}
.kcell.k-t {
  background: #ffffff;
}
.kcell.k-l {
  background: #fffdfa;
}
.kcell.k-o {
  background: #f8fbff;
}
.kcell.k-u {
  background: #fffafa;
}
.kcell.is-rd {
  background: #f1f5f9;
  color: #475569;
  font-weight: 700;
}

/* NEW: total cells on the far right */
.kcell.total {
  background: #f8fafc;
  font-weight: 700;
}
.kcell.total-work {
  border-left: 2px solid #c7d2fe;
}
.kcell.total-late {
}
.kcell.total-ot {
}

/* Quick chips */
.chip {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.chip.rd {
  background: #e2e8f0;
  color: #334155;
}

/* NEW: Absent chip */
.chip-absent {
  background: #fef2f2; /* red-50 */
  color: #b91c1c; /* red-700 */
  border: 1px solid #fecaca; /* red-200 */
}

/* Row hover */
.grid-table tbody tr:hover td {
  background: #f9fafb;
}

/* Empty state */
.center {
  text-align: center;
}
.muted {
  color: #6b7280;
}

/* Tiny screens — compress text and spacing even more */
@media (max-width: 420px) {
  .grid-table {
    font-size: 12.25px;
  }
  .grid-table thead tr:first-child th,
  .grid-table thead tr:nth-child(2) th,
  .kcell {
    font-size: 11.25px;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .name-col {
    font-size: 13px;
  }
  .date-head .dmy {
    font-size: 11px;
  }
}
</style>

<template>
  <section class="row">
    <div class="card">
      <h3 class="title" style="font-size: 18px; margin-bottom: 12px">
        Today's Attendance
      </h3>

      <div class="toolbar no-print">
        <div>
          <label>Filter</label>
          <select v-model="presentFilter">
            <option value="all">All</option>
            <option value="present">Present</option>
            <option value="not_present">Not Present</option>
            <option value="absent">Absent</option>
            <option value="rest_day">Rest Day</option>
          </select>
        </div>

        <div>
          <label>Punctuality</label>
          <select v-model="punctualityFilter">
            <option value="all">All</option>
            <option value="on_time">On Time</option>
            <option value="late">Late</option>
          </select>
        </div>

        <div>
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

        <div>
          <label>Search Employee</label>
          <input placeholder="Search by name or email" v-model="q" />
          <div class="now-badge">
            <div class="time">{{ nowTime }}</div>
            <div class="date">{{ todayStr }}</div>
          </div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="kpis">
        <div class="kpi">
          <div class="label">Present Today</div>
          <div class="value">{{ presentToday.length }}</div>
          <div class="delta">{{ todayStr }}</div>
        </div>
        <div class="kpi">
          <div class="label">Absent</div>
          <div class="value">{{ absentTotal }}</div>
          <div class="delta">{{ todayStr }}</div>
        </div>
        <div class="kpi">
          <div class="label">Rest Day</div>
          <div class="value">
            {{
              presentToday.filter((r) => r.status === "Rest Day").length +
              notPresentToday.filter((r) => r.status === "Rest Day").length
            }}
          </div>
          <div class="delta">{{ todayStr }}</div>
        </div>
        <div class="kpi">
          <div class="label">On Time Today</div>
          <div class="value">
            {{
              presentToday.filter(
                (r) => r.status === "Present" && r.punctuality === "On Time"
              ).length
            }}
          </div>
          <div class="delta">{{ todayStr }}</div>
        </div>
        <div class="kpi">
          <div class="label">Late Today</div>
          <div class="value">
            {{
              presentToday.filter(
                (r) => r.status === "Present" && r.punctuality === "Late"
              ).length
            }}
          </div>
          <div class="delta">{{ todayStr }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Time In</th>
              <th>Lunch Start</th>
              <th>Lunch End</th>
              <th>Break Start</th>
              <th>Break End</th>
              <th>Time Out</th>
              <th>Punctuality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in displayRows"
              :key="row.key"
              :style="row.user_id ? 'cursor:pointer' : ''"
            >
              <td>
                <div class="emp">
                  <div class="name">{{ row.empName }}</div>
                  <div class="dept">{{ row.deptName }}</div>
                </div>
              </td>
              <td>{{ row.time_in_fmt || "—" }}</td>
              <td>{{ row.lunch_start_fmt || "—" }}</td>
              <td>{{ row.lunch_end_fmt || "—" }}</td>
              <td>{{ row.break_start_fmt || "—" }}</td>
              <td>{{ row.break_end_fmt || "—" }}</td>
              <td>{{ row.time_out_fmt || "—" }}</td>
              <td>{{ row.punctuality || "—" }}</td>
              <td>
                <span class="chip" :class="statusChip(row.status)">{{ row.status }}</span>
              </td>
            </tr>
            <tr v-if="displayRows.length === 0">
              <td colspan="9">No employees match the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import dayjs from "dayjs";
import {
  fetchUsers,
  fetchDepartments,
  fetchSchedules,
  fetchAttendance,
} from "../services/api";
import { fmtTime, computeStatus } from "../utils/time";

const users = ref([]);
const departments = ref([]);
const schedules = ref([]);
const attendance = ref([]);

const nowTime = ref(dayjs().format("h:mm:ss A"));
let _nowTimer;

const presentFilter = ref("all");
const punctualityFilter = ref("all");
const deptFilter = ref(0);
const q = ref("");

// --- UI helpers
function statusChip(s) {
  if (s === "Present") return "success";
  if (s === "Not Present") return "warn";
  if (s === "Absent") return "danger";
  if (s === "Rest Day") return "info";
  return "";
}

// --- Indexers
const userById = computed(() => {
  const map = new Map();
  for (const u of users.value) map.set(u.user_id, u);
  return map;
});
const departmentById = computed(() => {
  const map = new Map();
  for (const d of departments.value) map.set(d.department_id, d);
  return map;
});
const scheduleByDeptId = computed(() => {
  const map = new Map();
  for (const s of schedules.value) map.set(s.department_id, s);
  return map;
});

// --- Rest Day helpers (robust parsing of workdays_note)
const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ALIASES = {
  sunday: "Sun", sun: "Sun",
  monday: "Mon", mon: "Mon",
  tuesday: "Tue", tue: "Tue", tues: "Tue",
  wednesday: "Wed", wed: "Wed",
  thursday: "Thu", thu: "Thu", thur: "Thu", thurs: "Thu",
  friday: "Fri", fri: "Fri",
  saturday: "Sat", sat: "Sat",
};
function normDayToken(token) {
  if (!token) return "";
  const t = String(token).replace(/\./g, "").trim().toLowerCase();
  if (DAY_ALIASES[t]) return DAY_ALIASES[t];
  const short = t.slice(0, 3);
  return DAY_ALIASES[short] || "";
}

// Accepts: "Mon-Sat", "Mon–Sat", "Mon—Sat", "Mon to Sat", "Mon,Wed,Fri", etc.
function parseWorkdaysNote(note) {
  if (!note || typeof note !== "string") return null;
  const days = new Set();

  // Ranges (hyphen, en dash, em dash, "to")
  const rangeRe = new RegExp(
    "(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\\s*(?:-|–|—|to)\\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)",
    "gi"
  );
  note.replace(rangeRe, (_, a, b) => {
    const A = normDayToken(a), B = normDayToken(b);
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

  // Singles (comma, slash, ampersand)
  const singles = note.split(/[,/&]+/).map(t => t.trim()).filter(Boolean);
  for (const tok of singles) {
    if (/(?:-|–|—|\bto\b)/i.test(tok)) continue; // already handled as range
    const d = normDayToken(tok);
    if (DAY_ORDER.includes(d)) days.add(d);
  }

  return days.size ? days : null;
}

function isRestDayForDate(schedule, isoYmd) {
  if (!schedule) return false; // don't auto-rest without schedule
  const note = schedule.workdays_note ?? schedule.workdaysNote ?? "";
  const allowed = parseWorkdaysNote(note);
  if (!allowed) return false; // invalid/missing note => not rest day
  const dow = DAY_ORDER[dayjs(isoYmd).day()];
  return !allowed.has(dow);
}

// --- Today helpers
const todayStr = computed(() => dayjs().format("MMM D, YYYY"));
const todayYMD = computed(() => dayjs().format("YYYY-MM-DD"));

const todayRows = computed(() =>
  attendance.value.filter((a) => a.log_date === todayYMD.value)
);

// --- Build rows (present)
const presentToday = computed(() => {
  return todayRows.value.map((r) => {
    const user = userById.value.get(r.user_id) || {};
    const deptId = user.user_department || r.department_id || 0;
    const dept = departmentById.value.get(deptId) || {};
    const sched = scheduleByDeptId.value.get(deptId) || {};

    // Rest Day override for present list (edge case)
    if (isRestDayForDate(sched, todayYMD.value)) {
      return {
        key: String(r.log_id),
        user_id: r.user_id,
        empName: `${user.user_fname || ""} ${user.user_lname || ""}`.trim(),
        deptName: dept.department_name || "",
        time_in_fmt: "",
        lunch_start_fmt: "",
        lunch_end_fmt: "",
        break_start_fmt: "",
        break_end_fmt: "",
        time_out_fmt: "",
        punctuality: "—",
        status: "Rest Day",
      };
    }

    const stat = computeStatus({
      time_in: r.time_in,
      time_out: r.time_out,
      expectedStart: sched.work_start || "09:00:00",
      expectedEnd: sched.work_end || "18:00:00",
    });

    return {
      key: `p-${r.user_id}`,
      user_id: r.user_id,
      empName: `${user.user_fname || ""} ${user.user_lname || ""}`.trim(),
      deptName: dept.department_name || "",
      time_in_fmt: fmtTime(r.time_in),
      lunch_start_fmt: fmtTime(r.lunch_start),
      lunch_end_fmt: fmtTime(r.lunch_end),
      break_start_fmt: fmtTime(r.break_start),
      break_end_fmt: fmtTime(r.break_end),
      time_out_fmt: fmtTime(r.time_out),
      punctuality: r.time_in ? (stat.lateMinutes > 0 ? "Late" : "On Time") : "—",
      status: r.time_in ? "Present" : "Absent",
    };
  });
});

// --- Build rows (not present)
const notPresentToday = computed(() => {
  const presentSet = new Set(todayRows.value.map((r) => r.user_id));

  return users.value
    .filter((u) => !presentSet.has(u.user_id))
    .map((u) => {
      const dept = departmentById.value.get(u.user_department) || {};
      const sched = scheduleByDeptId.value.get(u.user_department) || {};

      // Rest Day takes precedence
      if (isRestDayForDate(sched, todayYMD.value)) {
        return {
          key: `np-${u.user_id}`,
          user_id: u.user_id,
          empName: `${u.user_fname || ""} ${u.user_lname || ""}`.trim(),
          deptName: dept.department_name || "",
          time_in_fmt: "",
          lunch_start_fmt: "",
          lunch_end_fmt: "",
          break_start_fmt: "",
          break_end_fmt: "",
          time_out_fmt: "",
          punctuality: "—",
          status: "Rest Day",
        };
      }

      // Not Present vs Absent → based on lunch_end
      const lunchEnd = sched.lunch_end; // 'HH:mm:ss' per API
      if (lunchEnd) {
        const cutoff = dayjs(`${todayYMD.value}T${lunchEnd}`);
        const now = dayjs();
        const status = now.isAfter(cutoff) ? "Absent" : "Not Present";
        return {
          key: `np-${u.user_id}`,
          user_id: u.user_id,
          empName: `${u.user_fname || ""} ${u.user_lname || ""}`.trim(),
          deptName: dept.department_name || "",
          time_in_fmt: "",
          lunch_start_fmt: "",
          lunch_end_fmt: "",
          break_start_fmt: "",
          break_end_fmt: "",
          time_out_fmt: "",
          punctuality: "—",
          status,
        };
      }

      // Fallback (no lunch_end provided): keep as Not Present
      return {
        key: `np-${u.user_id}`,
        user_id: u.user_id,
        empName: `${u.user_fname || ""} ${u.user_lname || ""}`.trim(),
        deptName: dept.department_name || "",
        time_in_fmt: "",
        lunch_start_fmt: "",
        lunch_end_fmt: "",
        break_start_fmt: "",
        break_end_fmt: "",
        time_out_fmt: "",
        punctuality: "—",
        status: "Not Present",
      };
    });
});

// --- Totals & display
const absentTotal = computed(() => {
  const a1 = presentToday.value.filter((r) => r.status === "Absent").length;
  const a2 = notPresentToday.value.filter((r) => r.status === "Absent").length;
  return a1 + a2;
});

const displayRows = computed(() => {
  let rows;
  if (presentFilter.value === "present") {
    rows = presentToday.value.filter((r) => r.status === "Present");
  } else if (presentFilter.value === "absent") {
    rows = [
      ...presentToday.value.filter((r) => r.status === "Absent"),
      ...notPresentToday.value.filter((r) => r.status === "Absent"),
    ];
  } else if (presentFilter.value === "not_present") {
    rows = notPresentToday.value.filter((r) => r.status === "Not Present"); // only "Not Present"
  } else if (presentFilter.value === "rest_day") {
    rows = [
      ...presentToday.value.filter((r) => r.status === "Rest Day"),
      ...notPresentToday.value.filter((r) => r.status === "Rest Day"),
    ];
  } else {
    rows = [...presentToday.value, ...notPresentToday.value];
  }

  if (punctualityFilter.value === "on_time") {
    rows = rows.filter((r) => r.punctuality === "On Time");
  } else if (punctualityFilter.value === "late") {
    rows = rows.filter((r) => r.punctuality === "Late");
  }

  if (deptFilter.value) {
    rows = rows.filter(
      (r) => userById.value.get(r.user_id)?.user_department === deptFilter.value
    );
  }

  if (q.value) {
    const needle = q.value.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.empName || "").toLowerCase().includes(needle) ||
        (r.deptName || "").toLowerCase().includes(needle) ||
        String(r.user_id).includes(needle)
    );
  }
  return rows;
});

// --- Data load & clock
onMounted(async () => {
  _nowTimer = setInterval(() => {
    nowTime.value = dayjs().format("h:mm:ss A");
  }, 1000);

  const [u, d, s, a] = await Promise.all([
    fetchUsers(),
    fetchDepartments(),
    fetchSchedules(),
    fetchAttendance(),
  ]);
  users.value = u;
  departments.value = d;
  schedules.value = s;
  attendance.value = a;
});

onUnmounted(() => {
  if (_nowTimer) clearInterval(_nowTimer);
});
</script>

<style scoped>
/* Layout / toolbar */
.toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}
@media (min-width: 1024px) {
  .toolbar {
    grid-template-columns: 160px 160px 200px 1fr;
    align-items: center;
  }
  .toolbar > div:last-child {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 12px;
  }
}
.now-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.now-badge .time {
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}
.now-badge .date {
  font-size: 12px;
  color: #667085;
}

/* KPI grid */
.kpis {
  display: grid;
  gap: 16px;
  margin-top: 12px;
}
@media (min-width: 1024px) {
  .kpis {
    grid-template-columns: repeat(5, 1fr);
  }
}
@media (max-width: 1023.98px) {
  .kpis {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
.kpi {
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6ff 100%);
  border: 1px solid #e6eefc;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(16, 24, 40, 0.04);
}
.kpi .label {
  font-size: 13px;
  color: #667085;
  margin-bottom: 4px;
}
.kpi .value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.kpi .delta {
  font-size: 12px;
  color: #667085;
  margin-top: 2px;
}

/* Table */
.table-wrap { margin-top: 10px; }
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

/* Status chips */
.chip {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.chip.success { background: #ecfdf3; color: #027a48; }
.chip.warn    { background: #fff6ed; color: #b54708; }
.chip.danger  { background: #fef3f2; color: #b42318; }
.chip.info    { background: #eef4ff; color: #3538cd; }

/* Employee cell */
.emp .name { font-weight: 600; line-height: 1.2; }
.emp .dept { font-size: 12px; color: #667085; line-height: 1.2; }
</style>

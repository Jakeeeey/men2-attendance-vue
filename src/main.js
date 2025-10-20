import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Employees from "./views/Employees.vue";
import TodaysAttendance from "./views/TodaysAttendance.vue";
import EmployeeDetail from "./views/EmployeeAttendanceHistory.vue";
import DepartmentReports from "./views/DepartmentReports.vue";
import SummaryReports from "./views/SummaryReports.vue";
import "./styles.css";
const routes = [
  { path: "/", redirect: { name: "todays-attendance" } },
  {
    path: "/attendance-report/todays-attendance",
    component: TodaysAttendance,
    name: "todays-attendance",
    meta: { title: "Todays Attendance" },
  },
  {
    path: "/attendance-report/employees",
    component: Employees,
    name: "employees",
    meta: { title: "Employees" },
  },
  { 
    path: "/attendance-report/employee/:id", 
    component: EmployeeDetail, 
    name: "employee" 
  },
  {
    path: "/attendance-report/department-reports",
    component: DepartmentReports,
    name: "department-reports",
    meta: { title: "Department Reports" },
  },
  {
    path: "/attendance-report/summary-reports",
    component: SummaryReports,
    name: "summary-reports",
    meta: { title: "Summary Reports" },
  },
];
const router = createRouter({ history: createWebHistory(), routes });
router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} — Attendance Report`
    : "Attendance Report";
});
createApp(App).use(router).mount("#app");

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Monitoring from './views/Monitoring.vue'
import TodaysAttendance from './views/TodaysAttendance.vue'
import EmployeeDetail from './views/EmployeeDetail.vue'
import EmployeeReport from './views/EmployeeReport.vue'
import DepartmentReports from './views/DepartmentReports.vue'
import './styles.css'
const routes=[
  { path:'/', redirect:{name:'monitoring'} },
  { path:'/attendance/monitoring', component: Monitoring, name:'monitoring', meta:{title:'Employee Report'} },
  { path:'/attendance/today', component: TodaysAttendance, name:'today', meta:{title:'Todays Attendance'} },
  { path:'/attendance/employee-report', component: EmployeeReport, name:'employee-report', meta:{title:'Employee Report'} },
  { path:'/attendance/department-reports', component: DepartmentReports, name:'dept-reports', meta:{title:'Department Reports'} },
  { path:'/employee/:id', component: EmployeeDetail, name:'employee' },
]
const router=createRouter({history:createWebHistory(), routes})
router.afterEach((to)=>{ document.title = to.meta?.title ? `${to.meta.title} — Attendance Report` : 'Attendance Report' })
createApp(App).use(router).mount('#app')
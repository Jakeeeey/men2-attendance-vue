import axios from "axios";
const api = axios.create({ baseURL: "/api/items", timeout: 20000 });
export const fetchUsers = async () => {
  const { data } = await api.get("/user");
  return data?.data ?? [];
};
export const fetchDepartments = async () => {
  const { data } = await api.get("/department");
  return data?.data ?? [];
};
export const fetchSchedules = async () => {
  const { data } = await api.get("/department_schedule");
  return data?.data ?? [];
};
export const fetchAttendance = async () => {
  const { data } = await api.get("/attendance_log");
  return data?.data ?? [];
};

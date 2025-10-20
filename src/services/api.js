import axios from "axios";
const api = axios.create({ baseURL: "/api/items", timeout: 20000 });

export const fetchUsers = async () => {
  const { data } = await api.get("/user?limit=-1");
  return data?.data ?? [];
};
export const fetchDepartments = async () => {
  const { data } = await api.get("/department?limit=-1");
  return data?.data ?? [];
};
export const fetchSchedules = async () => {
  const { data } = await api.get("/department_schedule?limit=-1");
  return data?.data ?? [];
};
export const fetchAttendance = async () => {
  const { data } = await api.get("/attendance_log?limit=-1");
  return data?.data ?? [];
};
export const fetchOnCallList = async () => {
  const { data } = await api.get("/oncall_list?limit=-1");
  return data?.data ?? [];
};
export const fetchOnCallSchedules = async () => {
  const { data } = await api.get("/oncall_schedule?limit=-1");
  return data?.data ?? [];
};

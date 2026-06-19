import axios from "axios";
import { getToken } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.includes("/api/auth/");
    // Only redirect on 401 for non-auth endpoints (login/register return 401 on bad credentials — don't redirect)
    if (err.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post("/api/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data).then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
  upgrade: () => api.post("/api/auth/upgrade").then((r) => r.data),
};

export function isPremiumError(err: unknown): boolean {
  return (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status === 403
    && (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail === "premium_required";
}

// Quiz
export const quizApi = {
  list: () => api.get("/api/quiz/").then((r) => r.data),
  create: (data: { title: string; description: string }) =>
    api.post("/api/quiz/", data).then((r) => r.data),
  get: (id: number) => api.get(`/api/quiz/${id}`).then((r) => r.data),
  update: (id: number, data: {
    title?: string; description?: string;
    attendance_enabled?: boolean; speed_bonus?: boolean; streak_bonus?: boolean;
  }) => api.put(`/api/quiz/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/quiz/${id}`).then((r) => r.data),

  addQuestion: (quizId: number, data: object) =>
    api.post(`/api/quiz/${quizId}/questions`, data).then((r) => r.data),
  updateQuestion: (quizId: number, qId: number, data: object) =>
    api.put(`/api/quiz/${quizId}/questions/${qId}`, data).then((r) => r.data),
  deleteQuestion: (quizId: number, qId: number) =>
    api.delete(`/api/quiz/${quizId}/questions/${qId}`).then((r) => r.data),

  generateFromSlides: (quizId: number, file: File, numQuestions: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("num_questions", String(numQuestions));
    return api.post(`/api/quiz/${quizId}/generate`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  startSession: (quizId: number) =>
    api.post(`/api/quiz/${quizId}/session`).then((r) => r.data),
  getSession: (quizId: number) =>
    api.get(`/api/quiz/${quizId}/session`).then((r) => r.data),

  downloadAttendance: async (quizId: number, code?: string) => {
    const res = await api.get(`/api/quiz/${quizId}/attendance.csv`, {
      params: code ? { code } : undefined,
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    const disp = (res.headers["content-disposition"] as string) || "";
    const match = disp.match(/filename="?([^"]+)"?/);
    a.download = match?.[1] || `attendance_${code || quizId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// Student
export const studentApi = {
  checkSession: (code: string) =>
    api.get(`/api/student/session/${code}`).then((r) => r.data),
  joinSession: (code: string, name: string, email?: string) =>
    api.post(`/api/student/session/${code}/join`, { name, email }).then((r) => r.data),
  summarize: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/student/summarize", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

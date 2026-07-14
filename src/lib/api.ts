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
  // Redeem a single-use promo code to upgrade tier.
  redeem: (code: string) =>
    api.post("/api/auth/redeem", { code }).then((r) => r.data),
};

export function isPremiumError(err: unknown): boolean {
  return (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status === 403
    && (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail === "premium_required";
}

// True when a generation was blocked because the user's daily AI quota is spent.
export function isGenerationLimitError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { detail?: string } } };
  return e?.response?.status === 429 || e?.response?.data?.detail === "generation_limit_reached";
}

// Quiz
export const quizApi = {
  list: () => api.get("/api/quiz/").then((r) => r.data),
  create: (data: { title: string; description: string; mode?: "quiz" | "test" }) =>
    api.post("/api/quiz/", data).then((r) => r.data),
  get: (id: number) => api.get(`/api/quiz/${id}`).then((r) => r.data),
  update: (id: number, data: {
    title?: string; description?: string;
    attendance_enabled?: boolean; speed_bonus?: boolean; streak_bonus?: boolean;
    opens_at?: string | null; closes_at?: string | null;
  }) => api.put(`/api/quiz/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/quiz/${id}`).then((r) => r.data),

  addQuestion: (quizId: number, data: object) =>
    api.post(`/api/quiz/${quizId}/questions`, data).then((r) => r.data),
  updateQuestion: (quizId: number, qId: number, data: object) =>
    api.put(`/api/quiz/${quizId}/questions/${qId}`, data).then((r) => r.data),
  deleteQuestion: (quizId: number, qId: number) =>
    api.delete(`/api/quiz/${quizId}/questions/${qId}`).then((r) => r.data),
  regenerateQuestion: (quizId: number, qId: number) =>
    api.post(`/api/quiz/${quizId}/questions/${qId}/regenerate`).then((r) => r.data),

  generateFromSlides: (quizId: number, file: File, numQuestions: number, numOpenEnded = 0) => {
    const form = new FormData();
    form.append("file", file);
    form.append("num_questions", String(numQuestions));
    form.append("num_open_ended", String(numOpenEnded));
    return api.post(`/api/quiz/${quizId}/generate`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  extractTopics: (quizId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/api/quiz/${quizId}/extract-topics`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  generateFromTopics: (quizId: number, topics: string[], numQuestions: number, numOpenEnded = 0) =>
    api.post(`/api/quiz/${quizId}/generate-from-topics`, {
      topics, num_questions: numQuestions, num_open_ended: numOpenEnded,
    }).then((r) => r.data),

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

  downloadPdf: async (quizId: number, includeAnswers: boolean) => {
    const res = await api.get(`/api/quiz/${quizId}/export.pdf`, {
      params: { include_answers: includeAnswers },
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    const disp = (res.headers["content-disposition"] as string) || "";
    const match = disp.match(/filename="?([^"]+)"?/);
    a.download = match?.[1] || `quiz_${quizId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Test mode: publish + results
  publishTest: (quizId: number) =>
    api.post(`/api/quiz/${quizId}/publish`).then((r) => r.data),
  getAttempts: (quizId: number) =>
    api.get(`/api/quiz/${quizId}/attempts`).then((r) => r.data),
  getAttempt: (quizId: number, attemptId: number) =>
    api.get(`/api/quiz/${quizId}/attempts/${attemptId}`).then((r) => r.data),
  gradeAttempt: (quizId: number, attemptId: number, grades: { question_id: number; points_awarded: number; is_correct: boolean }[]) =>
    api.post(`/api/quiz/${quizId}/attempts/${attemptId}/grade`, { grades }).then((r) => r.data),

  // Quiz mode: statistics across all live sessions
  getParticipants: (quizId: number) =>
    api.get(`/api/quiz/${quizId}/participants`).then((r) => r.data),
  getParticipant: (quizId: number, participantId: number) =>
    api.get(`/api/quiz/${quizId}/participants/${participantId}`).then((r) => r.data),
};

// Admin panel (gated to ADMIN_EMAILS accounts on the backend)
export const adminApi = {
  listCodes: () => api.get("/api/admin/promocodes").then((r) => r.data),
  codeStats: () => api.get("/api/admin/promocodes/stats").then((r) => r.data),
  generateCodes: (tier: "pro" | "max", count: number) =>
    api.post("/api/admin/promocodes", { tier, count }).then((r) => r.data),
  deleteCode: (id: number) => api.delete(`/api/admin/promocodes/${id}`).then((r) => r.data),
  listUsers: () => api.get("/api/admin/users").then((r) => r.data),
  setUserTier: (userId: number, tier: "free" | "pro" | "max") =>
    api.patch(`/api/admin/users/${userId}/tier`, { tier }).then((r) => r.data),
  deleteUser: (userId: number) => api.delete(`/api/admin/users/${userId}`).then((r) => r.data),
};

// Cross-quiz student profile (scoped to the logged-in teacher)
export const teacherApi = {
  getStudentProfile: (name: string) =>
    api.get(`/api/teacher/students/${encodeURIComponent(name)}`).then((r) => r.data),
};

// Public test-taking (students, no auth)
export const testApi = {
  getInfo: (token: string) => api.get(`/api/test/${token}`).then((r) => r.data),
  start: (token: string, name: string) =>
    api.post(`/api/test/${token}/start`, { name }).then((r) => r.data),
  submit: (token: string, attemptId: number, answers: { question_id: number; answer_index?: number; answer_text?: string }[]) =>
    api.post(`/api/test/${token}/submit`, { attempt_id: attemptId, answers }).then((r) => r.data),
};

// Student
export const studentApi = {
  checkSession: (code: string) =>
    api.get(`/api/student/session/${code}`).then((r) => r.data),
  joinSession: (code: string, name: string, email?: string, rejoinToken?: string) =>
    api.post(`/api/student/session/${code}/join`, { name, email, rejoin_token: rejoinToken }).then((r) => r.data),
  summarize: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/student/summarize", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

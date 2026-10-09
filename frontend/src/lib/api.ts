// Thin typed client for the FastAPI backend.

import type {
  Answers,
  Form,
  FormDefinition,
  FormListItem,
  FormResponse,
  FormSummaryStats,
  PublicForm,
  ResponseList,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Per-question validation errors (question id -> message), when the server sent them. */
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const fieldErrors: Record<string, string> = {};
    for (const err of body?.errors ?? []) fieldErrors[err.question_id] = err.message;
    const detail = typeof body?.detail === "string" ? body.detail : "Something went wrong";
    throw new ApiError(detail, res.status, fieldErrors);
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  me: () => request<{ name: string; email: string }>("/api/me"),

  // Forms (creator)
  listForms: (params: { search?: string; sort?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return request<FormListItem[]>(`/api/forms?${query}`);
  },
  createForm: (title: string) => request<Form>("/api/forms", json("POST", { title })),
  getForm: (id: string) => request<Form>(`/api/forms/${id}`),
  saveForm: (id: string, definition: FormDefinition) => request<Form>(`/api/forms/${id}`, json("PUT", definition)),
  renameForm: (id: string, title: string) => request<Form>(`/api/forms/${id}`, json("PATCH", { title })),
  deleteForm: (id: string) => request<void>(`/api/forms/${id}`, json("DELETE")),
  duplicateForm: (id: string) => request<Form>(`/api/forms/${id}/duplicate`, json("POST")),
  publishForm: (id: string) => request<Form>(`/api/forms/${id}/publish`, json("POST")),
  unpublishForm: (id: string) => request<Form>(`/api/forms/${id}/unpublish`, json("POST")),

  // Results (creator)
  listResponses: (id: string, completed = true, limit = 200) =>
    request<ResponseList>(`/api/forms/${id}/responses?completed=${completed}&limit=${limit}`),
  getResponse: (formId: string, responseId: string) =>
    request<FormResponse>(`/api/forms/${formId}/responses/${responseId}`),
  deleteResponses: (formId: string, ids: string[]) =>
    request<{ deleted: number }>(`/api/forms/${formId}/responses/delete`, json("POST", { ids })),
  getSummary: (id: string) => request<FormSummaryStats>(`/api/forms/${id}/summary`),
  exportCsvUrl: (id: string) => `${API_URL}/api/forms/${id}/export.csv`,

  // Public (respondents)
  getPublicForm: (slug: string) => request<PublicForm>(`/api/public/forms/${slug}`),
  startResponse: (slug: string) => request<{ id: string }>(`/api/public/forms/${slug}/responses`, json("POST")),
  saveProgress: (slug: string, responseId: string, answers: Answers) =>
    request<void>(`/api/public/forms/${slug}/responses/${responseId}`, json("PATCH", { answers })),
  submitResponse: (slug: string, responseId: string, answers: Answers) =>
    request<{ id: string }>(`/api/public/forms/${slug}/responses/${responseId}/submit`, json("POST", { answers })),
};

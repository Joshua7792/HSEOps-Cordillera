// Thin fetch wrapper for the backend's /api/excel/* endpoints.
//
// VITE_API_BASE lets the dev server target a different host (e.g. when running
// the frontend on its own port and proxying to a separately-running backend).
// In the packaged desktop build the frontend is served from the same origin
// as the API, so VITE_API_BASE stays empty and requests are same-origin.
import type { CrudContractor, CrudWorker, CrudCert, ExcelDashboard, ExcelHealth, ExcelWorker, ImportBatch } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const errorBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
    const message =
      typeof errorBody === 'string'
        ? errorBody
        : errorBody.detail || errorBody.message || 'Request failed'
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  // Dashboard (read)
  getExcelHealth: () => request<ExcelHealth>('/api/excel/health'),
  getExcelDashboard: () => request<ExcelDashboard>('/api/excel/dashboard'),
  getExcelWorker: (name: string) =>
    request<ExcelWorker>(`/api/excel/workers/${encodeURIComponent(name)}`),
  refreshExcelWorkbook: () =>
    request<{ ok: boolean; loaded_at: string; last_modified: string }>(
      '/api/excel/refresh',
      { method: 'POST' },
    ),

  // CRUD — workers
  listWorkers: () => request<CrudWorker[]>('/api/workers'),
  createWorker: (body: Record<string, unknown>) =>
    request<{ id: number; name: string }>('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updateWorker: (id: number, body: Record<string, unknown>) =>
    request<{ id: number; name: string }>(`/api/workers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteWorker: (id: number) =>
    request<void>(`/api/workers/${id}`, { method: 'DELETE' }),

  // CRUD — contractors
  listContractors: () => request<CrudContractor[]>('/api/contractors'),
  createContractor: (body: Record<string, unknown>) =>
    request<{ id: number; name: string }>('/api/contractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updateContractor: (id: number, body: Record<string, unknown>) =>
    request<{ id: number; name: string }>(`/api/contractors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteContractor: (id: number) =>
    request<void>(`/api/contractors/${id}`, { method: 'DELETE' }),

  // CRUD — certs
  listCerts: () => request<CrudCert[]>('/api/certs'),
  createCert: (body: Record<string, unknown>) =>
    request<{ id: number; name: string }>('/api/certs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updateCert: (id: number, body: Record<string, unknown>) =>
    request<{ id: number; name: string }>(`/api/certs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteCert: (id: number) =>
    request<void>(`/api/certs/${id}`, { method: 'DELETE' }),

  // CRUD — cert entries
  updateCertEntry: (id: number, body: Record<string, unknown>) =>
    request<{ id: number; worker_id: number; cert_id: number; completed_on: string | null }>(
      `/api/cert-entries/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
  deleteCertEntry: (id: number) =>
    request<void>(`/api/cert-entries/${id}`, { method: 'DELETE' }),

  // Import
  importPdf: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ImportBatch>('/api/import/pdf', { method: 'POST', body: form })
  },
  getImportHistory: () => request<ImportBatch[]>('/api/import/history'),
  getImportBatch: (id: number) => request<ImportBatch>(`/api/import/${id}`),
}

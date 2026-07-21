import { tokenStore, type AuthUser } from './storage'
import { settingsStore } from './settings'

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

async function getBaseUrl(): Promise<string> {
  return await settingsStore.getApiUrl()
}

class ApiClient {
  private async headers(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await tokenStore.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    }
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}${path}`, { headers: await this.headers() })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error || 'Request failed' }
      return { success: true, data: json.data }
    } catch (e) {
      return { success: false, error: 'Network error' }
    }
  }

  async post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: await this.headers(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error || 'Request failed' }
      return { success: true, data: json.data }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  async put<T>(path: string, body: unknown): Promise<ApiResult<T>> {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}${path}`, {
        method: 'PUT',
        headers: await this.headers(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error || 'Request failed' }
      return { success: true, data: json.data }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  async delete<T>(path: string): Promise<ApiResult<T>> {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}${path}`, {
        method: 'DELETE',
        headers: await this.headers(),
      })
      const json = await res.json()
      if (!res.ok) return { success: false, error: json.error || 'Request failed' }
      return { success: true, data: json.data }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  async login(username: string, password: string, role: AuthUser['role']) {
    return this.post<{ user: AuthUser; token: string }>('/api/auth/login', {
      username,
      password,
      role,
    })
  }

  async testConnection(url: string): Promise<ApiResult<{ message: string }>> {
    try {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'OPTIONS',
      })
      if (res.ok || res.status < 500) return { success: true, data: { message: 'Server reachable' } }
      return { success: false, error: 'Server returned an error' }
    } catch {
      return { success: false, error: 'Cannot reach server' }
    }
  }
}

export const api = new ApiClient()

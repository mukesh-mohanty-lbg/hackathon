const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function setToken(token: string) {
  localStorage.setItem('token', token)
}

function clearToken() {
  localStorage.removeItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, ...body }
  }

  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  const data = await request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  localStorage.setItem('currentUserId', data.user.id)
  return data
}

export async function apiGetMe() {
  return request<{ user: any }>('/auth/me')
}

export function apiLogout() {
  clearToken()
  localStorage.removeItem('currentUserId')
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function apiGetUsers(params?: { role?: string; active?: string }) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<any[]>(`/users${qs}`)
}

export async function apiGetUser(id: string) {
  return request<any>(`/users/${encodeURIComponent(id)}`)
}

export async function apiCreateUser(data: any) {
  return request<any>('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function apiUpdateUser(id: string, updates: any) {
  return request<any>(`/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) })
}

export async function apiToggleUserAccess(id: string) {
  return request<any>(`/users/${encodeURIComponent(id)}/toggle-access`, { method: 'PATCH' })
}

export async function apiUpdateUserAvailability(id: string, status: string, note?: string) {
  return request<any>(`/users/${encodeURIComponent(id)}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  })
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function apiGetEvents(params?: { type?: string; published?: string }) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<any[]>(`/events${qs}`)
}

export async function apiGetEvent(id: string) {
  return request<any>(`/events/${encodeURIComponent(id)}`)
}

export async function apiCreateEvent(data: any) {
  return request<any>('/events', { method: 'POST', body: JSON.stringify(data) })
}

export async function apiUpdateEvent(id: string, updates: any) {
  return request<any>(`/events/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) })
}

export async function apiPublishEvent(id: string) {
  return request<any>(`/events/${encodeURIComponent(id)}/publish`, { method: 'PATCH' })
}

export async function apiUnpublishEvent(id: string) {
  return request<any>(`/events/${encodeURIComponent(id)}/unpublish`, { method: 'PATCH' })
}

// ─── Instances ────────────────────────────────────────────────────────────────

export async function apiGetInstance(instanceId: string) {
  return request<{ event: any; instance: any }>(`/events/instances/${encodeURIComponent(instanceId)}`)
}

export async function apiUpdateInstanceStatus(instanceId: string, status: string) {
  return request<any>(`/events/instances/${encodeURIComponent(instanceId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function apiAssignStaff(instanceId: string, staffId: string) {
  return request<any>(`/events/instances/${encodeURIComponent(instanceId)}/assign-staff`, {
    method: 'POST',
    body: JSON.stringify({ staffId }),
  })
}

export async function apiRemoveStaff(instanceId: string, staffId: string) {
  return request<any>(
    `/events/instances/${encodeURIComponent(instanceId)}/assign-staff/${encodeURIComponent(staffId)}`,
    { method: 'DELETE' },
  )
}

export async function apiMarkAttendance(instanceId: string, attendeeId: string, present: boolean) {
  return request<any>(`/events/instances/${encodeURIComponent(instanceId)}/attendance`, {
    method: 'PATCH',
    body: JSON.stringify({ attendeeId, present }),
  })
}

export async function apiSaveAttendance(instanceId: string) {
  return request<any>(`/events/instances/${encodeURIComponent(instanceId)}/save-attendance`, {
    method: 'POST',
  })
}

export async function apiBookSessions(userId: string, instanceIds: string[], name: string, email: string, phone?: string) {
  return request<{ success: boolean; booked: string[]; message: string }>('/events/instances/book', {
    method: 'POST',
    body: JSON.stringify({ userId, instanceIds, name, email, phone }),
  })
}

// ─── Availability Overrides ──────────────────────────────────────────────────

export async function apiGetAvailability(params?: { staffId?: string; date?: string; dateFrom?: string; dateTo?: string }) {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
  return request<any[]>(`/availability${qs}`)
}

export async function apiSetAvailabilityOverride(override: any) {
  return request<any>('/availability', { method: 'POST', body: JSON.stringify(override) })
}

export async function apiDeleteAvailability(staffId: string, date: string) {
  return request<any>('/availability', {
    method: 'DELETE',
    body: JSON.stringify({ staffId, date }),
  })
}

// ─── Staff Status ─────────────────────────────────────────────────────────────

export async function apiGetStaffStatusForInstance(staffId: string, instanceId: string) {
  return request<{ status: string; conflicts?: any[] }>(
    `/staff/${encodeURIComponent(staffId)}/status?instanceId=${encodeURIComponent(instanceId)}`,
  )
}

export async function apiGetStaffStatusForDay(staffId: string, date: string) {
  return request<{ status: string; assignedInstances?: any[] }>(
    `/staff/${encodeURIComponent(staffId)}/status?date=${encodeURIComponent(date)}`,
  )
}

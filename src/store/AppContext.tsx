import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { User, AvailabilityStatus, Event, EventInstance, StaffAvailabilityOverride, ConflictWarning } from '@/types'
import {
  apiLogin, apiLogout, apiGetMe,
  apiGetUsers, apiCreateUser, apiUpdateUser, apiToggleUserAccess, apiUpdateUserAvailability,
  apiGetEvents, apiCreateEvent, apiUpdateEvent, apiPublishEvent, apiUnpublishEvent,
  apiAssignStaff, apiRemoveStaff, apiMarkAttendance, apiSaveAttendance, apiUpdateInstanceStatus, apiBookSessions,
  apiGetAvailability, apiSetAvailabilityOverride,
} from './apiClient'

interface AppState {
  currentUser: User | null
  authLoading: boolean
  users: User[]
  events: Event[]
  availabilityOverrides: StaffAvailabilityOverride[]
  refreshUsers: () => Promise<void>
  refreshEvents: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  addUser: (user: Omit<User, 'id'>) => Promise<void>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  toggleUserAccess: (id: string) => Promise<void>
  updateAvailability: (id: string, status: AvailabilityStatus, note?: string) => Promise<void>
  setAvailabilityOverride: (override: StaffAvailabilityOverride) => Promise<void>
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => Promise<Event>
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>
  publishEvent: (id: string) => Promise<void>
  unpublishEvent: (id: string) => Promise<void>
  assignStaffToInstance: (instanceId: string, staffId: string) => Promise<{ success: boolean; conflicts?: ConflictWarning[] }>
  removeStaffFromInstance: (instanceId: string, staffId: string) => Promise<void>
  markAttendance: (instanceId: string, attendeeId: string, present: boolean) => Promise<void>
  saveAttendance: (instanceId: string) => Promise<void>
  updateInstanceStatus: (instanceId: string, status: EventInstance['status']) => Promise<void>
  bookSessionsForCurrentUser: (instanceIds: string[], details: { name: string; email: string; phone?: string }) => Promise<{ success: boolean; message: string }>
  getInstanceById: (instanceId: string) => EventInstance | undefined
  getEventByInstanceId: (instanceId: string) => Event | undefined
  getUserById: (id: string) => User | undefined
  getStaffStatusForInstance: (instanceId: string, staffId: string) => 'free' | 'conflict' | 'unavailable'
  getStaffStatusForDay: (staffId: string, date: string) => 'free' | 'conflict' | 'unavailable'
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [availabilityOverrides, setAvailabilityOverrides] = useState<StaffAvailabilityOverride[]>([])
  const [authLoading, setAuthLoading] = useState(true)

  // ─── Data fetchers ─────────────────────────────────────────────────────────
  const refreshUsers = useCallback(async () => {
    try { setUsers(await apiGetUsers()) } catch { /* keep current */ }
  }, [])

  const refreshEvents = useCallback(async () => {
    try { setEvents(await apiGetEvents()) } catch { /* keep current */ }
  }, [])

  const refreshOverrides = useCallback(async () => {
    try { setAvailabilityOverrides(await apiGetAvailability()) } catch { /* keep current */ }
  }, [])

  // Restore session from token on mount, then load all data
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const data = await apiGetMe()
          setCurrentUser(data.user as User)
        } catch {
          apiLogout()
        }
      }
      // Load data from API regardless of auth state
      await Promise.all([refreshUsers(), refreshEvents(), refreshOverrides()])
      setAuthLoading(false)
    }
    init()
  }, [refreshUsers, refreshEvents, refreshOverrides])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiLogin(email, password)
      const user = data.user as User
      setCurrentUser(user)
      await Promise.all([refreshUsers(), refreshEvents(), refreshOverrides()])
      return true
    } catch {
      return false
    }
  }, [refreshUsers, refreshEvents, refreshOverrides])

  const logout = useCallback(() => {
    apiLogout()
    setCurrentUser(null)
  }, [])

  const addUser = useCallback(async (data: Omit<User, 'id'>) => {
    const newUser = await apiCreateUser(data)
    setUsers(prev => [...prev, newUser])
  }, [])

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    const updated = await apiUpdateUser(id, updates)
    setUsers(prev => prev.map(u => (u.id === id ? updated : u)))
    setCurrentUser(prev => (prev?.id === id ? updated : prev))
  }, [])

  const toggleUserAccess = useCallback(async (id: string) => {
    const updated = await apiToggleUserAccess(id)
    setUsers(prev => prev.map(u => (u.id === id ? updated : u)))
  }, [])

  const updateAvailability = useCallback(async (id: string, status: AvailabilityStatus, note?: string) => {
    const updated = await apiUpdateUserAvailability(id, status, note)
    setUsers(prev => prev.map(u => (u.id === id ? updated : u)))
    setCurrentUser(prev => prev?.id === id ? updated : prev)
  }, [])

  const setAvailabilityOverrideAction = useCallback(async (override: StaffAvailabilityOverride) => {
    await apiSetAvailabilityOverride(override)
    await refreshOverrides()
  }, [refreshOverrides])

  const addEvent = useCallback(async (data: Omit<Event, 'id' | 'createdAt'>): Promise<Event> => {
    const newEvent = await apiCreateEvent(data)
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [])

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
    const updated = await apiUpdateEvent(id, updates)
    setEvents(prev => prev.map(e => (e.id === id ? updated : e)))
  }, [])

  const publishEvent = useCallback(async (id: string) => {
    const updated = await apiPublishEvent(id)
    setEvents(prev => prev.map(e => e.id === id ? updated : e))
  }, [])

  const unpublishEvent = useCallback(async (id: string) => {
    const updated = await apiUnpublishEvent(id)
    setEvents(prev => prev.map(e => e.id === id ? updated : e))
  }, [])

  const getInstanceById = useCallback((instanceId: string): EventInstance | undefined => {
    for (const ev of events) {
      const inst = ev.instances.find(i => i.id === instanceId)
      if (inst) return inst
    }
    return undefined
  }, [events])

  const getEventByInstanceId = useCallback((instanceId: string): Event | undefined => {
    return events.find(ev => ev.instances.some(i => i.id === instanceId))
  }, [events])

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users])

  // Returns whether a staff member is free, has a shift conflict, or is manually unavailable for a given instance
  const getStaffStatusForInstance = useCallback((instanceId: string, staffId: string): 'free' | 'conflict' | 'unavailable' => {
    const user = users.find(u => u.id === staffId)
    if (!user || !user.isActive) return 'unavailable'

    const targetInst = events.flatMap(ev => ev.instances).find(i => i.id === instanceId)
    if (!targetInst) return 'unavailable'

    // Check manual unavailability override for that date
    const dayOverride = availabilityOverrides.find(o =>
      o.staffId === staffId && o.date === targetInst.date && o.status === 'unavailable'
    )
    if (dayOverride) return 'unavailable'

    // Check global unavailability (admin-set, e.g. annual leave)
    if (user.availability === 'unavailable') return 'unavailable'

    // Check shift overlap with any other assigned instance on the same date
    const targetShiftStart = targetInst.shiftStartTime ?? targetInst.startTime
    const targetShiftEnd = targetInst.shiftEndTime ?? targetInst.endTime

    for (const ev of events) {
      for (const inst of ev.instances) {
        if (inst.id === instanceId) continue
        if (inst.date !== targetInst.date) continue
        if (!inst.staffAssigned.includes(staffId)) continue
        const instShiftStart = inst.shiftStartTime ?? inst.startTime
        const instShiftEnd = inst.shiftEndTime ?? inst.endTime
        if (targetShiftStart < instShiftEnd && targetShiftEnd > instShiftStart) {
          return 'conflict'
        }
      }
    }

    return 'free'
  }, [users, events, availabilityOverrides])

  // Returns the busiest status for a staff member on a given day (across all their shifts)
  const getStaffStatusForDay = useCallback((staffId: string, date: string): 'free' | 'conflict' | 'unavailable' => {
    const user = users.find(u => u.id === staffId)
    if (!user || !user.isActive) return 'unavailable'

    const dayOverride = availabilityOverrides.find(o =>
      o.staffId === staffId && o.date === date && o.status === 'unavailable'
    )
    if (dayOverride) return 'unavailable'
    if (user.availability === 'unavailable') return 'unavailable'

    // Find all instances assigned to this staff on this date
    const assignedOnDay = events.flatMap(ev => ev.instances).filter(
      i => i.staffAssigned.includes(staffId) && i.date === date && i.status === 'scheduled'
    )

    // Check if any two overlap
    for (let i = 0; i < assignedOnDay.length; i++) {
      for (let j = i + 1; j < assignedOnDay.length; j++) {
        const aStart = assignedOnDay[i].shiftStartTime ?? assignedOnDay[i].startTime
        const aEnd = assignedOnDay[i].shiftEndTime ?? assignedOnDay[i].endTime
        const bStart = assignedOnDay[j].shiftStartTime ?? assignedOnDay[j].startTime
        const bEnd = assignedOnDay[j].shiftEndTime ?? assignedOnDay[j].endTime
        if (aStart < bEnd && aEnd > bStart) return 'conflict'
      }
    }

    return 'free'
  }, [users, events, availabilityOverrides])

  const assignStaffToInstance = useCallback(
    async (instanceId: string, staffId: string): Promise<{ success: boolean; conflicts?: ConflictWarning[] }> => {
      try {
        await apiAssignStaff(instanceId, staffId)
        await refreshEvents()
        return { success: true }
      } catch (err: any) {
        if (err.conflicts) {
          return { success: false, conflicts: err.conflicts }
        }
        return { success: false }
      }
    },
    [refreshEvents]
  )

  const removeStaffFromInstance = useCallback(async (instanceId: string, staffId: string) => {
    await apiRemoveStaff(instanceId, staffId)
    await refreshEvents()
  }, [refreshEvents])

  const markAttendance = useCallback(async (instanceId: string, attendeeId: string, present: boolean) => {
    await apiMarkAttendance(instanceId, attendeeId, present)
    await refreshEvents()
  }, [refreshEvents])

  const saveAttendance = useCallback(async (instanceId: string) => {
    await apiSaveAttendance(instanceId)
    await refreshEvents()
  }, [refreshEvents])

  const updateInstanceStatus = useCallback(async (instanceId: string, status: EventInstance['status']) => {
    await apiUpdateInstanceStatus(instanceId, status)
    await refreshEvents()
  }, [refreshEvents])

  const bookSessionsForCurrentUser = useCallback(async (
    instanceIds: string[],
    details: { name: string; email: string; phone?: string }
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser || currentUser.role !== 'individual') {
      return { success: false, message: 'Only individual accounts can book sessions.' }
    }

    const uniqueIds = Array.from(new Set(instanceIds))
    if (uniqueIds.length === 0) {
      return { success: false, message: 'Select at least one session to continue.' }
    }

    try {
      const result = await apiBookSessions(
        currentUser.id,
        uniqueIds,
        details.name.trim() || currentUser.name,
        details.email,
        details.phone,
      )
      await refreshEvents()

      // Update phone if changed
      const nextPhone = details.phone?.trim()
      if (nextPhone && nextPhone !== currentUser.phone) {
        await apiUpdateUser(currentUser.id, { phone: nextPhone })
        await refreshUsers()
      }

      return { success: result.success, message: result.message }
    } catch {
      return { success: false, message: 'Booking failed. Please try again.' }
    }
  }, [currentUser, refreshEvents, refreshUsers])

  return (
    <AppContext.Provider value={{
      currentUser, authLoading, users, events, availabilityOverrides,
      refreshUsers, refreshEvents,
      login, logout, addUser, updateUser, toggleUserAccess,
      updateAvailability, setAvailabilityOverride: setAvailabilityOverrideAction,
      addEvent, updateEvent, publishEvent, unpublishEvent,
      assignStaffToInstance, removeStaffFromInstance,
      markAttendance, saveAttendance, updateInstanceStatus,
      bookSessionsForCurrentUser,
      getInstanceById, getEventByInstanceId, getUserById,
      getStaffStatusForInstance, getStaffStatusForDay,
    }}>
      {children}
    </AppContext.Provider>
  )
}

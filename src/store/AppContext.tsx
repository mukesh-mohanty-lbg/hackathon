import React, { createContext, useContext, useState, useCallback } from 'react'
import type { User, AvailabilityStatus, Event, EventInstance, StaffAvailabilityOverride, ConflictWarning } from '@/types'
import { USERS, CREDENTIALS, EVENTS, AVAILABILITY_OVERRIDES } from './mockData'

interface AppState {
  currentUser: User | null
  users: User[]
  events: Event[]
  availabilityOverrides: StaffAvailabilityOverride[]
  login: (email: string, password: string) => boolean
  logout: () => void
  addUser: (user: Omit<User, 'id'>) => void
  updateUser: (id: string, updates: Partial<User>) => void
  toggleUserAccess: (id: string) => void
  updateAvailability: (id: string, status: AvailabilityStatus, note?: string) => void
  setAvailabilityOverride: (override: StaffAvailabilityOverride) => void
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => Event
  updateEvent: (id: string, updates: Partial<Event>) => void
  assignStaffToInstance: (instanceId: string, staffId: string) => { success: boolean; conflicts?: ConflictWarning[] }
  removeStaffFromInstance: (instanceId: string, staffId: string) => void
  markAttendance: (instanceId: string, attendeeId: string, present: boolean) => void
  saveAttendance: (instanceId: string) => void
  updateInstanceStatus: (instanceId: string, status: EventInstance['status']) => void
  bookSessionsForCurrentUser: (instanceIds: string[], details: { name: string; email: string; phone?: string }) => { success: boolean; message: string }
  getInstanceById: (instanceId: string) => EventInstance | undefined
  getEventByInstanceId: (instanceId: string) => Event | undefined
  getUserById: (id: string) => User | undefined
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(USERS)
  const [events, setEvents] = useState<Event[]>(EVENTS)
  const [availabilityOverrides, setAvailabilityOverrides] = useState<StaffAvailabilityOverride[]>(AVAILABILITY_OVERRIDES)

  const login = useCallback((email: string, password: string): boolean => {
    const expected = CREDENTIALS[email]
    if (!expected || expected !== password) return false
    const user = USERS.find(u => u.email === email)
    if (!user || !user.isActive) return false
    setCurrentUser(user)
    return true
  }, [])

  const logout = useCallback(() => setCurrentUser(null), [])

  const addUser = useCallback((data: Omit<User, 'id'>) => {
    setUsers(prev => [...prev, { ...data, id: `u${Date.now()}` }])
  }, [])

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)))
    setCurrentUser(prev => (prev?.id === id ? { ...prev, ...updates } : prev))
  }, [])

  const toggleUserAccess = useCallback((id: string) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, isActive: !u.isActive } : u)))
  }, [])

  const updateAvailability = useCallback((id: string, status: AvailabilityStatus, note?: string) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, availability: status, availabilityNote: note } : u)))
    setCurrentUser(prev => prev?.id === id ? { ...prev, availability: status, availabilityNote: note } : prev)
  }, [])

  const setAvailabilityOverride = useCallback((override: StaffAvailabilityOverride) => {
    setAvailabilityOverrides(prev => {
      const isFullDay = override.isFullDay ?? (!override.startTime && !override.endTime)

      if (isFullDay) {
        const filtered = prev.filter(o => {
          const otherIsFullDay = o.isFullDay ?? (!o.startTime && !o.endTime)
          return !(o.staffId === override.staffId && o.date === override.date && otherIsFullDay)
        })
        return [...filtered, { ...override, isFullDay: true, startTime: undefined, endTime: undefined }]
      }

      const filtered = prev.filter(o => {
        const otherIsFullDay = o.isFullDay ?? (!o.startTime && !o.endTime)
        return !(
          o.staffId === override.staffId
          && o.date === override.date
          && !otherIsFullDay
          && o.startTime === override.startTime
          && o.endTime === override.endTime
        )
      })

      return [...filtered, { ...override, isFullDay: false }]
    })
  }, [])

  const addEvent = useCallback((data: Omit<Event, 'id' | 'createdAt'>): Event => {
    const newEvent: Event = { ...data, id: `e${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [])

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
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

  const assignStaffToInstance = useCallback(
    (instanceId: string, staffId: string): { success: boolean; conflicts?: ConflictWarning[] } => {
      const targetEvent = events.find(ev => ev.instances.some(i => i.id === instanceId))
      if (!targetEvent) return { success: false }
      const targetInst = targetEvent.instances.find(i => i.id === instanceId)!

      const conflicts: ConflictWarning[] = []
      for (const ev of events) {
        for (const inst of ev.instances) {
          if (inst.id === instanceId) continue
          if (inst.date !== targetInst.date) continue
          if (!inst.staffAssigned.includes(staffId)) continue
          if (targetInst.startTime < inst.endTime && targetInst.endTime > inst.startTime) {
            const staff = USERS.find(u => u.id === staffId)
            conflicts.push({
              staffId,
              staffName: staff?.name ?? staffId,
              conflictingEventTitle: ev.title,
              conflictDate: inst.date,
              conflictTime: `${inst.startTime}–${inst.endTime}`,
            })
          }
        }
      }

      if (conflicts.length > 0) return { success: false, conflicts }

      setEvents(prev =>
        prev.map(ev => ({
          ...ev,
          instances: ev.instances.map(inst =>
            inst.id === instanceId && !inst.staffAssigned.includes(staffId)
              ? { ...inst, staffAssigned: [...inst.staffAssigned, staffId] }
              : inst
          ),
        }))
      )
      return { success: true }
    },
    [events]
  )

  const removeStaffFromInstance = useCallback((instanceId: string, staffId: string) => {
    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        instances: ev.instances.map(inst =>
          inst.id === instanceId
            ? { ...inst, staffAssigned: inst.staffAssigned.filter(s => s !== staffId) }
            : inst
        ),
      }))
    )
  }, [])

  const markAttendance = useCallback((instanceId: string, attendeeId: string, present: boolean) => {
    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        instances: ev.instances.map(inst =>
          inst.id === instanceId
            ? { ...inst, attendees: inst.attendees.map(a => a.youngPersonId === attendeeId ? { ...a, present } : a) }
            : inst
        ),
      }))
    )
  }, [])

  const saveAttendance = useCallback((instanceId: string) => {
    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        instances: ev.instances.map(inst =>
          inst.id === instanceId ? { ...inst, status: 'completed' as const } : inst
        ),
      }))
    )
  }, [])

  const updateInstanceStatus = useCallback((instanceId: string, status: EventInstance['status']) => {
    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        instances: ev.instances.map(inst => inst.id === instanceId ? { ...inst, status } : inst),
      }))
    )
  }, [])

  const bookSessionsForCurrentUser = useCallback((
    instanceIds: string[],
    details: { name: string; email: string; phone?: string }
  ): { success: boolean; message: string } => {
    if (!currentUser || currentUser.role !== 'individual') {
      return { success: false, message: 'Only individual accounts can book sessions.' }
    }

    const uniqueIds = Array.from(new Set(instanceIds))
    if (uniqueIds.length === 0) {
      return { success: false, message: 'Select at least one session to continue.' }
    }

    const attendeeName = details.name.trim() || currentUser.name

    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        instances: ev.instances.map(inst => {
          if (!uniqueIds.includes(inst.id)) return inst
          const alreadyBooked = inst.attendees.some(a => a.youngPersonId === currentUser.id)
          if (alreadyBooked) return inst
          return {
            ...inst,
            attendees: [...inst.attendees, { youngPersonId: currentUser.id, name: attendeeName, present: null }],
          }
        }),
      }))
    )

    const nextPhone = details.phone?.trim()
    if (nextPhone && nextPhone !== currentUser.phone) {
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, phone: nextPhone } : u)))
      setCurrentUser(prev => (prev?.id === currentUser.id ? { ...prev, phone: nextPhone } : prev))
    }

    return { success: true, message: 'Your session booking has been saved.' }
  }, [currentUser])

  return (
    <AppContext.Provider value={{
      currentUser, users, events, availabilityOverrides,
      login, logout, addUser, updateUser, toggleUserAccess,
      updateAvailability, setAvailabilityOverride,
      addEvent, updateEvent,
      assignStaffToInstance, removeStaffFromInstance,
      markAttendance, saveAttendance, updateInstanceStatus,
      bookSessionsForCurrentUser,
      getInstanceById, getEventByInstanceId, getUserById,
    }}>
      {children}
    </AppContext.Provider>
  )
}

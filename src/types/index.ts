export type Role = 'admin' | 'staff' | 'individual'

export type AvailabilityStatus = 'available' | 'unavailable' | 'partial'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  avatar?: string
  availability: AvailabilityStatus
  availabilityNote?: string
  isActive: boolean
  joinedDate: string
}

export type EventType = 'workshop' | 'activity' | 'trip' | 'programme' | 'meeting'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

export interface EventInstance {
  id: string
  eventId: string
  date: string
  startTime: string
  endTime: string
  shiftStartTime?: string
  shiftEndTime?: string
  venueOverride?: string
  staffAssigned: string[]
  maxAttendees: number
  attendees: AttendeeRecord[]
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Event {
  id: string
  title: string
  description: string
  imageUrl?: string
  type: EventType
  venue: string
  requiredStaff: number
  maxAttendees: number
  recurrence: RecurrenceType
  instances: EventInstance[]
  createdBy: string
  createdAt: string
  tags: string[]
  ageGroup?: string
}

export interface AttendeeRecord {
  youngPersonId: string
  name: string
  present: boolean | null
}

export interface StaffAvailabilityOverride {
  staffId: string
  date: string
  status: AvailabilityStatus
  isFullDay?: boolean
  startTime?: string
  endTime?: string
  note?: string
}

export interface ConflictWarning {
  staffId: string
  staffName: string
  conflictingEventTitle: string
  conflictDate: string
  conflictTime: string
}
